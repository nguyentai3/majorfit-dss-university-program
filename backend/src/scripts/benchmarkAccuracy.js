#!/usr/bin/env node


const {
    runFullEvaluation,
    formatEvaluationReport,
} = require('../services/matching/evaluationService');
const {
    runComparativeEvaluation,
    formatComparativeReport,
} = require('../services/matching/algorithmComparisonService');

function main() {
    const singleEval = runFullEvaluation();
    const comparisonEval = runComparativeEvaluation();

    console.log(formatEvaluationReport(singleEval));
    console.log('');
    console.log(formatComparativeReport(comparisonEval));

    const hybrid = comparisonEval.algorithms.find((algo) => algo.key === 'hybrid');
    const cosine = comparisonEval.algorithms.find((algo) => algo.key === 'cosine');

    console.log('');
    console.log('Summary');
    console.log('-------');
    if (hybrid) {
        console.log(
            `Hybrid top-1=${pct(hybrid.aggregate.topHitAccuracy)}, ` +
            `P@3=${pct(hybrid.aggregate.meanPrecision_at_3)}, ` +
            `NDCG@3=${fmt(hybrid.aggregate.meanNDCG_at_3)}, ` +
            `rho=${fmt(hybrid.aggregate.meanSpearmanRho)}`,
        );
    }
    if (cosine) {
        console.log(
            `Cosine top-1=${pct(cosine.aggregate.topHitAccuracy)}, ` +
            `P@3=${pct(cosine.aggregate.meanPrecision_at_3)}, ` +
            `NDCG@3=${fmt(cosine.aggregate.meanNDCG_at_3)}, ` +
            `rho=${fmt(cosine.aggregate.meanSpearmanRho)}`,
        );
    }
    console.log(
        'Interpretation: compare the benchmark winner against the current runtime hybrid ensemble ' +
        'before changing production weights or the scoring pipeline.',
    );
}

function pct(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function fmt(value) {
    return Number(value).toFixed(4);
}

try {
    main();
} catch (error) {
    console.error('Benchmark failed.');
    console.error(error);
    process.exitCode = 1;
}
