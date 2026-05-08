const CAREER_LABEL_MAP = {
    'Software Developers': 'Software Development',
    'Computer and Information Research Scientists': 'CS Research',
    'Data Scientists': 'Data Science',
    'Computer Systems Analysts': 'Systems Analysis',
    'Software Quality Assurance Analysts and Testers': 'QA & Testing',
    'Web Developers': 'Web Development',
    'Network and Computer Systems Administrators': 'Network Engineering',
    'Computer Network Support Specialists': 'Network Support',
    'Information Security Analysts': 'Cybersecurity',
    'Information Security Engineers': 'Cybersecurity',
    'Database Architects': 'Database Architecture',
    'Database Administrators': 'Database Administration',
    'Information Technology Project Managers': 'IT Management',
    'Computer Hardware Engineers': 'Hardware Engineering',
    'Computer Network Architects': 'Network Architecture',
    'Computer Systems Engineers/Architects': 'Systems Architecture',
    'Computer User Support Specialists': 'IT Support',
    'Statisticians': 'Statistics & Analytics',
    'Data Warehousing Specialists': 'Data Engineering',
    'Electronics Engineers, Except Computer': 'Electronics Engineering',
    'Electrical Engineers': 'Electrical Engineering',
    'Radio Frequency Engineers': 'RF Engineering',
    'Management Analysts': 'Management Consulting',
    'Market Research Analysts and Marketing Specialists': 'Marketing & Research',
    'General and Operations Managers': 'Operations Management',
    'Marketing Managers': 'Marketing Management',
    'Sales Managers': 'Sales Management',
    'Financial Managers': 'Financial Management',
    'Human Resources Specialists': 'Human Resources',
    'Accountants and Auditors': 'Accounting & Auditing',
    'Financial and Investment Analysts': 'Financial Analysis',
    'Personal Financial Advisors': 'Financial Advisory',
    'Financial Examiners': 'Financial Examination',
    'Loan Officers': 'Lending & Credit',
    'Medical Scientists, Except Epidemiologists': 'Medical Research',
    'Biochemists and Biophysicists': 'Biochemistry',
    'Biological Technicians': 'Lab Technology',
    'Biological Scientists, All Other': 'Biological Sciences',
    'Biomedical Engineers': 'Biomedical Engineering',
    'Environmental Engineers': 'Environmental Engineering',
    'Environmental Scientists and Specialists': 'Environmental Science',
    'Industrial Engineers': 'Industrial Engineering',
    'Food Scientists and Technologists': 'Food Science',
    'Quality Control Analysts': 'Quality Control',
    'Logisticians': 'Logistics',
    'Supply Chain Managers': 'Supply Chain Management',
    'Purchasing Agents, Except Wholesale, Retail, and Farm Products': 'Procurement',
    'Foreign Language and Literature Teachers, Postsecondary': 'Language Education',
    'Interpreters and Translators': 'Translation & Interpretation',
    'News Analysts, Reporters, and Journalists': 'Journalism',
    'Lawyers': 'Law',
    'Paralegals and Legal Assistants': 'Legal Support',
    'Graphic Designers': 'Graphic Design',
    'Special Effects Artists and Animators': 'Animation & VFX',
    'Clinical and Counseling Psychologists': 'Psychology',
    'Educational, Guidance, and Career Counselors and Advisors': 'Career Counseling',
};

function getCareerLabel(title) {
    return CAREER_LABEL_MAP[title] || title;
}

function deriveCareerSignature(onetLinks = []) {
    if (!onetLinks.length) {
        return { primaryCareer: '', careerPathways: [], occupationSummary: [] };
    }

    const seen = new Map();
    for (const link of onetLinks) {
        const key = link.onetCode || link.title;
        const existing = seen.get(key);
        if (!existing || link.relevance > existing.relevance) {
            seen.set(key, link);
        }
    }
    const sorted = [...seen.values()].sort((a, b) => b.relevance - a.relevance);
    const primary = sorted[0];

    const seenLabels = new Set();
    const pathways = [];
    for (const o of sorted) {
        const label = getCareerLabel(o.title);
        if (!seenLabels.has(label)) {
            seenLabels.add(label);
            pathways.push(label);
            if (pathways.length >= 3) break;
        }
    }

    const occupationSummary = sorted.map(o => ({
        title: o.title,
        label: getCareerLabel(o.title),
        relevance: o.relevance,
        isPrimary: o.isPrimary || false,
    }));

    return {
        primaryCareer: getCareerLabel(primary.title),
        careerPathways: pathways,
        occupationSummary,
    };
}

function compareCareerPathways(programA, programB) {
    const linksA = (programA.onetLinks || programA.careerOutcomes || []);
    const linksB = (programB.onetLinks || programB.careerOutcomes || []);

    if (!linksA.length || !linksB.length) return '';

    const sigA = deriveCareerSignature(linksA);
    const sigB = deriveCareerSignature(linksB);

    const labelsA = new Set(sigA.occupationSummary.map(o => o.label));
    const labelsB = new Set(sigB.occupationSummary.map(o => o.label));

    const uniqueToA = sigA.occupationSummary.filter(o => !labelsB.has(o.label));
    const uniqueToB = sigB.occupationSummary.filter(o => !labelsA.has(o.label));

    if (uniqueToA.length === 0 && uniqueToB.length === 0) {
        if (sigA.primaryCareer !== sigB.primaryCareer) {
            return `${programA.name} focuses primarily on ${sigA.primaryCareer}, while ${programB.name} emphasizes ${sigB.primaryCareer}.`;
        }
        const secondA = sigA.careerPathways[1] || '';
        const secondB = sigB.careerPathways[1] || '';
        if (secondA && secondB && secondA !== secondB) {
            return `Both programs lead to ${sigA.primaryCareer} careers, but ${programA.name} has a stronger secondary focus on ${secondA}, while ${programB.name} leans toward ${secondB}.`;
        }
        return '';
    }

    const parts = [];
    if (uniqueToA.length) {
        parts.push(`${programA.name} uniquely prepares for ${uniqueToA.map(o => o.label).join(', ')}`);
    }
    if (uniqueToB.length) {
        parts.push(`${programB.name} uniquely prepares for ${uniqueToB.map(o => o.label).join(', ')}`);
    }

    return parts.join(', while ') + '.';
}

function buildCareerDifferentiation(targetProgram, allResults, targetRank) {
    const signature = deriveCareerSignature(
        targetProgram.careerOutcomes || []
    );

    const sameFocusArea = allResults.filter(r =>
        r.program.focusArea === targetProgram.focusArea &&
        r.program.id !== targetProgram.id
    );

    let differentiation = '';
    let comparedTo = '';

    if (sameFocusArea.length > 0) {
        const nearest = sameFocusArea.reduce((best, r) =>
            Math.abs(r.rank - targetRank) < Math.abs(best.rank - targetRank) ? r : best
        );

        const nameA = _programLabel(targetProgram);
        const nameB = _programLabel(nearest.program);
        comparedTo = nameB;
        differentiation = compareCareerPathways(
            { name: nameA, onetLinks: targetProgram.careerOutcomes },
            { name: nameB, onetLinks: nearest.program.careerOutcomes }
        );
    }

    return {
        careerSignature: signature,
        differentiation,
        comparedTo,
    };
}

function _programLabel(program) {
    const uni = program.university?.shortName || program.university?.code || program.university?.name || '';
    return uni ? `${program.name} (${uni})` : program.name;
}

module.exports = {
    deriveCareerSignature,
    compareCareerPathways,
    buildCareerDifferentiation,
    getCareerLabel,
};
