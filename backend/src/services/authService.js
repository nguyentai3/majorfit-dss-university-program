const bcryptjs = require('bcryptjs');
async function hashPassword(password) {
    return bcryptjs.hash(password, 12);
}
async function verifyPassword(password, hashedPassword) {
    return bcryptjs.compare(password, hashedPassword);
}

module.exports = { hashPassword, verifyPassword };
