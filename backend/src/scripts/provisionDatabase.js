const path = require('node:path');
const { execSync } = require('node:child_process');
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');
const { env } = require('../config/env');
const auth = require('../services/authService');

function parseArgs(argv) {
    const args = {};
    const positional = [];
    for (let i = 0; i < argv.length; i += 1) {
        const item = argv[i];
        if (!item.startsWith('--')) {
            positional.push(item);
            continue;
        }
        const key = item.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
            continue;
        }
        args[key] = next;
        i += 1;
    }
    if (!args.db && positional[0]) args.db = positional[0];
    if (!args['admin-password'] && positional[1]) args['admin-password'] = positional[1];
    return args;
}

function buildTargetDatabaseName(sourceName, args) {
    if (typeof args.db === 'string' && args.db.trim()) return args.db.trim();
    if (process.env.DB_NAME_CLEAN) return process.env.DB_NAME_CLEAN.trim();
    return `${sourceName}_clean`;
}

function toTitleCase(input) {
    if (!input) return '';
    return input.slice(0, 1).toUpperCase() + input.slice(1).toLowerCase();
}

function normalizeUsername(input) {
    const normalized = String(input || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '');
    return normalized || 'admin';
}

async function ensureAdminUsers({ databaseUrl, adminEmails, adminPassword }) {
    if (!adminPassword) {
        console.log('Skip admin bootstrap (no --admin-password provided).');
        return;
    }

    const prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
    });

    try {
        const hash = await auth.hashPassword(adminPassword);
        const usedUsernames = new Set();
        for (let index = 0; index < adminEmails.length; index += 1) {
            const email = adminEmails[index];
            const [firstPart] = email.split('@');
            const [firstNameRaw, lastNameRaw] = firstPart.split('.');
            const firstName = toTitleCase(firstNameRaw || 'Admin');
            const lastName = toTitleCase(lastNameRaw || 'User');
            const preferred = index === 0 ? env.adminUsername : normalizeUsername(firstPart);
            let username = preferred;
            let suffix = 1;
            while (usedUsernames.has(username)) {
                username = `${preferred}${suffix}`;
                suffix += 1;
            }
            usedUsernames.add(username);

            await prisma.admin.upsert({
                where: { email },
                update: {
                    username,
                    role: 'SUPER_ADMIN',
                    password: hash,
                    firstName,
                    lastName,
                    isActive: true,
                },
                create: {
                    username,
                    email,
                    role: 'SUPER_ADMIN',
                    password: hash,
                    firstName,
                    lastName,
                    isActive: true,
                },
            });
        }
    } finally {
        await prisma.$disconnect();
    }
}

async function ensureDefaultUser({ databaseUrl }) {
    const prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
    });

    try {
        const hash = await auth.hashPassword(env.defaultUserPassword);
        await prisma.user.upsert({
            where: { email: env.defaultUserEmail },
            update: {
                password: hash,
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
            },
            create: {
                email: env.defaultUserEmail,
                password: hash,
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
            },
        });
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    if (!env.databaseUrl) {
        throw new Error('DATABASE_URL is missing.');
    }

    const args = parseArgs(process.argv.slice(2));
    const sourceUrl = new URL(env.databaseUrl);
    const sourceDbName = decodeURIComponent(sourceUrl.pathname.replace(/^\//, ''));
    const targetDbName = buildTargetDatabaseName(sourceDbName, args);

    const targetUrl = new URL(env.databaseUrl);
    targetUrl.pathname = `/${encodeURIComponent(targetDbName)}`;
    const targetDatabaseUrl = targetUrl.toString();

    const adminEmails = env.adminEmails;
    if (!adminEmails.length) {
        console.log('Warning: ADMIN_EMAILS is empty. No admin bootstrap email found.');
    }

    const adminPassword =
        (typeof args['admin-password'] === 'string' && args['admin-password']) ||
        process.env.ADMIN_BOOTSTRAP_PASSWORD ||
        env.adminDefaultPassword;

    const connection = await mysql.createConnection({
        host: sourceUrl.hostname,
        port: Number(sourceUrl.port || 3306),
        user: decodeURIComponent(sourceUrl.username || ''),
        password: decodeURIComponent(sourceUrl.password || ''),
    });

    try {
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${targetDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
        console.log(`Database ready: ${targetDbName}`);
    } finally {
        await connection.end();
    }

    const backendRoot = path.resolve(__dirname, '../..');
    const childEnv = {
        ...process.env,
        DATABASE_URL: targetDatabaseUrl,
    };

    execSync('npx prisma db push --schema db/prisma/schema.prisma --skip-generate', {
        cwd: backendRoot,
        stdio: 'inherit',
        env: childEnv,
    });

    execSync('npx prisma generate --schema db/prisma/schema.prisma', {
        cwd: backendRoot,
        stdio: 'inherit',
        env: childEnv,
    });

    await ensureAdminUsers({
        databaseUrl: targetDatabaseUrl,
        adminEmails,
        adminPassword,
    });
    await ensureDefaultUser({
        databaseUrl: targetDatabaseUrl,
    });

    const result = {
        database: targetDbName,
        databaseUrl: targetDatabaseUrl,
        adminEmails,
        adminBootstrapped: Boolean(adminPassword && adminEmails.length),
        defaultUserEmail: env.defaultUserEmail,
    };
    console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error('Failed to provision database:', error.message);
    process.exitCode = 1;
});
