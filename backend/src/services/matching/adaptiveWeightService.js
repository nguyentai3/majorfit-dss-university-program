const { prisma } = require('../../db/prisma');
const { MATCHING_WEIGHTS } = require('./constants');

const MIN_FEEDBACK_FOR_ADAPTATION = 5;
const LEARNING_RATE = 0.3;

async function computeAdaptiveWeights(userId) {
    const feedbacks = await prisma.matchResultFeedback.findMany({
        where: { userId },
        select: {
            rating: true,
            matchResult: {
                select: {
                    riasecScore: true,
                    growthScore: true,
                    confidenceScore: true,
                },
            },
        },
    });

    if (feedbacks.length < MIN_FEEDBACK_FOR_ADAPTATION) {
        return {
            weights: { ...MATCHING_WEIGHTS },
            adapted: false,
            feedbackCount: feedbacks.length,
            correlations: null,
        };
    }

    const dimensionKeys = ['riasec', 'growth', 'confidence'];
    const fieldMap = {
        riasec: 'riasecScore',
        growth: 'growthScore',
        confidence: 'confidenceScore',
    };

    const ratings = feedbacks.map((f) => f.rating);

    const dimensionScores = {};
    for (const key of dimensionKeys) {
        dimensionScores[key] = feedbacks.map((f) => Number(f.matchResult?.[fieldMap[key]] ?? 0));
    }

    const correlations = {};
    for (const key of dimensionKeys) {
        correlations[key] = pearsonCorrelation(dimensionScores[key], ratings);
    }

    const rawSignals = {};
    let signalSum = 0;
    for (const key of dimensionKeys) {
        const signal = (correlations[key] + 1) / 2;
        rawSignals[key] = signal;
        signalSum += signal;
    }

    const feedbackWeights = {};
    for (const key of dimensionKeys) {
        feedbackWeights[key] = signalSum > 0 ? rawSignals[key] / signalSum : MATCHING_WEIGHTS[key];
    }

    const adapted = {};
    for (const key of dimensionKeys) {
        adapted[key] = round4(
            (1 - LEARNING_RATE) * MATCHING_WEIGHTS[key] + LEARNING_RATE * feedbackWeights[key],
        );
    }

    const adaptedSum = dimensionKeys.reduce((s, k) => s + adapted[k], 0);
    for (const key of dimensionKeys) {
        adapted[key] = round4(adapted[key] / adaptedSum);
    }

    return {
        weights: adapted,
        adapted: true,
        feedbackCount: feedbacks.length,
        correlations,
    };
}

function pearsonCorrelation(xs, ys) {
    const n = xs.length;
    if (n < 2) return 0;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : num / denom;
}

function round4(v) {
    return Math.round(v * 10000) / 10000;
}

module.exports = { computeAdaptiveWeights };
