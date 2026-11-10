import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth, isManager } from "../../../../../lib/session";
import { validateReportData } from "../../../../../lib/reportFields";
import { notifyLab, notifyHeadBdgAndAdmins, logAudit } from "../../../../../lib/labAuth";
async function PATCHHandler(req,{params}){
 const {session,error}=await requireAnyAuth();if(error)return error;
 if(session.type!=="lab"&&!isManager(session))return NextResponse.json({error:"Access denied."},{status:403});
 const b=await req.json(),reportId=Number((await params).id),labId=session.type==="lab"?session.labId:Number(b.labId);
 if(!Number.isInteger(labId))return NextResponse.json({error:"Laboratory required."},{status:400});
 const current=await prisma.reportSubmission.findUnique({where:{reportId_labId:{reportId,labId}},include:{report:true}});
 if(!current)return NextResponse.json({error:"Assigned reporting task not found."},{status:404});
 const link=current.report.reportType==="MONTHLY"?"/monthly-reporting":"/quarterly-reporting";
 if(session.type==="lab"){
 if(["APPROVED","UNDER_REVIEW","SUBMITTED"].includes(current.status))return NextResponse.json({error:"This report is with HEAD. Ask HEAD to return it before editing."},{status:409});
 try{
 const submit=b.submit!==false,data=validateReportData(current.report.reportType,b.data||{},submit);
 const result=await prisma.reportSubmission.update({where:{id:current.id},data:{dataJson:JSON.stringify(data),status:submit?"SUBMITTED":"DRAFT",submittedAt:submit?new Date():current.submittedAt,reviewedAt:null,reviewedById:null}});
 if(submit)await notifyHeadBdgAndAdmins({type:"REPORT_SUBMITTED",title:current.report.title,message:"Laboratory report submitted for review.",link});
 await logAudit({actorType:"LAB",actorLabId:labId,action:submit?"REPORT_SUBMITTED":"REPORT_DRAFT_SAVED",entityType:"REPORT_SUBMISSION",entityId:result.id,newValue:data});
 return NextResponse.json(result);
 }catch(e){return NextResponse.json({error:e.message},{status:400})}
 }
 const status=String(b.status||"").toUpperCase(),remarks=String(b.reviewRemarks||"").trim().slice(0,3000);
 if(!["UNDER_REVIEW","APPROVED","RETURNED"].includes(status))return NextResponse.json({error:"Invalid review status."},{status:400});
 if(status==="RETURNED"&&!remarks)return NextResponse.json({error:"Describe the correction required."},{status:400});
 if(status!=="RETURNED"&&!["SUBMITTED","UNDER_REVIEW"].includes(current.status))return NextResponse.json({error:"Review a submitted report first."},{status:409});
 const result=await prisma.reportSubmission.update({where:{id:current.id},data:{status,reviewRemarks:remarks,reviewedById:session.userId,reviewedAt:new Date()}});
 await notifyLab(labId,{type:"REPORT_REVIEW",title:current.report.title+" — "+status,message:remarks||"HEAD has reviewed your report.",link});
 await logAudit({actorType:"USER",actorUserId:session.userId,action:"REPORT_REVIEWED",entityType:"REPORT_SUBMISSION",entityId:result.id,newValue:{status,remarks}});
 return NextResponse.json(result);
}

export const PATCH = withApiBoundary(PATCHHandler);
