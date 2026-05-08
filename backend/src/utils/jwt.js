const jsonwebtoken = require('jsonwebtoken');
const { env } = require('../config/env');
// token expires after 7 days, user must login again
function generateToken(payload) {
    return jsonwebtoken.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}
function verifyToken(token) {
    try {
        return jsonwebtoken.verify(token, env.jwtSecret);
    }
    catch {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
