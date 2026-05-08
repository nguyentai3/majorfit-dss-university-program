export function isAdminUser(user) {
    const accountType = String(user?.accountType || '').toLowerCase();
    if (accountType) return accountType === 'admin';
    return String(user?.role || '').toUpperCase() === 'ADMIN';
}

export function getAdminRole(user) {
    if (!isAdminUser(user)) return null;
    const role = String(user?.adminRole || '').trim().toUpperCase();
    return role || 'SUPER_ADMIN';
}

export function isSuperAdmin(user) {
    return getAdminRole(user) === 'SUPER_ADMIN';
}
