const express = require('express');
const { requireAuth } = require('../middlewares/requireAuth');
const {
    getLatestMatchingRun,
    getMatchingRunDetail,
    listMatchingHistory,
    runMatchingForUser,
} = require('../services/matching/matchingService');
const { runFullEvaluation } = require('../services/matching/evaluationService');
const { runComparativeEvaluation, formatComparativeReport } = require('../services/matching/algorithmComparisonService');
const { runWhatIfScenario } = require('../services/matching/whatIfService');
const { submitFeedback, getFeedbackStats } = require('../services/matching/feedbackService');
const { computeAdaptiveWeights } = require('../services/matching/adaptiveWeightService');
const { generateCareerRecommendations } = require('../services/matching/careerPathService');

const matchingRouter = express.Router();

matchingRouter.use(express.json({ limit: '2mb' }));
matchingRouter.use(requireAuth);

matchingRouter.get('/latest', async (req, res, next) => {
    try {
        const item = await getLatestMatchingRun(req.authSession.user.id, {
            scope: req.query.scope,
            focusArea: req.query.focusArea,
            limit: req.query.limit,
        });
        res.json({ success: true, item });
    } catch (error) {
        next(error);
    }
});

matchingRouter.post('/run', async (req, res, next) => {
    try {
        const item = await runMatchingForUser(req.authSession.user.id, req.body || {});
        res.json({
            success: true,
            message: 'Program matching completed successfully',
            item,
        });
    } catch (error) {
        if (error?.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        next(error);
    }
});

matchingRouter.get('/history', async (req, res, next) => {
    try {
        const payload = await listMatchingHistory(req.authSession.user.id, {
            limit: req.query.limit,
            offset: req.query.offset,
        });
        res.json({ success: true, ...payload });
    } catch (error) {
        next(error);
    }
});

matchingRouter.get('/runs/:runId', async (req, res, next) => {
    try {
        const item = await getMatchingRunDetail(req.authSession.user.id, req.params.runId, {
            limit: req.query.limit,
        });
        if (!item) {
            res.status(404).json({ error: 'Matching run not found' });
            return;
        }
        res.json({ success: true, item });
    } catch (error) {
        next(error);
    }
});

matchingRouter.get('/evaluation', requireAuth, async (req, res, next) => {
    try {
        const evaluation = runFullEvaluation();
        res.json({ success: true, evaluation });
    } catch (error) {
        next(error);
    }
});

matchingRouter.get('/evaluation/comparison', requireAuth, async (req, res, next) => {
    try {
        const evaluation = runComparativeEvaluation();
        const report = formatComparativeReport(evaluation);
        res.json({ success: true, evaluation, report });
    } catch (error) {
        next(error);
    }
});

matchingRouter.post('/what-if', async (req, res, next) => {
    try {
        const { riasec, ensembleWeights } = req.body || {};
        const item = await runWhatIfScenario({ riasec, ensembleWeights });
        res.json({ success: true, item });
    } catch (error) {
        if (error?.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        next(error);
    }
});

matchingRouter.post('/feedback', async (req, res, next) => {
    try {
        const feedback = await submitFeedback(req.authSession.user.id, req.body || {});
        res.json({ success: true, message: 'Feedback submitted', feedback });
    } catch (error) {
        if (error?.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        next(error);
    }
});

matchingRouter.get('/feedback/stats', async (req, res, next) => {
    try {
        const stats = await getFeedbackStats(req.authSession.user.id);
        res.json({ success: true, stats });
    } catch (error) {
        next(error);
    }
});

matchingRouter.get('/adaptive-weights', async (req, res, next) => {
    try {
        const result = await computeAdaptiveWeights(req.authSession.user.id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

matchingRouter.get('/career-paths', async (req, res, next) => {
    try {
        const locale = req.query.locale || req.query.lang || 'vi';
        const result = await generateCareerRecommendations(req.authSession.user.id, { locale });
        res.json({ success: true, ...result });
    } catch (error) {
        const msg = String(error?.message || '');
        if (msg.includes('No RIASEC assessment') || msg.includes('incomplete')) {
            res.status(400).json({ error: msg });
            return;
        }
        if (msg.includes('AI') || msg.includes('provider')) {
            res.status(502).json({ error: msg });
            return;
        }
        next(error);
    }
});

module.exports = { matchingRouter };
