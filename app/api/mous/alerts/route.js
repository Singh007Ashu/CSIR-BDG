import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth } from "../../../../lib/session";

async function POSTHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const now = new Date(); const threshold = new Date(now.getTime() + 60 * 86400000); const recent = new Date(now.getTime() - 7 * 86400000);
  const mous = await prisma.mou.findMany({ where: { ...(session.type === "lab" ? { labId: session.labId } : {}), status: "ACTIVE", expiryDate: { gte: now, lte: threshold } }, include: { company: true, lab: { select: publicLabSelect } } });
  let created = 0;
  for (const mou of mous) {
    const link = `/mou-repository?mou=${mou.id}`; const existing = await prisma.notification.findFirst({ where: { recipientLabId: mou.labId, type: "MOU_EXPIRING", link, createdAt: { gte: recent } } });
    if (!existing) { const days = Math.ceil((mou.expiryDate - now) / 86400000); await prisma.notification.create({ data: { recipientType: "LAB", recipientLabId: mou.labId, type: "MOU_EXPIRING", title: "MOU renewal reminder", message: `${mou.title} with ${mou.company.name} expires in ${days} day(s).`, link } }); created += 1; }
  }
  return NextResponse.json({ checked: mous.length, created });
}

export const POST = withApiBoundary(POSTHandler);
