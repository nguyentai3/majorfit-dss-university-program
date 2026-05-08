const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword } = require('../src/services/authService');
const jwt = require('../src/utils/jwt');
const sessionUtils = require('../src/utils/session');
const {
    normalizeEmail,
    normalizeUsername,
    isAdminUser,
    isAdminEmail,
    isAdminRole,
} = require('../src/services/adminService');

describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies correct password', async () => {
        const hash = await hashPassword('secure123');
        assert.ok(typeof hash === 'string');
        assert.notEqual(hash, 'secure123');
        const valid = await verifyPassword('secure123', hash);
        assert.equal(valid, true);
    });

    it('rejects wrong password', async () => {
        const hash = await hashPassword('secure123');
        const valid = await verifyPassword('wrong', hash);
        assert.equal(valid, false);
    });

    it('generates different hashes for same password (salt)', async () => {
        const h1 = await hashPassword('same');
        const h2 = await hashPassword('same');
        assert.notEqual(h1, h2);
    });

    it('handles empty password', async () => {
        const hash = await hashPassword('');
        assert.ok(typeof hash === 'string');
        const valid = await verifyPassword('', hash);
        assert.equal(valid, true);
    });
});

describe('JWT generateToken / verifyToken', () => {
    it('generates and verifies a valid token', () => {
        const token = jwt.generateToken({ userId: 'u1', email: 'a@b.com', role: 'USER' });
        assert.ok(typeof token === 'string');
        const payload = jwt.verifyToken(token);
        assert.equal(payload.userId, 'u1');
        assert.equal(payload.email, 'a@b.com');
        assert.equal(payload.role, 'USER');
    });

    it('returns null for invalid token', () => {
        const result = jwt.verifyToken('invalid.token.here');
        assert.equal(result, null);
    });

    it('returns null for empty string', () => {
        assert.equal(jwt.verifyToken(''), null);
    });

    it('includes exp claim', () => {
        const token = jwt.generateToken({ userId: 'u1', email: 'a@b.com' });
        const payload = jwt.verifyToken(token);
        assert.ok(payload.exp);
        assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    });
});

describe('session buildSessionEnvelope', () => {
    const mockUser = { id: 'u1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', role: 'USER' };

    it('builds user session envelope', () => {
        const envelope = sessionUtils.buildSessionEnvelope(mockUser, 'token123');
        assert.equal(envelope.user.id, 'u1');
        assert.equal(envelope.user.email, 'test@test.com');
        assert.equal(envelope.access_token, 'token123');
        assert.equal(envelope.token_type, 'Bearer');
    });

    it('builds admin session envelope', () => {
        const admin = { id: 'a1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User', role: 'SUPER_ADMIN' };
        const envelope = sessionUtils.buildSessionEnvelope(admin, 'admintoken', {
            role: 'ADMIN',
            accountType: 'admin',
            adminRole: 'SUPER_ADMIN',
        });
        assert.equal(envelope.user.role, 'ADMIN');
        assert.equal(envelope.user.account_type, 'admin');
        assert.equal(envelope.user.admin_role, 'SUPER_ADMIN');
    });
});

describe('session buildAuthResponse', () => {
    it('includes message, token, session, and user fields', () => {
        const user = { id: 'u1', email: 'test@test.com', firstName: 'A', lastName: 'B' };
        const resp = sessionUtils.buildAuthResponse(user, 'tok');
        assert.ok(resp.message);
        assert.equal(resp.token, 'tok');
        assert.ok(resp.session);
        assert.ok(resp.user);
        assert.equal(resp.user.id, 'u1');
        assert.equal(resp.user.email, 'test@test.com');
    });
});

describe('adminService helpers', () => {
    it('normalizeEmail trims and lowercases', () => {
        assert.equal(normalizeEmail('  Test@Email.COM  '), 'test@email.com');
    });

    it('normalizeEmail handles non-string', () => {
        assert.equal(normalizeEmail(null), '');
        assert.equal(normalizeEmail(undefined), '');
        assert.equal(normalizeEmail(123), '');
    });

    it('normalizeUsername trims and lowercases', () => {
        assert.equal(normalizeUsername('  Admin1  '), 'admin1');
    });

    it('isAdminUser checks accountType', () => {
        assert.equal(isAdminUser({ accountType: 'admin' }), true);
        assert.equal(isAdminUser({ accountType: 'user' }), false);
        assert.equal(isAdminUser(null), false);
        assert.equal(isAdminUser(undefined), false);
    });

    it('isAdminUser fallback to role if no accountType', () => {
        assert.equal(isAdminUser({ role: 'ADMIN' }), true);
        assert.equal(isAdminUser({ role: 'USER' }), false);
    });

    it('isAdminRole checks role string', () => {
        assert.equal(isAdminRole('ADMIN'), true);
        assert.equal(isAdminRole('admin'), true);
        assert.equal(isAdminRole('USER'), false);
        assert.equal(isAdminRole(null), false);
    });
});

describe('Zod validation schemas', () => {
    const { z, ZodIssueCode } = require('zod');

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

    it('signup: validates correct input', () => {
        const result = signUpSchema.safeParse({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'secure123',
            confirmPassword: 'secure123',
        });
        assert.equal(result.success, true);
    });

    it('signup: rejects short firstName', () => {
        const result = signUpSchema.safeParse({
            firstName: 'J',
            lastName: 'Doe',
            email: 'j@e.com',
            password: 'secure123',
        });
        assert.equal(result.success, false);
    });

    it('signup: rejects short password', () => {
        const result = signUpSchema.safeParse({
            firstName: 'John',
            lastName: 'Doe',
            email: 'j@e.com',
            password: '12345',
        });
        assert.equal(result.success, false);
    });

    it('signup: rejects invalid email', () => {
        const result = signUpSchema.safeParse({
            firstName: 'John',
            lastName: 'Doe',
            email: 'invalid',
            password: 'secure123',
        });
        assert.equal(result.success, false);
    });

    it('signup: rejects mismatched confirmPassword', () => {
        const result = signUpSchema.safeParse({
            firstName: 'John',
            lastName: 'Doe',
            email: 'j@e.com',
            password: 'secure123',
            confirmPassword: 'different',
        });
        assert.equal(result.success, false);
    });

    it('signup: allows missing confirmPassword (defaults to password)', () => {
        const result = signUpSchema.safeParse({
            firstName: 'John',
            lastName: 'Doe',
            email: 'j@e.com',
            password: 'secure123',
        });
        assert.equal(result.success, true);
    });

    it('signin: validates correct input', () => {
        const result = signInSchema.safeParse({
            email: 'test@test.com',
            password: 'pass',
        });
        assert.equal(result.success, true);
    });

    it('signin: rejects missing password', () => {
        const result = signInSchema.safeParse({
            email: 'test@test.com',
            password: '',
        });
        assert.equal(result.success, false);
    });

    it('signin: rejects invalid email', () => {
        const result = signInSchema.safeParse({
            email: 'not-email',
            password: 'pass',
        });
        assert.equal(result.success, false);
    });
});
