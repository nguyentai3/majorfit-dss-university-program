
const { z } = require('zod');

const curriculumInterpretationSchema = z.object({
    focus_areas: z.array(z.string()).min(1).max(10),
    career_outcomes: z.array(z.string()).default([]),
    step2_sections_found: z.array(z.string()).default([]),
    suggested_occupations: z.array(z.object({
        onet_code: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/),
        title: z.string().min(1),
        relevance_level: z.enum(['primary', 'strong', 'moderate', 'weak']),
        cip_alignment: z.array(z.string()).max(5).optional().default([]),
        evidence: z.array(z.string()).min(1),
        reasoning: z.string().default(''),
    })).min(1).max(8),
    notes: z.string().default(''),
}).passthrough();

const DEFAULT_WEIGHT_MAP = {
    primary:  10,
    strong:   8,
    moderate: 6,
    weak:     3,
};

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

function parseCurriculumInterpretationResponse(text) {
    const raw = tryParseJson(text);
    if (!raw || typeof raw !== 'object') {
        throw new Error('AI curriculum interpretation did not return valid JSON.');
    }

    const result = curriculumInterpretationSchema.safeParse(raw);
    if (!result.success) {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`AI response validation failed: ${issues}`);
    }

    const data = result.data;

    const suggestedOccupations = data.suggested_occupations.map(occ => ({
        onetCode: occ.onet_code,
        title: occ.title,
        relevanceLevel: occ.relevance_level,
        numericWeight: DEFAULT_WEIGHT_MAP[occ.relevance_level] || 5,
        cipAlignment: occ.cip_alignment || [],
        evidence: occ.evidence,
        reasoning: occ.reasoning || '',
    }));

    return {
        sectionsFound: data.step2_sections_found,
        focusAreas: data.focus_areas,
        careerOutcomes: data.career_outcomes,
        suggestedOccupations,
        notes: data.notes,
    };
}

module.exports = {
    parseCurriculumInterpretationResponse,
    curriculumInterpretationSchema,
    DEFAULT_WEIGHT_MAP,
};
