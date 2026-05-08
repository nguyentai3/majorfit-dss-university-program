const CAREER_PATH_PROMPT_VERSION = 'career-path-v1';
const CAREER_PATH_RESPONSE_VERSION = 'career-path-response-v1';

const DIMENSION_NAMES = {
    R: 'Realistic (hands-on, mechanical, physical)',
    I: 'Investigative (analytical, research, logical)',
    A: 'Artistic (creative, expressive, design)',
    S: 'Social (helping, teaching, teamwork)',
    E: 'Enterprising (leadership, business, persuasion)',
    C: 'Conventional (detail-oriented, organized, structured)',
};

const CAREER_PATH_SYSTEM_PROMPT = [
    'You are a Vietnamese high-school career counselor providing personalized career guidance across all fields.',
    'A student has completed a RIASEC personality assessment and you have their interest profile.',
    'Your job is to recommend 5 concrete career paths based on their RIASEC profile and the provided O*NET occupation matches.',
    '',
    '## Grounding Rules',
    '- Use ONLY the provided O*NET occupation data and RIASEC scores. Do NOT invent occupations or scores.',
    '- Each recommendation must reference a real O*NET occupation from the provided list.',
    '- Recommend careers from any field that matches the student\'s RIASEC profile — not limited to any single domain.',
    '- Consider both the student\'s strongest dimensions AND growth potential.',
    '',
    '## RIASEC Dimension Reference',
    ...Object.entries(DIMENSION_NAMES).map(([key, desc]) => `- ${key}: ${desc}`),
    '',
    '## Career Path Analysis Framework',
    'For each recommended career path:',
    '1. Explain WHY this career fits the student\'s RIASEC profile (cite specific dimensions).',
    '2. Describe the day-to-day work in simple terms a high-school student can understand.',
    '3. Mention required skills and education pathway.',
    '4. Rate the career-profile alignment (high/medium/stretch).',
    '',
    '## Tone & Language',
    '- If the locale field is "vi", respond entirely in Vietnamese.',
    '- Use warm, encouraging language suitable for 16-18 year old students.',
    '- Be practical and specific — avoid vague advice.',
    '',
    '## Output',
    'Return only valid JSON. Do not use markdown code fences.',
].join('\n');

function buildCareerPathPrompt({ studentProfile, matchedOccupations, locale }) {
    const lang = String(locale || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';

    const responseShape = {
        profileSummary: 'A 2-3 sentence summary of the student\'s RIASEC personality type.',
        topCareerPaths: [
            {
                rank: 1,
                onetCode: '15-1252.00',
                title: 'Software Developers',
                alignment: 'high',
                whyItFits: 'Explanation of why this career matches the student\'s profile.',
                dayToDay: 'What this person does every day in simple terms.',
                requiredSkills: ['skill1', 'skill2'],
                educationPath: 'Suggested university programs and learning path.',
                salaryOutlook: 'Brief salary/demand outlook in Vietnam.',
            },
        ],
        emergingOpportunities: [
            'An emerging tech career the student might not have considered.',
        ],
        actionPlan: {
            thisMonth: 'One concrete action to take this month.',
            thisSemester: 'Goal for this semester.',
            beforeUniversity: 'What to prepare before entering university.',
        },
        encouragement: 'A motivational closing message.',
    };

    const userPrompt = JSON.stringify(
        {
            locale: lang,
            studentProfile: {
                hollandCode: studentProfile?.latestHollandCode || studentProfile?.hollandCode || null,
                riasecScores: studentProfile?.stableScores || studentProfile?.normalizedScores || {},
                confidenceScore: studentProfile?.confidenceScore || 0,
                strongestDimension: studentProfile?.strongestDimension || null,
                weakestDimension: studentProfile?.weakestDimension || null,
            },
            matchedOccupations: (matchedOccupations || []).slice(0, 10).map((occ) => ({
                onetCode: occ.onetCode,
                title: occ.title,
                hollandCode: occ.hollandCode,
                riasec: occ.riasec || occ.riasecScores,
                similarity: occ.similarity,
                topSkills: (occ.topSkills || []).slice(0, 5),
                description: occ.description ? occ.description.slice(0, 200) : null,
            })),
            responseShape,
        },
        null,
        2,
    );

    return {
        promptVersion: CAREER_PATH_PROMPT_VERSION,
        responseVersion: CAREER_PATH_RESPONSE_VERSION,
        systemPrompt: CAREER_PATH_SYSTEM_PROMPT,
        userPrompt,
    };
}

module.exports = {
    CAREER_PATH_PROMPT_VERSION,
    CAREER_PATH_RESPONSE_VERSION,
    buildCareerPathPrompt,
};
