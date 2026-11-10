import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { notifyLab, logAudit } from "../../../lib/labAuth";
async function GETHandler(req){
 const {session,error}=await requireAnyAuth();if(error)return error;
 if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Permission denied."},{status:403});
 const type=new URL(req.url).searchParams.get("type");
 const rows=await prisma.report.findMany({where:{...(type?{reportType:type}:{}),...(session.type==="lab"?{submissions:{some:{labId:session.labId}}}:{})},include:{queries:{where:session.type==="lab"?{OR:[{targetLabId:session.labId},{targetLabId:null}]}:{},select:{id:true,title:true,description:true,targetLabId:true,status:true}},submissions:{where:session.type==="lab"?{labId:session.labId}:{},include:{lab:{select:{id:true,name:true,code:true}},reviewedBy:{select:{name:true}}},orderBy:{lab:{name:"asc"}}}},orderBy:{periodStart:"desc"}});
 return NextResponse.json(rows);
}
async function POSTHandler(req){
 const {session,error}=await requireAnyAuth();if(error)return error;
 if(!isManager(session))return NextResponse.json({error:"HEAD permission required."},{status:403});
 const b=await req.json(),type=String(b.reportType),dates=[b.periodStart,b.periodEnd,b.dueDate].map(v=>v?new Date(v):null);
 if(!["MONTHLY","QUARTERLY"].includes(type)||!String(b.title||"").trim()||!String(b.periodLabel||"").trim()||dates.some(d=>!d||isNaN(d.getTime()))||dates[1]<dates[0]||dates[2]<dates[1])return NextResponse.json({error:"Enter title, period and valid dates. Due date must be on or after the period end."},{status:400});
 const ids=Array.isArray(b.labIds)?[...new Set(b.labIds.map(Number))]:[];
 const labs=await prisma.lab.findMany({where:ids.length?{id:{in:ids}}:{accountStatus:"ACTIVE"},select:{id:true}});
 if(!labs.length||(ids.length&&labs.length!==ids.length))return NextResponse.json({error:"Select valid laboratories."},{status:400});
 const report=await prisma.$transaction(async tx=>{
 const r=await tx.report.create({data:{reportType:type,title:String(b.title).trim().slice(0,300),periodLabel:String(b.periodLabel).slice(0,50),periodStart:dates[0],periodEnd:dates[1],dueDate:dates[2],responsibleUnit:"Laboratories",accountableUnit:"BDG"}});
 await tx.reportSubmission.createMany({data:labs.map(l=>({reportId:r.id,labId:l.id}))});
 if(String(b.instructions||"").trim())await tx.query.createMany({data:labs.map(l=>({reportId:r.id,queryType:"LAB_SPECIFIC",targetLabId:l.id,title:r.title+" — reporting instructions",description:String(b.instructions).trim().slice(0,10000),priority:"MEDIUM",createdById:session.userId,dueAt:dates[2]}))});
 return r;
 });
 for(const l of labs)await notifyLab(l.id,{type:"REPORT_ASSIGNED",title:report.title,message:"Reporting request from HEAD. Due "+b.dueDate,link:type==="MONTHLY"?"/monthly-reporting":"/quarterly-reporting"});
 await logAudit({actorType:"USER",actorUserId:session.userId,action:"REPORT_CREATED",entityType:"REPORT",entityId:report.id});
 return NextResponse.json(report,{status:201});
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
