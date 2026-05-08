
function estimateTokens(text) {
    return Math.ceil((String(text || '').length) / 4);
}

const MODEL_LIMITS = {
    'llama-3.3-70b-versatile': 32000,
    'llama-3.1-70b-versatile': 32000,
    'gpt-4o-mini': 128000,
    'gpt-4o': 128000,
    'gemini-2.0-flash': 1000000,
    'gemini-1.5-flash': 1000000,
};

function computeTokenBudget({ systemPrompt, userPromptBase, curriculumText, model }) {
    const limit = MODEL_LIMITS[model] || 32000;
    const charsPerToken = 3;

    const usedTokens = estimateTokens(systemPrompt) + estimateTokens(userPromptBase);
    const responseReserve = 4000;
    const availableTokens = limit - usedTokens - responseReserve;
    const curriculumTokens = estimateTokens(curriculumText);
    const recommendedMaxChars = Math.max(2000, availableTokens * charsPerToken);

    return {
        fits: curriculumTokens <= availableTokens,
        recommendedMaxChars,
        estimatedTotalTokens: usedTokens + curriculumTokens,
    };
}

module.exports = { computeTokenBudget, estimateTokens, MODEL_LIMITS };
