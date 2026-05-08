const { prisma } = require('../../db/prisma');

async function submitFeedback(userId, { matchResultId, rating, isRelevant, comment }) {
    if (!matchResultId) throw Object.assign(new Error('matchResultId is required'), { statusCode: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw Object.assign(new Error('rating must be an integer 1-5'), { statusCode: 400 });
    }

    const matchResult = await prisma.matchResult.findUnique({
        where: { id: matchResultId },
        include: { matchingRun: { select: { userId: true } } },
    });

    if (!matchResult || matchResult.matchingRun.userId !== userId) {
        throw Object.assign(new Error('Match result not found'), { statusCode: 404 });
    }

    const feedback = await prisma.matchResultFeedback.upsert({
        where: {
            matchResultId_userId: { matchResultId, userId },
        },
        update: {
            rating,
            isRelevant: isRelevant !== undefined ? Boolean(isRelevant) : true,
            comment: comment ? String(comment).trim().slice(0, 500) : null,
        },
        create: {
            matchResultId,
            userId,
            rating,
            isRelevant: isRelevant !== undefined ? Boolean(isRelevant) : true,
            comment: comment ? String(comment).trim().slice(0, 500) : null,
        },
    });

    return feedback;
}

async function getFeedbackStats(userId) {
    const feedbacks = await prisma.matchResultFeedback.findMany({
        where: { userId },
        select: { rating: true, isRelevant: true },
    });

    if (!feedbacks.length) {
        return {
            totalFeedbacks: 0,
            averageRating: null,
            relevanceRate: null,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
    }

    const total = feedbacks.length;
    const avgRating = Math.round((feedbacks.reduce((s, f) => s + f.rating, 0) / total) * 100) / 100;
    const relevantCount = feedbacks.filter((f) => f.isRelevant).length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

    return {
        totalFeedbacks: total,
        averageRating: avgRating,
        relevanceRate: Math.round((relevantCount / total) * 10000) / 10000,
        userPerceivedPrecision: `${Math.round((relevantCount / total) * 100)}%`,
        distribution,
    };
}

module.exports = { submitFeedback, getFeedbackStats };
