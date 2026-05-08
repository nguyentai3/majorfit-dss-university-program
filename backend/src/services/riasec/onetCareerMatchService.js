
const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');

const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

function normalizeOnetRiasec(rawScore) {
    const v = Number(rawScore) || 0;
    if (v <= 1) return 0;
    if (v >= 7) return 100;
    return ((v - 1) / 6) * 100;
}

function sawSimilarity(studentScores, occScores) {
    let weightedScore = 0;
    let totalWeight = 0;
    for (const dim of DIMS) {
        const s = Number(studentScores[dim] || 0) / 100;
        const o = normalizeOnetRiasec(occScores[dim]) / 100;
        totalWeight += o;
        weightedScore += o * (1 - Math.abs(s - o));
    }
    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
}

function cosineSimilarity(studentScores, occScores) {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (const dim of DIMS) {
        const a = Number(studentScores[dim] || 0);
        const b = normalizeOnetRiasec(occScores[dim]);
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }
    if (magA === 0 || magB === 0) return 0;
    return (dot / (Math.sqrt(magA) * Math.sqrt(magB))) * 100;
}

function hybridScore(studentScores, occScores) {
    const saw = sawSimilarity(studentScores, occScores);
    const cos = cosineSimilarity(studentScores, occScores);
    return Math.round((saw * 0.6 + cos * 0.4) * 100) / 100;
}

function deriveHollandCode(scores) {
    return DIMS.slice()
        .sort((a, b) => (Number(scores[b]) || 0) - (Number(scores[a]) || 0))
        .slice(0, 3)
        .join('');
}

function iachanCongruence(studentCode, occCode) {
    if (!studentCode || !occCode || occCode.length < 2) return 0;
    const stu = studentCode.toUpperCase().slice(0, 3);
    const occ = occCode.toUpperCase().slice(0, 3);
    const posWeight = [4, 2, 1];
    let score = 0;
    for (let i = 0; i < stu.length; i++) {
        const j = occ.indexOf(stu[i]);
        if (j !== -1) score += posWeight[i] * posWeight[j];
    }
    return score;
}

function fitLabel(score) {
    if (score >= 82) return 'Strong Match';
    if (score >= 68) return 'Good Match';
    return 'Possible Match';
}

async function matchStudentToOnetCareers(studentScores, { limit = 12 } = {}) {
    if (!studentScores || Object.keys(studentScores).length === 0) {
        return [];
    }

    const studentHollandCode = deriveHollandCode(studentScores);

    const occupations = await prisma.onetOccupation.findMany({
        where: { riasecScoresJson: { not: null } },
        select: {
            onetCode: true,
            title: true,
            hollandCode: true,
            riasecScoresJson: true,
            topSkillsJson: true,
        },
    });

    return occupations
        .filter((occ) => {
            const occScoresCheck = safeJsonParse(occ.riasecScoresJson, null);
            return occScoresCheck !== null;
        })
        .map((occ) => {
            const occScores = safeJsonParse(occ.riasecScoresJson, null);
            if (!occScores) return null;

            const baseScore = hybridScore(studentScores, occScores);
            const bonus = (iachanCongruence(studentHollandCode, occ.hollandCode) / 21) * 5;
            const score = Math.min(Math.round((baseScore + bonus) * 100) / 100, 100);

            const topSkills = safeJsonParse(occ.topSkillsJson, [])
                .slice(0, 4)
                .map((s) => (typeof s === 'string' ? s : s.name || s.element || ''))
                .filter(Boolean);

            return {
                onetCode: occ.onetCode,
                title: occ.title,
                hollandCode: occ.hollandCode || null,
                matchScore: score,
                fitLabel: fitLabel(score),
                topSkills,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
}

module.exports = { matchStudentToOnetCareers, normalizeOnetRiasec };
