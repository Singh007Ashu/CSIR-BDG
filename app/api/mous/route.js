import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeDate } from "../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const params = new URL(req.url).searchParams; const q = cleanText(params.get("q"), 200);
  const where = {
    ...(session.type === "lab" ? { labId: session.labId } : {}),
    ...(params.get("labId") && session.type === "user" ? { labId: Number(params.get("labId")) } : {}),
    ...(params.get("status") ? { status: params.get("status") } : {}),
    ...(params.get("from") || params.get("to") ? { signedDate: { ...(params.get("from") ? { gte: safeDate(params.get("from")) } : {}), ...(params.get("to") ? { lte: safeDate(params.get("to")) } : {}) } } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { mouNumber: { contains: q } }, { piName: { contains: q } }, { company: { name: { contains: q } } }, { lab: { name: { contains: q } } }, { project: { title: { contains: q } } }] } : {}),
  };
  const records = await prisma.mou.findMany({ where, include: { company: true, lab: { select: publicLabSelect }, project: true, documents: { where: { isCurrent: true, deletedAt: null } } }, orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }], take: 1000 });
  return NextResponse.json(records);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  const body = await req.json(); const labId = session.type === "lab" ? session.labId : Number(body.labId);
  if (!labId || !cleanText(body.title, 300) || !cleanText(body.companyName, 250)) return NextResponse.json({ error: "MOU title, lab and company are required." }, { status: 400 });
  const company = await prisma.company.upsert({ where: { name: cleanText(body.companyName, 250) }, update: {}, create: { name: cleanText(body.companyName, 250) } });
  const record = await prisma.mou.create({ data: {
    mouNumber: optionalText(body.mouNumber, 100), title: cleanText(body.title, 300), projectId: body.projectId ? Number(body.projectId) : null,
    companyId: company.id, labId, piName: optionalText(body.piName, 150), signedDate: safeDate(body.signedDate), expiryDate: safeDate(body.expiryDate),
    status: cleanText(body.status || (body.signedDate ? "ACTIVE" : "DRAFT"), 30), renewalReminderDays: Number(body.renewalReminderDays || 60),
    notes: optionalText(body.notes), createdByUserId: session.type === "user" ? session.userId : null,
  }, include: { company: true, lab: { select: publicLabSelect }, project: true } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "MOU_CREATED", entityType: "MOU", entityId: record.id });
  await notifyHeadBdgAndAdmins({ type: "NEW_MOU_UPLOADED", title: "New MOU record", message: `${record.lab.name} added an MOU with ${record.company.name}.`, link: "/mou-repository" });
  return NextResponse.json(record, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
