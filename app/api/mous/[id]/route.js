import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isAdmin } from "../../../../lib/session";
import { canAccessEntity } from "../../../../lib/entityAccess";
import { cleanText, optionalText, safeDate } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const access = await canAccessEntity(session, "MOU", (await params).id); if (!access.allowed) return NextResponse.json({ error: "MOU not found." }, { status: 404 });
  return NextResponse.json(await prisma.mou.findUnique({ where: { id: Number((await params).id) }, include: { company: true, lab: { select: publicLabSelect }, project: true, documents: { where: { deletedAt: null }, orderBy: [{ versionGroup: "asc" }, { version: "desc" }] } } }));
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const access = await canAccessEntity(session, "MOU", (await params).id, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json(); const data = {};
  for (const key of ["mouNumber", "title", "piName", "status", "notes"]) if (body[key] !== undefined) data[key] = ["title", "status"].includes(key) ? cleanText(body[key], 3000) : optionalText(body[key]);
  for (const key of ["signedDate", "expiryDate"]) if (body[key] !== undefined) data[key] = safeDate(body[key]);
  if (body.renewalReminderDays !== undefined) data.renewalReminderDays = Number(body.renewalReminderDays);
  if (body.companyName) { const company = await prisma.company.upsert({ where: { name: cleanText(body.companyName, 250) }, update: {}, create: { name: cleanText(body.companyName, 250) } }); data.companyId = company.id; }
  const record = await prisma.mou.update({ where: { id: Number((await params).id) }, data, include: { company: true, lab: { select: publicLabSelect }, project: true } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "MOU_UPDATED", entityType: "MOU", entityId: record.id, details: data });
  return NextResponse.json(record);
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isAdmin(session)) return NextResponse.json({ error: "Admin permission required." }, { status: 403 });
  await prisma.mou.delete({ where: { id: Number((await params).id) } }); return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
export const DELETE = withApiBoundary(DELETEHandler);
