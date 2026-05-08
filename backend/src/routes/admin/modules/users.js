const { Router } = require('express');
const { prisma } = require('../../../db/prisma');
const { userListQuerySchema } = require('./shared');

const usersAdminRouter = Router();

usersAdminRouter.get('/users', async (req, res, next) => {
    try {
        const query = userListQuerySchema.parse(req.query);

        const users = await prisma.user.findMany({
            where: {
                ...(query.q
                    ? {
                          OR: [
                              { email: { contains: query.q } },
                              { firstName: { contains: query.q } },
                              { lastName: { contains: query.q } },
                          ],
                      }
                    : {}),
            },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: query.limit,
            skip: query.offset,
        });

        const total = await prisma.user.count({
            where: {
                ...(query.q
                    ? {
                          OR: [
                              { email: { contains: query.q } },
                              { firstName: { contains: query.q } },
                              { lastName: { contains: query.q } },
                          ],
                      }
                    : {}),
            },
        });

        const userIds = users.map((user) => user.id);
        const [attemptCounts, profiles, academicProfiles] = userIds.length
            ? await Promise.all([
                  prisma.riasecAttempt.groupBy({
                      by: ['userId'],
                      where: { userId: { in: userIds } },
                      _count: { _all: true },
                      _max: { submittedAt: true },
                  }),
                  prisma.userRiasecProfile.findMany({
                      where: { userId: { in: userIds } },
                      select: { userId: true, latestHollandCode: true, confidenceScore: true },
                  }),
                  prisma.profile.findMany({
                      where: { id: { in: userIds } },
                      select: {
                          id: true,
                          schoolName: true,
                          classCode: true,
                          gradeLevel: true,
                          academicYear: true,
                          currentSemester: true,
                      },
                  }),
              ])
            : [[], [], []];

        const attemptMap = new Map(
            attemptCounts.map((row) => [
                row.userId,
                {
                    assessmentCount: row._count._all || 0,
                    lastAssessmentAt: row._max.submittedAt?.toISOString?.() || null,
                },
            ]),
        );
        const profileMap = new Map(
            profiles.map((row) => [
                row.userId,
                {
                    latestHollandCode: row.latestHollandCode || null,
                    confidenceScore: row.confidenceScore ?? null,
                },
            ]),
        );
        const academicMap = new Map(
            academicProfiles.map((row) => [row.id, row]),
        );

        res.json({
            users: users.map((user) => ({
                ...user,
                createdAt: user.createdAt.toISOString(),
                isAdmin: String(user.role || '').toUpperCase() === 'ADMIN',
                assessmentCount: attemptMap.get(user.id)?.assessmentCount || 0,
                lastAssessmentAt: attemptMap.get(user.id)?.lastAssessmentAt || null,
                latestHollandCode: profileMap.get(user.id)?.latestHollandCode || null,
                confidenceScore: profileMap.get(user.id)?.confidenceScore || null,
                schoolName: academicMap.get(user.id)?.schoolName || null,
                classCode: academicMap.get(user.id)?.classCode || null,
                gradeLevel: academicMap.get(user.id)?.gradeLevel || null,
                academicYear: academicMap.get(user.id)?.academicYear || null,
                currentSemester: academicMap.get(user.id)?.currentSemester || null,
            })),
            total,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = { usersAdminRouter };
