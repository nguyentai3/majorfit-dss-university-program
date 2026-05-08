const { Router } = require('express');
const { prisma } = require('../../../../db/prisma');
const {
    RIASEC_SCALE_OPTIONS,
    DEFAULT_ASSESSMENT_VERSION,
    ensureDefaultRiasecQuestions,
} = require('../../../../services/riasec/questionService');
const {
    listQuerySchema,
    quizQuestionCreateSchema,
    quizQuestionUpdateSchema,
    toNullableInteger,
    toRiasecQuestionDto,
} = require('../shared');

const questionsAdminRouter = Router();

questionsAdminRouter.get('/questions', async (req, res, next) => {
    try {
        await ensureDefaultRiasecQuestions();
        const query = listQuerySchema.parse(req.query);
        const where = query.q
            ? {
                  OR: [
                      { prompt: { contains: query.q } },
                      { dimension: { contains: query.q } },
                      { code: { contains: query.q } },
                  ],
              }
            : {};
        if (query.version) {
            where.version = query.version;
        }

        const [items, total] = await Promise.all([
            prisma.riasecQuestion.findMany({
                where,
                orderBy: [{ version: 'desc' }, { order: 'asc' }, { prompt: 'asc' }],
                take: query.limit,
                skip: query.offset,
            }),
            prisma.riasecQuestion.count({ where }),
        ]);

        res.json({
            items: items.map((item) =>
                toRiasecQuestionDto({
                    ...item,
                    prompt: item.prompt,
                    question: item.prompt,
                    category: item.dimension,
                    dimension: item.dimension,
                    type: 'likert_scale',
                    options: JSON.stringify(RIASEC_SCALE_OPTIONS),
                }),
            ),
            total,
        });
    } catch (error) {
        next(error);
    }
});

questionsAdminRouter.post('/questions', async (req, res, next) => {
    try {
        const body = quizQuestionCreateSchema.parse(req.body ?? {});
        const prompt = String(body.prompt ?? body.question ?? '').trim();
        const dimension = String(body.dimension ?? body.category ?? '').trim().toUpperCase();

        const created = await prisma.riasecQuestion.create({
            data: {
                code: String(body.code || `${dimension}${body.order || Date.now()}`).trim(),
                prompt,
                dimension,
                order: toNullableInteger(body.order) ?? 1,
                active: body.active ?? true,
                version: toNullableInteger(body.version) ?? DEFAULT_ASSESSMENT_VERSION,
            },
        });

        res.json({
            success: true,
            item: toRiasecQuestionDto({
                ...created,
                question: created.prompt,
                category: created.dimension,
                type: 'likert_scale',
                options: JSON.stringify(RIASEC_SCALE_OPTIONS),
            }),
        });
    } catch (error) {
        next(error);
    }
});

questionsAdminRouter.patch('/questions/:questionId', async (req, res, next) => {
    try {
        const body = quizQuestionUpdateSchema.parse(req.body ?? {});
        const data = {};

        if (Object.prototype.hasOwnProperty.call(body, 'question') || Object.prototype.hasOwnProperty.call(body, 'prompt')) {
            data.prompt = String(body.prompt ?? body.question ?? '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(body, 'category') || Object.prototype.hasOwnProperty.call(body, 'dimension')) {
            data.dimension = String(body.dimension ?? body.category ?? '').trim().toUpperCase();
        }
        if (Object.prototype.hasOwnProperty.call(body, 'code')) data.code = String(body.code || '').trim();
        if (Object.prototype.hasOwnProperty.call(body, 'order')) data.order = toNullableInteger(body.order);
        if (Object.prototype.hasOwnProperty.call(body, 'version')) data.version = toNullableInteger(body.version);
        if (Object.prototype.hasOwnProperty.call(body, 'active')) data.active = Boolean(body.active);

        const updated = await prisma.riasecQuestion.update({
            where: { id: req.params.questionId },
            data,
        });

        res.json({
            success: true,
            item: toRiasecQuestionDto({
                ...updated,
                question: updated.prompt,
                category: updated.dimension,
                type: 'likert_scale',
                options: JSON.stringify(RIASEC_SCALE_OPTIONS),
            }),
        });
    } catch (error) {
        next(error);
    }
});

questionsAdminRouter.delete('/questions/:questionId', async (req, res, next) => {
    try {
        await prisma.riasecQuestion.delete({ where: { id: req.params.questionId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = { questionsAdminRouter };
