const { isAdminUser } = require('../services/adminService');

// auth from JWT in HttpOnly cookie set during login
function requireAuth(req, res, next) {
    if (!req.authSession) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}

// admin uses a separate cookie so a regular user token cannot reach admin routes
function requireAdminAuth(req, res, next) {
    if (!req.adminAuthSession?.user || !isAdminUser(req.adminAuthSession.user)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}

module.exports = { requireAuth, requireAdminAuth };
