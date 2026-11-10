import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";
import { cleanText } from "../../../lib/request";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const p = new URL(req.url).searchParams; const q = cleanText(p.get("q"), 200); const labId = session.type === "lab" ? session.labId : (p.get("labId") ? Number(p.get("labId")) : undefined);
  const [technologies, projects, mous] = await Promise.all([
    prisma.technology.findMany({ where: { ...(labId ? { labId } : {}), ...(p.get("category") ? { datasetCategory: { slug: p.get("category") } } : {}), ...(p.get("area") ? { sector: { contains: p.get("area") } } : {}), ...(p.get("patent") ? { ipStatus: p.get("patent") } : {}), ...(q ? { OR: [{ name: { contains: q } }, { piName: { contains: q } }, { lab: { name: { contains: q } } }] } : {}) }, include: { lab: { select: publicLabSelect }, datasetCategory: true }, take: 100 }),
    prisma.coDevelopmentProject.findMany({ where: { ...(labId ? { labId } : {}), ...(p.get("area") ? { technologyArea: { contains: p.get("area") } } : {}), ...(p.get("commercialization") ? { commercialization: { stage: p.get("commercialization") } } : {}), ...(q ? { OR: [{ title: { contains: q } }, { projectId: { contains: q } }, { piName: { contains: q } }, { company: { name: { contains: q } } }] } : {}) }, include: { lab: { select: publicLabSelect }, company: true, commercialization: true }, take: 100 }),
    prisma.mou.findMany({ where: { ...(labId ? { labId } : {}), ...(p.get("mouStatus") ? { status: p.get("mouStatus") } : {}), ...(q ? { OR: [{ title: { contains: q } }, { mouNumber: { contains: q } }, { company: { name: { contains: q } } }, { project: { title: { contains: q } } }] } : {}) }, include: { lab: { select: publicLabSelect }, company: true, project: true }, take: 100 }),
  ]);
  return NextResponse.json({ technologies, projects, mous });
}

export const GET = withApiBoundary(GETHandler);
