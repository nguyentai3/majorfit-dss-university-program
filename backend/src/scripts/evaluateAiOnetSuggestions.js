#!/usr/bin/env node


const { prisma } = require('../db/prisma');

const DEFAULT_BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_CODES = [
    'UIT-INFOSEC',
    'HUST-DS',
    'UIT-SE',
    'HUST-CS',
    'HCMUS-DS',
    'HCMUS-CS',
    'HCMUT-CE',
];

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

async function main() {
    const requestedCodes = process.argv.slice(2);
    const codes = requestedCodes.length > 0 ? requestedCodes : DEFAULT_CODES;

    const adminCookie = await signInAdmin();
    const programs = await prisma.program.findMany({
        where: { code: { in: codes } },
        select: {
            id: true,
            code: true,
            name: true,
            onetLinks: {
                include: { occupation: true },
                orderBy: [{ isPrimary: 'desc' }, { relevance: 'desc' }],
            },
            curriculums: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { id: true, version: true },
            },
        },
        orderBy: { code: 'asc' },
    });

    const rows = [];
    for (const program of programs) {
        if (program.curriculums.length === 0) {
            rows.push({ code: program.code, name: program.name, error: 'No curriculum' });
            continue;
        }

        const response = await fetch(`${DEFAULT_BASE_URL}/api/admin/programs/${program.id}/ai-analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: adminCookie,
            },
            body: JSON.stringify({ mode: 'suggest' }),
        });

        const payload = await response.json();
        if (!response.ok) {
            rows.push({
                code: program.code,
                name: program.name,
                error: payload.error || `HTTP ${response.status}`,
            });
            continue;
        }

        const suggested = (payload.interpretation?.suggestedOccupations || []).map((item) => item.onetCode);
        const expected = program.onetLinks.map((link) => link.occupation.onetCode);
        const overlap = suggested.filter((code) => expected.includes(code));

        rows.push({
            code: program.code,
            name: program.name,
            suggested,
            expected,
            overlap,
            precisionLike: round(suggested.length ? overlap.length / suggested.length : 0),
            recallLike: round(expected.length ? overlap.length / expected.length : 0),
        });
    }

    printReport(rows);
}

async function signInAdmin() {
    const response = await fetch(`${DEFAULT_BASE_URL}/api/auth/admin/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: process.env.BENCHMARK_ADMIN_USERNAME || 'admin',
            password: requiredEnv('BENCHMARK_ADMIN_PASSWORD'),
        }),
    });

    const cookie = response.headers.get('set-cookie');
    if (!(response.ok && cookie)) {
        throw new Error(`Admin sign-in failed with HTTP ${response.status}`);
    }
    return cookie.split(';')[0];
}

function printReport(rows) {
    const okRows = rows.filter((row) => !row.error);
    const avgPrecision = round(avg(okRows.map((row) => row.precisionLike)));
    const avgRecall = round(avg(okRows.map((row) => row.recallLike)));

    console.log('════════════════════════════════════════════════════════════════════');
    console.log('  AI O*NET SUGGESTION CONSISTENCY CHECK');
    console.log(`  Base URL: ${DEFAULT_BASE_URL}`);
    console.log(`  Programs evaluated: ${okRows.length}/${rows.length}`);
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('');

    for (const row of rows) {
        console.log(`[${row.code}] ${row.name}`);
        if (row.error) {
            console.log(`  Error: ${row.error}`);
            console.log('');
            continue;
        }

        console.log(`  Suggested : ${row.suggested.join(', ')}`);
        console.log(`  Persisted : ${row.expected.join(', ')}`);
        console.log(`  Overlap   : ${row.overlap.join(', ') || '-'}`);
        console.log(`  Precision : ${(row.precisionLike * 100).toFixed(1)}%`);
        console.log(`  Recall    : ${(row.recallLike * 100).toFixed(1)}%`);
        console.log('');
    }

    console.log('Summary');
    console.log('-------');
    console.log(`Average precision-like overlap: ${(avgPrecision * 100).toFixed(1)}%`);
    console.log(`Average recall-like overlap   : ${(avgRecall * 100).toFixed(1)}%`);
    console.log('');
    console.log(
        'Interpretation: this is a consistency check against the current curated O*NET links, ' +
        'not a formal academic gold-standard accuracy metric.',
    );
}

function avg(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
    return Math.round(value * 10000) / 10000;
}

main()
    .catch(async (error) => {
        console.error('AI O*NET evaluation failed.');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
