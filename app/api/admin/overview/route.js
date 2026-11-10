import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { safeAuditRows } from "../../../../lib/auditRedaction";

async function GETHandler() {
  const { error } = await requireRole(["ADMIN"]); if (error) return error;
  const [labs, users, categories, imports, auditLogs, loginHistory, counts] = await Promise.all([
    prisma.lab.findMany({ orderBy: [{ accountStatus: "asc" }, { name: "asc" }], select: { ...publicLabSelect, _count: { select: { technologies: true, projects: true, mous: true } } } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, accountStatus: true, createdAt: true, organization: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.datasetCategory.findMany({ include: { _count: { select: { technologies: true, imports: true } } }, orderBy: { name: "asc" } }),
    prisma.datasetImport.findMany({ include: { category: true, importedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.findMany({ include: { actorLab: { select: { name: true } }, actorUser: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.loginHistory.findMany({ include: { lab: { select: { name: true } }, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    Promise.all([prisma.technology.count(), prisma.coDevelopmentProject.count(), prisma.mou.count(), prisma.changeRequest.count({ where: { status: "PENDING" } }), prisma.notification.count({ where: { read: false } })]),
  ]);
  return NextResponse.json({ labs, users, categories, imports, auditLogs: safeAuditRows(auditLogs), loginHistory, counts: { technologies: counts[0], projects: counts[1], mous: counts[2], pendingApprovals: counts[3], unreadNotifications: counts[4] } });
}

export const GET = withApiBoundary(GETHandler);
