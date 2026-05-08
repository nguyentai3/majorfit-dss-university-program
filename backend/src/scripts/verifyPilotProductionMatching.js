require('dotenv').config();
const { prisma } = require('../db/prisma');
const { runMatchingForUser } = require('../services/matching/matchingService');

const PILOT_EMAILS = [
    'ly@gmail.com',
    'h_it@gmail.com',
    'pntuyen.0402@gmail.com',
    'huynhnguyen@gmail.com',
    'phuongkhanh@gmail.com',
    'huynhanhba@gmail.com',
    'anh@gmail.com',
    'tri@gmail.com',
];

const PREFERRED = {
    'ly@gmail.com': { dir: 'Biotechnology / Biology', candidate: 'HCMIU-BT' },
    'h_it@gmail.com': { dir: 'IT / CS', candidate: 'UIT-IT' },
    'pntuyen.0402@gmail.com': { dir: 'Law', candidate: 'TDTU-LAW' },
    'huynhnguyen@gmail.com': { dir: 'Medicine', candidate: 'HCMIU-BE' },
    'phuongkhanh@gmail.com': { dir: 'Architecture / Design', candidate: 'UAH-ARCH' },
    'huynhanhba@gmail.com': { dir: 'IT', candidate: 'HCMIU-IT' },
    'anh@gmail.com': { dir: 'IT', candidate: 'UIT-IT' },
    'tri@gmail.com': { dir: 'Business / Logistics', candidate: 'HCMUT-LS' },
};

(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: PILOT_EMAILS } }, select: { id: true, email: true } });
    const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));

    const allCounts = { magnetsInTop5: { 'UAH-ARCH': 0, 'HCMUSSH-EDU': 0, 'TDTU-GD': 0, 'TDTU-ID': 0, 'HCMUSSH-IR': 0 } };
    const summaryRows = [];

    for (const email of PILOT_EMAILS) {
        const u = byEmail[email];
        if (!u) { console.log(email, '— USER NOT FOUND'); continue; }
        const pref = PREFERRED[email];

        try {
            const run = await runMatchingForUser(u.id, { scope: 'all', limit: 20 });
            const items = run.results || [];
            const codes = items.map((it) => it.program?.code || '?');
            const top5 = codes.slice(0, 5);
            const top10 = codes.slice(0, 10);
            const prefRank = codes.findIndex((c) => c === pref.candidate);
            const top1Score = items[0]?.finalScore?.toFixed(2);

            for (const m of Object.keys(allCounts.magnetsInTop5)) {
                if (top5.includes(m)) allCounts.magnetsInTop5[m] += 1;
            }

            console.log('---', email, '|', pref.dir, '---');
            console.log('  Top-5:', top5.join(' > '));
            console.log('  Top-1 score:', top1Score);
            console.log(`  Preferred (${pref.candidate}) rank: ${prefRank >= 0 ? '#' + (prefRank + 1) : 'OUT of top-20'}`);

            summaryRows.push({
                email,
                pref: pref.candidate,
                top1: top5[0],
                top1Score,
                prefRank: prefRank >= 0 ? prefRank + 1 : null,
                inTop5: top5.includes(pref.candidate),
                inTop10: top10.includes(pref.candidate),
            });
        } catch (e) {
            console.log(email, '— ERROR:', e.message);
            summaryRows.push({ email, error: e.message });
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('user'.padEnd(30), 'preferred'.padEnd(14), 'top1'.padEnd(14), 'pref rank', 'top5?', 'top10?');
    let inTop1 = 0, inTop5 = 0, inTop10 = 0, valid = 0;
    for (const r of summaryRows) {
        if (r.error) { console.log(r.email, 'ERROR'); continue; }
        valid += 1;
        if (r.prefRank === 1) inTop1 += 1;
        if (r.inTop5) inTop5 += 1;
        if (r.inTop10) inTop10 += 1;
        console.log(r.email.padEnd(30), r.pref.padEnd(14), r.top1.padEnd(14), String(r.prefRank || 'OUT').padStart(8), '   ', r.inTop5 ? 'Y' : 'N', '   ', r.inTop10 ? 'Y' : 'N');
    }
    console.log(`\nTop-1 = ${inTop1}/${valid} | Top-5 = ${inTop5}/${valid} | Top-10 = ${inTop10}/${valid}`);

    console.log('\n=== Magnet appearance count in Top-5 (across', valid, 'users) ===');
    for (const [m, c] of Object.entries(allCounts.magnetsInTop5)) {
        console.log(`  ${m.padEnd(15)} appears in top-5 of ${c}/${valid} users (${Math.round(c / valid * 100)}%)`);
    }
})().finally(() => process.exit(0));
