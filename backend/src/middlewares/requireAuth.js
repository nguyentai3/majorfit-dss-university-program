const { isAdminUser } = require('../services/adminService');

function requireAuth(req, res, next) {
    if (!req.authSession) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}

function requireAdminAuth(req, res, next) {
    if (!req.adminAuthSession?.user || !isAdminUser(req.adminAuthSession.user)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}

module.exports = { requireAuth, requireAdminAuth };
