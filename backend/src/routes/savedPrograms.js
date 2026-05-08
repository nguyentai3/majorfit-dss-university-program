const express = require('express');
const zod = require('zod');
const { prisma } = require('../db/prisma');
const requireAuth = require('../middlewares/requireAuth');
const {
    buildProgramCard,
    PROGRAM_INCLUDE,
    PUBLIC_PROGRAM_VISIBILITY_WHERE,
} = require('../services/programs/programCatalogService');

const saveProgramSchema = zod.z.object({
    programId: zod.z.string().min(1),
    notes: zod.z.string().trim().max(1000).optional(),
});

function toSavedProgramApi(row) {
    const program = row.program;
    const card = buildProgramCard(program);

    return {
        ...card,
        savedId: row.id,
        savedAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        notes: row.notes || '',
        isSaved: true,
    };
}

const savedProgramsRouter = express.Router();

savedProgramsRouter.use(express.json({ limit: '1mb' }));
savedProgramsRouter.use(requireAuth.requireAuth);

savedProgramsRouter.get('/', async (req, res, next) => {
    try {
        const userId = req.authSession.user.id;
        const savedPrograms = await prisma.savedProgram.findMany({
            where: { userId },
            include: {
                program: {
                    include: PROGRAM_INCLUDE,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const items = savedPrograms.map(toSavedProgramApi);
        res.json({ success: true, items, count: items.length });
    } catch (error) {
        next(error);
    }
});

savedProgramsRouter.post('/', async (req, res, next) => {
    try {
        const userId = req.authSession.user.id;
        const input = saveProgramSchema.parse(req.body ?? {});

        const program = await prisma.program.findFirst({
            where: {
                id: input.programId,
                status: 'ACTIVE',
                ...PUBLIC_PROGRAM_VISIBILITY_WHERE,
            },
            include: PROGRAM_INCLUDE,
        });

        if (!program) {
            res.status(404).json({ error: 'Program not found or not published' });
            return;
        }

        const savedProgram = await prisma.savedProgram.upsert({
            where: {
                userId_programId: {
                    userId,
                    programId: input.programId,
                },
            },
            update: {
                notes: input.notes?.trim() || null,
            },
            create: {
                userId,
                programId: input.programId,
                notes: input.notes?.trim() || null,
            },
            include: {
                program: {
                    include: PROGRAM_INCLUDE,
                },
            },
        });

        res.json({
            success: true,
            message: 'Program saved successfully',
            item: toSavedProgramApi(savedProgram),
        });
    } catch (error) {
        next(error);
    }
});

savedProgramsRouter.delete('/', async (req, res, next) => {
    try {
        const userId = req.authSession.user.id;
        const programId = typeof req.query.programId === 'string' ? req.query.programId : undefined;
        const savedId = typeof req.query.savedId === 'string' ? req.query.savedId : undefined;

        if (!programId && !savedId) {
            res.status(400).json({ error: 'Provide programId or savedId' });
            return;
        }

        const deleted = await prisma.savedProgram.deleteMany({
            where: {
                userId,
                ...(programId ? { programId } : {}),
                ...(savedId ? { id: savedId } : {}),
            },
        });

        res.json({ success: true, deleted: deleted.count });
    } catch (error) {
        next(error);
    }
});

module.exports = { savedProgramsRouter };
