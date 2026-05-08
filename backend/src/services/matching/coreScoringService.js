const {
    clampScore,
    average,
    weightedAverage,
    mergeWeights,
    closenessScore,
    buildCombinedVector,
    dotProduct,
    vectorMagnitude,
} = require('../../modules/matching/scoring/primitives');
const {
    calculateProgramMatch,
    buildRiasecBreakdown,
    buildGrowthScore,
    buildConfidenceComponent,
    buildHollandOverlapAdjustment,
    buildThresholdPenalty,
    classifyFitLevel,
} = require('../../modules/matching/scoring/components');
const { calculateCosineSimilarity } = require('../../modules/matching/algorithms/cosine');
const { calculateTOPSIS } = require('../../modules/matching/algorithms/topsis');
const { calculateHybridEnsemble } = require('../../modules/matching/algorithms/hybrid');

module.exports = {
    calculateProgramMatch,
    calculateCosineSimilarity,
    calculateTOPSIS,
    calculateHybridEnsemble,
    buildRiasecBreakdown,
    buildGrowthScore,
    buildConfidenceComponent,
    buildHollandOverlapAdjustment,
    buildThresholdPenalty,
    classifyFitLevel,
    closenessScore,
    average,
    mergeWeights,
    weightedAverage,
    buildCombinedVector,
    dotProduct,
    vectorMagnitude,
};
