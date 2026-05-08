const { calculateProgramMatch, calculateHybridEnsemble } = require('./coreScoringService');
const { MATCHING_ALGORITHM_VERSION, FIT_LEVEL_THRESHOLDS } = require('./constants');
const { ALL_PROGRAMS, BENCHMARK_CASES } = require('./benchmarkDataset');


function precisionAtK(predicted, groundTruth, k) {
    const topK = predicted.slice(0, k);
    const relevant = new Set(groundTruth.slice(0, k));
    const hits = topK.filter((id) => relevant.has(id)).length;
    return hits / k;
}

function recallAtK(predicted, groundTruth, k) {
    const topK = predicted.slice(0, k);
    const relevant = groundTruth.slice(0, k);
    const hits = topK.filter((id) => relevant.includes(id)).length;
    return relevant.length ? hits / relevant.length : 0;
}

function dcg(relevanceScores, k) {
    return relevanceScores.slice(0, k).reduce((sum, rel, i) => {
        return sum + (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }, 0);
}

function ndcgAtK(predicted, groundTruth, k) {
    const gtSet = new Map(groundTruth.map((id, i) => [id, groundTruth.length - i]));

    const predictedRelevance = predicted.slice(0, k).map((id) => gtSet.get(id) || 0);
    const idealRelevance = groundTruth.slice(0, k).map((_, i) => groundTruth.length - i);

    const dcgVal = dcg(predictedRelevance, k);
    const idcgVal = dcg(idealRelevance, k);
    return idcgVal > 0 ? dcgVal / idcgVal : 0;
}

function spearmanRho(predicted, groundTruth) {
    const n = groundTruth.length;
    if (n < 2) return 1;

    const predRank = new Map(predicted.map((id, i) => [id, i + 1]));

    const gtRanks = [];
    const pRanks = [];
    for (let i = 0; i < n; i++) {
        gtRanks.push(i + 1);
        pRanks.push(predRank.get(groundTruth[i]) || predicted.length + 1);
    }

    const meanGT = gtRanks.reduce((s, v) => s + v, 0) / n;
    const meanP = pRanks.reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
        const dG = gtRanks[i] - meanGT;
        const dP = pRanks[i] - meanP;
        num += dG * dP;
        denA += dG * dG;
        denB += dP * dP;
    }
    const den = Math.sqrt(denA * denB);
    return den > 0 ? num / den : 0;
}

function meanReciprocalRank(predicted, groundTruth) {
    const bestId = groundTruth[0];
    const position = predicted.indexOf(bestId);
    return position >= 0 ? 1 / (position + 1) : 0;
}

function expectedFitLevel(score) {
    if (score >= FIT_LEVEL_THRESHOLDS.high) return 'HIGH_FIT';
    if (score >= FIT_LEVEL_THRESHOLDS.medium) return 'MEDIUM_FIT';
    return 'STRETCH';
}

function evaluateSingleCase(testCase, programs = ALL_PROGRAMS) {
    const candidatePrograms = programs.map((program) => ({
        id: program.id,
        profile: program,
        meta: { focusArea: program.focusArea, name: program.name },
    }));

    const hybridResults = calculateHybridEnsemble({
        studentProfile: testCase.studentProfile,
        candidatePrograms,
    });

    const results = hybridResults.map((result) => {
        const program = programs.find((p) => p.id === result.programId);
        return {
            programId: result.programId,
            programName: program?.name,
            finalScore: result.hybridScore,
            fitLevel: result.fitLevel,
            sawScore: result.sawScore,
            topsisScore: result.topsisScore,
            cosineScore: result.cosineScore,
            riasecScore: result.sawDetail?.riasecScore,
            growthScore: result.sawDetail?.growthScore,
            confidenceScore: result.sawDetail?.confidenceScore,
        };
    });

    const predictedOrder = results.map((r) => r.programId);
    const gt = testCase.groundTruth;

    const topHitCorrect = predictedOrder[0] === gt[0];
    const top3Predicted = new Set(predictedOrder.slice(0, 3));
    const top3GT = new Set(gt.slice(0, 3));
    const top3Overlap = [...top3GT].filter((id) => top3Predicted.has(id)).length;

    return {
        caseId: testCase.id,
        label: testCase.label,
        predictedOrder,
        groundTruth: gt,
        results,
        metrics: {
            topHitCorrect,
            top3Overlap,
            precision_at_1: precisionAtK(predictedOrder, gt, 1),
            precision_at_3: precisionAtK(predictedOrder, gt, 3),
            recall_at_3: recallAtK(predictedOrder, gt, 3),
            ndcg_at_3: Math.round(ndcgAtK(predictedOrder, gt, 3) * 10000) / 10000,
            ndcg_at_5: Math.round(ndcgAtK(predictedOrder, gt, 5) * 10000) / 10000,
            spearman_rho: Math.round(spearmanRho(predictedOrder, gt) * 10000) / 10000,
            mrr: Math.round(meanReciprocalRank(predictedOrder, gt) * 10000) / 10000,
        },
    };
}

function runFullEvaluation(programs = ALL_PROGRAMS) {
    const caseResults = BENCHMARK_CASES.map((tc) => evaluateSingleCase(tc, programs));

    const n = caseResults.length;
    const aggregate = {
        totalCases: n,
        topHitAccuracy: caseResults.filter((c) => c.metrics.topHitCorrect).length / n,
        meanPrecision_at_1: avg(caseResults.map((c) => c.metrics.precision_at_1)),
        meanPrecision_at_3: avg(caseResults.map((c) => c.metrics.precision_at_3)),
        meanRecall_at_3: avg(caseResults.map((c) => c.metrics.recall_at_3)),
        meanNDCG_at_3: avg(caseResults.map((c) => c.metrics.ndcg_at_3)),
        meanNDCG_at_5: avg(caseResults.map((c) => c.metrics.ndcg_at_5)),
        meanSpearmanRho: avg(caseResults.map((c) => c.metrics.spearman_rho)),
        meanMRR: avg(caseResults.map((c) => c.metrics.mrr)),
    };

    for (const key of Object.keys(aggregate)) {
        if (typeof aggregate[key] === 'number' && key !== 'totalCases') {
            aggregate[key] = Math.round(aggregate[key] * 10000) / 10000;
        }
    }

    const fitLevelCounts = { HIGH_FIT: 0, MEDIUM_FIT: 0, STRETCH: 0 };
    caseResults.forEach((c) => {
        const topResult = c.results[0];
        if (topResult) fitLevelCounts[topResult.fitLevel]++;
    });

    return {
        algorithmVersion: MATCHING_ALGORITHM_VERSION,
        evaluatedAt: new Date().toISOString(),
        programCount: programs.length,
        aggregate,
        fitLevelDistribution: fitLevelCounts,
        cases: caseResults,
    };
}

function avg(values) {
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function formatEvaluationReport(evaluation) {
    const lines = [];
    const hr = '═'.repeat(72);
    const thinHr = '─'.repeat(72);

    lines.push(hr);
    lines.push(`  MATCHING ALGORITHM EVALUATION REPORT`);
    lines.push(`  Algorithm: ${evaluation.algorithmVersion}`);
    lines.push(`  Date: ${evaluation.evaluatedAt}`);
    lines.push(`  Programs: ${evaluation.programCount}  |  Test Cases: ${evaluation.aggregate.totalCases}`);
    lines.push(hr);

    lines.push('');
    lines.push('  AGGREGATE METRICS');
    lines.push(thinHr);

    const a = evaluation.aggregate;
    lines.push(`  Top-1 Hit Accuracy     : ${pct(a.topHitAccuracy)}`);
    lines.push(`  Mean Precision@1       : ${pct(a.meanPrecision_at_1)}`);
    lines.push(`  Mean Precision@3       : ${pct(a.meanPrecision_at_3)}`);
    lines.push(`  Mean Recall@3          : ${pct(a.meanRecall_at_3)}`);
    lines.push(`  Mean NDCG@3            : ${fmt(a.meanNDCG_at_3)}`);
    lines.push(`  Mean NDCG@5            : ${fmt(a.meanNDCG_at_5)}`);
    lines.push(`  Mean Spearman ρ        : ${fmt(a.meanSpearmanRho)}`);
    lines.push(`  Mean MRR               : ${fmt(a.meanMRR)}`);

    lines.push('');
    lines.push('  FIT LEVEL DISTRIBUTION (top-1 results)');
    lines.push(thinHr);
    const fl = evaluation.fitLevelDistribution;
    lines.push(`  HIGH_FIT   : ${fl.HIGH_FIT}`);
    lines.push(`  MEDIUM_FIT : ${fl.MEDIUM_FIT}`);
    lines.push(`  STRETCH    : ${fl.STRETCH}`);

    lines.push('');
    lines.push('  PER-CASE RESULTS');
    lines.push(thinHr);

    for (const c of evaluation.cases) {
        const hit = c.metrics.topHitCorrect ? '✓' : '✗';
        lines.push(`  [${c.caseId}] ${c.label}`);
        lines.push(`    Top-1: ${hit}  |  P@3: ${pct(c.metrics.precision_at_3)}  |  NDCG@3: ${fmt(c.metrics.ndcg_at_3)}  |  ρ: ${fmt(c.metrics.spearman_rho)}`);
        lines.push(`    Expected : ${c.groundTruth.slice(0, 4).map(shortId).join(' → ')}`);
        lines.push(`    Predicted: ${c.predictedOrder.slice(0, 4).map(shortId).join(' → ')}`);
        lines.push(`    Scores   : ${c.results.slice(0, 4).map((r) => `${shortId(r.programId)}=${r.finalScore}`).join(', ')}`);
        lines.push('');
    }

    lines.push(hr);
    return lines.join('\n');
}

function shortId(id) {
    return String(id).replace('bench-', '');
}

function pct(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function fmt(value) {
    return value.toFixed(4);
}

module.exports = {
    evaluateSingleCase,
    runFullEvaluation,
    formatEvaluationReport,
    precisionAtK,
    recallAtK,
    ndcgAtK,
    spearmanRho,
    meanReciprocalRank,
};
