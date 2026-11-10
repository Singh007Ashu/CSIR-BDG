import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const projects = await prisma.project.findMany({ where: { isSystem: false }, select: { id: true, assignedLabIdsJson: true, technologies: { select: { technology: { select: { labId: true } } } } } });
  let updated = 0;
  for (const project of projects) {
    if (project.assignedLabIdsJson) continue;
    const ids = [...new Set(project.technologies.map((link) => link.technology.labId).filter(Boolean))];
    await prisma.project.update({ where: { id: project.id }, data: { assignedLabIdsJson: JSON.stringify(ids) } });
    updated += 1;
  }
  console.log(`Backfilled assignments for ${updated} project(s).`);
} finally {
  await prisma.$disconnect();
}

