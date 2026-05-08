const { runAiAnalysis, getAiRuntimeConfig } = require('../ai/client');
const {
    GROWTH_ANALYSIS_PROMPT_VERSION,
    GROWTH_ANALYSIS_RESPONSE_VERSION,
    buildGrowthAnalysisPrompt,
} = require('../ai/prompts/growthAnalysisPrompt');
const { parseGrowthAnalysisResponse } = require('../ai/schemas/growthAnalysisResponse');
const { getRiasecProfile, getRiasecHistory } = require('./assessmentService');
const { DIMENSIONS } = require('./scoringService');
const { matchStudentToOnetCareers } = require('./onetCareerMatchService');
const { buildClusters } = require('./careerClusterService');

function joinTextList(items = [], fallback = '') {
    if (!Array.isArray(items) || items.length === 0) {
        return fallback;
    }
    return items.filter(Boolean).join(', ');
}

function buildStrengthsEvolutionText(interpretation = {}) {
    if (interpretation.strengthsEvolution) {
        return interpretation.strengthsEvolution;
    }

    const segments = [];
    const consistent = joinTextList(interpretation.consistentStrengths);
    const emerging = joinTextList(interpretation.emergingStrengths);
    const declining = joinTextList(interpretation.decliningAreas);

    if (consistent) {
        segments.push(`Consistent strengths: ${consistent}.`);
    }
    if (emerging) {
        segments.push(`Emerging strengths: ${emerging}.`);
    }
    if (declining) {
        segments.push(`Declining areas to monitor: ${declining}.`);
    }
    if (interpretation.stabilityAssessment) {
        segments.push(`Profile stability is currently ${interpretation.stabilityAssessment}.`);
    }

    return segments.join(' ').trim();
}

function actionToText(action) {
    if (!action) return '';
    if (typeof action === 'string') return action;
    if (typeof action === 'object') return action.text || '';
    return '';
}

function normalizeActions(interpretation = {}) {
    const raw = Array.isArray(interpretation.recommendedActions)
        ? interpretation.recommendedActions.filter(Boolean)
        : [];
    return raw
        .map((item) => {
            if (typeof item === 'string') {
                return { type: '', text: item };
            }
            if (item && typeof item === 'object') {
                return { type: item.type || '', text: item.text || '' };
            }
            return null;
        })
        .filter((item) => item && item.text);
}

function buildRecommendationsText(interpretation = {}) {
    if (interpretation.recommendations) {
        return interpretation.recommendations;
    }

    const actions = (Array.isArray(interpretation.recommendedActions)
        ? interpretation.recommendedActions
        : []
    )
        .map(actionToText)
        .filter(Boolean);
    const insights = Array.isArray(interpretation.keyInsights)
        ? interpretation.keyInsights.filter(Boolean)
        : [];

    const segments = [];
    if (actions.length) {
        segments.push(actions.join('\n'));
    }
    if (interpretation.readinessExplanation) {
        segments.push(interpretation.readinessExplanation);
    }
    if (insights.length) {
        segments.push(`Key insights: ${insights.join(', ')}.`);
    }
    if (interpretation.encouragement) {
        segments.push(interpretation.encouragement);
    }

    return segments.join('\n').trim();
}

function normalizeInterpretationShape(interpretation) {
    if (!interpretation || typeof interpretation !== 'object') {
        return interpretation;
    }

    return {
        ...interpretation,
        overallTrend: interpretation.overallTrend || interpretation.trendSummary || '',
        strengthsEvolution: buildStrengthsEvolutionText(interpretation),
        recommendations: buildRecommendationsText(interpretation),
        actionsByType: normalizeActions(interpretation),
        keyInsightsList: Array.isArray(interpretation.keyInsights)
            ? interpretation.keyInsights.filter(Boolean)
            : [],
        reflectionPrompt: interpretation.reflectionPrompt || '',
        encouragement: interpretation.encouragement || '',
        methodologyNote:
            interpretation.methodologyNote
            || 'RIASEC measures your interest patterns, not your abilities. Use these as starting points for exploration, not as targets to hit.',
    };
}

function buildDeterministicGrowthInterpretation(profile, attempts) {
    const totalAttempts = attempts.length;
    const growth = profile?.growth || [];
    const stableScores = profile?.stableScores || profile?.stable_scores || {};
    const strongestDim = profile?.strongestDimension || profile?.strongest_dimension || null;
    const weakestDim = profile?.weakestDimension || profile?.weakest_dimension || null;

    const sortedDims = Object.entries(stableScores)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    const top3 = sortedDims.slice(0, 3).map(([dim]) => dim);

    const consistentStrengths = [];
    if (totalAttempts >= 2) {
        const allTop3Sets = attempts.map((attempt) => {
            const scores = attempt.normalizedScores || attempt.normalized_scores || {};
            return Object.entries(scores)
                .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
                .slice(0, 3)
                .map(([dim]) => dim);
        });
        for (const dim of DIMENSIONS) {
            const appearances = allTop3Sets.filter((set) => set.includes(dim)).length;
            if (appearances >= Math.ceil(allTop3Sets.length * 0.6)) {
                consistentStrengths.push(dim);
            }
        }
    } else {
        consistentStrengths.push(...top3);
    }

    const emergingStrengths = growth
        .filter((entry) => (entry.deltaFromPrevious || 0) > 5)
        .map((entry) => entry.dimension);

    const decliningAreas = growth
        .filter((entry) => (entry.deltaFromPrevious || 0) < -5)
        .map((entry) => entry.dimension);

    let stabilityAssessment = 'early';
    if (totalAttempts >= 2) {
        const hollandCodes = attempts.map((a) => a.hollandCode || a.holland_code || '');
        const uniqueCodes = new Set(hollandCodes.filter(Boolean));
        stabilityAssessment = uniqueCodes.size <= 1 ? 'stable' : uniqueCodes.size <= 2 ? 'developing' : 'volatile';
    }

    let readinessLevel = 'early';
    if (totalAttempts >= 3 && stabilityAssessment === 'stable') {
        readinessLevel = 'ready';
    } else if (totalAttempts >= 2) {
        readinessLevel = 'developing';
    }

    const trendSummary = totalAttempts === 1
        ? `This is the student's first assessment. Their strongest dimension is ${strongestDim || 'unknown'} with Holland code ${profile?.latestHollandCode || 'N/A'}.`
        : `Over ${totalAttempts} assessments, the student's profile is ${stabilityAssessment}. Strongest area: ${strongestDim || 'N/A'}, weakest: ${weakestDim || 'N/A'}.`;

    return {
        trendSummary,
        consistentStrengths,
        emergingStrengths,
        decliningAreas,
        stabilityAssessment,
        keyInsights: [],
        recommendedActions: [],
        readinessLevel,
        readinessExplanation: `Based on ${totalAttempts} attempt(s) and ${stabilityAssessment} profile stability.`,
        encouragement: '',
    };
}

async function generateGrowthInterpretation(userId, { locale, provider, model } = {}) {
    const [profile, attempts] = await Promise.all([
        getRiasecProfile(userId),
        getRiasecHistory(userId, 10),
    ]);

    if (!attempts.length) {
        return {
            success: false,
            error: 'No RIASEC assessment attempts found. Complete at least one assessment first.',
            profile: null,
            interpretation: null,
        };
    }

    const deterministic = buildDeterministicGrowthInterpretation(profile, attempts);

    let topCareers = [];
    let topClusters = [];
    try {
        const stableScores = profile?.stableScores || profile?.stable_scores || {};
        if (Object.keys(stableScores).length > 0) {
            topCareers = await matchStudentToOnetCareers(stableScores, { limit: 12 });
            topClusters = buildClusters(stableScores, topCareers);
        }
    } catch {
        topCareers = [];
        topClusters = [];
    }

    const runtime = getAiRuntimeConfig();
    let aiInterpretation = null;

    if (runtime.directRunEnabled) {
        try {
            const { systemPrompt, userPrompt, promptVersion, responseVersion } =
                buildGrowthAnalysisPrompt({ attempts, profile, locale, topClusters });

            const response = await runAiAnalysis({
                provider: provider || runtime.provider,
                model: model || runtime.model,
                systemPrompt,
                userPrompt,
                temperature: 0.3,
            });

            aiInterpretation = {
                ...parseGrowthAnalysisResponse(response.text),
                provider: provider || runtime.provider,
                model: model || runtime.model,
                promptVersion,
                responseVersion,
            };
        } catch {
            aiInterpretation = null;
        }
    }

    return {
        success: true,
        profile: {
            totalAttempts: profile.totalAttempts || profile.total_attempts || attempts.length,
            latestHollandCode: profile.latestHollandCode || profile.latest_holland_code,
            stableScores: profile.stableScores || profile.stable_scores,
            confidenceScore: profile.confidenceScore || profile.confidence_score,
            strongestDimension: profile.strongestDimension || profile.strongest_dimension,
            weakestDimension: profile.weakestDimension || profile.weakest_dimension,
            growth: profile.growth,
        },
        interpretation: normalizeInterpretationShape(aiInterpretation || deterministic),
        topClusters,
        source: aiInterpretation ? 'ai' : 'deterministic',
    };
}

module.exports = {
    generateGrowthInterpretation,
    buildDeterministicGrowthInterpretation,
};
