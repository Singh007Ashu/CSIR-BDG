import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText, optionalText } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Only Head & Admin can change RACI ownership." }, { status: 403 });
  const id = Number((await params).id);
  const current = await prisma.raciAssignment.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "RACI assignment not found." }, { status: 404 });
  const body = await req.json();
  const data = {
    activity: cleanText(body.activity ?? current.activity, 300),
    responsibleUnit: cleanText(body.responsibleUnit ?? current.responsibleUnit, 1000),
    accountableUnit: cleanText(body.accountableUnit ?? current.accountableUnit, 1000),
    consultedUnits: optionalText(body.consultedUnits ?? current.consultedUnits, 2000),
    informedUnits: optionalText(body.informedUnits ?? current.informedUnits, 2000),
  };
  if (!data.activity || !data.responsibleUnit || !data.accountableUnit) return NextResponse.json({ error: "Activity, Responsible and Accountable are required." }, { status: 400 });
  const updated = await prisma.raciAssignment.update({ where: { id }, data });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "RACI_UPDATED", entityType: "RACI_ASSIGNMENT", entityId: id, oldValue: current, newValue: data, recordLabel: updated.activity });
  return NextResponse.json(updated);
}

export const PATCH = withApiBoundary(PATCHHandler);
