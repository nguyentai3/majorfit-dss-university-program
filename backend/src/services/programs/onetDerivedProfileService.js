
const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const { normalizeOnetRiasec } = require('../riasec/onetCareerMatchService');

const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

async function computeOnetDerivedProfile(programId) {
    const onetLinks = await prisma.programOnetLink.findMany({
        where: { programId },
        include: { occupation: true },
        orderBy: { relevance: 'desc' },
    });

    if (!onetLinks || onetLinks.length === 0) return null;

    return buildProfileFromLinks(onetLinks);
}

async function computeAllOnetDerivedProfiles() {
    const allLinks = await prisma.programOnetLink.findMany({
        include: { occupation: true },
        orderBy: { relevance: 'desc' },
    });

    const byProgram = new Map();
    for (const link of allLinks) {
        if (!byProgram.has(link.programId)) {
            byProgram.set(link.programId, []);
        }
        byProgram.get(link.programId).push(link);
    }

    const profiles = new Map();
    for (const [programId, links] of byProgram) {
        const profile = buildProfileFromLinks(links);
        if (profile) profiles.set(programId, profile);
    }

    return profiles;
}

function buildProfileFromLinks(onetLinks) {
    if (!onetLinks || onetLinks.length === 0) return null;

    const riasecScores = computeWeightedRiasec(onetLinks);
    if (!riasecScores) return null;

    const hollandCode = deriveHollandCode(riasecScores);
    const topSkills = aggregateTopSkills(onetLinks);
    const confidence = computeConfidence(onetLinks);

    return {
        riasecScores,
        hollandCode,
        topSkills,
        confidence,
        sourceType: 'ONET_DERIVED',
        linkedOccupations: onetLinks.map((link) => ({
            onetCode: link.occupation.onetCode,
            title: link.occupation.title,
            relevance: link.relevance,
            isPrimary: link.isPrimary,
            hollandCode: link.occupation.hollandCode,
        })),
    };
}

function computeWeightedRiasec(onetLinks) {
    const weighted = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    let totalWeight = 0;

    for (const link of onetLinks) {
        const scores = safeJsonParse(link.occupation?.riasecScoresJson);
        if (!scores) continue;
        const weight = link.relevance || 5;
        totalWeight += weight;
        for (const dim of DIMS) {
            weighted[dim] += normalizeOnetRiasec(Number(scores[dim] ?? 0)) * weight;
        }
    }

    if (totalWeight === 0) return null;
    for (const dim of DIMS) {
        weighted[dim] = weighted[dim] / totalWeight;
    }

    const sorted = DIMS.slice().sort((a, b) => weighted[b] - weighted[a]);
    weighted[sorted[0]] = Math.min(100, weighted[sorted[0]] * 1.25);
    weighted[sorted[1]] = Math.min(100, weighted[sorted[1]] * 1.10);
    weighted[sorted[4]] = weighted[sorted[4]] * 0.85;
    weighted[sorted[5]] = weighted[sorted[5]] * 0.75;

    for (const dim of DIMS) {
        weighted[dim] = Math.round(weighted[dim]);
    }
    return weighted;
}

function deriveHollandCode(riasecScores) {
    return DIMS.slice()
        .sort((a, b) => (riasecScores[b] || 0) - (riasecScores[a] || 0))
        .slice(0, 3)
        .join('');
}

function aggregateTopSkills(onetLinks) {
    const skillSet = new Set();
    for (const link of onetLinks) {
        const skills = safeJsonParse(link.occupation?.topSkillsJson, []);
        for (const skill of skills.slice(0, 5)) {
            const name = typeof skill === 'string' ? skill : skill?.name || skill?.element || '';
            if (name) skillSet.add(name);
        }
    }
    return [...skillSet].slice(0, 12);
}

function computeConfidence(onetLinks) {
    if (!onetLinks || onetLinks.length === 0) return 0;

    let score = 50;

    score += Math.min(20, onetLinks.length * 5);

    const avgRelevance = onetLinks.reduce((sum, l) => sum + (l.relevance || 5), 0) / onetLinks.length;
    score += Math.round((avgRelevance / 10) * 20);

    if (onetLinks.some((l) => l.isPrimary)) score += 10;

    return Math.min(100, score);
}

module.exports = {
    computeOnetDerivedProfile,
    computeAllOnetDerivedProfiles,
    buildProfileFromLinks,
    computeWeightedRiasec,
    deriveHollandCode,
    DIMS,
};
