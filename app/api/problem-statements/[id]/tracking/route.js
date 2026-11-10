import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../../lib/session";
import { collaborationScope } from "../../../../../lib/collaborationAccess";
import { notifyHeadBdgAndAdmins, notifyLab } from "../../../../../lib/labAuth";
const EXECUTION=["PROJECT_INITIATED","IN_EXECUTION","PROTOTYPE_DEVELOPED","VALIDATED","DELIVERED","COMPLETED"];
async function GETHandler(req,{params}){
 const {session,error}=await requireAnyAuth();if(error)return error;const id=Number((await params).id);
 const item=await prisma.problemStatement.findFirst({where:{id,...collaborationScope(session)},select:{id:true,status:true,labId:true,createdAt:true}});
 if(!item)return NextResponse.json({error:"Research request not found."},{status:404});
 const history=await prisma.auditLog.findMany({where:{entityType:"PROBLEM_STATEMENT",entityId:id,action:"RESEARCH_PROGRESS"},select:{id:true,createdAt:true,newValue:true,actorLab:{select:{name:true}},actorUser:{select:{name:true}}},orderBy:{createdAt:"desc"}});
 return NextResponse.json({item,canUpdate:(session.type==="lab"&&session.role!=="PI")||isManager(session),history:history.map(h=>({...h,data:JSON.parse(h.newValue||"{}")}))});
}
async function POSTHandler(req,{params}){
 const {session,error}=await requireAnyAuth();if(error)return error;const id=Number((await params).id);
 if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Only the assigned laboratory and HEAD can update progress."},{status:403});
 const item=await prisma.problemStatement.findFirst({where:{id,...collaborationScope(session)}});
 if(!item)return NextResponse.json({error:"Research request not found."},{status:404});
 const body=await req.json(),status=String(body.status||item.status),notes=String(body.notes||"").trim().slice(0,10000);
 const progress=body.progress===""||body.progress==null?null:Number(body.progress);
 if(!notes||(progress!==null&&(!Number.isFinite(progress)||progress<0||progress>100)))return NextResponse.json({error:"Enter a progress note and a percentage from 0 to 100."},{status:400});
 if(status!==item.status&&!EXECUTION.includes(status))return NextResponse.json({error:"Select a valid execution status."},{status:400});
 const dueDate=body.dueDate?new Date(body.dueDate):null;
 if(dueDate&&Number.isNaN(dueDate.getTime()))return NextResponse.json({error:"Invalid target date."},{status:400});
 const data={status,progress:status==="COMPLETED"?100:progress,notes,nextAction:String(body.nextAction||"").slice(0,3000),milestone:String(body.milestone||"").slice(0,1000),dueDate:dueDate?.toISOString()||null};
 await prisma.$transaction(async tx=>{await tx.problemStatement.update({where:{id},data:{status}});await tx.auditLog.create({data:{actorType:session.type.toUpperCase(),actorLabId:session.type==="lab"?session.labId:null,actorUserId:session.type==="user"?session.userId:null,action:"RESEARCH_PROGRESS",entityType:"PROBLEM_STATEMENT",entityId:id,newValue:JSON.stringify(data)}})});
 if(session.type==="lab")await notifyHeadBdgAndAdmins({type:"RESEARCH_PROGRESS",title:"Sponsored research progress updated",message:notes.slice(0,300),link:"/module2/"+id});
 else if(item.labId)await notifyLab(item.labId,{type:"RESEARCH_PROGRESS",title:"HEAD updated research progress",message:notes.slice(0,300),link:"/module2/"+id});
 return NextResponse.json({ok:true});
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
