import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeDate, safeNumber } from "../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const params = new URL(req.url).searchParams;
  const q = cleanText(params.get("q"), 200);
  const where = {
    ...(session.type === "lab" ? { labId: session.labId } : {}),
    ...(params.get("labId") && session.type === "user" ? { labId: Number(params.get("labId")) } : {}),
    ...(params.get("status") ? { status: params.get("status") } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { projectId: { contains: q } }, { technologyArea: { contains: q } }, { piName: { contains: q } }, { company: { name: { contains: q } } }] } : {}),
  };
  const projects = await prisma.coDevelopmentProject.findMany({ where, include: { lab: { select: publicLabSelect }, company: true, commercialization: true, _count: { select: { documents: true, deliverables: true, mous: true } } }, orderBy: { updatedAt: "desc" }, take: 1000 });
  return NextResponse.json(projects);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Co-development records must be created by the concerned laboratory." }, { status: 403 });
  const body = await req.json();
  const labId = session.labId;
  if (!labId || !cleanText(body.title, 300) || !cleanText(body.piName, 150) || !cleanText(body.companyName, 250)) return NextResponse.json({ error: "Project title, lab, PI and company are required." }, { status: 400 });
  const company = await prisma.company.upsert({ where: { name: cleanText(body.companyName, 250) }, update: { contactName: optionalText(body.companyContact, 150), contactEmail: optionalText(body.companyEmail, 254) }, create: { name: cleanText(body.companyName, 250), contactName: optionalText(body.companyContact, 150), contactEmail: optionalText(body.companyEmail, 254) } });
  let project = await prisma.coDevelopmentProject.create({ data: {
    projectId: `PENDING-${randomUUID()}`, title: cleanText(body.title, 300), technologyArea: optionalText(body.technologyArea, 150), labId,
    piName: cleanText(body.piName, 150), coPiName: optionalText(body.coPiName, 150), companyId: company.id, duration: optionalText(body.duration, 100),
    startDate: safeDate(body.startDate), endDate: safeDate(body.endDate), objectives: optionalText(body.objectives), scopeOfWork: optionalText(body.scopeOfWork),
    deliverablesSummary: optionalText(body.deliverablesSummary), milestones: optionalText(body.milestones), totalProjectCost: safeNumber(body.totalProjectCost),
    csirContribution: safeNumber(body.csirContribution), industryContribution: safeNumber(body.industryContribution), fundingAgency: optionalText(body.fundingAgency, 200),
    paymentStatus: optionalText(body.paymentStatus, 50), status: cleanText(body.status || "DRAFT", 50), createdByUserId: session.type === "user" ? session.userId : null,
  } });
  project = await prisma.coDevelopmentProject.update({ where: { id: project.id }, data: { projectId: `CSIR-CODEV-${new Date().getFullYear()}-${String(project.id).padStart(4, "0")}` }, include: { lab: { select: publicLabSelect }, company: true } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "CODEV_PROJECT_CREATED", entityType: "CODEV_PROJECT", entityId: project.id });
  await notifyHeadBdgAndAdmins({ type: "NEW_CODEV_PROJECT", title: "New co-development project", message: `${project.lab.name} created ${project.title}.`, link: `/co-development/${project.id}` });
  return NextResponse.json(project, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
