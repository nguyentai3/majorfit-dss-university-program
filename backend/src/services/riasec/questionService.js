const { prisma } = require('../../db/prisma');
const {
    IIP_RIASEC_QUESTIONS,
    RIASEC_SCALE_OPTIONS,
    VERSION_SOURCES,
} = require('./defaultQuestionBank');
const { DEFAULT_ASSESSMENT_VERSION } = require('./questionBankConstants');
const { ensureQuestionBankMetadata, getDefaultQuestionBankVersion } = require('./questionBankService');

function mapQuestions(questions, version) {
    const src = VERSION_SOURCES[version] || {};
    return questions.map((q) => ({
        code: q.code,
        prompt: q.prompt,
        dimension: q.dimension,
        order: q.order,
        active: true,
        version,
        subscale: q.subscale || null,
        sourceLabel: src.sourceLabel || null,
        sourceUrl: src.sourceUrl || null,
        sourceCitation: src.sourceCitation || null,
    }));
}

async function ensureDefaultRiasecQuestions() {
    const count = await prisma.riasecQuestion.count({ where: { version: DEFAULT_ASSESSMENT_VERSION } });
    if (count === 0) {
        await prisma.riasecQuestion.createMany({
            data: mapQuestions(IIP_RIASEC_QUESTIONS, DEFAULT_ASSESSMENT_VERSION),
            skipDuplicates: true,
        });
    }
    await ensureQuestionBankMetadata();
}

async function getCurrentRiasecVersion() {
    await ensureDefaultRiasecQuestions();

    const defaultVersion = await getDefaultQuestionBankVersion();
    const hasDefault = await prisma.riasecQuestion.count({ where: { active: true, version: defaultVersion } });

    if (hasDefault > 0) return defaultVersion;

    const latest = await prisma.riasecQuestion.findFirst({
        where: { active: true },
        orderBy: [{ version: 'desc' }, { order: 'asc' }],
        select: { version: true },
    });

    return latest?.version ?? 2;
}

function mapRiasecQuestion(question) {
    return {
        id: question.id,
        code: question.code,
        prompt: question.prompt,
        question: question.prompt,
        dimension: question.dimension,
        category: question.dimension,
        order: question.order,
        active: question.active,
        version: question.version,
    };
}

async function listActiveRiasecQuestions(version = null) {
    const resolvedVersion = version ?? (await getCurrentRiasecVersion());

    const questions = await prisma.riasecQuestion.findMany({
        where: {
            active: true,
            version: resolvedVersion,
        },
        orderBy: [{ order: 'asc' }, { code: 'asc' }],
    });

    return {
        version: resolvedVersion,
        questions: questions.map(mapRiasecQuestion),
        scale: RIASEC_SCALE_OPTIONS,
    };
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const IIP_VERSION = 2;

async function listIip48Questions() {
    await ensureDefaultRiasecQuestions();
    const defaultVersion = await getDefaultQuestionBankVersion();

    const questions = await prisma.riasecQuestion.findMany({
        where: { active: true, version: defaultVersion },
        orderBy: [{ order: 'asc' }, { code: 'asc' }],
    });

    const shuffled = shuffleArray(questions.slice());

    return {
        version: defaultVersion,
        mode: defaultVersion === IIP_VERSION ? 'iip48' : 'question_bank_48',
        questions: shuffled.map(mapRiasecQuestion),
        scale: RIASEC_SCALE_OPTIONS,
    };
}

async function listAvailableVersions() {
    await ensureDefaultRiasecQuestions();

    const versions = await prisma.riasecQuestion.groupBy({
        by: ['version'],
        where: { active: true },
        _count: { id: true },
        orderBy: { version: 'asc' },
    });

    const VERSION_LABELS = {
        1: '[DEPRECATED] IT-Contextualized — no validated source (30 items)',
        2: 'IIP RIASEC Markers — Liao, Armstrong & Rounds 2008 (48 items)',
        3: '[INACTIVE] O*NET Interest Profiler Short Form — U.S. DOL (60 items)',
        4: '[INACTIVE] ORVIS — Pozzebon, Visser, Ashton, Lee & Goldberg 2010 (92 items)',
    };

    return versions.map((v) => ({
        version: v.version,
        questionCount: v._count.id,
        label: VERSION_LABELS[v.version] || `Version ${v.version} (${v._count.id} items)`,
    }));
}

module.exports = {
    DEFAULT_ASSESSMENT_VERSION,
    ensureDefaultRiasecQuestions,
    getCurrentRiasecVersion,
    listActiveRiasecQuestions,
    listIip48Questions,
    listAvailableVersions,
    mapRiasecQuestion,
    RIASEC_SCALE_OPTIONS,
};
