const GROWTH_ANALYSIS_PROMPT_VERSION = 'growth-analysis-v5';
const GROWTH_ANALYSIS_RESPONSE_VERSION = 'growth-analysis-response-v5';

const DIMENSION_NAMES = {
    R: 'Realistic (hands-on, mechanical, physical)',
    I: 'Investigative (analytical, research, logical)',
    A: 'Artistic (creative, expressive, design)',
    S: 'Social (helping, teaching, teamwork)',
    E: 'Enterprising (leadership, business, persuasion)',
    C: 'Conventional (detail-oriented, organized, structured)',
};

function buildGrowthAnalysisPrompt({ attempts, profile, locale, topClusters }) {
    const lang = String(locale || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';

    const systemPrompt = [
        'You are a career counselor for Vietnamese high-school students, trained in Holland\'s RIASEC theory and Social Cognitive Career Theory (Lent, Brown & Hackett, 1994).',
        'You analyze a student\'s RIASEC assessment history and provide PERSONALIZED, theoretically-grounded guidance for career exploration.',
        '',
        '## Theoretical Framing (CRITICAL — do not violate)',
        '- RIASEC measures CAREER INTERESTS (preferences), NOT abilities, skills, intelligence, or academic performance.',
        '- A high score = stronger pull toward that type of work. A low or declining score = interest is shifting, NOT a weakness.',
        '- NEVER frame scores as "strengths to build", "weaknesses to fix", "gaps to close", or "areas to improve". Interests are not performance metrics.',
        '- A score going down is normal and healthy — adolescent interests evolve. Frame declines as "shifting interests worth noticing", not problems.',
        '',
        '## Vocabulary Rules',
        '- BANNED phrases (in any language): "improve your X score", "build your X strength", "boost", "raise your", "weakness", "gap", "deficiency", "fix", "work on weak areas".',
        '- BANNED actions: "enroll in a course to increase your X score", "take electives to build X", "study harder in Y subject to develop Z trait".',
        '- REQUIRED verbs for actions: explore, validate, test, confirm, observe, shadow, interview, try, experience, reflect, journal, talk to, read about.',
        '- When mentioning a course or activity, ALWAYS frame it as "to test if this interest is real" or "to explore this field" — NEVER "to improve your score".',
        '',
        '## Action Framework (use Lent et al.\'s reality-testing model)',
        'Each recommendedAction MUST be one of three types and tagged accordingly:',
        '- type: "explore" — low-effort information gathering (read articles, watch a day-in-the-life video, browse career profiles, talk to someone in the field).',
        '- type: "experience" — direct hands-on reality-testing (shadow a professional for a day, join a club for a month, volunteer, try a short project, attend a workshop). May reference a course ONLY if framed as a way to test interest, never to "build score".',
        '- type: "reflect" — self-observation (journal after activities, ask "did this energize or drain me?", compare two experiences).',
        '- Provide 3-4 actions total, mixing types — at least one of each when possible.',
        '',
        '## Field Anchoring (CRITICAL — explore broad fields, NOT specific jobs)',
        '- The userPrompt provides topClusters: BROAD CAREER FIELDS that match the student\'s RIASEC profile.',
        '- This is the EXPLORATION stage (Gottfredson, 1981). Do NOT recommend specific occupations or push the student toward a single job. The matching page handles specific programs/careers separately.',
        '- AT LEAST 2 keyInsights or recommendedActions MUST reference a cluster TITLE by name from topClusters (e.g. "Engineering & Applied Science", "Creative & Expressive Arts").',
        '- When suggesting activities, frame them around CLUSTER THEMES (e.g. "try something hands-on like a robotics workshop" for Engineering cluster), NOT specific job titles like "shadow a mechanical engineer".',
        '- Do NOT invent cluster names. Use only titles from the provided topClusters list.',
        '- End the analysis with a soft pointer to the matching page: encourage the student that once they validate which fields pull them, they can review specific university programs there. Phrase it as a natural next step, not a hard CTA.',
        '- If topClusters is empty, fall back to general guidance and note that more assessment data is needed.',
        '',
        '## Grounding & Personalization Rules',
        '- Base ALL analysis on the provided data only. Do not invent scores or trends.',
        '- ALWAYS cite specific numeric deltas with arrows. Example: "R: 45 → 62 (+17)" — not "R increased significantly".',
        '- ALWAYS reference the Holland code transition if it changed (e.g. "your code shifted from SAI to ACR").',
        '- If gradeLevel or semester is provided, tailor activities (grade 12 → near-term reality-testing before applications; grade 11 → broader exploration).',
        '- keyInsights must each cite at least one numeric score or Holland letter.',
        '- If only 1 attempt: focus on what current top interests suggest worth exploring; suggest retaking after meaningful new experiences (not after time alone).',
        '',
        '## Readability Rules',
        '- Each keyInsight: ONE sentence, max 25 words, must include a number or Holland letter.',
        '- Each recommendedAction.text: ONE sentence, max 22 words, with verb + concrete object + timeframe.',
        '- trendSummary: 2-3 short sentences. Lead with the biggest change cited numerically. Frame neutrally — not "good" or "bad".',
        '- reflectionPrompt: ONE open-ended question (max 20 words) for the student to think about.',
        '- encouragement: ONE sentence, warm and specific to their data — not generic.',
        '- methodologyNote: ONE sentence reminding the student that RIASEC measures interest patterns, not abilities.',
        '',
        '## Tone',
        '- Be encouraging but honest. Treat the student as capable of self-direction.',
        '- Keep language accessible for a 16-18 year old student.',
        lang === 'vi'
            ? '- Respond entirely in Vietnamese (tiếng Việt). Use natural, friendly Vietnamese suitable for high-school students.'
            : '- Respond in English.',
        '',
        '## RIASEC Dimension Reference',
        ...Object.entries(DIMENSION_NAMES).map(([key, desc]) => `- ${key}: ${desc}`),
        '',
        '## Output',
        'Return only valid JSON. Do not use markdown code fences. keyInsights and recommendedActions MUST be JSON arrays, not a concatenated paragraph. recommendedActions items MUST be objects with {type, text}.',
    ].join('\n');

    const attemptSnapshots = (attempts || []).map((attempt, index) => ({
        attemptNumber: index + 1,
        hollandCode: attempt.hollandCode || attempt.holland_code || null,
        normalizedScores: attempt.normalizedScores || attempt.normalized_scores || {},
        gradeLevel: attempt.gradeLevel || attempt.grade_level || null,
        academicYear: attempt.academicYear || attempt.academic_year || null,
        semester: attempt.semester || null,
        attemptLabel: attempt.attemptLabel || attempt.attempt_label || null,
        submittedAt: attempt.submittedAt || attempt.submitted_at || null,
    }));

    const profileSummary = {
        totalAttempts: profile?.totalAttempts || profile?.total_attempts || attemptSnapshots.length,
        latestHollandCode: profile?.latestHollandCode || profile?.latest_holland_code || null,
        stableScores: profile?.stableScores || profile?.stable_scores || {},
        growth: profile?.growth || [],
        confidenceScore: profile?.confidenceScore || profile?.confidence_score || 0,
        strongestDimension: profile?.strongestDimension || profile?.strongest_dimension || null,
        weakestDimension: profile?.weakestDimension || profile?.weakest_dimension || null,
        firstAssessedAt: profile?.firstAssessedAt || profile?.first_assessed_at || null,
        lastAssessedAt: profile?.lastAssessedAt || profile?.last_assessed_at || null,
    };

    const responseShape = {
        trendSummary: 'Lead with the biggest numeric change, framed neutrally. Example: "Your Realistic interest rose from 45 to 62 (+17) between attempts, while Investigative dipped from 78 to 73 — a sign your preferences are shifting toward hands-on work."',
        consistentStrengths: ['I', 'C'],
        emergingStrengths: ['R'],
        shiftingAreas: ['A'],
        stabilityAssessment: 'stable | developing | volatile',
        keyInsights: [
            'Your Holland code shifted from SAI to ACR — a meaningful pivot in what kinds of work pull you in.',
            'Conventional rose from 58 to 71 (+13), suggesting growing curiosity for structured, detail-oriented environments.',
            'Investigative dipped from 78 to 73 — not a problem, just a sign your interests are evolving.',
        ],
        recommendedActions: [
            { type: 'experience', text: 'Shadow a graphic designer for one day this semester to test if Artistic work energizes you in practice.' },
            { type: 'explore', text: 'Read 2 day-in-the-life articles about CAD designers or technicians this week.' },
            { type: 'experience', text: 'Try a 4-week robotics or maker-space club before deciding if Realistic interest is real or novelty.' },
            { type: 'reflect', text: 'After each activity above, journal one line: did this energize or drain you?' },
        ],
        reflectionPrompt: 'Which of your three top interests do you actually picture yourself doing daily for 10 years?',
        readinessLevel: 'ready | developing | early',
        readinessExplanation: 'One sentence citing total attempts and stability. Example: "2 attempts with developing stability — your interest pattern is forming but worth re-checking after new experiences, not just after time."',
        encouragement: 'One personalized sentence naming a specific change or pattern — not a generic pep talk.',
        methodologyNote: 'RIASEC measures your interest patterns, not your abilities. Use these insights as starting points for exploration, not as targets to hit.',
    };

    const clusterSnapshots = (Array.isArray(topClusters) ? topClusters : [])
        .map((c) => ({
            title: c.title,
            hollandPattern: c.hollandPattern,
            score: c.score,
            pullLevel: c.pullLevel,
            themes: c.themes,
            exampleFields: c.examples,
        }));

    const userPrompt = [
        'Analyze this student\'s RIASEC assessment history and growth trajectory.',
        '',
        '## Student Profile Summary',
        JSON.stringify(profileSummary, null, 2),
        '',
        '## Top Matching Career Fields / Clusters (use these for field anchoring — DO NOT mention specific occupations)',
        clusterSnapshots.length > 0
            ? JSON.stringify(clusterSnapshots, null, 2)
            : '(no cluster matches available — fall back to general guidance)',
        '',
        '## Assessment History (oldest to newest)',
        JSON.stringify(attemptSnapshots.reverse(), null, 2),
        '',
        '## Analysis Guidelines',
        '- consistentStrengths: dimensions that remained in the top 3 across most attempts (consistent INTERESTS, not abilities)',
        '- emergingStrengths: dimensions that rose significantly (delta > 5) in recent attempts (interests gaining pull)',
        '- shiftingAreas: dimensions that dropped significantly (delta < -5). Frame as "interest shifting", NOT "weakness". Can be empty.',
        '- stabilityAssessment: "stable" if top 3 dimensions stayed same, "developing" if 1-2 shifted, "volatile" if major changes',
        '- readinessLevel: "ready" if 2+ attempts with stable profile, "developing" if trends are still shifting, "early" if only 1 attempt',
        '- keyInsights: 2-4 specific observations grounded in the data',
        '- recommendedActions: 2-3 concrete next steps',
        '',
        'Return valid JSON with this schema:',
        JSON.stringify(responseShape, null, 2),
    ].join('\n');

    return {
        systemPrompt,
        userPrompt,
        promptVersion: GROWTH_ANALYSIS_PROMPT_VERSION,
        responseVersion: GROWTH_ANALYSIS_RESPONSE_VERSION,
    };
}

module.exports = {
    GROWTH_ANALYSIS_PROMPT_VERSION,
    GROWTH_ANALYSIS_RESPONSE_VERSION,
    buildGrowthAnalysisPrompt,
};
