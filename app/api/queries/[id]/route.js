import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { logAudit, notifyLab } from "../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error; if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Permission denied."},{status:403}); const id = Number((await params).id); const current = await prisma.query.findUnique({ where: { id } }); if (!current) return NextResponse.json({ error: "Query not found." }, { status: 404 }); if (session.type === "lab" && current.targetLabId !== session.labId) return NextResponse.json({ error: "Query not found." }, { status: 404 }); const body = await req.json(); const status = cleanText(body.status, 30).toUpperCase(); const allowed = isManager(session) ? ["OPEN", "IN_PROGRESS", "RESPONDED", "RESOLVED", "CLOSED"] : ["IN_PROGRESS", "RESPONDED"]; if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid query status for this role." }, { status: 403 }); const query = await prisma.query.update({ where: { id }, data: { status, resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null } }); if (isManager(session) && current.targetLabId) await notifyLab(current.targetLabId, { type: "QUERY_STATUS", title: query.title, message: `Query status changed to ${status.replaceAll("_", " ")}.`, link: "/queries" }); await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: `QUERY_${status}`, entityType: "QUERY", entityId: id, oldValue: { status: current.status }, newValue: { status }, recordLabel: current.title }); return NextResponse.json(query);
}

export const PATCH = withApiBoundary(PATCHHandler);
