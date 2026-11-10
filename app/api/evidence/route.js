import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { saveUpload } from "../../../lib/storage";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit } from "../../../lib/labAuth";

export const runtime = "nodejs";

async function access(session, entityType, entityId) {
  if (isManager(session)) return { allowed: true, labId: null, technologyId: entityType === "TECHNOLOGY" ? entityId : null, projectId: entityType === "PROJECT" ? entityId : null };
  if (session.type !== "lab") return { allowed: false };
  if (entityType === "TECHNOLOGY") { const row = await prisma.technology.findFirst({ where: { id: entityId, labId: session.labId } }); return { allowed: Boolean(row), labId: session.labId, technologyId: entityId, projectId: null }; }
  if (entityType === "PROJECT") { const row = await prisma.projectTechnology.findFirst({ where: { projectId: entityId, technology: { labId: session.labId } } }); return { allowed: Boolean(row), labId: session.labId, technologyId: null, projectId: entityId }; }
  if (entityType === "QUERY") { const row = await prisma.query.findFirst({ where: { id: entityId, targetLabId: session.labId } }); return { allowed: Boolean(row), labId: session.labId, technologyId: row?.technologyId || null, projectId: row?.projectId || null }; }
  return { allowed: false };
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const params = new URL(req.url).searchParams; const entityType = cleanText(params.get("entityType"), 30).toUpperCase(); const entityId = Number(params.get("entityId")); const permission = await access(session, entityType, entityId); if (!permission.allowed) return NextResponse.json({ error: "Evidence not found or access denied." }, { status: 404 }); return NextResponse.json(await prisma.evidence.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } }));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const form = await req.formData(); const entityType = cleanText(form.get("entityType"), 30).toUpperCase(); const entityId = Number(form.get("entityId")); const permission = await access(session, entityType, entityId); if (!permission.allowed) return NextResponse.json({ error: "Record not found or access denied." }, { status: 404 }); const files = form.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function"); if (!files.length || files.length > 10) return NextResponse.json({ error: "Upload between 1 and 10 evidence files." }, { status: 400 }); const created = [];
  for (const file of files) { const saved = await saveUpload(file, `evidence-${entityType}`, entityId); created.push(await prisma.evidence.create({ data: { evidenceType: cleanText(form.get("evidenceType") || "SUPPORTING_EVIDENCE", 100), title: cleanText(form.get("title") || file.name, 300), description: optionalText(form.get("description"), 2000), entityType, entityId, technologyId: permission.technologyId, projectId: permission.projectId, labId: permission.labId, fileName: cleanText(file.name, 255), filePath: saved.relativePath, certifiedBy: optionalText(form.get("certifiedBy"), 300), uploadedById: session.type === "user" ? session.userId : null } })); }
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "EVIDENCE_UPLOADED", entityType, entityId, details: { count: created.length } }); return NextResponse.json(created, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
