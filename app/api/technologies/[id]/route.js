import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager, isAdmin } from "../../../../lib/session";
import { cleanText, optionalText, safeNumber } from "../../../../lib/request";
import { logAudit, notifyLab } from "../../../../lib/labAuth";
import { missingLabSubmissionFields, missingTechnologyFields, syncTechnologySop } from "../../../../lib/governance";

import { parseFinancialYear } from "../../../../lib/financialYear";

const TEXT_FIELDS = ["name", "briefDescription", "piName", "advantages", "applications", "keyFeatures", "sector", "theme", "subSector", "industryMap", "applicationMap", "servicesOffered", "classification", "ipStatus", "technologyType", "commercialisationStage", "partnerClient", "responsibleBdOfficer", "remarks", "ecfInformation", "businessValueInformation", "impactInformation", "evidenceReference", "status"];

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const technology = await prisma.technology.findUnique({ where: { id: Number((await params).id) }, include: { lab: { select: publicLabSelect }, datasetCategory: true, requests: { include: { organization: true } }, documents: { where: { deletedAt: null }, orderBy: [{ versionGroup: "asc" }, { version: "desc" }] }, projectLinks: { include: { project: true } }, sopStatuses: { include: { sopStage: true }, orderBy: { sopStage: { stageNumber: "asc" } } }, parameterValues: { include: { parameter: true } } } });
  if (!technology || (session.type === "lab" && technology.labId !== session.labId)) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
  return NextResponse.json(technology);
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const id = Number((await params).id);
  const current = await prisma.technology.findUnique({ where: { id }, include: { lab: { select: publicLabSelect } } });
  if (!current || (session.type === "lab" && current.labId !== session.labId)) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
  const body = await req.json();
  if (["HEAD_ADMIN","HEAD_BDG"].includes(session.role) && (!body.reviewAction || Object.keys(body).some(key=>!["reviewAction","reviewRemarks"].includes(key)))) return NextResponse.json({ error: "HEAD cannot edit laboratory data. Use Request Changes." }, { status: 403 });
  const openRevision = session.type === "lab" ? await prisma.technologyRevisionRequest.findFirst({ where: { technologyId: id, labId: session.labId, status: { in: ["OPEN", "IN_PROGRESS", "RETURNED"] } }, orderBy: { createdAt: "desc" } }) : null;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  const data = {};
  if (body.ipStatus === null || body.ipStatus === "") body.ipStatus = "NOT_RECORDED";
  for (const field of TEXT_FIELDS) if (body[field] !== undefined) data[field] = ["name", "briefDescription", "classification", "status"].includes(field) ? cleanText(body[field], field === "briefDescription" ? 10000 : 5000) : optionalText(body[field], 10000);
  for (const field of ["trl", "crl"]) if (body[field] !== undefined) data[field] = safeNumber(body[field]);
  if (body.recordFinancialYear !== undefined) {
    const year = body.recordFinancialYear === "" || body.recordFinancialYear === null ? null : parseFinancialYear(body.recordFinancialYear), currentYear = new Date().getFullYear();
    if ((body.recordFinancialYear && year === null) || (year !== null && (!Number.isInteger(year) || year < 1900 || year > currentYear))) return NextResponse.json({ error: `Financial year must be between 1900 and ${currentYear}.` }, { status: 400 });
    data.recordFinancialYear = year;
  }
  if (body.submit) {
    const proposed = { ...current, ...data };
    const missing = session.type === "lab" ? missingLabSubmissionFields(proposed) : missingTechnologyFields(proposed);
    if (missing.length) return NextResponse.json({ error: "Mandatory SOP fields are incomplete.", missing }, { status: 400 });
    data.approvalStatus = "PENDING"; data.submittedAt = new Date();
  }
  if (isManager(session) && body.reviewAction) {
    const action = cleanText(body.reviewAction, 30).toUpperCase();
    if (!["APPROVED", "RETURNED", "REJECTED"].includes(action)) return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
    const proposed = { ...current, ...data };
    const missing = missingTechnologyFields(proposed);
    if (action === "APPROVED" && missing.length && !current.sopLegacyExempt) return NextResponse.json({ error: "Technology cannot be approved with missing mandatory SOP fields.", missing }, { status: 400 });
    data.approvalStatus = action; data.approvedAt = action === "APPROVED" ? new Date() : null; data.approvedById = action === "APPROVED" ? session.userId : null;
    await notifyLab(current.labId, { type: "TECHNOLOGY_REVIEW", title: `Technology ${action.toLowerCase()}`, message: body.reviewRemarks || `${current.name} is ${action.toLowerCase()}.`, link: "/lab-dashboard" });
  }
  if (openRevision || (session.type === "lab" && current.approvalStatus === "APPROVED")) { data.approvalStatus = "PENDING"; data.submittedAt = new Date(); data.approvedAt = null; data.approvedById = null; }
  const technology = await prisma.technology.update({ where: { id }, data, include: { lab: { select: publicLabSelect }, datasetCategory: true } });
  if (openRevision) await prisma.technologyRevisionRequest.update({ where: { id: openRevision.id }, data: { status: "SUBMITTED", submittedAt: new Date(), labResponse: cleanText(body.revisionResponse || "Requested technology fields updated and resubmitted for Head review.", 5000) } });
  const compliance = await syncTechnologySop(id, technology);
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: body.reviewAction ? `TECHNOLOGY_${cleanText(body.reviewAction, 30).toUpperCase()}` : body.submit ? "TECHNOLOGY_SUBMITTED" : "TECHNOLOGY_UPDATED", entityType: "TECHNOLOGY", entityId: id, oldValue: current, newValue: data, details: { missing: compliance.missing } });
  return NextResponse.json({ ...technology, ...compliance });
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isAdmin(session)) return NextResponse.json({ error: "Admin permission required." }, { status: 403 });
  const id = Number((await params).id);
  const technology = await prisma.technology.findUnique({ where: { id }, select: { sourceKey: true, projectLinks: { select: { id: true } } } });
  if (!technology || technology.sourceKey || technology.projectLinks.length) return NextResponse.json({ error: "Imported or project-linked technologies cannot be deleted; deactivate or return them instead." }, { status: 409 });
  await prisma.technology.delete({ where: { id } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "TECHNOLOGY_DELETED", entityType: "TECHNOLOGY", entityId: id });
  return NextResponse.json({ ok: true });
}



export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
export const DELETE = withApiBoundary(DELETEHandler);
