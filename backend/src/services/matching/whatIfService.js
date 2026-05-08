const { prisma } = require('../../db/prisma');
const { buildProgramCard, PROGRAM_INCLUDE } = require('../programs/programCatalogService');
const { calculateHybridEnsemble } = require('./coreScoringService');
const { buildMatchExplanation } = require('./explanationService');
const { buildMatchingComparisonSummary } = require('./comparisonService');
const {
    MATCHING_ALGORITHM_VERSION,
    MATCHING_WEIGHTS,
    ENSEMBLE_WEIGHTS: MATCHING_WEIGHTS_ENSEMBLE,
    fitLevelLabel,
} = require('./constants');

function clamp(v, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, Number(v) || 0));
}

function normalizeRiasec(input) {
    const defaults = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    if (!input || typeof input !== 'object') return defaults;
    return {
        R: clamp(input.R ?? defaults.R),
        I: clamp(input.I ?? defaults.I),
        A: clamp(input.A ?? defaults.A),
        S: clamp(input.S ?? defaults.S),
        E: clamp(input.E ?? defaults.E),
        C: clamp(input.C ?? defaults.C),
    };
}

function normalizeEnsembleWeights(input) {
    if (!input || typeof input !== 'object') return undefined;
    const saw = Number(input.saw);
    const topsis = Number(input.topsis);
    const cosine = Number(input.cosine);
    if (!Number.isFinite(saw) || !Number.isFinite(topsis) || !Number.isFinite(cosine)) {
        return undefined;
    }
    const total = saw + topsis + cosine;
    if (total <= 0) return undefined;
    return { saw: saw / total, topsis: topsis / total, cosine: cosine / total };
}

async function runWhatIfScenario({ riasec, ensembleWeights }) {
    const normalRiasec = normalizeRiasec(riasec);

    const studentProfile = {
        stableScores: normalRiasec,
        hollandCode: Object.entries(normalRiasec)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([d]) => d)
            .join(''),
        confidenceScore: 100,
        growth: [],
    };

    const programs = await prisma.program.findMany({
        where: {
            status: 'ACTIVE',
            profiles: { some: { isPublished: true } },
        },
        include: PROGRAM_INCLUDE,
    });

    const programCards = programs.map(buildProgramCard).filter(
        (p) => p.latestProfile && p.latestProfile.isPublished !== false,
    );

    const normalizedWeights = normalizeEnsembleWeights(ensembleWeights);

    if (!programCards.length) {
        return {
            id: 'what-if-simulation',
            scope: 'WHAT_IF',
            focusArea: '',
            algorithmVersion: `${MATCHING_ALGORITHM_VERSION}-simulation`,
            weights: { ...MATCHING_WEIGHTS },
            profileSnapshot: {
                latestHollandCode: studentProfile.hollandCode,
                stableScores: studentProfile.stableScores,
                growth: studentProfile.growth,
                confidenceScore: studentProfile.confidenceScore,
            },
            stableScores: studentProfile.stableScores,
            growth: studentProfile.growth,
            comparison: null,
            aiComparison: null,
            confidenceScore: 100,
            totalPrograms: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            results: [],
            totalResults: 0,
            topResult: null,
            scenarioProfile: {
                riasec: normalRiasec,
                hollandCode: studentProfile.hollandCode,
            },
            ensembleWeights: normalizedWeights || { ...MATCHING_WEIGHTS_ENSEMBLE },
            message: 'No published programs found',
        };
    }

    const candidates = programCards.map((card) => ({
        id: card.id,
        profile: {
            riasecScores: card.latestProfile?.riasecScores || {},
            focusArea: card.focusArea || '',
            name: card.name || '',
        },
        meta: { focusArea: card.focusArea || '', name: card.name || '' },
    }));

    const ensembleResults = calculateHybridEnsemble({
        studentProfile,
        candidatePrograms: candidates,
        ensembleWeights: normalizedWeights || {},
    });

    const rankedEntries = ensembleResults.slice(0, 10).map((result, index) => {
        const card = programCards.find((program) => program.id === result.programId);
        const scoring = {
            ...result.sawDetail,
            finalScore: result.hybridScore,
            sawScore: result.sawScore,
            topsisScore: result.topsisScore,
            cosineScore: result.cosineScore,
        };
        const explanation = buildMatchExplanation({
            studentProfile,
            programCard: card,
            scoring,
        });

        return {
            id: `what-if-${result.programId || index + 1}`,
            rank: index + 1,
            finalScore: Number(scoring.finalScore || 0),
            riasecScore: Number(scoring.riasecScore || 0),
            growthScore: Number(scoring.growthScore || 0),
            confidenceScore: Number(scoring.confidenceScore || 0),
            fitLevel: result.fitLevel,
            fitLevelLabel: fitLevelLabel(result.fitLevel),
            strengths: scoring.strengths || [],
            gaps: scoring.gaps || [],
            diagnostics: scoring.diagnostics || {},
            explanation,
            aiExplanation: '',
            createdAt: new Date().toISOString(),
            program: card || null,
            programProfileId: card?.latestProfile?.id || null,
        };
    });

    const deterministicComparison = buildMatchingComparisonSummary(
        rankedEntries.map((entry) => ({
            finalScore: entry.finalScore,
            riasecScore: entry.riasecScore,
            growthScore: entry.growthScore,
            confidenceScore: entry.confidenceScore,
            fitLevel: entry.fitLevel,
            diagnostics: entry.diagnostics,
            explanation: entry.explanation,
            program: entry.program,
        })),
    );

    return {
        id: 'what-if-simulation',
        scope: 'WHAT_IF',
        focusArea: '',
        algorithmVersion: `${MATCHING_ALGORITHM_VERSION}-simulation`,
        weights: { ...MATCHING_WEIGHTS },
        profileSnapshot: {
            latestHollandCode: studentProfile.hollandCode,
            stableScores: studentProfile.stableScores,
            growth: studentProfile.growth,
            confidenceScore: studentProfile.confidenceScore,
        },
        stableScores: studentProfile.stableScores,
        growth: studentProfile.growth,
        comparison: deterministicComparison,
        aiComparison: null,
        confidenceScore: 100,
        totalPrograms: programCards.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        results: rankedEntries,
        totalResults: rankedEntries.length,
        topResult: rankedEntries[0] || null,
        scenarioProfile: {
            riasec: normalRiasec,
            hollandCode: studentProfile.hollandCode,
        },
        ensembleWeights: normalizedWeights || { ...MATCHING_WEIGHTS_ENSEMBLE },
    };
}

module.exports = { runWhatIfScenario };
