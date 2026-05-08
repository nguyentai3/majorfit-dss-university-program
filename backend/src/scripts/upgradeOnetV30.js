#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, '..', '..', 'db_30_2_mysql');
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.json');
const BACKUP_PATH = DATA_PATH.replace('.json', '.before-v30-upgrade.json');

const KNOWLEDGE_NAMES = {
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
    '2.C.6': 'Education and Training',
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

const SKILL_NAMES = {
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
    '2.B.3.m': 'Science (Applied)',
    '2.B.4.a': 'Judgment and Decision Making',
    '2.B.4.b': 'Systems Analysis',
    '2.B.4.c': 'Systems Evaluation',
    '2.B.4.e': 'Time Management',
    '2.B.4.g': 'Management of Financial Resources',
    '2.B.4.h': 'Management of Material Resources',
    '2.B.5.a': 'Management of Personnel Resources',
};

const INTEREST_IDS = {
    '1.B.1.a': 'R',
    '1.B.1.b': 'I',
    '1.B.1.c': 'A',
    '1.B.1.d': 'S',
    '1.B.1.e': 'E',
    '1.B.1.f': 'C',
};

function parseInsertValues(sql) {
    const rows = [];
    const regex = /VALUES \(([^)]+)\)/g;
    let m;
    while ((m = regex.exec(sql)) !== null) {
        const raw = m[1];
        const fields = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (ch === "'" && !inQuote) {
                inQuote = true;
                continue;
            }
            if (ch === "'" && inQuote) {
                if (raw[i + 1] === "'") {
                    current += "'";
                    i++;
                    continue;
                }
                inQuote = false;
                continue;
            }
            if (ch === ',' && !inQuote) {
                fields.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        fields.push(current.trim());
        rows.push(fields);
    }
    return rows;
}

function parseKnowledgeSQL() {
    const sql = fs.readFileSync(path.join(SQL_DIR, '15_knowledge.sql'), 'utf-8');
    const rows = parseInsertValues(sql);
    const data = new Map();
    for (const row of rows) {
        const code = row[0];
        const elementId = row[1];
        const scaleId = row[2];
        const value = parseFloat(row[3]);

        if (scaleId !== 'IM') continue;
        if (!KNOWLEDGE_NAMES[elementId]) continue;

        if (!data.has(code)) data.set(code, []);
        data.get(code).push({
            name: KNOWLEDGE_NAMES[elementId],
            importance: Math.round(value * 100) / 100,
            source: 'onet-survey',
        });
    }

    for (const [code, items] of data) {
        items.sort((a, b) => b.importance - a.importance);
        data.set(code, items.slice(0, 10));
    }
    return data;
}

function parseSkillsSQL() {
    const sql = fs.readFileSync(path.join(SQL_DIR, '16_skills.sql'), 'utf-8');
    const rows = parseInsertValues(sql);
    const data = new Map();
    for (const row of rows) {
        const code = row[0];
        const elementId = row[1];
        const scaleId = row[2];
        const value = parseFloat(row[3]);

        if (scaleId !== 'IM') continue;
        if (!SKILL_NAMES[elementId]) continue;

        if (!data.has(code)) data.set(code, []);
        data.get(code).push({
            name: SKILL_NAMES[elementId],
            importance: Math.round(value * 100) / 100,
            source: 'onet-survey',
        });
    }

    for (const [code, items] of data) {
        items.sort((a, b) => b.importance - a.importance);
        data.set(code, items.slice(0, 10));
    }
    return data;
}

function parseInterestsSQL() {
    const sql = fs.readFileSync(path.join(SQL_DIR, '13_interests.sql'), 'utf-8');
    const rows = parseInsertValues(sql);
    const data = new Map();
    for (const row of rows) {
        const code = row[0];
        const elementId = row[1];
        const scaleId = row[2];
        const value = parseFloat(row[3]);

        if (scaleId !== 'OI') continue;
        const dim = INTEREST_IDS[elementId];
        if (!dim) continue;

        if (!data.has(code)) data.set(code, {});
        data.get(code)[dim] = Math.round(value * 100) / 100;
    }
    return data;
}

function parseTechSkillsSQL() {
    const sql = fs.readFileSync(path.join(SQL_DIR, '31_technology_skills.sql'), 'utf-8');
    const rows = parseInsertValues(sql);
    const data = new Map();
    for (const row of rows) {
        const code = row[0];
        const example = row[1];
        const isHot = row[3] === 'Y';

        if (!isHot) continue;

        if (!data.has(code)) data.set(code, []);
        const list = data.get(code);
        if (!list.includes(example)) {
            list.push(example);
        }
    }
    return data;
}

function parseOccupationDataSQL() {
    const sql = fs.readFileSync(path.join(SQL_DIR, '03_occupation_data.sql'), 'utf-8');
    const rows = parseInsertValues(sql);
    const data = new Map();
    for (const row of rows) {
        data.set(row[0], {
            title: row[1],
            description: row[2],
        });
    }
    return data;
}

function getParentCode(code) {
    const prefix = code.slice(0, 5);
    return prefix;
}

function getMinorGroup(code) {
    return code.slice(0, 5);
}

function getMajorGroup(code) {
    return code.slice(0, 2);
}

function averageItems(itemArrays) {
    const sums = {};
    const counts = {};
    for (const items of itemArrays) {
        for (const item of items) {
            if (!sums[item.name]) {
                sums[item.name] = 0;
                counts[item.name] = 0;
            }
            sums[item.name] += item.importance;
            counts[item.name]++;
        }
    }
    return Object.entries(sums)
        .map(([name, sum]) => ({
            name,
            importance: Math.round((sum / counts[name]) * 100) / 100,
            source: 'onet-group-avg',
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10);
}

function applyFallback(code, dataMap, allCodes) {
    if (dataMap.has(code)) return { items: dataMap.get(code), method: 'direct' };

    const minor = getMinorGroup(code);
    const siblings = allCodes.filter(c => c !== code && getMinorGroup(c) === minor && dataMap.has(c));
    if (siblings.length > 0) {
        const items = averageItems(siblings.map(c => dataMap.get(c)));
        return { items: items.map(i => ({ ...i, source: 'onet-minor-avg' })), method: 'minor-avg' };
    }

    const major = getMajorGroup(code);
    const cousins = allCodes.filter(c => c !== code && getMajorGroup(c) === major && dataMap.has(c));
    if (cousins.length > 0) {
        const items = averageItems(cousins.map(c => dataMap.get(c)));
        return { items: items.map(i => ({ ...i, source: 'onet-major-avg' })), method: 'major-avg' };
    }

    return null;
}

function main() {
    console.log('O*NET v30.2 Upgrade (February 2026)\n');

    if (!fs.existsSync(SQL_DIR)) {
        console.error(`SQL directory not found: ${SQL_DIR}`);
        process.exit(1);
    }

    console.log('Loading current onetOccupations.json...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log(`  Current: ${data.length} occupations`);

    if (!fs.existsSync(BACKUP_PATH)) {
        fs.copyFileSync(DATA_PATH, BACKUP_PATH);
        console.log(`  Backup: ${path.basename(BACKUP_PATH)}`);
    }

    console.log('\nParsing SQL files...');

    const t0 = Date.now();
    const occData = parseOccupationDataSQL();
    console.log(`  Occupation Data: ${occData.size} codes`);

    const knowledgeData = parseKnowledgeSQL();
    console.log(`  Knowledge: ${knowledgeData.size} codes`);

    const skillsData = parseSkillsSQL();
    console.log(`  Skills: ${skillsData.size} codes`);

    const interestsData = parseInterestsSQL();
    console.log(`  Interests (RIASEC): ${interestsData.size} codes`);

    const techData = parseTechSkillsSQL();
    console.log(`  Hot Technologies: ${techData.size} codes`);

    console.log(`  Parsed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    const allV30Codes = [...knowledgeData.keys()];

    const dataIndex = new Map(data.map(o => [o.onetCode, o]));

    let updatedK = 0, updatedS = 0, updatedI = 0, updatedT = 0, updatedMeta = 0;
    let fallbackK = 0, fallbackS = 0;

    console.log('\nUpgrading occupations...');

    for (const occ of data) {
        const code = occ.onetCode;

        if (occData.has(code)) {
            const meta = occData.get(code);
            if (meta.title && meta.title !== occ.title) {
                occ.title = meta.title;
                updatedMeta++;
            }
            if (meta.description) {
                occ.description = meta.description;
            }
        }

        if (knowledgeData.has(code)) {
            occ.topKnowledge = knowledgeData.get(code);
            updatedK++;
        } else {
            const fb = applyFallback(code, knowledgeData, allV30Codes);
            if (fb) {
                occ.topKnowledge = fb.items;
                fallbackK++;
            }
        }

        if (skillsData.has(code)) {
            occ.topSkills = skillsData.get(code);
            updatedS++;
        } else {
            const fb = applyFallback(code, skillsData, allV30Codes);
            if (fb) {
                occ.topSkills = fb.items;
                fallbackS++;
            }
        }

        if (interestsData.has(code)) {
            occ.interests = interestsData.get(code);
            updatedI++;
        }

        if (techData.has(code)) {
            occ.hotTechnologies = techData.get(code);
            updatedT++;
        }
    }

    let newOccs = 0;
    for (const [code, meta] of occData) {
        if (!dataIndex.has(code)) {
            const newOcc = {
                onetCode: code,
                title: meta.title,
                description: meta.description,
                topKnowledge: knowledgeData.get(code) || [],
                topSkills: skillsData.get(code) || [],
                interests: interestsData.get(code) || {},
                hotTechnologies: techData.get(code) || [],
            };
            data.push(newOcc);
            dataIndex.set(code, newOcc);
            newOccs++;
        }
    }

    let fallbackNew = 0;
    for (const occ of data) {
        if (!occ.topKnowledge || occ.topKnowledge.length === 0) {
            const fb = applyFallback(occ.onetCode, knowledgeData, allV30Codes);
            if (fb) {
                occ.topKnowledge = fb.items;
                fallbackNew++;
            }
        }
        if (!occ.topSkills || occ.topSkills.length === 0) {
            const fb = applyFallback(occ.onetCode, skillsData, allV30Codes);
            if (fb) occ.topSkills = fb.items;
        }
        if (!occ.interests || Object.keys(occ.interests).length === 0) {
            const minor = getMinorGroup(occ.onetCode);
            const siblings = allV30Codes.filter(c => c !== occ.onetCode && getMinorGroup(c) === minor && interestsData.has(c));
            if (siblings.length > 0) {
                const avg = {};
                for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
                    const vals = siblings.map(c => interestsData.get(c)?.[dim]).filter(v => v != null);
                    if (vals.length > 0) avg[dim] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
                }
                if (Object.keys(avg).length === 6) occ.interests = avg;
            }
        }
    }
    if (fallbackNew > 0) console.log(`  Applied fallback to ${fallbackNew} new occupations`);

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const totalK = data.filter(o => o.topKnowledge?.length > 0).length;
    const totalS = data.filter(o => o.topSkills?.length > 0).length;
    const totalI = data.filter(o => o.interests && Object.keys(o.interests).length > 0).length;
    const totalT = data.filter(o => o.hotTechnologies?.length > 0).length;
    const directK = data.filter(o => o.topKnowledge?.some(k => k.source === 'onet-survey')).length;
    const avgK = data.filter(o => o.topKnowledge?.some(k => k.source?.includes('avg'))).length;
    const aiK = data.filter(o => o.topKnowledge?.some(k => k.source === 'ai-inferred')).length;

    console.log(`\n══ O*NET v30.2 Upgrade Complete (${elapsed}s) ══`);
    console.log(`Total occupations: ${data.length} (${newOccs} new from v30.2)`);
    console.log(`\nKnowledge: ${totalK}/${data.length} (${updatedK} direct v30.2 + ${fallbackK} fallback)`);
    console.log(`Skills:    ${totalS}/${data.length} (${updatedS} direct v30.2 + ${fallbackS} fallback)`);
    console.log(`Interests: ${totalI}/${data.length} (${updatedI} updated)`);
    console.log(`Hot Tech:  ${totalT}/${data.length} (${updatedT} updated)`);
    console.log(`Titles updated: ${updatedMeta}`);
    console.log(`\nData sources: ${directK} direct survey + ${avgK} group averaged + ${aiK} AI-inferred`);
    console.log(`\nSaved to: ${DATA_PATH}`);
}

main();
