const { runAiAnalysis, getAiRuntimeConfig } = require('../ai/client');
const {
    MATCHING_COMPARE_PROMPT_VERSION,
    MATCHING_COMPARE_RESPONSE_VERSION,
    buildMatchingComparePrompt,
} = require('../ai/prompts/matchingComparePrompt');
const { parseMatchingCompareResponse } = require('../ai/schemas/matchingCompareResponse');

async function generateAiMatchComparison({ studentProfile, student, results, deterministicComparison, locale, provider, model }) {
    const runtime = getAiRuntimeConfig();
    if (!runtime.directRunEnabled) {
        return null;
    }

    const { systemPrompt, userPrompt } = buildMatchingComparePrompt({
        studentProfile,
        student,
        results,
        deterministicComparison,
        locale,
    });

    const response = await runAiAnalysis({
        provider: provider || runtime.provider,
        model: model || runtime.model,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
    });

    const parsed = parseMatchingCompareResponse(response.text);

    return {
        provider: provider || runtime.provider,
        model: model || runtime.model,
        promptVersion: MATCHING_COMPARE_PROMPT_VERSION,
        responseVersion: MATCHING_COMPARE_RESPONSE_VERSION,
        systemPrompt,
        userPrompt,
        rawText: response.text,
        parsed,
    };
}

module.exports = {
    generateAiMatchComparison,
};
