#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

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

function warn(text) {
    log(`  ! ${text}`, 'yellow');
}

function run(cmd, cwd = ROOT) {
    execSync(cmd, { cwd, stdio: 'inherit' });
}

function checkNodeVersion() {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    if (major < 18) {
        fail(`Node.js v${process.versions.node} is too old. Please install Node.js v18 or higher from https://nodejs.org`);
        process.exit(1);
    }
    success(`Node.js v${process.versions.node}`);
}

function checkMysqlConnection(host = '127.0.0.1', port = 8889, timeout = 3000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => resolve(false));
        socket.connect(port, host);
    });
}

function copyEnvIfMissing(source, target) {
    if (fs.existsSync(target)) {
        success(`${path.relative(ROOT, target)} already exists, skipping`);
        return false;
    }
    if (!fs.existsSync(source)) {
        warn(`${path.relative(ROOT, source)} not found, skipping`);
        return false;
    }
    fs.copyFileSync(source, target);
    success(`Created ${path.relative(ROOT, target)}`);
    return true;
}

async function main() {
    header('MajorFit Setup');
    log('This script will install dependencies, prepare the database,', 'dim');
    log('and seed initial data. It is safe to run multiple times.', 'dim');

    const TOTAL_STEPS = 6;

    step(1, TOTAL_STEPS, 'Checking prerequisites');
    checkNodeVersion();

    // Try MAMP default first (8889), then standard MySQL (3306)
    const PORTS_TO_TRY = [
        { host: '127.0.0.1', port: 8889, label: 'MAMP MySQL' },
        { host: '127.0.0.1', port: 3306, label: 'MySQL standalone' },
    ];
    let mysqlFound = null;
    for (const target of PORTS_TO_TRY) {
        if (await checkMysqlConnection(target.host, target.port)) {
            mysqlFound = target;
            break;
        }
    }
    if (!mysqlFound) {
        fail('Cannot connect to MySQL on 127.0.0.1:8889 or 127.0.0.1:3306');
        log('');
        log('Please make sure MySQL is running. Options:', 'yellow');
        log('  - MAMP (port 8889): open MAMP and click "Start Servers"');
        log('  - MySQL standalone (port 3306): brew services start mysql');
        log('  - Other: edit DB_HOST and DB_PORT in backend/.env');
        log('Then re-run: npm run setup', 'cyan');
        process.exit(1);
    }
    success(`MySQL is reachable at ${mysqlFound.host}:${mysqlFound.port} (${mysqlFound.label})`);
    if (mysqlFound.port !== 8889) {
        warn(`Default config uses port 8889. Update DB_PORT=${mysqlFound.port} in backend/.env if not yet edited.`);
    }

    step(2, TOTAL_STEPS, 'Preparing environment files');
    copyEnvIfMissing(path.join(BACKEND, '.env.example'), path.join(BACKEND, '.env'));
    copyEnvIfMissing(path.join(FRONTEND, '.env.example'), path.join(FRONTEND, '.env'));

    step(3, TOTAL_STEPS, 'Installing dependencies (this may take a minute)');
    log('  Installing root dependencies...', 'dim');
    run('npm install --no-audit --no-fund', ROOT);
    log('  Installing backend dependencies...', 'dim');
    run('npm install --no-audit --no-fund', BACKEND);
    log('  Installing frontend dependencies...', 'dim');
    run('npm install --no-audit --no-fund', FRONTEND);
    success('All dependencies installed');

    step(4, TOTAL_STEPS, 'Provisioning database');
    try {
        run('npm run db:provision -- --db majorfit', ROOT);
        success('Database "majorfit" is ready');
    } catch (err) {
        fail('Database provisioning failed. Check your MAMP MySQL credentials.');
        process.exit(1);
    }

    step(5, TOTAL_STEPS, 'Pushing schema to database');
    run('npm run db:push', ROOT);
    success('Schema synced via Prisma');

    step(6, TOTAL_STEPS, 'Seeding initial data');
    log('  Seeding RIASEC questions...', 'dim');
    run('npm --prefix backend run db:seed-riasec', ROOT);
    log('  Seeding O*NET occupations (923 records, ~10s)...', 'dim');
    run('npm --prefix backend run db:seed-onet', ROOT);
    log('  Seeding Vietnamese university programs (186 records, ~30s)...', 'dim');
    run('npm --prefix backend run db:seed-programs', ROOT);
    log('  Syncing admin account...', 'dim');
    run('npm run db:sync-admin', ROOT);
    success('All seed data loaded');

    header('Setup complete');
    log('Next step:', 'bold');
    log('  npm run dev', 'cyan');
    log('');
    log('Then open:', 'bold');
    log('  Frontend:  http://localhost:5173');
    log('  Backend:   http://localhost:8000');
    log('');
    log('Default accounts (see backend/.env for the actual passwords):', 'bold');
    log('  Admin:  admin@majorfit.local');
    log('  User:   test@gmail.com');
    log('');
    log('AI features (program analysis, match explanations) are optional.', 'dim');
    log('To enable, add a Groq API key to backend/.env (see README).', 'dim');
}

main().catch((err) => {
    log('');
    fail(`Setup failed: ${err.message}`);
    process.exit(1);
});
