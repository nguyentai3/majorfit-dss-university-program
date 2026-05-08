const { prisma } = require('../db/prisma');
const occupations = require('../../data/onet/onetOccupations.json');

const BATCH_SIZE = 100;

async function main() {
    console.log(`Seeding ${occupations.length} O*NET occupations...`);

    let created = 0;
    let updated = 0;

    for (let i = 0; i < occupations.length; i += BATCH_SIZE) {
        const batch = occupations.slice(i, i + BATCH_SIZE);

        await Promise.all(
            batch.map(async (occ) => {
                const data = {
                    title: occ.title,
                    description: occ.description || null,
                    hollandCode: occ.hollandCode || null,
                    riasecScoresJson: JSON.stringify(occ.riasec),
                    topSkillsJson: JSON.stringify(occ.topSkills),
                    topKnowledgeJson: JSON.stringify(occ.topKnowledge),
                    hotTechJson: JSON.stringify(occ.hotTechnologies || []),
                    dataVersion: '30.2',
                };

                const existing = await prisma.onetOccupation.findUnique({
                    where: { onetCode: occ.onetCode },
                    select: { id: true },
                });

                if (existing) {
                    await prisma.onetOccupation.update({
                        where: { onetCode: occ.onetCode },
                        data,
                    });
                    updated++;
                } else {
                    await prisma.onetOccupation.create({
                        data: { onetCode: occ.onetCode, ...data },
                    });
                    created++;
                }
            }),
        );

        process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, occupations.length)}/${occupations.length}`);
    }

    const total = await prisma.onetOccupation.count();
    console.log(`\nDone! Created: ${created}, Updated: ${updated}, Total in DB: ${total}`);
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
