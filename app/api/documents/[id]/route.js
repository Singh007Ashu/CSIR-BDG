import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth } from "../../../../lib/session";
import { canAccessEntity, ENTITY_FIELD } from "../../../../lib/entityAccess";
import { saveUpload, discardNewUpload } from "../../../../lib/storage";
import { cleanText, optionalText } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

export const runtime = "nodejs";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const existing = await prisma.document.findUnique({ where: { id: Number((await params).id) } });
  if (!existing || existing.deletedAt) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (!existing.isCurrent) return NextResponse.json({ error: "This version has been superseded. Reload the current document." }, { status: 409 });
  if (existing.entityType === "COMMERCIAL_ENGAGEMENT" && session.type !== "lab") return NextResponse.json({ error: "Only the laboratory can change pricing documents." }, { status: 403 });
  const access = await canAccessEntity(session, existing.entityType, existing.entityId, true);
  if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    const updated = await prisma.document.update({ where: { id: existing.id }, data: { description: optionalText(form.get("description"), 1000) } });
    return NextResponse.json(updated);
  }
  let saved;
  try { saved = await saveUpload(file, existing.entityType, existing.entityId); }
  catch (error) { return NextResponse.json({ error: error.message || "Upload failed." }, { status: 400 }); }
  let replacement;
  try { replacement = await prisma.$transaction(async (tx) => {
    const changed = await tx.document.updateMany({ where: { id: existing.id, isCurrent: true, deletedAt: null }, data: { isCurrent: false } });
    if (changed.count !== 1) throw Object.assign(new Error("Document changed concurrently."), { code: "STALE_DOCUMENT" });
    return tx.document.create({ data: {
      entityType: existing.entityType, entityId: existing.entityId, [ENTITY_FIELD[existing.entityType]]: existing.entityId,
      fileName: cleanText(file.name, 255), fileType: saved.extension, mimeType: cleanText(file.type, 150) || null,
      filePath: saved.relativePath, fileSize: file.size, versionGroup: existing.versionGroup, version: existing.version + 1,
      description: optionalText(form.get("description"), 1000) ?? existing.description, supersedesId: existing.id,
      uploadedByLabId: session.type === "lab" ? session.labId : null, uploadedByUserId: session.type === "user" ? session.userId : null,
    } });
  }); } catch (error) {
    await discardNewUpload(saved.relativePath).catch(() => console.error("UPLOAD_CLEANUP_FAILED"));
    if (["STALE_DOCUMENT", "P2034", "P1008"].includes(error.code)) return NextResponse.json({ error: "The document changed. Reload and retry using the current version." }, { status: 409 });
    throw error;
  }
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "DOCUMENT_REPLACED", entityType: existing.entityType, entityId: existing.entityId, details: { previousId: existing.id, replacementId: replacement.id } });
  return NextResponse.json(replacement);
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const document = await prisma.document.findUnique({ where: { id: Number((await params).id) } });
  if (!document || document.deletedAt) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (document.entityType === "COMMERCIAL_ENGAGEMENT" && session.type !== "lab") return NextResponse.json({ error: "Only the laboratory can change pricing documents." }, { status: 403 });
  const access = await canAccessEntity(session, document.entityType, document.entityId, true);
  if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date(), isCurrent: false } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "DOCUMENT_DELETED", entityType: document.entityType, entityId: document.entityId, details: { documentId: document.id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiBoundary(PATCHHandler);
export const DELETE = withApiBoundary(DELETEHandler);
