const session = require('../utils/session');
function attachAuthSession(req, _res, next) {
    req.authSession = session.getUserSessionFromRequest(req);
    req.adminAuthSession = session.getAdminSessionFromRequest(req);
    next();
}

module.exports = { attachAuthSession };
