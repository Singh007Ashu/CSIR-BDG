const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");
const prisma = new PrismaClient();

const referenceLists = {
  Agreement_Type: ["Technology Transfer", "Licensing", "Royalty Agreement", "Sponsored Research", "Consultancy", "Pilot Deployment", "Co-development", "Testing/Validation", "Training/Capacity Building", "Government/PSU Deployment"],
  Risk_Level: ["Low", "Medium", "High", "Critical"],
  Status: ["Open", "In Progress", "Closed", "Deferred", "Disputed", "Cancelled", "Under Verification", "Royalty Awaited", "At Risk"],
  Technology_Type: ["IP-backed", "Non-IP know-how", "Process", "Product/Device", "Software/Digital", "Material/Chemical", "Service-linked", "Platform", "Social/Environmental"],
  IP_Status: ["Patent granted", "Patent filed", "Patent not filed", "Know-how only", "Copyright/design", "Bundled IP"],
  Commercialisation_Stage: ["Lead identified", "Under discussion", "NDA/MoU stage", "Agreement executed", "Payment due", "Payment realised", "Under deployment", "Royalty-bearing", "Closed/completed", "Stalled/dropped"],
  Responsible_Unit: ["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM", "Lab BD", "PI"],
  Escalation_Level: ["First Level", "Second Level", "Final Review", "Resolved"],
  Impact_Category: ["Category A - High", "Category B - Moderate", "Category C - Emerging", "Category D - Monitor"],
};

const stages = [
  [1, "SOP-01", "Master Technology Commercialisation Register", "Maintain the single source of truth for technology identity, lab, PI, TRL/CRL, IP and commercialisation stage.", "Lab BD, PI, TMD, IPU", "BDG"],
  [2, "SOP-02", "Recording of ECF Commitments", "Record every agreement/proposal/sanction/work order creating ECF within seven working days.", "Lab BD, PI", "BDG"],
  [3, "SOP-03", "Committed vs Actual Reconciliation", "Reconcile due amounts with Lab BD-confirmed laboratory receipt information and explain variances.", "Lab BD, PI", "BDG"],
  [4, "SOP-04", "Business Value Capture", "Capture direct, indirect, market, strategic and future revenue value.", "Lab BD, URDIP, IPU, TMD, ICM", "BDG"],
  [5, "SOP-05", "Impact Assessment Framework", "Capture financial, social, environmental, socio-economic, strategic and intangible impact with evidence.", "Lab BD, PI, IMD", "BDG"],
  [6, "SOP-06", "Technology Impact Scoring", "Apply the annual evidence-backed 100-point scoring matrix.", "TMD, IMD, URDIP, IPU", "BDG"],
  [7, "SOP-07", "Dashboard and Reporting", "Submit monthly lab data and quarterly consolidated dashboards.", "Lab BD, CPD", "BDG"],
  [8, "SOP-08", "Variance Management and Escalation", "Track overdue, disputed, deferred, under-verified and cancelled commitments.", "Lab BD, ICM, IPU, TMD, URDIP", "BDG"],
  [9, "SOP-09", "Controls, Audit Trail and Evidence", "Require certified supporting evidence and version-controlled audit records.", "Lab BD, PI", "BDG"],
  [10, "SOP-10", "Review and Implementation", "Coordinate phased implementation, quarterly review and annual impact reporting.", "BDG, CPD, IMD, TMD, IPU, URDIP, ICM, Lab BD", "BDG"],
];

const parameters = [
  ["technology_name", "Technology Name", "TEXT", true, 1, null],
  ["pi_technical_owner", "PI / Technical Owner", "TEXT", true, 1, null],
  ["responsible_bd_officer", "Responsible BD Officer", "TEXT", true, 1, null],
  ["sector_theme", "Sector / Theme", "TEXT", true, 1, null],
  ["technology_type", "Technology Type", "SELECT", true, 1, "Technology_Type"],
  ["ip_status", "IP Status", "SELECT", true, 1, "IP_Status"],
  ["trl", "Technology Readiness Level (TRL)", "NUMBER", true, 1, null],
  ["crl", "Commercial Readiness Level (CRL)", "NUMBER", true, 1, null],
  ["commercialisation_stage", "Commercialisation Stage", "SELECT", true, 1, "Commercialisation_Stage"],
  ["partner_client", "Partner / Client", "TEXT", false, 1, null],
  ["ecf_applicable", "ECF Applicable", "BOOLEAN", false, 2, null],
  ["business_value_applicable", "Business Value Applicable", "BOOLEAN", false, 4, null],
  ["impact_applicable", "Impact Assessment Applicable", "BOOLEAN", false, 5, null],
  ["evidence_reference", "Evidence Upload / Reference", "FILE", true, 9, null],
  ["remarks", "Remarks", "TEXTAREA", false, 1, null],
];

const raci = [
  ["create_register", "Create commercialisation register", "Lab BD, TMD, IPU", "BDG", "CPD, IMD, URDIP, ICM", ""],
  ["capture_ecf", "Capture ECF commitment", "Lab BD", "BDG", "CPD, IMD, TMD, IPU, URDIP, ICM", ""],
  ["validate_ip", "Validate IP linkage", "IPU, Lab BD", "IPU", "BDG, TMD, URDIP", "CPD, IMD, ICM"],
  ["validate_trl", "Validate TRL/CRL", "TMD, Lab BD", "TMD", "BDG, IMD, IPU, URDIP", "CPD, ICM"],
  ["market_assessment", "Market assessment and customer intelligence", "URDIP", "URDIP", "BDG, IMD, TMD, IPU, ICM, Lab BD", "CPD"],
  ["customer_mapping", "Customer mapping and pitch support", "BDG, ICM, Lab BD", "BDG", "IMD, TMD, IPU, URDIP", "CPD"],
  ["receipt_confirmation", "Actual receipt confirmation", "Lab BD", "Lab BD", "BDG, CPD", "IMD, TMD, IPU, URDIP, ICM"],
  ["monthly_reconciliation", "Monthly reconciliation", "Lab BD, BDG", "BDG", "CPD, IMD, TMD, IPU, URDIP, ICM", ""],
  ["variance_action", "Variance analysis and corrective action", "Lab BD, BDG", "BDG", "CPD, IMD, TMD, IPU, URDIP, ICM", ""],
  ["royalty_monitoring", "Royalty monitoring", "Lab BD, BDG, IPU", "BDG", "TMD, URDIP, ICM", "CPD, IMD"],
  ["business_value", "Business value assessment", "Lab BD, BDG, URDIP", "BDG", "CPD, IMD, TMD, IPU, ICM", ""],
  ["impact_assessment", "Social/environment impact assessment", "Lab BD, PI, IMD", "IMD", "BDG, CPD, TMD, URDIP, ICM", "IPU"],
  ["quarterly_dashboard", "Quarterly dashboard", "Lab BD, BDG, CPD", "BDG", "IMD, TMD, IPU, URDIP, ICM", ""],
  ["annual_impact", "Annual impact report", "Lab BD, BDG, CPD, IMD", "BDG, IMD", "TMD, IPU, URDIP, ICM", ""],
];

async function seedRbac() {
  const permissionKeys = ["MONITOR_LABS", "VIEW_ALL_TECHNOLOGIES", "PROJECTS_MANAGE", "PARAMETERS_MANAGE", "SUBMISSIONS_REVIEW", "REPORTS_MONITOR", "QUERIES_MANAGE", "SOP_COMPLIANCE_VIEW", "REPORTS_EXPORT", "REFERENCE_LISTS_MANAGE", "ECF_IMPACT_MONITOR", "RECORDS_READ", "DOCUMENT_UPLOAD", "LAB_PROFILE_MANAGE"];
  const rows = {};
  for (const key of permissionKeys) rows[key] = await prisma.permission.upsert({ where: { key }, update: { name: key.replaceAll("_", " ") }, create: { key, name: key.replaceAll("_", " ") } });
  for (const key of ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"]) {
    const role = await prisma.role.upsert({ where: { key }, update: { name: "Head & Admin" }, create: { key, name: "Head & Admin" } });
    for (const permission of Object.values(rows)) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    await prisma.user.updateMany({ where: { role: key }, data: { roleId: role.id } });
  }
}

async function main() {
  await seedRbac();
  for (const [key, values] of Object.entries(referenceLists)) {
    const list = await prisma.referenceList.upsert({ where: { key }, update: { label: key.replaceAll("_", " "), active: true }, create: { key, label: key.replaceAll("_", " ") } });
    for (let index = 0; index < values.length; index += 1) await prisma.referenceOption.upsert({ where: { listId_value: { listId: list.id, value: values[index] } }, update: { label: values[index], displayOrder: index, active: true }, create: { listId: list.id, value: values[index], label: values[index], displayOrder: index } });
    await prisma.referenceOption.updateMany({ where: { listId: list.id, value: { notIn: values } }, data: { active: false } });
  }

  const sop = await prisma.sop.upsert({ where: { code: "CSIR-ECF-VALUE-IMPACT" }, update: { title: "CSIR ECF Reconciliation, Business Value and Impact Framework", version: "1.0", active: true }, create: { code: "CSIR-ECF-VALUE-IMPACT", title: "CSIR ECF Reconciliation, Business Value and Impact Framework", version: "1.0", description: "Authoritative SOP dated 02 July 2026." } });
  const stageRows = new Map();
  for (const [stageNumber, code, name, objective, responsibleUnit, accountableUnit] of stages) {
    const stage = await prisma.sopStage.upsert({ where: { code }, update: { name, objective, responsibleUnit, accountableUnit, mandatoryForNew: true }, create: { sopId: sop.id, code, stageNumber, name, objective, responsibleUnit, accountableUnit, mandatoryForNew: true } });
    stageRows.set(stageNumber, stage);
  }
  for (let index = 0; index < parameters.length; index += 1) {
    const [key, label, fieldType, mandatory, stageNumber, referenceListKey] = parameters[index];
    const existingParameter = await prisma.technologyParameter.findFirst({ where: { key, projectId: null, version: 1 } });
    const parameterData = { label, fieldType, mandatory, active: true, sopStageId: stageRows.get(stageNumber).id, referenceListKey, displayOrder: index };
    if (existingParameter) await prisma.technologyParameter.update({ where: { id: existingParameter.id }, data: parameterData });
    else await prisma.technologyParameter.create({ data: { key, version: 1, ...parameterData } });
  }
  for (let index = 0; index < raci.length; index += 1) {
    const [activityKey, activity, responsibleUnit, accountableUnit, consultedUnits, informedUnits] = raci[index];
    await prisma.raciAssignment.upsert({ where: { activityKey }, update: { activity, responsibleUnit, accountableUnit, consultedUnits, informedUnits, active: true, displayOrder: index }, create: { activityKey, activity, responsibleUnit, accountableUnit, consultedUnits, informedUnits, displayOrder: index } });
  }

  const head = await prisma.user.findFirst({ where: { role: { in: ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"] } }, orderBy: { id: "asc" } });
  const ficci = await prisma.project.upsert({ where: { slug: "ficci" }, update: { name: "FICCI", projectType: "TECHNOLOGY_SHOWCASE", isSystem: true, status: "ACTIVE" }, create: { name: "FICCI", slug: "ficci", description: "Existing FICCI-CSIR Technology Showcase project", projectType: "TECHNOLOGY_SHOWCASE", status: "ACTIVE", isSystem: true, folderPath: "projects/ficci", createdById: head?.id || null } });
  const ficciCategory = await prisma.datasetCategory.findUnique({ where: { slug: "ficci" } });
  if (ficciCategory) {
    const existing = await prisma.technology.findMany({ where: { datasetCategoryId: ficciCategory.id }, select: { id: true } });
    await prisma.technology.updateMany({ where: { datasetCategoryId: ficciCategory.id }, data: { recordScope: "PROJECT_ONLY", approvalStatus: "APPROVED", sopLegacyExempt: true, sopCompletion: 100 } });
    for (const technology of existing) await prisma.projectTechnology.upsert({ where: { projectId_technologyId: { projectId: ficci.id, technologyId: technology.id } }, update: { relationshipType: "PROJECT_SPECIFIC" }, create: { projectId: ficci.id, technologyId: technology.id, relationshipType: "PROJECT_SPECIFIC" } });
  }

  await prisma.excelTemplate.upsert({ where: { name_version: { name: "CSIR ECF Reconciliation Value Impact Template", version: "1.0" } }, update: { active: true, fileName: "CSIR_ECF_Reconciliation_Value_Impact_Templates_Lab_BD_v1.xlsx", filePath: "templates/CSIR_ECF_Reconciliation_Value_Impact_Templates_Lab_BD_v1.xlsx", notes: "Website-adapted copy of the authoritative template: Lab BD is the single laboratory-side owner; the original source workbook is preserved separately." }, create: { name: "CSIR ECF Reconciliation Value Impact Template", version: "1.0", fileName: "CSIR_ECF_Reconciliation_Value_Impact_Templates_Lab_BD_v1.xlsx", filePath: "templates/CSIR_ECF_Reconciliation_Value_Impact_Templates_Lab_BD_v1.xlsx", notes: "Website-adapted copy of the authoritative template: Lab BD is the single laboratory-side owner; the original source workbook is preserved separately." } });

  const labs = await prisma.lab.findMany({ select: { id: true } });
  const reports = [
    { reportType: "MONTHLY", title: "Monthly ECF Reconciliation – August 2026", periodLabel: "2026-08", periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), dueDate: new Date("2026-09-07"), responsibleUnit: "Lab BD", accountableUnit: "BDG", consultedUnits: "CPD, TMD, IPU, URDIP, ICM, IMD" },
    { reportType: "QUARTERLY", title: "Quarterly Value & Impact Reporting – Q3 2026", periodLabel: "2026-Q3", periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), dueDate: new Date("2026-10-15"), responsibleUnit: "Laboratories, CPD, IMD", accountableUnit: "BDG", consultedUnits: "TMD, IPU, URDIP, ICM" },
  ];
  for (const item of reports) {
    const existingReport = await prisma.report.findFirst({ where: { reportType: item.reportType, periodLabel: item.periodLabel, projectId: null } });
    const report = existingReport ? await prisma.report.update({ where: { id: existingReport.id }, data: item }) : await prisma.report.create({ data: item });
    for (const lab of labs) await prisma.reportSubmission.upsert({ where: { reportId_labId: { reportId: report.id, labId: lab.id } }, update: {}, create: { reportId: report.id, labId: lab.id } });
  }

  const npl = await prisma.lab.findUnique({ where: { code: "NPL" } });
  if (npl && !npl.passwordHash && process.env.DEMO_LAB_PASSWORD) {
    if(process.env.DEMO_LAB_PASSWORD.length<12)throw new Error("DEMO_LAB_PASSWORD must be at least 12 characters.");
    const passwordHash = await bcrypt.hash(process.env.DEMO_LAB_PASSWORD, 12);
    await prisma.lab.update({ where: { id: npl.id }, data: { labId: npl.labId || "CSIR-NPL-0001", officialEmail: npl.officialEmail || "npl.lab@csir.res.in", authorizedPerson: npl.authorizedPerson || "NPL BD Coordinator", designation: npl.designation || "BD Coordinator", passwordHash, accountStatus: "ACTIVE", registeredAt: npl.registeredAt || new Date(), approvedAt: npl.approvedAt || new Date() } });
  }
  console.log("Seeded SOP, parameters, reference lists, RACI, reports, template metadata and FICCI project separation.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
