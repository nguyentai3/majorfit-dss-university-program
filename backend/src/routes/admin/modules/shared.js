const { z } = require('zod');

const nullableStringSchema = z.string().nullable().optional();

const listQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0),
    q: z.string().optional(),
    universityId: z.string().optional(),
    focusArea: z.string().optional(),
    statusFilter: z.string().optional(),
    version: z.coerce.number().int().positive().optional(),
});

const userListQuerySchema = listQuerySchema;

const quizQuestionBaseSchema = z.object({
    question: z.string().min(5).optional(),
    prompt: z.string().min(5).optional(),
    type: z.string().optional(),
    category: z.string().min(1).optional(),
    dimension: z.string().min(1).max(1).optional(),
    code: z.string().min(2).optional(),
    version: z.any().optional(),
    options: z.any().optional(),
    weight: z.any().optional(),
    order: z.any().optional(),
    active: z.boolean().optional(),
});

const quizQuestionCreateSchema = quizQuestionBaseSchema.refine((value) => Boolean(value.question || value.prompt), {
    message: 'question or prompt is required',
});

const quizQuestionUpdateSchema = quizQuestionBaseSchema.partial();

const universityBaseSchema = z.object({
    code: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    shortName: nullableStringSchema,
    city: nullableStringSchema,
    state: nullableStringSchema,
    country: nullableStringSchema,
    website: nullableStringSchema,
    overview: nullableStringSchema,
    featured: z.boolean().optional(),
});

const universityCreateSchema = universityBaseSchema.extend({
    code: z.string().min(2),
    name: z.string().min(2),
});

const universityUpdateSchema = universityBaseSchema.partial();

const programBaseSchema = z.object({
    universityId: z.string().nullable().optional(),
    code: z.string().min(2).nullable().optional(),
    slug: nullableStringSchema,
    name: z.string().min(2).nullable().optional(),
    degreeLevel: nullableStringSchema,
    department: nullableStringSchema,
    focusArea: nullableStringSchema,
    summary: nullableStringSchema,
    sourceUrl: nullableStringSchema,
    durationYears: z.any().optional(),
    status: nullableStringSchema,
    featured: z.boolean().optional(),
    keyCourses: z.any().optional(),
    courseSourceUrl: nullableStringSchema,
});

const programCreateSchema = programBaseSchema.extend({
    universityId: z.string().min(2),
    code: z.string().min(2),
    name: z.string().min(2),
});

const programUpdateSchema = programBaseSchema.partial();

const programCurriculumSchema = z.object({
    title: nullableStringSchema,
    sourceType: z.string().min(2).nullable().optional(),
    sourceUrl: nullableStringSchema,
    fileName: nullableStringSchema,
    curriculumText: nullableStringSchema,
    extractedText: nullableStringSchema,
    objectives: z.any().optional(),
    courseList: z.any().optional(),
    notes: nullableStringSchema,
    status: nullableStringSchema,
});

const programAnalysisPromptSchema = z.object({
    curriculumId: z.string().min(2).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    responseVersion: z.string().optional(),
    systemPrompt: z.string().optional(),
    promptText: z.string().optional(),
});

const programAnalysisIngestSchema = z.object({
    curriculumId: z.string().min(2).optional(),
    analysisRunId: z.string().min(2).optional(),
    aiResponseText: z.string().optional(),
    parsedResult: z.any().optional(),
    sourceType: z.string().optional(),
    reviewStatus: z.string().optional(),
    isPublished: z.boolean().optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    responseVersion: z.string().optional(),
    systemPrompt: z.string().optional(),
    promptText: z.string().optional(),
    reviewNotes: z.string().optional(),
});

const programAnalysisRunSchema = z.object({
    curriculumId: z.string().min(2).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    temperature: z.any().optional(),
    reviewStatus: z.string().optional(),
    isPublished: z.boolean().optional(),
    systemPrompt: z.string().optional(),
    promptText: z.string().optional(),
    reviewNotes: z.string().optional(),
});

const programProfileUpdateSchema = z.object({
    riasecScores: z.any().optional(),
    extractedSkills: z.any().optional(),
    summary: z.any().optional(),
    aiSummary: z.string().optional(),
    reasoning: z.string().optional(),
    evidenceMap: z.any().optional(),
    promptVersion: z.string().optional(),
    modelName: z.string().optional(),
    reviewNotes: z.string().optional(),
    confidenceScore: z.any().optional(),
    reviewStatus: z.string().optional(),
    isPublished: z.boolean().optional(),
});

function normalizeArrayInput(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [];
}

function safeJsonParse(value, fallback) {
    if (typeof value !== 'string') {
        return fallback;
    }

    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function normalizeNullableString(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }

    const cleaned = String(value).normalize('NFC').trim();
    return cleaned ? cleaned : null;
}

function toNullableInteger(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === '') {
        return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

function toNullableFloat(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === '') {
        return null;
    }

    const parsed = Number.parseFloat(String(value));
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

function toLongText(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value);
}

function toCollegeDto(row) {
    return {
        ...row,
        courses: safeJsonParse(row.courses, []),
    };
}

function toRiasecQuestionDto(row) {
    return {
        ...row,
        question: row.question ?? row.prompt,
        prompt: row.prompt ?? row.question,
        category: row.category ?? row.dimension,
        dimension: row.dimension ?? row.category,
        type: row.type ?? 'likert_scale',
        version: row.version ?? 1,
        options: safeJsonParse(row.options, []),
    };
}

function toUniversityDto(row) {
    return {
        ...row,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        programCount: row._count?.programs ?? row.programCount ?? 0,
    };
}

function toProgramDto(row) {
    return {
        ...row,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        university: row.university
            ? toUniversityDto(row.university)
            : undefined,
    };
}

const expertReviewCreateSchema = z.object({
    programProfileId: z.string().min(2),
    programId: z.string().min(2),
    reviewerName: z.string().min(2),
    reviewerTitle: z.string().optional(),
    reviewerEmail: z.string().email().optional(),
    reviewerInstitution: z.string().optional(),
    riasecAgreement: z.record(z.any()),
    skillAgreement: z.record(z.any()),
    summaryAccuracy: z.number().int().min(1).max(5),
    overallScore: z.number().int().min(1).max(5).optional(),
    strengthNotes: z.string().optional(),
    weaknessNotes: z.string().optional(),
    overallNotes: z.string().optional(),
    recommendation: z.enum(['ACCEPT', 'REVISE', 'REJECT']).optional(),
    reviewDate: z.string().optional(),
});

const expertReviewUpdateSchema = expertReviewCreateSchema.partial();

module.exports = {
    listQuerySchema,
    userListQuerySchema,
    quizQuestionCreateSchema,
    quizQuestionUpdateSchema,
    universityCreateSchema,
    universityUpdateSchema,
    programCreateSchema,
    programUpdateSchema,
    programCurriculumSchema,
    programAnalysisPromptSchema,
    programAnalysisIngestSchema,
    programAnalysisRunSchema,
    programProfileUpdateSchema,
    expertReviewCreateSchema,
    expertReviewUpdateSchema,
    normalizeArrayInput,
    normalizeNullableString,
    safeJsonParse,
    toNullableInteger,
    toRiasecQuestionDto,
    toUniversityDto,
    toProgramDto,
};
