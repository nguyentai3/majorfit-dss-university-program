const path = require('path');
const { prisma } = require('../db/prisma');

const GOLD_PATH = path.resolve(__dirname, '../../data/gold/goldProgramDataset.v2.json');
const DEFAULT_SKILL_VECTOR = {
    critical_thinking: 50,
    problem_solving: 50,
    programming_orientation: 50,
    teamwork: 50,
    communication: 50,
    leadership: 50,
    creativity: 50,
    detail_orientation: 50,
};

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function buildCurriculumText(curriculum = {}) {
    if (curriculum.curriculumText && String(curriculum.curriculumText).trim()) {
        return String(curriculum.curriculumText).trim();
    }

    const parts = [];
    if (Array.isArray(curriculum.objectives) && curriculum.objectives.length > 0) {
        parts.push(`Objectives:\n- ${curriculum.objectives.join('\n- ')}`);
    }
    if (Array.isArray(curriculum.courseList) && curriculum.courseList.length > 0) {
        parts.push(`Core Courses:\n- ${curriculum.courseList.join('\n- ')}`);
    }

    return parts.join('\n\n') || null;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const goldPrograms = require(GOLD_PATH);

    console.log(`Seeding ${goldPrograms.length} programs from gold dataset${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const existingPrograms = await prisma.program.findMany({ select: { id: true, code: true, slug: true } });
    const existingProgramsByCode = new Map(existingPrograms.map(p => [p.code, p]));

    const existingUnis = await prisma.university.findMany({ select: { id: true, code: true } });
    const uniMap = new Map(existingUnis.map(u => [u.code, u.id]));

    let stats = { uniCreated: 0, progCreated: 0, progUpdated: 0, currCreated: 0, profileCreated: 0, skipped: 0 };

    for (const g of goldPrograms) {
        const uniCode = g.university?.code;
        const uniName = g.university?.name;

        if (!uniCode || !uniName) {
            console.warn(`  SKIP ${g.code}: missing university data`);
            stats.skipped++;
            continue;
        }

        if (!uniMap.has(uniCode)) {
            if (dryRun) {
                console.log(`  [DRY] Would create university: ${uniCode} — ${uniName}`);
                uniMap.set(uniCode, 'dry-run-id');
            } else {
                const uni = await prisma.university.create({
                    data: {
                        code: uniCode,
                        name: uniName,
                        shortName: uniCode,
                        country: 'Vietnam',
                    },
                });
                uniMap.set(uniCode, uni.id);
                console.log(`  ✓ Created university: ${uniCode} — ${uniName}`);
                stats.uniCreated++;
            }
        }
        const universityId = uniMap.get(uniCode);

        const existing = existingProgramsByCode.get(g.code);
        const programSlug = existing?.slug || slugify(`${uniCode}-${g.name}`);

        const programData = {
            universityId,
            slug: programSlug,
            name: g.name,
            degreeLevel: g.degreeLevel || 'Bachelor',
            focusArea: g.focusArea || 'General',
            summary: g.summary || '',
            durationYears: 4,
            status: 'ACTIVE',
            keyCoursesJson: g.curriculum?.courseList ? JSON.stringify(g.curriculum.courseList) : null,
            courseSourceUrl: g.curriculum?.sourceUrl || null,
        };

        let programId;
        if (existing) {
            if (dryRun) {
                console.log(`  [DRY] Would update program: ${g.code}`);
            } else {
                await prisma.program.update({
                    where: { code: g.code },
                    data: programData,
                });
                stats.progUpdated++;
            }
            programId = existing.id;
        } else {
            if (dryRun) {
                console.log(`  [DRY] Would create program: ${g.code} — ${g.name} (slug: ${programSlug})`);
                programId = 'dry-run-id';
            } else {
                const newProg = await prisma.program.create({
                    data: {
                        code: g.code,
                        ...programData,
                    },
                });
                programId = newProg.id;
                existingProgramsByCode.set(g.code, { id: programId, code: g.code, slug: programSlug });
                console.log(`  ✓ Created program: ${g.code} — ${g.name}`);
                stats.progCreated++;
            }
        }

        if (dryRun) continue;

        const curriculumText = buildCurriculumText(g.curriculum);
        const hasCurriculumPayload =
            Boolean(curriculumText) ||
            (Array.isArray(g.curriculum?.objectives) && g.curriculum.objectives.length > 0) ||
            (Array.isArray(g.curriculum?.courseList) && g.curriculum.courseList.length > 0);

        if (hasCurriculumPayload) {
            const existingCurr = await prisma.programCurriculum.findUnique({
                where: { programId_version: { programId, version: 1 } },
            });

            const curriculumData = {
                programId,
                version: 1,
                sourceType: 'OFFICIAL_PUBLIC',
                sourceUrl: g.curriculum?.sourceUrl || null,
                title: `${g.name} — Curriculum`,
                curriculumText,
                extractedText: g.curriculum?.extractedText || curriculumText,
                objectivesJson: g.curriculum?.objectives ? JSON.stringify(g.curriculum.objectives) : null,
                courseListJson: g.curriculum?.courseList ? JSON.stringify(g.curriculum.courseList) : null,
            };

            if (!existingCurr) {
                await prisma.programCurriculum.create({
                    data: curriculumData,
                });
                stats.currCreated++;
            } else {
                await prisma.programCurriculum.update({
                    where: { id: existingCurr.id },
                    data: curriculumData,
                });
            }
        }

        if (g.profile?.riasecScores) {
            const existingProfile = await prisma.programProfile.findFirst({
                where: { programId, isPublished: true },
            });

            if (!existingProfile) {
                const skillVector = g.profile.skillVector || DEFAULT_SKILL_VECTOR;
                await prisma.programProfile.create({
                    data: {
                        programId,
                        sourceType: g.profile.sourceType || 'ONET_DERIVED',
                        riasecScoresJson: JSON.stringify(g.profile.riasecScores),
                        skillVectorJson: JSON.stringify(skillVector),
                        extractedSkillsJson: JSON.stringify(g.profile.topSkills || []),
                        aiSummary: g.profile.aiInterpretation?.notes || null,
                        reasoning: null,
                        confidenceScore: g.profile.confidenceScore || 75,
                        reviewStatus: 'PUBLISHED',
                        isPublished: true,
                        publishedAt: new Date(),
                    },
                });
                stats.profileCreated++;
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('SEED SUMMARY');
    console.log('='.repeat(50));
    console.log(`  Universities created : ${stats.uniCreated}`);
    console.log(`  Programs created     : ${stats.progCreated}`);
    console.log(`  Programs updated     : ${stats.progUpdated}`);
    console.log(`  Curriculums created  : ${stats.currCreated}`);
    console.log(`  Profiles created     : ${stats.profileCreated}`);
    console.log(`  Skipped              : ${stats.skipped}`);

    const totalDB = await prisma.program.count({ where: { status: 'ACTIVE' } });
    console.log(`\n  Total active programs in DB: ${totalDB}`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
