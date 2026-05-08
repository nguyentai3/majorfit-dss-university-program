const { z } = require('zod');

const actionItemSchema = z.union([
    z.string(),
    z.object({
        type: z.string().optional().default(''),
        text: z.string().default(''),
    }).passthrough(),
]);

const growthAnalysisSchema = z.object({
    trendSummary: z.string().default(''),
    consistentStrengths: z.array(z.string()).default([]),
    emergingStrengths: z.array(z.string()).default([]),
    shiftingAreas: z.array(z.string()).optional().default([]),
    decliningAreas: z.array(z.string()).optional().default([]),
    stabilityAssessment: z.string().default(''),
    keyInsights: z.array(z.string()).default([]),
    recommendedActions: z.array(actionItemSchema).default([]),
    reflectionPrompt: z.string().optional().default(''),
    readinessLevel: z.string().default(''),
    readinessExplanation: z.string().default(''),
    encouragement: z.string().default(''),
    methodologyNote: z.string().optional().default(''),
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

function parseGrowthAnalysisResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI growth analysis did not return valid JSON.');
    }

    const result = growthAnalysisSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(`AI growth analysis response validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    return result.data;
}

module.exports = {
    parseGrowthAnalysisResponse,
    growthAnalysisSchema,
};
