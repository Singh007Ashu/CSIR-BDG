import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeDate, safeNumber } from "../../../lib/request";
import { ensureStorageFolder } from "../../../lib/storage";
import { logAudit } from "../../../lib/labAuth";
import { slugify, syncTechnologySop } from "../../../lib/governance";

async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const projects = await prisma.project.findMany({
    where: {},
    include: {
      responsibleOfficer: { select: { id: true, name: true } },
      technologies: {
        where: session.type === "lab" ? { technology: { labId: session.labId } } : {},
        include: { technology: { include: { lab: { select: publicLabSelect } } } },
      },
      _count: { select: { technologies: true, reports: true, queries: true, evidence: true } },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  const labs = await prisma.lab.findMany({ select: { id: true, code: true, name: true } });
  const labMap = new Map(labs.map((lab) => [lab.id, lab]));
  const expanded = projects.map((project) => { let ids = []; try { ids = JSON.parse(project.assignedLabIdsJson || "[]"); } catch {} return { ...project, assignedLabs: ids.map((id) => labMap.get(Number(id))).filter(Boolean) }; });
  return NextResponse.json(session.type === "lab" ? expanded.filter((project) => project.isSystem || project.assignedLabs.some((lab) => lab.id === session.labId)) : expanded);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Only HEAD/Admin can create project containers." }, { status: 403 });
  const body = await req.json(); const name = cleanText(body.name, 200); if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const assignedLabIds = [...new Set((Array.isArray(body.assignedLabIds) ? body.assignedLabIds : []).map(Number).filter(Boolean))];
  if (!assignedLabIds.length) return NextResponse.json({ error: "Assign at least one laboratory." }, { status: 400 });
  const validLabs = await prisma.lab.count({ where: { id: { in: assignedLabIds }, accountStatus: "ACTIVE" } });
  if (validLabs !== assignedLabIds.length) return NextResponse.json({ error: "One or more assigned laboratories are invalid or inactive." }, { status: 400 });
  let slug = slugify(body.slug || name); if (!slug) return NextResponse.json({ error: "A valid project name is required." }, { status: 400 });
  const duplicate = await prisma.project.findFirst({ where: { OR: [{ name }, { slug }] } }); if (duplicate) return NextResponse.json({ error: "Project name or slug already exists." }, { status: 409 });
  const folderPath = `projects/${slug}`; await ensureStorageFolder(folderPath);
  let initialTechnology = null;
  if (session.type === "lab" && body.initialTechnologyId) {
    initialTechnology = await prisma.technology.findFirst({ where: { id: Number(body.initialTechnologyId), labId: session.labId, recordScope: "MASTER" } });
    if (!initialTechnology) return NextResponse.json({ error: "Select a valid technology owned by your laboratory." }, { status: 400 });
  }
  if (session.type === "lab" && !initialTechnology && !cleanText(body.initialTechnologyName, 300)) return NextResponse.json({ error: "Select an existing technology or enter the first technology for this project." }, { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    if (session.type === "lab" && !initialTechnology) {
      const technologyName = cleanText(body.initialTechnologyName, 300);
      const existing = await tx.technology.findFirst({ where: { labId: session.labId, name: technologyName, recordScope: "MASTER" } });
      if (existing) initialTechnology = existing;
      else initialTechnology = await tx.technology.create({ data: { name: technologyName, labId: session.labId, briefDescription: cleanText(body.initialTechnologyDescription || "Technology profile pending completion.", 10000), piName: optionalText(body.initialTechnologyPi, 150), sector: optionalText(body.initialTechnologySector, 300), trl: safeNumber(body.initialTechnologyTrl), recordFinancialYear: safeNumber(body.initialTechnologyYear), recordScope: "MASTER", approvalStatus: "DRAFT", sopLegacyExempt: false } });
    }
    const project = await tx.project.create({ data: { name, slug, description: optionalText(body.description, 5000), projectType: cleanText(body.projectType || "GENERAL", 100), startDate: safeDate(body.startDate), endDate: safeDate(body.endDate), responsibleOfficerId: session.type === "user" && body.responsibleOfficerId ? Number(body.responsibleOfficerId) : null, status: session.type === "lab" ? "PENDING_REVIEW" : cleanText(body.status || "ACTIVE", 40), notes: optionalText(body.notes, 5000), assignedLabIdsJson: JSON.stringify(assignedLabIds), folderPath, createdById: session.type === "user" ? session.userId : null } });
    if (initialTechnology) await tx.projectTechnology.create({ data: { projectId: project.id, technologyId: initialTechnology.id, relationshipType: session.type === "lab" ? "LAB_SUBMITTED" : "LINKED_MASTER", linkedById: session.type === "user" ? session.userId : null } });
    return project;
  });
  if (initialTechnology) await syncTechnologySop(initialTechnology.id, initialTechnology);
  await logAudit({ actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null, action: "PROJECT_CREATED", entityType: "PROJECT", entityId: result.id, newValue: result, recordLabel: result.name });
  return NextResponse.json(result, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
