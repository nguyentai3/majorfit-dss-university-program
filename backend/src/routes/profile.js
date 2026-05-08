const express = require('express');
const { prisma } = require('../db/prisma');
const requireAuth = require('../middlewares/requireAuth');
const { getUserInsightDataForUser } = require('../services/userInsights');
const http = require('../utils/http');
const { getRiasecProfile } = require('../services/riasec/assessmentService');
const authService = require('../services/authService');
const profileRouter = express.Router();
profileRouter.use(express.json({ limit: '2mb' }));
profileRouter.use(requireAuth.requireAuth);
function splitFullName(fullName) {
    const normalized = String(fullName || '').trim();
    if (!normalized) {
        return { firstName: '', lastName: '' };
    }
    const parts = normalized.split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
    };
}
function normalizeProfile(profile) {
    if (!profile) {
        return null;
    }
    const normalized = http.normalizeDbRow(profile);
    const normalizedFullName = normalized.full_name || normalized.fullName || null;
    const derivedName = splitFullName(normalizedFullName);
    const firstName = normalized.first_name || normalized.firstName || derivedName.firstName;
    const lastName = normalized.last_name || normalized.lastName || derivedName.lastName;
    const fullName = normalizedFullName || [firstName, lastName].filter(Boolean).join(' ') || null;
    return {
        ...normalized,
        first_name: firstName,
        last_name: lastName,
        firstName,
        lastName,
        full_name: fullName,
        fullName,
    };
}
async function getProfileById(userId) {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    return normalizeProfile(profile);
}

async function ensureProfileRecord(userId, sessionUser) {
    let profile = await getProfileById(userId);
    if (profile) {
        if (profile.fullName || profile.firstName || profile.lastName) {
            return profile;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, email: true },
        });

        const firstName = user?.firstName || sessionUser?.firstName || '';
        const lastName = user?.lastName || sessionUser?.lastName || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

        if (fullName || user?.email) {
            await prisma.profile.update({
                where: { id: userId },
                data: {
                    email: user?.email || sessionUser?.email || profile.email,
                    fullName,
                },
            });
            profile = await getProfileById(userId);
        }

        return profile;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
    });

    const firstName = user?.firstName || sessionUser?.firstName || '';
    const lastName = user?.lastName || sessionUser?.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    await prisma.profile.create({
        data: {
            id: userId,
            email: user?.email || sessionUser?.email || null,
            fullName,
            avatarUrl: null,
        },
    });

    return getProfileById(userId);
}

function buildProfilePayload(session, body = {}) {
    const firstName = body.first_name ?? body.firstName ?? '';
    const lastName = body.last_name ?? body.lastName ?? '';

    return {
        email: session.user.email,
        fullName: body.full_name ?? body.fullName ?? ([firstName, lastName].filter(Boolean).join(' ') || null),
        avatarUrl: body.avatar_url ?? body.avatarUrl ?? null,
        bio: body.bio ?? null,
        phone: body.phone ?? null,
        location: body.location ?? null,
        dateOfBirth: body.date_of_birth ?? body.dateOfBirth ?? null,
        educationLevel: body.education_level ?? body.educationLevel ?? null,
        schoolName: body.school_name ?? body.schoolName ?? null,
        studentCode: body.student_code ?? body.studentCode ?? null,
        classCode: body.class_code ?? body.classCode ?? null,
        gradeLevel:
            Number.isFinite(Number(body.grade_level ?? body.gradeLevel))
                ? Number.parseInt(String(body.grade_level ?? body.gradeLevel), 10)
                : null,
        academicYear: body.academic_year ?? body.academicYear ?? null,
        currentSemester: body.current_semester ?? body.currentSemester ?? null,
        fieldOfInterest: body.field_of_interest ?? body.fieldOfInterest ?? null,
        careerGoal: body.career_goal ?? body.careerGoal ?? null,
        linkedinUrl: body.linkedin_url ?? body.linkedinUrl ?? null,
        githubUrl: body.github_url ?? body.githubUrl ?? null,
        portfolioUrl: body.portfolio_url ?? body.portfolioUrl ?? null,
    };
}
profileRouter.get('/', async (req, res, next) => {
    try {
        const session = req.authSession;
        const profile = await ensureProfileRecord(session.user.id, session.user);
        res.json({ profile });
    }
    catch (error) {
        next(error);
    }
});
profileRouter.put('/', async (req, res, next) => {
    try {
        const session = req.authSession;
        const body = req.body || {};
        const updates = buildProfilePayload(session, body);
        const existing = await getProfileById(session.user.id);
        if (!existing) {
            await prisma.profile.create({
                data: {
                    id: session.user.id,
                    ...updates,
                },
            });
        }
        else {
            await prisma.profile.update({
                where: { id: session.user.id },
                data: updates,
            });
        }
        const profile = await getProfileById(session.user.id);
        res.json({ success: true, message: 'Profile updated successfully', profile });
    }
    catch (error) {
        next(error);
    }
});

profileRouter.put('/password', async (req, res, next) => {
    try {
        const session = req.authSession;
        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.password) {
            return res.status(400).json({ error: 'User not found or has no password set' });
        }

        const isValid = await authService.verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Tài khoản hoặc mật khẩu cũ không đúng' });
        }

        const hashedPassword = await authService.hashPassword(newPassword);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        next(error);
    }
});
profileRouter.post('/', async (req, res, next) => {
    try {
        const session = req.authSession;
        const body = req.body || {};
        const { action } = body;
        if (action === 'upload_avatar') {
            res.json({
                success: true,
                message: 'Avatar upload placeholder (implement S3/Cloudinary later)',
                avatarUrl: '/placeholder-avatar.png',
            });
            return;
        }
        if (action === 'delete_account') {
            await prisma.profile.update({
                where: { id: session.user.id },
                data: {},
            });
            res.json({ success: true, message: 'Account marked for deletion' });
            return;
        }
        res.status(400).json({ error: 'Invalid action' });
    }
    catch (error) {
        next(error);
    }
});
profileRouter.get('/stats', async (req, res, next) => {
    try {
        const userId = req.authSession.user.id;
        const data = await getUserInsightDataForUser(userId);
        const assessmentProfile = await getRiasecProfile(userId);

        res.json({
            completedAssessments: data.riasecAttempts?.length || 0,
            savedPrograms: data.savedPrograms?.length ?? 0,
            hollandCode: assessmentProfile.stableHollandCode || assessmentProfile.latestHollandCode || null,
            confidenceScore: assessmentProfile.confidenceScore ?? 0,
            strongestDimension: assessmentProfile.strongestDimension ?? null,
            totalAssessments: assessmentProfile.totalAttempts ?? 0,
            lastAssessedAt: assessmentProfile.lastAssessedAt ?? null,
            success: true,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = { profileRouter };
