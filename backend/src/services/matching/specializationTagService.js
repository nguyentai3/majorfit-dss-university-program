const SPECIALIZATION_TAXONOMY = [
    { tag: 'AI/ML', keywords: ['machine learning', 'deep learning', 'artificial intelligence', 'natural language processing', 'nlp', 'reinforcement learning', 'neural network'] },
    { tag: 'Data Science', keywords: ['data mining', 'data warehouse', 'big data', 'data analysis', 'data science', 'statistics', 'statistical', 'probability'] },
    { tag: 'Cybersecurity', keywords: ['security', 'cryptography', 'infosec', 'information security', 'network security', 'cyber'] },
    { tag: 'Networking', keywords: ['computer network', 'routing', 'switching', 'network admin', 'network protocol', 'wireless network', 'network architecture'] },
    { tag: 'Software Engineering', keywords: ['software engineering', 'software testing', 'software quality', 'project management', 'devops', 'software project', 'software development life cycle', 'sdlc', 'agile'] },
    { tag: 'Web/Mobile', keywords: ['web programming', 'web development', 'web application', 'mobile programming', 'mobile application', 'cloud computing', 'web developer'] },
    { tag: 'Hardware/Embedded', keywords: ['computer architecture', 'embedded', 'iot', 'vlsi', 'digital logic', 'microprocessor', 'hardware', 'circuit', 'electronics'] },
    { tag: 'Theory/Research', keywords: ['research methodology', 'graph theory', 'compiler', 'formal method', 'automata', 'computation theory', 'theoretical', 'discrete math'] },
    { tag: 'Graphics/Vision', keywords: ['computer graphics', 'image processing', 'computer vision', 'visualization', 'digital image'] },
];

const RESEARCH_KEYWORDS = ['research', 'theory', 'theoretical', 'academic', 'scientific', 'methodology', 'formal', 'postgraduate'];
const INDUSTRY_KEYWORDS = ['professional', 'industry', 'career', 'practical', 'applied', 'certification', 'accredited', 'enterprise', 'business'];

function countKeywordHits(text, keywords) {
    const lower = text.toLowerCase();
    return keywords.filter(kw => lower.includes(kw)).length;
}

function deriveSpecializationTags(program) {
    const courses = (program.courseList || program.keyCourses || []).join(' ');
    const objectives = (program.objectives || []).join(' ');
    const combinedText = `${courses} ${objectives}`.toLowerCase();

    if (!combinedText.trim()) return [];

    const scored = SPECIALIZATION_TAXONOMY.map(({ tag, keywords }) => {
        const hits = countKeywordHits(combinedText, keywords);
        return { tag, hits };
    })
        .filter(s => s.hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 4);

    return scored.map(s => s.tag);
}

function deriveLearningOrientation(program) {
    const objectives = (program.objectives || []).join(' ');
    const courses = (program.courseList || program.keyCourses || []).join(' ');

    if (!objectives && !courses) return 'Balanced';

    const researchScore = countKeywordHits(objectives, RESEARCH_KEYWORDS) * 2
        + countKeywordHits(courses, RESEARCH_KEYWORDS);
    const industryScore = countKeywordHits(objectives, INDUSTRY_KEYWORDS) * 2
        + countKeywordHits(courses, INDUSTRY_KEYWORDS);

    if (researchScore >= 4 && researchScore > industryScore * 1.5) return 'Research-Oriented';
    if (industryScore >= 4 && industryScore > researchScore * 1.5) return 'Industry-Applied';
    return 'Balanced';
}

function buildSpecializationMeta(program) {
    const courseList = program.curriculum?.courseList
        || program.latestCurriculum?.courseList
        || program.keyCourses
        || [];
    const objectives = program.curriculum?.objectives
        || program.latestCurriculum?.objectives
        || [];

    const normalized = { courseList, objectives };

    return {
        specializationTags: deriveSpecializationTags(normalized),
        learningOrientation: deriveLearningOrientation(normalized),
    };
}

module.exports = {
    deriveSpecializationTags,
    deriveLearningOrientation,
    buildSpecializationMeta,
    SPECIALIZATION_TAXONOMY,
};
