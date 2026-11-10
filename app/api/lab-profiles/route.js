import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
async function GETHandler(){
 const {session,error}=await requireAnyAuth();if(error)return error;
 if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Access denied."},{status:403});
 const labs=await prisma.lab.findMany({where:session.type==="lab"?{id:session.labId}:{},select:{id:true,name:true,code:true,expertise:true},orderBy:{name:"asc"}});
 const files=await prisma.document.findMany({where:{entityType:"LAB_PROFILE",entityId:{in:labs.map(l=>l.id)},deletedAt:null,isCurrent:true},select:{id:true,entityId:true,fileName:true,createdAt:true}});
 return NextResponse.json(labs.map(l=>({...l,files:files.filter(f=>f.entityId===l.id)})));
}

export const GET = withApiBoundary(GETHandler);
