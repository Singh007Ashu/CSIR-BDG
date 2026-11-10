const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const file = path.join(__dirname, "data", "master-technologies.json");
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  const labs = await prisma.lab.findMany({ select: { id: true, code: true } });
  const labByCode = new Map(labs.map((lab) => [lab.code.toUpperCase(), lab.id]));
  let imported = 0;
  const missingLabs = new Set();

  for (const record of records) {
    const labCode = String(record.labCode || "").replace(/^CSIR-/i, "").toUpperCase();
    const labId = labByCode.get(labCode);
    if (!labId) {
      missingLabs.add(labCode);
      continue;
    }
    const identity = record.sourceUrl || `${labCode}:${record.name}`;
    const sourceKey = `master:${crypto.createHash("sha1").update(identity.toLowerCase()).digest("hex")}`;
    const description = [record.sector, record.subSector].filter(Boolean).join(" — ") || "CSIR master technology record imported from the lab/theme-wise register.";
    await prisma.technology.upsert({
      where: { sourceKey },
      update: {
        name: record.name,
        labId,
        briefDescription: description,
        theme: (record.themeCodes || []).join(", ") || null,
        sector: record.sector || null,
        subSector: record.subSector || null,
        trl: record.trl || null,
        sourceUrl: record.sourceUrl || null,
        recordScope: "MASTER",
        approvalStatus: "APPROVED",
        sopLegacyExempt: true,
      },
      create: {
        sourceKey,
        name: record.name,
        labId,
        briefDescription: description,
        theme: (record.themeCodes || []).join(", ") || null,
        sector: record.sector || null,
        subSector: record.subSector || null,
        trl: record.trl || null,
        sourceUrl: record.sourceUrl || null,
        classification: "NON_IP",
        ipStatus: "Patent not filed",
        technologyType: "Non-IP know-how",
        commercialisationStage: "Lead identified",
        status: "LISTED",
        recordScope: "MASTER",
        approvalStatus: "APPROVED",
        sopCompletion: 100,
        sopLegacyExempt: true,
        approvedAt: new Date(),
      },
    });
    imported += 1;
  }

  console.log(`Imported or updated ${imported} master technologies. Missing labs: ${[...missingLabs].join(", ") || "none"}.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
