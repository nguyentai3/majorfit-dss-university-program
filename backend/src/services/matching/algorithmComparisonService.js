const {
    calculateProgramMatch,
    calculateCosineSimilarity,
    calculateTOPSIS,
    calculateHybridEnsemble,
} = require('./coreScoringService');
const { MATCHING_ALGORITHM_VERSION } = require('./constants');
const { ALL_PROGRAMS, BENCHMARK_CASES } = require('./benchmarkDataset');
const {
    precisionAtK,
    recallAtK,
    ndcgAtK,
    spearmanRho,
    meanReciprocalRank,
} = require('./evaluationService');

function scoreWithSAW(testCase, programs) {
    const results = programs.map((program) => {
        const match = calculateProgramMatch({
            studentProfile: testCase.studentProfile,
            programProfile: program,
            programMeta: { focusArea: program.focusArea, name: program.name },
        });
        return { programId: program.id, score: match.finalScore };
    });
    results.sort((a, b) => b.score - a.score);
    return results;
}

function scoreWithCosine(testCase, programs) {
    const results = programs.map((program) => {
        const sim = calculateCosineSimilarity(testCase.studentProfile, program);
        return { programId: program.id, score: sim.score };
    });
    results.sort((a, b) => b.score - a.score);
    return results;
}

function scoreWithTOPSIS(testCase, programs) {
    const topsisResults = calculateTOPSIS(testCase.studentProfile, programs);
    const mapped = topsisResults.map((result, i) => ({
        programId: programs[i].id,
        score: result.score,
    }));
    mapped.sort((a, b) => b.score - a.score);
    return mapped;
}

function scoreWithHybridEnsemble(testCase, programs) {
    const candidates = programs.map((program) => ({
        id: program.id,
        profile: program,
        meta: { focusArea: program.focusArea, name: program.name },
    }));
    const results = calculateHybridEnsemble({
        studentProfile: testCase.studentProfile,
        candidatePrograms: candidates,
    });
    return results.map((r) => ({
        programId: r.programId,
        score: r.hybridScore,
        sawScore: r.sawScore,
        topsisScore: r.topsisScore,
        cosineScore: r.cosineScore,
    }));
}

function computeMetrics(scoredResults, groundTruth) {
    const predicted = scoredResults.map((r) => r.programId);
    const topHitCorrect = predicted[0] === groundTruth[0];

    return {
        topHitCorrect,
        precision_at_1: precisionAtK(predicted, groundTruth, 1),
        precision_at_3: precisionAtK(predicted, groundTruth, 3),
        recall_at_3: recallAtK(predicted, groundTruth, 3),
        ndcg_at_3: Math.round(ndcgAtK(predicted, groundTruth, 3) * 10000) / 10000,
        ndcg_at_5: Math.round(ndcgAtK(predicted, groundTruth, 5) * 10000) / 10000,
        spearman_rho: Math.round(spearmanRho(predicted, groundTruth) * 10000) / 10000,
        mrr: Math.round(meanReciprocalRank(predicted, groundTruth) * 10000) / 10000,
    };
}

const ALGORITHMS = [
    { name: 'SAW (Fishburn 1967)', key: 'saw', scorer: scoreWithSAW },
    { name: 'TOPSIS (Hwang & Yoon 1981)', key: 'topsis', scorer: scoreWithTOPSIS },
    { name: 'Cosine (Salton & McGill 1983)', key: 'cosine', scorer: scoreWithCosine },
    { name: 'Hybrid Ensemble (Opricovic 2004)', key: 'hybrid', scorer: scoreWithHybridEnsemble },
];

function runComparativeEvaluation(programs = ALL_PROGRAMS) {
    const algorithmResults = ALGORITHMS.map((algo) => {
        const caseResults = BENCHMARK_CASES.map((testCase) => {
            const scored = algo.scorer(testCase, programs);
            const metrics = computeMetrics(scored, testCase.groundTruth);
            return {
                caseId: testCase.id,
                label: testCase.label,
                predictedOrder: scored.map((r) => r.programId),
                scores: scored,
                metrics,
            };
        });

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

        return {
            algorithm: algo.name,
            key: algo.key,
            aggregate,
            cases: caseResults,
        };
    });

    return {
        algorithmVersion: MATCHING_ALGORITHM_VERSION,
        evaluatedAt: new Date().toISOString(),
        programCount: programs.length,
        totalCases: BENCHMARK_CASES.length,
        algorithms: algorithmResults,
    };
}

function avg(values) {
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function formatComparativeReport(evaluation) {
    const lines = [];
    const hr = '═'.repeat(92);
    const thinHr = '─'.repeat(92);

    lines.push(hr);
    lines.push('  ALGORITHM COMPARISON REPORT');
    lines.push(`  Version: ${evaluation.algorithmVersion}  |  Date: ${evaluation.evaluatedAt}`);
    lines.push(`  Programs: ${evaluation.programCount}  |  Test Cases: ${evaluation.totalCases}`);
    lines.push(hr);

    lines.push('');
    lines.push('  AGGREGATE METRICS COMPARISON');
    lines.push(thinHr);

    const header = pad('Algorithm', 42) + pad('P@1', 8) + pad('P@3', 8) +
        pad('NDCG@3', 8) + pad('NDCG@5', 8) + pad('ρ', 8) + pad('MRR', 8);
    lines.push(`  ${header}`);
    lines.push(`  ${thinHr}`);

    for (const algo of evaluation.algorithms) {
        const a = algo.aggregate;
        const row = pad(algo.algorithm, 42) +
            pad(pct(a.meanPrecision_at_1), 8) +
            pad(pct(a.meanPrecision_at_3), 8) +
            pad(fmt(a.meanNDCG_at_3), 8) +
            pad(fmt(a.meanNDCG_at_5), 8) +
            pad(fmt(a.meanSpearmanRho), 8) +
            pad(fmt(a.meanMRR), 8);
        lines.push(`  ${row}`);
    }

    lines.push('');
    lines.push('  TOP-1 HIT ACCURACY');
    lines.push(thinHr);
    for (const algo of evaluation.algorithms) {
        lines.push(`  ${pad(algo.algorithm, 42)} ${pct(algo.aggregate.topHitAccuracy)}`);
    }

    lines.push('');
    lines.push('  PER-CASE COMPARISON (Top-1 predictions)');
    lines.push(thinHr);

    for (const testCase of evaluation.algorithms[0].cases) {
        const caseId = testCase.caseId;
        lines.push(`  [${caseId}] ${testCase.label}`);
        lines.push(`    Expected: ${testCase.predictedOrder.length ? '' : 'N/A'}${evaluation.algorithms[0].cases.find((c) => c.caseId === caseId)?.metrics ? '' : ''}`);

        const gt = BENCHMARK_CASES.find((c) => c.id === caseId);
        if (gt) {
            lines.push(`    Ground truth: ${gt.groundTruth.slice(0, 4).map(shortId).join(' → ')}`);
        }

        for (const algo of evaluation.algorithms) {
            const c = algo.cases.find((r) => r.caseId === caseId);
            if (c) {
                const hit = c.metrics.topHitCorrect ? '✓' : '✗';
                lines.push(`    ${pad(algo.algorithm, 40)} ${hit}  ${c.predictedOrder.slice(0, 4).map(shortId).join(' → ')}`);
            }
        }
        lines.push('');
    }

    lines.push(thinHr);
    const best = evaluation.algorithms.reduce((a, b) =>
        (a.aggregate.meanNDCG_at_3 > b.aggregate.meanNDCG_at_3 ? a : b));
    lines.push(`  Best algorithm: ${best.algorithm}`);
    lines.push(`     Mean NDCG@3: ${fmt(best.aggregate.meanNDCG_at_3)}  |  Top-1 Accuracy: ${pct(best.aggregate.topHitAccuracy)}`);
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

function pad(str, len) {
    const s = String(str);
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

module.exports = {
    runComparativeEvaluation,
    formatComparativeReport,
    ALGORITHMS,
};
