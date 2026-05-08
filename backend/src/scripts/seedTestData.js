const bcryptjs = require('bcryptjs');
const { prisma } = require('../db/prisma');
const { runMatchingForUser } = require('../services/matching/matchingService');
const {
  buildConfidenceScore,
  buildStableScores,
} = require('../services/riasec/scoringService');

const PASSWORD = 'Test@1234';

const TEST_USERS = [
  {
    email: 'student.ai@test.com',
    firstName: 'Minh',
    lastName: 'Nguyễn',
    profile: {
      fullName: 'Nguyễn Văn Minh',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Lê Hồng Phong',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'AI / Data Science',
      careerGoal: 'Machine Learning Engineer',
    },
    attempts: [
      { holland: 'IAS', norm: { R: 45, I: 88, A: 72, S: 40, E: 35, C: 55 } },
      { holland: 'IAS', norm: { R: 48, I: 90, A: 74, S: 42, E: 38, C: 58 } },
      { holland: 'IAC', norm: { R: 50, I: 92, A: 70, S: 44, E: 40, C: 62 } },
      { holland: 'IAC', norm: { R: 52, I: 93, A: 72, S: 45, E: 42, C: 64 } },
    ],
  },
  {
    email: 'student.se@test.com',
    firstName: 'Hương',
    lastName: 'Trần',
    profile: {
      fullName: 'Trần Thị Hương',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Trần Đại Nghĩa',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'Software Engineering',
      careerGoal: 'Full-stack Developer',
    },
    attempts: [
      { holland: 'IRC', norm: { R: 70, I: 82, A: 45, S: 50, E: 42, C: 68 } },
      { holland: 'IRC', norm: { R: 72, I: 85, A: 48, S: 52, E: 44, C: 70 } },
      { holland: 'IRC', norm: { R: 74, I: 84, A: 46, S: 54, E: 45, C: 72 } },
    ],
  },
  {
    email: 'student.bis@test.com',
    firstName: 'Khoa',
    lastName: 'Lê',
    profile: {
      fullName: 'Lê Anh Khoa',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Nguyễn Thượng Hiền',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'Information Systems',
      careerGoal: 'IT Project Manager',
    },
    attempts: [
      { holland: 'ESC', norm: { R: 35, I: 55, A: 40, S: 72, E: 85, C: 65 } },
      { holland: 'ECS', norm: { R: 38, I: 58, A: 42, S: 70, E: 88, C: 68 } },
      { holland: 'ECS', norm: { R: 40, I: 60, A: 44, S: 68, E: 90, C: 72 } },
      { holland: 'ECS', norm: { R: 42, I: 62, A: 45, S: 69, E: 91, C: 74 } },
    ],
  },
  {
    email: 'student.design@test.com',
    firstName: 'Linh',
    lastName: 'Phạm',
    profile: {
      fullName: 'Phạm Ngọc Linh',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Gia Định',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'Graphic Design',
      careerGoal: 'UX/UI Designer',
    },
    attempts: [
      { holland: 'ASI', norm: { R: 38, I: 60, A: 90, S: 70, E: 50, C: 42 } },
      { holland: 'ASI', norm: { R: 40, I: 62, A: 92, S: 72, E: 52, C: 45 } },
      { holland: 'ASI', norm: { R: 42, I: 64, A: 93, S: 73, E: 53, C: 47 } },
    ],
  },
  {
    email: 'student.security@test.com',
    firstName: 'An',
    lastName: 'Bùi',
    profile: {
      fullName: 'Bùi Minh An',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Chuyên Lê Quý Đôn',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'Cybersecurity',
      careerGoal: 'Security Analyst',
    },
    attempts: [
      { holland: 'ICR', norm: { R: 60, I: 84, A: 28, S: 32, E: 38, C: 88 } },
      { holland: 'ICR', norm: { R: 62, I: 86, A: 26, S: 34, E: 40, C: 90 } },
      { holland: 'ICR', norm: { R: 64, I: 85, A: 25, S: 35, E: 41, C: 91 } },
    ],
  },
  {
    email: 'student.data@test.com',
    firstName: 'Vy',
    lastName: 'Đặng',
    profile: {
      fullName: 'Đặng Khánh Vy',
      educationLevel: 'Lớp 12',
      schoolName: 'THPT Chuyên Trần Đại Nghĩa',
      gradeLevel: 12,
      academicYear: '2024-2025',
      fieldOfInterest: 'Data Science',
      careerGoal: 'Data Scientist',
    },
    attempts: [
      { holland: 'ICR', norm: { R: 48, I: 84, A: 40, S: 45, E: 36, C: 82 } },
      { holland: 'ICR', norm: { R: 50, I: 86, A: 42, S: 46, E: 38, C: 84 } },
      { holland: 'ICR', norm: { R: 52, I: 87, A: 41, S: 48, E: 40, C: 86 } },
    ],
  },
];

function buildRawFromNorm(norm) {
  const raw = {};
  for (const [d, v] of Object.entries(norm)) {
    raw[d] = Math.round((v / 100) * 50);
  }
  return raw;
}

async function main() {
  const hashedPassword = await bcryptjs.hash(PASSWORD, 12);
  const createdUsers = [];

  for (const userData of TEST_USERS) {
    console.log(`\nCreating user: ${userData.email}`);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { firstName: userData.firstName, lastName: userData.lastName },
      create: {
        email: userData.email,
        password: hashedPassword,
        role: 'USER',
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    await prisma.profile.upsert({
      where: { id: user.id },
      update: { ...userData.profile },
      create: {
        id: user.id,
        email: userData.email,
        ...userData.profile,
      },
    });

    await prisma.riasecAttempt.deleteMany({ where: { userId: user.id } });

    const attemptNorms = [];
    let latestAttemptId = null;

    for (let i = 0; i < userData.attempts.length; i++) {
      const att = userData.attempts[i];
      const raw = buildRawFromNorm(att.norm);
      const submittedAt = new Date(Date.now() - (userData.attempts.length - i) * 14 * 24 * 60 * 60 * 1000);
      const attempt = await prisma.riasecAttempt.create({
        data: {
          userId: user.id,
          questionVersion: 3,
          hollandCode: att.holland,
          scoresJson: JSON.stringify(raw),
          normalizedScoresJson: JSON.stringify(att.norm),
          summaryJson: JSON.stringify({
            dominantDimension: att.holland[0],
            hollandCode: att.holland,
            interpretation: `Strong ${att.holland} pattern`,
          }),
          gradeLevel: 12,
          academicYear: '2024-2025',
          semester: 'HK2',
          attemptLabel: `Lần ${i + 1}`,
          status: 'COMPLETED',
          startedAt: new Date(submittedAt.getTime() - 900000),
          submittedAt,
          completedAt: submittedAt,
          durationSeconds: 900,
        },
      });

      attemptNorms.push(att.norm);
      latestAttemptId = attempt.id;
      console.log(`  Attempt ${i + 1}: ${att.holland} (${JSON.stringify(att.norm)})`);
    }

    const latest = userData.attempts[userData.attempts.length - 1];
    const scoreHistory = [...attemptNorms].slice().reverse();
    const stableScores = buildStableScores(scoreHistory);
    const latestRaw = buildRawFromNorm(latest.norm);

    const growthData = attemptNorms.length >= 2
      ? Object.keys(latest.norm).map((d) => ({
          dimension: d,
          deltaFromPrevious: latest.norm[d] - attemptNorms[attemptNorms.length - 2][d],
          deltaFromBaseline: latest.norm[d] - attemptNorms[0][d],
        }))
      : [];

    const confidenceScore = buildConfidenceScore({
      attemptCount: attemptNorms.length,
      daysSinceLastAttempt: 0,
    });

    await prisma.userRiasecProfile.upsert({
      where: { userId: user.id },
      update: {
        latestAttemptId,
        latestHollandCode: latest.holland,
        latestScoresJson: JSON.stringify(latestRaw),
        normalizedScoresJson: JSON.stringify(latest.norm),
        stableScoresJson: JSON.stringify(stableScores),
        trendJson: JSON.stringify({}),
        growthJson: JSON.stringify(growthData),
        confidenceScore,
        lastAssessedAt: new Date(),
      },
      create: {
        userId: user.id,
        latestAttemptId,
        latestHollandCode: latest.holland,
        latestScoresJson: JSON.stringify(latestRaw),
        normalizedScoresJson: JSON.stringify(latest.norm),
        stableScoresJson: JSON.stringify(stableScores),
        trendJson: JSON.stringify({}),
        growthJson: JSON.stringify(growthData),
        confidenceScore,
        firstAssessedAt: new Date(Date.now() - userData.attempts.length * 7 * 24 * 60 * 60 * 1000),
        lastAssessedAt: new Date(),
      },
    });

    createdUsers.push({ user, userData });
    console.log(`  RIASEC profile created: ${latest.holland}, stable: ${JSON.stringify(stableScores)}`);
  }

  console.log('\n=== Running matching for all test users ===');
  for (const { user, userData } of createdUsers) {
    try {
      const result = await runMatchingForUser(user.id, { scope: 'ALL', limit: 10 });
      console.log(`  ${userData.email}: ${result.totalResults} results, top=${result.topResult?.program?.code}`);
    } catch (err) {
      console.error(`  ${userData.email}: matching failed — ${err.message}`);
    }
  }

  console.log('\n=== Adding feedback on matching results ===');
  const feedbackPatterns = [
    { rating: 5, isRelevant: true, comment: 'Rất phù hợp với định hướng của tôi.' },
    { rating: 5, isRelevant: true, comment: 'Đây đúng là nhóm ngành tôi muốn theo đuổi.' },
    { rating: 4, isRelevant: true, comment: 'Khá phù hợp, tôi sẽ giữ lại để tìm hiểu thêm.' },
    { rating: 2, isRelevant: false, comment: 'Không khớp nhiều với sở thích cá nhân.' },
    { rating: 1, isRelevant: false, comment: 'Ít liên quan đến mục tiêu của tôi.' },
  ];

  for (const { user, userData } of createdUsers) {
    const latestRun = await prisma.matchingRun.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { results: { orderBy: { rank: 'asc' }, take: feedbackPatterns.length } },
    });

    if (!latestRun || !latestRun.results.length) continue;

    for (let index = 0; index < Math.min(latestRun.results.length, feedbackPatterns.length); index += 1) {
      const result = latestRun.results[index];
      const pattern = feedbackPatterns[index];
      await prisma.matchResultFeedback.upsert({
        where: { matchResultId_userId: { matchResultId: result.id, userId: user.id } },
        update: {
          rating: pattern.rating,
          isRelevant: pattern.isRelevant,
          comment: `${pattern.comment} [${userData.fieldOfInterest || userData.profile.fieldOfInterest}]`,
        },
        create: {
          matchResultId: result.id,
          userId: user.id,
          rating: pattern.rating,
          isRelevant: pattern.isRelevant,
          comment: `${pattern.comment} [${userData.profile.fieldOfInterest}]`,
        },
      });
    }

    console.log(`  ${userData.email}: ${Math.min(latestRun.results.length, feedbackPatterns.length)} feedback entries added`);
  }

  console.log('\n=== Re-running matching to activate adaptive weights ===');
  for (const { user, userData } of createdUsers) {
    try {
      const result = await runMatchingForUser(user.id, { scope: 'ALL', limit: 10 });
      const adaptive = result.adaptiveLearning?.adapted ? 'adaptive=on' : 'adaptive=off';
      console.log(`  ${userData.email}: ${adaptive}, top=${result.topResult?.program?.code || result.topResult?.program?.name}`);
    } catch (err) {
      console.error(`  ${userData.email}: adaptive rerun failed — ${err.message}`);
    }
  }

  const userCount = await prisma.user.count({ where: { role: 'USER' } });
  const attemptCount = await prisma.riasecAttempt.count();
  const runCount = await prisma.matchingRun.count();
  const feedbackCount = await prisma.matchResultFeedback.count();

  console.log('\n=== Summary ===');
  console.log(`Users: ${userCount}`);
  console.log(`RIASEC Attempts: ${attemptCount}`);
  console.log(`Matching Runs: ${runCount}`);
  console.log(`Feedback Entries: ${feedbackCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
