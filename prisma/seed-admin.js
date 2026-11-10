const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@csir.res.in").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if(!password || password.length<12)throw new Error("Set a strong ADMIN_PASSWORD before initial setup.");
  const role = await prisma.role.findUnique({ where: { key: "SUPER_ADMIN" } });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data: { name: "CSIR BDG System Administrator", email, passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN", roleId: role?.id || null, accountStatus: "ACTIVE" } });
    console.log(`Created the administrator account: ${email}`);
  } else {
    console.log(`Administrator account already exists: ${email}`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
