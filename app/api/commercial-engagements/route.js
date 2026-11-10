import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";
import { ENGAGEMENT_TYPES, MONEY_FIELDS, INTEGER_FIELDS, parseOptionalNumber, normalizeManDays, calculateCommercialPricing } from "../../../lib/commercialPricing";

const TEXT_FIELDS = [
  "designationDepartment", "teamMembers", "knowledgeProductType", "clientName", "clientAddress",
  "serviceDetails", "phasesWorkPackages", "timeline", "deliverables", "clientBenefits", "inventors",
  "patentDetails", "preLicensingDetails", "biologicalDetails", "territory", "clientNature",
  "clientNatureDetails", "licenseNature", "demonstrationDurationUnit", "documentSubmissionDurationUnit",
  "trainingDurationUnit", "otherInformation",
];

function optionalBoolean(value) {
  return value === true || value === "true" ? true : value === false || value === "false" ? false : null;
}

function engagementData(body, type, manDays) {
  const data = {
    engagementType: type,
    proposerName: cleanText(body.proposerName, 200),
    designationDepartment: cleanText(body.designationDepartment, 300),
    title: cleanText(body.title, 400),
    patentApplied: optionalBoolean(body.patentApplied),
    preLicensingEvaluated: optionalBoolean(body.preLicensingEvaluated),
    biologicalResources: optionalBoolean(body.biologicalResources),
  };
  for (const key of TEXT_FIELDS) data[key] = optionalText(body[key], key === "otherInformation" ? 10000 : 5000);
  for (const key of MONEY_FIELDS) data[key] = parseOptionalNumber(body[key], key.replaceAll(/([A-Z])/g, " $1"), { min: 0, max: 1000000000000 });
  for (const key of INTEGER_FIELDS) data[key] = parseOptionalNumber(body[key], key.replaceAll(/([A-Z])/g, " $1"), { integer: true, min: 0, max: key === "trl" ? 9 : 100000 });
  data.overheadRate = data.overheadRate ?? 0;
  data.gstRate = data.gstRate ?? 18;
  Object.assign(data, calculateCommercialPricing(type, data, manDays));
  delete data.manDayTotal;
  delete data.overheadAmount;
  delete data.directExpenditureTarget;
  return data;
}

function validateSubmission(data) {
  const missing = ["proposerName", "designationDepartment", "title"].filter((key) => !data[key]);
  if (data.engagementType === "TECHNOLOGY_TRANSFER") {
    if (!data.clientName) missing.push("clientName");
    if (data.feeProposed === null) missing.push("feeProposed");
  } else {
    if (!data.clientName) missing.push("clientName");
    if (!data.serviceDetails) missing.push("serviceDetails");
    if (data.assumedProjectCost === null) missing.push("assumedProjectCost");
  }
  if (missing.length) throw new Error(`Complete required fields before submission: ${missing.join(", ")}.`);
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const params = new URL(req.url).searchParams;
  const q = cleanText(params.get("q"), 200);
  const where = {
    ...(session.type !== "lab" ? { AND: [{ status: { not: "DRAFT" } }] } : {}),
    ...(session.type === "lab" ? { labId: session.labId } : {}),
    ...(params.get("labId") && session.type === "user" ? { labId: Number(params.get("labId")) } : {}),
    ...(params.get("technologyId") ? { technologyId: Number(params.get("technologyId")) } : {}),
    ...(params.get("status") ? { status: cleanText(params.get("status"), 30) } : {}),
    ...(params.get("type") ? { engagementType: cleanText(params.get("type"), 40) } : {}),
    ...(q ? { OR: [{ referenceNo: { contains: q } }, { title: { contains: q } }, { clientName: { contains: q } }, { technology: { name: { contains: q } } }] } : {}),
  };
  const records = await prisma.commercialEngagement.findMany({
    where,
    include: { lab: { select: { id: true, code: true, name: true } }, technology: { select: { id: true, name: true, trl: true } }, _count: { select: { manDays: true, documents: true } } },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return NextResponse.json(records);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Pricing data must be entered by the laboratory." }, { status: 403 });
  try {
    const body = await req.json();
    const type = cleanText(body.engagementType, 40).toUpperCase();
    if (!ENGAGEMENT_TYPES[type]) return NextResponse.json({ error: "Select Technology Transfer, Consultancy (CNP), or Technical Service (TSP)." }, { status: 400 });
    const technologyId = Number(body.technologyId);
    const technology = await prisma.technology.findUnique({ where: { id: technologyId }, select: { id: true, labId: true, name: true } });
    if (!technology || (session.type === "lab" && technology.labId !== session.labId)) return NextResponse.json({ error: "Technology not found or not owned by your laboratory." }, { status: 404 });
    const manDays = type === "TECHNOLOGY_TRANSFER" ? [] : normalizeManDays(body.manDays || []);
    const data = engagementData(body, type, manDays);
    if (!data.proposerName || !data.designationDepartment || !data.title) return NextResponse.json({ error: "Proposer, designation/department, and proposal title are required." }, { status: 400 });
    const submit = Boolean(body.submit);
    if (submit) validateSubmission(data);
    let record = await prisma.commercialEngagement.create({ data: {
      ...data,
      referenceNo: `PENDING-${randomUUID()}`,
      technologyId: technology.id,
      labId: technology.labId,
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedAt: submit ? new Date() : null,
      createdByUserId: session.type === "user" ? session.userId : null,
      manDays: { create: manDays },
    } });
    const prefix = type === "TECHNOLOGY_TRANSFER" ? "TT" : type === "CONSULTANCY_CNP" ? "CNP" : "TSP";
    record = await prisma.commercialEngagement.update({
      where: { id: record.id },
      data: { referenceNo: `CSIR-${prefix}-${new Date().getFullYear()}-${String(record.id).padStart(4, "0")}` },
      include: { lab: { select: publicLabSelect }, technology: true, manDays: { orderBy: { displayOrder: "asc" } } },
    });
    await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: submit ? "COMMERCIAL_ENGAGEMENT_SUBMITTED" : "COMMERCIAL_ENGAGEMENT_CREATED", entityType: "COMMERCIAL_ENGAGEMENT", entityId: record.id, details: { type } });
    if (submit) await notifyHeadBdgAndAdmins({ type: "COMMERCIAL_PRICING_SUBMITTED", title: "Commercial pricing submitted", message: `${record.lab.name} submitted ${record.referenceNo} for ${record.technology.name}.`, link: `/commercial-engagements/${record.id}` });
    return NextResponse.json(record, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught.message || "Unable to save commercial pricing." }, { status: 400 });
  }
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
