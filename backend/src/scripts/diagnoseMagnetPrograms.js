require('dotenv').config();
const { prisma } = require('../db/prisma');
const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }
function normalizeOnet(v) { return Math.max(0, Math.min(100, ((v - 1) / 6) * 100)); }

function computeWeighted(links) {
    const w = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }; let tw = 0;
    for (const l of links) {
        const sc = safeJson(l.occupation?.riasecScoresJson);
        if (!sc) continue;
        const wt = l.relevance || 5; tw += wt;
        for (const d of DIMS) w[d] += normalizeOnet(Number(sc[d] ?? 0)) * wt;
    }
    if (tw === 0) return null;
    for (const d of DIMS) w[d] = w[d] / tw;
    const sorted = DIMS.slice().sort((a, b) => w[b] - w[a]);
    w[sorted[0]] = Math.min(100, w[sorted[0]] * 1.25);
    w[sorted[1]] = Math.min(100, w[sorted[1]] * 1.10);
    w[sorted[4]] *= 0.85; w[sorted[5]] *= 0.75;
    for (const d of DIMS) w[d] = Math.round(w[d]);
    return w;
}

function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const d of DIMS) { dot += a[d] * b[d]; na += a[d] ** 2; nb += b[d] ** 2; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

(async () => {
    const programs = await prisma.program.findMany({
        include: {
            onetLinks: {
                include: { occupation: { select: { onetCode: true, title: true, hollandCode: true, riasecScoresJson: true } } },
            },
        },
    });

    const rows = [];
    for (const p of programs) {
        const v = computeWeighted(p.onetLinks);
        if (!v) continue;
        const sorted = DIMS.slice().sort((a, b) => v[b] - v[a]);
        const holland = sorted.slice(0, 3).join('');
        const max = v[sorted[0]], min = v[sorted[5]];
        const spread = max - min;
        const magnitude = Math.sqrt(DIMS.reduce((s, d) => s + v[d] ** 2, 0));
        rows.push({ code: p.code, name: p.name, holland, spread, magnitude, vector: v, linkCount: p.onetLinks.length, links: p.onetLinks });
    }

    const centroid = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (const r of rows) for (const d of DIMS) centroid[d] += r.vector[d];
    for (const d of DIMS) centroid[d] /= rows.length;

    const meanMag = rows.reduce((s, r) => s + r.magnitude, 0) / rows.length;
    for (const r of rows) {
        r.centroidCosine = cosineSim(r.vector, centroid);
        r.magRatio = r.magnitude / meanMag;
        r.magnetScore = r.centroidCosine * r.magRatio;
    }

    rows.sort((a, b) => b.magnetScore - a.magnetScore);

    console.log('=== CENTROID of all 93 programs ===');
    console.log(JSON.stringify(centroid, (_k, v) => typeof v === 'number' ? Math.round(v * 10) / 10 : v));
    console.log('Mean magnitude:', meanMag.toFixed(1), '\n');

    console.log('=== TOP 10 MAGNET PROGRAMS (highest centroid_cosine * mag_ratio) ===');
    console.log('code'.padEnd(18), 'holl'.padEnd(5), 'mag'.padStart(6), 'spread'.padStart(7), 'centCos'.padStart(8), 'magRat'.padStart(7), 'magScr'.padStart(7), 'links', 'name');
    for (const r of rows.slice(0, 10)) {
        console.log(r.code.padEnd(18), r.holland.padEnd(5), r.magnitude.toFixed(1).padStart(6), r.spread.toFixed(0).padStart(7), r.centroidCosine.toFixed(4).padStart(8), r.magRatio.toFixed(2).padStart(7), r.magnetScore.toFixed(4).padStart(7), String(r.linkCount).padStart(5), '|', r.name.slice(0, 35));
    }

    console.log('\n=== BOTTOM 8 NICHE PROGRAMS (low magnet score) ===');
    for (const r of rows.slice(-8)) {
        console.log(r.code.padEnd(18), r.holland.padEnd(5), r.magnitude.toFixed(1).padStart(6), r.spread.toFixed(0).padStart(7), r.centroidCosine.toFixed(4).padStart(8), r.magRatio.toFixed(2).padStart(7), r.magnetScore.toFixed(4).padStart(7), String(r.linkCount).padStart(5), '|', r.name.slice(0, 35));
    }

    console.log('\n=== TARGETED CHECK: 4 alleged magnet programs ===');
    const targets = ['HCMUSSH-EDU', 'TDTU-GD', 'UAH-ARCH', 'TDTU-ID'];
    for (const code of targets) {
        const r = rows.find((x) => x.code === code);
        if (!r) { console.log(code, 'NOT FOUND'); continue; }
        console.log('---', code, '|', r.name, '---');
        console.log('  Holland:', r.holland, '| Vector:', JSON.stringify(r.vector));
        console.log('  Mag:', r.magnitude.toFixed(1), '(ratio', r.magRatio.toFixed(2), ')',
                    '| Spread:', r.spread.toFixed(0),
                    '| CentroidCos:', r.centroidCosine.toFixed(4),
                    '| MagnetScore:', r.magnetScore.toFixed(4),
                    '| Links:', r.linkCount);
        console.log('  Linked occupations:');
        r.links.slice(0, 8).forEach((l) => {
            console.log('    -', l.occupation.onetCode, '|', l.occupation.hollandCode || '?', '|', (l.occupation.title || '').slice(0, 50), '| rel:', l.relevance, l.isPrimary ? 'PRIMARY' : '');
        });
    }

    console.log('\n=== STRESS TEST: matching 4 targets vs all programs for 7 archetype student vectors ===');
    const archetypes = [
        { name: 'flat-mid', v: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 } },
        { name: 'high-S (huynhnguyen-medicine)', v: { R: 30, I: 60, A: 70, S: 88, E: 70, C: 40 } },
        { name: 'high-A (phuongkhanh-arch)', v: { R: 40, I: 50, A: 85, S: 60, E: 70, C: 75 } },
        { name: 'high-I (h_it)', v: { R: 50, I: 85, A: 75, S: 50, E: 50, C: 70 } },
        { name: 'high-R (anh-IT)', v: { R: 80, I: 70, A: 30, S: 60, E: 50, C: 75 } },
        { name: 'high-E (tri-business)', v: { R: 65, I: 60, A: 30, S: 80, E: 45, C: 35 } },
        { name: 'high-C (CES)', v: { R: 50, I: 60, A: 40, S: 70, E: 65, C: 80 } },
    ];

    for (const arc of archetypes) {
        const ranked = rows.map((r) => ({ code: r.code, holl: r.holland, sim: cosineSim(arc.v, r.vector) }))
            .sort((a, b) => b.sim - a.sim);
        const top5 = ranked.slice(0, 5).map((x) => `${x.code}(${x.holl},${x.sim.toFixed(3)})`).join(' | ');
        console.log(`[${arc.name.padEnd(30)}] top5: ${top5}`);
        for (const t of targets) {
            const idx = ranked.findIndex((x) => x.code === t);
            console.log(`    ${t} rank #${idx + 1}/${ranked.length} sim=${ranked[idx].sim.toFixed(4)}`);
        }
    }
})().finally(() => process.exit(0));
