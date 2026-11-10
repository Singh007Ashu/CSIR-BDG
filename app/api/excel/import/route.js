import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { readImportWorkbook } from "../../../../lib/workbookReader";
import { scanUpload } from "../../../../lib/malwareScan";
import { validateUploadBytes } from "../../../../lib/uploadValidation";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";
import { syncTechnologySop } from "../../../../lib/governance";

export const runtime = "nodejs";

const expected = ["S.No.", "Lab", "Technology", "PI / Technical Owner", "Sector / Theme", "Technology Type", "IP Status", "TRL", "CRL", "Commercialisation Stage", "Partner / Client", "Responsible BD Officer", "Last Updated", "Remarks"];

function value(cell) {
  const raw = cell?.value;
  if (raw && typeof raw === "object") return raw.text || raw.result || raw.hyperlink || String(raw);
  return raw ?? "";
}

const loadWorkbook = readImportWorkbook;

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const mode = cleanText(form.get("mode") || "preview", 20).toLowerCase();
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "XLSX file is required." }, { status: 400 });
    if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "The XLSX file must be 5 MB or smaller." }, { status: 400 });

    const workbook = await loadWorkbook(file);
    const sheet = workbook.getWorksheet("Master_Register");
    if (!sheet) {
      return NextResponse.json({
        error: "Master_Register sheet is missing. Download the approved CSIR template, enter data in Master_Register, then upload that file.",
        detectedSheets: workbook.worksheets.map((item) => item.name),
      }, { status: 400 });
    }

    const headers = sheet.getRow(4).values.slice(1).map((item) => cleanText(item, 200));
    const missingColumns = expected.filter((column) => !headers.includes(column));
    if (missingColumns.length) return NextResponse.json({ error: "Template columns do not match the approved structure.", missingColumns }, { status: 400 });

    const [labs, refs, existing] = await Promise.all([
      prisma.lab.findMany({ select: { id: true, code: true } }),
      prisma.referenceList.findMany({ include: { options: { where: { active: true } } } }),
      prisma.technology.findMany({ where: { recordScope: "MASTER" }, select: { labId: true, name: true } }),
    ]);
    const labMap = new Map(labs.flatMap((lab) => [[lab.code.toUpperCase(), lab], [("CSIR-" + lab.code).toUpperCase(), lab]]));
    const refMap = new Map(refs.map((list) => [list.key, new Set(list.options.map((option) => option.value))]));
    const existingKeys = new Set(existing.map((item) => (item.labId + ":" + item.name).toLowerCase()));
    const parsed = [];
    const errors = [];
    const seen = new Set();

    for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const technologyName = cleanText(value(row.getCell(3)), 300);
      if (!technologyName) continue;
      const labValue = cleanText(value(row.getCell(2)), 100).toUpperCase();
      const lab = labMap.get(labValue);
      const record = {
        rowNumber,
        lab,
        name: technologyName,
        piName: cleanText(value(row.getCell(4)), 200),
        sector: cleanText(value(row.getCell(5)), 300),
        technologyType: cleanText(value(row.getCell(6)), 100),
        ipStatus: cleanText(value(row.getCell(7)), 100),
        trl: Number(String(value(row.getCell(8))).trim()),
        crl: Number(String(value(row.getCell(9))).trim()),
        commercialisationStage: cleanText(value(row.getCell(10)), 100),
        partnerClient: cleanText(value(row.getCell(11)), 300),
        responsibleBdOfficer: cleanText(value(row.getCell(12)), 200),
        remarks: cleanText(value(row.getCell(14)), 3000),
      };
      const rowErrors = [];
      if (!lab) rowErrors.push("Unknown laboratory: " + (labValue || "blank"));
      for (const [key, label] of [["piName", "PI / Technical Owner"], ["sector", "Sector / Theme"], ["technologyType", "Technology Type"], ["ipStatus", "IP Status"], ["commercialisationStage", "Commercialisation Stage"], ["responsibleBdOfficer", "Responsible BD Officer"]]) {
        if (!record[key]) rowErrors.push(label + " is required");
      }
      if (!Number.isInteger(record.trl) || record.trl < 1 || record.trl > 9) rowErrors.push("TRL must be an integer 1-9");
      if (!Number.isInteger(record.crl) || record.crl < 1 || record.crl > 9) rowErrors.push("CRL must be an integer 1-9");
      for (const [key, listKey] of [["technologyType", "Technology_Type"], ["ipStatus", "IP_Status"], ["commercialisationStage", "Commercialisation_Stage"]]) {
        if (record[key] && !refMap.get(listKey)?.has(record[key])) rowErrors.push(record[key] + " is not an approved " + listKey + " value");
      }
      const duplicateKey = ((lab?.id || labValue) + ":" + technologyName).toLowerCase();
      if (seen.has(duplicateKey)) rowErrors.push("Duplicate technology in workbook");
      seen.add(duplicateKey);
      if (lab && existingKeys.has((lab.id + ":" + technologyName).toLowerCase())) rowErrors.push("Technology already exists in the master register");
      if (rowErrors.length) errors.push({ row: rowNumber, technology: technologyName, errors: rowErrors });
      else parsed.push(record);
    }

    const preview = {
      rowsDetected: parsed.length + errors.length,
      valid: parsed.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 200),
      warning: "Valid rows are imported as DRAFT. Head & Admin controls the active SOP and approval decision.",
    };
    if (mode !== "commit") return NextResponse.json(preview);
    if (errors.length) return NextResponse.json({ ...preview, error: "Import was not committed because validation errors exist." }, { status: 400 });
    if (!parsed.length) return NextResponse.json({ ...preview, error: "No technology rows were found in Master_Register." }, { status: 400 });

    const created = [];
    await prisma.$transaction(async (tx) => {
      for (const record of parsed) {
        created.push(await tx.technology.create({ data: {
          name: record.name,
          labId: record.lab.id,
          briefDescription: record.sector || "Imported master technology",
          piName: record.piName,
          sector: record.sector,
          theme: record.sector,
          technologyType: record.technologyType,
          ipStatus: record.ipStatus,
          trl: record.trl,
          crl: record.crl,
          commercialisationStage: record.commercialisationStage,
          partnerClient: record.partnerClient || null,
          responsibleBdOfficer: record.responsibleBdOfficer,
          remarks: record.remarks || null,
          recordScope: "MASTER",
          approvalStatus: "DRAFT",
          status: "IDENTIFIED",
          sopLegacyExempt: false,
        } }));
      }
    });
    for (const technology of created) await syncTechnologySop(technology.id, technology);
    await logAudit({ actorType: "USER", actorUserId: session.userId, action: "EXCEL_IMPORTED", entityType: "DATASET_IMPORT", details: { fileName: file.name, imported: created.length } });
    return NextResponse.json({ ...preview, imported: created.length }, { status: 201 });
  } catch (importError) {
    console.error("Excel import failed", importError);
    return NextResponse.json({ error: importError?.message || "The workbook could not be processed. Please use the approved XLSX template." }, { status: 400 });
  }
}

export const POST = withApiBoundary(POSTHandler);
