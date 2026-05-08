const { env } = require('../config/env');

function normalizeEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

function normalizeUsername(username) {
    if (typeof username !== 'string') return '';
    return username.trim().toLowerCase();
}

function isAdminEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    return env.adminEmails.includes(normalized);
}

function isAdminRole(role) {
    return String(role || '').toUpperCase() === 'ADMIN';
}

function isAdminAccountType(accountType) {
    return String(accountType || '').toLowerCase() === 'admin';
}

function isAdminUser(user) {
    if (!user) return false;
    if (user.accountType) return isAdminAccountType(user.accountType);
    return isAdminRole(user.role);
}

module.exports = {
    isAdminAccountType,
    isAdminEmail,
    isAdminRole,
    isAdminUser,
    normalizeEmail,
    normalizeUsername,
};
