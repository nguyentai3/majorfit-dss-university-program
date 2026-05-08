const { DIMENSIONS } = require('../riasec/scoringService');

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function normalizeArrayInput(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function clampScore(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return { score: fallback, clamped: value !== undefined && value !== null, original: value };
    }
    const clamped = numeric < 0 || numeric > 100;
    return { score: Math.max(0, Math.min(100, Math.round(numeric))), clamped, original: clamped ? numeric : undefined };
}

function normalizeRiasecScores(input = {}) {
    const warnings = [];
    const scores = DIMENSIONS.reduce((acc, dimension) => {
        const result = clampScore(input?.[dimension], 0);
        if (result.clamped) {
            warnings.push(`RIASEC ${dimension}: ${result.original} clamped to ${result.score}`);
        }
        acc[dimension] = result.score;
        return acc;
    }, {});
    return { scores, warnings };
}

function normalizeEvidenceMap(input = []) {
    if (!Array.isArray(input)) {
        return [];
    }

    return input
        .map((entry) => ({
            targetType: String(entry?.targetType || entry?.target_type || '').trim().toLowerCase() || 'skill',
            targetKey: String(entry?.targetKey || entry?.target_key || '').trim(),
            sourceExcerpt: String(entry?.sourceExcerpt || entry?.source_excerpt || '').trim(),
            rationale: String(entry?.rationale || '').trim(),
            signalStrength: clampScore(entry?.signalStrength ?? entry?.signal_strength, 75).score,
        }))
        .filter((entry) => entry.targetKey && entry.sourceExcerpt);
}

module.exports = {
    slugify,
    normalizeArrayInput,
    normalizeRiasecScores,
    normalizeEvidenceMap,
};
