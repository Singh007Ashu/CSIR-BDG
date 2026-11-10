import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText, optionalText, safeDate } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const key = (await params).id; const where = /^\d+$/.test(key) ? { id: Number(key) } : { slug: key };
  const project = await prisma.project.findUnique({ where, include: { responsibleOfficer: { select: { id: true, name: true } }, technologies: { where: session.type === "lab" ? { technology: { labId: session.labId } } : {}, include: { technology: { include: { lab: { select: publicLabSelect } } } }, orderBy: { technology: { name: "asc" } } }, parameters: { where: { active: true }, orderBy: { displayOrder: "asc" } }, reports: { include: { submissions: { where: session.type === "lab" ? { labId: session.labId } : {}, include: { lab: { select: publicLabSelect } } } } }, evidence: true } });
  let assigned = []; try { assigned = JSON.parse(project?.assignedLabIdsJson || "[]").map(Number); } catch {}
  if (!project || (session.type === "lab" && !project.isSystem && !assigned.includes(session.labId))) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(project);
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const id = Number((await params).id); const current = await prisma.project.findUnique({ where: { id } }); if (!current) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const body = await req.json(); const data = {};
  for (const field of ["name", "description", "projectType", "status", "notes"]) if (body[field] !== undefined) data[field] = ["description", "notes"].includes(field) ? optionalText(body[field], 5000) : cleanText(body[field], 200);
  for (const field of ["startDate", "endDate"]) if (body[field] !== undefined) data[field] = safeDate(body[field]);
  if (body.responsibleOfficerId !== undefined) data.responsibleOfficerId = body.responsibleOfficerId ? Number(body.responsibleOfficerId) : null;
  const project = await prisma.project.update({ where: { id }, data });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "PROJECT_UPDATED", entityType: "PROJECT", entityId: id, oldValue: current, newValue: data, recordLabel: project.name });
  return NextResponse.json(project);
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
