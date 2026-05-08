const { z } = require('zod');

const guidanceSchema = z.union([
    z.string(),
    z.array(z.string()),
]).default('');

const matchingExplanationSchema = z.object({
    headline: z.string().default(''),
    summary: z.string().default(''),
    whyTopChoice: z.string().optional().default(''),
    why_top_choice: z.string().optional(),
    evidenceFromCurriculum: z.string().optional().default(''),
    evidence_from_curriculum: z.string().optional(),
    whyItFits: z.string().optional().default(''),
    why_it_fits: z.string().optional(),
    growthNarrative: z.string().optional().default(''),
    growth_narrative: z.string().optional(),
    guidance: guidanceSchema,
    caution: z.string().default(''),
    confidence: z.number().optional().default(0),
    confidenceReason: z.string().optional().default(''),
    confidence_reason: z.string().optional(),
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

function parseMatchingExplanationResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI matching explanation did not return valid JSON.');
    }

    const result = matchingExplanationSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(`AI matching explanation validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    const data = result.data;
    const guidanceList = Array.isArray(data.guidance)
        ? data.guidance.filter(Boolean)
        : (typeof data.guidance === 'string' && data.guidance.trim())
            ? [data.guidance.trim()]
            : [];

    return {
        headline: data.headline,
        summary: data.summary,
        whyTopChoice: data.whyTopChoice || data.why_top_choice || '',
        evidenceFromCurriculum: data.evidenceFromCurriculum || data.evidence_from_curriculum || '',
        whyItFits: data.whyItFits || data.why_it_fits || '',
        growthNarrative: data.growthNarrative || data.growth_narrative || '',
        guidance: guidanceList,
        caution: data.caution,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        confidenceReason: data.confidenceReason || data.confidence_reason || '',
    };
}

module.exports = {
    parseMatchingExplanationResponse,
    matchingExplanationSchema,
};
