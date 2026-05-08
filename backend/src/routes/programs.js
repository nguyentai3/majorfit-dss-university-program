const express = require('express');
const { prisma } = require('../db/prisma');
const {
    getPublishedProgramDetail,
    listPublishedPrograms,
    mapUniversity,
    PUBLIC_PROGRAM_VISIBILITY_WHERE,
} = require('../services/programs/programCatalogService');

const programsRouter = express.Router();

programsRouter.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 200);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const q = String(req.query.q || '').trim();
        const university = String(req.query.university || '').trim().toUpperCase();
        const focusArea = String(req.query.focusArea || '').trim();

        const [result, universities] = await Promise.all([
            listPublishedPrograms({ q, universityCode: university, focusArea, limit, offset }),
            prisma.university.findMany({
                where: { programs: { some: { status: 'ACTIVE', ...PUBLIC_PROGRAM_VISIBILITY_WHERE } } },
                orderBy: [{ featured: 'desc' }, { shortName: 'asc' }, { name: 'asc' }],
                include: { _count: { select: { programs: true } } },
            }),
        ]);

        res.json({
            success: true,
            items: result.items,
            total: result.total,
            universities: universities.map(mapUniversity),
        });
    } catch (error) {
        next(error);
    }
});

programsRouter.get('/:identifier', async (req, res, next) => {
    try {
        const item = await getPublishedProgramDetail(req.params.identifier);
        if (!item) {
            res.status(404).json({ error: 'Program not found' });
            return;
        }

        res.json({ success: true, item });
    } catch (error) {
        next(error);
    }
});

module.exports = { programsRouter };
