const { prisma } = require('../db/prisma');
const { ensureDefaultRiasecQuestions } = require('../services/riasec/questionService');

async function main() {
    await ensureDefaultRiasecQuestions();
    const total = await prisma.riasecQuestion.count();
    console.log(`RIASEC question bank ready: ${total} questions`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
