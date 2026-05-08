const { prisma } = require('../../db/prisma');
const { VERSION_SOURCES } = require('./defaultQuestionBank');
const {
    DEFAULT_ASSESSMENT_VERSION,
    QUESTION_BANK_STATUS,
    RESERVED_LEGACY_VERSIONS,
    REQUIRED_PER_DIMENSION,
    REQUIRED_QUESTION_COUNT,
    RIASEC_DIMENSIONS,
} = require('./questionBankConstants');

function createServiceError(message, statusCode = 400, payload = {}) {
    return Object.assign(new Error(message), { statusCode, payload });
}

function toStringOrNull(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const cleaned = String(value).trim();
    return cleaned || null;
}

function normalizeBank(row, stats = {}) {
    const activeQuestionCount = stats.activeQuestionCount ?? 0;
    const totalQuestionCount = stats.totalQuestionCount ?? 0;
    const dimensionCounts = stats.dimensionCounts ?? {};

    return {
        id: row.id,
        version: row.version,
        name: row.name,
        description: row.description,
        sourceLabel: row.sourceLabel,
        sourceUrl: row.sourceUrl,
        sourceCitation: row.sourceCitation,
        status: row.status,
        isDefault: row.isDefault,
        publishedAt: row.publishedAt?.toISOString?.() || row.publishedAt,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
        totalQuestionCount,
        activeQuestionCount,
        dimensionCounts,
        isPublishable:
            activeQuestionCount === REQUIRED_QUESTION_COUNT &&
            RIASEC_DIMENSIONS.every((dimension) => Number(dimensionCounts[dimension] || 0) === REQUIRED_PER_DIMENSION),
    };
}

async function ensureQuestionBankMetadata() {
    const source = VERSION_SOURCES[DEFAULT_ASSESSMENT_VERSION] || {};
    const existingDefault = await prisma.riasecQuestionBank.upsert({
        where: { version: DEFAULT_ASSESSMENT_VERSION },
        create: {
            version: DEFAULT_ASSESSMENT_VERSION,
            name: 'IIP RIASEC Markers 48 - Thesis Official',
            description: 'Validated 48-item RIASEC instrument used as the thesis assessment baseline.',
            sourceLabel: source.sourceLabel || 'IIP RIASEC Markers',
            sourceUrl: source.sourceUrl || null,
            sourceCitation: source.sourceCitation || null,
            status: QUESTION_BANK_STATUS.PUBLISHED,
            isDefault: true,
            publishedAt: new Date(),
        },
        update: {},
    });

    const defaultCount = await prisma.riasecQuestionBank.count({ where: { isDefault: true } });
    if (defaultCount === 0) {
        await prisma.riasecQuestionBank.update({
            where: { id: existingDefault.id },
            data: {
                status: QUESTION_BANK_STATUS.PUBLISHED,
                isDefault: true,
                publishedAt: existingDefault.publishedAt || new Date(),
            },
        });
    }
}

async function getQuestionBankStats(versions) {
    if (!versions.length) return {};

    const [totalGroups, activeGroups, dimensionGroups] = await Promise.all([
        prisma.riasecQuestion.groupBy({
            by: ['version'],
            where: { version: { in: versions } },
            _count: { id: true },
        }),
        prisma.riasecQuestion.groupBy({
            by: ['version'],
            where: { version: { in: versions }, active: true },
            _count: { id: true },
        }),
        prisma.riasecQuestion.groupBy({
            by: ['version', 'dimension'],
            where: { version: { in: versions }, active: true },
            _count: { id: true },
        }),
    ]);

    const stats = Object.fromEntries(
        versions.map((version) => [
            version,
            {
                totalQuestionCount: 0,
                activeQuestionCount: 0,
                dimensionCounts: Object.fromEntries(RIASEC_DIMENSIONS.map((dimension) => [dimension, 0])),
            },
        ]),
    );

    for (const item of totalGroups) {
        stats[item.version].totalQuestionCount = item._count.id;
    }
    for (const item of activeGroups) {
        stats[item.version].activeQuestionCount = item._count.id;
    }
    for (const item of dimensionGroups) {
        stats[item.version].dimensionCounts[item.dimension] = item._count.id;
    }

    return stats;
}

async function validateQuestionBankVersion(version) {
    const numericVersion = Number(version);
    const statsByVersion = await getQuestionBankStats([numericVersion]);
    const stats = statsByVersion[numericVersion] || {
        totalQuestionCount: 0,
        activeQuestionCount: 0,
        dimensionCounts: {},
    };
    const errors = [];

    if (stats.activeQuestionCount !== REQUIRED_QUESTION_COUNT) {
        errors.push(`Question bank must have exactly ${REQUIRED_QUESTION_COUNT} active questions.`);
    }

    for (const dimension of RIASEC_DIMENSIONS) {
        const count = Number(stats.dimensionCounts?.[dimension] || 0);
        if (count !== REQUIRED_PER_DIMENSION) {
            errors.push(`${dimension} dimension must have exactly ${REQUIRED_PER_DIMENSION} active questions; current count is ${count}.`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        stats,
    };
}

async function listQuestionBanks() {
    await ensureQuestionBankMetadata();

    const banks = await prisma.riasecQuestionBank.findMany({
        orderBy: [{ isDefault: 'desc' }, { status: 'asc' }, { version: 'asc' }],
    });
    const versions = banks.map((bank) => bank.version);
    const stats = await getQuestionBankStats(versions);

    return banks.map((bank) => normalizeBank(bank, stats[bank.version]));
}

async function getDefaultQuestionBankVersion() {
    await ensureQuestionBankMetadata();

    const defaultBank = await prisma.riasecQuestionBank.findFirst({
        where: { isDefault: true, status: QUESTION_BANK_STATUS.PUBLISHED },
        orderBy: { updatedAt: 'desc' },
    });

    return defaultBank?.version ?? DEFAULT_ASSESSMENT_VERSION;
}

async function getNextQuestionBankVersion() {
    const knownSourceVersion = Math.max(
        ...Object.keys(VERSION_SOURCES).map((version) => Number(version) || 0),
        ...RESERVED_LEGACY_VERSIONS,
    );
    const [latestBank, latestQuestion, latestAttempt] = await Promise.all([
        prisma.riasecQuestionBank.findFirst({
            orderBy: { version: 'desc' },
            select: { version: true },
        }),
        prisma.riasecQuestion.findFirst({
            orderBy: { version: 'desc' },
            select: { version: true },
        }),
        prisma.riasecAttempt.findFirst({
            orderBy: { questionVersion: 'desc' },
            select: { questionVersion: true },
        }),
    ]);

    return Math.max(
        latestBank?.version || 0,
        latestQuestion?.version || 0,
        latestAttempt?.questionVersion || 0,
        knownSourceVersion,
        DEFAULT_ASSESSMENT_VERSION,
    ) + 1;
}

async function createQuestionBank(payload) {
    await ensureQuestionBankMetadata();

    const requestedVersion = payload.version == null || payload.version === ''
        ? null
        : Number.parseInt(String(payload.version), 10);
    const version = Number.isFinite(requestedVersion) ? requestedVersion : await getNextQuestionBankVersion();

    if (version < 1) {
        throw createServiceError('Question bank version must be a positive integer.');
    }
    if (RESERVED_LEGACY_VERSIONS.includes(version) && version !== DEFAULT_ASSESSMENT_VERSION) {
        throw createServiceError('This version is reserved for a legacy question bank. Choose a new version.');
    }
    const historicalAttempts = await prisma.riasecAttempt.count({ where: { questionVersion: version } });
    if (historicalAttempts > 0) {
        throw createServiceError('This version is already used by historical assessment attempts. Choose a new version.');
    }

    const created = await prisma.riasecQuestionBank.create({
        data: {
            version,
            name: String(payload.name || `Custom RIASEC Bank v${version}`).trim(),
            description: toStringOrNull(payload.description),
            sourceLabel: toStringOrNull(payload.sourceLabel),
            sourceUrl: toStringOrNull(payload.sourceUrl),
            sourceCitation: toStringOrNull(payload.sourceCitation),
            status: QUESTION_BANK_STATUS.DRAFT,
            isDefault: false,
        },
    });

    return normalizeBank(created, (await getQuestionBankStats([version]))[version]);
}

async function updateQuestionBank(bankId, payload) {
    const data = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
        data.name = String(payload.name || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'description')) data.description = toStringOrNull(payload.description);
    if (Object.prototype.hasOwnProperty.call(payload, 'sourceLabel')) data.sourceLabel = toStringOrNull(payload.sourceLabel);
    if (Object.prototype.hasOwnProperty.call(payload, 'sourceUrl')) data.sourceUrl = toStringOrNull(payload.sourceUrl);
    if (Object.prototype.hasOwnProperty.call(payload, 'sourceCitation')) data.sourceCitation = toStringOrNull(payload.sourceCitation);

    const updated = await prisma.riasecQuestionBank.update({
        where: { id: bankId },
        data,
    });

    return normalizeBank(updated, (await getQuestionBankStats([updated.version]))[updated.version]);
}

async function cloneQuestionBank(bankId, payload = {}) {
    await ensureQuestionBankMetadata();

    const source = await prisma.riasecQuestionBank.findUnique({ where: { id: bankId } });
    if (!source) throw createServiceError('Question bank not found.', 404);

    const sourceQuestions = await prisma.riasecQuestion.findMany({
        where: { version: source.version },
        orderBy: [{ order: 'asc' }, { code: 'asc' }],
    });
    const version = await getNextQuestionBankVersion();

    const created = await prisma.$transaction(async (tx) => {
        const bank = await tx.riasecQuestionBank.create({
            data: {
                version,
                name: String(payload.name || `${source.name} - Draft Copy`).trim(),
                description: toStringOrNull(payload.description) ?? source.description,
                sourceLabel: toStringOrNull(payload.sourceLabel) ?? source.sourceLabel,
                sourceUrl: toStringOrNull(payload.sourceUrl) ?? source.sourceUrl,
                sourceCitation: toStringOrNull(payload.sourceCitation) ?? source.sourceCitation,
                status: QUESTION_BANK_STATUS.DRAFT,
                isDefault: false,
            },
        });

        if (sourceQuestions.length) {
            await tx.riasecQuestion.createMany({
                data: sourceQuestions.map((question) => ({
                    code: question.code,
                    prompt: question.prompt,
                    dimension: question.dimension,
                    order: question.order,
                    active: question.active,
                    version,
                    subscale: question.subscale,
                    sourceLabel: question.sourceLabel,
                    sourceUrl: question.sourceUrl,
                    sourceCitation: question.sourceCitation,
                })),
            });
        }

        return bank;
    });

    return normalizeBank(created, (await getQuestionBankStats([version]))[version]);
}

async function publishQuestionBank(bankId) {
    const bank = await prisma.riasecQuestionBank.findUnique({ where: { id: bankId } });
    if (!bank) throw createServiceError('Question bank not found.', 404);

    const validation = await validateQuestionBankVersion(bank.version);
    if (!validation.valid) {
        throw createServiceError('Question bank is not publishable.', 400, { validation });
    }

    const updated = await prisma.riasecQuestionBank.update({
        where: { id: bankId },
        data: {
            status: QUESTION_BANK_STATUS.PUBLISHED,
            publishedAt: bank.publishedAt || new Date(),
        },
    });

    return {
        bank: normalizeBank(updated, validation.stats),
        validation,
    };
}

async function setDefaultQuestionBank(bankId) {
    const published = await publishQuestionBank(bankId);

    const updated = await prisma.$transaction(async (tx) => {
        await tx.riasecQuestionBank.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
        });
        return tx.riasecQuestionBank.update({
            where: { id: bankId },
            data: { isDefault: true },
        });
    });

    return {
        bank: normalizeBank(updated, published.validation.stats),
        validation: published.validation,
    };
}

async function deleteQuestionBank(bankId) {
    const bank = await prisma.riasecQuestionBank.findUnique({ where: { id: bankId } });
    if (!bank) throw createServiceError('Question bank not found.', 404);
    if (bank.isDefault) throw createServiceError('Default question bank cannot be deleted.');
    if (bank.status !== QUESTION_BANK_STATUS.DRAFT) {
        throw createServiceError('Only draft question banks can be deleted.');
    }

    const attempts = await prisma.riasecAttempt.count({ where: { questionVersion: bank.version } });
    if (attempts > 0) {
        throw createServiceError('Question bank has assessment attempts and cannot be deleted.');
    }

    await prisma.$transaction([
        prisma.riasecQuestion.deleteMany({ where: { version: bank.version } }),
        prisma.riasecQuestionBank.delete({ where: { id: bankId } }),
    ]);

    return { success: true };
}

module.exports = {
    createQuestionBank,
    deleteQuestionBank,
    ensureQuestionBankMetadata,
    getDefaultQuestionBankVersion,
    listQuestionBanks,
    publishQuestionBank,
    setDefaultQuestionBank,
    updateQuestionBank,
    cloneQuestionBank,
    validateQuestionBankVersion,
};
