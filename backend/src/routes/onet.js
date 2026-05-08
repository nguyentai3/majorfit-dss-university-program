const express = require('express');
const { prisma } = require('../db/prisma');

const onetRouter = express.Router();

onetRouter.get('/occupations', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const q = String(req.query.q || '').trim();
        const holland = String(req.query.holland || '').trim().toUpperCase();

        const where = {};
        if (q) {
            where.title = { contains: q };
        }
        if (holland) {
            where.hollandCode = { startsWith: holland };
        }

        const [items, total] = await Promise.all([
            prisma.onetOccupation.findMany({
                where,
                orderBy: [{ title: 'asc' }],
                skip: offset,
                take: limit,
            }),
            prisma.onetOccupation.count({ where }),
        ]);

        res.json({
            success: true,
            items: items.map(formatOccupation),
            total,
            limit,
            offset,
        });
    } catch (error) {
        next(error);
    }
});

onetRouter.get('/occupations/:onetCode', async (req, res, next) => {
    try {
        const occ = await prisma.onetOccupation.findUnique({
            where: { onetCode: req.params.onetCode },
        });
        if (!occ) {
            return res.status(404).json({ success: false, message: 'Occupation not found' });
        }
        res.json({ success: true, data: formatOccupation(occ) });
    } catch (error) {
        next(error);
    }
});

onetRouter.get('/match-occupations', async (req, res, next) => {
    try {
        const userScores = {
            R: Number(req.query.R || 0),
            I: Number(req.query.I || 0),
            A: Number(req.query.A || 0),
            S: Number(req.query.S || 0),
            E: Number(req.query.E || 0),
            C: Number(req.query.C || 0),
        };
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

        const maxUser = Math.max(...Object.values(userScores), 1);
        const normalized = {};
        for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
            normalized[dim] = (userScores[dim] / maxUser) * 7;
        }

        const allOccs = await prisma.onetOccupation.findMany({
            select: {
                onetCode: true,
                title: true,
                hollandCode: true,
                riasecScoresJson: true,
            },
        });

        const scored = allOccs
            .filter((o) => o.riasecScoresJson)
            .map((o) => {
                const oRiasec = JSON.parse(o.riasecScoresJson);
                let sumSq = 0;
                for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
                    sumSq += (normalized[dim] - (oRiasec[dim] || 0)) ** 2;
                }
                return {
                    onetCode: o.onetCode,
                    title: o.title,
                    hollandCode: o.hollandCode,
                    riasec: oRiasec,
                    distance: Math.sqrt(sumSq),
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        const maxDist = Math.sqrt(6 * 7 * 7);
        const results = scored.map((o) => ({
            ...o,
            similarity: Math.round((1 - o.distance / maxDist) * 10000) / 100,
        }));

        res.json({ success: true, items: results, userScores });
    } catch (error) {
        next(error);
    }
});

onetRouter.get('/stats', async (req, res, next) => {
    try {
        const total = await prisma.onetOccupation.count();
        const version = await prisma.onetOccupation.findFirst({
            select: { dataVersion: true },
        });

        res.json({
            success: true,
            data: {
                totalOccupations: total,
                dataVersion: version?.dataVersion || 'N/A',
                source: 'U.S. Department of Labor / O*NET Center',
                license: 'Public Domain (U.S. Government Work)',
                url: 'https://www.onetcenter.org/database.html',
            },
        });
    } catch (error) {
        next(error);
    }
});

onetRouter.get('/riasec-distribution', async (req, res, next) => {
    try {
        const allOccs = await prisma.onetOccupation.findMany({
            select: {
                hollandCode: true,
                riasecScoresJson: true,
            },
        });

        const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

        const primaryDist = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        const codedOccs = allOccs.filter((o) => o.hollandCode && o.hollandCode.length >= 1);
        for (const o of codedOccs) {
            const primary = o.hollandCode[0];
            if (primaryDist[primary] !== undefined) primaryDist[primary]++;
        }

        const coOccurrence = {};
        for (const d of DIMS) {
            coOccurrence[d] = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        }
        for (const o of codedOccs) {
            const primary = o.hollandCode[0];
            if (!DIMS.includes(primary)) continue;
            coOccurrence[primary][primary]++;
            for (let i = 1; i < o.hollandCode.length && i < 3; i++) {
                const secondary = o.hollandCode[i];
                if (DIMS.includes(secondary)) {
                    coOccurrence[primary][secondary]++;
                }
            }
        }

        const scoreAccum = {};
        const scoreCounts = {};
        for (const d of DIMS) {
            scoreAccum[d] = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
            scoreCounts[d] = 0;
        }
        for (const o of codedOccs) {
            if (!o.riasecScoresJson) continue;
            const primary = o.hollandCode[0];
            if (!DIMS.includes(primary)) continue;
            const scores = JSON.parse(o.riasecScoresJson);
            for (const dim of DIMS) {
                scoreAccum[primary][dim] += Number(scores[dim] || 0);
            }
            scoreCounts[primary]++;
        }
        const avgScoresByType = {};
        for (const d of DIMS) {
            avgScoresByType[d] = {};
            for (const dim of DIMS) {
                avgScoresByType[d][dim] =
                    scoreCounts[d] > 0
                        ? Math.round((scoreAccum[d][dim] / scoreCounts[d]) * 100) / 100
                        : 0;
            }
            avgScoresByType[d]._count = scoreCounts[d];
        }

        const values = DIMS.map((d) => primaryDist[d]);
        const total = values.reduce((a, b) => a + b, 0);
        const mean = total / DIMS.length;
        const sortedVals = [...values].sort((a, b) => a - b);
        let giniNum = 0;
        for (let i = 0; i < sortedVals.length; i++) {
            for (let j = 0; j < sortedVals.length; j++) {
                giniNum += Math.abs(sortedVals[i] - sortedVals[j]);
            }
        }
        const gini = total > 0 ? Math.round((giniNum / (2 * DIMS.length * total)) * 1000) / 1000 : 0;

        res.json({
            success: true,
            data: {
                totalCoded: codedOccs.length,
                primaryTypeDistribution: primaryDist,
                coOccurrenceMatrix: coOccurrence,
                avgScoresByType,
                balanceMetrics: {
                    giniCoefficient: gini,
                    minCount: Math.min(...values),
                    maxCount: Math.max(...values),
                    minMaxRatio:
                        Math.max(...values) > 0
                            ? Math.round((Math.min(...values) / Math.max(...values)) * 1000) / 1000
                            : 0,
                    mean: Math.round(mean * 10) / 10,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

function formatOccupation(occ) {
    return {
        onetCode: occ.onetCode,
        title: occ.title,
        description: occ.description,
        hollandCode: occ.hollandCode,
        riasec: occ.riasecScoresJson ? JSON.parse(occ.riasecScoresJson) : null,
        topSkills: occ.topSkillsJson ? JSON.parse(occ.topSkillsJson) : [],
        topKnowledge: occ.topKnowledgeJson ? JSON.parse(occ.topKnowledgeJson) : [],
        hotTechnologies: occ.hotTechJson ? JSON.parse(occ.hotTechJson) : [],
        dataVersion: occ.dataVersion,
    };
}

module.exports = { onetRouter };
