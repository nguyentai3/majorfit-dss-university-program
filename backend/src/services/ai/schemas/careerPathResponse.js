const { z } = require('zod');

const careerPathSchema = z.object({
    profileSummary: z.string().default(''),
    topCareerPaths: z.array(z.object({
        rank: z.number().default(0),
        onetCode: z.string().default(''),
        title: z.string().default(''),
        alignment: z.string().default('medium'),
        whyItFits: z.string().default(''),
        dayToDay: z.string().default(''),
        requiredSkills: z.array(z.string()).default([]),
        educationPath: z.string().default(''),
        salaryOutlook: z.string().default(''),
    }).passthrough()).default([]),
    emergingOpportunities: z.array(z.string()).default([]),
    actionPlan: z.object({
        thisMonth: z.string().default(''),
        thisSemester: z.string().default(''),
        beforeUniversity: z.string().default(''),
    }).passthrough().default({}),
    encouragement: z.string().default(''),
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

function parseCareerPathResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI career path did not return valid JSON.');
    }

    const result = careerPathSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(`AI career path response validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    return result.data;
}

module.exports = {
    parseCareerPathResponse,
};
