
const CLUSTERS = {
    R: {
        id: 'hands-on-technical',
        title: 'Hands-on & Technical Trades',
        emoji: '🔧',
        themes: ['mechanical', 'physical', 'practical', 'building'],
        examples: ['Skilled trades', 'Construction', 'Automotive', 'Maintenance'],
    },
    I: {
        id: 'research-analysis',
        title: 'Research & Scientific Analysis',
        emoji: '🔬',
        themes: ['analytical', 'investigative', 'theoretical', 'data-driven'],
        examples: ['Sciences', 'Research', 'Lab work', 'Academia'],
    },
    A: {
        id: 'creative-expressive',
        title: 'Creative & Expressive Arts',
        emoji: '🎨',
        themes: ['artistic', 'design', 'media', 'self-expression'],
        examples: ['Design', 'Media', 'Performing arts', 'Creative writing'],
    },
    S: {
        id: 'people-helping',
        title: 'People, Education & Helping Professions',
        emoji: '🤝',
        themes: ['teaching', 'helping', 'caring', 'communication'],
        examples: ['Teaching', 'Counseling', 'Healthcare support', 'Social work'],
    },
    E: {
        id: 'business-leadership',
        title: 'Business, Leadership & Entrepreneurship',
        emoji: '💼',
        themes: ['leading', 'persuading', 'selling', 'managing'],
        examples: ['Management', 'Sales', 'Entrepreneurship', 'Marketing'],
    },
    C: {
        id: 'structure-systems',
        title: 'Structure, Records & Systems',
        emoji: '📋',
        themes: ['organized', 'detailed', 'procedural', 'data entry'],
        examples: ['Accounting', 'Administration', 'Logistics', 'Compliance'],
    },
    RI: {
        id: 'engineering-applied-science',
        title: 'Engineering & Applied Science',
        emoji: '⚙️',
        themes: ['engineering', 'designing systems', 'applied physics', 'robotics'],
        examples: ['Mechanical engineering', 'Electrical engineering', 'Robotics', 'CAD design'],
    },
    IC: {
        id: 'data-information',
        title: 'Data, IT & Information Systems',
        emoji: '📊',
        themes: ['computing', 'data', 'analytics', 'information'],
        examples: ['Software development', 'Data analysis', 'IT systems', 'Cybersecurity'],
    },
    AS: {
        id: 'communication-education',
        title: 'Communication, Languages & Education',
        emoji: '📚',
        themes: ['language', 'writing', 'teaching humanities', 'cultural'],
        examples: ['Journalism', 'Language teaching', 'Editing', 'Cultural studies'],
    },
    AE: {
        id: 'media-performance',
        title: 'Media, Marketing & Performance',
        emoji: '🎬',
        themes: ['creative business', 'branding', 'advertising', 'performance'],
        examples: ['Advertising', 'Brand strategy', 'Film production', 'Performing arts'],
    },
    SE: {
        id: 'public-service-management',
        title: 'Public Service & People Management',
        emoji: '🏛️',
        themes: ['leadership of people', 'public service', 'HR', 'community'],
        examples: ['Human resources', 'Public administration', 'Community management', 'Hospitality'],
    },
    EC: {
        id: 'finance-operations',
        title: 'Finance, Operations & Administration',
        emoji: '💰',
        themes: ['business systems', 'finance', 'operations', 'governance'],
        examples: ['Finance', 'Accounting', 'Operations management', 'Banking'],
    },
    RC: {
        id: 'skilled-trades-technical',
        title: 'Skilled Trades & Technical Operations',
        emoji: '🛠️',
        themes: ['technical procedures', 'manufacturing', 'maintenance'],
        examples: ['Manufacturing technician', 'Quality control', 'Industrial maintenance'],
    },
    SI: {
        id: 'health-life-sciences',
        title: 'Health, Life Sciences & Care',
        emoji: '🏥',
        themes: ['healthcare', 'biology applied to people', 'therapy'],
        examples: ['Nursing', 'Medical practice', 'Therapy', 'Public health'],
    },
};

function buildClusters(stableScores = {}, topCareers = []) {
    const scores = normalizeScores(stableScores);

    const occupationCountByCluster = {};
    for (const career of topCareers) {
        const clusterKey = mapOccupationToClusterKey(career.hollandCode);
        if (!clusterKey) continue;
        occupationCountByCluster[clusterKey] = (occupationCountByCluster[clusterKey] || 0) + 1;
    }

    const ranked = Object.entries(CLUSTERS).map(([key, def]) => {
        const letters = key.split('');
        const baseFromInterest = letters.reduce((sum, l) => sum + (scores[l] || 0), 0) / letters.length;
        const reinforcement = (occupationCountByCluster[key] || 0) * 6;
        const score = Math.min(100, Math.round(baseFromInterest + reinforcement));

        return {
            id: def.id,
            key,
            title: def.title,
            emoji: def.emoji,
            hollandPattern: key,
            score,
            pullLevel: pullLabel(score),
            themes: def.themes,
            examples: def.examples,
        };
    });

    return ranked
        .filter((c) => c.score >= 35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
}

function normalizeScores(stableScores) {
    const out = {};
    for (const letter of ['R', 'I', 'A', 'S', 'E', 'C']) {
        const v = Number(stableScores[letter] ?? 0);
        out[letter] = Number.isFinite(v) ? v : 0;
    }
    return out;
}

function pullLabel(score) {
    if (score >= 75) return 'Strong pull';
    if (score >= 60) return 'Moderate pull';
    if (score >= 45) return 'Worth exploring';
    return 'Mild signal';
}

function mapOccupationToClusterKey(occHollandCode) {
    if (!occHollandCode || typeof occHollandCode !== 'string') return null;
    const code = occHollandCode.toUpperCase();
    const pair = code.slice(0, 2);
    if (CLUSTERS[pair]) return pair;
    const reversedPair = pair.split('').reverse().join('');
    if (CLUSTERS[reversedPair]) return reversedPair;
    const single = code[0];
    if (CLUSTERS[single]) return single;
    return null;
}

module.exports = {
    buildClusters,
};
