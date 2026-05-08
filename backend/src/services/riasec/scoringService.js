const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];

function normalizeSubmission(body) {
    if (body?.answers && typeof body.answers === 'object') {
        return body.answers;
    }

    if (Array.isArray(body?.responses)) {
        return body.responses.reduce((acc, item) => {
            if (item?.questionId) {
                acc[item.questionId] = item.answer;
            }
            return acc;
        }, {});
    }

    return body && typeof body === 'object' ? body : {};
}

function toNumericAnswer(rawValue) {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
        return null;
    }

    if (numericValue < 1 || numericValue > 5) {
        return null;
    }

    return Math.round(numericValue);
}

function validateSubmission(questions, answersByQuestionId) {
    const normalizedAnswers = {};
    const missingQuestions = [];
    const invalidQuestions = [];

    for (const question of questions) {
        const value = toNumericAnswer(answersByQuestionId?.[question.id]);

        if (value == null) {
            missingQuestions.push(question.id);
            continue;
        }

        if (value < 1 || value > 5) {
            invalidQuestions.push(question.id);
            continue;
        }

        normalizedAnswers[question.id] = value;
    }

    return {
        isValid: missingQuestions.length === 0 && invalidQuestions.length === 0,
        missingQuestions,
        invalidQuestions,
        normalizedAnswers,
    };
}

function calculateScores(questions, answersByQuestionId) {
    const rawScores = DIMENSIONS.reduce((acc, dimension) => {
        acc[dimension] = 0;
        return acc;
    }, {});

    const dimensionCounts = DIMENSIONS.reduce((acc, dimension) => {
        acc[dimension] = 0;
        return acc;
    }, {});

    const answerRows = questions.map((question) => {
        const answerValue = answersByQuestionId[question.id];
        rawScores[question.dimension] += answerValue;
        dimensionCounts[question.dimension] += 1;

        return {
            questionId: question.id,
            questionCode: question.code,
            questionPrompt: question.prompt || question.question,
            dimension: question.dimension,
            answerValue,
            score: answerValue,
        };
    });

    const normalizedScores = DIMENSIONS.reduce((acc, dimension) => {
        const maxScore = Math.max(dimensionCounts[dimension] * 5, 1);
        acc[dimension] = Math.round((rawScores[dimension] / maxScore) * 100);
        return acc;
    }, {});

    return {
        rawScores,
        normalizedScores,
        dimensionCounts,
        answerRows,
    };
}

function buildHollandCode(rawScores) {
    return Object.entries(rawScores)
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            return DIMENSIONS.indexOf(a[0]) - DIMENSIONS.indexOf(b[0]);
        })
        .slice(0, 3)
        .map(([dimension]) => dimension)
        .join('');
}

function buildHollandCodeAnalysis(scores) {
    const sorted = Object.entries(scores)
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return DIMENSIONS.indexOf(a[0]) - DIMENSIONS.indexOf(b[0]);
        });

    const code = sorted.slice(0, 3).map(([dim]) => dim).join('');
    const dominantMargin = sorted.length >= 2 ? sorted[0][1] - sorted[1][1] : 0;
    const codeMargin = sorted.length >= 4 ? sorted[2][1] - sorted[3][1] : 0;

    return {
        code,
        dominantMargin,
        codeMargin,
        isAmbiguous: codeMargin < 5 || dominantMargin < 5,
        isDominantClear: dominantMargin >= 5,
    };
}

function buildTrend(latestScores, previousScores = null) {
    return DIMENSIONS.map((dimension) => ({
        dimension,
        current: latestScores?.[dimension] ?? 0,
        previous: previousScores?.[dimension] ?? null,
        delta:
            typeof previousScores?.[dimension] === 'number'
                ? (latestScores?.[dimension] ?? 0) - previousScores[dimension]
                : null,
    }));
}

function weightedAverage(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return Math.round(
        items.reduce((sum, value, index) => sum + Number(value || 0) * (weights[index] || 0), 0) /
            Math.max(totalWeight, 1),
    );
}

function buildStableScores(scoreHistory = []) {
    if (!scoreHistory.length) {
        return DIMENSIONS.reduce((acc, dimension) => {
            acc[dimension] = 0;
            return acc;
        }, {});
    }

    const recent = scoreHistory.slice(0, 3);
    const weights = recent.length === 1 ? [1] : recent.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1];

    return DIMENSIONS.reduce((acc, dimension) => {
        acc[dimension] = weightedAverage(
            recent.map((scores) => scores?.[dimension] ?? 0),
            weights,
        );
        return acc;
    }, {});
}

function buildGrowth(latestScores, previousScores = null, baselineScores = null) {
    return DIMENSIONS.map((dimension) => ({
        dimension,
        latest: latestScores?.[dimension] ?? 0,
        previous: previousScores?.[dimension] ?? null,
        baseline: baselineScores?.[dimension] ?? null,
        deltaFromPrevious:
            typeof previousScores?.[dimension] === 'number'
                ? (latestScores?.[dimension] ?? 0) - previousScores[dimension]
                : null,
        deltaFromBaseline:
            typeof baselineScores?.[dimension] === 'number'
                ? (latestScores?.[dimension] ?? 0) - baselineScores[dimension]
                : null,
    }));
}

function calculateEffectiveAttempts(attemptTimestamps = []) {
    const timestamps = attemptTimestamps
        .map((t) => new Date(t).getTime())
        .filter((t) => Number.isFinite(t))
        .sort((a, b) => b - a);

    if (timestamps.length <= 1) return timestamps.length;

    const FULL_INDEPENDENCE_HOURS = 24;
    const MIN_CREDIT = 0.3;

    let effective = 1;
    for (let i = 1; i < timestamps.length; i++) {
        const hoursBetween = (timestamps[i - 1] - timestamps[i]) / (1000 * 60 * 60);
        const credit = Math.min(1, Math.max(MIN_CREDIT, hoursBetween / FULL_INDEPENDENCE_HOURS));
        effective += credit;
    }
    return effective;
}

function buildConfidenceScore({ attemptCount = 0, daysSinceLastAttempt = null, attemptTimestamps = null }) {
    const SINGLE_TEST_RELIABILITY = 0.70;
    const MEASUREMENT_WEIGHT = 80;
    const TEMPORAL_WEIGHT = 20;
    const TEMPORAL_HALF_LIFE_DAYS = 60;

    const k = attemptTimestamps && attemptTimestamps.length > 0
        ? calculateEffectiveAttempts(attemptTimestamps)
        : Math.max(attemptCount, 0);

    const measurementReliability = k > 0
        ? (k * SINGLE_TEST_RELIABILITY) / (1 + (k - 1) * SINGLE_TEST_RELIABILITY)
        : 0;

    const temporalFactor = typeof daysSinceLastAttempt === 'number'
        ? Math.exp(-daysSinceLastAttempt * Math.LN2 / TEMPORAL_HALF_LIFE_DAYS)
        : 0;

    return Math.round(
        measurementReliability * MEASUREMENT_WEIGHT + temporalFactor * TEMPORAL_WEIGHT,
    );
}

function buildProfileConsistency(scoreHistory = []) {
    if (scoreHistory.length < 2) {
        const singleCode = scoreHistory.length === 1 ? buildHollandCode(scoreHistory[0]) : null;
        return {
            overallConsistency: null,
            dimensionSD: {},
            interpretation: scoreHistory.length === 0
                ? 'no_data'
                : 'single_attempt',
            isConverging: null,
            hollandCodes: singleCode ? [singleCode] : [],
            uniqueHollandCodes: singleCode ? 1 : 0,
            hollandStability: scoreHistory.length === 0 ? 'no_data' : 'single_attempt',
        };
    }

    const dimensionSD = {};
    for (const dim of DIMENSIONS) {
        const values = scoreHistory.map((scores) => scores?.[dim] ?? 0);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
        dimensionSD[dim] = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    const avgSD = Object.values(dimensionSD).reduce((s, v) => s + v, 0) / DIMENSIONS.length;
    const overallConsistency = Math.round(Math.max(0, Math.min(100, 100 - avgSD * 2)));

    let isConverging = null;
    if (scoreHistory.length >= 3) {
        const sdOf = (history) => {
            let total = 0;
            for (const dim of DIMENSIONS) {
                const vals = history.map((s) => s?.[dim] ?? 0);
                const m = vals.reduce((a, b) => a + b, 0) / vals.length;
                total += Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length);
            }
            return total / DIMENSIONS.length;
        };

        if (scoreHistory.length >= 4) {
            const firstHalf = scoreHistory.slice(Math.floor(scoreHistory.length / 2));
            const secondHalf = scoreHistory.slice(0, Math.ceil(scoreHistory.length / 2));
            isConverging = sdOf(secondHalf) < sdOf(firstHalf);
        } else {
            const recentPair = scoreHistory.slice(0, 2);
            const olderPair = scoreHistory.slice(1, 3);
            isConverging = sdOf(recentPair) < sdOf(olderPair);
        }
    }

    let interpretation;
    if (avgSD < 5) {
        interpretation = 'highly_consistent';
    } else if (avgSD < 10) {
        interpretation = 'moderately_consistent';
    } else {
        interpretation = 'variable';
    }

    const hollandCodes = scoreHistory
        .filter((scores) => Object.values(scores).some((v) => v > 0))
        .map((scores) => buildHollandCode(scores));
    const uniqueCodes = [...new Set(hollandCodes)];
    const hollandStability = uniqueCodes.length === 1
        ? 'stable'
        : uniqueCodes.length <= 2
            ? 'developing'
            : 'volatile';

    return {
        overallConsistency,
        dimensionSD,
        interpretation,
        isConverging,
        hollandCodes,
        uniqueHollandCodes: uniqueCodes.length,
        hollandStability,
    };
}

function buildSummary({ normalizedScores, hollandCode, previousScores }) {
    const ordered = Object.entries(normalizedScores).sort((a, b) => b[1] - a[1]);
    const strongest = ordered.slice(0, 3).map(([dimension, score]) => ({ dimension, score }));
    const weakest = ordered.slice(-2).map(([dimension, score]) => ({ dimension, score }));

    return {
        hollandCode,
        strongest,
        weakest,
        trend: buildTrend(normalizedScores, previousScores),
        narrative: `Your strongest profile areas are ${strongest.map((item) => item.dimension).join(', ')}. Holland code: ${hollandCode}.`,
    };
}

function buildResponseQuality(answerValues = []) {
    if (!answerValues.length) return { quality: 'no_data', warnings: [] };

    const warnings = [];
    const freq = {};
    for (const v of answerValues) {
        freq[v] = (freq[v] || 0) + 1;
    }

    const total = answerValues.length;
    const maxFreq = Math.max(...Object.values(freq));
    const maxFreqPct = maxFreq / total;

    if (maxFreqPct > 0.80) {
        warnings.push({
            type: 'straightlining',
            message: `${Math.round(maxFreqPct * 100)}% of responses used the same value`,
            severity: 'high',
        });
    }

    const extremeCount = (freq[1] || 0) + (freq[5] || 0);
    if (extremeCount / total > 0.70) {
        warnings.push({
            type: 'extreme_response',
            message: `${Math.round((extremeCount / total) * 100)}% of responses at scale endpoints`,
            severity: 'moderate',
        });
    }

    const mean = answerValues.reduce((s, v) => s + v, 0) / total;
    const variance = answerValues.reduce((s, v) => s + (v - mean) ** 2, 0) / total;
    const sd = Math.sqrt(variance);

    if (sd < 0.5 && total >= 10) {
        warnings.push({
            type: 'low_variance',
            message: 'Very low response variation (SD < 0.5)',
            severity: 'moderate',
        });
    }

    const positiveCount = (freq[4] || 0) + (freq[5] || 0);
    if (positiveCount / total > 0.75) {
        warnings.push({
            type: 'acquiescence_bias',
            message: `${Math.round((positiveCount / total) * 100)}% of responses were positive (4\u20135)`,
            severity: 'low',
        });
    }

    const quality = warnings.some((w) => w.severity === 'high')
        ? 'poor'
        : warnings.some((w) => w.severity === 'moderate')
            ? 'acceptable'
            : 'good';

    return { quality, warnings, responseSD: Math.round(sd * 100) / 100 };
}

module.exports = {
    DIMENSIONS,
    normalizeSubmission,
    validateSubmission,
    calculateScores,
    buildHollandCode,
    buildSummary,
    buildTrend,
    buildStableScores,
    buildGrowth,
    calculateEffectiveAttempts,
    buildConfidenceScore,
    buildProfileConsistency,
    buildHollandCodeAnalysis,
    buildResponseQuality,
};
