
const path = require('path');
const fs = require('fs');
const { tokenize, cosineSimilarity } = require('./similaritySearch');

const ONET_DATA_PATH = path.join(__dirname, '../../../data/onet/onetOccupations.json');

let _cache = null;

const PROFESSIONAL_PREFIXES = ['11-', '13-', '15-', '17-', '19-', '21-', '23-', '27-', '29-'];

function isProfessionalOccupation(code) {
    if (!code) return false;
    if (PROFESSIONAL_PREFIXES.some(p => code.startsWith(p))) return true;
    if (code.startsWith('25-1')) return true;
    return false;
}

function buildIndex() {
    const onetData = JSON.parse(fs.readFileSync(ONET_DATA_PATH, 'utf8'));

    const occupations = onetData.filter(o =>
        o.description
        && o.description.length >= 30
        && isProfessionalOccupation(o.onetCode),
    );

    const documents = occupations.map(o => {
        const titleBoost = `${o.title} ${o.title} ${o.title}`;
        const skills = (o.topSkills || []).map(s => s.name).join(' ');
        const knowledge = (o.topKnowledge || []).map(k => k.name).join(' ');
        return `${titleBoost} ${o.description} ${skills} ${knowledge}`;
    });

    const tokenLists = documents.map(d => tokenize(d));
    const avgDocLength = tokenLists.reduce((s, t) => s + t.length, 0) / tokenLists.length;

    const tfMaps = tokenLists.map(tokens => computeTF(tokens, avgDocLength));

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

    const vectors = tfMaps.map(tf => {
        const vec = new Map();
        for (const [term, tfScore] of tf) {
            vec.set(term, tfScore * (idf.get(term) || 0));
        }
        return vec;
    });

    return { occupations, vectors, idf, avgDocLength };
}

function computeTF(tokens, avgDocLength) {
    const freq = new Map();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    const len = tokens.length || 1;
    const k1 = 1.2;
    const b = 0.75;
    for (const [term, count] of freq) {
        const tf = (count * (k1 + 1)) / (count + k1 * (1 - b + b * (len / avgDocLength)));
        freq.set(term, tf);
    }
    return freq;
}

function getIndex() {
    if (!_cache) _cache = buildIndex();
    return _cache;
}

function retrieveCandidateOccupations({
    curriculumText,
    programName = '',
    focusArea = '',
    topK = 25,
}) {
    const index = getIndex();

    const fieldBoost = `${programName} ${focusArea} ${focusArea} ${focusArea}`;
    const queryText = `${fieldBoost} ${curriculumText || ''}`;
    const queryTokens = tokenize(queryText);

    if (queryTokens.length === 0) return [];

    const queryTF = computeTF(queryTokens, index.avgDocLength);
    const queryVec = new Map();
    for (const [term, tfScore] of queryTF) {
        queryVec.set(term, tfScore * (index.idf.get(term) || 0));
    }

    const scored = index.occupations.map((occ, i) => ({
        code: occ.onetCode,
        title: occ.title,
        description: occ.description,
        similarity: cosineSimilarity(queryVec, index.vectors[i]),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
}

function resetCache() {
    _cache = null;
}

module.exports = {
    retrieveCandidateOccupations,
    resetCache,
};
