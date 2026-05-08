const { prisma } = require('../../db/prisma');
const { safeJsonParse } = require('../../utils/http');
const { normalizeOnetRiasec } = require('../riasec/onetCareerMatchService');

const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

function extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'is', 'are',
        'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these', 'those', 'it', 'its',
        'from', 'as', 'not', 'but', 'if', 'then', 'than', 'so', 'such', 'no', 'nor', 'too', 'very',
        'also', 'use', 'used', 'using', 'based', 'include', 'including', 'related', 'other',
        'các', 'và', 'của', 'trong', 'cho', 'với', 'về', 'được', 'có', 'là', 'một', 'những', 'này',
        'học', 'sinh', 'viên', 'môn', 'phần', 'chương', 'trình', 'đào', 'tạo', 'ngành', 'khoa',
        'theo', 'như', 'khi', 'hay', 'hoặc', 'cũng', 'đến', 'từ', 'qua', 'sau', 'trước',
    ]);
    return text
        .toLowerCase()
        .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w));
}

function extractBigrams(words) {
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
        if (words[i].length >= 3 && words[i + 1].length >= 3) {
            bigrams.push(words[i] + ' ' + words[i + 1]);
        }
    }
    return bigrams;
}

const VN_DOMAIN_KEYWORDS = {
    'công nghệ thông tin': ['software', 'computer', 'information technology', 'programming'],
    'khoa học máy tính': ['computer science', 'algorithms', 'computing'],
    'kỹ thuật phần mềm': ['software engineering', 'software development'],
    'trí tuệ nhân tạo': ['artificial intelligence', 'machine learning', 'data science'],
    'bán dẫn': ['semiconductor', 'electronics', 'vlsi', 'integrated circuit'],
    'vi mạch': ['vlsi', 'semiconductor', 'integrated circuit', 'chip design'],
    'điện tử': ['electronics', 'electrical', 'embedded'],
    'truyền thông': ['communications', 'media', 'multimedia', 'broadcasting'],
    'sáng tạo nội dung': ['content creation', 'digital media', 'creative'],
    'thiết kế': ['design', 'graphic', 'creative', 'ux'],
    'tài chính': ['finance', 'financial', 'banking', 'accounting'],
    'quản trị kinh doanh': ['business administration', 'management', 'business'],
    'marketing': ['marketing', 'advertising', 'sales', 'digital marketing'],
    'luật': ['law', 'legal', 'paralegal', 'compliance'],
    'tâm lý': ['psychology', 'counseling', 'mental health'],
    'y khoa': ['medical', 'health', 'clinical', 'physician'],
    'dược': ['pharmacy', 'pharmaceutical', 'drug'],
    'sinh học': ['biology', 'biotechnology', 'biomedical'],
    'hóa học': ['chemistry', 'chemical', 'materials'],
    'xây dựng': ['construction', 'civil engineering', 'building'],
    'kiến trúc': ['architecture', 'architectural', 'urban planning'],
    'cơ khí': ['mechanical engineering', 'manufacturing', 'industrial'],
    'logistics': ['logistics', 'supply chain', 'transportation', 'warehousing'],
    'du lịch': ['tourism', 'hospitality', 'travel'],
    'nông nghiệp': ['agriculture', 'farming', 'agronomy', 'agritech'],
    'môi trường': ['environment', 'environmental', 'sustainability'],
    'an toàn thông tin': ['cybersecurity', 'information security', 'network security'],
    'khoa học dữ liệu': ['data science', 'data analytics', 'big data'],
    'robot': ['robotics', 'automation', 'mechatronics'],
    'iot': ['internet of things', 'embedded systems', 'sensors'],
    'blockchain': ['blockchain', 'distributed', 'cryptocurrency'],
    'game': ['game development', 'game design', 'animation'],
    'viễn thông': ['telecommunications', 'telecom', 'signal processing', 'wireless'],
    'tự động hóa': ['automation', 'industrial automation', 'control systems', 'plc'],
    'kỹ thuật điều khiển': ['control engineering', 'automation', 'instrumentation'],
    'xử lý tín hiệu': ['signal processing', 'digital signal', 'communications'],
    'điện công nghiệp': ['industrial electrical', 'power systems', 'electrical engineering'],
    'kỹ thuật môi trường': ['environmental engineering', 'waste management', 'water treatment'],
    'công nghệ thực phẩm': ['food technology', 'food science', 'food processing'],
    'thú y': ['veterinary', 'animal health', 'veterinarian'],
    'thủy sản': ['aquaculture', 'fisheries', 'marine biology'],
    'dệt may': ['textile', 'garment', 'fashion technology'],
    'sư phạm': ['education', 'teaching', 'pedagogy', 'instructional'],
    'báo chí': ['journalism', 'news', 'reporting', 'broadcast'],
    'quan hệ quốc tế': ['international relations', 'diplomacy', 'foreign affairs'],
    'công tác xã hội': ['social work', 'community service', 'welfare'],
    'thể dục thể thao': ['physical education', 'sports science', 'athletics', 'kinesiology'],
    'thương mại điện tử': ['e-commerce', 'electronic commerce', 'online business', 'digital business'],
    'quản trị nhân lực': ['human resources', 'personnel management', 'talent management'],
    'kế toán': ['accounting', 'auditing', 'bookkeeping', 'financial reporting'],
    'kiểm toán': ['auditing', 'accounting', 'compliance', 'internal audit'],
    'ngân hàng': ['banking', 'finance', 'credit', 'financial services'],
    'bảo hiểm': ['insurance', 'actuarial', 'risk management'],
    'bất động sản': ['real estate', 'property management', 'urban planning'],
    'ngoại ngữ': ['foreign language', 'linguistics', 'translation', 'interpretation'],
    'ngôn ngữ anh': ['english language', 'linguistics', 'translation', 'tesol'],
    'đông phương học': ['oriental studies', 'asian studies', 'area studies'],
    'triết học': ['philosophy', 'ethics', 'logic', 'critical thinking'],
    'xã hội học': ['sociology', 'social science', 'demography'],
    'lịch sử': ['history', 'archeology', 'cultural studies'],
    'địa lý': ['geography', 'geospatial', 'gis', 'cartography'],
    'toán học': ['mathematics', 'statistics', 'applied math'],
    'vật lý': ['physics', 'applied physics', 'optics', 'materials science'],
    'năng lượng': ['energy', 'renewable energy', 'power engineering', 'solar'],
    'hàng không': ['aviation', 'aerospace', 'aircraft', 'pilot'],
    'hàng hải': ['maritime', 'shipping', 'naval', 'marine engineering'],
    'mỏ địa chất': ['mining', 'geology', 'mineral', 'geotechnical'],
    'dầu khí': ['petroleum', 'oil and gas', 'drilling', 'reservoir'],
    'chế biến': ['processing', 'manufacturing', 'production', 'industrial'],
    'điều dưỡng': ['nursing', 'patient care', 'clinical nursing', 'healthcare'],
    'răng hàm mặt': ['dentistry', 'dental', 'oral health', 'orthodontics'],
    'y tế công cộng': ['public health', 'epidemiology', 'health policy', 'preventive medicine'],
};

function expandVietnameseKeywords(text) {
    const expanded = [];
    const lower = (text || '').toLowerCase();
    for (const [vnPhrase, enKeywords] of Object.entries(VN_DOMAIN_KEYWORDS)) {
        if (lower.includes(vnPhrase)) {
            expanded.push(...enKeywords);
        }
    }
    return expanded;
}

async function findRelatedOnetOccupations({
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

    const enKeywords = expandVietnameseKeywords(combinedText);
    const shortFalsePositives = new Set(['tin', 'ban', 'nam', 'can', 'con', 'van', 'dan', 'cap', 'don', 'san', 'man', 'the', 'and', 'for', 'are', 'not', 'all', 'any', 'has', 'had', 'was', 'who']);
    const isEnglish = (w) => /^[a-z0-9]+$/i.test(w) && w.length >= 3 && !shortFalsePositives.has(w.toLowerCase());
    const rawWords = extractKeywords(combinedText).filter(isEnglish);
    const keywords = [...new Set([...enKeywords, ...rawWords])];

    const allWords = [...enKeywords, ...rawWords];
    const bigrams = extractBigrams(allWords);

    let results = [];
    if (keywords.length > 0 || manualIds.size > 0) {
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

        results = allOccupations
            .filter((occ) => occ.riasecScoresJson)
            .map((occ) => {
                const titleLower = occ.title.toLowerCase();
                const titleWords = titleLower.split(/[\s,/()-]+/).filter((w) => w.length >= 4);
                const skillText = (occ.topSkillsJson || '').toLowerCase();
                const knowledgeText = (occ.topKnowledgeJson || '').toLowerCase();
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
                        const wordRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (wordRegex.test(titleLower)) score += 5;
                        if (wordRegex.test(skillText)) score += 2;
                        if (wordRegex.test(knowledgeText)) score += 1.5;
                        if (wordRegex.test(descText)) score += 0.5;
                    } else {
                        if (titleLower.includes(kw)) score += 5;
                        else if (titleWords.some((tw) => tw.includes(kw) || kw.includes(tw))) score += 3;
                        if (skillText.includes(kw)) score += 2;
                        if (knowledgeText.includes(kw)) score += 1.5;
                        if (descText.includes(kw)) score += 0.5;
                    }
                }

                return { occ, score, isManualLink: manualIds.has(occ.id) };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    return results.map(({ occ, score, isManualLink }) => {
        const rawRiasec = safeJsonParse(occ.riasecScoresJson);
        const normalizedRiasec = rawRiasec
            ? Object.fromEntries(DIMS.map((d) => [d, Math.round(normalizeOnetRiasec(rawRiasec[d] ?? 0))]))
            : null;

        return {
            onetCode: occ.onetCode,
            title: occ.title,
            hollandCode: occ.hollandCode,
            riasec: normalizedRiasec,
            topSkills: safeJsonParse(occ.topSkillsJson, []),
            topKnowledge: safeJsonParse(occ.topKnowledgeJson, []),
            relevanceScore: Math.round(score * 100) / 100,
            matchMethod: 'keyword',
            isManualLink,
        };
    });
}

const ONET_RIASEC_SKILL_CORRELATIONS = {
    R: {
        description: 'Realistic occupations emphasize hands-on, practical, mechanical work',
        strongSkills: ['Equipment Operation', 'Troubleshooting', 'Installation', 'Repairing'],
        weakSkills: ['Social Perceptiveness', 'Persuasion', 'Negotiation'],
        skillPattern: 'detail_orientation: MODERATE-HIGH, problem_solving: MODERATE, programming_orientation: variable, creativity: LOW-MODERATE',
    },
    I: {
        description: 'Investigative occupations emphasize analytical thinking, research, and problem-solving',
        strongSkills: ['Critical Thinking', 'Science', 'Mathematics', 'Reading Comprehension', 'Complex Problem Solving'],
        weakSkills: ['Persuasion', 'Service Orientation'],
        skillPattern: 'critical_thinking: HIGH, problem_solving: HIGH, programming_orientation: variable, creativity: MODERATE',
    },
    A: {
        description: 'Artistic occupations emphasize creative expression, design, and originality',
        strongSkills: ['Active Listening', 'Speaking', 'Writing', 'Reading Comprehension'],
        weakSkills: ['Equipment Maintenance', 'Troubleshooting', 'Installation'],
        skillPattern: 'creativity: HIGH, communication: HIGH, programming_orientation: LOW, detail_orientation: MODERATE',
    },
    S: {
        description: 'Social occupations emphasize helping, teaching, and interpersonal interaction',
        strongSkills: ['Social Perceptiveness', 'Active Listening', 'Speaking', 'Service Orientation', 'Instructing'],
        weakSkills: ['Equipment Maintenance', 'Troubleshooting', 'Operation and Control'],
        skillPattern: 'communication: HIGH, teamwork: HIGH, leadership: MODERATE-HIGH, programming_orientation: LOW',
    },
    E: {
        description: 'Enterprising occupations emphasize leadership, persuasion, and business',
        strongSkills: ['Persuasion', 'Negotiation', 'Management of Personnel Resources', 'Coordination'],
        weakSkills: ['Equipment Maintenance', 'Science', 'Mathematics'],
        skillPattern: 'leadership: HIGH, communication: HIGH, teamwork: MODERATE-HIGH, creativity: MODERATE',
    },
    C: {
        description: 'Conventional occupations emphasize data management, organization, and procedures',
        strongSkills: ['Mathematics', 'Active Listening', 'Reading Comprehension', 'Time Management'],
        weakSkills: ['Science', 'Technology Design'],
        skillPattern: 'detail_orientation: HIGH, critical_thinking: MODERATE, programming_orientation: LOW-MODERATE, creativity: LOW',
    },
};

function buildOnetExemplarSection(relatedOccupations, { correlationMatrix = null } = {}) {
    if (!relatedOccupations || relatedOccupations.length === 0) return '';

    const lines = [
        '',
        '## O*NET Occupational Learning Examples (U.S. Department of Labor, v30.2, n=997 occupations)',
        '',
        'IMPORTANT: Study these real-world occupational profiles to understand how RIASEC dimensions',
        'correlate with specific skills in practice. Your curriculum analysis should follow the SAME',
        'logical patterns. These are empirical facts, not opinions.',
        '',
        '### RIASEC→Skill Correlation Patterns (derived from O*NET v30.2 occupations)',
    ];

    for (const dim of DIMS) {
        const corr = ONET_RIASEC_SKILL_CORRELATIONS[dim];
        lines.push(`${dim} (${corr.description}):`);
        lines.push(`  Strong skills: ${corr.strongSkills.join(', ')}`);
        lines.push(`  Weak skills: ${corr.weakSkills.join(', ')}`);
        lines.push(`  → Maps to skill vector: ${corr.skillPattern}`);

        if (correlationMatrix && correlationMatrix[dim]) {
            const sorted = Object.entries(correlationMatrix[dim])
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .slice(0, 6);
            if (sorted.length > 0) {
                const corrStr = sorted.map(([skill, r]) => `${skill}(r=${r})`).join(', ');
                lines.push(`  ► Pearson correlations (O*NET v30.2): ${corrStr}`);
            }
        }
    }

    lines.push('');
    lines.push('### Related Occupational Profiles (matched by curriculum keywords)');
    lines.push('Use these as calibration references. Your program scores should be similar');
    lines.push('to these occupations IF the curriculum content is similar. If the Vietnamese');
    lines.push('curriculum adds or removes topics compared to these occupations, adjust accordingly.');
    lines.push('');

    for (const occ of relatedOccupations) {
        lines.push(`#### ${occ.title} (${occ.onetCode}) — Holland: ${occ.hollandCode || 'N/A'}`);

        if (occ.riasec) {
            const riasecStr = DIMS.map((d) => `${d}:${occ.riasec[d] ?? 0}`).join(', ');
            lines.push(`  RIASEC (0-100 scale, normalized from O*NET OI 1-7): ${riasecStr}`);
        }

        if (occ.topSkills && occ.topSkills.length > 0) {
            const skillStr = occ.topSkills
                .slice(0, 6)
                .map((s) => `${s.name || s.element}(${s.score ?? s.value ?? '?'})`)
                .join(', ');
            lines.push(`  Top Skills: ${skillStr}`);
        }

        if (occ.topKnowledge && occ.topKnowledge.length > 0) {
            const knowledgeStr = occ.topKnowledge
                .slice(0, 5)
                .map((k) => `${k.name || k.element}(${k.score ?? k.value ?? '?'})`)
                .join(', ');
            lines.push(`  Top Knowledge: ${knowledgeStr}`);
        }

        if (occ.isManualLink) {
            lines.push('  ★ MANUALLY LINKED — this occupation was verified as directly relevant by an expert.');
        }

        lines.push('');
    }

    lines.push('### How to Use These Examples');
    lines.push('1. Identify which O*NET occupations are most similar to graduates of this Vietnamese program.');
    lines.push('2. Use their RIASEC profiles as baseline (±15 points per dimension on 0-100 scale).');
    lines.push('3. Use their skill profiles to understand what skills are typical for this field.');
    lines.push('4. Adjust based on specific curriculum content: if the Vietnamese program teaches');
    lines.push('   additional topics not in the O*NET occupation, increase relevant scores.');
    lines.push('   If the program omits topics, decrease scores.');
    lines.push('5. For EMERGING programs (semiconductor, multimedia, content creation):');
    lines.push('   combine profiles from multiple related occupations weighted by relevance.');

    return lines.join('\n');
}

async function computeRiasecSkillCorrelationMatrix() {
    const occupations = await prisma.onetOccupation.findMany({
        where: { riasecScoresJson: { not: null }, topSkillsJson: { not: null } },
        select: { riasecScoresJson: true, topSkillsJson: true },
    });

    const skillNames = new Set();
    const dataPoints = [];

    for (const occ of occupations) {
        const riasec = safeJsonParse(occ.riasecScoresJson);
        const skills = safeJsonParse(occ.topSkillsJson, []);
        if (!riasec || skills.length === 0) continue;

        const skillMap = {};
        for (const s of skills) {
            const name = s.name || s.element;
            if (name) {
                skillNames.add(name);
                skillMap[name] = Number(s.score || s.value || 0);
            }
        }

        dataPoints.push({ riasec, skills: skillMap });
    }

    const matrix = {};
    for (const dim of DIMS) {
        matrix[dim] = {};
        for (const skill of skillNames) {
            const pairs = dataPoints
                .filter((dp) => dp.riasec[dim] != null && dp.skills[skill] != null)
                .map((dp) => [Number(dp.riasec[dim]), dp.skills[skill]]);

            if (pairs.length < 10) continue;

            const r = pearsonCorrelation(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
            if (Math.abs(r) >= 0.15) {
                matrix[dim][skill] = Math.round(r * 1000) / 1000;
            }
        }
    }

    return { matrix, occupationCount: dataPoints.length, skillCount: skillNames.size };
}

function pearsonCorrelation(x, y) {
    const n = x.length;
    if (n < 3) return 0;

    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        sumXY += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
    }

    const denom = Math.sqrt(sumX2 * sumY2);
    return denom > 0 ? sumXY / denom : 0;
}

module.exports = {
    findRelatedOnetOccupations,
    buildOnetExemplarSection,
    computeRiasecSkillCorrelationMatrix,
    ONET_RIASEC_SKILL_CORRELATIONS,
    extractKeywords,
    extractBigrams,
    expandVietnameseKeywords,
};
