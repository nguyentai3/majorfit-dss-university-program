const express = require('express');
const { requireAuth } = require('../middlewares/requireAuth');
const { listActiveRiasecQuestions, listIip48Questions, listAvailableVersions } = require('../services/riasec/questionService');
const {
    submitRiasecAttempt,
    getRiasecHistory,
    getRiasecProfile,
    getRiasecAttemptById,
} = require('../services/riasec/assessmentService');
const { generateGrowthInterpretation } = require('../services/riasec/growthInterpreterService');
const { matchStudentToOnetCareers } = require('../services/riasec/onetCareerMatchService');

const riasecRouter = express.Router();

riasecRouter.use(express.json({ limit: '2mb' }));

riasecRouter.get('/questions', async (req, res, next) => {
    try {
        const mode = req.query.mode;

        let questionsResult;
        if (mode === 'iip48') {
            questionsResult = await listIip48Questions();
        } else {
            const requestedVersion = req.query.version ? Number(req.query.version) : null;
            questionsResult = await listActiveRiasecQuestions(requestedVersion);
        }

        const { version, questions, scale, ...extra } = questionsResult;
        res.json({
            success: true,
            version,
            mode: extra.mode || 'standard',
            total: questions.length,
            questions,
            scale,
            ...(extra.stats ? { stats: extra.stats } : {}),
        });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/versions', async (_req, res, next) => {
    try {
        const versions = await listAvailableVersions();
        res.json({ success: true, versions });
    } catch (error) {
        next(error);
    }
});

riasecRouter.use(requireAuth);

riasecRouter.post('/submit', async (req, res, next) => {
    try {
        const result = await submitRiasecAttempt(req.authSession.user.id, req.body || {});
        res.json({
            success: true,
            message: 'Assessment submitted successfully',
            result,
        });
    } catch (error) {
        if (error?.statusCode) {
            res.status(error.statusCode).json({
                error: error.message,
                ...(error.payload || {}),
            });
            return;
        }
        next(error);
    }
});

riasecRouter.get('/history', async (req, res, next) => {
    try {
        const attempts = await getRiasecHistory(req.authSession.user.id);
        res.json({ success: true, attempts, total: attempts.length });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/profile', async (req, res, next) => {
    try {
        const profile = await getRiasecProfile(req.authSession.user.id);
        res.json({ success: true, profile });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/career-suggestions', async (req, res, next) => {
    try {
        const profile = await getRiasecProfile(req.authSession.user.id);
        if (!profile?.totalAttempts) {
            return res.json({ success: true, careers: [] });
        }
        const scores =
            profile.stableScores && Object.keys(profile.stableScores).length
                ? profile.stableScores
                : profile.normalizedScores;
        const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
        const careers = await matchStudentToOnetCareers(scores, { limit });
        res.json({ success: true, careers });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/report', async (req, res, next) => {
    try {
        const profile = await getRiasecProfile(req.authSession.user.id);
        const attempts = await getRiasecHistory(req.authSession.user.id, 5);

        res.json({
            success: true,
            report: {
                generatedAt: new Date().toISOString(),
                profile,
                recentAttempts: attempts,
            },
        });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/growth-interpretation', async (req, res, next) => {
    try {
        const locale = req.query.locale || req.query.lang || 'en';
        const result = await generateGrowthInterpretation(req.authSession.user.id, { locale });

        if (!result.success) {
            res.status(400).json({ success: false, error: result.error });
            return;
        }

        res.json({
            success: true,
            generatedAt: new Date().toISOString(),
            source: result.source,
            profile: result.profile,
            interpretation: result.interpretation,
            topClusters: result.topClusters || [],
        });
    } catch (error) {
        next(error);
    }
});

riasecRouter.get('/attempts/:attemptId', async (req, res, next) => {
    try {
        const attempt = await getRiasecAttemptById(req.authSession.user.id, req.params.attemptId);

        if (!attempt) {
            res.status(404).json({ error: 'Assessment attempt not found' });
            return;
        }

        res.json({ success: true, attempt });
    } catch (error) {
        next(error);
    }
});

module.exports = { riasecRouter };
