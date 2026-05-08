const { calculateHybridEnsemble } = require('./src/services/matching/coreScoringService');
const { BENCHMARK_CASES, ALL_PROGRAMS } = require('./src/services/matching/benchmarkDataset');
const { precisionAtK, ndcgAtK } = require('./src/services/matching/evaluationService');

const WEIGHT_CONFIGS = [
    { label: 'Baseline (0.4/0.4/0.2)', weights: { saw: 0.40, topsis: 0.40, cosine: 0.20 } },
    { label: 'Heavy SAW (0.8/0.1/0.1)', weights: { saw: 0.80, topsis: 0.10, cosine: 0.10 } },
    { label: 'Heavy TOPSIS (0.1/0.8/0.1)', weights: { saw: 0.10, topsis: 0.80, cosine: 0.10 } },
    { label: 'Heavy Cosine (0.1/0.1/0.8)', weights: { saw: 0.10, topsis: 0.10, cosine: 0.80 } },
    { label: 'Equal Blend (0.33/0.33/0.33)', weights: { saw: 0.333, topsis: 0.333, cosine: 0.334 } },
    { label: 'No SAW (0.0/0.5/0.5)', weights: { saw: 0.0, topsis: 0.50, cosine: 0.50 } },
    { label: 'v7 Default (0.35/0/0.65)', weights: { saw: 0.35, topsis: 0, cosine: 0.65 } },
    { label: 'v7 Domain  (0.30/0/0.55/0.15)', weights: { saw: 0.30, topsis: 0, cosine: 0.55, domain: 0.15 } },
];

function scoreWithHybridEnsemble(testCase, programs, weights) {
    const candidates = programs.map((program) => ({
        id: program.id,
        profile: program,
        meta: { focusArea: program.focusArea, name: program.name },
    }));
    const results = calculateHybridEnsemble({
        studentProfile: testCase.studentProfile,
        candidatePrograms: candidates,
        ensembleWeights: weights,
    });
    return results.map((r) => ({ programId: r.programId }));
}

function computeMetrics(predicted, groundTruth) {
    return {
        topHitCorrect: predicted[0] === groundTruth[0],
        precision_at_1: precisionAtK(predicted, groundTruth, 1),
        precision_at_3: precisionAtK(predicted, groundTruth, 3),
        ndcg_at_3: ndcgAtK(predicted, groundTruth, 3),
        ndcg_at_5: ndcgAtK(predicted, groundTruth, 5),
    };
}

function avg(values) {
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

console.log('════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  HYBRID ENSEMBLE SENSITIVITY ANALYSIS');
console.log(`  Test Cases: ${BENCHMARK_CASES.length}`);
console.log('════════════════════════════════════════════════════════════════════════════════════════════\n');

const header = '  Config                             P@1     P@3     NDCG@3  NDCG@5  ';
console.log(header);
console.log('  ───────────────────────────────────────────────────────────────────');

WEIGHT_CONFIGS.forEach(config => {
    const caseMetrics = BENCHMARK_CASES.map(testCase => {
        const predicted = scoreWithHybridEnsemble(testCase, ALL_PROGRAMS, config.weights).map(r => r.programId);
        return computeMetrics(predicted, testCase.groundTruth);
    });

    const aggr = {
        topHit: (caseMetrics.filter(m => m.topHitCorrect).length / caseMetrics.length * 100).toFixed(1) + '%',
        p1: (avg(caseMetrics.map(m => m.precision_at_1)) * 100).toFixed(1) + '%',
        p3: (avg(caseMetrics.map(m => m.precision_at_3)) * 100).toFixed(1) + '%',
        ndcg3: avg(caseMetrics.map(m => m.ndcg_at_3)).toFixed(4),
        ndcg5: avg(caseMetrics.map(m => m.ndcg_at_5)).toFixed(4),
    };

    const pad = (s, l) => String(s).padEnd(l, ' ');
    console.log(`  ${pad(config.label, 34)} ${pad(aggr.p1, 7)} ${pad(aggr.p3, 7)} ${pad(aggr.ndcg3, 7)} ${pad(aggr.ndcg5, 7)}`);
});
console.log('\n════════════════════════════════════════════════════════════════════════════════════════════');
