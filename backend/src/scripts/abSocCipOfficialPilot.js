const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');
const { prisma } = require('../db/prisma');
const { runMatchingForUser } = require('../services/matching/matchingService');

const CROSSWALK_URL = 'https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx';

const PROGRAM_CIP_MAP = {
  'HCMIU-BT': '26.1201',
  'HCMIU-CHEMBIO': '26.0202',
};

const USERS_TO_CHECK = [
  { email: 'ly@gmail.com', expectedKeywords: ['bio', 'biotech', 'hcmiu-bt', 'chembio'] },
  { email: 'huynhnguyen@gmail.com', expectedKeywords: ['bio', 'medical', 'biotech'] },
  { email: 'pntuyen.0402@gmail.com', expectedKeywords: ['education', 'law', 'architecture'] },
  { email: 'phuongkhanh@gmail.com', expectedKeywords: ['design', 'media', 'journalism', 'architecture'] },
];

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(outputPath, () => reject(err));
    });
  });
}

function normalizeSocCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/^\d{2}-\d{4}\.\d{2}$/.test(text)) return text;
  if (/^\d{2}-\d{4}$/.test(text)) return `${text}.00`;
  return null;
}

function pickColumn(headers, candidates) {
  const normalized = headers.map((h) => String(h).toLowerCase().replace(/\s+/g, ''));
  for (const c of candidates) {
    const idx = normalized.findIndex((h) => h.includes(c));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function parseCrosswalkRows(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', range: 3 });
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);
  const cipCol = pickColumn(headers, ['cipcode', 'cip2020code', 'cip']);
  const socCol = pickColumn(headers, ['soccode', 'soc2018code', 'onet-soc', 'soc']);
  const relCol = pickColumn(headers, ['relation', 'match', 'link']);

  if (!cipCol || !socCol) {
    throw new Error(`Cannot detect CIP/SOC columns in sheet headers: ${headers.join(', ')}`);
  }

  return rows.map((r) => ({
    cip: String(r[cipCol]).trim(),
    soc: normalizeSocCode(r[socCol]),
    relation: relCol ? String(r[relCol]).trim() : '',
  })).filter((r) => r.cip && r.soc);
}

function relevanceFromRelation(relation) {
  const rel = String(relation || '').toLowerCase();
  if (rel.includes('direct')) return 9;
  if (rel.includes('high')) return 8;
  if (rel.includes('medium')) return 7;
  return 6;
}

async function collectBaseline(users) {
  const out = {};
  for (const u of users) {
    const user = await prisma.user.findFirst({ where: { email: u.email }, select: { id: true } });
    if (!user) {
      out[u.email] = { error: 'User not found' };
      continue;
    }
    const run = await runMatchingForUser(user.id, { limit: 20, includeAiExplanation: false });
    out[u.email] = { rows: (run.results || []).slice(0, 20) };
  }
  return out;
}

function topText(rows, n = 5) {
  return rows.slice(0, n).map((r, i) => `${i + 1}. ${r.program?.code} (${Number(r.finalScore || 0).toFixed(2)})`).join(' ; ');
}

function topHasExpected(rows, keywords, n = 5) {
  const low = (s) => String(s || '').toLowerCase();
  return rows.slice(0, n).some((r) => {
    const hay = `${r.program?.code || ''} ${r.program?.name || ''}`.toLowerCase();
    return keywords.some((k) => hay.includes(low(k)));
  });
}

async function applyOfficialPilot(rows) {
  const snapshots = [];
  let changed = 0;

  for (const [programCode, cip] of Object.entries(PROGRAM_CIP_MAP)) {
    const program = await prisma.program.findFirst({ where: { code: programCode }, select: { id: true, code: true } });
    if (!program) continue;

    const existingLinks = await prisma.programOnetLink.findMany({ where: { programId: program.id } });
    snapshots.push({ programId: program.id, existingLinks });

    await prisma.programOnetLink.deleteMany({ where: { programId: program.id } });

    const socRows = rows.filter((r) => r.cip === cip);
    const insertedOcc = new Set();

    for (const r of socRows) {
      const occ = await prisma.onetOccupation.findFirst({
        where: {
          OR: [
            { onetCode: r.soc },
            { onetCode: { startsWith: r.soc.slice(0, 7) } },
          ],
        },
        select: { id: true, onetCode: true, title: true },
      });
      if (!occ || insertedOcc.has(occ.id)) continue;
      insertedOcc.add(occ.id);

      await prisma.programOnetLink.create({
        data: {
          programId: program.id,
          occupationId: occ.id,
          relevance: relevanceFromRelation(r.relation),
          isPrimary: false,
          note: `Official CIP-SOC pilot (${cip})`,
        },
      });
      changed += 1;
    }

    const newLinks = await prisma.programOnetLink.findMany({
      where: { programId: program.id },
      orderBy: { relevance: 'desc' },
    });
    if (newLinks[0]) {
      await prisma.programOnetLink.update({
        where: { id: newLinks[0].id },
        data: { isPrimary: true },
      });
    }
  }

  return { snapshots, changed };
}

async function rollbackPilot(snapshots) {
  for (const s of snapshots) {
    await prisma.programOnetLink.deleteMany({ where: { programId: s.programId } });
    if (s.existingLinks.length > 0) {
      await prisma.programOnetLink.createMany({
        data: s.existingLinks.map((x) => ({
          id: x.id,
          programId: x.programId,
          occupationId: x.occupationId,
          relevance: x.relevance,
          isPrimary: x.isPrimary,
          note: x.note,
        })),
      });
    }
  }
}

async function main() {
  const outDir = path.resolve(__dirname, '../../../docs/thesis');
  const tmpDir = path.resolve(__dirname, '../../../tools/.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const xlsxPath = path.join(tmpDir, 'Education_CIP_to_ONET_SOC.xlsx');

  await downloadFile(CROSSWALK_URL, xlsxPath);
  const crosswalkRows = parseCrosswalkRows(xlsxPath);
  const baseline = await collectBaseline(USERS_TO_CHECK);

  let snapshots = [];
  let changed = 0;
  try {
    const applied = await applyOfficialPilot(crosswalkRows);
    snapshots = applied.snapshots;
    changed = applied.changed;
    const after = await collectBaseline(USERS_TO_CHECK);

    const lines = [];
    lines.push('# AB Official SOC-CIP Pilot (Temporary, Rolled Back)');
    lines.push('');
    lines.push(`Crosswalk source: ${CROSSWALK_URL}`);
    lines.push(`Programs tested: ${Object.keys(PROGRAM_CIP_MAP).join(', ')}`);
    lines.push(`Temporary links inserted: ${changed}`);
    lines.push('');
    lines.push('| User | Expected hit Top5 (A) | Expected hit Top5 (B) | BT rank A | BT rank B | Top5 A | Top5 B |');
    lines.push('|---|---:|---:|---:|---:|---|---|');

    for (const u of USERS_TO_CHECK) {
      const a = baseline[u.email];
      const b = after[u.email];
      if (!a || !b || a.error || b.error) {
        lines.push(`| ${u.email} | - | - | - | - | error | error |`);
        continue;
      }
      const aRows = a.rows;
      const bRows = b.rows;
      const aHit = topHasExpected(aRows, u.expectedKeywords, 5);
      const bHit = topHasExpected(bRows, u.expectedKeywords, 5);
      const aBt = aRows.findIndex((r) => r.program?.code === 'HCMIU-BT');
      const bBt = bRows.findIndex((r) => r.program?.code === 'HCMIU-BT');
      lines.push(
        `| ${u.email} | ${aHit ? 1 : 0} | ${bHit ? 1 : 0} | ${aBt >= 0 ? aBt + 1 : 'out'} | ${bBt >= 0 ? bBt + 1 : 'out'} | ${topText(aRows, 5)} | ${topText(bRows, 5)} |`,
      );
    }

    lines.push('');
    lines.push('## Notes');
    lines.push('- This is a pilot with official crosswalk data (not handcrafted SOC picks).');
    lines.push('- DB links for tested programs were restored immediately after AB run.');
    lines.push('- MatchingRun logs created during AB are kept as audit traces.');

    const reportPath = path.join(outDir, 'AB_OFFICIAL_SOC_CIP_PILOT.md');
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    console.log(`Wrote ${reportPath}`);
  } finally {
    if (snapshots.length > 0) {
      await rollbackPilot(snapshots);
      console.log('Rolled back official SOC-CIP pilot changes.');
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
