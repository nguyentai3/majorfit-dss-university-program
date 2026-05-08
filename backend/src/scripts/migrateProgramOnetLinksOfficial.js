const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');
const { prisma } = require('../db/prisma');

const CROSSWALK_URL = 'https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx';
const DEFAULT_TOP_SOC_PER_PROGRAM = 3;
const DEFAULT_TOP_SOC_PER_CIP = 8;
const DEFAULT_MIN_SOC_SCORE = 0.45;

function getArg(name, fallback = null) {
  const key = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(key));
  return found ? found.slice(key.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

function normalizeSoc(raw) {
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
  const cipTitleCol = pickColumn(headers, ['ciptitle']);
  const socCol = pickColumn(headers, ['onet-soc', 'soc2018code', 'soccode', 'soc']);
  const socTitleCol = pickColumn(headers, ['onet-soc2019title', 'soctitle', 'title']);

  if (!cipCol || !socCol) {
    throw new Error(`Cannot detect CIP/SOC columns. headers=${headers.join(', ')}`);
  }

  return rows
    .map((r) => ({
      cip: String(r[cipCol]).trim(),
      cipTitle: String(cipTitleCol ? r[cipTitleCol] : '').trim(),
      soc: normalizeSoc(r[socCol]),
      socTitle: String(socTitleCol ? r[socTitleCol] : '').trim(),
    }))
    .filter((r) => r.cip && r.soc);
}

function buildCrosswalkIndexes(rows) {
  const cipToSoc = new Map();
  const socToCip = new Map();
  for (const r of rows) {
    if (!cipToSoc.has(r.cip)) cipToSoc.set(r.cip, []);
    cipToSoc.get(r.cip).push(r);
    if (!socToCip.has(r.soc)) socToCip.set(r.soc, []);
    socToCip.get(r.soc).push(r);
  }
  return { cipToSoc, socToCip };
}

function rankMapEntries(mapObj, limit = 5) {
  return [...mapObj.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function scoreToRelevance(score) {
  if (score >= 1.15) return 10;
  if (score >= 0.95) return 9;
  if (score >= 0.75) return 8;
  if (score >= 0.60) return 7;
  return 6;
}

async function loadDbState() {
  const [programs, occupations, existingLinks] = await Promise.all([
    prisma.program.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, name: true },
    }),
    prisma.onetOccupation.findMany({
      select: { id: true, onetCode: true, title: true },
    }),
    prisma.programOnetLink.findMany({
      select: {
        id: true,
        programId: true,
        occupationId: true,
        relevance: true,
        isPrimary: true,
        note: true,
      },
    }),
  ]);
  return { programs, occupations, existingLinks };
}

function inferProgramCips({ programs, occupations, existingLinks, socToCip, topSocPerProgram, minSocScore }) {
  const occById = new Map(occupations.map((o) => [o.id, o]));
  const linksByProgram = new Map();
  for (const l of existingLinks) {
    if (!linksByProgram.has(l.programId)) linksByProgram.set(l.programId, []);
    linksByProgram.get(l.programId).push(l);
  }

  const inferred = [];
  const programById = new Map(programs.map((p) => [p.id, p]));

  for (const p of programs) {
    const links = linksByProgram.get(p.id) || [];
    if (!links.length) continue;

    const socWeights = new Map();
    for (const l of links) {
      const occ = occById.get(l.occupationId);
      if (!occ) continue;
      const soc = normalizeSoc(occ.onetCode);
      if (!soc) continue;
      const w = (Number(l.relevance) || 5) / 10;
      socWeights.set(soc, (socWeights.get(soc) || 0) + w);
    }

    const topSoc = rankMapEntries(socWeights, topSocPerProgram);
    const cipScores = new Map();
    for (const [soc, socScore] of topSoc) {
      const rows = socToCip.get(soc) || [];
      for (const r of rows) {
        cipScores.set(r.cip, (cipScores.get(r.cip) || 0) + socScore);
      }
    }
    const topCips = rankMapEntries(cipScores, 3);
    const selected = topCips.find(([, s]) => s >= minSocScore) || topCips[0];
    if (!selected) continue;

    inferred.push({
      programId: p.id,
      programCode: p.code,
      programName: p.name,
      cip: selected[0],
      cipScore: Number(selected[1].toFixed(3)),
      topSocEvidence: topSoc.map(([soc, s]) => ({ soc, score: Number(s.toFixed(3)) })),
      candidateCips: topCips.map(([cip, s]) => ({ cip, score: Number(s.toFixed(3)) })),
    });
  }

  inferred.sort((a, b) => a.programCode.localeCompare(b.programCode));
  return inferred;
}

function buildNewLinksFromInferred({ inferred, cipToSoc, occupations, topSocPerCip }) {
  const occBySoc = new Map();
  for (const o of occupations) {
    const soc = normalizeSoc(o.onetCode);
    if (soc && !occBySoc.has(soc)) occBySoc.set(soc, o);
  }

  const newLinks = [];
  const skippedMissingSoc = [];
  for (const row of inferred) {
    const cross = (cipToSoc.get(row.cip) || []).slice(0, topSocPerCip);
    let localRank = 0;
    for (const c of cross) {
      const occ = occBySoc.get(c.soc);
      if (!occ) {
        skippedMissingSoc.push({ programCode: row.programCode, cip: row.cip, soc: c.soc });
        continue;
      }
      localRank += 1;
      newLinks.push({
        programId: row.programId,
        occupationId: occ.id,
        relevance: scoreToRelevance(Math.max(0.5, row.cipScore - (localRank - 1) * 0.08)),
        isPrimary: localRank === 1,
        note: `Official CIP-SOC migration (${row.cip})`,
      });
    }
  }

  const byPair = new Map();
  for (const l of newLinks) {
    const key = `${l.programId}__${l.occupationId}`;
    const prev = byPair.get(key);
    if (!prev || l.relevance > prev.relevance) byPair.set(key, l);
    else if (prev && !prev.isPrimary && l.isPrimary) prev.isPrimary = true;
  }

  const deduped = [...byPair.values()];

  const byProgram = new Map();
  for (const l of deduped) {
    if (!byProgram.has(l.programId)) byProgram.set(l.programId, []);
    byProgram.get(l.programId).push(l);
  }
  for (const [, links] of byProgram.entries()) {
    links.sort((a, b) => b.relevance - a.relevance);
    links.forEach((l, idx) => {
      l.isPrimary = idx === 0;
    });
  }

  return { links: deduped, skippedMissingSoc };
}

function createBackupPayload(existingLinks) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    table: 'program_onet_links',
    rowCount: existingLinks.length,
    rows: existingLinks,
  };
}

function writeMarkdownReport(reportPath, summary) {
  const lines = [];
  lines.push('# Official CIP-SOC Migration Report');
  lines.push('');
  lines.push(`Mode: ${summary.mode}`);
  lines.push(`Crosswalk: ${summary.crosswalkUrl}`);
  lines.push('');
  lines.push('## Coverage');
  lines.push(`- Active programs: ${summary.activePrograms}`);
  lines.push(`- Programs with inferred CIP: ${summary.programsInferred}`);
  lines.push(`- Existing links (before): ${summary.existingLinks}`);
  lines.push(`- New links (computed): ${summary.newLinks}`);
  lines.push(`- Missing SOC in local O*NET DB: ${summary.missingSocCount}`);
  lines.push('');
  if (summary.backupPath) {
    lines.push('## Backup');
    lines.push(`- Backup file: \`${summary.backupPath}\``);
    lines.push(`- Rollback command: \`node src/scripts/migrateProgramOnetLinksOfficial.js --mode=rollback --backup=${summary.backupPath}\``);
    lines.push('');
  }
  lines.push('## Sample inferred CIP');
  lines.push('| Program | CIP | CIP score | Candidate CIPs |');
  lines.push('|---|---|---:|---|');
  for (const s of summary.sampleInferred) {
    const candidates = s.candidateCips.map((x) => `${x.cip}:${x.score}`).join('; ');
    lines.push(`| ${s.programCode} | ${s.cip} | ${s.cipScore} | ${candidates} |`);
  }
  lines.push('');
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

async function rollbackFromBackup(backupPath) {
  const abs = path.resolve(process.cwd(), backupPath);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const rows = Array.isArray(raw.rows) ? raw.rows : [];

  await prisma.$transaction(async (tx) => {
    await tx.programOnetLink.deleteMany({});
    for (const part of chunk(rows, 500)) {
      if (!part.length) continue;
      await tx.programOnetLink.createMany({
        data: part.map((r) => ({
          id: r.id,
          programId: r.programId,
          occupationId: r.occupationId,
          relevance: r.relevance,
          isPrimary: !!r.isPrimary,
          note: r.note || null,
        })),
      });
    }
  });
  return rows.length;
}

async function main() {
  const mode = getArg('mode', 'preview');
  const topSocPerProgram = Number(getArg('topSocPerProgram', String(DEFAULT_TOP_SOC_PER_PROGRAM)));
  const topSocPerCip = Number(getArg('topSocPerCip', String(DEFAULT_TOP_SOC_PER_CIP)));
  const minSocScore = Number(getArg('minSocScore', String(DEFAULT_MIN_SOC_SCORE)));
  const backupPathArg = getArg('backup', null);

  const repoRoot = path.resolve(__dirname, '../../..');
  const tmpDir = path.join(repoRoot, 'tools/.tmp');
  const backupDir = path.join(repoRoot, 'tools/backups');
  const reportDir = path.join(repoRoot, 'docs/thesis');
  ensureDir(tmpDir);
  ensureDir(backupDir);
  ensureDir(reportDir);

  if (mode === 'rollback') {
    if (!backupPathArg) throw new Error('Rollback mode requires --backup=<path>');
    const restored = await rollbackFromBackup(backupPathArg);
    const rollbackReport = path.join(reportDir, `OFFICIAL_SOC_CIP_ROLLBACK_${nowStamp()}.md`);
    writeMarkdownReport(rollbackReport, {
      mode,
      crosswalkUrl: CROSSWALK_URL,
      activePrograms: 0,
      programsInferred: 0,
      existingLinks: restored,
      newLinks: restored,
      missingSocCount: 0,
      backupPath: backupPathArg,
      sampleInferred: [],
    });
    console.log(`Rollback completed. Restored rows: ${restored}`);
    console.log(`Report: ${rollbackReport}`);
    return;
  }

  const xlsxPath = path.join(tmpDir, 'Education_CIP_to_ONET_SOC.xlsx');
  if (!fs.existsSync(xlsxPath) || hasArg('refreshCrosswalk')) {
    await downloadFile(CROSSWALK_URL, xlsxPath);
  }

  const rows = parseCrosswalkRows(xlsxPath);
  const { cipToSoc, socToCip } = buildCrosswalkIndexes(rows);
  const { programs, occupations, existingLinks } = await loadDbState();
  const inferred = inferProgramCips({
    programs,
    occupations,
    existingLinks,
    socToCip,
    topSocPerProgram,
    minSocScore,
  });
  const computed = buildNewLinksFromInferred({
    inferred,
    cipToSoc,
    occupations,
    topSocPerCip,
  });

  let backupPath = null;
  if (mode === 'apply') {
    const backupPayload = createBackupPayload(existingLinks);
    backupPath = path.join(backupDir, `program_onet_links_${nowStamp()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), 'utf8');

    await prisma.$transaction(async (tx) => {
      await tx.programOnetLink.deleteMany({});
      for (const part of chunk(computed.links, 500)) {
        await tx.programOnetLink.createMany({ data: part });
      }
    });
  }

  const reportPath = path.join(
    reportDir,
    `OFFICIAL_SOC_CIP_MIGRATION_${mode.toUpperCase()}_${nowStamp()}.md`,
  );
  writeMarkdownReport(reportPath, {
    mode,
    crosswalkUrl: CROSSWALK_URL,
    activePrograms: programs.length,
    programsInferred: inferred.length,
    existingLinks: existingLinks.length,
    newLinks: computed.links.length,
    missingSocCount: computed.skippedMissingSoc.length,
    backupPath,
    sampleInferred: inferred.slice(0, 20),
  });

  console.log(`Mode: ${mode}`);
  console.log(`Report: ${reportPath}`);
  if (backupPath) console.log(`Backup: ${backupPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
