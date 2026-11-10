import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUser, requireAnyAuth } from "../../../lib/session";
import { collaborationScope, collaborationIncludes } from "../../../lib/collaborationAccess";
import { notifyHeadBdgAndAdmins, logAudit } from "../../../lib/labAuth";

async function GETHandler() {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const items = await prisma.partnership.findMany({
    where: collaborationScope(session),
    include: { ...collaborationIncludes },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

async function POSTHandler(req) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.role !== "APPLICANT") return NextResponse.json({ error: "Industry challenges can only be submitted from an Industry / Applicant account." }, { status: 403 });

  const body = await req.json();
  if(!String(body.challengeStatement||"").trim())return NextResponse.json({error:"Challenge statement is required."},{status:400});
  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
  }
  const item = await prisma.partnership.create({
    data: {
      organizationId,
      challengeStatement: body.challengeStatement || null,
      expectedOutcome: body.expectedOutcome || null,
      commercialPotential: body.commercialPotential || null,
      technologyGap: body.technologyGap || null,
    },
  });
  await notifyHeadBdgAndAdmins({type:"NEW_INDUSTRY_REQUEST",title:"New industry partnership request",message:String(item.challengeStatement).slice(0,300),link:"/module3/"+item.id});
  await logAudit({actorType:"USER",actorUserId:session.userId,action:"INDUSTRY_REQUEST_CREATED",entityType:"PARTNERSHIP",entityId:item.id});
  return NextResponse.json(item, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
