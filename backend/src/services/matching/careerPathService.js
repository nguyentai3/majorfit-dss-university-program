const { prisma } = require('../../db/prisma');
const { runAiAnalysis } = require('../ai/client');
const { buildCareerPathPrompt } = require('../ai/prompts/careerPathPrompt');
const { parseCareerPathResponse } = require('../ai/schemas/careerPathResponse');
const { safeJsonParse } = require('../../utils/http');

const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];

async function matchOccupationsToProfile(riasecScores, limit = 10) {
    const allOccs = await prisma.onetOccupation.findMany({
        select: {
            onetCode: true,
            title: true,
            description: true,
            hollandCode: true,
            riasecScoresJson: true,
            topSkillsJson: true,
        },
    });

    // student RIASEC is 0-100, ONET uses 1-7 scale — rescale before comparing
    const maxUser = Math.max(...Object.values(riasecScores), 1);
    const normalized = {};
    for (const dim of DIMENSIONS) {
        normalized[dim] = (Number(riasecScores[dim] || 0) / maxUser) * 7;
    }

    const maxDist = Math.sqrt(6 * 7 * 7);

    const scored = allOccs
        .filter((o) => o.riasecScoresJson)
        .map((o) => {
            const oRiasec = safeJsonParse(o.riasecScoresJson, {});
            let sumSq = 0;
            for (const dim of DIMENSIONS) {
                sumSq += (normalized[dim] - (oRiasec[dim] || 0)) ** 2;
            }
            const distance = Math.sqrt(sumSq);
            return {
                onetCode: o.onetCode,
                title: o.title,
                description: o.description,
                hollandCode: o.hollandCode,
                riasec: oRiasec,
                topSkills: safeJsonParse(o.topSkillsJson, []),
                distance,
                similarity: Math.round((1 - distance / maxDist) * 10000) / 100,
            };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

    return scored;
}

async function generateCareerRecommendations(userId, options = {}) {
    const locale = options.locale || 'vi';
    const occupationLimit = options.occupationLimit || 10;

    const latestAttempt = await prisma.riasecAttempt.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
    });

    if (!latestAttempt) {
        throw new Error('No RIASEC assessment found. Please complete an assessment first.');
    }

    const normalizedScores = safeJsonParse(latestAttempt.normalizedScoresJson, {});
    const hollandCode = latestAttempt.hollandCode;

    if (!hollandCode || Object.keys(normalizedScores).length === 0) {
        throw new Error('RIASEC assessment data is incomplete. Please retake the assessment.');
    }

    const sortedDims = Object.entries(normalizedScores).sort((a, b) => b[1] - a[1]);
    const strongestDimension = sortedDims[0]?.[0] || null;
    const weakestDimension = sortedDims[sortedDims.length - 1]?.[0] || null;

    const studentProfile = {
        latestHollandCode: hollandCode,
        stableScores: normalizedScores,
        confidenceScore: latestAttempt.confidenceScore || 70,
        strongestDimension,
        weakestDimension,
    };

    const matchedOccupations = await matchOccupationsToProfile(normalizedScores, occupationLimit);

    const promptBundle = buildCareerPathPrompt({
        studentProfile,
        matchedOccupations,
        locale,
    });

    const completion = await runAiAnalysis({
        systemPrompt: promptBundle.systemPrompt,
        userPrompt: promptBundle.userPrompt,
        temperature: 0.3,
    });

    const recommendations = parseCareerPathResponse(completion.text);

    return {
        studentProfile: {
            hollandCode,
            riasecScores: normalizedScores,
            strongestDimension,
            weakestDimension,
        },
        matchedOccupations: matchedOccupations.map((o) => ({
            onetCode: o.onetCode,
            title: o.title,
            hollandCode: o.hollandCode,
            similarity: o.similarity,
            topSkills: (o.topSkills || []).slice(0, 3).map((s) => s.name || s),
        })),
        occupations: matchedOccupations.map((o) => ({
            onetCode: o.onetCode,
            title: o.title,
            hollandCode: o.hollandCode,
            similarity: o.similarity,
            topSkills: (o.topSkills || []).slice(0, 3).map((s) => s.name || s),
        })),
        recommendations,
        meta: {
            promptVersion: promptBundle.promptVersion,
            model: completion.model || null,
            generatedAt: new Date().toISOString(),
        },
    };
}

module.exports = {
    matchOccupationsToProfile,
    generateCareerRecommendations,
};
