#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.json');
const BACKUP_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.backup.json');
const KNOWLEDGE_TSV = '/tmp/onet_db/Knowledge.txt';
const SKILLS_TSV = '/tmp/onet_db/Skills.txt';
const TECH_TSV = '/tmp/onet_db/Technology_Skills.txt';
const INTERESTS_TSV = '/tmp/onet_db/Interests.txt';
const OCCUPATION_TSV = '/tmp/onet_db/Occupation_Data.txt';

function parseTSV(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`  File not found: ${path.basename(filePath)}`);
        return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r/g, '');
    const lines = raw.split('\n').filter(Boolean);
    const headers = lines[0].split('\t').map((h) => h.trim());
    return lines.slice(1).map((line) => {
        const vals = line.split('\t');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = (vals[i] || '').trim();
        });
        return obj;
    });
}

function parentCode(code) {
    return code.replace(/\.\d+$/, '');
}

function minorGroup(code) {
    return code.slice(0, 6);
}

function majorGroup(code) {
    return code.slice(0, 2);
}

function averageItems(itemArrays, topN) {
    const scoreMap = new Map();
    for (const items of itemArrays) {
        for (const item of items) {
            if (!scoreMap.has(item.name)) {
                scoreMap.set(item.name, { total: 0, count: 0 });
            }
            const entry = scoreMap.get(item.name);
            entry.total += item.importance;
            entry.count += 1;
        }
    }

    return [...scoreMap.entries()]
        .map(([name, { total, count }]) => ({
            name,
            importance: Math.round((total / count) * 100) / 100,
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, topN);
}

function buildItemMapFromTSV(rows) {
    const byOcc = new Map();
    for (const row of rows) {
        if (row['Scale ID'] !== 'IM') continue;
        const code = row['O*NET-SOC Code'];
        if (!code) continue;
        if (!byOcc.has(code)) byOcc.set(code, []);
        byOcc.get(code).push({
            name: row['Element Name'],
            importance: parseFloat(row['Data Value']) || 0,
        });
    }
    return byOcc;
}

function buildItemMapFromJSON(occupations, field) {
    const byOcc = new Map();
    for (const occ of occupations) {
        const items = occ[field];
        if (items && items.length > 0 && !items.some((i) => i.source === 'ai-inferred')) {
            byOcc.set(occ.onetCode, items.map((i) => ({
                name: i.name,
                importance: i.importance,
            })));
        }
    }
    return byOcc;
}

function applyItemsWithFallback(occCodes, itemsByOcc, topN) {
    const parentIndex = new Map();
    const minorIndex = new Map();
    const majorIndex = new Map();

    for (const code of itemsByOcc.keys()) {
        const p = parentCode(code);
        const m = minorGroup(code);
        const g = majorGroup(code);

        if (!parentIndex.has(p)) parentIndex.set(p, []);
        parentIndex.get(p).push(code);

        if (!minorIndex.has(m)) minorIndex.set(m, []);
        minorIndex.get(m).push(code);

        if (!majorIndex.has(g)) majorIndex.set(g, []);
        majorIndex.get(g).push(code);
    }

    const results = new Map();
    let directCount = 0, parentCount = 0, minorCount = 0, majorCount = 0, missCount = 0;

    for (const code of occCodes) {
        const directItems = itemsByOcc.get(code);
        if (directItems && directItems.length > 0) {
            results.set(code, {
                items: directItems
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, topN)
                    .map((s) => ({ name: s.name, importance: Math.round(s.importance * 100) / 100 })),
                source: null,
            });
            directCount++;
            continue;
        }

        const parentSiblings = (parentIndex.get(parentCode(code)) || [])
            .map((c) => itemsByOcc.get(c))
            .filter(Boolean);
        if (parentSiblings.length > 0) {
            results.set(code, {
                items: averageItems(parentSiblings, topN).map((item) => ({
                    ...item, source: 'onet-sibling-avg',
                })),
                source: 'onet-sibling-avg',
                sourceCount: parentSiblings.length,
            });
            parentCount++;
            continue;
        }

        const minorCousins = (minorIndex.get(minorGroup(code)) || [])
            .map((c) => itemsByOcc.get(c))
            .filter(Boolean);
        if (minorCousins.length > 0) {
            results.set(code, {
                items: averageItems(minorCousins, topN).map((item) => ({
                    ...item, source: 'onet-minor-avg',
                })),
                source: 'onet-minor-avg',
                sourceCount: minorCousins.length,
            });
            minorCount++;
            continue;
        }

        const majorCodes = (majorIndex.get(majorGroup(code)) || [])
            .map((c) => itemsByOcc.get(c))
            .filter(Boolean);
        if (majorCodes.length > 0) {
            results.set(code, {
                items: averageItems(majorCodes, topN).map((item) => ({
                    ...item, source: 'onet-major-avg',
                })),
                source: 'onet-major-avg',
                sourceCount: majorCodes.length,
            });
            majorCount++;
            continue;
        }

        missCount++;
    }

    return { results, stats: { directCount, parentCount, minorCount, majorCount, missCount } };
}

function main() {
    const startTime = Date.now();

    console.log('Step 1: Load backup data...');
    if (!fs.existsSync(BACKUP_PATH)) {
        console.error(`  Backup not found: ${BACKUP_PATH}`);
        console.error('  Need onetOccupations.backup.json (created by supplementOnetData.js)');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
    console.log(`  ${data.length} occupations loaded from backup`);

    const beforeK = data.filter((o) => o.topKnowledge?.length > 0).length;
    const beforeS = data.filter((o) => o.topSkills?.length > 0).length;
    const beforeT = data.filter((o) => o.hotTechnologies?.length > 0).length;
    console.log(`  Before: Knowledge=${beforeK}, Skills=${beforeS}, HotTech=${beforeT}`);

    const allCodes = data.map((o) => o.onetCode);

    console.log('\nStep 2: Process Knowledge data...');
    if (fs.existsSync(KNOWLEDGE_TSV)) {
        const knowledgeRows = parseTSV(KNOWLEDGE_TSV);
        console.log(`  Parsed ${knowledgeRows.length} rows from Knowledge.txt`);

        const knowledgeMap = buildItemMapFromTSV(knowledgeRows);
        console.log(`  ${knowledgeMap.size} occupation codes with direct knowledge data`);

        const { results: knowledgeResults, stats: kStats } = applyItemsWithFallback(allCodes, knowledgeMap, 8);
        console.log(`  Knowledge assignment: direct=${kStats.directCount}, sibling-avg=${kStats.parentCount}, minor-avg=${kStats.minorCount}, major-avg=${kStats.majorCount}, missing=${kStats.missCount}`);

        for (const occ of data) {
            const result = knowledgeResults.get(occ.onetCode);
            if (result) {
                occ.topKnowledge = result.items;
            }
        }
    } else {
        console.log(`  Knowledge.txt not found at ${KNOWLEDGE_TSV}`);
        console.log('  Using backup knowledge data (107 occupations with direct data)');

        const knowledgeMap = buildItemMapFromJSON(data, 'topKnowledge');
        console.log(`  ${knowledgeMap.size} occupation codes with existing knowledge data`);

        const { results: knowledgeResults, stats: kStats } = applyItemsWithFallback(allCodes, knowledgeMap, 8);
        console.log(`  Knowledge assignment: direct=${kStats.directCount}, sibling-avg=${kStats.parentCount}, minor-avg=${kStats.minorCount}, major-avg=${kStats.majorCount}, missing=${kStats.missCount}`);

        for (const occ of data) {
            const result = knowledgeResults.get(occ.onetCode);
            if (result) {
                occ.topKnowledge = result.items;
            }
        }
    }

    console.log('\nStep 3: Process Skills data...');
    if (fs.existsSync(SKILLS_TSV)) {
        const skillRows = parseTSV(SKILLS_TSV);
        console.log(`  Parsed ${skillRows.length} rows from Skills.txt`);

        const skillMap = buildItemMapFromTSV(skillRows);
        console.log(`  ${skillMap.size} occupation codes with direct skill data`);

        const { results: skillResults, stats: sStats } = applyItemsWithFallback(allCodes, skillMap, 10);
        console.log(`  Skills assignment: direct=${sStats.directCount}, sibling-avg=${sStats.parentCount}, minor-avg=${sStats.minorCount}, major-avg=${sStats.majorCount}, missing=${sStats.missCount}`);

        for (const occ of data) {
            const result = skillResults.get(occ.onetCode);
            if (result) {
                occ.topSkills = result.items;
            }
        }
    } else {
        console.log(`  Skills.txt not found, using backup data`);
        const skillMap = buildItemMapFromJSON(data, 'topSkills');
        const { results: skillResults, stats: sStats } = applyItemsWithFallback(allCodes, skillMap, 10);
        console.log(`  Skills: direct=${sStats.directCount}, avg=${sStats.parentCount + sStats.minorCount + sStats.majorCount}, missing=${sStats.missCount}`);
        for (const occ of data) {
            const result = skillResults.get(occ.onetCode);
            if (result) occ.topSkills = result.items;
        }
    }

    console.log('\nStep 4: Process Hot Technologies...');
    if (fs.existsSync(TECH_TSV)) {
        const techRows = parseTSV(TECH_TSV);
        console.log(`  Parsed ${techRows.length} rows from Technology_Skills.txt`);

        const techByOcc = new Map();
        for (const row of techRows) {
            const code = row['O*NET-SOC Code'];
            if (!code) continue;
            if (!techByOcc.has(code)) techByOcc.set(code, []);
            techByOcc.get(code).push({
                name: row['Example'] || row['Commodity Title'] || '',
                hot: row['Hot Technology'] === 'Y',
            });
        }
        console.log(`  ${techByOcc.size} occupation codes with tech data`);

        let directTech = 0, fallbackTech = 0;
        for (const occ of data) {
            let techs = techByOcc.get(occ.onetCode);
            if (!techs) {
                const pc = parentCode(occ.onetCode);
                for (const [code, items] of techByOcc) {
                    if (parentCode(code) === pc) { techs = items; break; }
                }
                if (!techs) {
                    const mg = minorGroup(occ.onetCode);
                    for (const [code, items] of techByOcc) {
                        if (minorGroup(code) === mg) { techs = items; break; }
                    }
                }
                if (techs) fallbackTech++;
            } else {
                directTech++;
            }
            if (techs) {
                const hotTechs = techs.filter((t) => t.hot);
                const seen = new Set();
                occ.hotTechnologies = (hotTechs.length > 0 ? hotTechs : techs)
                    .filter((t) => { if (seen.has(t.name)) return false; seen.add(t.name); return true; })
                    .slice(0, 15)
                    .map((t) => t.name);
            }
        }
        console.log(`  Tech: direct=${directTech}, fallback=${fallbackTech}`);
    } else {
        console.log('  Technology_Skills.txt not found, keeping backup data');
    }

    console.log('\nStep 5: Save results...');

    const refetchBackup = DATA_PATH.replace('.json', '.before-refetch.json');
    if (fs.existsSync(DATA_PATH)) {
        fs.copyFileSync(DATA_PATH, refetchBackup);
        console.log(`  Backup saved: ${path.basename(refetchBackup)}`);
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    const fileSize = (fs.statSync(DATA_PATH).size / 1024 / 1024).toFixed(1);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const afterK = data.filter((o) => o.topKnowledge?.length > 0).length;
    const afterS = data.filter((o) => o.topSkills?.length > 0).length;
    const afterT = data.filter((o) => o.hotTechnologies?.length > 0).length;

    const directK = data.filter((o) => o.topKnowledge?.length > 0 && !o.topKnowledge[0]?.source).length;
    const avgK = data.filter((o) => o.topKnowledge?.[0]?.source?.includes('avg')).length;
    const directS = data.filter((o) => o.topSkills?.length > 0 && !o.topSkills[0]?.source).length;
    const avgS = data.filter((o) => o.topSkills?.[0]?.source?.includes('avg')).length;
    const aiK = data.filter((o) => o.topKnowledge?.some((k) => k.source === 'ai-inferred')).length;
    const aiS = data.filter((o) => o.topSkills?.some((s) => s.source === 'ai-inferred')).length;

    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  O*NET Data Rebuild Complete (${elapsed}s)`);
    console.log(`${'═'.repeat(55)}`);
    console.log(`  Total: ${data.length} occupations | File: ${fileSize} MB`);
    console.log(``);
    console.log(`  Knowledge: ${afterK}/${data.length} (was ${beforeK})`);
    console.log(`    Direct O*NET:    ${directK}`);
    console.log(`    Sibling/Cousin:  ${avgK} (averaged from related occupations)`);
    console.log(`    AI-inferred:     ${aiK} (should be 0)`);
    console.log(``);
    console.log(`  Skills: ${afterS}/${data.length} (was ${beforeS})`);
    console.log(`    Direct O*NET:    ${directS}`);
    console.log(`    Sibling/Cousin:  ${avgS} (averaged from related occupations)`);
    console.log(`    AI-inferred:     ${aiS} (should be 0)`);
    console.log(``);
    console.log(`  Hot Technologies: ${afterT}/${data.length} (was ${beforeT})`);
    console.log(`${'═'.repeat(55)}`);

    console.log('\nSample results:');
    const sampleCodes = ['15-1252.00', '17-2199.09', '11-1011.00', '29-1141.00', '27-1024.00'];
    for (const code of sampleCodes) {
        const occ = data.find((o) => o.onetCode === code);
        if (occ) {
            const kSrc = occ.topKnowledge?.[0]?.source || 'onet-direct';
            const sSrc = occ.topSkills?.[0]?.source || 'onet-direct';
            console.log(`  ${occ.title} (${code}):`);
            console.log(`    K[${kSrc}]: ${occ.topKnowledge?.slice(0, 3).map((k) => `${k.name}(${k.importance})`).join(', ') || 'none'}`);
            console.log(`    S[${sSrc}]: ${occ.topSkills?.slice(0, 3).map((s) => `${s.name}(${s.importance})`).join(', ') || 'none'}`);
            console.log(`    Tech: ${occ.hotTechnologies?.slice(0, 4).join(', ') || 'none'}`);
        }
    }
}

main();
