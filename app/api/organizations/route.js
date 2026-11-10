import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

async function GETHandler() {
  const { error } = await requireUser();
  if (error) return error;
  const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(orgs);
}

async function POSTHandler(req) {
  const { error } = await requireUser();
  if (error) return error;
  const body = await req.json();
  if (!body.name || !body.type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }
  const org = await prisma.organization.create({
    data: {
      name: body.name,
      type: body.type,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
    },
  });
  return NextResponse.json(org, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
