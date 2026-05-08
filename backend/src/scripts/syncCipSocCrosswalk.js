const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { prisma } = require('../db/prisma');

const CROSSWALK_URL = 'https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx';
const SOURCE_NAME = 'ONET_OFFICIAL_CIP_SOC';

function getArg(name, fallback = null) {
  const key = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(key));
  return found ? found.slice(key.length) : fallback;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
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

function fileSha256(absPath) {
  const data = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(data).digest('hex');
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
  const cipTitleCol = pickColumn(headers, ['ciptitle']);
  const socCol = pickColumn(headers, ['onet-soc', 'soc2018code', 'soccode', 'soc']);
  const socTitleCol = pickColumn(headers, ['onet-soc2019title', 'soctitle', 'title']);
  if (!cipCol || !socCol) {
    throw new Error(`Cannot detect CIP/SOC columns. headers=${headers.join(', ')}`);
  }

  const dedupe = new Map();
  for (const r of rows) {
    const cipCode = String(r[cipCol] || '').trim();
    const socCode = normalizeSocCode(r[socCol]);
    if (!cipCode || !socCode) continue;
    const key = `${cipCode}__${socCode}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, {
        cipCode,
        cipTitle: String(cipTitleCol ? r[cipTitleCol] : '').trim() || null,
        socCode,
        socTitle: String(socTitleCol ? r[socTitleCol] : '').trim() || null,
      });
    }
  }
  return [...dedupe.values()];
}

async function syncCrosswalk({ dataVersion = null, dryRun = false } = {}) {
  const repoRoot = path.resolve(__dirname, '../../..');
  const tmpDir = path.resolve(repoRoot, 'tools/.tmp');
  ensureDir(tmpDir);
  const filePath = path.join(tmpDir, 'Education_CIP_to_ONET_SOC.xlsx');
  await downloadFile(CROSSWALK_URL, filePath);

  const fileHash = fileSha256(filePath);
  const parsedRows = parseCrosswalkRows(filePath);
  const rowCount = parsedRows.length;

  if (dryRun) {
    return { dryRun, fileHash, rowCount, inserted: 0, sourceId: null };
  }

  const source = await prisma.cipSocCrosswalkSource.create({
    data: {
      sourceName: SOURCE_NAME,
      sourceUrl: CROSSWALK_URL,
      dataVersion: dataVersion || null,
      fileHash,
      rowCount,
    },
    select: { id: true },
  });

  const batch = 1000;
  for (let i = 0; i < parsedRows.length; i += batch) {
    const part = parsedRows.slice(i, i + batch);
    await prisma.cipSocCrosswalk.createMany({
      data: part.map((r) => ({
        sourceId: source.id,
        cipCode: r.cipCode,
        cipTitle: r.cipTitle,
        socCode: r.socCode,
        socTitle: r.socTitle,
      })),
    });
  }

  return { dryRun, fileHash, rowCount, inserted: rowCount, sourceId: source.id };
}

async function main() {
  const dryRun = String(getArg('dryRun', 'false')).toLowerCase() === 'true';
  const dataVersion = getArg('dataVersion', null);
  const out = await syncCrosswalk({ dataVersion, dryRun });
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  syncCrosswalk,
  parseCrosswalkRows,
};
