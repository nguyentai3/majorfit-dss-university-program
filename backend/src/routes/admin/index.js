const { Router, json } = require('express');
const { requireAdminAuth } = require('../../middlewares/requireAuth');
const { prisma } = require('../../db/prisma');
const { usersAdminRouter } = require('./modules/users');
const { contentAdminRouter } = require('./modules/content');
const { assessmentAdminRouter } = require('./modules/assessment');
const { runComparativeEvaluation } = require('../../services/matching/algorithmComparisonService');

const adminRouter = Router();

adminRouter.use(json({ limit: '2mb' }));
adminRouter.use(requireAdminAuth);

adminRouter.get('/stats', async (req, res, next) => {
    try {
        const [
            totalUsers,
            totalUniversities,
            totalPrograms,
            publishedProfiles,
            totalQuestions,
            totalAssessments,
            totalMatchingRuns,
            matchResults,
            recentUsers,
            gradeGroups,
            profilesWithContext,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.university.count(),
            prisma.program.count(),
            prisma.programProfile.count({ where: { isPublished: true } }),
            prisma.riasecQuestion.count(),
            prisma.riasecAttempt.count(),
            prisma.matchingRun.count(),
            prisma.matchResult.findMany({
                select: { finalScore: true, fitLevel: true },
            }),
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 90,
                select: { createdAt: true },
            }),
            prisma.profile.groupBy({
                by: ['gradeLevel'],
                where: { gradeLevel: { not: null } },
                _count: { _all: true },
            }),
            prisma.riasecAttempt.count({
                where: { OR: [{ gradeLevel: { not: null } }, { academicYear: { not: null } }] },
            }),
        ]);

        const activeUsersLast30Days = recentUsers.filter(
            (u) => Date.now() - new Date(u.createdAt).getTime() < 30 * 86400000,
        ).length;

        const fitDistribution = { HIGH_FIT: 0, MEDIUM_FIT: 0, STRETCH: 0 };
        let totalScore = 0;
        for (const r of matchResults) {
            totalScore += Number(r.finalScore || 0);
            if (r.fitLevel === 'HIGH_FIT') fitDistribution.HIGH_FIT++;
            else if (r.fitLevel === 'MEDIUM_FIT') fitDistribution.MEDIUM_FIT++;
            else fitDistribution.STRETCH++;
        }
        const avgMatchScore = matchResults.length
            ? Math.round((totalScore / matchResults.length) * 10) / 10
            : 0;

        const monthlyUsage = [];
        const now = new Date();
        for (let i = 89; i >= 0; i--) {
            const day = new Date(now);
            day.setDate(day.getDate() - i);
            const count = recentUsers.filter((u) => {
                const d = new Date(u.createdAt);
                return d.toDateString() === day.toDateString();
            }).length;
            monthlyUsage.push({ date: day.toISOString().slice(0, 10), value: count });
        }

        const gradeDistribution = gradeGroups
            .filter((g) => g.gradeLevel != null)
            .map((g) => ({ gradeLevel: g.gradeLevel, count: g._count._all }))
            .sort((a, b) => a.gradeLevel - b.gradeLevel);

        res.json({
            totalUsers,
            activeUsersLast30Days,
            totalActivities: totalAssessments,
            totalAssessments,
            totalUniversities,
            totalPrograms,
            publishedProfiles,
            totalQuestions,
            totalMatchingRuns,
            avgMatchScore,
            fitDistribution,
            studentsWithAcademicContext: profilesWithContext,
            gradeDistribution,
            contentDistribution: {
                universities: totalUniversities,
                programs: totalPrograms,
                questions: totalQuestions,
                publishedProfiles,
            },
            monthlyUsage,
        });
    } catch (error) {
        next(error);
    }
});

adminRouter.use(usersAdminRouter);
adminRouter.use(contentAdminRouter);
adminRouter.use(assessmentAdminRouter);

adminRouter.get('/evaluation/comparison', async (req, res, next) => {
    try {
        const evaluation = runComparativeEvaluation();
        res.json({ success: true, evaluation });
    } catch (error) {
        next(error);
    }
});

adminRouter.get('/feedback/stats', async (req, res, next) => {
    try {
        const feedbacks = await prisma.matchResultFeedback.findMany({
            select: { rating: true, isRelevant: true },
        });

        if (!feedbacks.length) {
            res.json({
                success: true,
                stats: {
                    totalFeedbacks: 0,
                    averageRating: null,
                    relevanceRate: null,
                    userPerceivedPrecision: '0%',
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                },
            });
            return;
        }

        const total = feedbacks.length;
        const avgRating = Math.round((feedbacks.reduce((s, f) => s + f.rating, 0) / total) * 100) / 100;
        const relevantCount = feedbacks.filter((f) => f.isRelevant).length;
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbacks.forEach((f) => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

        res.json({
            success: true,
            stats: {
                totalFeedbacks: total,
                averageRating: avgRating,
                relevanceRate: Math.round((relevantCount / total) * 10000) / 10000,
                userPerceivedPrecision: `${Math.round((relevantCount / total) * 100)}%`,
                distribution,
            },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = { adminRouter };
