const { Router } = require('express');
const { prisma } = require('../../../db/prisma');
const {
    normalizeNullableString,
    toNullableInteger,
} = require('./shared');
const {
    getRiasecHistory,
    getRiasecProfile,
} = require('../../../services/riasec/assessmentService');

const assessmentAdminRouter = Router();

function escapeCsv(value) {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
}

function buildCsv(rows) {
    return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

assessmentAdminRouter.get('/assessment/students/:userId', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const [user, academicProfile, riasecProfile, attempts] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    role: true,
                },
            }),
            prisma.profile.findUnique({ where: { id: userId } }),
            getRiasecProfile(userId),
            getRiasecHistory(userId, 10),
        ]);

        if (!user) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        res.json({
            success: true,
            report: {
                user: {
                    ...user,
                    createdAt: user.createdAt?.toISOString?.() || null,
                },
                academicProfile,
                riasecProfile,
                attempts,
            },
        });
    } catch (error) {
        next(error);
    }
});

assessmentAdminRouter.get('/assessment/export', async (req, res, next) => {
    try {
        const gradeLevel = toNullableInteger(req.query.gradeLevel);
        const academicYear = normalizeNullableString(req.query.academicYear);
        const classCode = normalizeNullableString(req.query.classCode);
        const matchedUserIds = classCode
            ? (
                  await prisma.profile.findMany({
                      where: { classCode },
                      select: { id: true },
                  })
              ).map((profile) => profile.id)
            : null;

        const attempts = await prisma.riasecAttempt.findMany({
            where: {
                ...(gradeLevel != null ? { gradeLevel } : {}),
                ...(academicYear ? { academicYear } : {}),
                ...(matchedUserIds ? { userId: { in: matchedUserIds.length ? matchedUserIds : ['__no_match__'] } } : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: [{ submittedAt: 'desc' }],
            take: 2000,
        });

        const userIds = [...new Set(attempts.map((attempt) => attempt.userId))];
        const [profiles, riasecProfiles] = userIds.length
            ? await Promise.all([
                  prisma.profile.findMany({
                      where: { id: { in: userIds } },
                  }),
                  prisma.userRiasecProfile.findMany({
                      where: { userId: { in: userIds } },
                  }),
              ])
            : [[], []];

        const profileMap = new Map(profiles.map((item) => [item.id, item]));
        const riasecProfileMap = new Map(riasecProfiles.map((item) => [item.userId, item]));

        const header = [
            'studentId',
            'email',
            'studentName',
            'schoolName',
            'classCode',
            'gradeLevel',
            'academicYear',
            'semester',
            'attemptLabel',
            'submittedAt',
            'durationSeconds',
            'hollandCode',
            'confidenceScore',
            'R',
            'I',
            'A',
            'S',
            'E',
            'C',
        ];

        const rows = attempts.map((attempt) => {
            const profile = profileMap.get(attempt.userId);
            const riasecProfile = riasecProfileMap.get(attempt.userId);
            const normalizedScores =
                typeof attempt.normalizedScoresJson === 'string'
                    ? JSON.parse(attempt.normalizedScoresJson)
                    : {};
            const studentName = [attempt.user.firstName, attempt.user.lastName]
                .filter(Boolean)
                .join(' ');

            return [
                attempt.userId,
                attempt.user.email,
                studentName || '',
                profile?.schoolName || '',
                profile?.classCode || '',
                attempt.gradeLevel ?? profile?.gradeLevel ?? '',
                attempt.academicYear || profile?.academicYear || '',
                attempt.semester || profile?.currentSemester || '',
                attempt.attemptLabel || '',
                attempt.submittedAt?.toISOString?.() || '',
                attempt.durationSeconds ?? '',
                attempt.hollandCode || '',
                riasecProfile?.confidenceScore ?? '',
                normalizedScores.R ?? '',
                normalizedScores.I ?? '',
                normalizedScores.A ?? '',
                normalizedScores.S ?? '',
                normalizedScores.E ?? '',
                normalizedScores.C ?? '',
            ];
        });

        const csv = buildCsv([header, ...rows]);
        const filename = `assessment-export-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
});

module.exports = { assessmentAdminRouter };
