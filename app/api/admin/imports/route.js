import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";
import { parseCsv } from "../../../../lib/csv";
import { cleanText, optionalText, safeNumber } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

export const runtime = "nodejs";
function value(row, keys) { for (const key of keys) if (row[key] !== undefined && row[key] !== "") return row[key]; return null; }

async function POSTHandler(req) {
  const { session, error } = await requireRole(["ADMIN"]); if (error) return error;
  const form = await req.formData(); const file = form.get("file");
  if (!file || typeof file.text !== "function" || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "A CSV or JSON file up to 10 MB is required." }, { status: 400 });
  const categoryName = cleanText(form.get("categoryName"), 150); if (!categoryName) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const slug = cleanText(form.get("categorySlug") || categoryName, 150).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const category = await prisma.datasetCategory.upsert({ where: { slug }, update: { name: categoryName }, create: { name: categoryName, slug } });
  const extension = file.name.split(".").pop().toLowerCase(); const text = await file.text(); let rows;
  try { rows = extension === "json" ? JSON.parse(text) : parseCsv(text); if (!Array.isArray(rows)) rows = rows.technologies || []; } catch { return NextResponse.json({ error: "The import file could not be parsed." }, { status: 400 }); }
  const importRecord = await prisma.datasetImport.create({ data: { categoryId: category.id, fileName: cleanText(file.name, 255), format: extension, recordsTotal: rows.length, status: "PROCESSING", importedById: session.userId } });
  const labs = await prisma.lab.findMany(); const byCode = new Map(labs.map((lab) => [lab.code?.toUpperCase(), lab])); let imported = 0; const errors = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]; const name = value(row, ["name", "Technology Name", "technology", "title"]); const code = String(value(row, ["labCode", "Lab Code", "lab", "CSIR Lab"]) || "").replace(/^CSIR-/i, "").toUpperCase(); const lab = byCode.get(code);
    if (!name || !lab) { errors.push(`Row ${i + 2}: missing technology name or valid lab code.`); continue; }
    try { await prisma.technology.create({ data: { name: cleanText(name, 300), labId: lab.id, datasetCategoryId: category.id, sourceKey: `${slug}:${importRecord.id}:${i}`, briefDescription: cleanText(value(row, ["briefDescription", "description", "Brief Description"]) || `${categoryName} technology from CSIR-${code}.`, 10000), piName: optionalText(value(row, ["piName", "PI", "Principal Investigator"]), 150), sector: optionalText(value(row, ["sector", "Technology Area"]), 150), applications: optionalText(value(row, ["applications", "Applications"])), advantages: optionalText(value(row, ["advantages", "Advantages"])), trl: safeNumber(value(row, ["trl", "TRL"])), ipStatus: cleanText(value(row, ["ipStatus", "IP Status"]) || "NON_IP", 30), status: "LISTED" } }); imported += 1; } catch (rowError) { errors.push(`Row ${i + 2}: ${rowError.message}`); }
  }
  await prisma.datasetImport.update({ where: { id: importRecord.id }, data: { recordsImported: imported, recordsFailed: rows.length - imported, status: errors.length && !imported ? "FAILED" : errors.length ? "PARTIAL" : "COMPLETED", errorLog: errors.slice(0, 100).join("\n") || null, completedAt: new Date() } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "DATASET_IMPORTED", entityType: "DATASET_IMPORT", entityId: importRecord.id, details: { category: categoryName, imported, failed: rows.length - imported } });
  return NextResponse.json({ id: importRecord.id, imported, failed: rows.length - imported, errors: errors.slice(0, 20) });
}

export const POST = withApiBoundary(POSTHandler);
