import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";

async function GETHandler() {
  const { error } = await requireRole(["HEAD_BDG", "ADMIN"]); if (error) return error;
  const [changeRequests, techRequests, problemStatements, partnerships] = await Promise.all([
    prisma.changeRequest.findMany({ include: { lab: { select: publicLabSelect }, technology: true, decidedBy: { select: { name: true } }, history: { include: { actedByUser: { select: { name: true } } }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.technologyRequest.findMany({ include: { technology: { include: { lab: { select: publicLabSelect } } }, organization: true, decidedBy: {select:{id:true,name:true,role:true}} }, orderBy: { createdAt: "desc" } }),
    prisma.problemStatement.findMany({ include: { organization: true, lab: { select: publicLabSelect }, decidedBy: {select:{id:true,name:true,role:true}} }, orderBy: { createdAt: "desc" } }),
    prisma.partnership.findMany({ include: { organization: true, lab: { select: publicLabSelect }, decidedBy: {select:{id:true,name:true,role:true}} }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ changeRequests, techRequests, problemStatements, partnerships });
}

export const GET = withApiBoundary(GETHandler);
