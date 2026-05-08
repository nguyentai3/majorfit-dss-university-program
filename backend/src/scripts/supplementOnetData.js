#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('../config/env');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.json');
const BACKUP_PATH = DATA_PATH.replace('.json', '.backup.json');

const GROQ_KEY = process.env.AI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

let consecutiveRateLimits = 0;

const PROVIDERS = [];

const geminiKey = process.env.AI_FALLBACK_API_KEY;
if (geminiKey) {
    PROVIDERS.push({
        name: 'gemini',
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        key: geminiKey,
        model: 'gemini-2.0-flash',
    });
}
if (GROQ_KEY) {
    PROVIDERS.push({
        name: 'groq',
        url: (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1') + '/chat/completions',
        key: GROQ_KEY,
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    });
}
if (OPENROUTER_KEY) {
    PROVIDERS.push({
        name: 'openrouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: OPENROUTER_KEY,
        model: 'meta-llama/llama-3.3-70b-instruct',
    });
}

let currentProviderIndex = 0;

function getAPIConfig() {
    return PROVIDERS[currentProviderIndex] || PROVIDERS[0];
}

function rotateProvider(reason) {
    const old = PROVIDERS[currentProviderIndex]?.name;
    currentProviderIndex = (currentProviderIndex + 1) % PROVIDERS.length;
    const next = PROVIDERS[currentProviderIndex]?.name;
    console.log(`  → Rotating ${old} → ${next} (${reason})`);
}

const ONET_KNOWLEDGE_CATEGORIES = [
    'Administration and Management', 'Biology', 'Building and Construction',
    'Chemistry', 'Clerical', 'Communications and Media', 'Computers and Electronics',
    'Customer and Personal Service', 'Design', 'Economics and Accounting',
    'Education and Training', 'Engineering and Technology', 'English Language',
    'Fine Arts', 'Food Production', 'Foreign Language', 'Geography',
    'History and Archeology', 'Law and Government', 'Mathematics',
    'Mechanical', 'Medicine and Dentistry', 'Personnel and Human Resources',
    'Philosophy and Theology', 'Physics', 'Production and Processing',
    'Psychology', 'Public Safety and Security', 'Sales and Marketing',
    'Sociology and Anthropology', 'Telecommunications',
    'Therapy and Counseling', 'Transportation',
];

const ONET_SKILL_CATEGORIES = [
    'Active Learning', 'Active Listening', 'Complex Problem Solving',
    'Coordination', 'Critical Thinking', 'Equipment Maintenance',
    'Equipment Selection', 'Installation', 'Instructing',
    'Judgment and Decision Making', 'Learning Strategies', 'Management of Financial Resources',
    'Management of Material Resources', 'Management of Personnel Resources', 'Mathematics',
    'Monitoring', 'Negotiation', 'Operation Monitoring',
    'Operation and Control', 'Operations Analysis', 'Persuasion',
    'Programming', 'Quality Control Analysis', 'Reading Comprehension',
    'Repairing', 'Science', 'Service Orientation',
    'Social Perceptiveness', 'Speaking', 'Systems Analysis',
    'Systems Evaluation', 'Technology Design', 'Time Management',
    'Troubleshooting', 'Writing',
];

async function callAI(messages, retries = 5) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const config = getAPIConfig();
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.key}`,
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    temperature: 0.1,
                    max_tokens: 4000,
                    response_format: { type: 'json_object' },
                }),
                signal: AbortSignal.timeout(60000),
            });

            if (response.status === 429) {
                consecutiveRateLimits++;
                if (consecutiveRateLimits >= 2 && PROVIDERS.length > 1) {
                    rotateProvider('rate limited');
                    consecutiveRateLimits = 0;
                    continue;
                }
                const wait = Math.min((attempt + 1) * 5000, 30000);
                console.log(`  Rate limited, waiting ${wait / 1000}s...`);
                await new Promise((r) => setTimeout(r, wait));
                continue;
            }

            consecutiveRateLimits = 0;

            if (!response.ok) {
                const errText = await response.text().catch(() => 'unknown');
                throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error('Empty AI response');
            return content;
        } catch (err) {
            if (attempt < retries - 1) {
                const wait = (attempt + 1) * 2000;
                await new Promise((r) => setTimeout(r, wait));
                continue;
            }
            throw err;
        }
    }
}

function parseAIResponse(text) {
    if (!text) return null;
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.results && Array.isArray(parsed.results)) return parsed.results;
        if (parsed.occupations && Array.isArray(parsed.occupations)) return parsed.occupations;
        for (const val of Object.values(parsed)) {
            if (Array.isArray(val)) return val;
        }
    } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            try { return JSON.parse(match[0]); } catch { }
        }
    }
    return null;
}

async function supplementBatch(occupations, type) {
    const isKnowledge = type === 'knowledge';
    const categories = isKnowledge ? ONET_KNOWLEDGE_CATEGORIES : ONET_SKILL_CATEGORIES;
    const topN = isKnowledge ? 8 : 10;

    const occList = occupations
        .map((o, i) => `${i + 1}. [${o.onetCode}] "${o.title}": ${(o.description || '').slice(0, 180)}`)
        .join('\n');

    const prompt = `You are an O*NET occupational analyst. For each occupation, select the top ${topN} most important ${type} areas from ONLY this list:

${categories.join(', ')}

Rate importance on 1-5 scale (O*NET: 1=not important, 3=important, 5=extremely important).

Occupations:
${occList}

Return JSON: {"results":[{"code":"O*NET-SOC code","items":[{"name":"Exact Category Name","importance":3.5}]}]}`;

    const response = await callAI([
        { role: 'system', content: 'You are an O*NET database expert. Output valid JSON only.' },
        { role: 'user', content: prompt },
    ]);

    const parsed = parseAIResponse(response);
    if (!parsed || !Array.isArray(parsed)) {
        return new Map();
    }

    const result = new Map();
    for (const entry of parsed) {
        if (entry.code && Array.isArray(entry.items)) {
            const validated = entry.items
                .filter((item) => item.name && typeof item.importance === 'number')
                .filter((item) => categories.includes(item.name))
                .slice(0, topN)
                .map((item) => ({
                    name: item.name,
                    importance: Math.round(Math.min(5, Math.max(1, item.importance)) * 100) / 100,
                    source: 'ai-inferred',
                }));
            if (validated.length > 0) {
                result.set(entry.code, validated);
            }
        }
    }
    return result;
}

function saveProgress(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
    if (PROVIDERS.length === 0) {
        console.error('No API key found. Set AI_FALLBACK_API_KEY (Gemini) or AI_API_KEY (Groq) or OPENROUTER_API_KEY in .env.local');
        process.exit(1);
    }

    console.log('Loading O*NET data...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log(`Total occupations: ${data.length}`);
    const config = getAPIConfig();
    console.log(`API: ${config.url}`);
    console.log(`Model: ${config.model}\n`);

    if (!fs.existsSync(BACKUP_PATH)) {
        fs.copyFileSync(DATA_PATH, BACKUP_PATH);
        console.log(`Backup saved to: ${path.basename(BACKUP_PATH)}`);
    }

    const missingKnowledge = data.filter((o) => !o.topKnowledge || o.topKnowledge.length === 0);
    const missingSkills = data.filter((o) => !o.topSkills || o.topSkills.length === 0);

    console.log(`Missing knowledge: ${missingKnowledge.length}`);
    console.log(`Missing skills: ${missingSkills.length}\n`);

    const BATCH_SIZE = 10;
    let supplementedK = 0;
    let supplementedS = 0;
    const startTime = Date.now();

    const dataIndex = new Map(data.map((o) => [o.onetCode, o]));

    if (missingKnowledge.length > 0) {
        console.log(`── Supplementing Knowledge (${missingKnowledge.length} occupations, batch=${BATCH_SIZE}) ──`);
        for (let i = 0; i < missingKnowledge.length; i += BATCH_SIZE) {
            const batch = missingKnowledge.slice(i, i + BATCH_SIZE);
            try {
                const results = await supplementBatch(batch, 'knowledge');
                for (const [code, items] of results) {
                    const occ = dataIndex.get(code);
                    if (occ && (!occ.topKnowledge || occ.topKnowledge.length === 0)) {
                        occ.topKnowledge = items;
                        supplementedK++;
                    }
                }
            } catch (err) {
                console.log(`  ⚠ Batch error: ${err.message.slice(0, 100)}, skipping...`);
            }

            const done = Math.min(i + BATCH_SIZE, missingKnowledge.length);
            if (done % 50 === 0 || done === missingKnowledge.length) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                console.log(`  Knowledge: ${done}/${missingKnowledge.length} (${supplementedK} ok) [${elapsed}s]`);
                saveProgress(data);
            }

            if (i + BATCH_SIZE < missingKnowledge.length) {
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
        saveProgress(data);
        console.log(`✓ Knowledge: ${supplementedK}/${missingKnowledge.length}\n`);
    }

    if (missingSkills.length > 0) {
        console.log(`── Supplementing Skills (${missingSkills.length} occupations, batch=${BATCH_SIZE}) ──`);
        for (let i = 0; i < missingSkills.length; i += BATCH_SIZE) {
            const batch = missingSkills.slice(i, i + BATCH_SIZE);
            try {
                const results = await supplementBatch(batch, 'skills');
                for (const [code, items] of results) {
                    const occ = dataIndex.get(code);
                    if (occ && (!occ.topSkills || occ.topSkills.length === 0)) {
                        occ.topSkills = items;
                        supplementedS++;
                    }
                }
            } catch (err) {
                console.log(`  ⚠ Batch error: ${err.message.slice(0, 100)}, skipping...`);
            }

            const done = Math.min(i + BATCH_SIZE, missingSkills.length);
            if (done % 50 === 0 || done === missingSkills.length) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                console.log(`  Skills: ${done}/${missingSkills.length} (${supplementedS} ok) [${elapsed}s]`);
                saveProgress(data);
            }

            if (i + BATCH_SIZE < missingSkills.length) {
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
        saveProgress(data);
        console.log(`✓ Skills: ${supplementedS}/${missingSkills.length}\n`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const finalK = data.filter((o) => o.topKnowledge && o.topKnowledge.length > 0).length;
    const finalS = data.filter((o) => o.topSkills && o.topSkills.length > 0).length;
    const aiK = data.filter((o) => o.topKnowledge?.some((k) => k.source === 'ai-inferred')).length;
    const aiS = data.filter((o) => o.topSkills?.some((s) => s.source === 'ai-inferred')).length;

    console.log(`══ Final Stats (${elapsed}s) ══`);
    console.log(`Knowledge: ${finalK}/${data.length} (${aiK} AI-inferred, ${finalK - aiK} O*NET original)`);
    console.log(`Skills:    ${finalS}/${data.length} (${aiS} AI-inferred, ${finalS - aiS} O*NET original)`);
    console.log(`\nSaved to: ${DATA_PATH}`);
    console.log('Done! O*NET data supplemented successfully.');
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
