const { prisma } = require('../../db/prisma');
const http = require('../../utils/http');
const { listActiveRiasecQuestions, mapRiasecQuestion } = require('./questionService');
const {
    normalizeSubmission,
    validateSubmission,
    calculateScores,
    buildHollandCode,
    buildSummary,
    buildTrend,
    DIMENSIONS,
    buildStableScores,
    buildGrowth,
    calculateEffectiveAttempts,
    buildConfidenceScore,
    buildProfileConsistency,
    buildHollandCodeAnalysis,
    buildResponseQuality,
} = require('./scoringService');

function parseJson(value, fallback) {
    return http.safeJsonParse(value, fallback);
}

function mapAttempt(attempt, { includeAnswers = false } = {}) {
    const rawScores = parseJson(attempt.scoresJson, {});
    const normalizedScores = parseJson(attempt.normalizedScoresJson, {});
    const summary = parseJson(attempt.summaryJson, {});

    return {
        id: attempt.id,
        attemptId: attempt.id,
        userId: attempt.userId,
        questionVersion: attempt.questionVersion,
        hollandCode: attempt.hollandCode,
        holland_code: attempt.hollandCode,
        rawScores,
        raw_scores: rawScores,
        normalizedScores,
        normalized_scores: normalizedScores,
        summary,
        gradeLevel: attempt.gradeLevel ?? null,
        grade_level: attempt.gradeLevel ?? null,
        academicYear: attempt.academicYear ?? null,
        academic_year: attempt.academicYear ?? null,
        semester: attempt.semester ?? null,
        attemptLabel: attempt.attemptLabel ?? null,
        attempt_label: attempt.attemptLabel ?? null,
        status: attempt.status ?? 'COMPLETED',
        startedAt: attempt.startedAt?.toISOString?.() || null,
        started_at: attempt.startedAt?.toISOString?.() || null,
        submittedAt: attempt.submittedAt.toISOString(),
        submitted_at: attempt.submittedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString?.() || null,
        completed_at: attempt.completedAt?.toISOString?.() || null,
        durationSeconds: attempt.durationSeconds ?? null,
        duration_seconds: attempt.durationSeconds ?? null,
        createdAt: attempt.createdAt.toISOString(),
        created_at: attempt.createdAt.toISOString(),
        ...(includeAnswers
            ? {
                  answers: (attempt.answers || []).map((answer) => ({
                      id: answer.id,
                      questionId: answer.questionId,
                      questionCode: answer.questionCode,
                      questionPrompt: answer.questionPrompt,
                      dimension: answer.dimension,
                      answerValue: answer.answerValue,
                      score: answer.score,
                  })),
              }
            : {}),
    };
}

function normalizeAcademicContext(context = {}) {
    const gradeLevel = Number.parseInt(String(context.gradeLevel ?? ''), 10);
    return {
        gradeLevel: Number.isFinite(gradeLevel) ? gradeLevel : null,
        academicYear: context.academicYear ? String(context.academicYear).trim() : null,
        semester: context.semester ? String(context.semester).trim() : null,
        attemptLabel: context.attemptLabel ? String(context.attemptLabel).trim() : null,
        startedAt: context.startedAt ? new Date(context.startedAt) : null,
        durationSeconds: Number.isFinite(Number(context.durationSeconds))
            ? Math.max(0, Math.round(Number(context.durationSeconds)))
            : null,
    };
}

async function getStudentAcademicProfile(userId) {
    try {
        return await prisma.profile.findUnique({ where: { id: userId } });
    } catch {
        return null;
    }
}

async function resolveAssessmentContext(submissionContext, profileContext) {
    const input = normalizeAcademicContext(submissionContext);

    const profileDefaults = normalizeAcademicContext({
        gradeLevel: profileContext?.gradeLevel,
        academicYear: profileContext?.academicYear,
        semester: profileContext?.currentSemester,
        attemptLabel: null,
        startedAt: null,
        durationSeconds: null,
    });

    return {
        gradeLevel: input.gradeLevel ?? profileDefaults.gradeLevel,
        academicYear: input.academicYear ?? profileDefaults.academicYear,
        semester: input.semester ?? profileDefaults.semester,
        attemptLabel: input.attemptLabel,
        startedAt: input.startedAt,
        durationSeconds: input.durationSeconds,
    };
}

function calculateDaysSince(value) {
    if (!value) {
        return null;
    }

    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
        return null;
    }

    return Math.max(0, Math.round((Date.now() - time) / 86400000));
}

function buildProfileFromRows(profileRow, attempts, { baselineScores = null } = {}) {
    const latestAttempt = attempts[0] ? mapAttempt(attempts[0], { includeAnswers: true }) : null;
    const latestScores = parseJson(profileRow?.latestScoresJson, latestAttempt?.rawScores || {});
    const normalizedScores = parseJson(
        profileRow?.normalizedScoresJson,
        latestAttempt?.normalizedScores || {},
    );
    const stableScores = parseJson(
        profileRow?.stableScoresJson,
        buildStableScores(attempts.map((attempt) => parseJson(attempt.normalizedScoresJson, {}))),
    );
    const trend = parseJson(
        profileRow?.trendJson,
        buildTrend(normalizedScores, attempts[1] ? mapAttempt(attempts[1]).normalizedScores : null),
    );
    const growth = buildGrowth(
        normalizedScores,
        attempts[1] ? parseJson(attempts[1].normalizedScoresJson, {}) : null,
        baselineScores ?? (attempts[attempts.length - 1]
            ? parseJson(attempts[attempts.length - 1].normalizedScoresJson, {})
            : null),
    );
    const confidenceScore = buildConfidenceScore({
        attemptCount: attempts.length,
        daysSinceLastAttempt: calculateDaysSince(attempts[0]?.submittedAt),
        attemptTimestamps: attempts.map((a) => a.submittedAt),
    });

    const stableHollandCode = buildHollandCode(stableScores);
    const hollandAnalysis = buildHollandCodeAnalysis(stableScores);

    const stableEntries = Object.entries(stableScores).filter(([, v]) => typeof v === 'number');
    const strongestDimension = stableEntries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const weakestDimension = stableEntries.sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;

    const profileConsistency = buildProfileConsistency(
        attempts.map((a) => parseJson(a.normalizedScoresJson, {})),
    );

    const latestAnswerValues = (latestAttempt?.answers || [])
        .map((a) => a.answerValue)
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
    const responseQuality = buildResponseQuality(latestAnswerValues);

    return {
        latestAttempt,
        latestHollandCode: profileRow?.latestHollandCode ?? latestAttempt?.hollandCode ?? null,
        latest_holland_code: profileRow?.latestHollandCode ?? latestAttempt?.hollandCode ?? null,
        latestScores,
        latest_scores: latestScores,
        normalizedScores,
        normalized_scores: normalizedScores,
        stableScores,
        stable_scores: stableScores,
        stableHollandCode,
        stable_holland_code: stableHollandCode,
        trend,
        growth,
        totalAttempts: attempts.length,
        total_attempts: attempts.length,
        confidenceScore,
        confidence_score: confidenceScore,
        firstAssessedAt: profileRow?.firstAssessedAt?.toISOString?.() || attempts[attempts.length - 1]?.submittedAt?.toISOString?.() || null,
        first_assessed_at: profileRow?.firstAssessedAt?.toISOString?.() || attempts[attempts.length - 1]?.submittedAt?.toISOString?.() || null,
        lastAssessedAt:
            profileRow?.lastAssessedAt?.toISOString?.() || latestAttempt?.submittedAt || null,
        last_assessed_at:
            profileRow?.lastAssessedAt?.toISOString?.() || latestAttempt?.submittedAt || null,
        strongestDimension,
        strongest_dimension: strongestDimension,
        weakestDimension,
        weakest_dimension: weakestDimension,
        profileConsistency,
        profile_consistency: profileConsistency,
        instrumentVersions: [...new Set(attempts.map((a) => a.questionVersion))],
        instrument_versions: [...new Set(attempts.map((a) => a.questionVersion))],
        mixedInstruments: new Set(attempts.map((a) => a.questionVersion)).size > 1,
        mixed_instruments: new Set(attempts.map((a) => a.questionVersion)).size > 1,
        hollandAnalysis,
        holland_analysis: hollandAnalysis,
        responseQuality,
        response_quality: responseQuality,
        academicContext: latestAttempt
            ? {
                  gradeLevel: latestAttempt.gradeLevel,
                  academicYear: latestAttempt.academicYear,
                  semester: latestAttempt.semester,
              }
            : null,
        attempts: attempts.map((attempt) => mapAttempt(attempt)),
    };
}

async function submitRiasecAttempt(userId, body) {
    const requestedVersion = body?.version != null ? Number(body.version) : null;
    const isAdaptive = requestedVersion === 0 || body?.mode === 'adaptive';

    let version;
    let questions;

    if (isAdaptive) {
        const submission = normalizeSubmission(body);
        const submittedIds = Object.keys(submission);
        const dbQuestions = await prisma.riasecQuestion.findMany({
            where: { id: { in: submittedIds }, active: true },
        });
        version = 0;
        questions = dbQuestions.map(mapRiasecQuestion);
    } else {
        const result = await listActiveRiasecQuestions(requestedVersion);
        version = result.version;
        questions = result.questions;
    }

    const submission = normalizeSubmission(body);
    const validation = validateSubmission(questions, submission);

    if (!validation.isValid) {
        const error = new Error('All assessment questions must be answered using a value from 1 to 5.');
        error.statusCode = 400;
        error.payload = {
            missingQuestions: validation.missingQuestions,
            invalidQuestions: validation.invalidQuestions,
        };
        throw error;
    }

    const previousAttempt = await prisma.riasecAttempt.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
    });
    const studentProfile = await getStudentAcademicProfile(userId);
    const assessmentContext = await resolveAssessmentContext(body?.context, studentProfile);

    const previousNormalizedScores = previousAttempt
        ? parseJson(previousAttempt.normalizedScoresJson, {})
        : null;
    const { rawScores, normalizedScores, answerRows } = calculateScores(
        questions,
        validation.normalizedAnswers,
    );

    const hollandCode = buildHollandCode(normalizedScores);
    const summary = buildSummary({
        normalizedScores,
        hollandCode,
        previousScores: previousNormalizedScores,
    });

    const createdAttempt = await prisma.$transaction(async (tx) => {
        const recentDuplicate = await tx.riasecAttempt.findFirst({
            where: {
                userId,
                submittedAt: { gte: new Date(Date.now() - 10_000) },
            },
            orderBy: { submittedAt: 'desc' },
        });
        if (recentDuplicate) {
            const err = new Error('Assessment was already submitted. Please wait before retrying.');
            err.statusCode = 409;
            throw err;
        }

        const attempt = await tx.riasecAttempt.create({
            data: {
                userId,
                questionVersion: version,
                hollandCode,
                scoresJson: JSON.stringify(rawScores),
                normalizedScoresJson: JSON.stringify(normalizedScores),
                summaryJson: JSON.stringify(summary),
                gradeLevel: assessmentContext.gradeLevel,
                academicYear: assessmentContext.academicYear,
                semester: assessmentContext.semester,
                attemptLabel: assessmentContext.attemptLabel,
                startedAt: assessmentContext.startedAt,
                completedAt: new Date(),
                durationSeconds: assessmentContext.durationSeconds,
            },
        });

        await tx.riasecAnswer.createMany({
            data: answerRows.map((answer) => ({
                attemptId: attempt.id,
                questionId: answer.questionId,
                questionCode: answer.questionCode,
                questionPrompt: answer.questionPrompt,
                dimension: answer.dimension,
                answerValue: answer.answerValue,
                score: answer.score,
            })),
        });

        const attempts = await tx.riasecAttempt.findMany({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
            take: 5,
        });

        const firstAttempt = await tx.riasecAttempt.findFirst({
            where: { userId },
            orderBy: { submittedAt: 'asc' },
        });

        const scoreHistory = attempts.map((attempt) => parseJson(attempt.normalizedScoresJson, {}));
        const stableScores = buildStableScores(scoreHistory);
        const trend = buildTrend(
            normalizedScores,
            attempts[1] ? parseJson(attempts[1].normalizedScoresJson, {}) : null,
        );
        const growth = buildGrowth(
            normalizedScores,
            attempts[1] ? parseJson(attempts[1].normalizedScoresJson, {}) : null,
            firstAttempt ? parseJson(firstAttempt.normalizedScoresJson, {}) : null,
        );
        const confidenceScore = buildConfidenceScore({
            attemptCount: attempts.length,
            daysSinceLastAttempt: calculateDaysSince(attempts[0]?.submittedAt),
            attemptTimestamps: attempts.map((a) => a.submittedAt),
        });

        await tx.userRiasecProfile.upsert({
            where: { userId },
            update: {
                latestAttemptId: attempt.id,
                latestHollandCode: hollandCode,
                latestScoresJson: JSON.stringify(rawScores),
                normalizedScoresJson: JSON.stringify(normalizedScores),
                stableScoresJson: JSON.stringify(stableScores),
                trendJson: JSON.stringify(trend),
                growthJson: JSON.stringify(growth),
                confidenceScore,
                lastAssessedAt: attempt.submittedAt,
            },
            create: {
                userId,
                latestAttemptId: attempt.id,
                latestHollandCode: hollandCode,
                latestScoresJson: JSON.stringify(rawScores),
                normalizedScoresJson: JSON.stringify(normalizedScores),
                stableScoresJson: JSON.stringify(stableScores),
                trendJson: JSON.stringify(trend),
                growthJson: JSON.stringify(growth),
                confidenceScore,
                firstAssessedAt:
                    attempts[attempts.length - 1]?.submittedAt || attempt.submittedAt,
                lastAssessedAt: attempt.submittedAt,
            },
        });

        return tx.riasecAttempt.findUnique({
            where: { id: attempt.id },
            include: {
                answers: { orderBy: { createdAt: 'asc' } },
            },
        });
    });

    const result = mapAttempt(createdAttempt, { includeAnswers: true });
    return result;
}

async function getRiasecHistory(userId, limit = 20) {
    const attempts = await prisma.riasecAttempt.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        include: { answers: true },
        take: limit,
    });

    return attempts.map((attempt) => mapAttempt(attempt, { includeAnswers: true }));
}

async function getRiasecProfile(userId) {
    const [profileRow, attempts, firstAttempt] = await Promise.all([
        prisma.userRiasecProfile.findUnique({ where: { userId } }),
        prisma.riasecAttempt.findMany({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
            include: { answers: { orderBy: { createdAt: 'asc' } } },
            take: 10,
        }),
        prisma.riasecAttempt.findFirst({
            where: { userId },
            orderBy: { submittedAt: 'asc' },
            select: { normalizedScoresJson: true },
        }),
    ]);

    if (!profileRow && attempts.length === 0) {
        const emptyScores = DIMENSIONS.reduce((acc, dimension) => {
            acc[dimension] = 0;
            return acc;
        }, {});
        const emptyConsistency = {
            overallConsistency: null,
            dimensionSD: {},
            interpretation: 'no_data',
            isConverging: null,
            hollandCodes: [],
            uniqueHollandCodes: 0,
            hollandStability: 'no_data',
        };
        const emptyAnalysis = { code: null, dominantMargin: 0, codeMargin: 0, isAmbiguous: true, isDominantClear: false };
        const emptyQuality = { quality: 'no_data', warnings: [] };
        return {
            latestAttempt: null,
            latestHollandCode: null,
            latest_holland_code: null,
            latestScores: emptyScores,
            latest_scores: emptyScores,
            normalizedScores: emptyScores,
            normalized_scores: emptyScores,
            stableScores: emptyScores,
            stable_scores: emptyScores,
            stableHollandCode: null,
            stable_holland_code: null,
            trend: [],
            growth: [],
            totalAttempts: 0,
            total_attempts: 0,
            confidenceScore: 0,
            confidence_score: 0,
            firstAssessedAt: null,
            first_assessed_at: null,
            lastAssessedAt: null,
            last_assessed_at: null,
            strongestDimension: null,
            strongest_dimension: null,
            weakestDimension: null,
            weakest_dimension: null,
            hollandAnalysis: emptyAnalysis,
            holland_analysis: emptyAnalysis,
            profileConsistency: emptyConsistency,
            profile_consistency: emptyConsistency,
            instrumentVersions: [],
            instrument_versions: [],
            mixedInstruments: false,
            mixed_instruments: false,
            responseQuality: emptyQuality,
            response_quality: emptyQuality,
            academicContext: null,
            attempts: [],
        };
    }

    return buildProfileFromRows(profileRow, attempts, {
        baselineScores: firstAttempt ? parseJson(firstAttempt.normalizedScoresJson, {}) : null,
    });
}

async function getRiasecAttemptById(userId, attemptId) {
    const attempt = await prisma.riasecAttempt.findFirst({
        where: { id: attemptId, userId },
        include: { answers: { orderBy: { createdAt: 'asc' } } },
    });

    return attempt ? mapAttempt(attempt, { includeAnswers: true }) : null;
}

async function getAdminAssessmentOverview() {
    const [totalQuestions, activeQuestions, totalAttempts, latestAttempts, profiles] = await Promise.all([
        prisma.riasecQuestion.count(),
        prisma.riasecQuestion.count({ where: { active: true } }),
        prisma.riasecAttempt.count(),
        prisma.riasecAttempt.findMany({
            orderBy: { submittedAt: 'desc' },
            take: 5,
            select: { userId: true, hollandCode: true, submittedAt: true },
        }),
        prisma.userRiasecProfile.findMany({
            where: { latestHollandCode: { not: null } },
            select: { latestHollandCode: true },
        }),
    ]);

    const hollandDistribution = profiles.reduce((acc, row) => {
        const code = row.latestHollandCode || 'N/A';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
    }, {});

    return {
        totalQuestions,
        activeQuestions,
        totalAttempts,
        studentProfiles: profiles.length,
        hollandDistribution,
        latestAttempts: latestAttempts.map((attempt) => ({
            userId: attempt.userId,
            hollandCode: attempt.hollandCode,
            submittedAt: attempt.submittedAt.toISOString(),
        })),
    };
}

module.exports = {
    submitRiasecAttempt,
    getRiasecHistory,
    getRiasecProfile,
    getRiasecAttemptById,
    getAdminAssessmentOverview,
    mapAttempt,
};
