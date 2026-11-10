const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function migrateText(value) {
  return value == null ? value : String(value)
    .replaceAll("LAB_FINANCE", "LAB_BD")
    .replaceAll("Lab Finance", "Lab BD")
    .replaceAll("Finance-certified", "Lab BD-confirmed")
    .replaceAll("finance-certified", "Lab BD-confirmed")
    .replaceAll("Laboratories / Finance", "Lab BD");
}

async function migrateStoredText() {
  const packets = await prisma.workflowPacket.findMany({ select: { id: true, analysisJson: true, routeReason: true, aiSummary: true } });
  for (const row of packets) await prisma.workflowPacket.update({ where: { id: row.id }, data: { analysisJson: migrateText(row.analysisJson), routeReason: migrateText(row.routeReason), aiSummary: migrateText(row.aiSummary) } });
  const analyses = await prisma.documentAnalysis.findMany({ select: { id: true, resultJson: true, summary: true, localExtractJson: true } });
  for (const row of analyses) await prisma.documentAnalysis.update({ where: { id: row.id }, data: { resultJson: migrateText(row.resultJson), summary: migrateText(row.summary), localExtractJson: migrateText(row.localExtractJson) } });
  const audits = await prisma.auditLog.findMany({ where: { OR: [{ details: { contains: "FINANCE" } }, { details: { contains: "Finance" } }, { oldValue: { contains: "FINANCE" } }, { newValue: { contains: "FINANCE" } }] }, select: { id: true, details: true, oldValue: true, newValue: true } });
  for (const row of audits) await prisma.auditLog.update({ where: { id: row.id }, data: { details: migrateText(row.details), oldValue: migrateText(row.oldValue), newValue: migrateText(row.newValue) } });
}

async function main() {
  await prisma.workflowStep.updateMany({ where: { unitRole: "LAB_FINANCE" }, data: { unitRole: "LAB_BD", instructions: "Historical route migrated to Lab BD ownership; original event history is preserved." } });
  await prisma.workflowPacket.updateMany({ where: { currentUnit: "LAB_FINANCE" }, data: { currentUnit: "LAB_BD" } });
  await prisma.workflowEvent.updateMany({ where: { fromUnit: "LAB_FINANCE" }, data: { fromUnit: "LAB_BD" } });
  await prisma.workflowEvent.updateMany({ where: { toUnit: "LAB_FINANCE" }, data: { toUnit: "LAB_BD" } });
  await migrateStoredText();

  const retired = await prisma.user.updateMany({ where: { OR: [{ role: "LAB_FINANCE" }, { email: "npl.finance@csir.res.in" }] }, data: { role: "RETIRED_LAB_ACCOUNT", roleId: null, assignedLabId: null, accountStatus: "INACTIVE" } });
  await prisma.role.deleteMany({ where: { key: "LAB_FINANCE" } });
  console.log(`Lab BD ownership migration complete. Disabled ${retired.count} retired account(s); all historical records were preserved.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());