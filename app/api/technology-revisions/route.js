import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, safeDate } from "../../../lib/request";
import { logAudit, notifyLab } from "../../../lib/labAuth";

const include = { technology: { select: { id: true, name: true, approvalStatus: true } }, lab: { select: { id: true, code: true, name: true } }, requestedBy: { select: { id: true, name: true, role: true } } };

async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const where = session.type === "lab" ? { labId: session.labId } : isManager(session) ? {} : { labId: session.assignedLabId || -1 };
  const requests = await prisma.technologyRevisionRequest.findMany({ where, include, orderBy: { updatedAt: "desc" }, take: 300 });
  return NextResponse.json(requests);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const body = await req.json();
  const technology = await prisma.technology.findUnique({ where: { id: Number(body.technologyId) }, select: { id: true, labId: true, name: true } });
  if (!technology) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
  const instructions = cleanText(body.instructions, 5000);
  if (!instructions) return NextResponse.json({ error: "Tell the laboratory exactly what must be changed." }, { status: 400 });
  const request = await prisma.technologyRevisionRequest.create({ data: { technologyId: technology.id, labId: technology.labId, requestedById: session.userId, instructions, requestedFieldsJson: JSON.stringify(Array.isArray(body.fields) ? body.fields.slice(0, 30) : []), dueAt: safeDate(body.dueAt) }, include });
  await notifyLab(technology.labId, { type: "TECHNOLOGY_REVISION", title: "Technology change requested", message: `${technology.name}: ${instructions}`, link: "/master-technologies" });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "TECHNOLOGY_REVISION_REQUESTED", entityType: "TECHNOLOGY", entityId: technology.id, details: { revisionRequestId: request.id, instructions } });
  return NextResponse.json(request, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
