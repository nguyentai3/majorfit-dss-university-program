
const { findSimilarPrograms } = require('../ai/similaritySearch');
const { buildEstimateRiasecPrompt } = require('../ai/prompts/estimateRiasecPrompt');
const { parseEstimateRiasecResponse } = require('../ai/schemas/estimateRiasecResponse');
const { validateAgainstAnchors, consistencyCheck, computeFinalConfidence } = require('../ai/validation/anchorValidation');
const { runAiAnalysis } = require('../ai/client');
const { deriveHollandCode } = require('./onetDerivedProfileService');

const MIN_SIMILARITY_THRESHOLD = 0.15;
const MIN_ANCHORS = 2;

async function estimateProfileForNewProgram({
    provider,
    model,
    programName,
    universityName,
    degreeLevel = 'Bachelor',
    focusArea = '',
    curriculumText,
    referencePrograms,
    runConsistencyCheck = false,
    topK = 3,
}) {
    const similarPrograms = findSimilarPrograms(
        curriculumText,
        referencePrograms,
        topK,
        { name: programName, focusArea },
    );

    const anchors = similarPrograms.filter(p => p.similarity >= MIN_SIMILARITY_THRESHOLD);

    if (anchors.length < MIN_ANCHORS) {
        return {
            success: false,
            error: 'NOT_ENOUGH_SIMILAR_PROGRAMS',
            message: `Found ${anchors.length} similar program(s) (need ≥${MIN_ANCHORS} with similarity ≥${MIN_SIMILARITY_THRESHOLD}). `
                + 'Use Tầng 1 (O*NET Bridge) for RIASEC estimation, or expand the gold dataset with programs from this field.',
            nearestPrograms: similarPrograms.slice(0, 3).map(p => ({
                code: p.code,
                name: p.name,
                similarity: p.similarity,
            })),
        };
    }

    const { systemPrompt, userPrompt, promptVersion } = buildEstimateRiasecPrompt({
        programName,
        universityName,
        degreeLevel,
        focusArea,
        curriculumText,
        anchorPrograms: anchors,
    });

    const aiResult1 = await runAiAnalysis({
        provider,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
    });

    const parsed1 = parseEstimateRiasecResponse(aiResult1.text);

    let parsed2 = null;
    let consistencyResult = null;

    if (runConsistencyCheck) {
        const aiResult2 = await runAiAnalysis({
            provider,
            model,
            systemPrompt,
            userPrompt,
        temperature: 0.5,
        });
        parsed2 = parseEstimateRiasecResponse(aiResult2.text);
        consistencyResult = consistencyCheck(parsed1.riasecScores, parsed2.riasecScores);
    }

    const finalScores = consistencyResult
        ? consistencyResult.averagedEstimate
        : parsed1.riasecScores;

    const anchorResult = validateAgainstAnchors(finalScores, anchors);
    const { finalConfidence, level, needsReview } = computeFinalConfidence(
        parsed1.confidence,
        anchorResult,
        consistencyResult,
    );

    const hollandCode = deriveHollandCode(finalScores);

    return {
        success: true,
        riasecScores: finalScores,
        hollandCode,
        confidence: finalConfidence,
        confidenceLevel: level,
        needsReview,
        source: 'AI_ESTIMATED',
        promptVersion,

        reasoning: parsed1.reasoning,
        mostSimilarAnchor: parsed1.mostSimilarAnchor,
        keyDifferences: parsed1.keyDifferences,

        anchorPrograms: anchors.map(a => ({
            code: a.code,
            name: a.name,
            similarity: a.similarity,
            riasecScores: a.profile?.riasecScores,
            hollandCode: a.profile?.hollandCode,
        })),

        validation: {
            anchorBounds: anchorResult,
            consistency: consistencyResult,
        },

        provider: aiResult1.usedProvider,
        model: aiResult1.usedModel,
    };
}

module.exports = {
    estimateProfileForNewProgram,
    MIN_SIMILARITY_THRESHOLD,
    MIN_ANCHORS,
};
