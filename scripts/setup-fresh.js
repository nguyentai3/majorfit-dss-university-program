#!/usr/bin/env node

const { execSync } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const ROOT = path.resolve(__dirname, '..');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function color(text, c) {
    return `${colors[c]}${text}${colors.reset}`;
}

async function confirm(question) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(`${question} (yes/no): `);
    rl.close();
    return answer.trim().toLowerCase() === 'yes';
}

async function main() {
    console.log(color('\n⚠ This will DROP and recreate the "majorfit" database.', 'yellow'));
    console.log(color('All existing data will be permanently lost.\n', 'yellow'));

    const ok = await confirm('Are you sure you want to continue?');
    if (!ok) {
        console.log('Cancelled.');
        process.exit(0);
    }

    console.log(color('\nProvisioning fresh database...', 'cyan'));
    execSync('npm run db:provision -- --db majorfit --drop', { cwd: ROOT, stdio: 'inherit' });

    console.log(color('\nRunning setup...', 'cyan'));
    execSync('node scripts/setup.js', { cwd: ROOT, stdio: 'inherit' });
}

main().catch((err) => {
    console.error(color(`\nFresh setup failed: ${err.message}`, 'red'));
    process.exit(1);
});
