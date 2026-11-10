import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../../lib/session";
import { cleanText, optionalText } from "../../../../../lib/request";
import { logAudit } from "../../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Only Head & Admin can change the active SOP." }, { status: 403 });
  const id = Number((await params).id);
  const current = await prisma.sopStage.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "SOP stage not found." }, { status: 404 });
  const body = await req.json();
  const data = {};
  if (body.name !== undefined) data.name = cleanText(body.name, 250);
  if (body.objective !== undefined) data.objective = optionalText(body.objective, 3000);
  if (body.responsibleUnit !== undefined) data.responsibleUnit = optionalText(body.responsibleUnit, 1000);
  if (body.accountableUnit !== undefined) data.accountableUnit = optionalText(body.accountableUnit, 1000);
  if (body.consultedUnits !== undefined) data.consultedUnits = optionalText(body.consultedUnits, 2000);
  if (body.informedUnits !== undefined) data.informedUnits = optionalText(body.informedUnits, 2000);
  if (body.mandatoryForNew !== undefined) data.mandatoryForNew = Boolean(body.mandatoryForNew);
  if (body.name !== undefined && !data.name) return NextResponse.json({ error: "Stage name is required." }, { status: 400 });
  const updated = await prisma.sopStage.update({ where: { id }, data });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "SOP_STAGE_UPDATED", entityType: "SOP_STAGE", entityId: id, oldValue: current, newValue: data, recordLabel: updated.code + " " + updated.name });
  return NextResponse.json(updated);
}

export const PATCH = withApiBoundary(PATCHHandler);
