import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";

async function GETHandler(req) {
  const { error } = await requireAnyAuth();
  if (error) return error;
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 200);
  const items = await prisma.technology.findMany({
    where: { recordScope: "MASTER", OR: [{ sopLegacyExempt: true }, { approvalStatus: "APPROVED" }],
      ...(q ? { AND: [{ OR: [{ name: { contains: q } }, { applications: { contains: q } }, { sector: { contains: q } }] }] } : {}) },
    select: { id: true, name: true, briefDescription: true, applications: true, advantages: true, sector: true, subSector: true, theme: true, trl: true, lab: { select: { name: true, code: true } } },
    orderBy: { name: "asc" }, take: 2500,
  });
  return NextResponse.json(items);
}

export const GET = withApiBoundary(GETHandler);
