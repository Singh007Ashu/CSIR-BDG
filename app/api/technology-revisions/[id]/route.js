import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { logAudit, notifyLab } from "../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const id = Number((await params).id);
  const current = await prisma.technologyRevisionRequest.findUnique({ where: { id } });
  if (!current || (session.type === "lab" && current.labId !== session.labId)) return NextResponse.json({ error: "Revision request not found." }, { status: 404 });
  if (session.type === "user" && !isManager(session) && current.labId !== session.assignedLabId) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  const body = await req.json();
  if(body.instructions !== undefined || body.status === "CANCELLED") {
    if(!isManager(session)||(current.requestedById!==session.userId&&!["ADMIN","SUPER_ADMIN"].includes(session.role)))return NextResponse.json({error:"Only the request author or an administrator can edit or cancel it."},{status:403});
    if(["CLOSED","CANCELLED"].includes(current.status))return NextResponse.json({error:"This request is already closed or cancelled."},{status:409});
    const instructions=body.instructions===undefined?current.instructions:cleanText(body.instructions,5000);
    if(!instructions)return NextResponse.json({error:"Please enter the correction required."},{status:400});
    const cancelled=body.status==="CANCELLED";
    const updated=await prisma.technologyRevisionRequest.update({where:{id},data:cancelled?{status:"CANCELLED",closedAt:new Date()}:{instructions}});
    await logAudit({actorType:"USER",actorUserId:session.userId,action:cancelled?"REVISION_CANCELLED":"REVISION_EDITED",entityType:"TECHNOLOGY",entityId:current.technologyId,oldValue:current,newValue:updated,details:{revisionRequestId:id}});
    await notifyLab(current.labId,{type:"TECHNOLOGY_REVISION",title:cancelled?"Change request cancelled":"Change request updated",message:cancelled?"HEAD has cancelled change request #"+id:instructions,link:"/master-technologies?technologyId="+current.technologyId});
    return NextResponse.json(updated);
  }
  if(["CLOSED","CANCELLED"].includes(current.status))return NextResponse.json({error:"This request is closed or cancelled."},{status:409});
  const status = cleanText(body.status, 30).toUpperCase();
  const allowed = isManager(session) ? ["OPEN", "CLOSED", "CANCELLED", "RETURNED"] : ["IN_PROGRESS", "SUBMITTED"];
  if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid status for your role." }, { status: 400 });
  const updated = await prisma.technologyRevisionRequest.update({ where: { id }, data: { status, labResponse: cleanText(body.labResponse, 5000) || current.labResponse, submittedAt: status === "SUBMITTED" ? new Date() : current.submittedAt, closedAt: ["CLOSED", "CANCELLED"].includes(status) ? new Date() : null } });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: `REVISION_${status}`, entityType: "TECHNOLOGY", entityId: current.technologyId, details: { revisionRequestId: id } });
  return NextResponse.json(updated);
}

export const PATCH = withApiBoundary(PATCHHandler);
