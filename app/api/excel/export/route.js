import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { readStoredFile } from "../../../../lib/storage";
import { cleanText } from "../../../../lib/request";
import { logAudit } from "../../../../lib/labAuth";

export const runtime = "nodejs";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const params = new URL(req.url).searchParams; const type = cleanText(params.get("type") || "master", 30).toLowerCase(); const labId = session.type === "lab" ? session.labId : Number(params.get("labId")) || null; const projectId = Number(params.get("projectId")) || null; if (session.type === "user" && !isManager(session) && !["master", "lab"].includes(type)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });
  const template = await prisma.excelTemplate.findFirst({ where: { active: true }, orderBy: { effectiveFrom: "desc" } }); if (!template) return NextResponse.json({ error: "No active template configured." }, { status: 404 }); const workbook = new ExcelJS.Workbook(); const { bytes: templateBytes } = await readStoredFile(template.filePath); await workbook.xlsx.load(templateBytes);
  if (["master", "project", "lab"].includes(type)) { const sheet = workbook.getWorksheet("Master_Register"); const where = { ...(projectId ? { projectLinks: { some: { projectId, projectStatus: "ACTIVE" } } } : { recordScope: "MASTER" }), ...(labId ? { labId } : {}) }; const technologies = await prisma.technology.findMany({ where, include: { lab: { select: publicLabSelect } }, orderBy: [{ lab: { code: "asc" } }, { name: "asc" }] }); if (sheet.rowCount > 4) sheet.spliceRows(5, sheet.rowCount - 4); technologies.forEach((technology, index) => { sheet.addRow([index + 1, `CSIR-${technology.lab.code}`, technology.name, technology.piName, technology.theme || technology.sector, technology.technologyType, technology.ipStatus, technology.trl, technology.crl, technology.commercialisationStage, technology.partnerClient, technology.responsibleBdOfficer, technology.updatedAt, technology.remarks]); }); sheet.views = [{ state: "frozen", ySplit: 4 }]; }
  else { const sheet = workbook.addWorksheet("Portal_Export"); const rows = type === "queries" ? await prisma.query.findMany({ where: labId ? { targetLabId: labId } : {}, include: { targetLab: true, project: true, technology: true } }) : type === "monthly" || type === "quarterly" ? await prisma.reportSubmission.findMany({ where: { report: { reportType: type.toUpperCase() }, ...(labId ? { labId } : {}) }, include: { report: true, lab: { select: publicLabSelect } } }) : await prisma.sopDataRecord.findMany({ where: { ...(labId ? { labId } : {}), ...(projectId ? { projectId } : {}) }, include: { lab: { select: publicLabSelect }, technology: true, project: true } }); const jsonRows = rows.map((row) => JSON.parse(JSON.stringify(row))); const keys = [...new Set(jsonRows.flatMap((row) => Object.keys(row)))]; sheet.addRow(keys); for (const row of jsonRows) sheet.addRow(keys.map((key) => typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key])); sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }; sheet.views = [{ state: "frozen", ySplit: 1 }]; }
  const buffer = await workbook.xlsx.writeBuffer(); await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "EXCEL_EXPORTED", entityType: "EXPORT", details: { type, labId, projectId } }); return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="csir-${type}-export.xlsx"`, "Cache-Control": "no-store" } });
}

export const GET = withApiBoundary(GETHandler);
