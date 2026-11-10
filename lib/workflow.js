import { prisma } from "./db";
import { isManagerRole, isGoverningRole, LAB_GOVERNING_ROLES } from "./roles";

export function workflowWhere(session) {
  if (session.type === "lab") return { labId: session.labId };
  if (isManagerRole(session.role)) return {};
  if (LAB_GOVERNING_ROLES.includes(session.role)) return { labId: session.assignedLabId || -1 };
  if (isGoverningRole(session.role)) return { OR: [{ currentUnit: session.role }, { steps: { some: { unitRole: session.role } } }] };
  return { id: -1 };
}

export const workflowInclude = {
  lab: { select: { id: true, code: true, name: true } },
  technology: { select: { id: true, name: true } },
  sopStage: { select: { code: true, name: true, stageNumber: true } },
  documents: { include: { document: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } } } } },
  steps: { include: { assignedUser: { select: { id: true, name: true } } }, orderBy: { sequence: "asc" } },
  events: { include: { actorUser: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 30 },
};

export async function getVisiblePacket(id, session) {
  return prisma.workflowPacket.findFirst({ where: { id: Number(id), ...workflowWhere(session) }, include: workflowInclude });
}

export function nextReference() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `CSIR-WF-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
