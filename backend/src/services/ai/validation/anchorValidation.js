
const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

function validateAgainstAnchors(estimate, anchorPrograms, margin = 10) {
    const details = {};
    const flagged = [];

    for (const dim of DIMS) {
        const values = anchorPrograms
            .map(a => a.profile?.riasecScores?.[dim])
            .filter(v => v != null && !isNaN(v));

        if (values.length === 0) {
            details[dim] = { estimate: estimate[dim], range: [0, 100], status: 'NO_DATA' };
            continue;
        }

        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const std = Math.sqrt(variance);

        const lower = Math.max(0, Math.round(mean - 2 * std - margin));
        const upper = Math.min(100, Math.round(mean + 2 * std + margin));
        const estValue = estimate[dim] || 0;
        const inRange = estValue >= lower && estValue <= upper;

        if (!inRange) flagged.push(dim);

        details[dim] = {
            estimate: estValue,
            anchorMean: Math.round(mean),
            anchorStd: Math.round(std * 10) / 10,
            range: [lower, upper],
            status: inRange ? 'OK' : 'OUT_OF_RANGE',
        };
    }

    return {
        withinBounds: flagged.length === 0,
        flaggedDimensions: flagged,
        details,
    };
}

function consistencyCheck(estimate1, estimate2) {
    let maxDiff = 0;
    const averaged = {};

    for (const dim of DIMS) {
        const v1 = estimate1[dim] || 0;
        const v2 = estimate2[dim] || 0;
        const diff = Math.abs(v1 - v2);
        if (diff > maxDiff) maxDiff = diff;
        averaged[dim] = Math.round((v1 + v2) / 2);
    }

    let consistency;
    let confidenceAdjust;

    if (maxDiff < 5) {
        consistency = 'very_consistent';
        confidenceAdjust = 20;
    } else if (maxDiff < 10) {
        consistency = 'consistent';
        confidenceAdjust = 10;
    } else if (maxDiff < 15) {
        consistency = 'moderate';
        confidenceAdjust = 0;
    } else {
        consistency = 'inconsistent';
        confidenceAdjust = -15;
    }

    return {
        consistency,
        maxDifference: maxDiff,
        averagedEstimate: averaged,
        confidenceAdjust,
    };
}

function computeFinalConfidence(aiConfidence, anchorResult, consistencyResult) {
    let score = aiConfidence || 50;

    if (anchorResult.withinBounds) {
        score += 10;
    } else {
        score -= anchorResult.flaggedDimensions.length * 5;
    }

    if (consistencyResult) {
        score += consistencyResult.confidenceAdjust;
    }

    score = Math.max(10, Math.min(95, Math.round(score)));

    let level;
    let needsReview;
    if (score >= 70) {
        level = 'high';
        needsReview = false;
    } else if (score >= 40) {
        level = 'medium';
        needsReview = true;
    } else {
        level = 'low';
        needsReview = true;
    }

    return { finalConfidence: score, level, needsReview };
}

module.exports = {
    validateAgainstAnchors,
    consistencyCheck,
    computeFinalConfidence,
    DIMS,
};
