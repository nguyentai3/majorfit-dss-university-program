const fs = require('fs');
const path = require('path');
const { prisma } = require('../db/prisma');
const { syncCrosswalk } = require('./syncCipSocCrosswalk');

function getArg(name, fallback = null) {
  const key = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(key));
  return found ? found.slice(key.length) : fallback;
}

async function collectMetrics() {
  const [sources, latest, programs, links, onetCount] = await Promise.all([
    prisma.cipSocCrosswalkSource.count(),
    prisma.cipSocCrosswalkSource.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { id: true, dataVersion: true, rowCount: true, syncedAt: true },
    }),
    prisma.program.count({ where: { status: 'ACTIVE' } }),
    prisma.programOnetLink.count(),
    prisma.onetOccupation.count(),
  ]);

  let crosswalkRows = 0;
  let mappedSocDistinct = 0;
  let mappedCipDistinct = 0;
  let onetCoverage = 0;
  if (latest?.id) {
    const [rows, socGrouped, cipGrouped] = await Promise.all([
      prisma.cipSocCrosswalk.count({ where: { sourceId: latest.id } }),
      prisma.cipSocCrosswalk.groupBy({
        by: ['socCode'],
        where: { sourceId: latest.id },
      }),
      prisma.cipSocCrosswalk.groupBy({
        by: ['cipCode'],
        where: { sourceId: latest.id },
      }),
    ]);
    crosswalkRows = rows;
    mappedSocDistinct = socGrouped.length;
    mappedCipDistinct = cipGrouped.length;
    const onetSocRows = await prisma.onetOccupation.findMany({
      select: { onetCode: true },
    });
    const socSet = new Set(socGrouped.map((x) => x.socCode));
    const hit = onetSocRows.filter((o) => socSet.has(o.onetCode)).length;
    onetCoverage = onetSocRows.length ? hit / onetSocRows.length : 0;
  }

  return {
    sourceCount: sources,
    latestSource: latest
      ? {
          id: latest.id,
          dataVersion: latest.dataVersion || '',
          rowCount: latest.rowCount,
          syncedAt: latest.syncedAt,
        }
      : null,
    activePrograms: programs,
    programOnetLinks: links,
    onetOccupations: onetCount,
    crosswalkRows,
    mappedSocDistinct,
    mappedCipDistinct,
    onetCoverage,
  };
}

function toMd(before, after, syncResult) {
  const lines = [];
  lines.push('# Crosswalk Sync Benchmark');
  lines.push('');
  lines.push(`Sync source: ${'https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx'}`);
  lines.push(`Synced sourceId: ${syncResult.sourceId || 'dry-run'}`);
  lines.push(`Rows inserted: ${syncResult.inserted}`);
  lines.push('');
  lines.push('| Metric | Before | After | Delta |');
  lines.push('|---|---:|---:|---:|');
  const rows = [
    ['Crosswalk sources', before.sourceCount, after.sourceCount],
    ['Crosswalk rows (latest)', before.crosswalkRows, after.crosswalkRows],
    ['Distinct SOC (latest)', before.mappedSocDistinct, after.mappedSocDistinct],
    ['Distinct CIP (latest)', before.mappedCipDistinct, after.mappedCipDistinct],
    ['O*NET SOC coverage', Number((before.onetCoverage * 100).toFixed(2)), Number((after.onetCoverage * 100).toFixed(2))],
    ['Active programs', before.activePrograms, after.activePrograms],
    ['Program O*NET links', before.programOnetLinks, after.programOnetLinks],
  ];
  for (const [name, a, b] of rows) {
    const delta = Number((b - a).toFixed ? (b - a).toFixed(2) : b - a);
    lines.push(`| ${name} | ${a} | ${b} | ${delta} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('- This benchmark tracks crosswalk data quality and coverage, not end-user ranking quality.');
  lines.push('- To evaluate ranking impact, run matching A/B scripts separately.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dataVersion = getArg('dataVersion', null);
  const before = await collectMetrics();
  const syncResult = await syncCrosswalk({ dataVersion, dryRun: false });
  const after = await collectMetrics();

  const outDir = path.resolve(__dirname, '../../../docs/thesis');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `CROSSWALK_SYNC_BENCHMARK_${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(file, toMd(before, after, syncResult), 'utf8');
  console.log(`Wrote ${file}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
