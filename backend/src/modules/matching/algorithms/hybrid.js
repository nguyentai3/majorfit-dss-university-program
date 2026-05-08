const { ENSEMBLE_WEIGHTS } = require('../../../services/matching/constants');
const { clampScore } = require('../scoring/primitives');
const { calculateProgramMatch, classifyFitLevel } = require('../scoring/components');
const { calculateTOPSIS } = require('./topsis');
const { calculateCosineSimilarity } = require('./cosine');

function calculateHybridEnsemble({
    studentProfile,
    candidatePrograms,
    weights: weightOverrides = {},
    ensembleWeights: ensembleOverrides = {},
}) {
    const ensembleWeights = { ...ENSEMBLE_WEIGHTS, ...ensembleOverrides };

    const sawResults = candidatePrograms.map((program) =>
        calculateProgramMatch({
            studentProfile,
            programProfile: program.profile,
            programMeta: program.meta || {},
            weights: weightOverrides,
        }),
    );

    const topsisResults = calculateTOPSIS(
        studentProfile,
        candidatePrograms.map((program) => program.profile),
    );

    const cosineResults = candidatePrograms.map((program) =>
        calculateCosineSimilarity(studentProfile, program.profile),
    );

    const ensembleResults = candidatePrograms.map((program, index) => {
        const sawScore = sawResults[index].finalScore;
        const topsisScore = topsisResults[index]?.score || 0;
        const cosineScore = cosineResults[index].score;

        const rawHybrid =
            sawScore * ensembleWeights.saw
            + topsisScore * ensembleWeights.topsis
            + cosineScore * ensembleWeights.cosine;
        const hybridScore = clampScore(rawHybrid);

        return {
            programId: program.id || program.meta?.id || null,
            hybridScore,
            sawScore,
            topsisScore,
            cosineScore,
            topsisDetail: topsisResults[index] || {},
            cosineDetail: cosineResults[index],
            sawDetail: sawResults[index],
            fitLevel: classifyFitLevel(hybridScore),
            ensembleWeights,
        };
    });

    return ensembleResults.sort((left, right) => right.hybridScore - left.hybridScore);
}

module.exports = { calculateHybridEnsemble };
