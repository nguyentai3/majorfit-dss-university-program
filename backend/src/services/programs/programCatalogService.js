const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const {
    normalizeEvidenceMap,
    normalizeRiasecScores,
    slugify,
} = require('./programProfileUtils');

function estimateCourseCount(text) {
    if (!text) return 0;
    return text.split('\n').map(l => l.trim()).filter(l => l.length >= 3 && l.length <= 80).length;
}

const PROGRAM_INCLUDE = {
    university: true,
    curriculums: { orderBy: { version: 'desc' }, take: 1 },
    profiles: {
        where: { isPublished: true },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 1,
    },
    onetLinks: {
        orderBy: { relevance: 'desc' },
        take: 5,
        include: {
            occupation: {
                select: {
                    onetCode: true,
                    title: true,
                    hollandCode: true,
                    riasecScoresJson: true,
                    topSkillsJson: true,
                    topKnowledgeJson: true,
                    jobOutlook: true,
                    brightOutlook: true,
                    educationLevel: true,
                    jobZone: true,
                },
            },
        },
    },
    _count: { select: { curriculums: true, profiles: true, analysisRuns: true } },
};

const PUBLIC_PROGRAM_VISIBILITY_WHERE = {
    OR: [
        { profiles: { some: { isPublished: true } } },
        { onetLinks: { some: {} } },
    ],
};

function mapUniversity(row) {
    if (!row) return null;

    return {
        id: row.id,
        code: row.code,
        name: row.name,
        shortName: row.shortName,
        city: row.city,
        state: row.state,
        country: row.country,
        website: row.website,
        overview: row.overview,
        featured: Boolean(row.featured),
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        programCount: row._count?.programs ?? row.programCount ?? 0,
    };
}

function mapCurriculum(row) {
    if (!row) return null;

    return {
        id: row.id,
        version: row.version,
        sourceType: row.sourceType,
        sourceUrl: row.sourceUrl,
        fileName: row.fileName,
        title: row.title,
        curriculumText: row.curriculumText,
        extractedText: row.extractedText,
        objectives: safeJsonParse(row.objectivesJson, []),
        courseList: safeJsonParse(row.courseListJson, []),
        notes: row.notes,
        status: row.status,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
    };
}

function mapProgramProfile(row) {
    if (!row) return null;

    return {
        id: row.id,
        sourceType: row.sourceType,
        promptVersion: row.promptVersion || '',
        modelName: row.modelName || '',
        riasecScores: normalizeRiasecScores(safeJsonParse(row.riasecScoresJson, {})).scores,
        extractedSkills: safeJsonParse(row.extractedSkillsJson, []),
        summary: safeJsonParse(row.summaryJson, {}),
        aiSummary: row.aiSummary || '',
        reasoning: row.reasoning || '',
        evidenceMap: normalizeEvidenceMap(safeJsonParse(row.evidenceJson, [])),
        reviewNotes: row.reviewNotes || '',
        confidenceScore: row.confidenceScore ?? null,
        reviewStatus: row.reviewStatus,
        isPublished: Boolean(row.isPublished),
        publishedAt: row.publishedAt?.toISOString?.() || row.publishedAt || null,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
    };
}

function mapAnalysisRun(row) {
    if (!row) return null;

    return {
        id: row.id,
        mode: row.mode,
        provider: row.provider,
        model: row.model,
        promptVersion: row.promptVersion,
        responseVersion: row.responseVersion,
        systemPrompt: row.systemPrompt,
        promptText: row.promptText,
        aiResponseText: row.aiResponseText,
        parsedResult: safeJsonParse(row.parsedResultJson, null),
        evidenceMap: normalizeEvidenceMap(safeJsonParse(row.evidenceJson, [])),
        reviewNotes: row.reviewNotes || '',
        status: row.status,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        reviewedAt: row.reviewedAt?.toISOString?.() || row.reviewedAt || null,
    };
}

function buildProgramCard(programRow) {
    const profileRows = programRow.profiles || [];
    const storedProfileRow = profileRows.find((profile) => profile.isPublished) || profileRows[0] || null;
    const storedProfile = mapProgramProfile(storedProfileRow);
    const latestCurriculum = mapCurriculum(programRow.curriculums?.[0] || null);

    const careerOutcomes = (programRow.onetLinks || [])
        .sort((a, b) => b.relevance - a.relevance)
        .map((link) => ({
            onetCode: link.occupation?.onetCode || null,
            title: link.occupation?.title || null,
            relevance: link.relevance,
            isPrimary: link.isPrimary,
            jobOutlook: link.occupation?.jobOutlook || null,
            brightOutlook: link.occupation?.brightOutlook || false,
            educationLevel: link.occupation?.educationLevel || null,
            jobZone: link.occupation?.jobZone || null,
        }));

    let latestProfile = storedProfile;
    const onetLinks = programRow.onetLinks || [];
    if (onetLinks.length > 0) {
        const { buildProfileFromLinks } = require('./onetDerivedProfileService');
        const derived = buildProfileFromLinks(onetLinks);
        if (derived) {
            const isActive = programRow.status === 'ACTIVE';
            const canUseStoredProfileMetadata = storedProfile?.isPublished && storedProfile.reviewStatus !== 'REJECTED';
            latestProfile = {
                ...(canUseStoredProfileMetadata ? storedProfile : {}),
                riasecScores: derived.riasecScores,
                confidenceScore: derived.confidence,
                sourceType: 'ONET_DERIVED',
                hollandCode: derived.hollandCode,
                topSkills: derived.topSkills,
                linkedOccupations: derived.linkedOccupations,
                _aiRiasecScores: storedProfile?.riasecScores || null,
                _aiSourceType: storedProfile?.sourceType || null,
                id: canUseStoredProfileMetadata ? storedProfile.id : `onet-derived-${programRow.id}`,
                isPublished: isActive,
                reviewStatus: isActive ? 'PUBLISHED' : 'DRAFT',
                promptVersion: canUseStoredProfileMetadata ? storedProfile.promptVersion : 'onet-runtime-deterministic',
                modelName: canUseStoredProfileMetadata ? storedProfile.modelName : 'deterministic',
            };
        }
    }

    return {
        id: programRow.id,
        code: programRow.code,
        slug: programRow.slug,
        name: programRow.name,
        degreeLevel: programRow.degreeLevel,
        department: programRow.department,
        focusArea: programRow.focusArea,
        summary: programRow.summary,
        sourceUrl: programRow.sourceUrl,
        durationYears: programRow.durationYears,
        keyCourses: safeJsonParse(programRow.keyCoursesJson, []),
        courseSourceUrl: programRow.courseSourceUrl || null,
        status: programRow.status,
        featured: Boolean(programRow.featured),
        createdAt: programRow.createdAt?.toISOString?.() || programRow.createdAt,
        updatedAt: programRow.updatedAt?.toISOString?.() || programRow.updatedAt,
        university: mapUniversity(programRow.university),
        latestProfile,
        latestCurriculum,
        domainTagsJson: programRow.domainTagsJson || null,
        curriculumCount: programRow._count?.curriculums ?? 0,
        analysisRunCount: programRow._count?.analysisRuns ?? 0,
        profileCount: programRow._count?.profiles ?? 0,
        careerOutcomes,
    };
}

async function listPublishedPrograms({ q = '', universityCode = '', focusArea = '', limit = 100, offset = 0 } = {}) {
    const searchWhere = q
        ? {
              OR: [
                  { code: { contains: q } },
                  { slug: { contains: q } },
                  { name: { contains: q } },
                  { summary: { contains: q } },
                  { department: { contains: q } },
                  { focusArea: { contains: q } },
                  { university: { is: { name: { contains: q } } } },
                  { university: { is: { shortName: { contains: q } } } },
              ],
          }
        : null;

    const where = {
        status: 'ACTIVE',
        ...(universityCode ? { university: { is: { code: universityCode } } } : {}),
        ...(focusArea ? { focusArea } : {}),
        AND: [PUBLIC_PROGRAM_VISIBILITY_WHERE, ...(searchWhere ? [searchWhere] : [])],
    };

    const [items, total] = await Promise.all([
        prisma.program.findMany({
            where,
            orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
            take: limit,
            skip: offset,
            include: PROGRAM_INCLUDE,
        }),
        prisma.program.count({ where }),
    ]);

    return {
        items: items.map(buildProgramCard),
        total,
    };
}

function mapAnalysisRunPublic(row) {
    if (!row) return null;
    return {
        id: row.id,
        mode: row.mode,
        provider: row.provider,
        model: row.model,
        promptVersion: row.promptVersion,
        responseVersion: row.responseVersion,
        status: row.status,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        reviewedAt: row.reviewedAt?.toISOString?.() || row.reviewedAt || null,
        analysisSteps: (() => {
            const parsed = safeJsonParse(row.parsedResultJson, null);
            return parsed?.analysis_steps || null;
        })(),
    };
}

async function getPublishedProgramDetail(identifier) {
    const program = await prisma.program.findFirst({
        where: {
            status: 'ACTIVE',
            OR: [{ id: identifier }, { slug: identifier }],
            AND: [PUBLIC_PROGRAM_VISIBILITY_WHERE],
        },
        include: {
            university: true,
            curriculums: { orderBy: { version: 'desc' }, take: 3 },
            profiles: {
                where: { isPublished: true },
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 3,
                include: {
                    analysisRuns: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            },
            onetLinks: PROGRAM_INCLUDE.onetLinks,
        },
    });

    if (!program) {
        return null;
    }

    const card = buildProgramCard(program);

    const publishedProfile = program.profiles[0] || null;
    const analysisRun = publishedProfile?.analysisRuns?.[0] || null;

    return {
        ...card,
        profiles: program.profiles.map(mapProgramProfile),
        curriculums: program.curriculums.map(mapCurriculum),
        aiAnalysis: analysisRun ? mapAnalysisRunPublic(analysisRun) : null,
        evidenceVerification: null,
    };
}

module.exports = {
    PROGRAM_INCLUDE,
    slugify,
    normalizeRiasecScores,
    mapUniversity,
    mapCurriculum,
    mapProgramProfile,
    mapAnalysisRun,
    buildProgramCard,
    listPublishedPrograms,
    getPublishedProgramDetail,
    PUBLIC_PROGRAM_VISIBILITY_WHERE,
};
