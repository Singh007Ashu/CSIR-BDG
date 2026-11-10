import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";

async function GETHandler() {
  const { error } = await requireAnyAuth(); if (error) return error;
  const labs = await prisma.lab.findMany({ select: { id: true, name: true, code: true, location: true, expertise: true, labId: true, piName: true, accountStatus: true }, orderBy: { name: "asc" } });
  return NextResponse.json(labs);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  const body = await req.json(); if (!cleanText(body.name, 300)) return NextResponse.json({ error: "Lab name is required." }, { status: 400 });
  const lab = await prisma.lab.create({ data: { name: cleanText(body.name, 300), code: optionalText(body.code, 12)?.toUpperCase(), location: optionalText(body.location, 150), expertise: optionalText(body.expertise) } });
  return NextResponse.json(lab, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
