const { prisma } = require('../db/prisma');
const { env } = require('../config/env');
const auth = require('../services/authService');

function normalizeUsername(input) {
    const normalized = String(input || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '');
    return normalized || 'admin';
}

async function main() {
    const adminEmails = env.adminEmails;
    if (!adminEmails.length) {
        console.log('No ADMIN_EMAILS configured. Nothing to sync.');
        return;
    }

    const normalizedAdminEmails = [...new Set(adminEmails.map((email) => email.toLowerCase()))];
    const bootstrapPassword =
        String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '').trim() ||
        env.adminDefaultPassword;
    const bootstrapHash = bootstrapPassword ? await auth.hashPassword(bootstrapPassword) : null;
    const usedUsernames = new Set();
    const existingAdmins = await prisma.admin.findMany({
        select: { email: true, username: true },
    });
    const reservedUsernames = new Set(
        existingAdmins
            .map((admin) => normalizeUsername(admin.username))
            .filter(Boolean),
    );

    let createdAdmins = 0;
    let updatedAdmins = 0;
    const missingAdminEmails = [];

    for (let index = 0; index < normalizedAdminEmails.length; index += 1) {
        const email = normalizedAdminEmails[index];
        const [existingAdmin, matchingUser] = await Promise.all([
            prisma.admin.findUnique({ where: { email } }),
            prisma.user.findUnique({
                where: { email },
                select: { firstName: true, lastName: true, password: true },
            }),
        ]);

        const [localPart] = email.split('@');
        const preferred =
            existingAdmin?.username ||
            (index === 0
                ? normalizeUsername(env.adminUsername || localPart)
                : normalizeUsername(localPart));
        const currentUsername = existingAdmin?.username ? normalizeUsername(existingAdmin.username) : null;
        let username = normalizeUsername(preferred);
        let suffix = 1;
        while (
            usedUsernames.has(username) ||
            (reservedUsernames.has(username) && username !== currentUsername)
        ) {
            username = `${normalizeUsername(preferred)}${suffix}`;
            suffix += 1;
        }
        usedUsernames.add(username);

        const fallbackPassword = bootstrapHash || existingAdmin?.password || matchingUser?.password;
        if (!fallbackPassword) {
            missingAdminEmails.push(email);
            continue;
        }

        const baseData = {
            username,
            role: 'SUPER_ADMIN',
            firstName: matchingUser?.firstName || existingAdmin?.firstName || null,
            lastName: matchingUser?.lastName || existingAdmin?.lastName || null,
            password: fallbackPassword,
            isActive: true,
        };

        if (existingAdmin) {
            await prisma.admin.update({
                where: { email },
                data: baseData,
            });
            updatedAdmins += 1;
            continue;
        }

        await prisma.admin.create({
            data: {
                email,
                ...baseData,
            },
        });
        createdAdmins += 1;
    }

    const adminUsers = await prisma.admin.findMany({
        select: { id: true, username: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
        orderBy: { username: 'asc' },
    });

    const demotedUsers = await prisma.user.updateMany({
        where: {
            email: { in: normalizedAdminEmails },
            role: 'ADMIN',
        },
        data: { role: 'USER' },
    });

    let defaultUser = null;
    if (env.defaultUserEmail && env.defaultUserPassword) {
        const defaultUserHash = await auth.hashPassword(env.defaultUserPassword);
        defaultUser = await prisma.user.upsert({
            where: { email: env.defaultUserEmail },
            update: {
                password: defaultUserHash,
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
            },
            create: {
                email: env.defaultUserEmail,
                password: defaultUserHash,
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
    }

    console.log(JSON.stringify({
        syncedAdminEmails: normalizedAdminEmails,
        createdAdmins,
        updatedAdmins,
        demotedUsersInUserTable: demotedUsers.count,
        bootstrapPasswordUsed: Boolean(bootstrapHash),
        adminUsers,
        defaultUser,
        missingAdminEmails,
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('Failed to sync admin accounts:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
