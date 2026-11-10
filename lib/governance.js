import { prisma } from "./db";

export const MANAGER_ROLES = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];

export function isHeadAdminRole(role) {
  return MANAGER_ROLES.includes(role);
}

export const TECHNOLOGY_FIELD_MAP = {
  technology_name: "name",
  pi_technical_owner: "piName",
  responsible_bd_officer: "responsibleBdOfficer",
  sector_theme: "sector",
  technology_type: "technologyType",
  ip_status: "ipStatus",
  trl: "trl",
  crl: "crl",
  commercialisation_stage: "commercialisationStage",
  partner_client: "partnerClient",
  evidence_reference: "evidenceReference",
  remarks: "remarks",
};

export const REQUIRED_TECHNOLOGY_FIELDS = [
  ["name", "Technology name"],
  ["piName", "PI / Technical Owner"],
  ["responsibleBdOfficer", "Responsible BD Officer"],
  ["sector", "Sector / Theme"],
  ["technologyType", "Technology Type"],
  ["ipStatus", "IP Status"],
  ["trl", "TRL validation"],
  ["crl", "CRL validation"],
  ["commercialisationStage", "Commercialisation Stage"],
  ["evidenceReference", "TRL / SOP evidence reference"],
];

// Laboratories create the factual source record. Validation/decision fields are
// deliberately owned by the governing queues shown in the v2 platform flow.
export const LAB_SUBMISSION_FIELDS = [
  ["name", "Technology name"],
  ["piName", "PI / Technical Owner"],
  ["briefDescription", "Technology brief"],
  ["advantages", "Advantages"],
  ["applications", "Applications"],
  ["keyFeatures", "Key features"],
  ["classification", "Classification"],
  ["sector", "Sector / Theme"],
  ["technologyType", "Technology type"],
  ["evidenceReference", "Evidence reference"],
];

export function missingLabSubmissionFields(data) {
  return LAB_SUBMISSION_FIELDS
    .filter(([key]) => data[key] === null || data[key] === undefined || String(data[key]).trim() === "")
    .map(([, label]) => label);
}

export function missingTechnologyFields(data) {
  return REQUIRED_TECHNOLOGY_FIELDS.filter(([key]) => data[key] === null || data[key] === undefined || String(data[key]).trim() === "").map(([, label]) => label);
}

export function sopCompletion(data) {
  const missing = missingTechnologyFields(data);
  return { missing, completion: Math.round(((REQUIRED_TECHNOLOGY_FIELDS.length - missing.length) / REQUIRED_TECHNOLOGY_FIELDS.length) * 100) };
}

export async function syncTechnologySop(technologyId, data) {
  const { missing, completion } = sopCompletion(data);
  const stages = await prisma.sopStage.findMany({ where: { sop: { active: true } }, orderBy: { stageNumber: "asc" } });
  for (const stage of stages) {
    let stageMissing = [];
    if (stage.stageNumber === 1) stageMissing = missing.filter((item) => !item.toLowerCase().includes("evidence"));
    if (stage.stageNumber === 2 && data.ecfInformation === "REQUIRED_MISSING") stageMissing = ["ECF information"];
    if (stage.stageNumber === 4 && data.businessValueInformation === "REQUIRED_MISSING") stageMissing = ["Business value information"];
    if (stage.stageNumber === 5 && data.impactInformation === "REQUIRED_MISSING") stageMissing = ["Impact information / evidence"];
    if (stage.stageNumber === 9 && !data.evidenceReference) stageMissing = ["Evidence upload / reference"];
    if (stage.stageNumber === 10 && data.approvalStatus === "DRAFT") stageMissing = ["Submission to Head & Admin"];
    await prisma.technologySOPStatus.upsert({
      where: { technologyId_sopStageId: { technologyId, sopStageId: stage.id } },
      update: { status: stageMissing.length ? "INCOMPLETE" : "COMPLETE", completionPercent: stageMissing.length ? 0 : 100, missingItems: stageMissing.length ? JSON.stringify(stageMissing) : null },
      create: { technologyId, sopStageId: stage.id, status: stageMissing.length ? "INCOMPLETE" : "COMPLETE", completionPercent: stageMissing.length ? 0 : 100, missingItems: stageMissing.length ? JSON.stringify(stageMissing) : null },
    });
  }
  await prisma.technology.update({ where: { id: technologyId }, data: { sopCompletion: completion } });
  return { missing, completion };
}

export function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function parseJson(value, fallback = {}) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
