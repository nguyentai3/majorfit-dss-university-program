const { Router } = require('express');
const { z } = require('zod');
const {
    cloneQuestionBank,
    createQuestionBank,
    deleteQuestionBank,
    listQuestionBanks,
    publishQuestionBank,
    setDefaultQuestionBank,
    updateQuestionBank,
    validateQuestionBankVersion,
} = require('../../../../services/riasec/questionBankService');

const questionBanksAdminRouter = Router();

const bankBaseSchema = z.object({
    version: z.any().optional(),
    name: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
    sourceLabel: z.string().nullable().optional(),
    sourceUrl: z.string().nullable().optional(),
    sourceCitation: z.string().nullable().optional(),
});

const bankCreateSchema = bankBaseSchema.extend({
    name: z.string().min(2),
});

function handleServiceError(error, res, next) {
    if (error?.statusCode) {
        res.status(error.statusCode).json({
            error: error.message,
            ...(error.payload || {}),
        });
        return;
    }
    next(error);
}

questionBanksAdminRouter.get('/question-banks', async (_req, res, next) => {
    try {
        const items = await listQuestionBanks();
        res.json({ items, total: items.length });
    } catch (error) {
        next(error);
    }
});

questionBanksAdminRouter.post('/question-banks', async (req, res, next) => {
    try {
        const body = bankCreateSchema.parse(req.body ?? {});
        const item = await createQuestionBank(body);
        res.json({ success: true, item });
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

questionBanksAdminRouter.patch('/question-banks/:bankId', async (req, res, next) => {
    try {
        const body = bankBaseSchema.partial().parse(req.body ?? {});
        const item = await updateQuestionBank(req.params.bankId, body);
        res.json({ success: true, item });
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

questionBanksAdminRouter.post('/question-banks/:bankId/clone', async (req, res, next) => {
    try {
        const body = bankBaseSchema.partial().parse(req.body ?? {});
        const item = await cloneQuestionBank(req.params.bankId, body);
        res.json({ success: true, item });
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

questionBanksAdminRouter.get('/question-banks/:bankId/validation', async (req, res, next) => {
    try {
        const banks = await listQuestionBanks();
        const bank = banks.find((item) => item.id === req.params.bankId);
        if (!bank) {
            res.status(404).json({ error: 'Question bank not found.' });
            return;
        }
        const validation = await validateQuestionBankVersion(bank.version);
        res.json({ success: true, bank, validation });
    } catch (error) {
        next(error);
    }
});

questionBanksAdminRouter.post('/question-banks/:bankId/publish', async (req, res, next) => {
    try {
        const result = await publishQuestionBank(req.params.bankId);
        res.json({ success: true, ...result });
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

questionBanksAdminRouter.post('/question-banks/:bankId/set-default', async (req, res, next) => {
    try {
        const result = await setDefaultQuestionBank(req.params.bankId);
        res.json({ success: true, ...result });
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

questionBanksAdminRouter.delete('/question-banks/:bankId', async (req, res, next) => {
    try {
        const result = await deleteQuestionBank(req.params.bankId);
        res.json(result);
    } catch (error) {
        handleServiceError(error, res, next);
    }
});

module.exports = { questionBanksAdminRouter };
