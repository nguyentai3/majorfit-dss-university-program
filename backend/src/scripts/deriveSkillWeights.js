const data = require('../../data/onet/onetOccupations.json');

const SKILL_MAP = {
    critical_thinking: [
        'Critical Thinking',
        'Judgment and Decision Making',
        'Systems Analysis',
        'Systems Evaluation',
    ],
    problem_solving: [
        'Complex Problem Solving',
        'Troubleshooting',
        'Operations Analysis',
        'Quality Control Analysis',
    ],
    programming_orientation: ['Programming', 'Mathematics', 'Systems Analysis'],
    teamwork: ['Coordination', 'Social Perceptiveness', 'Service Orientation'],
    communication: ['Speaking', 'Writing', 'Active Listening', 'Reading Comprehension'],
    leadership: [
        'Management of Personnel Resources',
        'Management of Financial Resources',
        'Negotiation',
        'Persuasion',
    ],
    creativity: ['Active Learning', 'Learning Strategies', 'Science', 'Instructing'],
    detail_orientation: [
        'Monitoring',
        'Operations Monitoring',
        'Time Management',
        'Quality Control Analysis',
    ],
};

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];

const rows = [];
for (const occ of data) {
    if (!occ.riasec || !occ.topSkills || occ.topSkills.length === 0) continue;

    const riasec = {};
    for (const d of RIASEC) riasec[d] = occ.riasec[d] || 0;

    const skillLookup = {};
    for (const s of occ.topSkills) skillLookup[s.name] = s.importance;

    const dims = {};
    for (const [dim, skillNames] of Object.entries(SKILL_MAP)) {
        const values = skillNames.map((n) => skillLookup[n]).filter((v) => v != null);
        dims[dim] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    rows.push({ riasec, dims });
}

console.log('Occupations with data:', rows.length);

function pearson(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0,
        dx2 = 0,
        dy2 = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx;
        const dy = ys[i] - my;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
    }
    return dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
}

console.log('\n--- Correlation Matrix & Derived Weights ---\n');

const allWeights = {};

for (const [dim] of Object.entries(SKILL_MAP)) {
    const valid = rows.filter((r) => r.dims[dim] != null);

    console.log(`=== ${dim} (n=${valid.length}) ===`);

    const correlations = {};
    for (const d of RIASEC) {
        const xs = valid.map((r) => r.riasec[d]);
        const ys = valid.map((r) => r.dims[dim]);
        correlations[d] = pearson(xs, ys);
    }

    for (const d of RIASEC) {
        console.log(`  ${d}: r = ${correlations[d].toFixed(4)}`);
    }

    const positive = {};
    for (const d of RIASEC) {
        if (correlations[d] > 0.05) positive[d] = correlations[d];
    }

    const total = Object.values(positive).reduce((a, b) => a + b, 0);
    const weights = {};
    for (const [d, v] of Object.entries(positive)) {
        weights[d] = Math.round((v / total) * 20) / 20;
    }

    const wSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (wSum !== 1.0) {
        const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
        const diff = +(1.0 - wSum).toFixed(2);
        entries[0][1] = +(entries[0][1] + diff).toFixed(2);
        for (const [k, v] of entries) weights[k] = v;
    }

    const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
    console.log(`  Weights: ${sorted.map(([d, w]) => `${d}=${w}`).join(', ')}`);
    allWeights[dim] = sorted;
    console.log();
}

console.log('\n--- Code-ready weights for buildSkillVector() ---\n');
for (const [dim, weights] of Object.entries(allWeights)) {
    const parts = weights.map(([d, w]) => `['${d}', ${w}]`).join(', ');
    console.log(`  ${dim}: weighted([${parts}]),`);
}
