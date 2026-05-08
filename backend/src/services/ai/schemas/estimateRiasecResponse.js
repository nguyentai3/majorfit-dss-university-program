
const { z } = require('zod');

const riasecScore = z.number().min(0).max(100);

const estimateRiasecSchema = z.object({
    r_score: riasecScore,
    i_score: riasecScore,
    a_score: riasecScore,
    s_score: riasecScore,
    e_score: riasecScore,
    c_score: riasecScore,
    reasoning: z.object({
        r: z.string().min(1),
        i: z.string().min(1),
        a: z.string().min(1),
        s: z.string().min(1),
        e: z.string().min(1),
        c: z.string().min(1),
    }),
    most_similar_anchor: z.string().default(''),
    key_differences: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(100),
}).passthrough();

function tryParseJson(value) {
    if (!value || typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch {
        const match = value.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

function parseEstimateRiasecResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI RIASEC estimation did not return valid JSON.');
    }

    const result = estimateRiasecSchema.safeParse(raw);
    if (!result.success) {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`AI estimate validation failed: ${issues}`);
    }

    const data = result.data;

    return {
        riasecScores: {
            R: Math.round(data.r_score),
            I: Math.round(data.i_score),
            A: Math.round(data.a_score),
            S: Math.round(data.s_score),
            E: Math.round(data.e_score),
            C: Math.round(data.c_score),
        },
        reasoning: {
            R: data.reasoning.r,
            I: data.reasoning.i,
            A: data.reasoning.a,
            S: data.reasoning.s,
            E: data.reasoning.e,
            C: data.reasoning.c,
        },
        mostSimilarAnchor: data.most_similar_anchor,
        keyDifferences: data.key_differences,
        confidence: Math.round(data.confidence),
    };
}

module.exports = {
    parseEstimateRiasecResponse,
    estimateRiasecSchema,
};
