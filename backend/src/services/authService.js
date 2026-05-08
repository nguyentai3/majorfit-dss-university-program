const bcryptjs = require('bcryptjs');
// 12 rounds — slower but safer against brute force
async function hashPassword(password) {
    return bcryptjs.hash(password, 12);
}
async function verifyPassword(password, hashedPassword) {
    return bcryptjs.compare(password, hashedPassword);
}

module.exports = { hashPassword, verifyPassword };
