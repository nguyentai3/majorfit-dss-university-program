const { prisma } = require('../db/prisma');

function toIso(value) {
    if (!value) {
        return value;
    }
    return value instanceof Date ? value.toISOString() : value;
}

async function getUserInsightDataForUser(userId) {
    const [savedPrograms, user, riasecAttempts, riasecProfile] = await Promise.all([
        prisma.savedProgram.findMany({
            where: { userId },
            include: {
                program: {
                    include: {
                        university: true,
                        profiles: {
                            where: { isPublished: true },
                            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.riasecAttempt.findMany({ where: { userId }, orderBy: { submittedAt: 'desc' } }),
        prisma.userRiasecProfile.findUnique({ where: { userId } }),
    ]);

    return {
        savedPrograms,
        user,
        riasecAttempts,
        riasecProfile,
    };
}

module.exports = {
    getUserInsightDataForUser,
    toIso,
};
