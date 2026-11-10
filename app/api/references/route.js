import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit } from "../../../lib/labAuth";

async function GETHandler() {
  const { error } = await requireAnyAuth(); if (error) return error;
  return NextResponse.json(await prisma.referenceList.findMany({ where: { active: true }, include: { options: { where: { active: true }, orderBy: { displayOrder: "asc" } } }, orderBy: { label: "asc" } }));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const body = await req.json(); const key = cleanText(body.key, 100).replace(/\s+/g, "_"); const label = cleanText(body.label || key, 150); if (!key || !label) return NextResponse.json({ error: "List key and label are required." }, { status: 400 });
  const list = await prisma.referenceList.upsert({ where: { key }, update: { label, description: optionalText(body.description), active: true }, create: { key, label, description: optionalText(body.description) } });
  if (Array.isArray(body.options)) for (let index = 0; index < body.options.length; index += 1) { const value = cleanText(body.options[index]?.value ?? body.options[index], 200); if (value) await prisma.referenceOption.upsert({ where: { listId_value: { listId: list.id, value } }, update: { label: cleanText(body.options[index]?.label || value, 200), active: true, displayOrder: index }, create: { listId: list.id, value, label: cleanText(body.options[index]?.label || value, 200), displayOrder: index } }); }
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "REFERENCE_LIST_UPDATED", entityType: "REFERENCE_LIST", entityId: list.id, newValue: body, recordLabel: label });
  return NextResponse.json(list, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
