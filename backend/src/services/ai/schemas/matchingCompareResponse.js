const { z } = require('zod');

const matchingCompareSchema = z.object({
    recommendedProgramId: z.string().default(''),
    comparisonSummary: z.string().default(''),
    differentiator: z.string().optional().default(''),
    dayInTheLife: z.string().optional().default(''),
    careerOutlook: z.string().optional().default(''),
    tradeoffs: z.array(z.string()).default([]),
    nextStepAdvice: z.string().default(''),
    parentFriendlySummary: z.string().default(''),
}).passthrough();

function tryParseJson(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        const match = value.match(/\{[\s\S]*\}/);
        if (!match) {
            return null;
        }
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

function parseMatchingCompareResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI matching compare response did not return valid JSON.');
    }

    const result = matchingCompareSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(`AI matching compare validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    return result.data;
}

module.exports = {
    parseMatchingCompareResponse,
    matchingCompareSchema,
};
