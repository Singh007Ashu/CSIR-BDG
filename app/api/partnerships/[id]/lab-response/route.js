import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth } from "../../../../../lib/session";
import { notifyHeadBdgAndAdmins, logAudit } from "../../../../../lib/labAuth";

async function POSTHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if(session.type!=="lab"||session.role==="PI")return NextResponse.json({error:"Laboratory BD access required."},{status:403});
  const id = Number((await params).id);
  const item = await prisma.partnership.findFirst({ where: { id, labId: session.labId } });
  if (!item) return NextResponse.json({error:"Assigned partnership not found."},{status:404});
  const body=await req.json(); const matchedApproach=String(body.matchedApproach||"").trim().slice(0,10000);
  if(!matchedApproach)return NextResponse.json({error:"Enter your laboratory response."},{status:400});
  const updated=await prisma.partnership.update({where:{id},data:{matchedApproach}});
  await logAudit({actorType:"LAB",actorLabId:session.labId,action:"PARTNERSHIP_LAB_RESPONSE",entityType:"PARTNERSHIP",entityId:id});
  await notifyHeadBdgAndAdmins({type:"LAB_UPDATE",title:"Partnership laboratory update",message:"The assigned laboratory submitted its approach and progress.",link:"/module3/"+id});
  return NextResponse.json(updated);
}

export const POST = withApiBoundary(POSTHandler);
