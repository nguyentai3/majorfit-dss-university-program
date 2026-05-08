
const { env } = require('../../config/env');
const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const { normalizeOnetRiasec } = require('../riasec/onetCareerMatchService');
const { expandVietnameseKeywords, extractKeywords, extractBigrams } = require('./onetExemplarService');

const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 512;

let _occupationEmbeddingCache = null;
let _cacheTimestamp = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const VN_OCCUPATION_SUPPLEMENT = [
    {
        code: 'VN-001',
        title: 'Land Management Specialist (Quản lý đất đai)',
        titleVi: 'Chuyên viên Quản lý đất đai',
        description: 'Manages land use planning, cadastral mapping, land registration, and real estate valuation in Vietnamese administrative system.',
        hollandCode: 'CIR',
        riasec: { R: 45, I: 55, A: 15, S: 30, E: 40, C: 70 },
        skills: ['GIS Mapping', 'Land Surveying', 'Administrative Law', 'Data Management', 'Urban Planning'],
        nearestOnet: ['11-9021.00', '19-3051.00'],
    },
    {
        code: 'VN-002',
        title: 'Cultural Studies Specialist (Văn hóa học)',
        titleVi: 'Chuyên viên Văn hóa học',
        description: 'Researches Vietnamese cultural heritage, manages cultural programs, community cultural development, and ethnic minority cultural preservation.',
        hollandCode: 'SAI',
        riasec: { R: 15, I: 60, A: 55, S: 50, E: 25, C: 20 },
        skills: ['Research Methods', 'Cultural Analysis', 'Community Engagement', 'Writing', 'Event Management'],
        nearestOnet: ['19-3093.00', '25-4013.00'],
    },
    {
        code: 'VN-003',
        title: 'Vietnamese Studies Specialist (Việt Nam học)',
        titleVi: 'Chuyên viên Việt Nam học',
        description: 'Interdisciplinary study of Vietnamese society, history, language, tourism, and international cultural exchange.',
        hollandCode: 'SIA',
        riasec: { R: 10, I: 55, A: 50, S: 55, E: 30, C: 20 },
        skills: ['Research', 'Cross-cultural Communication', 'Tourism Management', 'Writing', 'Vietnamese Language'],
        nearestOnet: ['25-1062.00', '39-7012.00'],
    },
    {
        code: 'VN-004',
        title: 'Oriental Studies Specialist (Đông phương học)',
        titleVi: 'Chuyên viên Đông phương học',
        description: 'Studies East Asian and Southeast Asian cultures, languages, politics, and economic systems for diplomatic and business contexts.',
        hollandCode: 'ISE',
        riasec: { R: 10, I: 60, A: 40, S: 45, E: 35, C: 25 },
        skills: ['Foreign Languages', 'Comparative Politics', 'Cultural Analysis', 'Research', 'Diplomacy'],
        nearestOnet: ['25-1062.00', '21-1099.00'],
    },
    {
        code: 'VN-005',
        title: 'Party & State Affairs Specialist (Xây dựng Đảng và Chính quyền)',
        titleVi: 'Chuyên viên Xây dựng Đảng',
        description: 'Specializes in Vietnamese political system, party building, governance, propaganda, and public administration in the Vietnamese context.',
        hollandCode: 'ESC',
        riasec: { R: 10, I: 35, A: 20, S: 50, E: 55, C: 45 },
        skills: ['Public Administration', 'Political Theory', 'Communication', 'Writing', 'Leadership'],
        nearestOnet: ['11-1011.00', '13-1199.04'],
    },
    {
        code: 'VN-006',
        title: 'Aquaculture Engineer (Kỹ sư Thủy sản)',
        titleVi: 'Kỹ sư Thủy sản',
        description: 'Designs and manages aquaculture systems for shrimp, fish, and seafood farming, a key Vietnamese industry.',
        hollandCode: 'RIC',
        riasec: { R: 65, I: 55, A: 10, S: 20, E: 25, C: 40 },
        skills: ['Biology', 'Water Quality Management', 'Feed Formulation', 'Disease Prevention', 'Farm Management'],
        nearestOnet: ['45-3031.00', '19-1023.00'],
    },
    {
        code: 'VN-007',
        title: 'Traditional Medicine Practitioner (Y học cổ truyền)',
        titleVi: 'Bác sĩ Y học cổ truyền',
        description: 'Practices Vietnamese traditional medicine including herbal medicine, acupuncture, and integrative therapy.',
        hollandCode: 'ISR',
        riasec: { R: 45, I: 60, A: 10, S: 55, E: 15, C: 30 },
        skills: ['Herbal Medicine', 'Acupuncture', 'Patient Care', 'Diagnosis', 'Anatomy'],
        nearestOnet: ['29-1199.01', '29-1291.00'],
    },
    {
        code: 'VN-008',
        title: 'Forestry Engineer (Kỹ sư Lâm nghiệp)',
        titleVi: 'Kỹ sư Lâm nghiệp',
        description: 'Manages forest resources, reforestation, natural conservation, and sustainable forestry — critical for Vietnam\'s biodiversity.',
        hollandCode: 'RIC',
        riasec: { R: 65, I: 50, A: 10, S: 20, E: 25, C: 35 },
        skills: ['Forest Management', 'GIS', 'Ecology', 'Conservation', 'Environmental Assessment'],
        nearestOnet: ['19-1032.00', '45-4011.00'],
    },
    {
        code: 'VN-009',
        title: 'Library & Information Science Specialist (Thư viện - Thông tin học)',
        titleVi: 'Chuyên viên Thư viện học',
        description: 'Manages library systems, digital archives, information retrieval, and knowledge organization.',
        hollandCode: 'CIS',
        riasec: { R: 20, I: 50, A: 20, S: 40, E: 15, C: 65 },
        skills: ['Information Systems', 'Cataloging', 'Digital Archives', 'Research', 'Database Management'],
        nearestOnet: ['25-4022.00', '15-1299.02'],
    },
    {
        code: 'VN-010',
        title: 'Industrial Arts Teacher (Giáo viên Công nghệ / Kỹ thuật)',
        titleVi: 'Giáo viên Công nghệ',
        description: 'Teaches technology, technical drawing, and practical skills in Vietnamese secondary schools.',
        hollandCode: 'SRC',
        riasec: { R: 50, I: 35, A: 25, S: 60, E: 25, C: 30 },
        skills: ['Teaching', 'Technical Drawing', 'Workshop Skills', 'Curriculum Design', 'Student Assessment'],
        nearestOnet: ['25-2023.00', '25-1194.00'],
    },
];

async function getEmbedding(text, { baseUrl, apiKey } = {}) {
    const resolvedBaseUrl = (baseUrl || env.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const resolvedApiKey = apiKey || env.aiApiKey;

    if (!resolvedApiKey) {
        return null;
    }

    const truncated = text.length > 32000 ? text.slice(0, 32000) : text;

    const response = await fetch(`${resolvedBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedApiKey}`,
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: truncated,
            dimensions: EMBEDDING_DIMENSIONS,
        }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`Embedding API error ${response.status}: ${errText.slice(0, 200)}`);
        return null;
    }

    const data = await response.json();
    return data?.data?.[0]?.embedding || null;
}

async function getBatchEmbeddings(texts, { baseUrl, apiKey } = {}) {
    const resolvedBaseUrl = (baseUrl || env.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const resolvedApiKey = apiKey || env.aiApiKey;

    if (!resolvedApiKey) return null;

    const truncated = texts.map((t) => (t.length > 8000 ? t.slice(0, 8000) : t));

    const response = await fetch(`${resolvedBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedApiKey}`,
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: truncated,
            dimensions: EMBEDDING_DIMENSIONS,
        }),
    });

    if (!response.ok) {
        console.warn(`Batch embedding error ${response.status}`);
        return null;
    }

    const data = await response.json();
    return (data?.data || []).sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
}

function buildOccupationText(occ) {
    const parts = [occ.title];
    if (occ.description) parts.push(occ.description.slice(0, 500));
    const skills = safeJsonParse(occ.topSkillsJson, []);
    if (skills.length > 0) {
        parts.push('Skills: ' + skills.slice(0, 8).map((s) => s.name || s.element || '').filter(Boolean).join(', '));
    }
    const knowledge = safeJsonParse(occ.topKnowledgeJson, []);
    if (knowledge.length > 0) {
        parts.push('Knowledge: ' + knowledge.slice(0, 6).map((k) => k.name || k.element || '').filter(Boolean).join(', '));
    }
    return parts.join('. ');
}

async function loadOccupationEmbeddings() {
    if (_occupationEmbeddingCache && _cacheTimestamp && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS) {
        return _occupationEmbeddingCache;
    }

    const allOccupations = await prisma.onetOccupation.findMany({
        select: {
            id: true,
            onetCode: true,
            title: true,
            description: true,
            hollandCode: true,
            riasecScoresJson: true,
            topSkillsJson: true,
            topKnowledgeJson: true,
        },
    });

    const occupationsWithRiasec = allOccupations.filter((occ) => occ.riasecScoresJson);

    const texts = occupationsWithRiasec.map(buildOccupationText);

    const vnTexts = VN_OCCUPATION_SUPPLEMENT.map((vn) =>
        `${vn.title}. ${vn.titleVi}. ${vn.description}. Skills: ${vn.skills.join(', ')}`,
    );

    const allTexts = [...texts, ...vnTexts];

    const BATCH_SIZE = 100;
    const allEmbeddings = [];
    for (let i = 0; i < allTexts.length; i += BATCH_SIZE) {
        const chunk = allTexts.slice(i, i + BATCH_SIZE);
        const embeddings = await getBatchEmbeddings(chunk);
        if (!embeddings) {
            console.warn('Embedding API unavailable — semantic search disabled for this session');
            return null;
        }
        allEmbeddings.push(...embeddings);
    }

    const onetEntries = occupationsWithRiasec.map((occ, i) => ({
        occ,
        embedding: allEmbeddings[i],
        source: 'onet',
    }));

    const vnEntries = VN_OCCUPATION_SUPPLEMENT.map((vn, i) => ({
        occ: {
            id: vn.code,
            onetCode: vn.code,
            title: vn.title,
            description: vn.description,
            hollandCode: vn.hollandCode,
            riasecScoresJson: JSON.stringify(vn.riasec),
            topSkillsJson: JSON.stringify(vn.skills.map((s) => ({ name: s, score: 70 }))),
            topKnowledgeJson: null,
        },
        embedding: allEmbeddings[occupationsWithRiasec.length + i],
        source: 'vn_supplement',
    }));

    _occupationEmbeddingCache = [...onetEntries, ...vnEntries];
    _cacheTimestamp = Date.now();

    console.info(
        `Semantic search cache loaded: ${onetEntries.length} O*NET + ${vnEntries.length} VN supplement occupations, ` +
        `${EMBEDDING_DIMENSIONS}-dim embeddings`,
    );

    return _occupationEmbeddingCache;
}

async function findRelatedOnetSemanticSearch({
    programName = '',
    courseList = [],
    objectives = [],
    focusArea = '',
    existingOnetLinks = [],
    limit = 8,
}) {
    const manualIds = new Set(existingOnetLinks.map((l) => l.occupationId || l.id));
    const textSources = [programName, focusArea, ...courseList.slice(0, 30), ...objectives.slice(0, 15)];
    const combinedText = textSources.join(' ');

    let semanticResults = [];
    let semanticAvailable = false;

    try {
        const cache = await loadOccupationEmbeddings();
        if (cache) {
            const enKeywords = expandVietnameseKeywords(combinedText);
            const queryText = [programName, focusArea, ...enKeywords, ...courseList.slice(0, 15)].join('. ');
            const queryEmbedding = await getEmbedding(queryText);

            if (queryEmbedding) {
                semanticAvailable = true;
                semanticResults = cache.map((entry) => ({
                    ...entry,
                    semanticScore: cosineSimilarity(queryEmbedding, entry.embedding),
                }));
            }
        }
    } catch (err) {
        console.warn(`Semantic search error: ${err.message}`);
    }

    const enKeywords = expandVietnameseKeywords(combinedText);
    const shortFP = new Set(['tin', 'ban', 'nam', 'can', 'con', 'van', 'dan', 'cap', 'don', 'san', 'man', 'the', 'and', 'for', 'are', 'not', 'all', 'any', 'has', 'had', 'was', 'who']);
    const isEn = (w) => /^[a-z0-9]+$/i.test(w) && w.length >= 3 && !shortFP.has(w.toLowerCase());
    const rawWords = extractKeywords(combinedText).filter(isEn);
    const keywords = [...new Set([...enKeywords, ...rawWords])];
    const bigrams = extractBigrams([...enKeywords, ...rawWords]);

    const keywordScored = new Map();
    if (keywords.length > 0 || manualIds.size > 0) {
        const sources = semanticAvailable
            ? semanticResults.map((sr) => sr.occ)
            : await prisma.onetOccupation.findMany({
                  select: { id: true, onetCode: true, title: true, description: true, hollandCode: true, riasecScoresJson: true, topSkillsJson: true, topKnowledgeJson: true },
              }).then((occs) => occs.filter((o) => o.riasecScoresJson));

        for (const occ of sources) {
            const titleLower = occ.title.toLowerCase();
            const titleWords = titleLower.split(/[\s,/()-]+/).filter((w) => w.length >= 4);
            const skillText = (typeof occ.topSkillsJson === 'string' ? occ.topSkillsJson : '').toLowerCase();
            const knowledgeText = (typeof occ.topKnowledgeJson === 'string' ? occ.topKnowledgeJson : '').toLowerCase();
            const descText = (occ.description || '').toLowerCase();

            let score = 0;
            if (manualIds.has(occ.id)) score += 100;

            for (const bg of bigrams) {
                if (titleLower.includes(bg)) score += 8;
                if (descText.includes(bg)) score += 3;
                if (skillText.includes(bg)) score += 2;
            }

            for (const kw of keywords) {
                const isShort = kw.length <= 4;
                if (isShort) {
                    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    if (re.test(titleLower)) score += 5;
                    if (re.test(skillText)) score += 2;
                    if (re.test(knowledgeText)) score += 1.5;
                    if (re.test(descText)) score += 0.5;
                } else {
                    if (titleLower.includes(kw)) score += 5;
                    else if (titleWords.some((tw) => tw.includes(kw) || kw.includes(tw))) score += 3;
                    if (skillText.includes(kw)) score += 2;
                    if (knowledgeText.includes(kw)) score += 1.5;
                    if (descText.includes(kw)) score += 0.5;
                }
            }

            keywordScored.set(occ.id || occ.onetCode, score);
        }
    }

    const maxKeyword = Math.max(...keywordScored.values(), 1);

    let combined;
    if (semanticAvailable && semanticResults.length > 0) {
        combined = semanticResults.map((sr) => {
            const kwScore = keywordScored.get(sr.occ.id || sr.occ.onetCode) || 0;
            const isManual = manualIds.has(sr.occ.id);
            const normalizedKeyword = kwScore / maxKeyword;
            const manualBonus = isManual ? 1.0 : 0;

            const hybridScore = sr.semanticScore * 0.6 + normalizedKeyword * 0.3 + manualBonus * 0.1;

            return {
                occ: sr.occ,
                hybridScore,
                semanticScore: sr.semanticScore,
                keywordScore: kwScore,
                isManualLink: isManual,
                source: sr.source,
                matchMethod: 'hybrid_semantic',
            };
        });
    } else {
        const allOccs = await prisma.onetOccupation.findMany({
            select: { id: true, onetCode: true, title: true, description: true, hollandCode: true, riasecScoresJson: true, topSkillsJson: true, topKnowledgeJson: true },
        });

        const vnOccs = VN_OCCUPATION_SUPPLEMENT.map((vn) => ({
            id: vn.code,
            onetCode: vn.code,
            title: vn.title,
            description: vn.description,
            hollandCode: vn.hollandCode,
            riasecScoresJson: JSON.stringify(vn.riasec),
            topSkillsJson: JSON.stringify(vn.skills.map((s) => ({ name: s, score: 70 }))),
            topKnowledgeJson: null,
        }));

        combined = [...allOccs, ...vnOccs]
            .filter((occ) => occ.riasecScoresJson)
            .map((occ) => {
                const kwScore = keywordScored.get(occ.id || occ.onetCode) || 0;
                return {
                    occ,
                    hybridScore: kwScore / maxKeyword,
                    semanticScore: 0,
                    keywordScore: kwScore,
                    isManualLink: manualIds.has(occ.id),
                    source: (occ.onetCode || '').startsWith('VN-') ? 'vn_supplement' : 'onet',
                    matchMethod: 'keyword',
                };
            });
    }

    const topResults = combined
        .filter((r) => r.hybridScore > 0 || r.isManualLink)
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, limit);

    return topResults.map((r) => {
        const rawRiasec = safeJsonParse(r.occ.riasecScoresJson);
        const isVnSupplement = r.source === 'vn_supplement';
        const normalizedRiasec = rawRiasec
            ? isVnSupplement
                ? rawRiasec
                : Object.fromEntries(DIMS.map((d) => [d, Math.round(normalizeOnetRiasec(rawRiasec[d] ?? 0))]))
            : null;

        return {
            onetCode: r.occ.onetCode,
            title: r.occ.title,
            hollandCode: r.occ.hollandCode,
            riasec: normalizedRiasec,
            topSkills: safeJsonParse(r.occ.topSkillsJson, []),
            topKnowledge: safeJsonParse(r.occ.topKnowledgeJson, []),
            relevanceScore: Math.round(r.hybridScore * 100) / 100,
            semanticScore: Math.round((r.semanticScore || 0) * 1000) / 1000,
            matchMethod: r.matchMethod,
            isManualLink: r.isManualLink,
            isVnSupplement: isVnSupplement,
        };
    });
}

async function suggestOnetLinks({
    programId,
    programName = '',
    courseList = [],
    objectives = [],
    focusArea = '',
    confidenceThreshold = 0.65,
    limit = 5,
}) {
    const results = await findRelatedOnetSemanticSearch({
        programName,
        courseList,
        objectives,
        focusArea,
        limit: limit + 3,
    });

    const confident = results.filter((r) =>
        r.matchMethod === 'hybrid_semantic'
            ? (r.semanticScore || 0) >= confidenceThreshold
            : r.relevanceScore >= 50,
    );

    return confident.slice(0, limit).map((r, idx) => ({
        programId,
        onetCode: r.onetCode,
        title: r.title,
        relevance: Math.min(10, Math.max(1, Math.round(r.relevanceScore * 10))),
        isPrimary: idx === 0,
        confidence: r.matchMethod === 'hybrid_semantic'
            ? Math.round((r.semanticScore || 0) * 100)
            : Math.round(r.relevanceScore),
        matchMethod: r.matchMethod,
        isVnSupplement: r.isVnSupplement || false,
        note: `Auto-suggested via ${r.matchMethod} (confidence: ${r.matchMethod === 'hybrid_semantic' ? Math.round((r.semanticScore || 0) * 100) : Math.round(r.relevanceScore)}%)`,
    }));
}

function clearEmbeddingCache() {
    _occupationEmbeddingCache = null;
    _cacheTimestamp = null;
}

module.exports = {
    findRelatedOnetSemanticSearch,
    suggestOnetLinks,
    getEmbedding,
    getBatchEmbeddings,
    cosineSimilarity,
    clearEmbeddingCache,
    VN_OCCUPATION_SUPPLEMENT,
    buildOccupationText,
    EMBEDDING_DIMENSIONS,
};
