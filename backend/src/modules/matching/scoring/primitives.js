const { DIMENSIONS } = require('../../../services/riasec/scoringService');
const {
    MATCHING_WEIGHTS,
    MIN_DIMENSION_WEIGHT,
} = require('../../../services/matching/constants');

function clampScore(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }
    return Math.max(0, Math.min(100, Math.round(numeric * 100) / 100));
}

function average(values = []) {
    const filtered = values.filter((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)));
    if (!filtered.length) {
        return 0;
    }
    return filtered.reduce((sum, value) => sum + Number(value), 0) / filtered.length;
}

function weightedAverage(values = [], weights = []) {
    const totalWeight = weights.reduce((sum, value) => sum + Number(value || 0), 0);
    if (totalWeight <= 0) {
        return average(values);
    }

    return values.reduce((sum, value, index) => {
        return sum + Number(value || 0) * Number(weights[index] || 0);
    }, 0) / totalWeight;
}

function mergeWeights(overrides = {}) {
    const next = { ...MATCHING_WEIGHTS };
    for (const key of Object.keys(next)) {
        if (Number.isFinite(Number(overrides[key]))) {
            next[key] = Number(overrides[key]);
        }
    }
    return next;
}

function closenessScore(studentValue, targetValue) {
    const student = Number(studentValue || 0);
    const target = Number(targetValue || 0);
    return clampScore(100 - Math.abs(student - target));
}

function buildCombinedVector(riasecScores) {
    return DIMENSIONS.map((dimension) => Number(riasecScores?.[dimension] || 0));
}

function dotProduct(a, b) {
    return a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0);
}

function vectorMagnitude(vector) {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

module.exports = {
    DIMENSIONS,
    MIN_DIMENSION_WEIGHT,
    clampScore,
    average,
    weightedAverage,
    mergeWeights,
    closenessScore,
    buildCombinedVector,
    dotProduct,
    vectorMagnitude,
};
