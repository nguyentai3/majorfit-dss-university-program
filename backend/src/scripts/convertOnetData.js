
const fs = require('fs');
const path = require('path');

const ONET_DIR = '/tmp/onet_db';
const OUT_PATH = path.join(__dirname, '..', '..', 'data', 'onet', 'onetOccupations.json');

function parseTSV(filePath) {
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

const DIM_MAP = {
    Realistic: 'R',
    Investigative: 'I',
    Artistic: 'A',
    Social: 'S',
    Enterprising: 'E',
    Conventional: 'C',
};

const occupations = parseTSV(path.join(ONET_DIR, 'Occupation_Data.txt'));
const occMap = new Map();
for (const occ of occupations) {
    occMap.set(occ['O*NET-SOC Code'], {
        onetCode: occ['O*NET-SOC Code'],
        title: occ['Title'],
        description: occ['Description'],
        riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
        topSkills: [],
        topKnowledge: [],
    });
}
console.log(`Loaded ${occMap.size} occupations`);

const interests = parseTSV(path.join(ONET_DIR, 'Interests.txt'));
for (const row of interests) {
    if (row['Scale ID'] !== 'OI') continue;
    const occ = occMap.get(row['O*NET-SOC Code']);
    if (!occ) continue;
    const dim = DIM_MAP[row['Element Name']];
    if (dim) {
        occ.riasec[dim] = parseFloat(row['Data Value']) || 0;
    }
}

function parentCode(code) {
    return code.replace(/\.\d+$/, '');
}
function minorGroup(code) {
    return code.slice(0, 6);
}

const skills = parseTSV(path.join(ONET_DIR, 'Skills.txt'));
const skillsByOcc = new Map();
for (const row of skills) {
    if (row['Scale ID'] !== 'IM') continue;
    const code = row['O*NET-SOC Code'];
    if (!skillsByOcc.has(code)) skillsByOcc.set(code, []);
    skillsByOcc.get(code).push({
        name: row['Element Name'],
        importance: parseFloat(row['Data Value']) || 0,
    });
}
const parentSkillIndex = new Map();
const minorSkillIndex = new Map();
for (const code of skillsByOcc.keys()) {
    const p = parentCode(code);
    if (!parentSkillIndex.has(p)) parentSkillIndex.set(p, []);
    parentSkillIndex.get(p).push(code);
    const m = minorGroup(code);
    if (!minorSkillIndex.has(m)) minorSkillIndex.set(m, []);
    minorSkillIndex.get(m).push(code);
}
for (const occ of occMap.values()) {
    let items = skillsByOcc.get(occ.onetCode);
    if (!items) {
        const siblings = parentSkillIndex.get(parentCode(occ.onetCode)) || [];
        for (const sib of siblings) {
            if (skillsByOcc.has(sib)) { items = skillsByOcc.get(sib); break; }
        }
    }
    if (!items) {
        const cousins = minorSkillIndex.get(minorGroup(occ.onetCode)) || [];
        for (const c of cousins) {
            if (skillsByOcc.has(c)) { items = skillsByOcc.get(c); break; }
        }
    }
    if (items) {
        occ.topSkills = items
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 10)
            .map((s) => ({ name: s.name, importance: Math.round(s.importance * 100) / 100 }));
    }
}

const knowledge = parseTSV(path.join(ONET_DIR, 'Knowledge.txt'));
const knowledgeByOcc = new Map();
for (const row of knowledge) {
    if (row['Scale ID'] !== 'IM') continue;
    const code = row['O*NET-SOC Code'];
    if (!knowledgeByOcc.has(code)) knowledgeByOcc.set(code, []);
    knowledgeByOcc.get(code).push({
        name: row['Element Name'],
        importance: parseFloat(row['Data Value']) || 0,
    });
}
const parentKnowledgeIndex = new Map();
const minorKnowledgeIndex = new Map();
for (const code of knowledgeByOcc.keys()) {
    const p = parentCode(code);
    if (!parentKnowledgeIndex.has(p)) parentKnowledgeIndex.set(p, []);
    parentKnowledgeIndex.get(p).push(code);
    const m = minorGroup(code);
    if (!minorKnowledgeIndex.has(m)) minorKnowledgeIndex.set(m, []);
    minorKnowledgeIndex.get(m).push(code);
}
for (const occ of occMap.values()) {
    let items = knowledgeByOcc.get(occ.onetCode);
    if (!items) {
        const siblings = parentKnowledgeIndex.get(parentCode(occ.onetCode)) || [];
        for (const sib of siblings) {
            if (knowledgeByOcc.has(sib)) { items = knowledgeByOcc.get(sib); break; }
        }
    }
    if (!items) {
        const cousins = minorKnowledgeIndex.get(minorGroup(occ.onetCode)) || [];
        for (const c of cousins) {
            if (knowledgeByOcc.has(c)) { items = knowledgeByOcc.get(c); break; }
        }
    }
    if (items) {
        occ.topKnowledge = items
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 8)
            .map((k) => ({ name: k.name, importance: Math.round(k.importance * 100) / 100 }));
    }
}

const techSkills = parseTSV(path.join(ONET_DIR, 'Technology_Skills.txt'));
const techByOcc = new Map();
for (const row of techSkills) {
    const code = row['O*NET-SOC Code'];
    if (!techByOcc.has(code)) techByOcc.set(code, []);
    techByOcc.get(code).push({
        name: row['Example'] || row['Commodity Title'] || '',
        category: row['Commodity Title'] || '',
        hot: row['Hot Technology'] === 'Y',
    });
}
for (const occ of occMap.values()) {
    const techs = techByOcc.get(occ.onetCode) || [];
    const hotTechs = techs.filter((t) => t.hot);
    const seen = new Set();
    occ.hotTechnologies = (hotTechs.length > 0 ? hotTechs : techs)
        .filter((t) => {
            if (seen.has(t.name)) return false;
            seen.add(t.name);
            return true;
        })
        .slice(0, 15)
        .map((t) => t.name);
}

const result = [...occMap.values()].filter((occ) => {
    const total = Object.values(occ.riasec).reduce((s, v) => s + v, 0);
    return total > 0;
});

for (const occ of result) {
    const sorted = Object.entries(occ.riasec).sort((a, b) => b[1] - a[1]);
    occ.hollandCode = sorted
        .slice(0, 3)
        .map(([d]) => d)
        .join('');
}

result.sort((a, b) => a.onetCode.localeCompare(b.onetCode));

fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf-8');

console.log(`\nWrote ${result.length} occupations to ${OUT_PATH}`);
console.log(`Sample: ${result[0].onetCode} "${result[0].title}" → ${result[0].hollandCode}`);

const withSkills = result.filter((o) => o.topSkills.length > 0).length;
const withKnowledge = result.filter((o) => o.topKnowledge.length > 0).length;
const withTech = result.filter((o) => o.hotTechnologies && o.hotTechnologies.length > 0).length;
console.log(`  With skills: ${withSkills}/${result.length}`);
console.log(`  With knowledge: ${withKnowledge}/${result.length}`);
console.log(`  With technologies: ${withTech}/${result.length}`);
const fileSize = (fs.statSync(OUT_PATH).size / (1024 * 1024)).toFixed(1);
console.log(`  File size: ${fileSize} MB`);
