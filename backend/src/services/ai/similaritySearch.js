
const STOPWORDS = new Set([
    'và', 'của', 'cho', 'các', 'này', 'là', 'có', 'được', 'trong', 'với',
    'một', 'những', 'về', 'đã', 'để', 'từ', 'theo', 'trên', 'không', 'tại',
    'cũng', 'như', 'hay', 'hoặc', 'khi', 'đến', 'bằng', 'sau', 'qua', 'nhiều',
    'còn', 'rất', 'nên', 'thì', 'lại', 'đó', 'nào', 'mà', 'vì', 'nếu',
    'ai', 'gì', 'ấy', 'đây', 'kia', 'hơn', 'lên', 'ra', 'vào', 'bị',
    'sinh', 'viên', 'học', 'phần', 'tín', 'chỉ', 'môn', 'ngành',
    'tài', 'liệu', 'năng', 'lực',
    'stt', 'mã', 'hp', 'tên', 'số', 'tc', 'lt', 'th',
    'tổng', 'cộng', 'trước',
    'tỷ', 'lệ', 'khối',
    'tối', 'thiểu', 'tối', 'đa',
    'lũy', 'tích',
    'bắt', 'buộc', 'tự', 'chọn',
    'nhóm', 'mục', 'chi', 'tiết',
    'hình', 'thức', 'đánh', 'giá',
    'điều', 'kiện', 'tiên', 'quyết',
    'kiến', 'thức',
    'trình', 'độ', 'cấp',
    'sở', 'ban',
    'khoa', 'khóa', 'lớp',
    'đào', 'tạo', 'đạt', 'chuẩn',
    'quy', 'định', 'chế',
    'tham', 'khảo', 'gia',
    'triết', 'mác', 'lênin', 'tư', 'tưởng', 'hồ', 'chí', 'minh',
    'giáo', 'dục', 'quốc', 'phòng', 'an', 'ninh',
    'pháp', 'luật', 'đại', 'cương',
    'thể', 'chất',
    'tiếng', 'anh', 'ngoại', 'ngữ',
    'giao', 'tiếp', 'thuyết', 'trình',
    'đồ', 'án', 'tốt', 'nghiệp', 'luận',
    'thực', 'tập', 'doanh', 'nghiệp',
    'chứng', 'nhận', 'cấp',
    'phát', 'triển', 'bền', 'vững',
    'thiết', 'yếu', 'cần',
    'nhập', 'nâng',
    'toán', 'xác', 'suất', 'thống', 'kê', 'giải', 'tích',
    'vật', 'lý',
    'kinh', 'tế', 'chính', 'trị',
    'việt', 'nam',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'with', 'from', 'this', 'that', 'have', 'has',
    'will', 'each', 'make', 'how', 'them', 'than', 'been', 'its', 'who',
    'did', 'get', 'may', 'him', 'his', 'she', 'had', 'into', 'only', 'come',
    'over', 'such', 'also', 'some', 'which', 'when', 'what', 'would', 'there',
    'their', 'about', 'other', 'were', 'more', 'after', 'should', 'could',
    'at', 'of', 'in', 'to', 'on', 'by', 'an', 'or', 'be', 'do', 'if', 'so',
    'no', 'up', 'it', 'is', 'he', 'we', 'my',
    'course', 'courses', 'program', 'student', 'students', 'university',
    'credits', 'credit', 'semester', 'year', 'years', 'study', 'knowledge',
    'education', 'learning', 'teaching', 'training', 'general', 'introduction',
    'basic', 'advanced', 'special', 'topics', 'national', 'defense', 'security',
    'philosophy', 'marxism', 'leninism', 'thought', 'political', 'theory',
    'physical', 'english', 'foreign', 'language', 'certificate',
    'thesis', 'graduation', 'internship', 'capstone', 'project',
    'essential', 'skills', 'sustainable', 'development',
    'mathematics', 'calculus', 'statistics', 'probability', 'algebra', 'physics',
    'required', 'elective', 'prerequisite', 'total', 'module', 'modules',
    'department', 'faculty', 'degree', 'bachelor', 'master', 'objective',
    'objectives', 'outcome', 'outcomes', 'ability', 'able',
]);


const BILINGUAL_MAP = [
    ['máy_tính', 'computer'],
    ['khoa_học', 'science'],
    ['công_nghệ', 'technology'],
    ['thông_tin', 'information'],
    ['bảo_mật', 'security'],
    ['an_toàn', 'security safety'],
    ['an_ninh_mạng', 'cybersecurity'],
    ['phần_mềm', 'software'],
    ['lập_trình', 'programming'],
    ['mạng_máy', 'network computer'],
    ['mạng', 'network'],
    ['hệ_thống', 'system'],
    ['cơ_sở_dữ_liệu', 'database'],
    ['dữ_liệu', 'data'],
    ['trí_tuệ_nhân_tạo', 'artificial intelligence'],
    ['trí_tuệ', 'intelligence'],
    ['nhân_tạo', 'artificial'],
    ['học_máy', 'machine learning'],
    ['thuật_toán', 'algorithm'],
    ['hệ_điều_hành', 'operating system'],
    ['điện_toán_đám_mây', 'cloud computing'],
    ['điện_toán', 'computing'],
    ['xử_lý', 'processing'],
    ['tín_hiệu', 'signal'],
    ['xử_lý_ảnh', 'image processing'],
    ['web', 'web'],
    ['internet', 'internet'],
    ['robot', 'robot robotics'],
    ['tự_động', 'automation automatic'],

    ['kỹ_thuật', 'engineering'],
    ['điện_tử', 'electronics'],
    ['viễn_thông', 'telecommunications'],
    ['cơ_khí', 'mechanical'],
    ['cơ_điện_tử', 'mechatronics'],
    ['xây_dựng', 'construction civil'],
    ['kiến_trúc', 'architecture'],
    ['môi_trường', 'environment environmental'],
    ['năng_lượng', 'energy'],
    ['vật_liệu', 'materials'],
    ['điện', 'electrical'],
    ['thi_công', 'construction'],
    ['thiết_kế', 'design'],

    ['quản_trị', 'management administration'],
    ['kinh_doanh', 'business'],
    ['tài_chính', 'finance financial'],
    ['ngân_hàng', 'banking'],
    ['kế_toán', 'accounting'],
    ['kiểm_toán', 'auditing'],
    ['thương_mại', 'commerce trade'],
    ['logistics', 'logistics'],
    ['chuỗi_cung', 'supply chain'],
    ['nhân_sự', 'human resources'],
    ['du_lịch', 'tourism hospitality'],
    ['khách_sạn', 'hotel hospitality'],
    ['tiếp_thị', 'marketing'],

    ['sinh_học', 'biology biological'],
    ['hóa_học', 'chemistry chemical'],
    ['công_nghệ_sinh', 'biotechnology'],
    ['dược', 'pharmacy pharmaceutical'],
    ['y_học', 'medicine medical'],
    ['điều_dưỡng', 'nursing'],
    ['nha_khoa', 'dentistry dental'],
    ['dinh_dưỡng', 'nutrition'],
    ['thú_y', 'veterinary'],
    ['nông_nghiệp', 'agriculture'],
    ['thủy_sản', 'aquaculture fisheries'],
    ['trồng_trọt', 'agronomy crop'],
    ['chăn_nuôi', 'animal husbandry'],

    ['luật', 'law legal'],
    ['tâm_lý', 'psychology'],
    ['xã_hội', 'social society'],
    ['sư_phạm', 'pedagogy education'],
    ['ngôn_ngữ', 'language linguistics'],
    ['văn_học', 'literature'],
    ['mỹ_thuật', 'art design'],
    ['truyền_thông', 'media communication'],
    ['báo_chí', 'journalism'],
];

const _viToEn = new Map();
const _enToVi = new Map();
for (const [vi, en] of BILINGUAL_MAP) {
    const enTokens = en.split(/\s+/);
    _viToEn.set(vi, enTokens);
    for (const e of enTokens) {
        if (!_enToVi.has(e)) _enToVi.set(e, []);
        _enToVi.get(e).push(vi);
    }
}

function tokenize(text) {
    if (!text) return [];
    const words = text
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^a-zà-ỹ0-9\s]/gi, ' ')
        .replace(/\b[a-z]{2,5}\d{3,}\b/gi, ' ')
        .replace(/\b\d+\b/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2 && !STOPWORDS.has(t));

    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
        bigrams.push(words[i] + '_' + words[i + 1]);
    }

    const trigrams = [];
    for (let i = 0; i < words.length - 2; i++) {
        trigrams.push(words[i] + '_' + words[i + 1] + '_' + words[i + 2]);
    }

    const translations = [];
    for (const bg of bigrams) {
        const en = _viToEn.get(bg);
        if (en) translations.push(...en, ...en);
    }
    for (const tg of trigrams) {
        const en = _viToEn.get(tg);
        if (en) translations.push(...en, ...en);
    }
    for (const w of words) {
        const en = _viToEn.get(w);
        if (en) translations.push(...en);
        const vi = _enToVi.get(w);
        if (vi) translations.push(...vi);
    }

    return [...words, ...bigrams, ...bigrams, ...translations];
}

function buildFieldBoostTokens(program) {
    const parts = [];
    if (program.name) parts.push(program.name);
    if (program.profile?.hollandCode) parts.push(program.profile.hollandCode);
    const raw = parts.join(' ').toLowerCase()
        .replace(/[^a-zà-ỹ0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2 && !STOPWORDS.has(t));
    return [...raw, ...raw, ...raw];
}

function computeTF(tokens, avgDocLength = null) {
    const freq = new Map();
    for (const t of tokens) {
        freq.set(t, (freq.get(t) || 0) + 1);
    }
    const len = tokens.length || 1;
    const k1 = 1.2;
    const b = 0.75;
    const avgDL = avgDocLength || len;
    for (const [term, count] of freq) {
        const tf = (count * (k1 + 1)) / (count + k1 * (1 - b + b * (len / avgDL)));
        freq.set(term, tf);
    }
    return freq;
}

function computeIDF(tfMaps) {
    const docCount = tfMaps.length;
    const docFreq = new Map();
    for (const tf of tfMaps) {
        for (const term of tf.keys()) {
            docFreq.set(term, (docFreq.get(term) || 0) + 1);
        }
    }
    const idf = new Map();
    for (const [term, df] of docFreq) {
        idf.set(term, Math.log((docCount + 1) / (df + 1)) + 1);
    }
    return idf;
}

function buildTfIdfVector(tf, idf) {
    const vec = new Map();
    for (const [term, tfScore] of tf) {
        const idfScore = idf.get(term) || 0;
        vec.set(term, tfScore * idfScore);
    }
    return vec;
}

function cosineSimilarity(vecA, vecB) {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, a] of vecA) {
        normA += a * a;
        const b = vecB.get(term) || 0;
        if (b) dot += a * b;
    }
    for (const [, b] of vecB) {
        normB += b * b;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

function metadataSimilarity(a, b) {
    const tokA = new Set(tokenize([a.name, a.focusArea].filter(Boolean).join(' ')));
    const tokB = new Set(tokenize([b.name, b.focusArea].filter(Boolean).join(' ')));
    if (tokA.size === 0 || tokB.size === 0) return 0;
    let intersection = 0;
    for (const t of tokA) if (tokB.has(t)) intersection++;
    return intersection / (tokA.size + tokB.size - intersection);
}

function findSimilarPrograms(newCurriculumText, existingPrograms, topK = 3, queryMeta = {}) {
    if (!existingPrograms || existingPrograms.length === 0) return [];

    const hasQueryMeta = Boolean(queryMeta.name || queryMeta.focusArea);

    const metaScores = hasQueryMeta
        ? existingPrograms.map(p => metadataSimilarity(queryMeta, p))
        : existingPrograms.map(() => 0);

    const existingTokens = existingPrograms.map(p => {
        const boost = buildFieldBoostTokens(p);
        return [...boost, ...tokenize(p.curriculumText)];
    });
    const queryBoost = buildFieldBoostTokens(queryMeta);
    const newTokens = [...queryBoost, ...tokenize(newCurriculumText)];

    const allTokenSets = [...existingTokens, newTokens];
    const avgDocLength = allTokenSets.reduce((sum, t) => sum + t.length, 0) / allTokenSets.length;

    const allTFs = existingTokens.map(t => computeTF(t, avgDocLength));
    const newTF = computeTF(newTokens, avgDocLength);
    const idf = computeIDF([...allTFs, newTF]);

    const existingVectors = allTFs.map(tf => buildTfIdfVector(tf, idf));
    const newVector = buildTfIdfVector(newTF, idf);
    const tfidfScores = existingPrograms.map((_, i) => cosineSimilarity(newVector, existingVectors[i]));

    const ALPHA = hasQueryMeta ? 0.5 : 0;
    const scored = existingPrograms.map((p, i) => ({
        code: p.code,
        name: p.name,
        similarity: Math.round((ALPHA * metaScores[i] + (1 - ALPHA) * tfidfScores[i]) * 1000) / 1000,
        profile: p.profile,
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
}

module.exports = {
    findSimilarPrograms,
    tokenize,
    cosineSimilarity,
};
