const { prisma } = require('../db/prisma');

const API_BASE = 'https://api-v2.onetcenter.org';
const API_KEY = process.env.ONET_API_KEY || 'xB8KU-qfKAZ-CjamV-xRZrW';
const DELAY_MS = 150;

const args = process.argv.slice(2);
const limit = parseInt(args.find((a, i) => args[i - 1] === '--limit') || '9999', 10);
const force = args.includes('--force');

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(path) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
    if (!res.ok) {
        if (res.status === 422 || res.status === 404) return null;
        throw new Error(`API ${res.status} for ${path}: ${await res.text()}`);
    }
    return res.json();
}

async function enrichOne(occ) {
    const code = occ.onetCode;
    const update = {};

    const career = await apiFetch(`/mnm/careers/${code}/`);
    if (career) {
        if (career.also_called) {
            update.alsoCalledJson = JSON.stringify(career.also_called.map((a) => a.title));
        }
    }
    await sleep(DELAY_MS);

    const outlook = await apiFetch(`/mnm/careers/${code}/job_outlook`);
    if (outlook) {
        if (outlook.salary) {
            update.salaryMedian = outlook.salary.annual_median || null;
            update.salary10th = outlook.salary.annual_10th_percentile || null;
            update.salary90th = outlook.salary.annual_90th_percentile || null;
        }
        if (outlook.outlook) {
            update.jobOutlook = outlook.outlook.category || null;
        }
        update.brightOutlook = Array.isArray(outlook.bright_outlook) && outlook.bright_outlook.length > 0;
    }
    await sleep(DELAY_MS);

    const edu = await apiFetch(`/mnm/careers/${code}/education`);
    if (edu) {
        if (edu.job_zone) {
            update.jobZone = edu.job_zone.code || null;
        }
        if (edu.education_usually_needed && edu.education_usually_needed.length > 0) {
            update.educationLevel = edu.education_usually_needed.join(', ');
        }
    }
    await sleep(DELAY_MS);

    const personality = await apiFetch(`/mnm/careers/${code}/personality`);
    if (personality && personality.work_styles) {
        update.workStylesJson = JSON.stringify(personality.work_styles.map((w) => w.name));
    }
    await sleep(DELAY_MS);

    if (Object.keys(update).length > 0) {
        update.dataVersion = '30.2';
        await prisma.onetOccupation.update({ where: { id: occ.id }, data: update });
        return update;
    }
    return null;
}

async function main() {
    console.log(`🔄 O*NET API Enrichment — API v30.2, delay ${DELAY_MS}ms`);
    console.log(`   Force: ${force}, Limit: ${limit}`);

    const where = force ? {} : { salaryMedian: null };
    const occupations = await prisma.onetOccupation.findMany({
        where,
        select: { id: true, onetCode: true, title: true },
        orderBy: { onetCode: 'asc' },
        take: limit,
    });

    console.log(`   Found ${occupations.length} occupations to enrich\n`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < occupations.length; i++) {
        const occ = occupations[i];
        const progress = `[${i + 1}/${occupations.length}]`;
        try {
            const result = await enrichOne(occ);
            if (result) {
                const salary = result.salaryMedian ? `$${(result.salaryMedian / 1000).toFixed(0)}K` : 'N/A';
                const outlook = result.jobOutlook || 'N/A';
                const zone = result.jobZone || '?';
                console.log(`${progress} ✅ ${occ.onetCode} ${occ.title.substring(0, 40).padEnd(40)} salary=${salary} outlook=${outlook} zone=${zone}`);
                success++;
            } else {
                console.log(`${progress} ⏭️  ${occ.onetCode} ${occ.title.substring(0, 40)} — no API data`);
                skipped++;
            }
        } catch (err) {
            console.log(`${progress} ❌ ${occ.onetCode} ${occ.title.substring(0, 40)} — ${err.message}`);
            failed++;
            if (err.message.includes('429')) {
                console.log('   ⚠️  Rate limited, waiting 5s...');
                await sleep(5000);
            }
        }
    }

    console.log(`\n✅ Done: ${success} enriched, ${skipped} skipped, ${failed} failed`);
    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
