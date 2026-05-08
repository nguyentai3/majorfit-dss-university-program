const { Router } = require('express');
const { prisma } = require('../../../../db/prisma');
const {
    listQuerySchema,
    expertReviewCreateSchema,
    expertReviewUpdateSchema,
    normalizeNullableString,
    safeJsonParse,
} = require('../shared');

const expertReviewsAdminRouter = Router();

expertReviewsAdminRouter.get('/expert-reviews', async (req, res, next) => {
    try {
        const query = listQuerySchema.parse(req.query);
        const { programId, profileId } = req.query;

        const where = {};
        if (programId) where.programId = programId;
        if (profileId) where.programProfileId = profileId;
        if (query.q) {
            where.OR = [
                { reviewerName: { contains: query.q } },
                { reviewerInstitution: { contains: query.q } },
                { overallNotes: { contains: query.q } },
            ];
        }

        const [items, total] = await Promise.all([
            prisma.expertReview.findMany({
                where,
                orderBy: { reviewDate: 'desc' },
                take: query.limit,
                skip: query.offset,
                include: {
                    program: { select: { id: true, code: true, name: true } },
                    programProfile: { select: { id: true, promptVersion: true, modelName: true, isPublished: true } },
                },
            }),
            prisma.expertReview.count({ where }),
        ]);

        res.json({
            items: items.map(mapExpertReview),
            total,
        });
    } catch (error) {
        next(error);
    }
});

expertReviewsAdminRouter.get('/expert-reviews/:reviewId', async (req, res, next) => {
    try {
        const review = await prisma.expertReview.findUnique({
            where: { id: req.params.reviewId },
            include: {
                program: { select: { id: true, code: true, name: true } },
                programProfile: {
                    select: {
                        id: true, promptVersion: true, modelName: true,
                        isPublished: true, riasecScoresJson: true,
                        aiSummary: true, confidenceScore: true,
                    },
                },
            },
        });

        if (!review) {
            res.status(404).json({ error: 'Expert review not found' });
            return;
        }

        res.json({ item: mapExpertReview(review) });
    } catch (error) {
        next(error);
    }
});

expertReviewsAdminRouter.post('/expert-reviews', async (req, res, next) => {
    try {
        const body = expertReviewCreateSchema.parse(req.body ?? {});

        const profile = await prisma.programProfile.findUnique({ where: { id: body.programProfileId } });
        if (!profile) {
            res.status(404).json({ error: 'Program profile not found' });
            return;
        }

        const created = await prisma.expertReview.create({
            data: {
                programProfileId: body.programProfileId,
                programId: body.programId,
                reviewerName: body.reviewerName.trim(),
                reviewerTitle: normalizeNullableString(body.reviewerTitle),
                reviewerEmail: normalizeNullableString(body.reviewerEmail),
                reviewerInstitution: normalizeNullableString(body.reviewerInstitution),
                riasecAgreementJson: JSON.stringify(body.riasecAgreement),
                skillAgreementJson: JSON.stringify(body.skillAgreement),
                summaryAccuracy: body.summaryAccuracy,
                overallScore: body.overallScore ?? null,
                strengthNotes: normalizeNullableString(body.strengthNotes),
                weaknessNotes: normalizeNullableString(body.weaknessNotes),
                overallNotes: normalizeNullableString(body.overallNotes),
                recommendation: normalizeNullableString(body.recommendation),
                reviewDate: body.reviewDate ? new Date(body.reviewDate) : new Date(),
            },
            include: {
                program: { select: { id: true, code: true, name: true } },
                programProfile: { select: { id: true, promptVersion: true, modelName: true, isPublished: true } },
            },
        });

        res.json({ success: true, item: mapExpertReview(created) });
    } catch (error) {
        next(error);
    }
});

expertReviewsAdminRouter.patch('/expert-reviews/:reviewId', async (req, res, next) => {
    try {
        const body = expertReviewUpdateSchema.parse(req.body ?? {});
        const existing = await prisma.expertReview.findUnique({ where: { id: req.params.reviewId } });

        if (!existing) {
            res.status(404).json({ error: 'Expert review not found' });
            return;
        }

        const data = {};
        if (Object.prototype.hasOwnProperty.call(body, 'reviewerName')) data.reviewerName = body.reviewerName.trim();
        if (Object.prototype.hasOwnProperty.call(body, 'reviewerTitle')) data.reviewerTitle = normalizeNullableString(body.reviewerTitle);
        if (Object.prototype.hasOwnProperty.call(body, 'reviewerEmail')) data.reviewerEmail = normalizeNullableString(body.reviewerEmail);
        if (Object.prototype.hasOwnProperty.call(body, 'reviewerInstitution')) data.reviewerInstitution = normalizeNullableString(body.reviewerInstitution);
        if (Object.prototype.hasOwnProperty.call(body, 'riasecAgreement')) data.riasecAgreementJson = JSON.stringify(body.riasecAgreement);
        if (Object.prototype.hasOwnProperty.call(body, 'skillAgreement')) data.skillAgreementJson = JSON.stringify(body.skillAgreement);
        if (Object.prototype.hasOwnProperty.call(body, 'summaryAccuracy')) data.summaryAccuracy = body.summaryAccuracy;
        if (Object.prototype.hasOwnProperty.call(body, 'overallScore')) data.overallScore = body.overallScore;
        if (Object.prototype.hasOwnProperty.call(body, 'strengthNotes')) data.strengthNotes = normalizeNullableString(body.strengthNotes);
        if (Object.prototype.hasOwnProperty.call(body, 'weaknessNotes')) data.weaknessNotes = normalizeNullableString(body.weaknessNotes);
        if (Object.prototype.hasOwnProperty.call(body, 'overallNotes')) data.overallNotes = normalizeNullableString(body.overallNotes);
        if (Object.prototype.hasOwnProperty.call(body, 'recommendation')) data.recommendation = normalizeNullableString(body.recommendation);
        if (Object.prototype.hasOwnProperty.call(body, 'reviewDate')) data.reviewDate = new Date(body.reviewDate);

        const updated = await prisma.expertReview.update({
            where: { id: req.params.reviewId },
            data,
            include: {
                program: { select: { id: true, code: true, name: true } },
                programProfile: { select: { id: true, promptVersion: true, modelName: true, isPublished: true } },
            },
        });

        res.json({ success: true, item: mapExpertReview(updated) });
    } catch (error) {
        next(error);
    }
});

expertReviewsAdminRouter.delete('/expert-reviews/:reviewId', async (req, res, next) => {
    try {
        const existing = await prisma.expertReview.findUnique({ where: { id: req.params.reviewId } });
        if (!existing) {
            res.status(404).json({ error: 'Expert review not found' });
            return;
        }

        await prisma.expertReview.delete({ where: { id: req.params.reviewId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

expertReviewsAdminRouter.get('/expert-reviews-summary', async (req, res, next) => {
    try {
        const reviews = await prisma.expertReview.findMany({
            select: {
                summaryAccuracy: true,
                overallScore: true,
                recommendation: true,
                riasecAgreementJson: true,
                skillAgreementJson: true,
                programId: true,
            },
        });

        const totalReviews = reviews.length;
        if (totalReviews === 0) {
            res.json({ totalReviews: 0, avgSummaryAccuracy: 0, avgOverallScore: 0, recommendations: {}, programsCovered: 0 });
            return;
        }

        const avgSummaryAccuracy = reviews.reduce((s, r) => s + r.summaryAccuracy, 0) / totalReviews;
        const withOverall = reviews.filter((r) => r.overallScore != null);
        const avgOverallScore = withOverall.length ? withOverall.reduce((s, r) => s + r.overallScore, 0) / withOverall.length : 0;

        const recommendations = {};
        reviews.forEach((r) => {
            const rec = r.recommendation || 'NONE';
            recommendations[rec] = (recommendations[rec] || 0) + 1;
        });

        const programsCovered = new Set(reviews.map((r) => r.programId)).size;

        const riasecAgreements = { R: [], I: [], A: [], S: [], E: [], C: [] };
        reviews.forEach((r) => {
            const agreement = safeJsonParse(r.riasecAgreementJson, {});
            for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
                if (typeof agreement[dim] === 'number') riasecAgreements[dim].push(agreement[dim]);
            }
        });

        const avgRiasecAgreement = {};
        for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
            const arr = riasecAgreements[dim];
            avgRiasecAgreement[dim] = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
        }

        res.json({
            totalReviews,
            avgSummaryAccuracy: Math.round(avgSummaryAccuracy * 100) / 100,
            avgOverallScore: Math.round(avgOverallScore * 100) / 100,
            recommendations,
            programsCovered,
            avgRiasecAgreement,
        });
    } catch (error) {
        next(error);
    }
});

function mapExpertReview(row) {
    return {
        id: row.id,
        programProfileId: row.programProfileId,
        programId: row.programId,
        reviewerName: row.reviewerName,
        reviewerTitle: row.reviewerTitle,
        reviewerEmail: row.reviewerEmail,
        reviewerInstitution: row.reviewerInstitution,
        riasecAgreement: safeJsonParse(row.riasecAgreementJson, {}),
        skillAgreement: safeJsonParse(row.skillAgreementJson, {}),
        summaryAccuracy: row.summaryAccuracy,
        overallScore: row.overallScore,
        strengthNotes: row.strengthNotes,
        weaknessNotes: row.weaknessNotes,
        overallNotes: row.overallNotes,
        recommendation: row.recommendation,
        reviewDate: row.reviewDate,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        program: row.program,
        programProfile: row.programProfile,
    };
}

module.exports = { expertReviewsAdminRouter };
