const { Router, json } = require('express');
const { z, ZodIssueCode } = require('zod');
const { prisma } = require('../db/prisma');
const auth = require('../services/authService');
const adminService = require('../services/adminService');
const jwt = require('../utils/jwt');
const sessionUtils = require('../utils/session');
const { authLimiter } = require('../middlewares/rateLimiter');

const signUpSchema = z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
    if ((data.confirmPassword ?? data.password) !== data.password) {
        ctx.addIssue({ code: ZodIssueCode.custom, path: ['confirmPassword'], message: "Passwords don't match" });
    }
});

const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const adminSignInSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

const authRouter = Router();

authRouter.use(json({ limit: '1mb' }));

authRouter.get('/session', (req, res) => {
    const currentSession = sessionUtils.getUserSessionFromRequest(req);
    if (!currentSession) {
        res.json({ session: null });
        return;
    }

    res.json({
        session: sessionUtils.buildSessionEnvelope(currentSession.user, currentSession.accessToken, {
            expiresAt: currentSession.expiresAt,
        }),
    });
});

authRouter.get('/admin/session', (req, res) => {
    const currentSession = sessionUtils.getAdminSessionFromRequest(req);
    if (!currentSession) {
        res.json({ session: null });
        return;
    }

    res.json({
        session: sessionUtils.buildSessionEnvelope(currentSession.user, currentSession.accessToken, {
            expiresAt: currentSession.expiresAt,
        }),
    });
});

authRouter.post('/signup', authLimiter, async (req, res, next) => {
    try {
        const body = signUpSchema.parse({
            ...req.body,
            confirmPassword: req.body?.confirmPassword ?? req.body?.password,
        });
        const normalizedEmail = adminService.normalizeEmail(body.email);
        const [existingUser, existingAdmin] = await Promise.all([
            prisma.user.findUnique({ where: { email: normalizedEmail } }),
            prisma.admin.findUnique({ where: { email: normalizedEmail } }),
        ]);

        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        if (existingAdmin) {
            res.status(400).json({ message: 'Email is reserved for an administrator account' });
            return;
        }

        const hashedPassword = await auth.hashPassword(body.password);
        const user = await prisma.user.create({
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                email: normalizedEmail,
                password: hashedPassword,
                role: 'USER',
            },
        });
        const token = jwt.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'USER',
            accountType: 'user',
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
        });
        sessionUtils.setUserAuthCookie(res, token);
        res.json({ ...sessionUtils.buildAuthResponse(user, token), message: 'Account created successfully' });
    }
    catch (error) {
        next(error);
    }
});

authRouter.post('/signin', authLimiter, async (req, res, next) => {
    try {
        const body = signInSchema.parse(req.body);
        const normalizedEmail = adminService.normalizeEmail(body.email);
        const [user, adminAccount] = await Promise.all([
            prisma.user.findUnique({ where: { email: normalizedEmail } }),
            prisma.admin.findUnique({ where: { email: normalizedEmail } }),
        ]);

        if (adminAccount) {
            res.status(403).json({ message: 'Please use the admin sign-in page for this account' });
            return;
        }

        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const validPassword = await auth.verifyPassword(body.password, user.password);
        if (!validPassword) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const token = jwt.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'USER',
            accountType: 'user',
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
        });
        sessionUtils.setUserAuthCookie(res, token);
        res.json({ ...sessionUtils.buildAuthResponse(user, token), message: 'Sign in successful' });
    }
    catch (error) {
        next(error);
    }
});

authRouter.post('/admin/signin', authLimiter, async (req, res, next) => {
    try {
        const body = adminSignInSchema.parse(req.body);
        const adminUsername = adminService.normalizeUsername(body.username);
        const adminAccount = await prisma.admin.findFirst({
            where: {
                OR: [
                    { username: adminUsername },
                    ...(adminUsername.includes('@')
                        ? [{ email: adminService.normalizeEmail(adminUsername) }]
                        : []),
                ],
            },
        });
        if (!adminAccount) {
            res.status(401).json({ message: 'Invalid admin username or password' });
            return;
        }

        if (adminAccount.isActive === false) {
            res.status(403).json({ message: 'Admin account is inactive' });
            return;
        }

        const validPassword = await auth.verifyPassword(body.password, adminAccount.password);
        if (!validPassword) {
            res.status(401).json({ message: 'Invalid admin username or password' });
            return;
        }

        const token = jwt.generateToken({
            userId: adminAccount.id,
            email: adminAccount.email,
            role: 'ADMIN',
            accountType: 'admin',
            adminRole: adminAccount.role || 'SUPER_ADMIN',
            username: adminAccount.username || null,
            firstName: adminAccount.firstName ?? null,
            lastName: adminAccount.lastName ?? null,
        });

        sessionUtils.setAdminAuthCookie(res, token);
        res.json({
            ...sessionUtils.buildAuthResponse(adminAccount, token, {
                role: 'ADMIN',
                accountType: 'admin',
                adminRole: adminAccount.role || 'SUPER_ADMIN',
                username: adminAccount.username || null,
            }),
            message: 'Admin sign in successful',
            role: 'admin',
        });
    }
    catch (error) {
        next(error);
    }
});

authRouter.post('/signout', (_req, res) => {
    sessionUtils.clearUserAuthCookie(res);
    res.json({ success: true, message: 'Signed out successfully' });
});

authRouter.post('/admin/signout', (_req, res) => {
    sessionUtils.clearAdminAuthCookie(res);
    res.json({ success: true, message: 'Admin signed out successfully' });
});

module.exports = { authRouter };
