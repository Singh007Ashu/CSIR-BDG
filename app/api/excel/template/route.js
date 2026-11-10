import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth } from "../../../../lib/session";
import { readStoredFile } from "../../../../lib/storage";

export const runtime = "nodejs";

async function GETHandler() {
  const { error } = await requireAnyAuth(); if (error) return error; const template = await prisma.excelTemplate.findFirst({ where: { active: true }, orderBy: { effectiveFrom: "desc" } }); if (!template) return NextResponse.json({ error: "No active Excel template is configured." }, { status: 404 }); const { bytes } = await readStoredFile(template.filePath); return new NextResponse(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${template.fileName}"`, "Cache-Control": "no-store" } });
}

export const GET = withApiBoundary(GETHandler);
