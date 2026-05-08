const {
    CONFIDENCE_FALLBACK,
    DIMENSION_LABELS,
    DOMINANCE_PENALTY_PER_DIM,
    DOMINANCE_PROGRAM_FLOOR,
    DOMINANCE_STUDENT_CEILING,
    FIT_LEVEL_THRESHOLDS,
    GAP_DIVISOR,
    GAP_MARGIN,
    GAP_TARGET_THRESHOLD,
    GROWTH_LONG_TERM_WEIGHT,
    GROWTH_RELEVANT_DIMS,
    GROWTH_SENSITIVITY,
    GROWTH_SHORT_TERM_WEIGHT,
    HOLLAND_BONUS_PER_OVERLAP,
    MAX_DOMINANCE_PENALTY,
    MAX_PENALTY_PER_GAP,
    MAX_TOTAL_PENALTY,
} = require('../../../services/matching/constants');
const {
    DIMENSIONS,
    MIN_DIMENSION_WEIGHT,
    clampScore,
    average,
    weightedAverage,
    mergeWeights,
    closenessScore,
} = require('./primitives');

function buildRiasecBreakdown(studentScores = {}, programScores = {}) {
    const breakdown = DIMENSIONS.map((dimension) => {
        const student = clampScore(studentScores[dimension]);
        const target = clampScore(programScores[dimension]);
        const closeness = closenessScore(student, target);
        const weight = Math.max(MIN_DIMENSION_WEIGHT, target / 100);

        return {
            key: dimension,
            label: DIMENSION_LABELS[dimension] || dimension,
            student,
            target,
            closeness,
            weight,
        };
    });

    return {
        score: clampScore(
            weightedAverage(
                breakdown.map((entry) => entry.closeness),
                breakdown.map((entry) => entry.weight),
            ),
        ),
        breakdown,
    };
}

function buildHollandOverlapAdjustment(studentProfile = {}, programScores = {}) {
    const studentCode = String(studentProfile?.stableHollandCode || studentProfile?.latestHollandCode || '').trim().toUpperCase();
    const studentTop = studentCode
        ? studentCode.split('').slice(0, 3)
        : Object.entries(studentProfile?.stableScores || {})
              .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
              .slice(0, 3)
              .map(([dimension]) => dimension);
    const programTop = Object.entries(programScores || {})
        .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
        .slice(0, 3)
        .map(([dimension]) => dimension);
    const overlap = studentTop.filter((dimension) => programTop.includes(dimension));

    const bonus = overlap.length * HOLLAND_BONUS_PER_OVERLAP;

    return {
        studentTop,
        programTop,
        overlap,
        bonus,
    };
}

function buildThresholdPenalty({ riasecBreakdown = [] }) {
    const criticalGaps = riasecBreakdown
        .map((entry) => ({ ...entry, type: 'riasec' }))
        .filter((entry) => entry.target >= GAP_TARGET_THRESHOLD && entry.student + GAP_MARGIN < entry.target)
        .map((entry) => {
            const shortfall = Math.max(0, entry.target - entry.student);
            const penalty = Math.min(MAX_PENALTY_PER_GAP, shortfall / GAP_DIVISOR);
            return {
                type: entry.type,
                key: entry.key,
                label: entry.label,
                student: entry.student,
                target: entry.target,
                shortfall: clampScore(shortfall),
                penalty: Math.round(penalty * 100) / 100,
            };
        })
        .sort((left, right) => right.penalty - left.penalty);

    const totalPenalty = criticalGaps.reduce((sum, entry) => sum + entry.penalty, 0);

    return {
        criticalGaps,
        penalty: Math.min(MAX_TOTAL_PENALTY, Math.round(totalPenalty * 100) / 100),
    };
}

function buildDominancePenalty(studentScores = {}, programScores = {}) {
    const mismatches = DIMENSIONS
        .map((dim) => {
            const target = clampScore(programScores[dim]);
            const student = clampScore(studentScores[dim]);
            if (target >= DOMINANCE_PROGRAM_FLOOR && student < DOMINANCE_STUDENT_CEILING) {
                return {
                    key: dim,
                    label: DIMENSION_LABELS[dim] || dim,
                    student,
                    target,
                    penalty: DOMINANCE_PENALTY_PER_DIM,
                };
            }
            return null;
        })
        .filter(Boolean);

    const total = mismatches.reduce((sum, m) => sum + m.penalty, 0);
    return {
        mismatches,
        penalty: Math.min(MAX_DOMINANCE_PENALTY, Math.round(total * 100) / 100),
    };
}

function buildGrowthScore(growth = [], programScores = {}) {
    const growthMap = new Map((Array.isArray(growth) ? growth : []).map((entry) => [entry.dimension, entry]));

    const relevantDimensions = Object.entries(programScores || {})
        .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
        .slice(0, GROWTH_RELEVANT_DIMS)
        .map(([dimension]) => dimension);

    if (!relevantDimensions.length) {
        return {
            score: 50,
            breakdown: [],
        };
    }

    const breakdown = relevantDimensions.map((dimension) => {
        const entry = growthMap.get(dimension) || {};
        const deltaFromPrevious = Number(entry.deltaFromPrevious || 0);
        const deltaFromBaseline = Number(entry.deltaFromBaseline || 0);
        const combined = deltaFromPrevious * GROWTH_SHORT_TERM_WEIGHT + deltaFromBaseline * GROWTH_LONG_TERM_WEIGHT;
        const score = clampScore(50 + 50 * Math.tanh(combined / GROWTH_SENSITIVITY), 50);

        return {
            key: dimension,
            label: DIMENSION_LABELS[dimension] || dimension,
            deltaFromPrevious: Number.isFinite(deltaFromPrevious) ? deltaFromPrevious : 0,
            deltaFromBaseline: Number.isFinite(deltaFromBaseline) ? deltaFromBaseline : 0,
            score,
        };
    });

    return {
        score: clampScore(average(breakdown.map((entry) => entry.score)), 50),
        breakdown,
    };
}

function buildConfidenceComponent(studentConfidence, programConfidence) {
    const score = clampScore(
        average([
            Number.isFinite(Number(studentConfidence)) ? Number(studentConfidence) : null,
            Number.isFinite(Number(programConfidence)) ? Number(programConfidence) : null,
        ]),
        CONFIDENCE_FALLBACK,
    );

    return {
        score,
        student: clampScore(studentConfidence, 0),
        program: clampScore(programConfidence, 0),
    };
}

function classifyFitLevel(score) {
    if (score >= FIT_LEVEL_THRESHOLDS.high) {
        return 'HIGH_FIT';
    }
    if (score >= FIT_LEVEL_THRESHOLDS.medium) {
        return 'MEDIUM_FIT';
    }
    return 'STRETCH';
}

function buildStrengthsAndGaps({ riasecBreakdown = [] }) {
    const normalized = riasecBreakdown.map((entry) => ({
        type: 'riasec',
        key: entry.key,
        label: entry.label,
        closeness: entry.closeness,
        student: entry.student,
        target: entry.target,
    }));

    const strengths = normalized
        .slice()
        .sort((left, right) => right.closeness - left.closeness)
        .slice(0, 4);
    const gaps = normalized
        .slice()
        .sort((left, right) => left.closeness - right.closeness)
        .slice(0, 4);

    return { strengths, gaps };
}

function calculateProgramMatch({ studentProfile, programProfile, programMeta = {}, weights: weightOverrides = {} }) {
    const effectiveWeights = mergeWeights(weightOverrides);
    const riasec = buildRiasecBreakdown(studentProfile?.stableScores || {}, programProfile?.riasecScores || {});
    const growth = buildGrowthScore(studentProfile?.growth || [], programProfile?.riasecScores || {});
    const confidence = buildConfidenceComponent(studentProfile?.confidenceScore, programProfile?.confidenceScore);
    const holland = buildHollandOverlapAdjustment(studentProfile, programProfile?.riasecScores || {});
    const thresholdPenalty = buildThresholdPenalty({
        riasecBreakdown: riasec.breakdown,
    });
    const dominancePenalty = buildDominancePenalty(
        studentProfile?.stableScores || {},
        programProfile?.riasecScores || {},
    );

    // Diagnostic score for the explanation panel; production ranking uses cosine.
    const finalScore = clampScore(
        riasec.score
            + holland.bonus
            - thresholdPenalty.penalty
            - dominancePenalty.penalty,
    );

    const { strengths, gaps } = buildStrengthsAndGaps({
        riasecBreakdown: riasec.breakdown,
    });

    return {
        finalScore,
        riasecScore: riasec.score,
        growthScore: growth.score,
        confidenceScore: confidence.score,
        fitLevel: classifyFitLevel(finalScore),
        breakdown: {
            riasec: riasec.breakdown,
            growth: growth.breakdown,
            confidence,
            holland,
            thresholdPenalty,
            dominancePenalty,
        },
        strengths,
        gaps,
        weights: effectiveWeights,
        diagnostics: {
            holland,
            thresholdPenalty,
            dominancePenalty,
        },
    };
}

module.exports = {
    buildRiasecBreakdown,
    buildHollandOverlapAdjustment,
    buildThresholdPenalty,
    buildDominancePenalty,
    buildGrowthScore,
    buildConfidenceComponent,
    classifyFitLevel,
    calculateProgramMatch,
};
