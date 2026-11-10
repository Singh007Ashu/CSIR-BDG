const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, "data", "technologies.json");
  const rows = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const labs = await prisma.lab.findMany();
  const labByCode = new Map(labs.map((l) => [l.code, l]));

  const existingCount = await prisma.technology.count();
  if (existingCount > 0) {
    console.log(`Technology table already has ${existingCount} rows. Skipping import to avoid duplicates.`);
    console.log(`(If you want to re-import, clear the Technology table first: npx prisma studio, or a fresh db:push.)`);
    return;
  }

  let imported = 0;
  let missingLab = 0;
  const missingCodes = new Set();
  const batchSize = 200;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const data = [];
    for (const r of batch) {
      const lab = labByCode.get(r.labCode);
      if (!lab) { missingLab++; missingCodes.add(r.labCode); continue; }
      data.push({
        name: r.name,
        labId: lab.id,
        briefDescription: r.briefDescription || `CSIR technology from ${r.labCode}.`,
        applications: r.applications || null,
        sector: r.sector || null,
        industryMap: r.industryMap || null,
        keyFeatures: r.keyFeatures || null,
        trl: r.trl || null,
        sourceUrl: r.sourceUrl || null,
        classification: "NON_IP",
        ipStatus: "NON_IP",
        status: "LISTED", // already-known CSIR technologies, ready to browse in the marketplace
      });
    }
    if (data.length) {
      await prisma.technology.createMany({ data });
      imported += data.length;
    }
    process.stdout.write(`\rImported ${imported} / ${rows.length}...`);
  }

  console.log(`\nDone. Imported ${imported} technologies.`);
  if (missingLab > 0) {
    console.log(`Skipped ${missingLab} rows — no matching Lab.code for: ${[...missingCodes].join(", ")}`);
    console.log(`Run "npm run db:seed" first to make sure all 37 labs (with codes) exist.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
