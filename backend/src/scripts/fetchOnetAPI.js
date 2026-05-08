#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

const API_KEY_V2 = process.env.ONET_API_KEY;
const API_USER_V1 = process.env.ONET_USER;
const API_PASS_V1 = process.env.ONET_PASS;

let API_VERSION, BASE_URL, AUTH_HEADERS;

if (API_KEY_V2) {
    API_VERSION = 'v2';
    BASE_URL = 'https://api-v2.onetcenter.org';
    AUTH_HEADERS = {
        'X-API-Key': API_KEY_V2,
        'User-Agent': 'MajorFit-Thesis/1.0 (bot)',
    };
} else if (API_USER_V1 && API_PASS_V1) {
    API_VERSION = 'v1';
    BASE_URL = 'https://services.onetcenter.org/ws';
    AUTH_HEADERS = {
        'Authorization': `Basic ${Buffer.from(API_USER_V1 + ':' + API_PASS_V1).toString('base64')}`,
        'Accept': 'application/json',
        'User-Agent': 'MajorFit-Thesis/1.0',
    };
} else {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  O*NET API credentials not found!                               ║
║                                                                  ║
║  IMPORTANT: Email/password for onetcenter.org website login      ║
║  is NOT the same as API credentials!                             ║
║                                                                  ║
║  ── How to get API credentials ──                                ║
║                                                                  ║
║  1. Go to: https://services.onetcenter.org/developer/            ║
║  2. Click "Sign Up" → fill in:                                   ║
║     - Your name, email, phone                                    ║
║     - Organization: your university name                         ║
║     - Organization type: Educational                             ║
║     - Project name: "MajorFit Thesis Research"                   ║
║     - Project description: "Career guidance system using         ║
║       O*NET occupational data for Vietnamese students"           ║
║  3. Wait for approval email (1-3 business days)                  ║
║  4. After approved → go to "My Account" → generate API key      ║
║                                                                  ║
║  Then run:                                                       ║
║  ONET_API_KEY=your_key node src/scripts/fetchOnetAPI.js          ║
║                                                                  ║
║  Or add to .env.local:                                           ║
║  ONET_API_KEY=your_key_here                                      ║
╚══════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
}

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.json');
const BACKUP_PATH = DATA_PATH.replace('.json', '.before-api-fetch.json');

const KNOWLEDGE_ELEMENTS = {
    '2.C.1.a': 'Administration and Management',
    '2.C.1.b': 'Clerical',
    '2.C.1.c': 'Economics and Accounting',
    '2.C.1.d': 'Sales and Marketing',
    '2.C.1.e': 'Customer and Personal Service',
    '2.C.1.f': 'Personnel and Human Resources',
    '2.C.2.a': 'Production and Processing',
    '2.C.2.b': 'Food Production',
    '2.C.3.a': 'Computers and Electronics',
    '2.C.3.b': 'Engineering and Technology',
    '2.C.3.c': 'Design',
    '2.C.3.d': 'Building and Construction',
    '2.C.3.e': 'Mechanical',
    '2.C.4.a': 'Mathematics',
    '2.C.4.b': 'Physics',
    '2.C.4.c': 'Chemistry',
    '2.C.4.d': 'Biology',
    '2.C.4.e': 'Psychology',
    '2.C.4.f': 'Sociology and Anthropology',
    '2.C.4.g': 'Geography',
    '2.C.5.a': 'Medicine and Dentistry',
    '2.C.5.b': 'Therapy and Counseling',
    '2.C.6.a': 'Education and Training',
    '2.C.7.a': 'English Language',
    '2.C.7.b': 'Foreign Language',
    '2.C.7.c': 'Fine Arts',
    '2.C.7.d': 'History and Archeology',
    '2.C.7.e': 'Philosophy and Theology',
    '2.C.8.a': 'Public Safety and Security',
    '2.C.8.b': 'Law and Government',
    '2.C.9.a': 'Telecommunications',
    '2.C.9.b': 'Communications and Media',
    '2.C.10.a': 'Transportation',
};

const SKILL_ELEMENTS = {
    '2.A.1.a': 'Reading Comprehension',
    '2.A.1.b': 'Active Listening',
    '2.A.1.c': 'Writing',
    '2.A.1.d': 'Speaking',
    '2.A.1.e': 'Mathematics',
    '2.A.1.f': 'Science',
    '2.A.2.a': 'Critical Thinking',
    '2.A.2.b': 'Active Learning',
    '2.A.2.c': 'Learning Strategies',
    '2.A.2.d': 'Monitoring',
    '2.B.1.a': 'Social Perceptiveness',
    '2.B.1.b': 'Coordination',
    '2.B.1.c': 'Persuasion',
    '2.B.1.d': 'Negotiation',
    '2.B.1.e': 'Instructing',
    '2.B.1.f': 'Service Orientation',
    '2.B.2.i': 'Complex Problem Solving',
    '2.B.3.a': 'Operations Analysis',
    '2.B.3.b': 'Technology Design',
    '2.B.3.c': 'Equipment Selection',
    '2.B.3.d': 'Installation',
    '2.B.3.e': 'Programming',
    '2.B.3.f': 'Operation Monitoring',
    '2.B.3.g': 'Operation and Control',
    '2.B.3.h': 'Equipment Maintenance',
    '2.B.3.j': 'Troubleshooting',
    '2.B.3.k': 'Repairing',
    '2.B.3.l': 'Quality Control Analysis',
    '2.B.4.a': 'Judgment and Decision Making',
    '2.B.4.b': 'Systems Analysis',
    '2.B.4.c': 'Systems Evaluation',
    '2.B.4.e': 'Time Management',
    '2.B.4.g': 'Management of Financial Resources',
    '2.B.4.h': 'Management of Material Resources',
    '2.B.5.a': 'Management of Personnel Resources',
};

async function fetchOnetData(onetCode, dataType) {
    const pathPrefix = API_VERSION === 'v2' ? '/occupations' : '/online/occupations';
    const endpoint = `${BASE_URL}${pathPrefix}/${encodeURIComponent(onetCode)}/${dataType}`;

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: AUTH_HEADERS,
        signal: AbortSignal.timeout(30000),
    });

    if (response.status === 404) {
        return null;
    }

    if (response.status === 401 || response.status === 403) {
        const text = await response.text().catch(() => '');
        throw new Error(`Auth failed (${response.status}). API ${API_VERSION} credentials invalid.\n${text.slice(0, 300)}`);
    }

    if (response.status === 429) {
        throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
        throw new Error(`API ${response.status} for ${onetCode}/${dataType}`);
    }

    return await response.json();
}

function parseItems(apiData, elementMap) {
    if (!apiData) return [];

    const elements = apiData.element || apiData.elements || apiData.data || [];
    if (!Array.isArray(elements)) return [];

    return elements
        .filter(e => {
            const hasScore = e.score?.value != null;
            const isImportance = !e.score?.scale_id || e.score.scale_id === 'IM';
            return (e.id || e.element_id) && (e.name || e.element_name) && hasScore && isImportance;
        })
        .map(e => ({
            name: elementMap[e.id || e.element_id] || e.name || e.element_name,
            importance: Math.round((e.score?.value ?? e.value) * 100) / 100,
            source: 'onet-api',
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10);
}

async function main() {
    console.log(`O*NET Web Services API ${API_VERSION.toUpperCase()}`);
    console.log(`Base URL: ${BASE_URL}\n`);

    console.log('Loading O*NET data...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log(`Total occupations: ${data.length}`);

    const averaged = data.filter(o =>
        o.topKnowledge?.some(k => k.source?.includes('avg')) ||
        o.topSkills?.some(s => s.source?.includes('avg'))
    );

    console.log(`Occupations with averaged data: ${averaged.length}`);

    if (averaged.length === 0) {
        console.log('All occupations already have direct data. Nothing to do!');
        return;
    }

    if (!fs.existsSync(BACKUP_PATH)) {
        fs.copyFileSync(DATA_PATH, BACKUP_PATH);
        console.log(`Backup: ${path.basename(BACKUP_PATH)}`);
    }

    console.log('\nTesting API connection...');
    try {
        const testCode = '15-1211.00';
        const test = await fetchOnetData(testCode, 'knowledge');
        if (test) {
            const items = parseItems(test, KNOWLEDGE_ELEMENTS);
            console.log(`API OK! Test: ${testCode} → ${items.length} knowledge items`);
            if (items[0]) console.log(`  Top: ${items[0].name} (${items[0].importance})`);
        } else {
            console.log(`API returned 404 for ${testCode}. Trying alternate format...`);
        }
        console.log();
    } catch (err) {
        console.error(`\nAPI test failed: ${err.message}`);
        if (err.message.includes('Auth failed')) {
            console.error('\nCredentials invalid. Please check:');
            if (API_VERSION === 'v2') {
                console.error('- ONET_API_KEY should be from "My Account" on the developer portal');
                console.error('- NOT your website login email/password');
            } else {
                console.error('- ONET_USER/ONET_PASS are separate from your website login');
                console.error('- They are issued via email after developer account approval');
            }
            console.error('\nDeveloper portal: https://services.onetcenter.org/developer/');
        }
        process.exit(1);
    }

    const dataIndex = new Map(data.map(o => [o.onetCode, o]));
    let upgraded = 0;
    let notFound = 0;
    let errors = 0;
    const startTime = Date.now();

    console.log(`── Fetching data for ${averaged.length} occupations ──\n`);

    for (let i = 0; i < averaged.length; i++) {
        const occ = averaged[i];
        const code = occ.onetCode;
        const target = dataIndex.get(code);

        try {
            const [knowledgeData, skillsData] = await Promise.all([
                fetchOnetData(code, 'knowledge'),
                fetchOnetData(code, 'skills'),
            ]);

            let updated = false;

            const knowledge = parseItems(knowledgeData, KNOWLEDGE_ELEMENTS);
            if (knowledge.length > 0) {
                target.topKnowledge = knowledge;
                updated = true;
            }

            const skills = parseItems(skillsData, SKILL_ELEMENTS);
            if (skills.length > 0) {
                target.topSkills = skills;
                updated = true;
            }

            if (updated) {
                upgraded++;
                console.log(`  ✓ ${code} ${occ.title.slice(0, 55)}`);
            } else {
                notFound++;
                console.log(`  · ${code} ${occ.title.slice(0, 55)} (not in API)`);
            }
        } catch (err) {
            if (err.message === 'RATE_LIMITED') {
                console.log(`  ⏳ Rate limited at ${code}, waiting 30s...`);
                await new Promise(r => setTimeout(r, 30000));
                i--;
                continue;
            }
            errors++;
            console.log(`  ✗ ${code}: ${err.message.slice(0, 80)}`);
        }

        if ((i + 1) % 10 === 0 || i === averaged.length - 1) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            console.log(`  [${i + 1}/${averaged.length}] ${upgraded} upgraded, ${notFound} not found, ${errors} errors [${elapsed}s]\n`);
            fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
        }

        if (i < averaged.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const finalDirect = data.filter(o =>
        o.topKnowledge?.some(k => k.source === 'onet-survey' || k.source === 'onet-api')
    ).length;
    const finalAvg = data.filter(o =>
        o.topKnowledge?.some(k => k.source?.includes('avg'))
    ).length;

    console.log(`══ Results (${elapsed}s) ══`);
    console.log(`Upgraded from averaged → API data: ${upgraded}`);
    console.log(`Not found in API (kept averaged): ${notFound}`);
    console.log(`Errors: ${errors}`);
    console.log(`\nDirect O*NET data: ${finalDirect}/${data.length}`);
    console.log(`Still averaged: ${finalAvg}/${data.length}`);
    console.log(`\nSaved to: ${DATA_PATH}`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
