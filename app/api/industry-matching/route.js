import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { saveUpload, readStoredFile } from "../../../lib/storage";
import { extractLocally } from "../../../lib/documentAnalysis";
import { extractIndustryFileWithPython, matchIndustryNeed } from "../../../lib/industryMatcher";
import { logAudit } from "../../../lib/labAuth";

export const runtime = "nodejs";

function parse(value, fallback = {}) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }

function embeddedTechnologyMatches(local) {
  const results = [];
  for (const sheet of local.sheets || []) {
    const rows = sheet.sampleRows || [];
    const headerIndex = rows.findIndex((row) => row.some((cell) => /technology\s*(title|name)/i.test(String(cell || ""))));
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].map((cell) => String(cell || "").trim().toLowerCase());
    const column = (pattern) => headers.findIndex((header) => pattern.test(header));
    const indexes = { topic: column(/^topic$/), fit: column(/^fit$/), lab: column(/^lab/), name: column(/technology\s*(title|name)/), trl: column(/^trl/), engagement: column(/industry engagement|commercial/), note: column(/mapping note|solution|description/) };
    for (const row of rows.slice(headerIndex + 1)) {
      const name = String(row[indexes.name] || "").trim(); if (!name) continue;
      const fit = String(row[indexes.fit] || "Related").trim(); const trlText = String(row[indexes.trl] || ""); const trl = Number(trlText.match(/\b([1-9])\b/)?.[1]) || null;
      const engagement = String(row[indexes.engagement] || ""); const ready = (trl && trl >= 7) || /licensed|commercial|ready for|available for|deployment/i.test(engagement);
      results.push({ source: "UPLOADED_FILE", technologyId: null, name, labCode: String(row[indexes.lab] || "Not specified").replace(/^CSIR-/i, ""), labName: String(row[indexes.lab] || "Not specified"), score: fit.toLowerCase() === "direct" ? 95 : fit.toLowerCase() === "related" ? 80 : 65, matchedTerms: [String(row[indexes.topic] || "")].filter(Boolean), readiness: ready ? "Ready to sell / transfer" : "Needs technical/commercial review", trl, commercialisationStage: engagement || null, reason: `${fit} match from uploaded ${sheet.name} sheet${row[indexes.note] ? ` · ${String(row[indexes.note]).slice(0, 220)}` : ""}` });
    }
  }
  return results;
}

async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "HEAD/Admin permission required." }, { status: 403 });
  const cases = await prisma.industryNeedCase.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(cases.map((item) => ({ ...item, analysis: parse(item.analysisJson) })));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "HEAD/Admin permission required." }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Choose an industry-need file." }, { status: 400 });
  const title = cleanText(form.get("title") || file.name.replace(/\.[^.]+$/, ""), 300);
  const referenceNo = `NEED-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
  const draft = await prisma.industryNeedCase.create({ data: { referenceNo, title, description: optionalText(form.get("description"), 5000), fileName: cleanText(file.name, 255), fileType: String(file.name).split(".").pop().toLowerCase(), mimeType: cleanText(file.type, 150) || null, filePath: "PENDING", fileSize: file.size, status: "ANALYSING", uploadedByUserId: session.userId } });
  try {
    const saved = await saveUpload(file, "INDUSTRY_NEED", draft.id);
    const stored = await readStoredFile(saved.relativePath);
    let local;
    try { local = await extractLocally(file.name, stored.bytes); }
    catch (extractionError) { local = ["xlsx", "xls"].includes(saved.extension) ? await extractIndustryFileWithPython(file.name, stored.bytes) : { kind: saved.extension.toUpperCase(), extractedText: "", sheets: [], note: extractionError.message }; }
    local ||= { kind: saved.extension.toUpperCase(), extractedText: "", sheets: [] };
    const technologies = await prisma.technology.findMany({ where: { recordScope: "MASTER" }, select: { id: true, name: true, briefDescription: true, advantages: true, applications: true, keyFeatures: true, theme: true, sector: true, technologyType: true, trl: true, crl: true, commercialisationStage: true, ipStatus: true, lab: { select: { code: true, name: true } } } });
    const matching = await matchIndustryNeed({ title, description: form.get("description"), text: local.extractedText || "", technologies });
    const embedded = embeddedTechnologyMatches(local);
    const seen = new Set(embedded.map((item) => item.name.toLowerCase()));
    const matches = [...embedded, ...matching.matches.filter((item) => !seen.has(String(item.name).toLowerCase()))].sort((a,b)=>b.score-a.score).slice(0,30);
    const analysis = { sourceKind: local.kind, extractedPreview: (local.extractedText || "").slice(0, 4000), ...matching, embeddedTechnologyCount: embedded.length, matches };
    const completed = await prisma.industryNeedCase.update({ where: { id: draft.id }, data: { filePath: saved.relativePath, fileType: saved.extension, status: "ANALYSED", analysisJson: JSON.stringify(analysis) } });
    await logAudit({ actorType: "USER", actorUserId: session.userId, action: "INDUSTRY_NEED_MATCHED", entityType: "INDUSTRY_NEED", entityId: draft.id, details: { engine: matching.engine, matches: matching.matches.length } });
    return NextResponse.json({ ...completed, analysis }, { status: 201 });
  } catch (caught) {
    await prisma.industryNeedCase.update({ where: { id: draft.id }, data: { status: "FAILED", analysisJson: JSON.stringify({ error: caught.message }) } }).catch(() => {});
    return NextResponse.json({ error: caught.message || "Industry need analysis failed.", referenceNo }, { status: 400 });
  }
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
