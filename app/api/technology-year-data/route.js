import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText, safeNumber } from "../../../lib/request";
import { logAudit } from "../../../lib/labAuth";

import { parseFinancialYear, formatFinancialYear, currentFinancialYear } from "../../../lib/financialYear";

const RECORD_TYPES = ["ROYALTY_RECEIVED", "COMMERCIAL_NO_ROYALTY"];

function actor(session) {
  return { actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null };
}

async function editableTechnology(id, session) {
  const technology = await prisma.technology.findUnique({ where: { id }, select: { id: true, labId: true, name: true, recordFinancialYear: true } });
  if (!technology || (session.type === "lab" && technology.labId !== session.labId)) return null;
  if (session.type !== "lab" && !isManager(session)) return null;
  return technology;
}

function validate(body) {
  const financialYear = parseFinancialYear(body.financialYear);
  const recordType = cleanText(body.recordType, 40).toUpperCase();
  const currentYear = currentFinancialYear();
  if (!Number.isInteger(financialYear) || financialYear < 1900 || financialYear > currentYear) return { error: `Enter a valid financial year (e.g. 2025-26), up to ${formatFinancialYear(currentYear)}.` };
  if (!RECORD_TYPES.includes(recordType)) return { error: "Choose royalty received or commercial production with no royalty." };
  const royaltyAmountLakhs = safeNumber(body.royaltyAmountLakhs);
  const royaltyRatePercent = safeNumber(body.royaltyRatePercent);
  const commercialProductionValueLakhs = safeNumber(body.commercialProductionValueLakhs);
  if ([royaltyAmountLakhs, royaltyRatePercent, commercialProductionValueLakhs].some((value) => value !== null && value < 0)) return { error: "Financial values cannot be negative." };
  if (royaltyRatePercent !== null && royaltyRatePercent > 100) return { error: "Royalty rate cannot exceed 100%." };
  if (recordType === "ROYALTY_RECEIVED" && royaltyAmountLakhs === null) return { error: "Royalty amount in ₹ lakh is required." };
  if (recordType === "COMMERCIAL_NO_ROYALTY" && commercialProductionValueLakhs === null) return { error: "Estimated commercial production value in ₹ lakh is required." };
  return { data: {
    financialYear, recordType,
    royaltyAmountLakhs: recordType === "ROYALTY_RECEIVED" ? royaltyAmountLakhs : null,
    royaltyRatePercent: recordType === "ROYALTY_RECEIVED" ? royaltyRatePercent : null,
    commercialProductionValueLakhs: recordType === "COMMERCIAL_NO_ROYALTY" ? commercialProductionValueLakhs : null,
    sector: optionalText(body.sector, 300), sourceFileName: optionalText(body.sourceFileName, 300), notes: optionalText(body.notes, 2000),
  } };
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const technologyId = Number(new URL(req.url).searchParams.get("technologyId"));
  if (!technologyId) return NextResponse.json({ error: "technologyId is required." }, { status: 400 });
  const technology = await prisma.technology.findUnique({ where: { id: technologyId }, select: { labId: true } });
  if (!technology || (session.type === "lab" && technology.labId !== session.labId)) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
  const rows = await prisma.technologyFinancialYear.findMany({ where: { technologyId }, orderBy: [{ financialYear: "desc" }, { recordType: "asc" }] });
  return NextResponse.json(rows);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (["HEAD_ADMIN", "HEAD_BDG"].includes(session.role)) return NextResponse.json({ error: "HEAD access is read-only. Please request changes from the laboratory." }, { status: 403 });
  const body = await req.json(); const technologyId = Number(body.technologyId);
  const technology = await editableTechnology(technologyId, session);
  if (!technology) return NextResponse.json({ error: "Technology not found or permission denied." }, { status: 404 });
  const validated = validate(body); if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 });
  if (body.id !== null && body.id !== undefined) {
    const id=Number(body.id);
    if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"Invalid annual record."},{status:400});
    const previous=await prisma.technologyFinancialYear.findUnique({where:{id}});
    if(!previous||previous.technologyId!==technologyId)return NextResponse.json({error:"Annual record not found."},{status:404});
    try {
      const row=await prisma.$transaction(async tx=>{
        const updated=await tx.technologyFinancialYear.update({where:{id},data:validated.data});
        const earliest=await tx.technologyFinancialYear.findFirst({where:{technologyId},orderBy:{financialYear:"asc"}});
        if(technology.recordFinancialYear===previous.financialYear||!technology.recordFinancialYear||earliest.financialYear<technology.recordFinancialYear)await tx.technology.update({where:{id:technologyId},data:{recordFinancialYear:earliest.financialYear}});
        return updated;
      });
      await logAudit({...actor(session),action:"TECHNOLOGY_FINANCIAL_YEAR_UPDATED",entityType:"TECHNOLOGY_FINANCIAL_YEAR",entityId:id,recordLabel:technology.name+" · FY "+formatFinancialYear(previous.financialYear)+" → "+formatFinancialYear(row.financialYear),oldValue:previous,newValue:row});
      return NextResponse.json(row);
    }catch(error){if(error.code==="P2002")return NextResponse.json({error:"This financial year and record type already exist. Edit that row instead; no data was overwritten."},{status:409});throw error;}
  }
  const row = await prisma.technologyFinancialYear.upsert({
    where: { technologyId_financialYear_recordType: { technologyId, financialYear: validated.data.financialYear, recordType: validated.data.recordType } },
    update: validated.data, create: { technologyId, ...validated.data },
  });
  if (!technology.recordFinancialYear || validated.data.financialYear < technology.recordFinancialYear) {
    await prisma.technology.update({ where: { id: technologyId }, data: { recordFinancialYear: validated.data.financialYear } });
  }
  await logAudit({ ...actor(session), action: "TECHNOLOGY_FINANCIAL_YEAR_SAVED", entityType: "TECHNOLOGY_FINANCIAL_YEAR", entityId: row.id, recordLabel: `${technology.name} · FY ${formatFinancialYear(row.financialYear)}`, newValue: row });
  return NextResponse.json(row, { status: 201 });
}

async function DELETEHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (["HEAD_ADMIN", "HEAD_BDG"].includes(session.role)) return NextResponse.json({ error: "HEAD access is read-only. Please request changes from the laboratory." }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  const row = await prisma.technologyFinancialYear.findUnique({ where: { id }, include: { technology: { select: { id: true, labId: true, name: true } } } });
  if (!row || (session.type === "lab" && row.technology.labId !== session.labId) || (session.type !== "lab" && !isManager(session))) return NextResponse.json({ error: "Record not found or permission denied." }, { status: 404 });
  await prisma.technologyFinancialYear.delete({ where: { id } });
  const earliest = await prisma.technologyFinancialYear.findFirst({ where: { technologyId: row.technologyId }, orderBy: { financialYear: "asc" }, select: { financialYear: true } });
  await prisma.technology.update({ where: { id: row.technologyId }, data: { recordFinancialYear: earliest?.financialYear || null } });
  await logAudit({ ...actor(session), action: "TECHNOLOGY_FINANCIAL_YEAR_DELETED", entityType: "TECHNOLOGY_FINANCIAL_YEAR", entityId: id, recordLabel: `${row.technology.name} · FY ${row.financialYear}`, oldValue: row });
  return NextResponse.json({ ok: true });
}


export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
export const DELETE = withApiBoundary(DELETEHandler);
