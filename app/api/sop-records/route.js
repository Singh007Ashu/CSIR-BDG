import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";
import { isGoverningRole, isManagerRole } from "../../../lib/roles";
import { cleanText, requestMeta } from "../../../lib/request";
import { calculateSopData, getSopDefinition, SOP_INSTRUCTOR_DEFINITIONS, validateSopData } from "../../../lib/sopInstructor";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";

function parseJson(value, fallback = {}) { try { return JSON.parse(value || "") || fallback; } catch { return fallback; } }
function actor(session) { return { actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null }; }
function assignedLabId(session) { return session.type === "lab" ? session.labId : ["LAB_BD", "PI"].includes(session.role) ? session.assignedLabId : null; }
function canReadAll(session) { return session.type === "user" && (isManagerRole(session.role) || ["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM"].includes(session.role)); }
function canDraft(session, stageCode) {
  if (session.type === "lab" || session.role === "LAB_BD") return true;
  if (session.role === "PI") return ["SOP-01", "SOP-05", "SOP-09"].includes(stageCode);
  return (isManagerRole(session.role) || session.role === "BDG") && ["SOP-06", "SOP-10"].includes(stageCode);
}
function canSubmit(session, stageCode) {
  if (session.type === "lab" || session.role === "LAB_BD") return !["SOP-06", "SOP-10"].includes(stageCode);
  return (isManagerRole(session.role) || session.role === "BDG") && ["SOP-06", "SOP-10"].includes(stageCode);
}

function cleanStageData(definition, raw) {
  const cleaned = {};
  for (const item of definition.fields) {
    if (item.calculated) continue;
    const value = raw?.[item.key];
    if (item.type === "number") cleaned[item.key] = value === "" || value === null || value === undefined ? "" : Number(value);
    else cleaned[item.key] = cleanText(value, item.type === "textarea" ? 8000 : 1000);
  }
  return calculateSopData(definition.code, cleaned);
}

async function technologyForLab(technologyId, labId) {
  if (!technologyId) return null;
  return prisma.technology.findFirst({ where: { id: Number(technologyId), labId: Number(labId) }, select: { id: true, name: true, piName: true, sector: true, trl: true, crl: true, ipStatus: true, technologyType: true, commercialisationStage: true, lab: { select: { id: true, code: true, name: true } } } });
}

async function buildPrefill(stageCode, labId, technologyId) {
  if (!labId) return {};
  const [lab, technology, records] = await Promise.all([
    prisma.lab.findUnique({ where: { id: Number(labId) }, select: { name: true } }),
    technologyForLab(technologyId, labId),
    prisma.sopDataRecord.findMany({ where: { labId: Number(labId), ...(technologyId ? { technologyId: Number(technologyId) } : {}) }, orderBy: { updatedAt: "desc" }, take: 80 }),
  ]);
  const latest = {};
  for (const record of records) if (!latest[record.recordType]) latest[record.recordType] = parseJson(record.dataJson);
  const data = { lab: lab?.name || "", technology: technology?.name || "", piTechnicalOwner: technology?.piName || "", sectorTheme: technology?.sector || "", trl: technology?.trl || "", crl: technology?.crl || "", ipStatus: technology?.ipStatus || "", technologyType: technology?.technologyType || "", commercialisationStage: technology?.commercialisationStage || "" };
  if (stageCode === "SOP-03" && latest["SOP-02"]) Object.assign(data, { partnerClient: latest["SOP-02"].partnerClient, dueDate: latest["SOP-02"].dueDate, amountDue: latest["SOP-02"].amountDueTillDate });
  if (stageCode === "SOP-04" && latest["SOP-03"]) data.directRevenue = latest["SOP-03"].amountReceived;
  if (stageCode === "SOP-05" && latest["SOP-06"]) Object.assign(data, { impactScore: latest["SOP-06"].totalScore, impactCategory: latest["SOP-06"].category });
  if (stageCode === "SOP-07") {
    Object.assign(data, { ecfCommitted: latest["SOP-02"]?.totalCommittedAmount || 0, amountDue: latest["SOP-03"]?.amountDue ?? latest["SOP-02"]?.amountDueTillDate ?? 0, actualRealised: latest["SOP-03"]?.amountReceived || 0, atRiskAmount: Math.max(0, latest["SOP-08"]?.variance || 0) });
  }
  if (stageCode === "SOP-08") Object.assign(data, { committedAmountDue: latest["SOP-03"]?.amountDue ?? latest["SOP-02"]?.amountDueTillDate ?? 0, actualRealised: latest["SOP-03"]?.amountReceived || 0 });
  return calculateSopData(stageCode, data);
}

function present(record) {
  return { ...record, data: parseJson(record.dataJson), histories: (record.histories || []).map((item) => ({ ...item, previous: parseJson(item.previousData, null), revised: parseJson(item.revisedData) })) };
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const params = new URL(req.url).searchParams;
  const requestedLabId = Number(params.get("labId")) || null;
  const fixedLabId = assignedLabId(session);
  if (fixedLabId && requestedLabId && requestedLabId !== Number(fixedLabId)) return NextResponse.json({ error: "You may only access your assigned laboratory." }, { status: 403 });
  const selectedLabId = fixedLabId || requestedLabId;
  if (requestedLabId && !fixedLabId && !canReadAll(session)) return NextResponse.json({ error: "Laboratory access denied." }, { status: 403 });
  const stageCode = cleanText(params.get("stageCode"), 20).toUpperCase();
  const technologyId = Number(params.get("technologyId")) || null;
  const where = { ...(selectedLabId ? { labId: Number(selectedLabId) } : canReadAll(session) ? {} : { labId: -1 }), ...(stageCode ? { recordType: stageCode } : {}), ...(technologyId ? { technologyId } : {}) };
  const [labs, technologies, records, prefill] = await Promise.all([
    fixedLabId ? prisma.lab.findMany({ where: { id: Number(fixedLabId) }, select: { id: true, code: true, name: true } }) : canReadAll(session) ? prisma.lab.findMany({ select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }) : [],
    selectedLabId ? prisma.technology.findMany({ where: { labId: Number(selectedLabId) }, select: { id: true, name: true, piName: true, trl: true, crl: true }, orderBy: { name: "asc" }, take: 2500 }) : [],
    prisma.sopDataRecord.findMany({ where, include: { lab: { select: { id: true, code: true, name: true } }, technology: { select: { id: true, name: true } }, histories: { orderBy: { createdAt: "desc" }, take: 50 } }, orderBy: { updatedAt: "desc" }, take: 300 }),
    stageCode && selectedLabId ? buildPrefill(stageCode, selectedLabId, technologyId) : {},
  ]);
  return NextResponse.json({ definitions: SOP_INSTRUCTOR_DEFINITIONS, labs, selectedLabId, technologies, records: records.map(present), prefill, role: session.type === "lab" ? "LAB_BD" : session.role, permissions: { canDraft: canDraft(session, stageCode), canSubmit: canSubmit(session, stageCode), readAll: canReadAll(session) } });
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const body = await req.json();
  const definition = getSopDefinition(cleanText(body.stageCode, 20).toUpperCase());
  if (!definition) return NextResponse.json({ error: "Select a valid SOP stage." }, { status: 400 });
  const action = cleanText(body.action, 20).toUpperCase() === "SUBMIT" ? "SUBMIT" : "SAVE_DRAFT";
  if (!canDraft(session, definition.code) || (action === "SUBMIT" && !canSubmit(session, definition.code))) return NextResponse.json({ error: action === "SUBMIT" ? "This role may support a draft but cannot submit this SOP stage." : "Your role cannot edit this SOP stage." }, { status: 403 });
  const fixedLabId = assignedLabId(session);
  const labId = Number(fixedLabId || body.labId);
  if (!labId) return NextResponse.json({ error: "Laboratory is required." }, { status: 400 });
  if (fixedLabId && labId !== Number(fixedLabId)) return NextResponse.json({ error: "You may only edit your assigned laboratory." }, { status: 403 });
  const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { id: true, code: true, name: true } });
  if (!lab) return NextResponse.json({ error: "Laboratory not found." }, { status: 404 });
  const technologyId = Number(body.technologyId) || null;
  const technology = await technologyForLab(technologyId, labId);
  if (technologyId && !technology) return NextResponse.json({ error: "Selected technology does not belong to this laboratory." }, { status: 400 });
  let data = cleanStageData(definition, body.data || {});
  if (definition.fields.some((item) => item.key === "lab")) data.lab = lab.name;
  if (definition.fields.some((item) => item.key === "technology")) data.technology = technology?.name || "";
  data = calculateSopData(definition.code, data);
  const errors = action === "SUBMIT" ? validateSopData(definition.code, data) : [];
  if (errors.length) return NextResponse.json({ error: "Resolve the validation issues before submission.", errors, calculated: data }, { status: 400 });
  const reason = cleanText(body.reason, 1000);
  const existing = body.id ? await prisma.sopDataRecord.findUnique({ where: { id: Number(body.id) } }) : null;
  if (body.id && (!existing || existing.labId !== labId || existing.recordType !== definition.code)) return NextResponse.json({ error: "SOP record not found or outside your scope." }, { status: 404 });
  if (existing?.status === "SUBMITTED" && !reason) return NextResponse.json({ error: "Give a reason when revising a submitted record." }, { status: 400 });
  const status = action === "SUBMIT" ? "SUBMITTED" : "DRAFT";
  const payload = JSON.stringify(data);
  let saved;
  await prisma.$transaction(async (tx) => {
    if (existing) {
      saved = await tx.sopDataRecord.update({ where: { id: existing.id }, data: { technologyId, dataJson: payload, status, sourceRecordId: Number(body.sourceRecordId) || existing.sourceRecordId || null, revision: { increment: 1 }, submittedAt: status === "SUBMITTED" ? new Date() : existing.submittedAt } });
      await tx.sopRecordHistory.create({ data: { sopDataRecordId: saved.id, action: status === "SUBMITTED" ? "REVISED_AND_SUBMITTED" : "DRAFT_UPDATED", previousData: existing.dataJson, revisedData: payload, reason: reason || null, actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null } });
    } else {
      saved = await tx.sopDataRecord.create({ data: { recordType: definition.code, labId, technologyId, periodLabel: cleanText(data.periodLabel, 50) || null, dataJson: payload, status, createdByType: session.type.toUpperCase(), createdById: session.type === "user" ? session.userId : session.labId, sourceRecordId: Number(body.sourceRecordId) || null, submittedAt: status === "SUBMITTED" ? new Date() : null } });
      await tx.sopRecordHistory.create({ data: { sopDataRecordId: saved.id, action: status === "SUBMITTED" ? "CREATED_AND_SUBMITTED" : "DRAFT_CREATED", revisedData: payload, reason: reason || null, actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null } });
    }
  });
  await logAudit({ ...actor(session), action: `SOP_RECORD_${status}`, entityType: "SOP_DATA_RECORD", entityId: saved.id, recordLabel: `${definition.code} - ${technology?.name || lab.name}`, oldValue: existing ? parseJson(existing.dataJson) : null, newValue: data, details: { revision: saved.revision, reason: reason || null }, ...requestMeta(req) });
  if (status === "SUBMITTED" && !["SOP-06", "SOP-10"].includes(definition.code)) await notifyHeadBdgAndAdmins({ type: "SOP_SUBMISSION", title: `${definition.code} submitted by ${lab.code}`, message: technology ? technology.name : definition.name, link: `/sop-roadmap?stage=${definition.code}&lab=${lab.id}` });
  const complete = await prisma.sopDataRecord.findUnique({ where: { id: saved.id }, include: { lab: { select: { id: true, code: true, name: true } }, technology: { select: { id: true, name: true } }, histories: { orderBy: { createdAt: "desc" } } } });
  return NextResponse.json({ record: present(complete), calculated: data }, { status: existing ? 200 : 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
