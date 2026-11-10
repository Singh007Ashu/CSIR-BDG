import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { MIME_BY_EXTENSION } from "../../../../../lib/uploadValidation";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth } from "../../../../../lib/session";
import { canAccessEntity } from "../../../../../lib/entityAccess";
import { readStoredFile } from "../../../../../lib/storage";

export const runtime = "nodejs";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const document = await prisma.document.findUnique({ where: { id: Number((await params).id) } });
  if (!document || document.deletedAt) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const access = await canAccessEntity(session, document.entityType, document.entityId);
  if (!access.allowed) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    const { bytes } = await readStoredFile(document.filePath);
    const preview = new URL(req.url).searchParams.get("preview") === "1" && ["pdf", "png", "jpg", "jpeg"].includes(document.fileType);
    const encodedName = encodeURIComponent(document.fileName).replace(/'/g, "%27");
    return new NextResponse(bytes, { headers: {
      "Content-Type": MIME_BY_EXTENSION[document.fileType] || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return NextResponse.json({ error: "Stored file is unavailable." }, { status: 404 });
  }
}

export const GET = withApiBoundary(GETHandler);
