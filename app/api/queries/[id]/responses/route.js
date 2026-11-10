import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../../lib/session";
import { cleanText, optionalText } from "../../../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins, notifyLab } from "../../../../../lib/labAuth";

async function POSTHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error; const queryId = Number((await params).id); const query = await prisma.query.findUnique({ where: { id: queryId } }); if (!query) return NextResponse.json({ error: "Query not found." }, { status: 404 }); if (session.type === "lab" && query.targetLabId !== session.labId) return NextResponse.json({ error: "Query not found." }, { status: 404 }); if (session.type === "user" && !isManager(session)) return NextResponse.json({ error: "Permission denied." }, { status: 403 }); const body = await req.json(); const responseText = cleanText(body.response, 10000); if (!responseText) return NextResponse.json({ error: "Response is required." }, { status: 400 }); const response = await prisma.queryResponse.create({ data: { queryId, response: responseText, respondedByLabId: session.type === "lab" ? session.labId : null, respondedByUserId: session.type === "user" ? session.userId : null, evidenceRef: optionalText(body.evidenceRef, 2000) } }); await prisma.query.update({ where: { id: queryId }, data: { status: session.type === "lab" ? "RESPONDED" : query.status } }); if (session.type === "lab") await notifyHeadBdgAndAdmins({ type: "QUERY_RESPONSE", title: `Response: ${query.title}`, message: responseText.slice(0, 300), link: "/queries" }); else if (query.targetLabId) await notifyLab(query.targetLabId, { type: "QUERY_RESPONSE", title: query.title, message: responseText.slice(0, 300), link: "/queries" }); await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: "QUERY_RESPONDED", entityType: "QUERY_RESPONSE", entityId: response.id, newValue: { response: responseText, evidenceRef: body.evidenceRef }, recordLabel: query.title }); return NextResponse.json(response, { status: 201 });
}

export const POST = withApiBoundary(POSTHandler);
