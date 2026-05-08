const CURRICULUM_INTERPRETATION_PROMPT_VERSION = 'curriculum-interpretation-v6';
const CURRICULUM_INTERPRETATION_RESPONSE_VERSION = 'curriculum-interpretation-response-v2';

const FOCUS_AREA_SUB_POOLS = {
    'Computer Science': [
        '15-1252.00', '15-1253.00', '15-1254.00', '15-1251.00',
        '15-1221.00', '15-1211.00', '15-1299.08', '15-2051.00',
        '15-1242.00', '15-1243.00', '15-1244.00', '15-1241.00',
        '11-3021.00', '15-1299.09', '15-2031.00',
    ],
    'Software Engineering': [
        '15-1252.00', '15-1253.00', '15-1254.00', '15-1255.00',
        '15-1299.08', '15-1211.00', '15-1299.09', '15-1251.00',
        '15-1243.00', '15-1242.00', '11-3021.00', '15-1299.01',
    ],
    'Information Systems': [
        '15-1211.00', '15-1243.00', '15-1242.00', '15-1252.00',
        '15-1299.09', '15-1244.00', '11-3021.00', '15-1243.01',
        '15-2031.00', '13-1111.00',
    ],
    'Information Technology': [
        '15-1232.00', '15-1252.00', '15-1244.00', '15-1231.00',
        '15-1211.00', '15-1299.09', '15-1299.01', '11-3021.00',
        '15-1241.00', '15-1212.00',
    ],
    'Data Science': [
        '15-2051.00', '15-2041.00', '15-1243.01', '15-2031.00',
        '15-1221.00', '15-1211.00', '15-1252.00', '15-1242.00',
        '15-1243.00',
    ],
    'Data Science and AI': [
        '15-2051.00', '15-1221.00', '15-2041.00', '15-1243.01',
        '15-2031.00', '15-1252.00', '15-1211.00',
    ],
    'Artificial Intelligence': [
        '15-1221.00', '15-2051.00', '15-1252.00', '15-2031.00',
        '15-2041.00', '15-1299.08', '15-1243.01',
    ],
    'Cybersecurity': [
        '15-1212.00', '15-1299.05', '15-1299.04', '15-1299.06',
        '15-1244.00', '15-1241.00', '15-1231.00', '15-1299.08',
        '11-3021.00',
    ],
    'Computer Networking': [
        '15-1244.00', '15-1231.00', '15-1241.00', '15-1212.00',
        '15-1299.05', '15-1232.00', '15-1299.01', '11-3021.00',
    ],
    'Information and Communication Technology': [
        '15-1252.00', '15-1211.00', '15-1299.09', '15-1243.00',
        '15-1221.00', '15-1244.00', '15-1241.00', '11-3021.00',
    ],
    'Global Software Engineering and ICT': [
        '15-1252.00', '15-1211.00', '15-1254.00', '15-1253.00',
        '15-1299.08', '15-1299.09', '11-3021.00',
    ],
    'Machine Learning and Computer Engineering': [
        '17-2061.00', '15-1221.00', '15-1252.00', '15-2051.00',
        '15-1299.08', '15-2031.00',
    ],
    'Hardware and Systems': [
        '17-2061.00', '15-1241.00', '15-1252.00', '15-1299.08',
        '15-1244.00', '11-3021.00',
    ],
    'Electronics and Telecommunications': [
        '17-2061.00', '15-1241.00', '15-1244.00', '15-1252.00',
        '15-1299.08',
    ],
    'Electrical and Information Engineering': [
        '17-2061.00', '15-1252.00', '15-1299.08', '15-1241.00',
    ],
    'Statistics and Data Analytics': [
        '15-2041.00', '15-2051.00', '15-2031.00', '15-1221.00',
        '15-1243.01',
    ],

    'Business Administration': [
        '11-1021.00', '11-2021.00', '11-2022.00', '13-1111.00',
        '13-1161.00', '13-1071.00', '11-3031.00', '13-2011.00',
    ],
    'Finance and Banking': [
        '13-2051.00', '11-3031.00', '13-2052.00', '13-2061.00',
        '13-2011.00', '13-2072.00',
    ],
    'Applied Mathematics and Quantitative Finance': [
        '15-2041.00', '13-2051.00', '15-2031.00', '15-2051.00',
        '13-2052.00',
    ],

    'Biotechnology': [
        '19-1042.00', '19-1021.00', '19-4021.00', '19-1029.00',
        '17-2031.00',
    ],
    'Industrial Engineering': [
        '17-2112.00', '13-1081.00', '11-3071.04', '13-1023.00',
        '11-1021.00',
    ],
    'Logistics and Supply Chain Management': [
        '13-1081.00', '11-3071.04', '13-1023.00', '11-1021.00',
        '17-2112.00',
    ],

    'Civil Engineering': [
        '17-2051.00', '17-2051.01', '17-2051.02', '17-3022.00',
        '47-4011.00', '11-9021.00',
    ],
    'Construction Management': [
        '11-9021.00', '17-2051.00', '47-1011.00', '47-4011.00',
        '17-3022.00',
    ],
    'Industrial and Systems Engineering': [
        '17-2112.00', '17-2112.03', '13-1081.00', '11-3071.04',
        '13-1023.00', '11-1021.00',
    ],
    'Space Engineering': [
        '17-2011.00', '17-2061.00', '17-2199.05', '17-2199.00',
    ],
    'Aerospace Engineering': [
        '17-2011.00', '17-2199.05', '17-2199.08', '17-2199.00',
        '17-2061.00',
    ],
    'Industrial Maintenance': [
        '17-2112.00', '17-2112.03', '17-3024.00', '17-2199.05',
        '47-1011.00',
    ],
    'Fashion and Garment Technology': [
        '27-1022.00', '51-6052.00', '27-1024.00', '13-1161.00',
    ],
    'Petroleum Engineering': [
        '17-2171.00', '17-2041.00', '17-2081.00', '19-2041.00',
    ],
    'Nuclear Engineering': [
        '17-2161.00', '17-2041.00', '17-2199.00',
    ],
    'Semiconductor Engineering': [
        '17-2072.00', '17-2061.00', '17-2199.05', '17-2199.06',
        '17-2199.00',
    ],
    'Chemistry - Biochemistry': [
        '19-1021.00', '19-1042.00', '17-2041.00', '19-4021.00',
        '19-2041.00',
    ],
    'Environmental Engineering': [
        '17-2081.00', '19-2041.00', '19-2041.01', '17-2041.00',
        '17-2051.02',
    ],
    'Accounting': [
        '13-2011.00', '13-2082.00', '11-3031.00', '13-2061.00',
        '13-1111.00',
    ],
    'Marketing': [
        '11-2021.00', '11-2022.00', '13-1161.00', '13-1161.01',
        '13-1111.00', '11-1021.00',
    ],
    'Economics': [
        '19-3011.00', '13-2051.00', '13-2052.00', '15-2041.00',
        '15-2031.00',
    ],
    'English Language': [
        '25-1124.00', '27-3091.00', '27-3023.00',
    ],
    'Food Technology': [
        '19-1012.00', '19-4099.01', '17-2041.00', '19-1042.00',
    ],
    'Chemical Engineering': [
        '17-2041.00', '17-2081.00', '19-1012.00', '19-4099.01',
        '19-1021.00',
    ],
    'Control and Automation Engineering': [
        '17-2199.05', '17-2199.08', '17-3024.00', '17-2112.00',
        '17-2061.00', '17-2072.00',
    ],
};

const REFERENCE_POOL = [
    { code: '15-1252.00', title: 'Software Developers' },
    { code: '15-1253.00', title: 'Software Quality Assurance Analysts and Testers' },
    { code: '15-1254.00', title: 'Web Developers' },
    { code: '15-1255.00', title: 'Web and Digital Interface Designers' },
    { code: '15-1211.00', title: 'Computer Systems Analysts' },
    { code: '15-1212.00', title: 'Information Security Analysts' },
    { code: '15-1221.00', title: 'Computer and Information Research Scientists' },
    { code: '15-1231.00', title: 'Computer Network Support Specialists' },
    { code: '15-1232.00', title: 'Computer User Support Specialists' },
    { code: '15-1241.00', title: 'Computer Network Architects' },
    { code: '15-1242.00', title: 'Database Administrators' },
    { code: '15-1243.00', title: 'Database Architects' },
    { code: '15-1244.00', title: 'Network and Computer Systems Administrators' },
    { code: '15-1251.00', title: 'Computer Programmers' },
    { code: '15-1299.01', title: 'Web Administrators' },
    { code: '15-1299.04', title: 'Penetration Testers' },
    { code: '15-1299.05', title: 'Information Security Engineers' },
    { code: '15-1299.06', title: 'Digital Forensics Analysts' },
    { code: '15-1299.07', title: 'Blockchain Engineers' },
    { code: '15-1299.08', title: 'Computer Systems Engineers/Architects' },
    { code: '15-1299.09', title: 'Information Technology Project Managers' },
    { code: '15-2031.00', title: 'Operations Research Analysts' },
    { code: '15-2051.00', title: 'Data Scientists' },
    { code: '15-2041.00', title: 'Statisticians' },
    { code: '15-1243.01', title: 'Data Warehousing Specialists' },
    { code: '11-3021.00', title: 'Computer and Information Systems Managers' },
    { code: '17-2061.00', title: 'Computer Hardware Engineers' },

    { code: '13-1111.00', title: 'Management Analysts' },
    { code: '13-1161.00', title: 'Market Research Analysts and Marketing Specialists' },
    { code: '11-1021.00', title: 'General and Operations Managers' },
    { code: '11-2021.00', title: 'Marketing Managers' },
    { code: '11-2022.00', title: 'Sales Managers' },
    { code: '11-3031.00', title: 'Financial Managers' },
    { code: '13-1071.00', title: 'Human Resources Specialists' },

    { code: '13-2011.00', title: 'Accountants and Auditors' },
    { code: '13-2051.00', title: 'Financial and Investment Analysts' },
    { code: '13-2052.00', title: 'Personal Financial Advisors' },
    { code: '13-2061.00', title: 'Financial Examiners' },
    { code: '13-2072.00', title: 'Loan Officers' },

    { code: '19-1042.00', title: 'Medical Scientists, Except Epidemiologists' },
    { code: '19-1021.00', title: 'Biochemists and Biophysicists' },
    { code: '19-4021.00', title: 'Biological Technicians' },
    { code: '19-1029.00', title: 'Biological Scientists, All Other' },

    { code: '17-2031.00', title: 'Biomedical Engineers' },

    { code: '19-1012.00', title: 'Food Scientists and Technologists' },
    { code: '19-4099.01', title: 'Quality Control Analysts' },

    { code: '17-2081.00', title: 'Environmental Engineers' },
    { code: '19-2041.00', title: 'Environmental Scientists and Specialists' },

    { code: '17-2112.00', title: 'Industrial Engineers' },
    { code: '13-1081.00', title: 'Logisticians' },
    { code: '11-3071.04', title: 'Supply Chain Managers' },
    { code: '13-1023.00', title: 'Purchasing Agents, Except Wholesale, Retail, and Farm Products' },

    { code: '25-1124.00', title: 'Foreign Language and Literature Teachers, Postsecondary' },
    { code: '27-3091.00', title: 'Interpreters and Translators' },
    { code: '27-3023.00', title: 'News Analysts, Reporters, and Journalists' },

    { code: '23-1011.00', title: 'Lawyers' },
    { code: '23-2011.00', title: 'Paralegals and Legal Assistants' },

    { code: '27-1024.00', title: 'Graphic Designers' },
    { code: '27-1014.00', title: 'Special Effects Artists and Animators' },

    { code: '19-3033.00', title: 'Clinical and Counseling Psychologists' },
    { code: '21-1012.00', title: 'Educational, Guidance, and Career Counselors and Advisors' },

    { code: '17-2051.00', title: 'Civil Engineers' },
    { code: '17-2051.01', title: 'Transportation Engineers' },
    { code: '17-2051.02', title: 'Water/Wastewater Engineers' },
    { code: '17-3022.00', title: 'Civil Engineering Technologists and Technicians' },
    { code: '11-9021.00', title: 'Construction Managers' },
    { code: '47-4011.00', title: 'Construction and Building Inspectors' },
    { code: '47-1011.00', title: 'First-Line Supervisors of Construction Trades and Extraction Workers' },

    { code: '17-2011.00', title: 'Aerospace Engineers' },
    { code: '17-2161.00', title: 'Nuclear Engineers' },
    { code: '17-2171.00', title: 'Petroleum Engineers' },

    { code: '17-2041.00', title: 'Chemical Engineers' },

    { code: '17-2072.00', title: 'Electronics Engineers, Except Computer' },
    { code: '17-2199.05', title: 'Mechatronics Engineers' },
    { code: '17-2199.08', title: 'Robotics Engineers' },
    { code: '17-2199.06', title: 'Microsystems Engineers' },
    { code: '17-2199.00', title: 'Engineers, All Other' },
    { code: '17-3024.00', title: 'Electro-Mechanical and Mechatronics Technologists and Technicians' },
    { code: '17-2112.03', title: 'Manufacturing Engineers' },

    { code: '19-3011.00', title: 'Economists' },

    { code: '13-2082.00', title: 'Tax Preparers' },

    { code: '13-1161.01', title: 'Search Marketing Strategists' },

    { code: '27-1022.00', title: 'Fashion Designers' },
    { code: '51-6052.00', title: 'Tailors, Dressmakers, and Custom Sewers' },
];

function buildCurriculumInterpretationPrompt({
    programName,
    universityName,
    degreeLevel = 'Bachelor',
    focusArea = '',
    curriculumText,
    referencePool,
    dynamicCandidates,
    cipHintsByOnetCode = {},
}) {
    let pool;
    let poolMode;
    if (referencePool) {
        pool = referencePool;
        poolMode = 'explicit';
    } else if (focusArea && FOCUS_AREA_SUB_POOLS[focusArea] && dynamicCandidates && dynamicCandidates.length > 0) {
        const allowedCodes = new Set(FOCUS_AREA_SUB_POOLS[focusArea]);
        const subPool = REFERENCE_POOL.filter(o => allowedCodes.has(o.code));
        const merged = new Map();
        for (const o of subPool) merged.set(o.code, o);
        for (const o of dynamicCandidates) {
            if (!merged.has(o.code)) merged.set(o.code, { code: o.code, title: o.title });
        }
        pool = [...merged.values()];
        poolMode = 'hybrid';
    } else if (focusArea && FOCUS_AREA_SUB_POOLS[focusArea]) {
        const allowedCodes = new Set(FOCUS_AREA_SUB_POOLS[focusArea]);
        pool = REFERENCE_POOL.filter(o => allowedCodes.has(o.code));
        poolMode = 'sub-pool';
    } else if (dynamicCandidates && dynamicCandidates.length > 0) {
        pool = dynamicCandidates.map(o => ({ code: o.code, title: o.title }));
        poolMode = 'dynamic-only';
    } else {
        pool = REFERENCE_POOL;
        poolMode = 'full-fallback';
        if (focusArea) {
            console.warn(`[CurriculumPrompt] No sub-pool or dynamic candidates for focusArea="${focusArea}" — using full REFERENCE_POOL (${pool.length} occupations).`);
        }
    }
    const subPoolUsed = poolMode === 'sub-pool' || poolMode === 'hybrid';

    const systemPrompt = [
        'You are an expert career guidance analyst for a university career guidance system.',
        'Your task: analyze a curriculum document and map it to standardized O*NET occupations.',
        'You do NOT score RIASEC — the system computes that separately.',
        '',
        '## 4-Step Chain-of-Thought Analysis',
        '',
        'You MUST follow these 4 steps IN ORDER. Show your reasoning for each step.',
        '',
        'Step 1 — Establish Framework:',
        '  You will receive a REFERENCE POOL of standardized O*NET occupations.',
        '  This is your ONLY allowed output vocabulary — you MUST map to this pool.',
        '  Do NOT invent new occupations or skills outside this framework.',
        '',
        'Step 2 — Read Specific Curriculum Sections:',
        '  Focus ONLY on these sections in the curriculum text:',
        '  a) Program introduction / career orientation (what careers graduates pursue)',
        '  b) Training objectives / learning outcomes',
        '  c) Specialized and core course list (ignore general education: philosophy, PE, English, national defense)',
        '  d) Capstone projects, internships, elective specializations',
        '  Extract and quote relevant passages from each section found.',
        '',
        'Step 3 — Extract Core Skills and Characteristics:',
        '  From the sections identified in Step 2, extract:',
        '  - 3-5 focus areas (e.g., "machine learning", "financial analysis", "environmental monitoring")',
        '  - Expected career outcomes (what jobs graduates are trained for)',
        '  Each extraction MUST cite evidence directly from the curriculum text.',
        '',
        'Step 4 — Mandatory Mapping to O*NET Framework:',
        '  Map the extracted skills/focus areas to occupations from the REFERENCE POOL.',
        '  For each mapped occupation, provide:',
        '  - relevance_level: primary / strong / moderate / weak',
        '  - cip_alignment: 1-3 CIP codes if provided in REFERENCE POOL line (optional but recommended)',
        '  - evidence: 1-3 snippets quoted from the curriculum',
        '  - reasoning: WHY this occupation matches (connect Step 3 findings to the occupation)',
        '',
        '## Rules (STRICT)',
        '',
        '1. ONLY select occupations from the REFERENCE POOL — do NOT invent new ones.',
        '2. Do NOT return any numeric RIASEC scores.',
        '3. Every suggestion MUST have at least one evidence snippet from the curriculum.',
        '4. If evidence is weak for an occupation, assign "weak" or omit it entirely.',
        '5. If the curriculum lacks sufficient information, return fewer occupations — do NOT guess.',
        '6. Do NOT use general education courses (philosophy, physical education, foreign language basics, national defense) as primary evidence.',
        '7. A "primary" occupation MUST be supported by at least 2 independent curriculum signals.',
        '   If only 1 signal, downgrade to "strong" or "moderate".',
        '8. Prefer occupations that reflect the DOMINANT training pathway, not generic skills.',
        '9. For university-level programs, prefer higher-level occupations over entry-level ones.',
        '10. Return 4-6 suggested occupations. Aim for at least 4 — include secondary/peripheral career paths that the curriculum trains students for, not just the obvious primary one.',
        '11. A single course is NOT sufficient for "strong" — at least 2-3 related courses or a clear specialization track are needed. One introductory course = "weak" at best.',
        '12. Do NOT confuse similar-sounding concepts: "Data Structures" ≠ "Data Warehousing", "Computer Networks" ≠ "Network Security", "Database course" ≠ "Database Administrator career".',
        '13. If a REFERENCE POOL line includes "CIP_HINT", prefer occupations whose CIP hints align with the curriculum training path.',
        '14. If two occupations are similar in evidence, choose the one with clearer CIP_HINT alignment.',
        '',
        '## Vietnamese Academic Term Reference',
        '',
        '"Cấu trúc dữ liệu" = Data Structures',
        '"Đồ án" = Capstone/Project',
        '"Thực tập" = Internship',
        '"Trí tuệ nhân tạo" = Artificial Intelligence',
        '"An toàn thông tin" = Information Security',
        '"Mạng máy tính" = Computer Networks',
        '"Cơ sở dữ liệu" = Database',
        '"Lập trình" = Programming',
        '"Hệ điều hành" = Operating Systems',
        '"Công nghệ phần mềm" = Software Engineering',
        '"Xử lý ảnh" = Image Processing',
        '"Học máy" = Machine Learning',
        '"Phân tích dữ liệu" = Data Analysis',
        '"Kế toán" = Accounting',
        '"Tài chính" = Finance',
        '"Quản trị kinh doanh" = Business Administration',
        '"Marketing" = Marketing',
        '"Logistics" = Logistics',
        '"Sinh học" = Biology',
        '"Hóa sinh" = Biochemistry',
        '"Công nghệ thực phẩm" = Food Technology',
        '"Kỹ thuật môi trường" = Environmental Engineering',
        '"Kỹ thuật công nghiệp" = Industrial Engineering',
        '"Vi mạch bán dẫn" = Semiconductor / VLSI Design',
        '"Truyền thông đa phương tiện" = Multimedia Communication',
        '',
        '## Output Format',
        '',
        'Return ONLY valid JSON. No markdown fences. No extra text.',
    ].join('\n');

    const poolText = pool
        .map((o) => {
            const hints = Array.isArray(cipHintsByOnetCode?.[o.code]) ? cipHintsByOnetCode[o.code].slice(0, 4) : [];
            const hintText = hints.length > 0 ? ` | CIP_HINT: ${hints.join(', ')}` : '';
            return `${o.code} | ${o.title}${hintText}`;
        })
        .join('\n');

    const responseExample = JSON.stringify({
        step2_sections_found: [
            'Program introduction mentions graduates will work in...',
            'Core courses include: ...',
        ],
        focus_areas: ['example: machine learning', 'example: financial analysis'],
        career_outcomes: ['example: data-oriented roles', 'example: financial advisory'],
        suggested_occupations: [
            {
                onet_code: '15-2051.00',
                title: 'Data Scientists',
                relevance_level: 'primary',
                cip_alignment: ['11.0103', '27.0301'],
                evidence: ['curriculum includes Machine Learning and Data Mining courses'],
                reasoning: 'Program trains students in data analysis and ML, directly aligning with Data Scientists role.',
            },
        ],
        notes: 'Brief summary of analysis.',
    }, null, 2);

    const userPrompt = [
        '## Program Information',
        `- Name: ${programName}`,
        `- University: ${universityName}`,
        `- Degree: ${degreeLevel}`,
        focusArea ? `- Focus Area: ${focusArea}` : '',
        '',
        subPoolUsed
            ? `## O*NET REFERENCE POOL (Step 1 — FILTERED for "${focusArea}", ${pool.length} occupations)`
            : '## O*NET REFERENCE POOL (Step 1 — your ONLY allowed occupations)',
        '',
        poolText,
        '',
        '## Curriculum Text (Step 2 — read specific sections from this)',
        '',
        curriculumText || '(No curriculum text provided)',
        '',
        '## Required JSON Response Schema',
        '',
        responseExample,
    ].filter(Boolean).join('\n');

    return {
        systemPrompt,
        userPrompt,
        promptVersion: CURRICULUM_INTERPRETATION_PROMPT_VERSION,
        responseVersion: CURRICULUM_INTERPRETATION_RESPONSE_VERSION,
    };
}

module.exports = {
    buildCurriculumInterpretationPrompt,
    REFERENCE_POOL,
    FOCUS_AREA_SUB_POOLS,
    CURRICULUM_INTERPRETATION_PROMPT_VERSION,
    CURRICULUM_INTERPRETATION_RESPONSE_VERSION,
};
