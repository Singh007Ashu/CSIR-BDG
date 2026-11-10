import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager, isAdmin } from "../../../../lib/session";
import { canAccessEntity } from "../../../../lib/entityAccess";
import { cleanText, optionalText } from "../../../../lib/request";
import { logAudit, notifyLab, notifyHeadBdgAndAdmins } from "../../../../lib/labAuth";
import { MONEY_FIELDS, INTEGER_FIELDS, parseOptionalNumber, normalizeManDays, calculateCommercialPricing } from "../../../../lib/commercialPricing";

const TEXT_FIELDS = ["proposerName", "designationDepartment", "teamMembers", "knowledgeProductType", "title", "clientName", "clientAddress", "serviceDetails", "phasesWorkPackages", "timeline", "deliverables", "clientBenefits", "inventors", "patentDetails", "preLicensingDetails", "biologicalDetails", "territory", "clientNature", "clientNatureDetails", "licenseNature", "demonstrationDurationUnit", "documentSubmissionDurationUnit", "trainingDurationUnit", "otherInformation"];
const requiredText = new Set(["proposerName", "designationDepartment", "title"]);
const optionalBoolean = (value) => value === true || value === "true" ? true : value === false || value === "false" ? false : null;

function payload(body, type, manDays) {
  const data = {};
  for (const key of TEXT_FIELDS) if (body[key] !== undefined) data[key] = requiredText.has(key) ? cleanText(body[key], 5000) : optionalText(body[key], 10000);
  for (const key of ["patentApplied", "preLicensingEvaluated", "biologicalResources"]) if (body[key] !== undefined) data[key] = optionalBoolean(body[key]);
  for (const key of MONEY_FIELDS) if (body[key] !== undefined) data[key] = parseOptionalNumber(body[key], key.replaceAll(/([A-Z])/g, " $1"), { min: 0, max: 1000000000000 });
  for (const key of INTEGER_FIELDS) if (body[key] !== undefined) data[key] = parseOptionalNumber(body[key], key.replaceAll(/([A-Z])/g, " $1"), { integer: true, min: 0, max: key === "trl" ? 9 : 100000 });
  data.overheadRate = data.overheadRate ?? 0;
  data.gstRate = data.gstRate ?? 18;
  Object.assign(data, calculateCommercialPricing(type, data, manDays));
  delete data.manDayTotal; delete data.overheadAmount; delete data.directExpenditureTarget;
  return data;
}

function assertSubmittable(data) {
  const missing = ["proposerName", "designationDepartment", "title"].filter((key) => !data[key]);
  if (!data.clientName) missing.push("clientName");
  if (data.engagementType === "TECHNOLOGY_TRANSFER" && data.feeProposed === null) missing.push("feeProposed");
  if (data.engagementType !== "TECHNOLOGY_TRANSFER" && (data.assumedProjectCost === null || !data.serviceDetails)) missing.push("serviceDetails / assumedProjectCost");
  if (missing.length) throw new Error(`Complete required fields before submission: ${missing.join(", ")}.`);
}

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const id = Number((await params).id);
  const access = await canAccessEntity(session, "COMMERCIAL_ENGAGEMENT", id); if (!access.allowed) return NextResponse.json({ error: "Commercial pricing record not found." }, { status: 404 });
  const record = await prisma.commercialEngagement.findUnique({ where: { id }, include: { lab: { select: publicLabSelect }, technology: true, manDays: { orderBy: { displayOrder: "asc" } }, decidedBy: { select: { name: true, role: true } } } });
  if (session.type !== "lab" && record.status === "DRAFT") return NextResponse.json({ error: "This laboratory draft has not been submitted." }, { status: 404 });
  return NextResponse.json(record);
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const id = Number((await params).id);
  const access = await canAccessEntity(session, "COMMERCIAL_ENGAGEMENT", id, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const current = await prisma.commercialEngagement.findUnique({ where: { id }, include: { manDays: true } });
  if (!current) return NextResponse.json({ error: "Commercial pricing record not found." }, { status: 404 });
  try {
    const body = await req.json();
    if (body.action && isManager(session)) {
      const action = cleanText(body.action, 20).toUpperCase();
      if (current.status !== "SUBMITTED") return NextResponse.json({ error: "Only submitted pricing can be reviewed." }, { status: 409 });
      if (["RETURN", "REJECT"].includes(action) && !String(body.headRemarks || "").trim()) return NextResponse.json({ error: "Correction / rejection remarks are required." }, { status: 400 });
      if (!["APPROVE", "RETURN", "REJECT"].includes(action)) return NextResponse.json({ error: "Unsupported decision." }, { status: 400 });
      const status = action === "APPROVE" ? "APPROVED" : action === "RETURN" ? "RETURNED" : "REJECTED";
      const updated = await prisma.commercialEngagement.update({ where: { id }, data: { status, headRemarks: optionalText(body.headRemarks, 5000), decidedById: session.userId, decidedAt: new Date(), approvedAt: action === "APPROVE" ? new Date() : null }, include: { lab: { select: publicLabSelect }, technology: true, manDays: true, decidedBy: { select: { name: true, role: true } } } });
      await logAudit({ actorType: "USER", actorUserId: session.userId, action: `COMMERCIAL_ENGAGEMENT_${status}`, entityType: "COMMERCIAL_ENGAGEMENT", entityId: id, details: { remarks: updated.headRemarks } });
      await notifyLab(current.labId, { type: "PRICING_REVIEW", title: "Commercial pricing " + status.toLowerCase(), message: updated.headRemarks || "HEAD reviewed the submitted pricing.", link: "/commercial-engagements/" + id });
      return NextResponse.json(updated);
    }
    if (session.type !== "lab") return NextResponse.json({ error: "Only the laboratory can edit pricing source data." }, { status: 403 });
    if (!["DRAFT", "RETURNED"].includes(current.status)) return NextResponse.json({ error: "Only draft or returned records can be edited by the laboratory." }, { status: 409 });
    const manDays = current.engagementType === "TECHNOLOGY_TRANSFER" ? [] : normalizeManDays(body.manDays || []);
    const merged = { ...current, ...body };
    const data = payload(merged, current.engagementType, manDays);
    const submit = Boolean(body.submit);
    if (submit) assertSubmittable({ ...current, ...data });
    data.status = submit ? "SUBMITTED" : current.status === "RETURNED" ? "DRAFT" : current.status;
    data.submittedAt = submit ? new Date() : current.submittedAt;
    data.headRemarks = submit ? null : current.headRemarks;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.commercialManDay.deleteMany({ where: { engagementId: id } });
      return tx.commercialEngagement.update({ where: { id }, data: { ...data, manDays: { create: manDays } }, include: { lab: { select: publicLabSelect }, technology: true, manDays: { orderBy: { displayOrder: "asc" } } } });
    });
    await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: submit ? "COMMERCIAL_ENGAGEMENT_SUBMITTED" : "COMMERCIAL_ENGAGEMENT_UPDATED", entityType: "COMMERCIAL_ENGAGEMENT", entityId: id });
    return NextResponse.json(updated);
  } catch (caught) {
    return NextResponse.json({ error: caught.message || "Unable to update commercial pricing." }, { status: 400 });
  }
}

async function DELETEHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isAdmin(session)) return NextResponse.json({ error: "Admin permission required." }, { status: 403 });
  const id = Number((await params).id);
  await prisma.commercialEngagement.delete({ where: { id } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "COMMERCIAL_ENGAGEMENT_DELETED", entityType: "COMMERCIAL_ENGAGEMENT", entityId: id });
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
export const DELETE = withApiBoundary(DELETEHandler);
