const jsonwebtoken = require('jsonwebtoken');
const { env } = require('../config/env');
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
