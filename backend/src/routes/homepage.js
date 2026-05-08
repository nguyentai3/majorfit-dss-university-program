const express = require('express');
const { prisma } = require('../db/prisma');
const {
    PROGRAM_INCLUDE,
    buildProgramCard,
    PUBLIC_PROGRAM_VISIBILITY_WHERE,
} = require('../services/programs/programCatalogService');

const homepageRouter = express.Router();

homepageRouter.get('/homepage', async (_req, res, next) => {
    try {
        const publicProgramWhere = {
            status: 'ACTIVE',
            ...PUBLIC_PROGRAM_VISIBILITY_WHERE,
        };
        const publicUniversityWhere = {
            programs: { some: publicProgramWhere },
        };
        const [
            universityCount,
            programCount,
            userCount,
            questionCount,
            featuredUniversitiesRaw,
            featuredProgramsRaw,
        ] = await Promise.all([
            prisma.university.count({ where: publicUniversityWhere }),
            prisma.program.count({ where: publicProgramWhere }),
            prisma.user.count(),
            prisma.riasecQuestion.count({ where: { active: true } }),
            prisma.university.findMany({
                where: { featured: true, ...publicUniversityWhere },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    shortName: true,
                    city: true,
                    overview: true,
                    website: true,
                    programs: {
                        where: publicProgramWhere,
                        select: { id: true },
                    },
                },
                orderBy: { name: 'asc' },
                take: 10,
            }),
            prisma.program.findMany({
                where: { featured: true, ...publicProgramWhere },
                include: PROGRAM_INCLUDE,
                orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
                take: 12,
            }),
        ]);

        const featuredUniversities = featuredUniversitiesRaw.map((u) => ({
            id: u.id,
            code: u.code,
            name: u.name,
            shortName: u.shortName,
            city: u.city,
            overview: u.overview,
            website: u.website,
            programCount: u.programs.length,
        }));

        const featuredPrograms = featuredProgramsRaw.map((program) => {
            const card = buildProgramCard(program);
            return {
                id: card.id,
                code: card.code,
                name: card.name,
                slug: card.slug,
                focusArea: card.focusArea,
                degreeLevel: card.degreeLevel,
                durationYears: card.durationYears,
                summary: card.summary,
                university: card.university,
                hollandCode: card.latestProfile?.hollandCode || '',
                riasecScores: card.latestProfile?.riasecScores || null,
                topSkills: card.latestProfile?.topSkills || [],
            };
        });

        res.json({
            stats: {
                universities: universityCount,
                programs: programCount,
                users: userCount,
                questions: questionCount,
            },
            featuredUniversities,
            featuredPrograms,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = { homepageRouter };
