import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit } from "../../../lib/labAuth";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const params = new URL(req.url).searchParams; const where = { ...(session.type === "lab" ? { labId: session.labId } : {}), ...(params.get("recordType") ? { recordType: params.get("recordType") } : {}), ...(params.get("projectId") ? { projectId: Number(params.get("projectId")) } : {}), ...(params.get("technologyId") ? { technologyId: Number(params.get("technologyId")) } : {}) }; return NextResponse.json(await prisma.sopDataRecord.findMany({ where, include: { lab: { select: publicLabSelect }, technology: true, project: true }, orderBy: { updatedAt: "desc" } }));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const body = await req.json(); const labId = session.type === "lab" ? session.labId : Number(body.labId); if (!labId || (session.type === "user" && !isManager(session))) return NextResponse.json({ error: "Permission denied." }, { status: 403 }); if (body.technologyId) { const technology = await prisma.technology.findUnique({ where: { id: Number(body.technologyId) } }); if (!technology || (session.type === "lab" && technology.labId !== session.labId)) return NextResponse.json({ error: "Technology not found." }, { status: 404 }); }
  const record = await prisma.sopDataRecord.create({ data: { recordType: cleanText(body.recordType, 50).toUpperCase(), labId, technologyId: body.technologyId ? Number(body.technologyId) : null, projectId: body.projectId ? Number(body.projectId) : null, projectTechnologyId: body.projectTechnologyId ? Number(body.projectTechnologyId) : null, periodLabel: optionalText(body.periodLabel, 50), dataJson: JSON.stringify(body.data || {}), status: cleanText(body.status || "DRAFT", 30), createdByType: session.type.toUpperCase(), createdById: session.type === "user" ? session.userId : session.labId } }); await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: `${record.recordType}_RECORDED`, entityType: "SOP_DATA", entityId: record.id, newValue: body.data }); return NextResponse.json(record, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
