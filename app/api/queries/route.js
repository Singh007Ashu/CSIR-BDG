import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeDate } from "../../../lib/request";
import { logAudit, notifyLab } from "../../../lib/labAuth";

async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error; if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Permission denied."},{status:403}); const where = session.type === "lab" ? { OR: [{ queryType: "GENERAL_ANNOUNCEMENT" }, { targetLabId: session.labId }] } : {};
  const queries = await prisma.query.findMany({ where, include: { targetLab: {select:{id:true,name:true,code:true}}, project: true, technology: { include: { lab: { select: { id: true } } } }, report: true, sopStage: true, createdBy: { select: { name: true } }, responses: { where: session.type === "lab" ? {respondedByLabId:session.labId} : {}, include: { respondedByLab: {select:{id:true,name:true,code:true}}, respondedByUser: { select: { name: true } } }, orderBy: { createdAt: "asc" } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(queries.map((query) => {
    const { lab: technologyLab, ...technology } = query.technology || {};
    return { ...query, technology: technologyLab && query.targetLabId !== technologyLab.id ? null : (query.technology ? technology : null) };
  }));
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error; if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 }); const body = await req.json(); const queryType = cleanText(body.queryType || "LAB_SPECIFIC", 40).toUpperCase(); const targetLabId = body.targetLabId ? Number(body.targetLabId) : null; if (queryType === "LAB_SPECIFIC" && !targetLabId) return NextResponse.json({ error: "Target laboratory is required for a lab-specific query." }, { status: 400 });
  const technologyId = body.technologyId ? Number(body.technologyId) : null;
  if (technologyId) {
    const technology = await prisma.technology.findUnique({ where: { id: technologyId }, select: { id: true, labId: true } });
    if (!technology) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
    if (!targetLabId || technology.labId !== targetLabId) return NextResponse.json({ error: "The selected technology must belong to the target laboratory." }, { status: 400 });
  }
  const query = await prisma.query.create({ data: { queryType, title: cleanText(body.title, 300), description: cleanText(body.description, 10000), priority: cleanText(body.priority || "MEDIUM", 30).toUpperCase(), targetLabId, projectId: body.projectId ? Number(body.projectId) : null, technologyId, reportId: body.reportId ? Number(body.reportId) : null, sopStageId: body.sopStageId ? Number(body.sopStageId) : null, createdById: session.userId, dueAt: safeDate(body.dueAt) } }); if (targetLabId) await notifyLab(targetLabId, { type: "NEW_QUERY", title: query.title, message: query.description.slice(0, 300), link: "/queries" }); await logAudit({ actorType: "USER", actorUserId: session.userId, action: queryType === "GENERAL_ANNOUNCEMENT" ? "ANNOUNCEMENT_CREATED" : "QUERY_CREATED", entityType: "QUERY", entityId: query.id, newValue: query, recordLabel: query.title }); return NextResponse.json(query, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
