const { fitLevelLabel } = require('./constants');

function summarizeSignals(items = []) {
    return items
        .slice(0, 3)
        .map((item) => item.label)
        .filter(Boolean);
}

function buildTradeoff(reference, compared) {
    const scoreDelta = Math.round((Number(reference.finalScore || 0) - Number(compared.finalScore || 0)) * 100) / 100;
    return {
        againstProgramId: compared.program?.id || null,
        againstProgramName: compared.program?.name || null,
        scoreDelta,
        strongerOn: summarizeSignals(reference.strengths || []),
        weakerOn: summarizeSignals(compared.strengths || []),
    };
}

function buildMatchingComparisonSummary(results = []) {
    const top = results.slice(0, 3);
    if (!top.length) {
        return {
            recommendedProgramId: null,
            recommendedProgramName: null,
            confidence: 'LOW',
            summary: 'No matching candidates were available for comparison.',
            tradeoffs: [],
            recommendationOrder: [],
            counselorAdvice: 'Add more published programs or broaden the matching scope before comparing.',
        };
    }

    const winner = top[0];
    const runnerUp = top[1] || null;
    const scoreGap = runnerUp ? Number(winner.finalScore || 0) - Number(runnerUp.finalScore || 0) : Number(winner.finalScore || 0);
    const confidence =
        scoreGap >= 8 ? 'HIGH'
        : scoreGap >= 3 ? 'MEDIUM'
        : 'LOW';

    const recommendationOrder = top.map((item) => ({
        programId: item.program?.id || null,
        programName: item.program?.name || null,
        universityName: item.program?.university?.shortName || item.program?.university?.name || null,
        finalScore: item.finalScore,
        fitLevel: item.fitLevel,
        fitLevelLabel: fitLevelLabel(item.fitLevel),
        mainReasons: summarizeSignals(item.strengths || []),
    }));

    const tradeoffs = top.slice(1).map((item) => buildTradeoff(winner, item));
    const summary = `${winner.program?.name || 'The top program'} currently ranks first because it combines the strongest overall score with the best alignment on ${summarizeSignals(winner.strengths || []).join(', ') || 'your key signals'}.`;
    const counselorAdvice = winner.gaps?.length
        ? `Prioritize ${winner.program?.name || 'the first-ranked program'}, but keep working on ${summarizeSignals(winner.gaps).join(', ') || 'the identified gaps'} to strengthen readiness.`
        : `Prioritize ${winner.program?.name || 'the first-ranked program'} and use the runner-up options as comparison references.`;

    return {
        recommendedProgramId: winner.program?.id || null,
        recommendedProgramName: winner.program?.name || null,
        recommendedUniversityName: winner.program?.university?.shortName || winner.program?.university?.name || null,
        confidence,
        scoreGap: Math.round(scoreGap * 100) / 100,
        summary,
        tradeoffs,
        recommendationOrder,
        counselorAdvice,
    };
}

module.exports = {
    buildMatchingComparisonSummary,
};
