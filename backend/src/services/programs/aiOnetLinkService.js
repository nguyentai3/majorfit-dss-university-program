
const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const { buildProfileFromLinks, computeWeightedRiasec } = require('./onetDerivedProfileService');
const { normalizeOnetRiasec } = require('../riasec/onetCareerMatchService');

function normalizeTitle(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

async function createOnetLinksFromAiSuggestions(programId, parsedAiOutput) {
    const { suggestedOccupations } = parsedAiOutput;
    const created = [];
    const updated = [];
    const deleted = [];
    const skipped = [];
    const desiredByOccupationId = new Map();

    for (const suggestion of suggestedOccupations) {
        const occupation = await findOccupation(suggestion.onetCode, suggestion.title);

        if (!occupation) {
            console.warn(`[aiOnetLink] Không tìm thấy occupation: ${suggestion.title} (${suggestion.onetCode})`);
            skipped.push({ onetCode: suggestion.onetCode, title: suggestion.title, reason: 'not_found' });
            continue;
        }

        const linkData = {
            occupationId: occupation.id,
            onetCode: occupation.onetCode,
            title: occupation.title,
            relevance: suggestion.numericWeight,
            isPrimary: suggestion.relevanceLevel === 'primary',
            note: (suggestion.evidence[0] || '').slice(0, 255),
        };

        const currentDesired = desiredByOccupationId.get(occupation.id);
        if (!currentDesired) {
            desiredByOccupationId.set(occupation.id, linkData);
            continue;
        }

        const shouldReplaceNote = linkData.isPrimary || linkData.relevance > currentDesired.relevance;
        desiredByOccupationId.set(occupation.id, {
            ...currentDesired,
            relevance: Math.max(currentDesired.relevance, linkData.relevance),
            isPrimary: currentDesired.isPrimary || linkData.isPrimary,
            note: shouldReplaceNote ? linkData.note : currentDesired.note,
        });
    }

    if (desiredByOccupationId.size === 0) {
        return { created, updated, deleted, skipped, skippedSync: true };
    }

    const desiredLinks = Array.from(desiredByOccupationId.values());
    const primaryLink = desiredLinks
        .slice()
        .sort((left, right) => {
            if (Number(right.isPrimary) !== Number(left.isPrimary)) {
                return Number(right.isPrimary) - Number(left.isPrimary);
            }
            if (right.relevance !== left.relevance) {
                return right.relevance - left.relevance;
            }
            return left.title.localeCompare(right.title);
        })[0];

    for (const link of desiredLinks) {
        link.isPrimary = link.occupationId === primaryLink.occupationId;
    }

    try {
        await prisma.$transaction(async (tx) => {
            const existingLinks = await tx.programOnetLink.findMany({
                where: { programId },
                include: { occupation: true },
            });

            const existingByOccupationId = new Map(existingLinks.map((link) => [link.occupationId, link]));
            const desiredOccupationIds = new Set(desiredLinks.map((link) => link.occupationId));

            const staleLinks = existingLinks.filter((link) => !desiredOccupationIds.has(link.occupationId));
            if (staleLinks.length > 0) {
                await tx.programOnetLink.deleteMany({
                    where: { id: { in: staleLinks.map((link) => link.id) } },
                });
                deleted.push(
                    ...staleLinks.map((link) => ({
                        onetCode: link.occupation.onetCode,
                        title: link.occupation.title,
                        relevance: link.relevance,
                    })),
                );
            }

            for (const desired of desiredLinks) {
                const existing = existingByOccupationId.get(desired.occupationId);
                const data = {
                    relevance: desired.relevance,
                    isPrimary: desired.isPrimary,
                    note: desired.note,
                };

                if (existing) {
                    await tx.programOnetLink.update({
                        where: { id: existing.id },
                        data,
                    });
                    updated.push({
                        onetCode: desired.onetCode,
                        title: desired.title,
                        relevance: desired.relevance,
                        isPrimary: desired.isPrimary,
                    });
                } else {
                    await tx.programOnetLink.create({
                        data: {
                            programId,
                            occupationId: desired.occupationId,
                            ...data,
                        },
                    });
                    created.push({
                        onetCode: desired.onetCode,
                        title: desired.title,
                        relevance: desired.relevance,
                        isPrimary: desired.isPrimary,
                    });
                }
            }
        });
    } catch (err) {
        console.warn(`[aiOnetLink] DB sync error for program ${programId}: ${err.message}`);
        for (const desired of desiredLinks) {
            skipped.push({
                onetCode: desired.onetCode,
                title: desired.title,
                reason: 'db_error',
                error: err.message,
            });
        }
        return { created: [], updated: [], deleted: [], skipped };
    }

    return { created, updated, deleted, skipped };
}

function computeProfileFromAiSuggestions(parsedAiOutput, onetOccupationsData) {
    const { suggestedOccupations } = parsedAiOutput;

    const occMap = new Map();
    for (const occ of onetOccupationsData) {
        occMap.set(occ.onetCode, occ);
    }

    const mockLinks = [];
    const matchedOccupations = [];
    const skippedOccupations = [];

    for (const suggestion of suggestedOccupations) {
        const byCode = occMap.get(suggestion.onetCode) || null;
        const byExactTitle = onetOccupationsData.find(
            (o) => normalizeTitle(o.title) === normalizeTitle(suggestion.title),
        ) || null;
        const byContainsTitle =
            byExactTitle ||
            onetOccupationsData.find((o) =>
                normalizeTitle(o.title).includes(normalizeTitle(suggestion.title)),
            ) ||
            null;

        const occ =
            byCode && byContainsTitle
                ? normalizeTitle(byCode.title) === normalizeTitle(suggestion.title)
                    ? byCode
                    : byContainsTitle
                : byCode || byContainsTitle;

        if (!occ) {
            skippedOccupations.push({ onetCode: suggestion.onetCode, title: suggestion.title });
            continue;
        }

        const riasec = occ.riasec || safeJsonParse(occ.riasecScoresJson, {});
        mockLinks.push({
            relevance: suggestion.numericWeight,
            isPrimary: suggestion.relevanceLevel === 'primary',
            occupation: {
                onetCode: occ.onetCode,
                title: occ.title,
                hollandCode: occ.hollandCode || '',
                riasecScoresJson: JSON.stringify(riasec),
            },
        });
        matchedOccupations.push({ onetCode: occ.onetCode, title: occ.title, relevance: suggestion.numericWeight });
    }

    if (mockLinks.length === 0) return null;

    const profile = buildProfileFromLinks(mockLinks);
    if (!profile) return null;

    return {
        ...profile,
        sourceType: 'AI_CURRICULUM_INTERPRETATION',
        matchedOccupations,
        skippedOccupations,
    };
}

async function findOccupation(onetCode, title) {
    const normalizedTitle = normalizeTitle(title);

    let byCode = null;
    if (onetCode) {
        byCode = await prisma.onetOccupation.findFirst({ where: { onetCode } });
    }

    let byTitle = null;
    if (title) {
        byTitle = await prisma.onetOccupation.findFirst({ where: { title } });
    }

    let byContains = null;
    if (title) {
        const normalized = title.trim();
        byContains = await prisma.onetOccupation.findFirst({
            where: { title: { contains: normalized } },
        });
    }

    if (byCode && normalizedTitle) {
        if (normalizeTitle(byCode.title) === normalizedTitle) {
            return byCode;
        }
        if (byTitle && normalizeTitle(byTitle.title) === normalizedTitle) {
            return byTitle;
        }
        if (byContains && normalizeTitle(byContains.title).includes(normalizedTitle)) {
            return byContains;
        }
        return byCode;
    }

    return byCode || byTitle || byContains || null;
}

module.exports = {
    createOnetLinksFromAiSuggestions,
    computeProfileFromAiSuggestions,
};
