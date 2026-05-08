const MATCHING_ALGORITHM_VERSION = 'matching-v7';

const AVAILABLE_ALGORITHMS = ['saw', 'topsis', 'cosine', 'hybrid-ensemble'];

// Cosine alone gave the best benchmark result; the others are kept for comparison.
const ENSEMBLE_WEIGHTS = {
    saw: 0,
    topsis: 0,
    cosine: 1.0,
};

const DIMENSION_LABELS = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional',
};

const MATCHING_WEIGHTS = {
    riasec: 0.75,
    growth: 0.15,
    confidence: 0.10,
};

const FIT_LEVEL_THRESHOLDS = {
    high: 90,
    medium: 80,
};

const MIN_DIMENSION_WEIGHT = 0.15;

const HOLLAND_BONUS_PER_OVERLAP = 5.0;

// A gap is critical when the program demands ≥75 but the student is more than 15 below.
const GAP_TARGET_THRESHOLD = 75;
const GAP_MARGIN = 15;
const GAP_DIVISOR = 6;
const MAX_PENALTY_PER_GAP = 5;
const MAX_TOTAL_PENALTY = 10;

const DOMINANCE_PROGRAM_FLOOR = 70;
const DOMINANCE_STUDENT_CEILING = 40;
const DOMINANCE_PENALTY_PER_DIM = 8;
const MAX_DOMINANCE_PENALTY = 20;

const GROWTH_SHORT_TERM_WEIGHT = 0.7;
const GROWTH_LONG_TERM_WEIGHT = 0.3;
const GROWTH_SENSITIVITY = 25;
const GROWTH_RELEVANT_DIMS = 3;

const CONFIDENCE_FALLBACK = 65;

const MATCHING_SCOPES = {
    ALL_PUBLISHED: 'ALL_PUBLISHED',
    SAVED_ONLY: 'SAVED_ONLY',
    COMPARE: 'COMPARE',
};

function fitLevelLabel(fitLevel) {
    if (fitLevel === 'HIGH_FIT') return 'High Fit';
    if (fitLevel === 'MEDIUM_FIT') return 'Medium Fit';
    return 'Stretch';
}

module.exports = {
    MATCHING_ALGORITHM_VERSION,
    AVAILABLE_ALGORITHMS,
    ENSEMBLE_WEIGHTS,
    DIMENSION_LABELS,
    MATCHING_WEIGHTS,
    FIT_LEVEL_THRESHOLDS,
    MATCHING_SCOPES,
    MIN_DIMENSION_WEIGHT,
    HOLLAND_BONUS_PER_OVERLAP,
    GAP_TARGET_THRESHOLD,
    GAP_MARGIN,
    GAP_DIVISOR,
    MAX_PENALTY_PER_GAP,
    MAX_TOTAL_PENALTY,
    GROWTH_SHORT_TERM_WEIGHT,
    GROWTH_LONG_TERM_WEIGHT,
    GROWTH_SENSITIVITY,
    GROWTH_RELEVANT_DIMS,
    CONFIDENCE_FALLBACK,
    DOMINANCE_PROGRAM_FLOOR,
    DOMINANCE_STUDENT_CEILING,
    DOMINANCE_PENALTY_PER_DIM,
    MAX_DOMINANCE_PENALTY,
    fitLevelLabel,
};
