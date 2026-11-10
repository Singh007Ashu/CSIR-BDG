import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../../lib/session";
import { cleanText } from "../../../../../lib/request";
import { logAudit } from "../../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const projectId = Number((await params).id);
  const links = await prisma.projectTechnology.findMany({ where: { projectId, ...(session.type === "lab" ? { technology: { labId: session.labId } } : {}) }, include: { technology: { include: { lab: { select: publicLabSelect }, documents: { where: { isCurrent: true, deletedAt: null }, select: { id: true } } } } }, orderBy: { technology: { name: "asc" } } });
  return NextResponse.json(links);
}

async function POSTHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "Head, Admin or a laboratory account is required." }, { status: 403 });
  const projectId = Number((await params).id); const body = await req.json(); const technologyId = Number(body.technologyId);
  const [project, technology] = await Promise.all([prisma.project.findUnique({ where: { id: projectId } }), prisma.technology.findUnique({ where: { id: technologyId }, include: { lab: { select: publicLabSelect } } })]);
  if (!project || !technology) return NextResponse.json({ error: "Project or technology not found." }, { status: 404 });
  if (project.isSystem) return NextResponse.json({ error: "System project containers cannot be changed here." }, { status: 409 });
  if (technology.recordScope !== "MASTER") return NextResponse.json({ error: "Only master technologies can be linked." }, { status: 409 });
  if (session.type === "lab") {
    if (technology.labId !== session.labId) return NextResponse.json({ error: "A laboratory can link only its own technologies." }, { status: 403 });
    let assigned = []; try { assigned = JSON.parse(project.assignedLabIdsJson || "[]").map(Number); } catch {}
    if (!assigned.includes(session.labId)) return NextResponse.json({ error: "This project is not assigned to your laboratory." }, { status: 403 });
  } else if (technology.approvalStatus !== "APPROVED") return NextResponse.json({ error: "Head/Admin can link only approved master technologies." }, { status: 409 });
  const link = await prisma.projectTechnology.upsert({ where: { projectId_technologyId: { projectId, technologyId } }, update: { projectStatus: "ACTIVE", projectStage: cleanText(body.projectStage, 100) || null, projectData: body.projectData ? JSON.stringify(body.projectData) : null }, create: { projectId, technologyId, relationshipType: session.type === "lab" ? "LAB_SUBMITTED" : "LINKED_MASTER", projectStage: cleanText(body.projectStage, 100) || null, projectData: body.projectData ? JSON.stringify(body.projectData) : null, linkedById: session.type === "user" ? session.userId : null } });
  await logAudit({ actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null, action: "TECHNOLOGY_LINKED_TO_PROJECT", entityType: "PROJECT_TECHNOLOGY", entityId: link.id, details: { projectId, technologyId }, recordLabel: `${project.name} / ${technology.name}` });
  return NextResponse.json(link, { status: 201 });
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const projectId = Number((await params).id); const technologyId = Number(new URL(req.url).searchParams.get("technologyId"));
  const link = await prisma.projectTechnology.findUnique({ where: { projectId_technologyId: { projectId, technologyId } } }); if (!link) return NextResponse.json({ error: "Project link not found." }, { status: 404 });
  await prisma.projectTechnology.update({ where: { id: link.id }, data: { projectStatus: "INACTIVE" } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "TECHNOLOGY_UNLINKED_FROM_PROJECT", entityType: "PROJECT_TECHNOLOGY", entityId: link.id, details: { projectId, technologyId } });
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
export const DELETE = withApiBoundary(DELETEHandler);
