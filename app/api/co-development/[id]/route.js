import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager, isAdmin } from "../../../../lib/session";
import { canAccessEntity } from "../../../../lib/entityAccess";
import { cleanText, optionalText, safeDate, safeNumber } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const access = await canAccessEntity(session, "CODEV_PROJECT", (await params).id); if (!access.allowed) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const project = await prisma.coDevelopmentProject.findUnique({ where: { id: Number((await params).id) }, include: { lab: { select: publicLabSelect }, company: true, commercialization: true, deliverables: { orderBy: { createdAt: "desc" } }, mous: { include: { company: true } }, documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } } } });
  return NextResponse.json(project);
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Project details must be updated by the concerned laboratory." }, { status: 403 });
  const access = await canAccessEntity(session, "CODEV_PROJECT", (await params).id, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json();
  const data = {};
  const textFields = ["title", "technologyArea", "piName", "coPiName", "duration", "objectives", "scopeOfWork", "deliverablesSummary", "milestones", "fundingAgency", "paymentStatus", "status"];
  for (const key of textFields) if (body[key] !== undefined) data[key] = ["title", "piName", "status"].includes(key) ? cleanText(body[key], 5000) : optionalText(body[key]);
  for (const key of ["startDate", "endDate"]) if (body[key] !== undefined) data[key] = safeDate(body[key]);
  for (const key of ["totalProjectCost", "csirContribution", "industryContribution"]) if (body[key] !== undefined) data[key] = safeNumber(body[key]);
  if (body.companyName) {
    const company = await prisma.company.upsert({ where: { name: cleanText(body.companyName, 250) }, update: {}, create: { name: cleanText(body.companyName, 250) } }); data.companyId = company.id;
  }
  if (body.labId && isManager(session)) data.labId = Number(body.labId);
  const project = await prisma.coDevelopmentProject.update({ where: { id: Number((await params).id) }, data, include: { lab: { select: publicLabSelect }, company: true, commercialization: true } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "CODEV_PROJECT_UPDATED", entityType: "CODEV_PROJECT", entityId: project.id, details: data });
  return NextResponse.json(project);
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isAdmin(session)) return NextResponse.json({ error: "Admin permission required." }, { status: 403 });
  await prisma.coDevelopmentProject.delete({ where: { id: Number((await params).id) } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "CODEV_PROJECT_DELETED", entityType: "CODEV_PROJECT", entityId: Number((await params).id) });
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
export const DELETE = withApiBoundary(DELETEHandler);
