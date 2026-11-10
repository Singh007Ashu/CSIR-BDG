import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUser, requireAnyAuth } from "../../../lib/session";
import { collaborationScope, collaborationIncludes } from "../../../lib/collaborationAccess";
import { notifyHeadBdgAndAdmins, logAudit } from "../../../lib/labAuth";

async function GETHandler() {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const items = await prisma.problemStatement.findMany({
    where: collaborationScope(session),
    include: { ...collaborationIncludes, proposal: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

async function POSTHandler(req) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.role !== "APPLICANT") return NextResponse.json({ error: "Problem statements can only be submitted from an Industry / Applicant account." }, { status: 403 });

  const body = await req.json();
  if (!String(body.description || "").trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  const organizationId = session.organizationId;
  const budget=body.budget===""||body.budget==null?null:Number(body.budget);
  if(budget!==null&&(!Number.isFinite(budget)||budget<0))return NextResponse.json({error:"Budget must be a non-negative number."},{status:400});
  if (!organizationId) {
    return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
  }
  const item = await prisma.problemStatement.create({
    data: {
      organizationId,
      description: String(body.description).trim().slice(0,10000),
      currentStatus: body.currentStatus || null,
      painPoints: body.painPoints || null,
      budget,
      timeline: body.timeline || null,
      expectedOutcome: body.expectedOutcome || null,
      domain: body.domain || null,
    },
  });
  await notifyHeadBdgAndAdmins({type:"NEW_INDUSTRY_REQUEST",title:"New sponsored research request",message:item.description.slice(0,300),link:"/module2/"+item.id});
  await logAudit({actorType:"USER",actorUserId:session.userId,action:"INDUSTRY_REQUEST_CREATED",entityType:"PROBLEM_STATEMENT",entityId:item.id});
  return NextResponse.json(item, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
