import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";
import { cleanText, optionalText } from "../../../../lib/request";

async function POSTHandler(req) {
  const { error } = await requireRole(["ADMIN"]); if (error) return error;
  const body = await req.json(); const name = cleanText(body.name, 150); const slug = cleanText(body.slug || name, 150).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!name || !slug) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const category = await prisma.datasetCategory.create({ data: { name, slug, description: optionalText(body.description) } });
  return NextResponse.json(category, { status: 201 });
}

export const POST = withApiBoundary(POSTHandler);
