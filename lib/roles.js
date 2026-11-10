
export const MANAGER_ROLES = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
export const HQ_GOVERNING_ROLES = ["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM"];
export const LAB_GOVERNING_ROLES = ["LAB_BD", "PI"];
export const GOVERNING_ROLES = [...HQ_GOVERNING_ROLES, ...LAB_GOVERNING_ROLES];

export const ROLE_LABELS = {
  HEAD_ADMIN: "Head & Admin",
  HEAD_BDG: "Head, BDG",
  ADMIN: "Platform Admin",
  SUPER_ADMIN: "Super Admin",
  BDG: "Business Development Group",
  CPD: "Central Planning Directorate",
  IMD: "Innovation Management Directorate",
  TMD: "Technology Management Directorate",
  IPU: "Intellectual Property Unit",
  URDIP: "URDIP — Market & Patent Intelligence",
  ICM: "Industry Connect & Marketing",
  LAB_BD: "Laboratory BD",

  PI: "Principal Investigator",
  APPLICANT: "Industry / Applicant",
  READ_ONLY: "Read only",
};

export const ROLE_MANDATES = {
  BDG: "Own the central register, reconciliation, decisions, dashboards and commercialization outcomes.",
  CPD: "Align submissions with plans, performance indicators and quarterly/annual reporting.",
  IMD: "Validate mission, social, environmental and public-good impact.",
  TMD: "Validate technology pipeline, maturity, TRL and CRL.",
  IPU: "Validate IP linkage, licensing, patents and royalty evidence.",
  URDIP: "Validate market intelligence, commercial viability and business value.",
  ICM: "Validate industry connect, customer pipeline and conversion actions.",
  LAB_BD: "Own laboratory ECF, receipt, commitment, realisation, royalty, variance and evidence submissions; source internal inputs outside the website workflow.",

  PI: "Certify technical scope, milestones, deployment and impact evidence.",
};

export function isManagerRole(role) { return MANAGER_ROLES.includes(role); }
export function isGoverningRole(role) { return GOVERNING_ROLES.includes(role); }
export function isInternalRole(role) { return isManagerRole(role) || isGoverningRole(role); }

export function canActForUnit(session, unit) {
  if (!session) return false;
  if (session.type === "lab") return unit === (session.role === "PI" ? "PI" : "LAB_BD");
  return isManagerRole(session.role) || session.role === unit;
}


