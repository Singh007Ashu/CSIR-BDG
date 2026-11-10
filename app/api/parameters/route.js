import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit } from "../../../lib/labAuth";

async function GETHandler(req) {
  const { error } = await requireAnyAuth(); if (error) return error; const projectId = Number(new URL(req.url).searchParams.get("projectId")) || null;
  return NextResponse.json(await prisma.technologyParameter.findMany({ where: { active: true, OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])] }, include: { options: { where: { active: true }, orderBy: { displayOrder: "asc" } }, sopStage: true, project: true }, orderBy: { displayOrder: "asc" } }));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const body = await req.json(); const key = cleanText(body.key, 100); const label = cleanText(body.label, 200); if (!key || !label) return NextResponse.json({ error: "Key and label are required." }, { status: 400 });
  const parameter = await prisma.technologyParameter.create({ data: { key, label, description: optionalText(body.description), fieldType: cleanText(body.fieldType || "TEXT", 40), unit: optionalText(body.unit, 40), mandatory: Boolean(body.mandatory), active: true, projectId: body.projectId ? Number(body.projectId) : null, sopStageId: body.sopStageId ? Number(body.sopStageId) : null, referenceListKey: optionalText(body.referenceListKey, 100), displayOrder: Number(body.displayOrder) || 0, version: Number(body.version) || 1 } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "PARAMETER_CREATED", entityType: "TECHNOLOGY_PARAMETER", entityId: parameter.id, newValue: parameter, recordLabel: label }); return NextResponse.json(parameter, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
