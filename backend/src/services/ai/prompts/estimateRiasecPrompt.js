
const ESTIMATE_RIASEC_PROMPT_VERSION = 'estimate-riasec-v1';

const RIASEC_DIMENSION_REFERENCE = [
    'R (Realistic): Hands-on technical work, hardware, lab, engineering, building systems',
    'I (Investigative): Research, analysis, problem-solving, algorithms, theory, mathematics',
    'A (Artistic): Design, creativity, UX/UI, multimedia, visual communication',
    'S (Social): Teaching, teamwork, communication, mentoring, community interaction',
    'E (Enterprising): Leadership, management, entrepreneurship, project management, strategy',
    'C (Conventional): Data organization, procedures, quality assurance, compliance, systematic processes',
].join('\n');

function buildEstimateRiasecPrompt({
    programName,
    universityName,
    degreeLevel = 'Bachelor',
    focusArea = '',
    curriculumText,
    anchorPrograms,
    partialOccupations = [],
}) {
    const systemPrompt = [
        'You are a curriculum analyst for a Vietnamese university career guidance system.',
        'Your task: ESTIMATE RIASEC scores for a new program by learning from similar programs that already have validated profiles.',
        '',
        '## Background',
        '',
        'RIASEC (Holland codes) measures 6 career interest dimensions, scored 0-100.',
        'Normally, programs are mapped to O*NET occupations and RIASEC is computed from occupation data.',
        'However, this program could not be fully matched to O*NET occupations.',
        'You must estimate RIASEC by analyzing the curriculum AND comparing with similar programs.',
        '',
        '## RIASEC Dimensions',
        '',
        RIASEC_DIMENSION_REFERENCE,
        '',
        '## Rules (STRICT)',
        '',
        '1. Your estimate MUST be informed by the anchor programs — they are your ground truth.',
        '2. Scores should be in the range 0-100. Use the anchor scores as calibration points.',
        '3. If the new program is very similar to an anchor, scores should be close to that anchor.',
        '4. If the new program differs from anchors in specific areas, explain WHY scores differ.',
        '5. Provide reasoning for EACH dimension — cite specific courses or objectives.',
        '6. Do NOT inflate scores — most programs score 20-80 per dimension, not 90-100.',
        '7. Use Vietnamese course name knowledge to interpret the curriculum correctly.',
        '8. Your confidence should reflect how much evidence exists (more courses = higher confidence).',
        '9. If the curriculum is too short or vague, set confidence below 50.',
        '',
        '## Vietnamese Course Name Reference',
        '',
        '"Cấu trúc dữ liệu" = Data Structures, "Đồ án" = Capstone/Project,',
        '"Thực tập" = Internship, "Trí tuệ nhân tạo" = AI,',
        '"An toàn thông tin" = Information Security, "Mạng máy tính" = Computer Networks,',
        '"Cơ sở dữ liệu" = Database, "Lập trình" = Programming,',
        '"Hệ điều hành" = Operating Systems, "Công nghệ phần mềm" = Software Engineering,',
        '"Xử lý ảnh" = Image Processing, "Học máy" = Machine Learning,',
        '"Phân tích dữ liệu" = Data Analysis, "Quản trị kinh doanh" = Business Administration,',
        '"Marketing" = Marketing, "Kế toán" = Accounting, "Tài chính" = Finance',
        '',
        '## Output Format',
        '',
        'Return ONLY valid JSON. No markdown fences. No extra text.',
    ].join('\n');

    const anchorSection = anchorPrograms
        .map((a, i) => {
            const r = a.profile?.riasecScores || {};
            return [
                `### Anchor ${i + 1}: ${a.name} (${a.code})`,
                `Similarity to new program: ${(a.similarity * 100).toFixed(1)}%`,
                `RIASEC: R=${r.R || 0}  I=${r.I || 0}  A=${r.A || 0}  S=${r.S || 0}  E=${r.E || 0}  C=${r.C || 0}`,
                `Holland Code: ${a.profile?.hollandCode || 'N/A'}`,
            ].join('\n');
        })
        .join('\n\n');

    let partialSection = '';
    if (partialOccupations.length > 0) {
        partialSection = [
            '',
            '## Partially Matched O*NET Occupations (from initial analysis)',
            'These occupations were found to partially match this program:',
            ...partialOccupations.map(o => `- ${o.onetCode} | ${o.title} (${o.relevanceLevel})`),
            'Use these as additional signals for your estimate.',
        ].join('\n');
    }

    const responseExample = JSON.stringify({
        r_score: 45,
        i_score: 70,
        a_score: 35,
        s_score: 40,
        e_score: 50,
        c_score: 60,
        reasoning: {
            r: 'Moderate hands-on work: 3 lab courses, 1 hardware course',
            i: 'High research focus: similar to Anchor 1 (HCMUS-DS) which has I=80, plus 5 analysis courses',
            a: 'Low creative emphasis: no design or UX courses',
            s: 'Some teamwork: capstone project and internship involve collaboration',
            e: 'Moderate management: includes project management course, similar to Anchor 2',
            c: 'Above average: database and data processing courses suggest systematic work',
        },
        most_similar_anchor: 'HCMUS-DS',
        key_differences: [
            'More business-oriented than HCMUS-DS (has marketing courses)',
            'Less research-heavy than CTU-CSCI (fewer theory courses)',
        ],
        confidence: 65,
    }, null, 2);

    const userPrompt = [
        '## New Program to Analyze',
        `- Name: ${programName}`,
        `- University: ${universityName}`,
        `- Degree: ${degreeLevel}`,
        focusArea ? `- Focus Area: ${focusArea}` : '',
        '',
        '## Similar Programs with Validated RIASEC Profiles (Your Anchors)',
        '',
        anchorSection,
        partialSection,
        '',
        '## Curriculum Text',
        '',
        curriculumText || '(No curriculum text provided)',
        '',
        '## Required JSON Response',
        '',
        responseExample,
    ].filter(Boolean).join('\n');

    return {
        systemPrompt,
        userPrompt,
        promptVersion: ESTIMATE_RIASEC_PROMPT_VERSION,
    };
}

module.exports = {
    buildEstimateRiasecPrompt,
    ESTIMATE_RIASEC_PROMPT_VERSION,
};
