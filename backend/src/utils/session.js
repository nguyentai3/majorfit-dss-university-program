const jwt = require('./jwt');
const USER_AUTH_COOKIE_NAME = 'auth_token';
const ADMIN_AUTH_COOKIE_NAME = 'admin_auth_token';

function buildSessionFromToken(token) {
    const payload = jwt.verifyToken(token);
    if (!payload?.userId || !payload?.email)
        return null;
    return {
        user: {
            id: payload.userId,
            email: payload.email,
            role: payload.role || 'USER',
            accountType: payload.accountType || (String(payload.role || '').toUpperCase() === 'ADMIN' ? 'admin' : 'user'),
            adminRole: payload.adminRole ?? null,
            username: payload.username ?? null,
            firstName: payload.firstName ?? null,
            lastName: payload.lastName ?? null,
        },
        accessToken: token,
        tokenType: 'Bearer',
        expiresAt: payload.exp,
    };
}

function buildSessionUser(user, options = {}) {
    const role = options.role || user.role || 'USER';
    const accountType = options.accountType
        || user.accountType
        || (String(role).toUpperCase() === 'ADMIN' ? 'admin' : 'user');
    const username = options.username || user.username || null;
    const adminRole =
        options.adminRole
        || user.adminRole
        || (accountType === 'admin' ? user.role || 'SUPER_ADMIN' : null);

    return {
        id: user.id,
        email: user.email,
        role,
        account_type: accountType,
        admin_role: adminRole,
        username,
        user_metadata: {
            first_name: user.firstName ?? null,
            last_name: user.lastName ?? null,
            full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        },
    };
}

function buildSessionEnvelope(user, accessToken, options = {}) {
    const session = {
        user: buildSessionUser(user, options),
        access_token: accessToken,
        token_type: 'Bearer',
    };

    if (options.expiresAt !== undefined && options.expiresAt !== null) {
        session.expires_at = options.expiresAt;
    }

    return session;
}

function buildAuthResponse(user, token, options = {}) {
    const role = options.role || user.role || 'USER';
    const accountType = options.accountType
        || user.accountType
        || (String(role).toUpperCase() === 'ADMIN' ? 'admin' : 'user');
    const username = options.username || user.username || null;
    const adminRole =
        options.adminRole
        || user.adminRole
        || (accountType === 'admin' ? user.role || 'SUPER_ADMIN' : null);

    return {
        message: 'OK',
        token,
        session: buildSessionEnvelope(user, token, {
            role,
            accountType,
            adminRole,
            username,
        }),
        user: {
            id: user.id,
            email: user.email,
            role,
            accountType,
            adminRole,
            username,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
        },
    };
}

function isAdminSession(session) {
    if (!session?.user) return false;
    const accountType = String(session.user.accountType || '').toLowerCase();
    if (accountType) {
        return accountType === 'admin';
    }
    return String(session.user.role || '').toUpperCase() === 'ADMIN';
}

function getSessionFromRequest(req, cookieName) {
    const token = req.cookies?.[cookieName] || getTokenFromCookieHeader(req.headers.cookie, cookieName);
    if (!token)
        return null;
    return buildSessionFromToken(token);
}

function getUserSessionFromRequest(req) {
    const session = getSessionFromRequest(req, USER_AUTH_COOKIE_NAME);
    if (!session || isAdminSession(session)) {
        return null;
    }
    return session;
}

function getAdminSessionFromRequest(req) {
    const session = getSessionFromRequest(req, ADMIN_AUTH_COOKIE_NAME);
    if (!session || !isAdminSession(session)) {
        return null;
    }
    return session;
}

function getTokenFromCookieHeader(cookieHeader, cookieName) {
    if (!cookieHeader)
        return null;
    for (const part of cookieHeader.split(';')) {
        const [name, ...rest] = part.trim().split('=');
        if (name === cookieName) {
            return decodeURIComponent(rest.join('='));
        }
    }
    return null;
}
function authCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
function clearAuthCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    };
}

function setUserAuthCookie(res, token) {
    res.cookie(USER_AUTH_COOKIE_NAME, token, authCookieOptions());
}

function setAdminAuthCookie(res, token) {
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, authCookieOptions());
}

function clearUserAuthCookie(res) {
    res.clearCookie(USER_AUTH_COOKIE_NAME, clearAuthCookieOptions());
}

function clearAdminAuthCookie(res) {
    res.clearCookie(ADMIN_AUTH_COOKIE_NAME, clearAuthCookieOptions());
}

module.exports = {
    buildSessionUser,
    buildSessionEnvelope,
    buildAuthResponse,
    getSessionFromRequest,
    getUserSessionFromRequest,
    getAdminSessionFromRequest,
    isAdminSession,
    getTokenFromCookieHeader,
    authCookieOptions,
    clearAuthCookieOptions,
    setUserAuthCookie,
    setAdminAuthCookie,
    clearUserAuthCookie,
    clearAdminAuthCookie,
    USER_AUTH_COOKIE_NAME,
    ADMIN_AUTH_COOKIE_NAME,
};
