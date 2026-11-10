const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const prisma = new PrismaClient();

const permissionNames = ["RECORDS_READ", "DOCUMENT_UPLOAD", "WORKFLOW_REVIEW", "WORKFLOW_FORWARD", "SOP_COMPLIANCE_VIEW", "REPORTS_MONITOR", "QUERIES_MANAGE", "TECHNOLOGY_EDIT", "TECHNOLOGY_CHANGE_REQUEST"];
const hqAccounts = [
  ["BDG", "BDG Review Officer", "bdg.office@csir.res.in"],
  ["CPD", "CPD Planning Officer", "cpd.office@csir.res.in"],
  ["IMD", "IMD Impact Officer", "imd.office@csir.res.in"],
  ["TMD", "TMD Technology Officer", "tmd.office@csir.res.in"],
  ["IPU", "IPU Licensing Officer", "ipu.office@csir.res.in"],
  ["URDIP", "URDIP Intelligence Officer", "urdip.office@csir.res.in"],
  ["ICM", "ICM Industry Officer", "icm.office@csir.res.in"],
];

function oneTimePassword() { return `${randomBytes(15).toString("base64url")}aA1!`; }

async function removeFinanceAccounts() {
  await prisma.user.updateMany({ where: { OR: [{ role: "LAB_FINANCE" }, { email: "npl.finance@csir.res.in" }] }, data: { role: "RETIRED_LAB_ACCOUNT", roleId: null, assignedLabId: null, accountStatus: "INACTIVE" } });
  await prisma.role.deleteMany({ where: { key: "LAB_FINANCE" } });
}

async function main() {
  await removeFinanceAccounts();
  const permissions = {};
  for (const key of permissionNames) permissions[key] = await prisma.permission.upsert({ where: { key }, update: { name: key.replaceAll("_", " ") }, create: { key, name: key.replaceAll("_", " ") } });
  const npl = await prisma.lab.findUnique({ where: { code: "NPL" }, select: { id: true } });
  const all = [...hqAccounts.map((row) => [...row, null]), ["LAB_BD", "NPL Lab BD Officer", "npl.bd@csir.res.in", npl?.id || null], ["PI", "NPL Principal Investigator", "npl.pi@csir.res.in", npl?.id || null]];
  const createdCredentials = [];
  for (const [key, name, email, assignedLabId] of all) {
    const role = await prisma.role.upsert({ where: { key }, update: { name }, create: { key, name, description: `SOP governing role: ${key}` } });
    for (const permission of Object.values(permissions)) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) await prisma.user.update({ where: { id: existing.id }, data: { name, role: key, roleId: role.id, assignedLabId, accountStatus: "ACTIVE" } });
    else {
      const password = oneTimePassword();
      await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: key, roleId: role.id, assignedLabId, accountStatus: "ACTIVE" } });
      createdCredentials.push({ role: key, email, password });
    }
  }
  console.log("Seeded SOP governing-body and Lab BD/PI accounts.");
  if (createdCredentials.length) { console.log("ONE-TIME LOCAL CREDENTIALS - save securely; they will not be printed again:"); console.table(createdCredentials); }
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());