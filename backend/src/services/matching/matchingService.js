const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const { getRiasecProfile } = require('../riasec/assessmentService');
const { buildProgramCard, PROGRAM_INCLUDE } = require('../programs/programCatalogService');
const { calculateHybridEnsemble, classifyFitLevel } = require('./coreScoringService');
const { buildMatchExplanation } = require('./explanationService');
const { generateAiMatchExplanation } = require('./aiExplanationService');
const { buildMatchingComparisonSummary } = require('./comparisonService');
const { generateAiMatchComparison } = require('./aiCompareService');
const { computeAdaptiveWeights } = require('./adaptiveWeightService');
const {
    MATCHING_ALGORITHM_VERSION,
    MATCHING_SCOPES,
    MATCHING_WEIGHTS,
    fitLevelLabel,
} = require('./constants');

function parseJson(value, fallback) {
    return safeJsonParse(value, fallback);
}

function extractAiDetail(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function extractAiSummary(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const detail = extractAiDetail(raw);
    if (detail) return detail.summary || detail.headline || '';
    return raw;
}

function normalizeScope(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === MATCHING_SCOPES.SAVED_ONLY) {
        return MATCHING_SCOPES.SAVED_ONLY;
    }
    if (normalized === MATCHING_SCOPES.COMPARE) {
        return MATCHING_SCOPES.COMPARE;
    }
    return MATCHING_SCOPES.ALL_PUBLISHED;
}

function normalizeLimit(value, fallback = 8) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }
    return Math.min(Math.max(Math.round(numeric), 1), 20);
}

function normalizeOffset(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }
    return Math.max(Math.round(numeric), 0);
}

function mapMatchResult(row) {
    const explanation = parseJson(row.explanationJson, {});
    const diagnostics = parseJson(row.diagnosticsJson, {});
    const finalScore = Number(row.finalScore || 0);
    const fitLevel = classifyFitLevel(finalScore);

    return {
        id: row.id,
        rank: row.rank,
        finalScore,
        riasecScore: Number(row.riasecScore || 0),
        growthScore: Number(row.growthScore || 0),
        confidenceScore: Number(row.confidenceScore || 0),
        fitLevel,
        fitLevelLabel: fitLevelLabel(fitLevel),
        strengths: parseJson(row.strengthsJson, []),
        gaps: parseJson(row.gapsJson, []),
        diagnostics,
        explanation,
        aiExplanation: extractAiSummary(row.aiExplanation),
        aiExplanationDetail: extractAiDetail(row.aiExplanation),
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        program: row.program ? buildProgramCard(row.program) : null,
        programProfileId: row.programProfileId || null,
    };
}

function mapMatchingRun(row, { limit = null } = {}) {
    const items = (row.results || []).map(mapMatchResult);
    const hasExplicitLimit = limit !== null && limit !== undefined && limit !== '';
    const slicedItems = hasExplicitLimit && Number.isFinite(Number(limit))
        ? items.slice(0, Number(limit))
        : items;

    return {
        id: row.id,
        scope: row.scope,
        focusArea: row.focusArea || '',
        algorithmVersion: row.algorithmVersion,
        weights: parseJson(row.weightsJson, MATCHING_WEIGHTS),
        profileSnapshot: parseJson(row.profileSnapshotJson, {}),
        stableScores: parseJson(row.stableScoresJson, {}),
        growth: parseJson(row.growthJson, []),
        comparison: parseJson(row.comparisonJson, null),
        aiComparison: parseJson(row.aiComparisonJson, null),
        confidenceScore: row.confidenceScore ?? 0,
        totalPrograms: row.totalPrograms ?? items.length,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        results: slicedItems,
        totalResults: row.totalPrograms ?? items.length,
        topResult: slicedItems[0] || null,
    };
}

function buildStudentSnapshot(profile) {
    return {
        latestHollandCode: profile.latestHollandCode || null,
        stableHollandCode: profile.stableHollandCode || null,
        strongestDimension: profile.strongestDimension || null,
        weakestDimension: profile.weakestDimension || null,
        stableScores: profile.stableScores || {},
        growth: profile.growth || [],
        confidenceScore: profile.confidenceScore || 0,
        totalAttempts: profile.totalAttempts || 0,
        academicContext: profile.academicContext || null,
        lastAssessedAt: profile.lastAssessedAt || null,
    };
}

function buildProgramProfile(programCard) {
    return {
        riasecScores: programCard.latestProfile?.riasecScores || {},
        confidenceScore: programCard.latestProfile?.confidenceScore || 0,
    };
}

function resolvePersistedProgramProfileId(programCard) {
    const latestProfile = programCard?.latestProfile;
    if (!latestProfile?.id) {
        return null;
    }

    if (latestProfile.sourceType === 'ONET_DERIVED') {
        return null;
    }

    return latestProfile.id;
}

async function listCandidatePrograms({ userId, scope, focusArea = '', programIds = [] }) {
    if (scope === MATCHING_SCOPES.COMPARE && (!Array.isArray(programIds) || programIds.length === 0)) {
        return [];
    }

    const where = {
        status: 'ACTIVE',
        OR: [
            { profiles: { some: { isPublished: true } } },
            { onetLinks: { some: {} } },
        ],
        ...(focusArea ? { focusArea } : {}),
        ...(Array.isArray(programIds) && programIds.length ? { id: { in: programIds } } : {}),
    };

    if (scope === MATCHING_SCOPES.SAVED_ONLY) {
        where.savedByUsers = { some: { userId } };
    }

    const programs = await prisma.program.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        include: PROGRAM_INCLUDE,
    });

    return programs
        .map(buildProgramCard)
        .filter((program) => program.latestProfile && program.latestProfile.isPublished !== false);
}

async function runMatchingForUser(userId, options = {}) {
    const scope = normalizeScope(options.scope);
    const focusArea = String(options.focusArea || '').trim();
    const limit = normalizeLimit(options.limit, 8);
    const includeAiExplanation = Boolean(options.includeAiExplanation);
    const aiProvider = options.aiProvider ? String(options.aiProvider).trim() : null;
    const aiModel = options.aiModel ? String(options.aiModel).trim() : null;
    const weights = options.weights && typeof options.weights === 'object' ? options.weights : {};

    let adaptiveResult = null;
    if (!Object.keys(weights).length) {
        adaptiveResult = await computeAdaptiveWeights(userId);
        if (adaptiveResult.adapted) {
            Object.assign(weights, adaptiveResult.weights);
        }
    }

    const programIds = Array.isArray(options.programIds)
        ? options.programIds.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const studentProfile = await getRiasecProfile(userId);
    if (!studentProfile?.totalAttempts) {
        const error = new Error('Complete the assessment first before generating program matches.');
        error.statusCode = 400;
        throw error;
    }

    const [userRecord, latestAttempt] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true },
        }),
        prisma.riasecAttempt.findFirst({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
            select: { gradeLevel: true, semester: true, academicYear: true },
        }),
    ]);

    const studentMeta = {
        name: [userRecord?.firstName, userRecord?.lastName].filter(Boolean).join(' ').trim() || null,
        gradeLevel: latestAttempt?.gradeLevel || null,
        semester: latestAttempt?.semester || null,
        academicYear: latestAttempt?.academicYear || null,
        totalAttempts: studentProfile.totalAttempts || 0,
    };

    const candidatePrograms = await listCandidatePrograms({
        userId,
        scope,
        focusArea,
        programIds,
    });

    if (!candidatePrograms.length) {
        const snapshot = buildStudentSnapshot(studentProfile);
        const emptyRun = await prisma.matchingRun.create({
            data: {
                userId,
                latestAttemptId: studentProfile.latestAttempt?.id || null,
                scope,
                focusArea: focusArea || null,
                algorithmVersion: MATCHING_ALGORITHM_VERSION,
                weightsJson: JSON.stringify(weights && Object.keys(weights).length ? weights : MATCHING_WEIGHTS),
                profileSnapshotJson: JSON.stringify(snapshot),
                stableScoresJson: JSON.stringify(studentProfile.stableScores || {}),
                growthJson: JSON.stringify(studentProfile.growth || []),
                comparisonJson: JSON.stringify(buildMatchingComparisonSummary([])),
                aiComparisonJson: null,
                confidenceScore: Number(studentProfile.confidenceScore || 0),
                totalPrograms: 0,
            },
            include: { results: true },
        });

        return mapMatchingRun(emptyRun, { limit });
    }

    const ensembleCandidates = candidatePrograms.map(program => ({
        id: program.id,
        profile: buildProgramProfile(program),
        meta: program,
    }));

    const hybridResults = calculateHybridEnsemble({
        studentProfile,
        candidatePrograms: ensembleCandidates,
        weights,
    });

    const scoredResults = hybridResults
        .map((result, index) => {
            const program = candidatePrograms.find(p => p.id === result.programId);
            
            const scoring = {
                ...result.sawDetail,
                finalScore: result.hybridScore,
                fitLevel: result.fitLevel,
                sawScore: result.sawScore,
                topsisScore: result.topsisScore,
                cosineScore: result.cosineScore,
            };

            return {
                program,
                scoring,
                rank: index + 1,
            };
        });

    for (const entry of scoredResults) {
        entry.explanation = buildMatchExplanation({
            studentProfile,
            programCard: entry.program,
            scoring: entry.scoring,
            allResults: scoredResults,
            rank: entry.rank,
        });
    }

    const topForAi = includeAiExplanation ? scoredResults.slice(0, Math.min(limit, 3)) : [];
    for (const entry of topForAi) {
        try {
            const competingPrograms = scoredResults
                .filter((other) => other.rank !== entry.rank)
                .slice(0, 2)
                .map((other) => ({
                    rank: other.rank,
                    name: other.program?.name || null,
                    university: other.program?.university?.name || null,
                    focusArea: other.program?.focusArea || null,
                    finalScore: other.scoring?.finalScore ?? null,
                    riasecScores: other.program?.latestProfile?.riasecScores || {},
                    topSkills: (other.program?.latestProfile?.extractedSkills || []).slice(0, 5),
                }));

            const aiExplanation = await generateAiMatchExplanation({
                studentProfile,
                student: studentMeta,
                program: entry.program,
                scoring: entry.scoring,
                deterministicExplanation: entry.explanation,
                competingPrograms,
                locale: options.locale || 'en',
                provider: aiProvider,
                model: aiModel,
            });
            entry.aiExplanation = aiExplanation?.parsed?.summary || '';
            entry.aiExplanationDetail = aiExplanation?.parsed || null;
            entry.aiExplanationMeta = aiExplanation || null;
        } catch {
            entry.aiExplanation = '';
            entry.aiExplanationMeta = null;
        }
    }

    const deterministicComparison = buildMatchingComparisonSummary(
        scoredResults.map((entry) => ({
            ...entry.scoring,
            program: entry.program,
            explanation: entry.explanation,
        })),
    );

    let aiComparison = null;
    if (includeAiExplanation && scoredResults.length > 1) {
        try {
            aiComparison = await generateAiMatchComparison({
                studentProfile,
                student: studentMeta,
                results: scoredResults.map((entry) => ({
                    ...entry.scoring,
                    program: entry.program,
                    explanation: entry.explanation,
                })),
                deterministicComparison,
                locale: options.locale || 'en',
                provider: aiProvider,
                model: aiModel,
            });
        } catch {
            aiComparison = null;
        }
    }

    const snapshot = buildStudentSnapshot(studentProfile);
    const createdRun = await prisma.$transaction(async (tx) => {
        const run = await tx.matchingRun.create({
            data: {
                userId,
                latestAttemptId: studentProfile.latestAttempt?.id || null,
                scope,
                focusArea: focusArea || null,
                algorithmVersion: MATCHING_ALGORITHM_VERSION,
                weightsJson: JSON.stringify(weights && Object.keys(weights).length ? weights : MATCHING_WEIGHTS),
                profileSnapshotJson: JSON.stringify(snapshot),
                stableScoresJson: JSON.stringify(studentProfile.stableScores || {}),
                growthJson: JSON.stringify(studentProfile.growth || []),
                comparisonJson: JSON.stringify(deterministicComparison),
                aiComparisonJson: aiComparison ? JSON.stringify(aiComparison) : null,
                confidenceScore: Number(studentProfile.confidenceScore || 0),
                totalPrograms: scoredResults.length,
            },
        });

        await tx.matchResult.createMany({
            data: scoredResults.map((entry) => ({
                matchingRunId: run.id,
                programId: entry.program.id,
                programProfileId: resolvePersistedProgramProfileId(entry.program),
                rank: entry.rank,
                finalScore: Number(entry.scoring.finalScore),
                riasecScore: Number(entry.scoring.riasecScore),
                skillScore: Number(entry.scoring.skillScore ?? 0),
                growthScore: Number(entry.scoring.growthScore),
                confidenceScore: Number(entry.scoring.confidenceScore),
                fitLevel: entry.scoring.fitLevel,
                strengthsJson: JSON.stringify(entry.scoring.strengths || []),
                gapsJson: JSON.stringify(entry.scoring.gaps || []),
                diagnosticsJson: JSON.stringify({
                    ...(entry.scoring.diagnostics || {}),
                }),
                explanationJson: JSON.stringify(entry.explanation || {}),
                aiExplanation: entry.aiExplanationDetail
                    ? JSON.stringify(entry.aiExplanationDetail)
                    : (entry.aiExplanation || null),
            })),
        });

        return tx.matchingRun.findUnique({
            where: { id: run.id },
            include: {
                results: {
                    orderBy: { rank: 'asc' },
                    include: {
                        program: {
                            include: PROGRAM_INCLUDE,
                        },
                    },
                },
            },
        });
    });

    const mapped = mapMatchingRun(createdRun, { limit });

    if (adaptiveResult?.adapted) {
        mapped.adaptiveLearning = {
            adapted: true,
            feedbackCount: adaptiveResult.feedbackCount,
            correlations: adaptiveResult.correlations,
        };
    }

    return mapped;
}

async function getLatestMatchingRun(userId, options = {}) {
    const scope = options.scope ? normalizeScope(options.scope) : null;
    const focusArea = typeof options.focusArea === 'string' ? options.focusArea.trim() : '';
    const limit = normalizeLimit(options.limit, 8);

    const row = await prisma.matchingRun.findFirst({
        where: {
            userId,
            ...(scope ? { scope } : {}),
            ...(focusArea ? { focusArea } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
            results: {
                orderBy: { rank: 'asc' },
                include: {
                    program: {
                        include: PROGRAM_INCLUDE,
                    },
                },
            },
        },
    });

    return row ? mapMatchingRun(row, { limit }) : null;
}

async function listMatchingHistory(userId, options = {}) {
    const limit = normalizeLimit(options.limit, 6);
    const offset = normalizeOffset(options.offset, 0);
    const where = { userId };
    const [rows, total] = await Promise.all([
        prisma.matchingRun.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                results: {
                    orderBy: { rank: 'asc' },
                    take: 3,
                    include: {
                        program: {
                            include: PROGRAM_INCLUDE,
                        },
                    },
                },
            },
        }),
        prisma.matchingRun.count({ where }),
    ]);

    return {
        items: rows.map((row) => mapMatchingRun(row)),
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
    };
}

async function getMatchingRunDetail(userId, runId, options = {}) {
    const limit = normalizeLimit(options.limit, 20);
    const row = await prisma.matchingRun.findFirst({
        where: { id: runId, userId },
        include: {
            results: {
                orderBy: { rank: 'asc' },
                include: {
                    program: {
                        include: PROGRAM_INCLUDE,
                    },
                },
            },
        },
    });

    return row ? mapMatchingRun(row, { limit }) : null;
}

module.exports = {
    runMatchingForUser,
    getLatestMatchingRun,
    listMatchingHistory,
    getMatchingRunDetail,
    normalizeScope,
};
