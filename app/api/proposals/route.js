import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";
import { notifyHeadBdgAndAdmins, logAudit } from "../../../lib/labAuth";

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if(session.type!=="lab"||session.role==="PI")return NextResponse.json({error:"Laboratory BD access required."},{status:403});
  const body=await req.json(), id=Number(body.problemStatementId);
  const item=await prisma.problemStatement.findFirst({where:{id,labId:session.labId}});
  if(!item)return NextResponse.json({error:"Assigned research request not found."},{status:404});
  const scopeOfWork=String(body.scopeOfWork||"").trim().slice(0,10000);
  const cost=body.estimatedCost === "" || body.estimatedCost == null ? null : Number(body.estimatedCost);
  if(!scopeOfWork || (cost!==null && (!Number.isFinite(cost)||cost<0)))return NextResponse.json({error:"Enter scope of work and a valid non-negative estimated cost."},{status:400});
  const data={scopeOfWork,milestones:String(body.milestones||"").slice(0,10000),deliverables:String(body.deliverables||"").slice(0,10000),estimatedCost:cost,timeline:String(body.timeline||"").slice(0,500)};
  const proposal=await prisma.$transaction(async tx=>{
    const result=await tx.proposal.upsert({where:{problemStatementId:id},create:{problemStatementId:id,...data},update:data});
    if(["SUBMITTED","DOMAIN_CLASSIFIED","BDG_SCREENED","COMMITTEE_REVIEWED","LAB_DISCUSSION","PROPOSAL_SENT"].includes(item.status))await tx.problemStatement.update({where:{id},data:{status:"PROPOSAL_SENT"}});
    return result;
  });
  await logAudit({actorType:"LAB",actorLabId:session.labId,action:"LAB_PROPOSAL_SUBMITTED",entityType:"PROBLEM_STATEMENT",entityId:id});
  await notifyHeadBdgAndAdmins({type:"LAB_UPDATE",title:"Laboratory proposal submitted",message:"The assigned laboratory updated the technical proposal.",link:"/module2/"+id});
  return NextResponse.json(proposal);
}

export const POST = withApiBoundary(POSTHandler);
