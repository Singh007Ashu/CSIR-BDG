import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeNumber } from "../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";
import { missingLabSubmissionFields, missingTechnologyFields, sopCompletion, syncTechnologySop } from "../../../lib/governance";

import { parseFinancialYear } from "../../../lib/financialYear";

function financialYear(value) {
  if (value === "" || value === null || value === undefined) return null;
  const year = parseFinancialYear(value), currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= currentYear ? year : null;
}

function technologyData(body, labId) {
  return {
    name: cleanText(body.name, 300),
    labId,
    briefDescription: cleanText(body.briefDescription || body.description || "Technology profile pending completion.", 10000),
    piName: optionalText(body.piName, 150),
    advantages: optionalText(body.advantages),
    applications: optionalText(body.applications),
    keyFeatures: optionalText(body.keyFeatures),
    classification: cleanText(body.classification || "NON_IP", 30),
    ipStatus: optionalText(body.ipStatus, 100) || "NOT_RECORDED",
    trl: safeNumber(body.trl),
    crl: safeNumber(body.crl),
    sector: optionalText(body.sector, 300),
    theme: optionalText(body.theme, 300),
    subSector: optionalText(body.subSector, 500),
    technologyType: optionalText(body.technologyType, 100),
    commercialisationStage: optionalText(body.commercialisationStage, 100),
    partnerClient: optionalText(body.partnerClient, 300),
    responsibleBdOfficer: optionalText(body.responsibleBdOfficer, 200),
    remarks: optionalText(body.remarks, 3000),
    ecfInformation: optionalText(body.ecfInformation, 10000),
    businessValueInformation: optionalText(body.businessValueInformation, 10000),
    impactInformation: optionalText(body.impactInformation, 10000),
    evidenceReference: optionalText(body.evidenceReference, 2000),
    industryMap: optionalText(body.industryMap),
    applicationMap: optionalText(body.applicationMap),
    servicesOffered: optionalText(body.servicesOffered),
    status: cleanText(body.status || "IDENTIFIED", 40),
    recordScope: cleanText(body.recordScope || "MASTER", 30),
    recordFinancialYear: financialYear(body.recordFinancialYear),
    ...(body.datasetCategoryId ? { datasetCategoryId: Number(body.datasetCategoryId) } : {}),
  };
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const q = cleanText(searchParams.get("q"), 200);
  const scope = cleanText(searchParams.get("scope") || "MASTER", 30);
  const projectId = safeNumber(searchParams.get("projectId"));
  const projectSlug = cleanText(searchParams.get("projectSlug"), 100);
  const year = financialYear(searchParams.get("financialYear"));
  const where = {
    recordScope: scope,
    ...(session.type === "lab" ? { labId: session.labId } : {}),
    ...(searchParams.get("labId") && session.type === "user" ? { labId: Number(searchParams.get("labId")) } : {}),
    ...(searchParams.get("categoryId") ? { datasetCategoryId: Number(searchParams.get("categoryId")) } : {}),
    ...(searchParams.get("theme") ? { theme: { contains: searchParams.get("theme") } } : {}),
    ...(searchParams.get("sector") ? { sector: { contains: searchParams.get("sector") } } : {}),
    ...(searchParams.get("technologyType") ? { technologyType: searchParams.get("technologyType") } : {}),
    ...(searchParams.get("ipStatus") ? { ipStatus: searchParams.get("ipStatus") } : {}),
    ...(searchParams.get("commercialisationStage") ? { commercialisationStage: searchParams.get("commercialisationStage") } : {}),
    ...(searchParams.get("approvalStatus") ? { approvalStatus: searchParams.get("approvalStatus") } : {}),
    ...(year ? { AND: [{ OR: [{ recordFinancialYear: year }, { financialYearData: { some: { financialYear: year } } }] }] } : {}),
    ...(projectId || projectSlug ? { projectLinks: { some: { ...(projectId ? { projectId } : {}), ...(projectSlug ? { project: { slug: projectSlug } } : {}) } } } : {}),
    ...(q ? { OR: [
      { name: { contains: q } }, { briefDescription: { contains: q } }, { piName: { contains: q } },
      { sector: { contains: q } }, { theme: { contains: q } }, { lab: { name: { contains: q } } },
    ] } : {}),
  };
  const technologies = await prisma.technology.findMany({
    where,
    include: {
      lab: { select: publicLabSelect },
      datasetCategory: true,
      requests: true,
      documents: { where: { isCurrent: true, deletedAt: null }, select: { id: true } },
      projectLinks: { include: { project: { select: { id: true, name: true, slug: true } } } },
      sopStatuses: { include: { sopStage: { select: { code: true, name: true, stageNumber: true } } } },
      financialYearData: { orderBy: [{ financialYear: "desc" }, { recordType: "asc" }] },
    },
    orderBy: [{ lab: { name: "asc" } }, { name: "asc" }],
    take: 2500,
  });
  for (const technology of technologies) technology.sopStatuses.sort((a,b)=>(a.sopStage?.stageNumber||0)-(b.sopStage?.stageNumber||0));
  return NextResponse.json(technologies);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "You do not have permission to add technologies." }, { status: 403 });
  if (["HEAD_ADMIN", "HEAD_BDG"].includes(session.role)) return NextResponse.json({ error: "HEAD access is read-only. Please request changes from the laboratory." }, { status: 403 });
  const body = await req.json();
  if (body.recordFinancialYear && financialYear(body.recordFinancialYear) === null) return NextResponse.json({ error: "Enter a valid financial year, e.g. 2025-26." }, { status: 400 });
  const labId = session.type === "lab" ? session.labId : Number(body.labId);
  if (!labId || !cleanText(body.name, 300)) return NextResponse.json({ error: "Technology name and laboratory are required." }, { status: 400 });
  const duplicate = await prisma.technology.findFirst({ where: { labId, name: cleanText(body.name, 300), recordScope: "MASTER" }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: `A master technology with this name already exists for the laboratory (ID ${duplicate.id}).` }, { status: 409 });
  const data = technologyData({ ...body, recordScope: "MASTER" }, labId);
  const submit = Boolean(body.submit);
  const missing = session.type === "lab" ? missingLabSubmissionFields(body) : missingTechnologyFields(data);
  if (submit && missing.length) return NextResponse.json({ error: "Mandatory laboratory data-entry fields are incomplete.", missing, completion: sopCompletion(data).completion }, { status: 400 });
  data.approvalStatus = session.type === "lab" ? (submit ? "PENDING" : "DRAFT") : cleanText(body.approvalStatus || "APPROVED", 30);
  data.submittedAt = submit ? new Date() : null;
  data.sopLegacyExempt = false;
  const technology = await prisma.technology.create({ data, include: { lab: { select: publicLabSelect }, datasetCategory: true } });
  const compliance = await syncTechnologySop(technology.id, technology);
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: submit ? "TECHNOLOGY_SUBMITTED" : "TECHNOLOGY_CREATED", entityType: "TECHNOLOGY", entityId: technology.id, details: { approvalStatus: data.approvalStatus, missing: compliance.missing } });
  if (submit && session.type !== "lab") await notifyHeadBdgAndAdmins({ type: "NEW_TECHNOLOGY", title: "New master technology awaiting review", message: `${technology.lab.name} submitted ${technology.name}.`, link: "/head-admin" });
  return NextResponse.json({ ...technology, ...compliance }, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
