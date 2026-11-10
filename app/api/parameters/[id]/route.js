import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText, optionalText } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error; if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const id = Number((await params).id); const current = await prisma.technologyParameter.findUnique({ where: { id } }); if (!current) return NextResponse.json({ error: "Parameter not found." }, { status: 404 }); const body = await req.json(); const data = {};
  for (const field of ["label", "description", "fieldType", "unit", "referenceListKey"]) if (body[field] !== undefined) data[field] = ["description", "unit", "referenceListKey"].includes(field) ? optionalText(body[field], 1000) : cleanText(body[field], 200);
  for (const field of ["mandatory", "active"]) if (body[field] !== undefined) data[field] = Boolean(body[field]); if (body.displayOrder !== undefined) data.displayOrder = Number(body.displayOrder) || 0; if (body.sopStageId !== undefined) data.sopStageId = body.sopStageId ? Number(body.sopStageId) : null;
  const parameter = await prisma.technologyParameter.update({ where: { id }, data }); await logAudit({ actorType: "USER", actorUserId: session.userId, action: "PARAMETER_UPDATED", entityType: "TECHNOLOGY_PARAMETER", entityId: id, oldValue: current, newValue: data, recordLabel: parameter.label }); return NextResponse.json(parameter);
}

export const PATCH = withApiBoundary(PATCHHandler);
