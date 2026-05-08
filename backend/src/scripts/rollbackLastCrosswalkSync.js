const { prisma } = require('../db/prisma');

async function main() {
  const latest = await prisma.cipSocCrosswalkSource.findFirst({
    orderBy: { syncedAt: 'desc' },
    select: { id: true, syncedAt: true, rowCount: true, dataVersion: true },
  });
  if (!latest) {
    console.log('No crosswalk source found. Nothing to rollback.');
    return;
  }
  await prisma.cipSocCrosswalkSource.delete({
    where: { id: latest.id },
  });
  console.log(
    `Rolled back latest crosswalk source: ${latest.id} (rows=${latest.rowCount}, version=${latest.dataVersion || 'n/a'})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
