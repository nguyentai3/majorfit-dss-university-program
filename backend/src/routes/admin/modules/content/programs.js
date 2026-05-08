const { Router } = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { prisma } = require('../../../../db/prisma');
const { extractPdfText } = require('../../../../services/documents/pdfTextService');
const {
    listQuerySchema,
    normalizeArrayInput,
    normalizeNullableString,
    programCreateSchema,
    programCurriculumSchema,
    programProfileUpdateSchema,
    programUpdateSchema,
    toNullableInteger,
} = require('../shared');
const {
    buildProgramCard,
    mapAnalysisRun,
    mapCurriculum,
    mapProgramProfile,
    normalizeRiasecScores,
    slugify,
} = require('../../../../services/programs/programCatalogService');
const { normalizeEvidenceMap } = require('../../../../services/programs/programProfileUtils');
const { autoTagDomain } = require('../../../../services/programs/autoDomainTagger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const programsAdminRouter = Router();

programsAdminRouter.get('/programs', async (req, res, next) => {
    try {
        const query = listQuerySchema.parse(req.query);
        const where = {};

        if (query.q) {
            where.OR = [
                { name: { contains: query.q } },
                { department: { contains: query.q } },
                { focusArea: { contains: query.q } },
                { code: { contains: query.q } },
                { university: { is: { name: { contains: query.q } } } },
                { university: { is: { shortName: { contains: query.q } } } },
            ];
        }

        if (query.universityId) {
            where.universityId = query.universityId;
        }

        if (query.focusArea) {
            where.focusArea = query.focusArea;
        }

        if (query.statusFilter) {
            if (query.statusFilter === 'MISSING_CURRICULUM') {
                where.curriculums = { none: {} };
            } else if (query.statusFilter === 'MISSING_PROFILE') {
                where.profiles = { none: { isPublished: true } };
            } else if (query.statusFilter === 'DRAFT') {
                where.status = 'DRAFT';
            } else if (query.statusFilter === 'PUBLISHED') {
                where.profiles = { some: { isPublished: true } };
            }
        }

        const [items, total] = await Promise.all([
            prisma.program.findMany({
                where,
                orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
                take: query.limit,
                skip: query.offset,
                include: {
                    university: true,
                    curriculums: { orderBy: { version: 'desc' }, take: 1 },
                    profiles: { orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }], take: 1 },
                    onetLinks: { orderBy: { relevance: 'desc' }, take: 5, include: { occupation: { select: { onetCode: true, title: true, hollandCode: true, riasecScoresJson: true } } } },
                    _count: { select: { curriculums: true, profiles: true, analysisRuns: true } },
                },
            }),
            prisma.program.count({ where }),
        ]);

        res.json({ items: items.map(buildProgramCard), total });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.get('/programs/:programId/detail', async (req, res, next) => {
    try {
        const program = await prisma.program.findUnique({
            where: { id: req.params.programId },
            include: {
                university: true,
                curriculums: { orderBy: { version: 'desc' } },
                profiles: { orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }] },
                onetLinks: { orderBy: { relevance: 'desc' }, take: 5, include: { occupation: { select: { onetCode: true, title: true, hollandCode: true, riasecScoresJson: true } } } },
                analysisRuns: { orderBy: { createdAt: 'desc' } },
            },
        });

        if (!program) {
            res.status(404).json({ error: 'Program not found' });
            return;
        }

        res.json({
            item: {
                ...buildProgramCard(program),
                curriculums: program.curriculums.map(mapCurriculum),
                profiles: program.profiles.map(mapProgramProfile),
                analysisRuns: program.analysisRuns.map(mapAnalysisRun),
            },
        });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.delete('/programs/:programId/analysis-runs/failed', async (req, res, next) => {
    try {
        const program = await prisma.program.findUnique({
            where: { id: req.params.programId },
            select: { id: true },
        });
        if (!program) {
            res.status(404).json({ error: 'Program not found' });
            return;
        }

        const result = await prisma.programAnalysisRun.deleteMany({
            where: {
                programId: req.params.programId,
                status: 'FAILED',
                generatedProfileId: null,
            },
        });

        res.json({ success: true, deletedCount: result.count });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.delete('/programs/:programId/analysis-runs/:runId', async (req, res, next) => {
    try {
        const run = await prisma.programAnalysisRun.findFirst({
            where: {
                id: req.params.runId,
                programId: req.params.programId,
            },
        });

        if (!run) {
            res.status(404).json({ error: 'Analysis run not found' });
            return;
        }
        if (run.status !== 'FAILED' || run.generatedProfileId) {
            res.status(400).json({ error: 'Only failed runs without generated profiles can be deleted.' });
            return;
        }

        await prisma.programAnalysisRun.delete({ where: { id: run.id } });
        res.json({ success: true, deletedCount: 1 });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs', async (req, res, next) => {
    try {
        const body = programCreateSchema.parse(req.body ?? {});
        const code = String(body.code || '').trim().toUpperCase();
        const slug = String(body.slug || `${body.code}-${slugify(body.name)}`).trim().toLowerCase();

        const existing = await prisma.program.findFirst({
            where: {
                OR: [{ code }, { slug }],
            },
            include: { university: true },
        });

        if (existing) {
            if (existing.status === 'DRAFT') {
                const updated = await prisma.program.update({
                    where: { id: existing.id },
                    data: {
                        universityId: body.universityId,
                        code,
                        slug,
                        name: String(body.name || '').trim(),
                        degreeLevel: normalizeNullableString(body.degreeLevel),
                        department: normalizeNullableString(body.department),
                        focusArea: normalizeNullableString(body.focusArea),
                        summary: normalizeNullableString(body.summary),
                        sourceUrl: normalizeNullableString(body.sourceUrl),
                        durationYears: toNullableInteger(body.durationYears),
                        keyCoursesJson: body.keyCourses ? JSON.stringify(Array.isArray(body.keyCourses) ? body.keyCourses : []) : null,
                        courseSourceUrl: normalizeNullableString(body.courseSourceUrl),
                    },
                    include: { university: true },
                });
                res.json({ success: true, resumed: true, item: buildProgramCard({ ...updated, curriculums: [], profiles: [], _count: {} }) });
                return;
            }
            const dupField = existing.code === code ? 'code' : 'slug';
            res.status(409).json({ error: `Program with ${dupField} "${dupField === 'code' ? code : slug}" already exists` });
            return;
        }

        const suppliedTags = Array.isArray(body.domainTags) ? body.domainTags : null;
        const derivedTags = suppliedTags && suppliedTags.length > 0
            ? suppliedTags
            : autoTagDomain({
                name: body.name,
                summary: body.summary,
                keyCourses: body.keyCourses,
            });

        const created = await prisma.program.create({
            data: {
                universityId: body.universityId,
                code,
                slug,
                name: String(body.name || '').trim(),
                degreeLevel: normalizeNullableString(body.degreeLevel),
                department: normalizeNullableString(body.department),
                focusArea: normalizeNullableString(body.focusArea),
                summary: normalizeNullableString(body.summary),
                sourceUrl: normalizeNullableString(body.sourceUrl),
                durationYears: toNullableInteger(body.durationYears),
                keyCoursesJson: body.keyCourses ? JSON.stringify(Array.isArray(body.keyCourses) ? body.keyCourses : []) : null,
                courseSourceUrl: normalizeNullableString(body.courseSourceUrl),
                domainTagsJson: derivedTags.length > 0 ? JSON.stringify(derivedTags) : null,
                status: normalizeNullableString(body.status) || 'ACTIVE',
                featured: body.featured ?? false,
            },
            include: { university: true },
        });

        res.json({ success: true, item: buildProgramCard({ ...created, curriculums: [], profiles: [], _count: {} }) });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.patch('/programs/:programId', async (req, res, next) => {
    try {
        const body = programUpdateSchema.parse(req.body ?? {});
        const data = {};

        if (Object.prototype.hasOwnProperty.call(body, 'universityId')) data.universityId = body.universityId;
        if (Object.prototype.hasOwnProperty.call(body, 'code')) data.code = String(body.code || '').trim().toUpperCase();
        if (Object.prototype.hasOwnProperty.call(body, 'slug')) data.slug = String(body.slug || '').trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(body, 'name')) data.name = String(body.name || '').trim();
        if (Object.prototype.hasOwnProperty.call(body, 'degreeLevel')) data.degreeLevel = normalizeNullableString(body.degreeLevel);
        if (Object.prototype.hasOwnProperty.call(body, 'department')) data.department = normalizeNullableString(body.department);
        if (Object.prototype.hasOwnProperty.call(body, 'focusArea')) data.focusArea = normalizeNullableString(body.focusArea);
        if (Object.prototype.hasOwnProperty.call(body, 'summary')) data.summary = normalizeNullableString(body.summary);
        if (Object.prototype.hasOwnProperty.call(body, 'sourceUrl')) data.sourceUrl = normalizeNullableString(body.sourceUrl);
        if (Object.prototype.hasOwnProperty.call(body, 'durationYears')) data.durationYears = toNullableInteger(body.durationYears);
        if (Object.prototype.hasOwnProperty.call(body, 'keyCourses')) data.keyCoursesJson = body.keyCourses ? JSON.stringify(Array.isArray(body.keyCourses) ? body.keyCourses : []) : null;
        if (Object.prototype.hasOwnProperty.call(body, 'courseSourceUrl')) data.courseSourceUrl = normalizeNullableString(body.courseSourceUrl);
        if (Object.prototype.hasOwnProperty.call(body, 'status')) data.status = normalizeNullableString(body.status);
        if (Object.prototype.hasOwnProperty.call(body, 'featured')) data.featured = Boolean(body.featured);

        const updated = await prisma.program.update({
            where: { id: req.params.programId },
            data,
            include: {
                university: true,
                curriculums: { orderBy: { version: 'desc' }, take: 1 },
                profiles: { orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }], take: 1 },
                _count: { select: { curriculums: true, profiles: true, analysisRuns: true } },
            },
        });

        res.json({ success: true, item: buildProgramCard(updated) });
    } catch (error) {
        next(error);
    }
});

const { runAiAnalysis } = require('../../../../services/ai/client');
const { buildCurriculumInterpretationPrompt } = require('../../../../services/ai/prompts/curriculumInterpretationPrompt');
const { parseCurriculumInterpretationResponse } = require('../../../../services/ai/schemas/curriculumInterpretationResponse');
const { preprocessCurriculum } = require('../../../../modules/programs/analysis/curriculumPreprocessor');
const { computeTokenBudget } = require('../../../../services/ai/tokenBudget');
const { createOnetLinksFromAiSuggestions, computeProfileFromAiSuggestions } = require('../../../../services/programs/aiOnetLinkService');
const { estimateProfileForNewProgram } = require('../../../../services/programs/estimatedProfileService');
const { retrieveCandidateOccupations } = require('../../../../services/ai/onetRetrievalService');

function normalizeSocCode(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    if (/^\d{2}-\d{4}\.\d{2}$/.test(text)) return text;
    if (/^\d{2}-\d{4}$/.test(text)) return `${text}.00`;
    return null;
}

async function loadCipHintsByOnetCode(onetCodes) {
    const normalized = [...new Set(onetCodes.map(normalizeSocCode).filter(Boolean))];
    if (!normalized.length) return {};

    const latest = await prisma.cipSocCrosswalkSource.findFirst({
        orderBy: { syncedAt: 'desc' },
        select: { id: true },
    });
    if (!latest) return {};

    const rows = await prisma.cipSocCrosswalk.findMany({
        where: { sourceId: latest.id, socCode: { in: normalized } },
        select: { socCode: true, cipCode: true },
    });
    const grouped = {};
    for (const r of rows) {
        const soc = normalizeSocCode(r.socCode);
        if (!soc) continue;
        if (!grouped[soc]) grouped[soc] = [];
        if (!grouped[soc].includes(r.cipCode)) grouped[soc].push(r.cipCode);
    }
    return grouped;
}

programsAdminRouter.post('/programs/:programId/ai-analyze', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const { mode = 'suggest', provider, model } = req.body || {};

        const program = await prisma.program.findUnique({
            where: { id: programId },
            include: {
                university: true,
                curriculums: { orderBy: { version: 'desc' }, take: 1 },
            },
        });
        if (!program) return res.status(404).json({ error: 'Program not found' });

        const curriculum = program.curriculums[0];
        if (!curriculum) return res.status(400).json({ error: 'No curriculum uploaded yet. Please save curriculum text first.' });

        const currText = curriculum.curriculumText || curriculum.extractedText || '';
        const courseList = curriculum.courseListJson ? JSON.parse(curriculum.courseListJson) : [];
        const objectives = curriculum.objectivesJson ? JSON.parse(curriculum.objectivesJson) : [];

        if (!currText && courseList.length === 0) {
            return res.status(400).json({ error: 'Curriculum has no text content. Please paste or upload curriculum first.' });
        }

        const preprocessed = preprocessCurriculum(currText, courseList, objectives);

        const truncatedText = preprocessed.combinedText.slice(0, 15000);

        let dynamicCandidates = null;
        if (process.env.USE_DYNAMIC_POOL !== 'false') {
            const retrieved = retrieveCandidateOccupations({
                curriculumText: truncatedText,
                programName: program.name,
                focusArea: program.focusArea || '',
                topK: 20,
            });
            if (retrieved.length > 0) {
                dynamicCandidates = retrieved.map(o => ({ code: o.code, title: o.title }));
            }
        }

        const candidateCodes = [
            ...(dynamicCandidates || []).map((x) => x.code),
        ];
        const cipHintsByOnetCode = await loadCipHintsByOnetCode(candidateCodes);

        const prompt = buildCurriculumInterpretationPrompt({
            programName: program.name,
            universityName: program.university?.name || '',
            degreeLevel: program.degreeLevel || 'Bachelor',
            focusArea: program.focusArea || '',
            curriculumText: truncatedText,
            dynamicCandidates,
            cipHintsByOnetCode,
        });

        const budget = computeTokenBudget({
            systemPrompt: prompt.systemPrompt,
            userPromptBase: prompt.userPrompt,
            curriculumText: '',
            model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        });

        const aiResult = await runAiAnalysis({
            provider,
            model,
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            temperature: 0.2,
        });

        let parsed;
        try {
            let responseText = aiResult.text;
            const trimmed = responseText.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const arr = JSON.parse(trimmed);
                    if (Array.isArray(arr) && arr.length > 0) responseText = JSON.stringify(arr[0]);
                } catch (_) {}
            }
            parsed = parseCurriculumInterpretationResponse(responseText);
        } catch (parseErr) {
            return res.status(422).json({
                error: 'AI response could not be parsed',
                detail: parseErr.message,
                rawResponse: (aiResult.text || '').slice(0, 500),
            });
        }

        let linkResult = null;
        if (mode === 'apply') {
            linkResult = await createOnetLinksFromAiSuggestions(programId, parsed);

            if (program.status === 'DRAFT') {
                await prisma.program.update({ where: { id: programId }, data: { status: 'ACTIVE' } });
            }
        }

        let previewProfile = null;
        const allOccupations = await prisma.onetOccupation.findMany({
            where: {
                onetCode: { in: parsed.suggestedOccupations.map(o => o.onetCode) },
            },
        });
        if (allOccupations.length > 0) {
            const occData = allOccupations.map(occ => ({
                onetCode: occ.onetCode,
                title: occ.title,
                hollandCode: occ.hollandCode,
                riasecScoresJson: occ.riasecScoresJson,
            }));
            previewProfile = computeProfileFromAiSuggestions(parsed, occData);
        }

        await prisma.programAnalysisRun.create({
            data: {
                programId,
                promptVersion: prompt.promptVersion || 'v2-curriculum',
                responseVersion: prompt.responseVersion || 'v2',
                systemPrompt: prompt.systemPrompt,
                promptText: prompt.userPrompt.slice(0, 30000),
                aiResponseText: (aiResult.text || '').slice(0, 30000),
                parsedResultJson: JSON.stringify(parsed),
                provider: aiResult.usedProvider || '',
                model: aiResult.usedModel || '',
                status: 'SUCCESS',
            },
        });

        res.json({
            success: true,
            interpretation: {
                focusAreas: parsed.focusAreas,
                careerOutcomes: parsed.careerOutcomes,
                suggestedOccupations: parsed.suggestedOccupations,
                notes: parsed.notes,
            },
            previewProfile: previewProfile ? {
                riasecScores: previewProfile.riasecScores,
                hollandCode: previewProfile.hollandCode,
                confidence: previewProfile.confidence,
                linkedOccupations: previewProfile.linkedOccupations,
            } : null,
            linkResult,
            preprocessor: preprocessed.quality,
            provider: aiResult.usedProvider,
            model: aiResult.usedModel,
            tokensUsed: aiResult.usage?.total_tokens,
        });
    } catch (error) {
        const msg = error?.message || '';
        if (msg.includes('AI_DAILY_QUOTA_EXHAUSTED') || msg.includes('quota')) {
            return res.status(429).json({ error: 'AI quota exhausted. All providers are rate-limited. Try again later.' });
        }
        if (msg.includes('Direct AI run is not configured')) {
            return res.status(503).json({ error: 'AI provider not configured. Set AI_DIRECT_ENABLED, AI_BASE_URL, and AI_API_KEY in .env.' });
        }
        if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) {
            return res.status(504).json({ error: `AI request timed out: ${msg.slice(0, 200)}` });
        }
        if (msg.includes('rate limit') || msg.includes('429')) {
            return res.status(429).json({ error: `AI rate limited: ${msg.slice(0, 200)}. Try again in a few seconds.` });
        }
        console.error('Tầng 1 AI analysis error:', error);
        return res.status(500).json({ error: `AI analysis failed: ${msg.slice(0, 300)}` });
    }
});

programsAdminRouter.post('/programs/:programId/ai-estimate-riasec', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const { runConsistency = false, provider, model } = req.body || {};

        const program = await prisma.program.findUnique({
            where: { id: programId },
            include: {
                university: true,
                curriculums: { orderBy: { version: 'desc' }, take: 1 },
            },
        });
        if (!program) return res.status(404).json({ error: 'Program not found' });

        const curriculum = program.curriculums[0];
        if (!curriculum) return res.status(400).json({ error: 'No curriculum. Please save curriculum text first.' });

        const currText = curriculum.curriculumText || curriculum.extractedText || '';
        if (!currText || currText.length < 50) {
            return res.status(400).json({ error: 'Curriculum text too short for estimation.' });
        }

        const goldPath = require('path').join(__dirname, '../../../../..', 'data/gold/goldProgramDataset.v2.json');
        let goldPrograms;
        try {
            goldPrograms = require(goldPath);
        } catch {
            return res.status(500).json({ error: 'Gold dataset not found. Cannot run Tầng 2 estimation.' });
        }

        const referencePrograms = goldPrograms
            .filter(g => g.curriculum?.curriculumText && g.profile?.riasecScores && g.code !== program.code)
            .map(g => ({
                code: g.code,
                name: g.name,
                curriculumText: g.curriculum.curriculumText,
                profile: {
                    riasecScores: g.profile.riasecScores,
                    hollandCode: g.profile.hollandCode,
                },
            }));

        const result = await estimateProfileForNewProgram({
            provider,
            model,
            programName: program.name,
            universityName: program.university?.name || '',
            degreeLevel: program.degreeLevel || 'Bachelor',
            focusArea: program.focusArea || '',
            curriculumText: currText.slice(0, 15000),
            referencePrograms,
            runConsistencyCheck: Boolean(runConsistency),
        });

        if (!result.success) {
            return res.status(422).json(result);
        }

        await prisma.programAnalysisRun.create({
            data: {
                programId,
                mode: 'ESTIMATE_RIASEC',
                promptVersion: result.promptVersion || 'estimate-riasec-v1',
                responseVersion: 'estimate-riasec-response-v1',
                systemPrompt: '(Tầng 2 anchor-based estimate — see prompt version)',
                promptText: `Estimated using ${result.anchorPrograms.length} anchor programs`,
                aiResponseText: JSON.stringify(result.riasecScores),
                parsedResultJson: JSON.stringify(result),
                provider: result.provider || '',
                model: result.model || '',
                status: 'SUCCESS',
            },
        });

        res.json({
            success: true,
            source: 'AI_ESTIMATED',
            riasecScores: result.riasecScores,
            hollandCode: result.hollandCode,
            confidence: result.confidence,
            confidenceLevel: result.confidenceLevel,
            needsReview: result.needsReview,
            reasoning: result.reasoning,
            mostSimilarAnchor: result.mostSimilarAnchor,
            keyDifferences: result.keyDifferences,
            anchorPrograms: result.anchorPrograms,
            validation: result.validation,
            provider: result.provider,
            model: result.model,
        });
    } catch (error) {
        const msg = error?.message || '';
        if (msg.includes('AI_DAILY_QUOTA_EXHAUSTED') || msg.includes('quota')) {
            return res.status(429).json({ error: 'AI quota exhausted. All providers are rate-limited. Try again later.' });
        }
        if (msg.includes('Direct AI run is not configured')) {
            return res.status(503).json({ error: 'AI provider not configured. Set AI_DIRECT_ENABLED, AI_BASE_URL, and AI_API_KEY in .env.' });
        }
        if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET')) {
            return res.status(504).json({ error: `AI request timed out: ${msg.slice(0, 200)}` });
        }
        if (msg.includes('rate limit') || msg.includes('429')) {
            return res.status(429).json({ error: `AI rate limited: ${msg.slice(0, 200)}. Try again in a few seconds.` });
        }
        console.error('Tầng 2 estimation error:', error);
        return res.status(500).json({ error: `Estimation failed: ${msg.slice(0, 300)}` });
    }
});

programsAdminRouter.post('/programs/:programId/accept-estimate', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const { riasecScores, hollandCode, confidence, reasoning, provider, model, publishImmediately } = req.body || {};

        if (!riasecScores || typeof riasecScores !== 'object') {
            return res.status(400).json({ error: 'riasecScores is required.' });
        }

        const program = await prisma.program.findUnique({ where: { id: programId } });
        if (!program) return res.status(404).json({ error: 'Program not found' });

        const normalized = normalizeRiasecScores(riasecScores);
        const isPublished = Boolean(publishImmediately);

        if (isPublished) {
            await prisma.programProfile.updateMany({
                where: { programId, isPublished: true },
                data: { isPublished: false },
            });
        }

        const reasoningText = [
            hollandCode ? `Holland: ${hollandCode}` : null,
            reasoning ? String(reasoning) : null,
        ].filter(Boolean).join(' — ').slice(0, 2000) || null;

        const profile = await prisma.programProfile.create({
            data: {
                programId,
                sourceType: 'AI_ESTIMATED',
                riasecScoresJson: JSON.stringify(normalized),
                skillVectorJson: JSON.stringify([]),
                confidenceScore: confidence != null ? Number(confidence) : null,
                reasoning: reasoningText,
                modelName: model || null,
                promptVersion: provider ? `${provider}/${model || 'unknown'}` : null,
                reviewStatus: isPublished ? 'PUBLISHED' : 'DRAFT',
                isPublished,
                publishedAt: isPublished ? new Date() : null,
            },
        });

        res.json({ success: true, item: mapProgramProfile(profile) });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.delete('/programs/:programId', async (req, res, next) => {
    try {
        await prisma.program.delete({ where: { id: req.params.programId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs/:programId/curriculum', async (req, res, next) => {
    try {
        const body = programCurriculumSchema.parse(req.body ?? {});
        const latest = await prisma.programCurriculum.findFirst({
            where: { programId: req.params.programId },
            orderBy: { version: 'desc' },
        });

        const created = await prisma.programCurriculum.create({
            data: {
                programId: req.params.programId,
                version: (latest?.version || 0) + 1,
                sourceType: normalizeNullableString(body.sourceType) || 'TEXT',
                sourceUrl: normalizeNullableString(body.sourceUrl),
                fileName: normalizeNullableString(body.fileName),
                title: normalizeNullableString(body.title),
                curriculumText: normalizeNullableString(body.curriculumText),
                extractedText: normalizeNullableString(body.extractedText),
                objectivesJson: JSON.stringify(normalizeArrayInput(body.objectives)),
                courseListJson: JSON.stringify(normalizeArrayInput(body.courseList)),
                notes: normalizeNullableString(body.notes),
                status: normalizeNullableString(body.status) || 'ACTIVE',
            },
        });

        res.json({ success: true, item: mapCurriculum(created) });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.patch('/programs/:programId/curriculum/:curriculumId', async (req, res, next) => {
    try {
        const body = programCurriculumSchema.parse(req.body ?? {});
        const existing = await prisma.programCurriculum.findFirst({
            where: { id: req.params.curriculumId, programId: req.params.programId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Curriculum not found' });
            return;
        }

        const data = {};
        if (Object.prototype.hasOwnProperty.call(body, 'title')) data.title = normalizeNullableString(body.title);
        if (Object.prototype.hasOwnProperty.call(body, 'sourceType')) data.sourceType = normalizeNullableString(body.sourceType) || existing.sourceType;
        if (Object.prototype.hasOwnProperty.call(body, 'sourceUrl')) data.sourceUrl = normalizeNullableString(body.sourceUrl);
        if (Object.prototype.hasOwnProperty.call(body, 'fileName')) data.fileName = normalizeNullableString(body.fileName);
        if (Object.prototype.hasOwnProperty.call(body, 'curriculumText')) data.curriculumText = normalizeNullableString(body.curriculumText);
        if (Object.prototype.hasOwnProperty.call(body, 'extractedText')) data.extractedText = normalizeNullableString(body.extractedText);
        if (Object.prototype.hasOwnProperty.call(body, 'objectives')) data.objectivesJson = JSON.stringify(normalizeArrayInput(body.objectives));
        if (Object.prototype.hasOwnProperty.call(body, 'courseList')) data.courseListJson = JSON.stringify(normalizeArrayInput(body.courseList));
        if (Object.prototype.hasOwnProperty.call(body, 'notes')) data.notes = normalizeNullableString(body.notes);
        if (Object.prototype.hasOwnProperty.call(body, 'status')) data.status = normalizeNullableString(body.status) || existing.status;

        const updated = await prisma.programCurriculum.update({
            where: { id: req.params.curriculumId },
            data,
        });

        res.json({ success: true, item: mapCurriculum(updated) });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.delete('/programs/:programId/curriculum/:curriculumId', async (req, res, next) => {
    try {
        const existing = await prisma.programCurriculum.findFirst({
            where: { id: req.params.curriculumId, programId: req.params.programId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Curriculum not found' });
            return;
        }

        await prisma.programCurriculum.delete({ where: { id: req.params.curriculumId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.delete('/program-profiles/:profileId', async (req, res, next) => {
    try {
        const existing = await prisma.programProfile.findUnique({ where: { id: req.params.profileId } });
        if (!existing) {
            res.status(404).json({ error: 'Program profile not found' });
            return;
        }

        await prisma.programProfile.delete({ where: { id: req.params.profileId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs/:programId/curriculum/extract-pdf', upload.single('document'), async (req, res, next) => {
    try {
        if (!req.file || req.file.mimetype !== 'application/pdf') {
            res.status(400).json({ error: 'PDF file is required' });
            return;
        }

        const parsed = await extractPdfText(req.file.buffer);
        res.json({
            success: true,
            fileName: (req.file.originalname || '').normalize('NFC'),
            extractedText: parsed.text || '',
        });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.patch('/program-profiles/:profileId', async (req, res, next) => {
    try {
        const body = programProfileUpdateSchema.parse(req.body ?? {});
        const current = await prisma.programProfile.findUnique({ where: { id: req.params.profileId } });

        if (!current) {
            res.status(404).json({ error: 'Program profile not found' });
            return;
        }

        const data = {};
        if (Object.prototype.hasOwnProperty.call(body, 'riasecScores')) {
            data.riasecScoresJson = JSON.stringify(normalizeRiasecScores(body.riasecScores));
        }
        if (Object.prototype.hasOwnProperty.call(body, 'extractedSkills')) {
            data.extractedSkillsJson = JSON.stringify(normalizeArrayInput(body.extractedSkills));
        }
        if (Object.prototype.hasOwnProperty.call(body, 'summary')) {
            data.summaryJson = JSON.stringify(body.summary || {});
        }
        if (Object.prototype.hasOwnProperty.call(body, 'aiSummary')) data.aiSummary = normalizeNullableString(body.aiSummary);
        if (Object.prototype.hasOwnProperty.call(body, 'reasoning')) data.reasoning = normalizeNullableString(body.reasoning);
        if (Object.prototype.hasOwnProperty.call(body, 'evidenceMap')) {
            data.evidenceJson = JSON.stringify(normalizeEvidenceMap(body.evidenceMap));
        }
        if (Object.prototype.hasOwnProperty.call(body, 'promptVersion')) data.promptVersion = normalizeNullableString(body.promptVersion);
        if (Object.prototype.hasOwnProperty.call(body, 'modelName')) data.modelName = normalizeNullableString(body.modelName);
        if (Object.prototype.hasOwnProperty.call(body, 'reviewNotes')) data.reviewNotes = normalizeNullableString(body.reviewNotes);
        if (Object.prototype.hasOwnProperty.call(body, 'confidenceScore')) data.confidenceScore = Number(body.confidenceScore || 0);
        if (Object.prototype.hasOwnProperty.call(body, 'reviewStatus')) data.reviewStatus = normalizeNullableString(body.reviewStatus) || 'REVIEW';
        if (Object.prototype.hasOwnProperty.call(body, 'isPublished')) {
            data.isPublished = Boolean(body.isPublished);
            data.publishedAt = body.isPublished ? new Date() : null;
        }

        if (data.isPublished) {
            await prisma.programProfile.updateMany({
                where: { programId: current.programId, isPublished: true, id: { not: current.id } },
                data: { isPublished: false },
            });
        }

        const updated = await prisma.programProfile.update({
            where: { id: current.id },
            data,
        });

        res.json({ success: true, item: mapProgramProfile(updated) });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs/:profileId/expert-review', async (req, res, next) => {
    try {
        const profile = await prisma.programProfile.findUnique({
            where: { id: req.params.profileId },
        });
        if (!profile) {
            res.status(404).json({ error: 'Program profile not found' });
            return;
        }

        const {
            reviewerName, reviewerTitle, reviewerEmail, reviewerInstitution,
            riasecAgreement, skillAgreement,
            summaryAccuracy, overallScore,
            strengthNotes, weaknessNotes, overallNotes,
            recommendation,
        } = req.body || {};

        if (!reviewerName || summaryAccuracy == null) {
            res.status(400).json({ error: 'reviewerName and summaryAccuracy are required' });
            return;
        }

        const review = await prisma.expertReview.create({
            data: {
                programProfileId: profile.id,
                programId: profile.programId,
                reviewerName: String(reviewerName).trim(),
                reviewerTitle: reviewerTitle ? String(reviewerTitle).trim() : null,
                reviewerEmail: reviewerEmail ? String(reviewerEmail).trim() : null,
                reviewerInstitution: reviewerInstitution ? String(reviewerInstitution).trim() : null,
                riasecAgreementJson: JSON.stringify(riasecAgreement || {}),
                skillAgreementJson: JSON.stringify(skillAgreement || {}),
                summaryAccuracy: Number(summaryAccuracy),
                overallScore: overallScore != null ? Number(overallScore) : null,
                strengthNotes: strengthNotes ? String(strengthNotes).trim() : null,
                weaknessNotes: weaknessNotes ? String(weaknessNotes).trim() : null,
                overallNotes: overallNotes ? String(overallNotes).trim() : null,
                recommendation: recommendation || null,
                reviewDate: new Date(),
            },
        });

        res.json({ success: true, item: review });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.get('/programs/:programId/expert-reviews', async (req, res, next) => {
    try {
        const reviews = await prisma.expertReview.findMany({
            where: { programId: req.params.programId },
            orderBy: { reviewDate: 'desc' },
            include: {
                programProfile: {
                    select: { id: true, promptVersion: true, modelName: true, isPublished: true },
                },
            },
        });

        const totalReviews = reviews.length;
        const avgSummaryAccuracy = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.summaryAccuracy, 0) / totalReviews
            : 0;
        const avgOverallScore = totalReviews > 0
            ? reviews.filter(r => r.overallScore != null).reduce((sum, r) => sum + r.overallScore, 0) / Math.max(1, reviews.filter(r => r.overallScore != null).length)
            : 0;

        res.json({
            items: reviews,
            stats: {
                totalReviews,
                avgSummaryAccuracy: Math.round(avgSummaryAccuracy * 10) / 10,
                avgOverallScore: Math.round(avgOverallScore * 10) / 10,
                recommendations: {
                    ACCEPT: reviews.filter(r => r.recommendation === 'ACCEPT').length,
                    REVISE: reviews.filter(r => r.recommendation === 'REVISE').length,
                    REJECT: reviews.filter(r => r.recommendation === 'REJECT').length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

const { z } = require('zod');

const onetLinkCreateSchema = z.object({
    onetCode: z.string().min(5).max(20),
    relevance: z.number().int().min(1).max(10).default(5),
    isPrimary: z.boolean().default(false),
    note: z.string().max(255).optional(),
});

const onetLinkUpdateSchema = z.object({
    relevance: z.number().int().min(1).max(10).optional(),
    isPrimary: z.boolean().optional(),
    note: z.string().max(255).optional(),
});

programsAdminRouter.get('/programs/:programId/onet-links', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const links = await prisma.programOnetLink.findMany({
            where: { programId },
            include: { occupation: true },
            orderBy: [{ isPrimary: 'desc' }, { relevance: 'desc' }],
        });

        const { buildProfileFromLinks } = require('../../../../services/programs/onetDerivedProfileService');
        const derivedProfile = buildProfileFromLinks(links);

        res.json({
            success: true,
            links: links.map((link) => ({
                id: link.id,
                relevance: link.relevance,
                isPrimary: link.isPrimary,
                note: link.note,
                occupation: {
                    onetCode: link.occupation.onetCode,
                    title: link.occupation.title,
                    hollandCode: link.occupation.hollandCode,
                    jobOutlook: link.occupation.jobOutlook,
                    brightOutlook: link.occupation.brightOutlook,
                },
            })),
            derivedProfile,
        });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs/:programId/onet-links', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const data = onetLinkCreateSchema.parse(req.body);

        const occupation = await prisma.onetOccupation.findFirst({
            where: { onetCode: data.onetCode },
        });
        if (!occupation) {
            return res.status(404).json({ success: false, error: `O*NET occupation ${data.onetCode} not found` });
        }

        const existing = await prisma.programOnetLink.findUnique({
            where: { programId_occupationId: { programId, occupationId: occupation.id } },
        });
        if (existing) {
            return res.status(409).json({ success: false, error: 'Link already exists', existingId: existing.id });
        }

        if (data.isPrimary) {
            await prisma.programOnetLink.updateMany({
                where: { programId, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        const link = await prisma.programOnetLink.create({
            data: {
                programId,
                occupationId: occupation.id,
                relevance: data.relevance,
                isPrimary: data.isPrimary,
                note: data.note || occupation.title,
            },
            include: { occupation: true },
        });

        const allLinks = await prisma.programOnetLink.findMany({
            where: { programId },
            include: { occupation: true },
            orderBy: { relevance: 'desc' },
        });
        const { buildProfileFromLinks } = require('../../../../services/programs/onetDerivedProfileService');

        res.status(201).json({
            success: true,
            link: {
                id: link.id,
                onetCode: link.occupation.onetCode,
                title: link.occupation.title,
                relevance: link.relevance,
                isPrimary: link.isPrimary,
            },
            derivedProfile: buildProfileFromLinks(allLinks),
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
        }
        next(error);
    }
});

programsAdminRouter.patch('/programs/:programId/onet-links/:linkId', async (req, res, next) => {
    try {
        const { programId, linkId } = req.params;
        const data = onetLinkUpdateSchema.parse(req.body);

        if (data.isPrimary) {
            await prisma.programOnetLink.updateMany({
                where: { programId, isPrimary: true, id: { not: linkId } },
                data: { isPrimary: false },
            });
        }

        const updated = await prisma.programOnetLink.update({
            where: { id: linkId },
            data,
            include: { occupation: true },
        });

        const allLinks = await prisma.programOnetLink.findMany({
            where: { programId },
            include: { occupation: true },
            orderBy: { relevance: 'desc' },
        });
        const { buildProfileFromLinks } = require('../../../../services/programs/onetDerivedProfileService');

        res.json({
            success: true,
            link: {
                id: updated.id,
                onetCode: updated.occupation.onetCode,
                title: updated.occupation.title,
                relevance: updated.relevance,
                isPrimary: updated.isPrimary,
                note: updated.note,
            },
            derivedProfile: buildProfileFromLinks(allLinks),
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
        }
        next(error);
    }
});

programsAdminRouter.delete('/programs/:programId/onet-links/:linkId', async (req, res, next) => {
    try {
        const { programId, linkId } = req.params;

        await prisma.programOnetLink.delete({ where: { id: linkId } });

        const remaining = await prisma.programOnetLink.findMany({
            where: { programId },
            include: { occupation: true },
            orderBy: { relevance: 'desc' },
        });
        const { buildProfileFromLinks } = require('../../../../services/programs/onetDerivedProfileService');

        res.json({
            success: true,
            derivedProfile: buildProfileFromLinks(remaining),
        });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.get('/programs/:programId/onet-suggest', async (req, res, next) => {
    try {
        const { programId } = req.params;
        const program = await prisma.program.findUnique({
            where: { id: programId },
            select: { name: true, focusArea: true, department: true, code: true },
        });
        if (!program) {
            return res.status(404).json({ success: false, error: 'Program not found' });
        }

        const query = req.query.q || `${program.name} ${program.focusArea || ''} ${program.department || ''}`.trim();

        const existingLinks = await prisma.programOnetLink.findMany({
            where: { programId },
            select: { occupationId: true },
        });
        const linkedIds = new Set(existingLinks.map((l) => l.occupationId));

        let suggestions = [];
        let source = 'db';

        const ONET_API_KEY = process.env.ONET_API_KEY;
        if (ONET_API_KEY) {
            try {
                const apiUrl = `https://api-v2.onetcenter.org/mnm/search?keyword=${encodeURIComponent(query)}&start=1&end=20`;
                const apiRes = await fetch(apiUrl, {
                    headers: { 'X-API-Key': ONET_API_KEY },
                    signal: AbortSignal.timeout(5000),
                });
                if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    if (apiData.career && apiData.career.length > 0) {
                        const apiCodes = apiData.career.map((c) => c.code);
                        const dbOccs = await prisma.onetOccupation.findMany({
                            where: { onetCode: { in: apiCodes } },
                            select: { id: true, onetCode: true, title: true, hollandCode: true, jobOutlook: true, brightOutlook: true },
                        });
                        const dbMap = new Map(dbOccs.map((o) => [o.onetCode, o]));

                        suggestions = apiData.career
                            .map((c) => {
                                const dbOcc = dbMap.get(c.code);
                                return {
                                    onetCode: c.code,
                                    title: c.title,
                                    hollandCode: dbOcc?.hollandCode || null,
                                    jobOutlook: dbOcc?.jobOutlook || null,
                                    brightOutlook: c.tags?.bright_outlook || dbOcc?.brightOutlook || false,
                                    alreadyLinked: dbOcc ? linkedIds.has(dbOcc.id) : false,
                                };
                            })
                            .filter((s) => !s.alreadyLinked)
                            .slice(0, 15);
                        source = 'onet-api';
                    }
                }
            } catch {
            }
        }

        if (suggestions.length === 0) {
            const keyword = query.split(' ')[0];
            const occupations = await prisma.onetOccupation.findMany({
                where: {
                    OR: [
                        { title: { contains: keyword } },
                        { description: { contains: keyword } },
                        { alsoCalledJson: { contains: keyword } },
                    ],
                },
                take: 20,
                select: { id: true, onetCode: true, title: true, hollandCode: true, jobOutlook: true, brightOutlook: true },
            });
            suggestions = occupations
                .filter((occ) => !linkedIds.has(occ.id))
                .map((occ) => ({
                    onetCode: occ.onetCode,
                    title: occ.title,
                    hollandCode: occ.hollandCode,
                    jobOutlook: occ.jobOutlook,
                    brightOutlook: occ.brightOutlook,
                    alreadyLinked: false,
                }))
                .slice(0, 15);
            source = 'db';
        }

        res.json({ success: true, query, source, suggestions });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.post('/programs/bulk-import', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ error: 'Excel file has no sheets' });
        }

        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Excel file has no data rows' });
        }
        if (rows.length > 500) {
            return res.status(400).json({ error: `Too many rows (${rows.length}). Maximum is 500.` });
        }

        const allUniversities = await prisma.university.findMany({ select: { id: true, code: true, name: true, shortName: true } });
        const uniByCode = new Map();
        const uniByName = new Map();
        for (const u of allUniversities) {
            uniByCode.set(u.code.toUpperCase(), u);
            uniByName.set(u.name.toUpperCase(), u);
            if (u.shortName) uniByName.set(u.shortName.toUpperCase(), u);
        }

        const results = { created: 0, updated: 0, skipped: 0, curriculumsCreated: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            try {
                const universityRef = String(row['university_code'] || row['universityCode'] || row['Mã trường'] || row['ma_truong'] || '').trim();
                const code = String(row['code'] || row['Mã ngành'] || row['ma_nganh'] || '').trim().toUpperCase();
                const name = String(row['name'] || row['Tên ngành'] || row['ten_nganh'] || '').trim();
                const degreeLevel = String(row['degreeLevel'] || row['degree_level'] || row['Bậc'] || row['bac'] || '').trim() || null;
                const department = String(row['department'] || row['Khoa'] || row['khoa'] || '').trim() || null;
                const focusArea = String(row['focusArea'] || row['focus_area'] || row['Lĩnh vực'] || row['linh_vuc'] || '').trim() || null;
                const summary = String(row['summary'] || row['Mô tả'] || row['mo_ta'] || '').trim() || null;
                const sourceUrl = String(row['sourceUrl'] || row['source_url'] || row['URL'] || row['url'] || '').trim() || null;
                const durationStr = String(row['durationYears'] || row['duration_years'] || row['Số năm'] || row['so_nam'] || '').trim();
                const durationYears = durationStr ? parseInt(durationStr, 10) || null : null;
                const courseSourceUrl = String(row['courseSourceUrl'] || row['course_source_url'] || row['URL CTDT'] || '').trim() || null;

                const coursesRaw = String(row['keyCourses'] || row['key_courses'] || row['Môn học'] || row['mon_hoc'] || '').trim();
                const keyCourses = coursesRaw
                    ? coursesRaw.split(/[;\n]+/).map((c) => c.trim()).filter(Boolean)
                    : [];

                const curriculumRaw = String(row['curriculumText'] || row['curriculum_text'] || row['Chương trình'] || row['chuong_trinh'] || '').trim();
                const curriculumText = curriculumRaw || (keyCourses.length > 0 ? keyCourses.join('\n') : '');
                const courseList = curriculumRaw
                    ? curriculumRaw.split(/[;\n]+/).map((c) => c.trim()).filter(Boolean)
                    : keyCourses;

                const objectivesRaw = String(row['objectives'] || row['Mục tiêu'] || row['muc_tieu'] || '').trim();
                const objectives = objectivesRaw
                    ? objectivesRaw.split(/[;\n]+/).map((o) => o.trim()).filter(Boolean)
                    : [];

                if (!universityRef) {
                    results.errors.push({ row: rowNum, error: 'Thiếu mã trường (university_code)' });
                    results.skipped++;
                    continue;
                }
                if (!code) {
                    results.errors.push({ row: rowNum, error: 'Thiếu mã ngành (code)' });
                    results.skipped++;
                    continue;
                }
                if (code.length < 2) {
                    results.errors.push({ row: rowNum, error: `Mã ngành quá ngắn: "${code}"` });
                    results.skipped++;
                    continue;
                }
                if (!name || name.length < 2) {
                    results.errors.push({ row: rowNum, error: 'Thiếu tên ngành (name)' });
                    results.skipped++;
                    continue;
                }

                const university = uniByCode.get(universityRef.toUpperCase()) || uniByName.get(universityRef.toUpperCase());
                if (!university) {
                    results.errors.push({ row: rowNum, error: `Không tìm thấy trường: "${universityRef}"` });
                    results.skipped++;
                    continue;
                }

                const slug = `${code}-${slugify(name)}`.toLowerCase();

                const existing = await prisma.program.findFirst({
                    where: { OR: [{ code }, { slug }] },
                });

                if (existing) {
                    if (existing.status === 'DRAFT') {
                        await prisma.program.update({
                            where: { id: existing.id },
                            data: {
                                universityId: university.id,
                                name,
                                degreeLevel,
                                department,
                                focusArea,
                                summary,
                                sourceUrl,
                                durationYears,
                                courseSourceUrl,
                                keyCoursesJson: keyCourses.length > 0 ? JSON.stringify(keyCourses) : null,
                            },
                        });
                        if (curriculumText) {
                            const existingCurr = await prisma.programCurriculum.findFirst({
                                where: { programId: existing.id },
                                orderBy: { version: 'desc' },
                            });
                            if (existingCurr) {
                                await prisma.programCurriculum.update({
                                    where: { id: existingCurr.id },
                                    data: {
                                        curriculumText,
                                        courseListJson: JSON.stringify(courseList),
                                        objectivesJson: objectives.length > 0 ? JSON.stringify(objectives) : existingCurr.objectivesJson,
                                        title: `${name} — Curriculum`,
                                    },
                                });
                            } else {
                                await prisma.programCurriculum.create({
                                    data: {
                                        programId: existing.id,
                                        version: 1,
                                        sourceType: sourceUrl ? 'OFFICIAL_PUBLIC' : 'TEXT',
                                        sourceUrl,
                                        title: `${name} — Curriculum`,
                                        curriculumText,
                                        courseListJson: JSON.stringify(courseList),
                                        objectivesJson: objectives.length > 0 ? JSON.stringify(objectives) : undefined,
                                    },
                                });
                            }
                            results.curriculumsCreated++;
                        }
                        results.updated++;
                    } else {
                        results.errors.push({ row: rowNum, error: `Ngành "${code}" đã tồn tại (${existing.status})` });
                        results.skipped++;
                    }
                    continue;
                }

                const importDerivedTags = autoTagDomain({
                    name,
                    summary,
                    keyCourses,
                });

                const created = await prisma.program.create({
                    data: {
                        universityId: university.id,
                        code,
                        slug,
                        name,
                        degreeLevel,
                        department,
                        focusArea,
                        summary,
                        sourceUrl,
                        durationYears,
                        courseSourceUrl,
                        keyCoursesJson: keyCourses.length > 0 ? JSON.stringify(keyCourses) : null,
                        domainTagsJson: importDerivedTags.length > 0 ? JSON.stringify(importDerivedTags) : null,
                        status: 'DRAFT',
                        featured: false,
                    },
                });

                if (curriculumText) {
                    await prisma.programCurriculum.create({
                        data: {
                            programId: created.id,
                            version: 1,
                            sourceType: sourceUrl ? 'OFFICIAL_PUBLIC' : 'TEXT',
                            sourceUrl,
                            title: `${name} — Curriculum`,
                            curriculumText,
                            courseListJson: JSON.stringify(courseList),
                            objectivesJson: objectives.length > 0 ? JSON.stringify(objectives) : undefined,
                        },
                    });
                    results.curriculumsCreated++;
                }

                results.created++;
            } catch (rowError) {
                results.errors.push({ row: rowNum, error: rowError.message });
                results.skipped++;
            }
        }

        res.json({
            success: true,
            totalRows: rows.length,
            ...results,
        });
    } catch (error) {
        next(error);
    }
});

programsAdminRouter.get('/programs/bulk-import/template', async (_req, res, _next) => {
    const headers = [
        'university_code', 'code', 'name', 'degreeLevel', 'department',
        'focusArea', 'summary', 'sourceUrl', 'durationYears', 'keyCourses', 'curriculumText', 'objectives', 'courseSourceUrl',
    ];
    const exampleRow = {
        university_code: 'HCMUT',
        code: 'HCMUT-CS',
        name: 'Computer Science',
        degreeLevel: 'Bachelor',
        department: 'Computer Science & Engineering',
        focusArea: 'Computer Science',
        summary: 'A program focused on software engineering and algorithms',
        sourceUrl: 'https://example.edu.vn/ctdt/cs',
        durationYears: 4,
        keyCourses: 'Data Structures; Algorithms; Operating Systems; Databases',
        curriculumText: 'C/C++ Programming; Object-Oriented Programming; Discrete Mathematics; Data Structures and Algorithms; Database Management Systems; Computer Networks; Operating Systems; Software Engineering; Artificial Intelligence; Machine Learning',
        objectives: 'Train software engineers with strong algorithmic thinking; Equip students with practical software development skills; Prepare graduates for careers in IT industry and research',
        courseSourceUrl: 'https://example.edu.vn/ctdt/cs/courses',
    };

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });

    ws['!cols'] = headers.map((h) => ({ wch: h === 'summary' || h === 'keyCourses' || h === 'curriculumText' || h === 'objectives' ? 50 : h === 'sourceUrl' || h === 'courseSourceUrl' ? 30 : 18 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Programs');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=program-import-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.xml');
    res.send(buffer);
});

module.exports = { programsAdminRouter };
