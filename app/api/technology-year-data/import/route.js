import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { readImportWorkbook } from "../../../../lib/workbookReader";
import { scanUpload } from "../../../../lib/malwareScan";
import { validateUploadBytes } from "../../../../lib/uploadValidation";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../../lib/labAuth";

import { parseFinancialYear } from "../../../../lib/financialYear";

export const runtime = "nodejs";

function text(cell) {
  const raw = cell?.value;
  if (raw && typeof raw === "object") return cleanText(raw.text || raw.result || raw.hyperlink || "", 10000);
  return cleanText(raw, 10000);
}
function number(cell, percentage = false) {
  const raw = cell?.value && typeof cell.value === "object" ? cell.value.result : cell?.value;
  if (typeof raw === "number") return Number.isFinite(raw) ? (percentage && raw > 0 && raw <= 1 ? raw * 100 : raw) : null;
  const source = String(raw ?? "").replace(/,/g, "").replace(/[₹%]/g, "").trim();
  if (!source) return null;
  const parsed = Number(source); return Number.isFinite(parsed) ? parsed : null;
}
function normalized(value) { return cleanText(value, 500).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function technologyName(value) { return cleanText(value, 300).replace(/^\s*\d+\s*[.)-]*\s*/, "").trim(); }
const loadWorkbook = readImportWorkbook;
function findHeader(workbook) {
  for (const sheet of workbook.worksheets) for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 25); rowNumber += 1) {
    const values = sheet.getRow(rowNumber).values.slice(1).map((value) => cleanText(value?.text || value?.result || value, 500));
    if (values.some((value) => /^year$/i.test(value)) && values.some((value) => /technology/i.test(value))) return { sheet, rowNumber, values };
  }
  return null;
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "Lab or Head & Admin permission required." }, { status: 403 });
  if (["HEAD_ADMIN", "HEAD_BDG"].includes(session.role)) return NextResponse.json({ error: "HEAD access is read-only. Please request changes from the laboratory." }, { status: 403 });
  try {
    const form = await req.formData(); const file = form.get("file"); const mode = cleanText(form.get("mode") || "preview", 20).toLowerCase();
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "XLSX file is required." }, { status: 400 });
    if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "The XLSX file must be 5 MB or smaller." }, { status: 400 });
    const labId = session.type === "lab" ? session.labId : Number(form.get("labId"));
    if (!labId) return NextResponse.json({ error: "Select the laboratory before uploading year-wise data." }, { status: 400 });
    const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { id: true, code: true, name: true } });
    if (!lab) return NextResponse.json({ error: "Laboratory not found." }, { status: 404 });

    const workbook = await loadWorkbook(file); const header = findHeader(workbook);
    if (!header) return NextResponse.json({ error: "Could not find a Year and Technology header row in this workbook.", detectedSheets: workbook.worksheets.map((sheet) => sheet.name) }, { status: 400 });
    const joinedHeaders = header.values.join(" ").toLowerCase();
    const recordType = joinedHeaders.includes("royalty amount") ? "ROYALTY_RECEIVED" : joinedHeaders.includes("estimated value") ? "COMMERCIAL_NO_ROYALTY" : null;
    if (!recordType) return NextResponse.json({ error: "Workbook is not one of the supported royalty or no-royalty commercial-production formats." }, { status: 400 });

    const columns = {};
    header.values.forEach((value, index) => {
      const key = value.toLowerCase(); const column = index + 1;
      if (/^year$/.test(key)) columns.year = column;
      else if (key.includes("technology")) columns.technology = column;
      else if (key.includes("royalty amount")) columns.royaltyAmount = column;
      else if (key.includes("% of net sales")) columns.royaltyRate = column;
      else if (key.includes("estimated value")) columns.productionValue = column;
      else if (key.includes("sector")) columns.sector = column;
    });
    const existing = await prisma.technology.findMany({ where: { labId, recordScope: "MASTER" }, select: { id: true, name: true, recordFinancialYear: true } });
    const existingMap = new Map(existing.map((technology) => [normalized(technology.name), technology]));
    const rows = [], errors = [], seen = new Set(); let financialYear = null;
    for (let rowNumber = header.rowNumber + 1; rowNumber <= header.sheet.rowCount; rowNumber += 1) {
      const row = header.sheet.getRow(rowNumber); const yearText = text(row.getCell(columns.year));
      if (yearText) financialYear = parseFinancialYear(yearText);
      const rawName = text(row.getCell(columns.technology)); const name = technologyName(rawName);
      if (!name || /insert more rows|^\d+\.*$/i.test(rawName)) continue;
      const rowErrors = []; const currentYear = new Date().getFullYear();
      if (!financialYear || financialYear < 1900 || financialYear > currentYear) rowErrors.push(`Financial year must be between 1900 and ${currentYear}`);
      const royaltyAmountLakhs = columns.royaltyAmount ? number(row.getCell(columns.royaltyAmount)) : null;
      const royaltyRatePercent = columns.royaltyRate ? number(row.getCell(columns.royaltyRate), true) : null;
      const commercialProductionValueLakhs = columns.productionValue ? number(row.getCell(columns.productionValue)) : null;
      if (recordType === "ROYALTY_RECEIVED" && royaltyAmountLakhs === null) rowErrors.push("Royalty amount is required");
      if (recordType === "COMMERCIAL_NO_ROYALTY" && commercialProductionValueLakhs === null) rowErrors.push("Estimated commercial production value is required");
      if ([royaltyAmountLakhs, royaltyRatePercent, commercialProductionValueLakhs].some((value) => value !== null && value < 0)) rowErrors.push("Financial values cannot be negative");
      if (royaltyRatePercent !== null && royaltyRatePercent > 100) rowErrors.push("Royalty rate cannot exceed 100%");
      const key = `${financialYear}:${normalized(name)}:${recordType}`; if (seen.has(key)) rowErrors.push("Duplicate technology/year row in workbook"); seen.add(key);
      const matched = existingMap.get(normalized(name)) || null;
      const parsed = { rowNumber, financialYear, name, sector: columns.sector ? text(row.getCell(columns.sector)) : "", recordType, royaltyAmountLakhs, royaltyRatePercent, commercialProductionValueLakhs, matchedTechnologyId: matched?.id || null };
      if (rowErrors.length) errors.push({ row: rowNumber, technology: name, errors: rowErrors }); else rows.push(parsed);
    }
    const preview = { format: recordType, laboratory: `CSIR-${lab.code || lab.name}`, rowsDetected: rows.length + errors.length, valid: rows.length, matched: rows.filter((row) => row.matchedTechnologyId).length, newTechnologies: rows.filter((row) => !row.matchedTechnologyId).length, errors: errors.length, errorDetails: errors.slice(0, 100), rows: rows.slice(0, 100) };
    if (mode !== "commit") return NextResponse.json(preview);
    if (errors.length) return NextResponse.json({ ...preview, error: "Import was not committed because validation errors exist." }, { status: 400 });
    if (!rows.length) return NextResponse.json({ ...preview, error: "No completed technology rows were found." }, { status: 400 });

    let technologiesCreated = 0, annualRowsSaved = 0;
    await prisma.$transaction(async (tx) => {
      const map = new Map(existingMap);
      for (const item of rows) {
        let technology = map.get(normalized(item.name));
        if (!technology) {
          technology = await tx.technology.create({ data: { name: item.name, labId, briefDescription: item.name, sector: item.sector || null, theme: item.sector || null, recordScope: "MASTER", recordFinancialYear: item.financialYear, approvalStatus: "DRAFT", status: "IDENTIFIED", sopLegacyExempt: false } });
          map.set(normalized(item.name), technology); technologiesCreated += 1;
        } else if (!technology.recordFinancialYear || item.financialYear < technology.recordFinancialYear) {
          technology = await tx.technology.update({ where: { id: technology.id }, data: { recordFinancialYear: item.financialYear, ...(!item.sector ? {} : { sector: item.sector }) } }); map.set(normalized(item.name), technology);
        }
        await tx.technologyFinancialYear.upsert({ where: { technologyId_financialYear_recordType: { technologyId: technology.id, financialYear: item.financialYear, recordType } }, update: { royaltyAmountLakhs: item.royaltyAmountLakhs, royaltyRatePercent: item.royaltyRatePercent, commercialProductionValueLakhs: item.commercialProductionValueLakhs, sector: item.sector || null, sourceFileName: file.name }, create: { technologyId: technology.id, financialYear: item.financialYear, recordType, royaltyAmountLakhs: item.royaltyAmountLakhs, royaltyRatePercent: item.royaltyRatePercent, commercialProductionValueLakhs: item.commercialProductionValueLakhs, sector: item.sector || null, sourceFileName: file.name } });
        annualRowsSaved += 1;
      }
    });
    await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "TECHNOLOGY_YEAR_DATA_IMPORTED", entityType: "DATASET_IMPORT", details: { fileName: file.name, labId, recordType, technologiesCreated, annualRowsSaved } });
    if (session.type === "lab") await notifyHeadBdgAndAdmins({ type: "TECHNOLOGY_UPDATE", title: "Laboratory annual data imported", message: `CSIR-${lab.code}: ${annualRowsSaved} financial-year records saved; ${technologiesCreated} technologies added.`, link: "/master-technologies" });
    return NextResponse.json({ ...preview, technologiesCreated, annualRowsSaved }, { status: 201 });
  } catch (importError) {
    console.error("Year-wise technology import failed", importError);
    return NextResponse.json({ error: importError?.message || "The workbook could not be processed." }, { status: 400 });
  }
}

export const POST = withApiBoundary(POSTHandler);
