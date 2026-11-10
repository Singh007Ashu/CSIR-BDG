import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";
import { isInternalRole, LAB_GOVERNING_ROLES } from "../../../lib/roles";
import { cleanText, optionalText, safeDate } from "../../../lib/request";
import { saveUpload, readStoredFile, assertAllowedFile } from "../../../lib/storage";
import { validateUploadBytes } from "../../../lib/uploadValidation";
import { analyzeLabFile } from "../../../lib/documentAnalysis";
import { workflowWhere, workflowInclude, nextReference } from "../../../lib/workflow";
import { logAudit } from "../../../lib/labAuth";

export const runtime = "nodejs";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const params = new URL(req.url).searchParams;
  const status = cleanText(params.get("status"), 30);
  const packets = await prisma.workflowPacket.findMany({
    where: { ...workflowWhere(session), ...(status ? { status } : {}) },
    include: workflowInclude,
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ packets, aiConfigured: Boolean(process.env.OPENAI_API_KEY), role: session.role || "LAB" });
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type === "user" && !isInternalRole(session.role)) return NextResponse.json({ error: "Internal CSIR role required." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Select an Excel, PDF, Word, PowerPoint, image or text file." }, { status: 400 });
  let labId = session.type === "lab" ? session.labId : Number(form.get("labId"));
  if (session.type === "user" && LAB_GOVERNING_ROLES.includes(session.role)) labId = session.assignedLabId;
  if (!labId) return NextResponse.json({ error: "Laboratory is required." }, { status: 400 });
  const lab = await prisma.lab.findUnique({ where: { id: Number(labId) }, select: { id: true, code: true } });
  if (!lab) return NextResponse.json({ error: "Laboratory not found." }, { status: 404 });
  const technologyId = Number(form.get("technologyId")) || null;
  if (technologyId) {
    const technology = await prisma.technology.findFirst({ where: { id: technologyId, labId: lab.id }, select: { id: true } });
    if (!technology) return NextResponse.json({ error: "Selected technology does not belong to this laboratory." }, { status: 400 });
  }

  // Reject malformed uploads before creating an otherwise orphaned workflow.
  try { await validateUploadBytes(await file.arrayBuffer(), assertAllowedFile(file)); }
  catch (error) { return NextResponse.json({error:error.message || "Invalid upload."},{status:400}); }
  const packet = await prisma.workflowPacket.create({ data: {
    referenceNo: nextReference(), title: cleanText(form.get("title") || file.name, 300), packetType: "UNCLASSIFIED", status: "ANALYZING", currentUnit: "AI_TRIAGE",
    priority: ["NORMAL", "HIGH", "URGENT"].includes(cleanText(form.get("priority"), 20).toUpperCase()) ? cleanText(form.get("priority"), 20).toUpperCase() : "NORMAL",
    labId: lab.id, technologyId, submittedByType: session.type.toUpperCase(), submittedByUserId: session.type === "user" ? session.userId : null,
    submittedByLabId: session.type === "lab" ? session.labId : null, dueAt: safeDate(form.get("dueAt")),
  } });

  try {
    const saved = await saveUpload(file, "WORKFLOW_PACKET", packet.id);
    const document = await prisma.document.create({ data: {
      entityType: "WORKFLOW_PACKET", entityId: packet.id, technologyId, fileName: cleanText(file.name, 255), fileType: saved.extension,
      mimeType: cleanText(file.type, 150) || null, filePath: saved.relativePath, fileSize: file.size, versionGroup: crypto.randomUUID(),
      description: optionalText(form.get("description"), 1000), uploadedByLabId: session.type === "lab" ? session.labId : null, uploadedByUserId: session.type === "user" ? session.userId : null,
    } });
    await prisma.workflowDocument.create({ data: { packetId: packet.id, documentId: document.id } });
    const analysisRow = await prisma.documentAnalysis.create({ data: { documentId: document.id, status: "RUNNING", requestedByUserId: session.type === "user" ? session.userId : null, startedAt: new Date() } });
    const stored = await readStoredFile(saved.relativePath);
    const analysed = await analyzeLabFile({ fileName: document.fileName, mimeType: document.mimeType, bytes: stored.bytes });
    const result = analysed.result;
    const stage = await prisma.sopStage.findUnique({ where: { code: result.sopStageCode }, select: { id: true } });
    const route = [...new Set(result.recommendedRouteUnits || [])];
    if (!route.length) route.push("LAB_BD", "BDG");
    await prisma.$transaction(async (tx) => {
      await tx.documentAnalysis.update({ where: { id: analysisRow.id }, data: { status: "COMPLETED", provider: analysed.provider, model: analysed.model, detectedType: result.documentType, summary: result.summary, localExtractJson: JSON.stringify(analysed.local), resultJson: JSON.stringify(result), confidence: Number(result.confidence) || null, error: analysed.error || null, completedAt: new Date() } });
      await tx.workflowPacket.update({ where: { id: packet.id }, data: { packetType: result.documentType, status: "IN_REVIEW", currentUnit: route[0], sopStageId: stage?.id || null, aiSummary: result.summary, analysisJson: JSON.stringify(result), routeReason: result.routeReason } });
      for (let index = 0; index < route.length; index += 1) await tx.workflowStep.create({ data: { packetId: packet.id, sequence: index + 1, unitRole: route[index], raciType: index === route.length - 1 ? "ACCOUNTABLE" : "RESPONSIBLE", status: index === 0 ? "IN_REVIEW" : "QUEUED", receivedAt: index === 0 ? new Date() : null, instructions: index === 0 ? "Review the AI extraction, source document and missing evidence before forwarding." : "Complete the SOP validation assigned to this unit." } });
      await tx.workflowEvent.create({ data: { packetId: packet.id, action: "AI_ANALYSED_AND_ROUTED", fromUnit: "AI_TRIAGE", toUnit: route[0], comments: result.routeReason, actorType: "SYSTEM", metadataJson: JSON.stringify({ provider: analysed.provider, stage: result.sopStageCode }) } });
    });
    await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "AI_INTAKE_CREATED", entityType: "WORKFLOW_PACKET", entityId: packet.id, details: { provider: analysed.provider, route } });
    const completed = await prisma.workflowPacket.findUnique({ where: { id: packet.id }, include: workflowInclude });
    return NextResponse.json(completed, { status: 201 });
  } catch (uploadError) {
    await prisma.workflowPacket.update({ where: { id: packet.id }, data: { status: "ANALYSIS_FAILED", currentUnit: "BDG", routeReason: uploadError.message } }).catch(() => {});
    return NextResponse.json({ error: uploadError.message || "File analysis failed.", referenceNo: packet.referenceNo }, { status: 400 });
  }
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
