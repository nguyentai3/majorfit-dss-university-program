#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(text) {
    log('');
    log('━'.repeat(60), 'dim');
    log(text, 'bold');
    log('━'.repeat(60), 'dim');
}

function step(num, total, text) {
    log(`\n[${num}/${total}] ${text}`, 'cyan');
}

function success(text) {
    log(`  ✓ ${text}`, 'green');
}

function fail(text) {
    log(`  ✗ ${text}`, 'red');
}

async function main() {
    header('MajorFit Demo Dump Preparation');
    log('This script resets all account passwords to "123456" and exports', 'dim');
    log('the database to a SQL file ready for sharing.', 'dim');

    const TOTAL = 4;

    step(1, TOTAL, 'Loading Prisma client');
    process.chdir(BACKEND);
    const { PrismaClient } = require(path.join(BACKEND, 'node_modules/@prisma/client'));
    const bcryptjs = require(path.join(BACKEND, 'node_modules/bcryptjs'));
    const prisma = new PrismaClient();
    success('Prisma client loaded');

    step(2, TOTAL, 'Resetting all account passwords to "123456"');
    const newHash = await bcryptjs.hash('123456', 12);

    const userResult = await prisma.user.updateMany({
        data: { password: newHash },
    });
    success(`Reset ${userResult.count} user passwords`);

    const adminResult = await prisma.admin.updateMany({
        data: { password: newHash },
    });
    success(`Reset ${adminResult.count} admin passwords`);

    // Make sure test@gmail.com exists with default password
    const testUser = await prisma.user.findUnique({ where: { email: 'test@gmail.com' } });
    if (!testUser) {
        await prisma.user.create({
            data: {
                email: 'test@gmail.com',
                password: newHash,
                firstName: 'Test',
                lastName: 'User',
                role: 'USER',
            },
        });
        success('Created default test@gmail.com user');
    } else {
        success('Default test@gmail.com user already exists');
    }

    // Make sure admin exists with default password
    const adminUser = await prisma.admin.findUnique({ where: { email: 'admin@majorfit.local' } });
    if (!adminUser) {
        await prisma.admin.create({
            data: {
                username: 'admin',
                email: 'admin@majorfit.local',
                password: newHash,
                firstName: 'Admin',
                lastName: 'MajorFit',
                role: 'SUPER_ADMIN',
                isActive: true,
            },
        });
        success('Created default admin@majorfit.local user');
    } else {
        success('Default admin@majorfit.local user already exists');
    }

    await prisma.$disconnect();

    step(3, TOTAL, 'Detecting MySQL connection');
    let mysqlBin = null;
    let port = null;
    const candidates = [
        { bin: '/Applications/MAMP/Library/bin/mysql80/bin/mysqldump', port: 8889 },
        { bin: '/Applications/MAMP/Library/bin/mysqldump', port: 8889 },
        { bin: '/usr/local/mysql/bin/mysqldump', port: 3306 },
        { bin: 'mysqldump', port: 3306 },
    ];
    for (const c of candidates) {
        try {
            execSync(`${c.bin} --version`, { stdio: 'pipe' });
            mysqlBin = c.bin;
            port = c.port;
            break;
        } catch {}
    }
    if (!mysqlBin) {
        fail('mysqldump not found. Install MAMP or MySQL command-line tools.');
        process.exit(1);
    }
    success(`Using ${mysqlBin} (port ${port})`);

    step(4, TOTAL, 'Exporting database to SQL file');
    const outputPath = path.join(os.homedir(), 'Documents', 'majorfit_demo.sql');
    const dbName = process.env.DB_NAME || 'Majorfit_thesis';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASS || 'root';

    const cmd = `${mysqlBin} -h 127.0.0.1 -P ${port} -u ${dbUser} -p${dbPass} ${dbName} > ${outputPath}`;
    log(`  Database: ${dbName}`, 'dim');
    log(`  Output:   ${outputPath}`, 'dim');

    try {
        execSync(cmd, { shell: '/bin/bash' });
        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
        success(`Exported ${sizeMB} MB to ${outputPath}`);
    } catch (err) {
        fail(`mysqldump failed: ${err.message}`);
        process.exit(1);
    }

    header('Dump complete');
    log('Next steps:', 'bold');
    log('');
    log(`  1. Upload ${outputPath} to Google Drive`);
    log('  2. Right-click the file → Share → "Anyone with the link"');
    log('  3. Copy the share link');
    log('  4. Replace "your-share-link-here" in README.md with the actual link');
    log('');
    log('Default credentials (after import):', 'bold');
    log('  Admin:  admin@majorfit.local / 123456');
    log('  User:   test@gmail.com / 123456');
    log('  Pilot:  any email in DB / 123456');
    log('');
}

main().catch((err) => {
    log('');
    fail(`Failed: ${err.message}`);
    console.error(err);
    process.exit(1);
});
