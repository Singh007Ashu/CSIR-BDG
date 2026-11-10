import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth } from "../../../../../lib/session";
import { canAccessEntity } from "../../../../../lib/entityAccess";
import { cleanText, optionalText, safeDate } from "../../../../../lib/request";

async function POSTHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Deliverables must be added by the concerned laboratory." }, { status: 403 });
  const projectId = Number((await params).id);
  const access = await canAccessEntity(session, "CODEV_PROJECT", projectId, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json();
  if (!cleanText(body.title, 250) || !cleanText(body.type, 50)) return NextResponse.json({ error: "Deliverable title and type are required." }, { status: 400 });
  const item = await prisma.projectDeliverable.create({ data: { projectId, type: cleanText(body.type, 50), title: cleanText(body.title, 250), description: optionalText(body.description), dueDate: safeDate(body.dueDate), status: cleanText(body.status || "PLANNED", 30) } });
  return NextResponse.json(item, { status: 201 });
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Deliverables must be updated by the concerned laboratory." }, { status: 403 });
  const projectId = Number((await params).id); const access = await canAccessEntity(session, "CODEV_PROJECT", projectId, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json();
  const existing = await prisma.projectDeliverable.findFirst({ where: { id: Number(body.id), projectId } }); if (!existing) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });
  const item = await prisma.projectDeliverable.update({ where: { id: existing.id }, data: { status: cleanText(body.status || existing.status, 30), completedAt: body.status === "COMPLETED" ? new Date() : null } });
  return NextResponse.json(item);
}

export const POST = withApiBoundary(POSTHandler);
export const PATCH = withApiBoundary(PATCHHandler);
