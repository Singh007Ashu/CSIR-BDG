const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const prisma = new PrismaClient();

const FICCI_ROOT = path.resolve(process.env.FICCI_ROOT || path.join(process.cwd(), "FICCI"));
const MANIFEST_PATH = path.join(FICCI_ROOT, "manifest.json");
const MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip: "application/zip", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

async function seedRbac() {
  const permissions = [
    ["SYSTEM_FULL", "Full system access"], ["USERS_MANAGE", "Manage users"], ["LABS_MANAGE", "Manage laboratories"],
    ["TECHNOLOGIES_MANAGE", "Manage technologies"], ["DATASETS_IMPORT", "Import datasets"], ["MOU_MANAGE", "Manage MOU repository"],
    ["CODEV_MANAGE", "Manage co-development"], ["APPROVAL_REVIEW", "Review approvals"], ["DOCUMENT_UPLOAD", "Upload documents"],
    ["RECORDS_READ", "View and download records"], ["LAB_PROFILE_MANAGE", "Manage own laboratory profile"],
  ];
  const permissionRows = {};
  for (const [key, name] of permissions) permissionRows[key] = await prisma.permission.upsert({ where: { key }, update: { name }, create: { key, name } });
  const roleMap = {
    SUPER_ADMIN: permissions.map(([key]) => key), ADMIN: ["USERS_MANAGE", "LABS_MANAGE", "TECHNOLOGIES_MANAGE", "DATASETS_IMPORT", "MOU_MANAGE", "CODEV_MANAGE", "RECORDS_READ"],
    HEAD_BDG: ["APPROVAL_REVIEW", "TECHNOLOGIES_MANAGE", "MOU_MANAGE", "CODEV_MANAGE", "RECORDS_READ"], LAB_COORDINATOR: ["LAB_PROFILE_MANAGE", "TECHNOLOGIES_MANAGE", "DOCUMENT_UPLOAD", "MOU_MANAGE", "CODEV_MANAGE", "RECORDS_READ"],
    PI: ["TECHNOLOGIES_MANAGE", "DOCUMENT_UPLOAD", "CODEV_MANAGE", "RECORDS_READ"], READ_ONLY: ["RECORDS_READ"], APPLICANT: ["RECORDS_READ"],
  };
  for (const [key, keys] of Object.entries(roleMap)) {
    const role = await prisma.role.upsert({ where: { key }, update: { name: key.replaceAll("_", " ") }, create: { key, name: key.replaceAll("_", " ") } });
    for (const permissionKey of keys) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permissionRows[permissionKey].id } }, update: {}, create: { roleId: role.id, permissionId: permissionRows[permissionKey].id } });
    await prisma.user.updateMany({ where: { role: key, roleId: null }, data: { roleId: role.id } });
  }
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error(`FICCI manifest is missing at ${MANIFEST_PATH}`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.documents) || !manifest.documents.length) throw new Error("FICCI manifest has no documents.");
  await seedRbac();
  const category = await prisma.datasetCategory.upsert({ where: { slug: "ficci" }, update: { name: "FICCI", active: true }, create: { name: "FICCI", slug: "ficci", description: "FICCI-CSIR Technology Showcase dataset" } });
  const project = await prisma.project.upsert({ where: { slug: "ficci" }, update: { name: "FICCI", status: "ACTIVE", isSystem: true }, create: { name: "FICCI", slug: "ficci", description: "FICCI-CSIR Technology Showcase project", projectType: "TECHNOLOGY_SHOWCASE", status: "ACTIVE", isSystem: true, folderPath: "FICCI" } });
  const labs = await prisma.lab.findMany(); const labByCode = new Map(labs.map((lab) => [lab.code, lab]));
  const groups = new Map();
  for (const document of manifest.documents) {
    const key = document.technologySourceKey || `${document.labCode}:${document.technologyName}`;
    if (!groups.has(key)) groups.set(key, { sourceKey: document.technologySourceKey || `ficci:${crypto.createHash("sha1").update(key).digest("hex")}`, labCode: document.labCode, technologyName: document.technologyName, files: [] });
    groups.get(key).files.push(document);
  }
  const importRecord = await prisma.datasetImport.create({ data: { categoryId: category.id, fileName: "FICCI/manifest.json", format: "manifest", recordsTotal: groups.size, status: "PROCESSING" } });
  let imported = 0; const missing = [];
  for (const group of groups.values()) {
    const lab = labByCode.get(group.labCode); if (!lab) { missing.push(group.labCode); continue; }
    const technology = await prisma.technology.upsert({
      where: { sourceKey: group.sourceKey },
      update: { name: group.technologyName, labId: lab.id, datasetCategoryId: category.id, recordScope: "PROJECT_ONLY", approvalStatus: "APPROVED", sopLegacyExempt: true, sopCompletion: 100 },
      create: { sourceKey: group.sourceKey, name: group.technologyName, labId: lab.id, datasetCategoryId: category.id, briefDescription: `FICCI-CSIR Technology Showcase submission from CSIR-${group.labCode}. Open the preserved source document for complete details.`, piName: lab.piName, classification: "NON_IP", ipStatus: "NON_IP", status: "LISTED", recordScope: "PROJECT_ONLY", approvalStatus: "APPROVED", sopLegacyExempt: true, sopCompletion: 100 },
    });
    await prisma.projectTechnology.upsert({ where: { projectId_technologyId: { projectId: project.id, technologyId: technology.id } }, update: { relationshipType: "PROJECT_SPECIFIC" }, create: { projectId: project.id, technologyId: technology.id, relationshipType: "PROJECT_SPECIFIC" } });
    for (const file of group.files) {
      const fullPath = path.join(process.cwd(), ...file.storedPath.split("/"));
      if (!fs.existsSync(fullPath)) throw new Error(`FICCI source document missing: ${file.storedPath}`);
      const extension = file.fileType || path.extname(file.originalFileName).slice(1).toLowerCase();
      const docKey = file.documentSourceKey || `ficci-doc:${crypto.createHash("sha1").update(file.storedPath).digest("hex")}`;
      const info = fs.statSync(fullPath);
      await prisma.document.upsert({ where: { sourceKey: docKey }, update: { technologyId: technology.id, entityId: technology.id, fileName: file.originalFileName, filePath: file.storedPath, fileSize: info.size }, create: { sourceKey: docKey, entityType: "TECHNOLOGY", entityId: technology.id, technologyId: technology.id, fileName: file.originalFileName, fileType: extension, mimeType: file.mimeType || MIME[extension], filePath: file.storedPath, fileSize: info.size, versionGroup: crypto.randomUUID(), description: "Original FICCI Technology Showcase source document" } });
    }
    imported += 1;
  }
  await prisma.datasetImport.update({ where: { id: importRecord.id }, data: { recordsImported: imported, recordsFailed: groups.size - imported, status: missing.length ? "PARTIAL" : "COMPLETED", errorLog: missing.length ? `Missing lab codes: ${[...new Set(missing)].join(", ")}` : null, completedAt: new Date() } });
  console.log(`Imported ${imported} FICCI technology records and linked ${manifest.documents.length} short-path source documents.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
