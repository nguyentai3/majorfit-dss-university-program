const { runAiAnalysis, getAiRuntimeConfig } = require('../ai/client');
const {
    MATCHING_EXPLANATION_PROMPT_VERSION,
    MATCHING_EXPLANATION_RESPONSE_VERSION,
    buildMatchingExplanationPrompt,
} = require('../ai/prompts/matchingExplanationPrompt');
const { parseMatchingExplanationResponse } = require('../ai/schemas/matchingExplanationResponse');

async function generateAiMatchExplanation({
    studentProfile,
    student,
    program,
    scoring,
    deterministicExplanation,
    competingPrograms,
    locale,
    provider,
    model,
}) {
    const runtime = getAiRuntimeConfig();
    if (!runtime.directRunEnabled) {
        return null;
    }

    const { systemPrompt, userPrompt } = buildMatchingExplanationPrompt({
        studentProfile,
        student,
        program,
        scoring,
        deterministicExplanation,
        competingPrograms,
        locale,
    });

    const response = await runAiAnalysis({
        provider: provider || runtime.provider,
        model: model || runtime.model,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
    });

    const parsed = parseMatchingExplanationResponse(response.text);

    return {
        provider: provider || runtime.provider,
        model: model || runtime.model,
        promptVersion: MATCHING_EXPLANATION_PROMPT_VERSION,
        responseVersion: MATCHING_EXPLANATION_RESPONSE_VERSION,
        systemPrompt,
        userPrompt,
        rawText: response.text,
        parsed,
    };
}

module.exports = {
    generateAiMatchExplanation,
};
