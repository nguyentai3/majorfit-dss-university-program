
require('dotenv').config();
const { prisma } = require('../db/prisma');
const { runMatchingForUser } = require('../services/matching/matchingService');

const PILOT = [
    { email: 'ly@gmail.com', pref: 'HCMIU-BT' },
    { email: 'h_it@gmail.com', pref: 'UIT-IT' },
    { email: 'pntuyen.0402@gmail.com', pref: 'TDTU-LAW' },
    { email: 'huynhnguyen@gmail.com', pref: 'HCMIU-BE' },
    { email: 'phuongkhanh@gmail.com', pref: 'UAH-ARCH' },
    { email: 'huynhanhba@gmail.com', pref: 'HCMIU-IT' },
    { email: 'anh@gmail.com', pref: 'UIT-IT' },
    { email: 'tri@gmail.com', pref: 'HCMUT-LS' },
];

function iachanM(studentCode, programCode) {
    if (!studentCode || !programCode) return 0;
    const s = studentCode.toUpperCase().split('').slice(0, 3);
    const p = programCode.toUpperCase().split('').slice(0, 3);
    const w = [4, 2, 1];
    let m = 0;
    for (let i = 0; i < s.length; i++) {
        const j = p.indexOf(s[i]);
        if (j >= 0) m += w[i] * w[j];
    }
    return m;
}

const CONGRUENCE_THRESHOLD = 9;

(async () => {
    const stats = {
        users: 0,
        top1Congruent: 0,
        top3CongruentRate: [],
        top5CongruentRate: [],
        top10CongruentRate: [],
        prefRank: [],
        prefIachan: [],
    };
    const rows = [];

    for (const { email, pref } of PILOT) {
        const u = await prisma.user.findUnique({ where: { email }, include: { riasecProfile: true } });
        if (!u) { console.log(email, '— USER NOT FOUND'); continue; }
        const stableScores = JSON.parse(u.riasecProfile?.stableScoresJson || '{}');
        const studentHolland = Object.entries(stableScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map((x) => x[0])
            .join('');

        const run = await runMatchingForUser(u.id, { scope: 'all', limit: 20 });
        const items = run.results || [];
        const programIds = items.map((it) => it.program?.id).filter(Boolean);
        const programs = await prisma.program.findMany({
            where: { id: { in: programIds } },
            include: { onetLinks: { where: { isPrimary: true }, include: { occupation: { select: { hollandCode: true } } } } },
        });
        const hollandByProgId = Object.fromEntries(
            programs.map((p) => [p.id, p.onetLinks[0]?.occupation?.hollandCode || '']),
        );

        const enriched = items.map((it, idx) => ({
            rank: idx + 1,
            code: it.program?.code,
            programHolland: hollandByProgId[it.program?.id] || '?',
            iachan: iachanM(studentHolland, hollandByProgId[it.program?.id]),
            score: Number(it.finalScore || 0),
        }));

        const top10 = enriched.slice(0, 10);
        const top5 = enriched.slice(0, 5);
        const top3 = enriched.slice(0, 3);
        const top1 = enriched.slice(0, 1);

        const congruentCount = (arr) => arr.filter((x) => x.iachan >= CONGRUENCE_THRESHOLD).length;
        const top1Cong = congruentCount(top1);
        const top3Cong = congruentCount(top3);
        const top5Cong = congruentCount(top5);
        const top10Cong = congruentCount(top10);

        const prefIdx = enriched.findIndex((x) => x.code === pref);
        const prefIachan = prefIdx >= 0 ? enriched[prefIdx].iachan : null;

        stats.users += 1;
        if (top1Cong > 0) stats.top1Congruent += 1;
        stats.top3CongruentRate.push(top3Cong / 3);
        stats.top5CongruentRate.push(top5Cong / 5);
        stats.top10CongruentRate.push(top10Cong / 10);
        if (prefIdx >= 0) stats.prefRank.push(prefIdx + 1);
        if (prefIachan != null) stats.prefIachan.push(prefIachan);

        rows.push({ email, studentHolland, top1: top1[0], top3Cong, top5Cong, top10Cong, prefRank: prefIdx + 1 || null, prefIachan });

        console.log(`\n--- ${email} | student Holland: ${studentHolland} ---`);
        console.log('  Top-5 with congruence:');
        top5.forEach((x) => console.log(`    #${x.rank} ${x.code.padEnd(15)} Holland: ${x.programHolland.padEnd(5)} | iachan=${x.iachan.toString().padStart(2)} ${x.iachan >= CONGRUENCE_THRESHOLD ? '✓' : '·'} | score=${x.score.toFixed(2)}`));
        console.log(`  Congruent count: top-1=${top1Cong}/1, top-3=${top3Cong}/3, top-5=${top5Cong}/5, top-10=${top10Cong}/10`);
        console.log(`  Preferred (${pref}): ${prefIdx >= 0 ? `rank #${prefIdx + 1}, iachan=${prefIachan}` : 'OUT of top-20'}`);
    }

    const avg = (a) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length) : 0;
    console.log('\n========================================');
    console.log('SUMMARY — Holland Congruence (Iachan M-index ≥ 9)');
    console.log('========================================');
    console.log(`Top-1 has ≥1 congruent program: ${stats.top1Congruent}/${stats.users} (${Math.round(stats.top1Congruent / stats.users * 100)}%)`);
    console.log(`Avg congruence rate Top-3 : ${(avg(stats.top3CongruentRate) * 100).toFixed(1)}%`);
    console.log(`Avg congruence rate Top-5 : ${(avg(stats.top5CongruentRate) * 100).toFixed(1)}%`);
    console.log(`Avg congruence rate Top-10: ${(avg(stats.top10CongruentRate) * 100).toFixed(1)}%`);
    console.log(`\n--- Preferred-major (additional metric, for context only) ---`);
    console.log(`Avg pref rank (when in top-20): ${avg(stats.prefRank).toFixed(1)} (n=${stats.prefRank.length}/${stats.users})`);
    console.log(`Avg pref-major Iachan with student: ${avg(stats.prefIachan).toFixed(1)} (max possible = 21)`);
    console.log(`→ Pref-major Iachan < 9 means user's stated preference is NOT Holland-aligned with their RIASEC code`);
})().finally(() => process.exit(0));
