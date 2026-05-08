
const RULES = [
    ['cntt',         /\b(computer|software|comput\w*|it\b|information system\w*|information secur\w*|information tech\w*|cyber|data scien|data scientist|machine learn|artificial intelligence|\bai\b|programming|công nghệ thông tin|tin học|phần mềm|trí tuệ nhân tạo|khoa học dữ liệu|khoa học máy tính|mạng máy tính|network\w*)\b/gi],
    ['y_duoc',       /\b(bio\w*|medic\w*|health|pharma\w*|clinic\w*|nurs\w*|biomed|y học|y khoa|dược|sinh học|y sinh)\b/gi],
    ['nghe_thuat',   /\b(art\w*|design|architect\w*|music|media|graphic|interior|nghệ thuật|thiết kế|kiến trúc|âm nhạc|mỹ thuật|đồ họa)\b/gi],
    ['nong_nghiep',  /\b(agri\w*|forest\w*|fisher\w*|aquacul\w*|nông nghiệp|lâm nghiệp|thủy sản|chăn nuôi)\b/gi],
    ['luat',         /\b(law|legal|jurisp\w*|luật|pháp lý|pháp luật)\b/gi],
    ['truyen_thong', /\b(communication|journal\w*|broadcast|public relation|báo chí|truyền thông|quảng cáo)\b/gi],
    ['giao_duc',     /\b(education|teach\w*|pedagog\w*|curriculum|sư phạm|giáo dục|giảng dạy)\b/gi],
    ['ky_thuat',     /\b(engineer\w*|mechan\w*|electric\w*|civil|automat\w*|robot\w*|materials|industrial|kỹ thuật|cơ khí|điện tử|tự động hóa|xây dựng)\b/gi],
    ['khoa_hoc',     /\b(physic\w*|mathematic|statistic\w*|chemist\w*|biology|science|toán|vật lý|hóa học|thống kê|khoa học)\b/gi],
    ['kinh_te',      /\b(business|econom\w*|finance|account\w*|market\w*|trade|manag\w*|entrepre\w*|kinh tế|quản trị|tài chính|kế toán|marketing|thương mại|quản lý)\b/gi],
    ['xa_hoi',       /\b(social|psycholog\w*|sociolog\w*|anthropol\w*|history|polit\w*|international relation|xã hội|tâm lý|chính trị|quan hệ quốc tế|nhân học)\b/gi],
    ['du_lich',      /\b(touris\w*|hospital\w*|hotel|travel|leisure|du lịch|khách sạn|nhà hàng|lữ hành)\b/gi],
    ['the_thao',     /\b(sport\w*|athlet\w*|physical education|fitness|coach\w*|thể thao|thể dục|huấn luyện viên)\b/gi],
];

const MAX_TAGS = 3;

function autoTagDomain({ name = '', summary = '', keyCourses = [] } = {}) {
    const courses = Array.isArray(keyCourses)
        ? keyCourses
            .map((c) => (typeof c === 'string' ? c : c?.name || c?.title || ''))
            .filter(Boolean)
            .join(' ')
        : '';
    const haystack = `${name} ${summary || ''} ${courses}`;
    if (!haystack.trim()) return [];

    const nameOnly = name || '';
    const scores = [];
    for (const [tag, regex] of RULES) {
        const allMatches = haystack.match(regex) || [];
        const nameMatches = nameOnly.match(regex) || [];
        const score = allMatches.length + nameMatches.length * 2;
        if (score > 0) scores.push({ tag, score, inName: nameMatches.length > 0 });
    }
    scores.sort((a, b) => b.score - a.score);
    if (scores.length === 0) return [];

    const SECONDARY_MIN_SCORE = 2;
    const SECONDARY_MIN_RATIO = 0.5;
    const primary = scores[0];
    const accepted = [primary];
    for (let i = 1; i < scores.length && accepted.length < MAX_TAGS; i++) {
        const s = scores[i];
        if (s.score < SECONDARY_MIN_SCORE && !s.inName) continue;
        if (s.score < primary.score * SECONDARY_MIN_RATIO) continue;
        accepted.push(s);
    }
    return accepted.map((s) => s.tag);
}

function autoTagProgramRow(row) {
    let courses = [];
    try {
        courses = row.keyCoursesJson ? JSON.parse(row.keyCoursesJson) : [];
    } catch {
        courses = [];
    }
    return autoTagDomain({
        name: row.name,
        summary: row.summary,
        keyCourses: courses,
    });
}

module.exports = {
    autoTagDomain,
    autoTagProgramRow,
    RULES,
};
