import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { requireAnyAuth } from "../../../../../lib/session";
import { canAccessEntity } from "../../../../../lib/entityAccess";
import { optionalText, safeNumber } from "../../../../../lib/request";

async function PUTHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Commercialization data must be updated by the concerned laboratory." }, { status: 403 });
  const projectId = Number((await params).id);
  const access = await canAccessEntity(session, "CODEV_PROJECT", projectId, true); if (!access.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json();
  const data = {
    royaltyApplicable: Boolean(body.royaltyApplicable), royaltyDetails: optionalText(body.royaltyDetails), licensing: Boolean(body.licensing),
    technologyTransfer: Boolean(body.technologyTransfer), patentFiled: Boolean(body.patentFiled), patentGranted: Boolean(body.patentGranted),
    startupCreated: Boolean(body.startupCreated), equity: optionalText(body.equity), revenueSharing: optionalText(body.revenueSharing),
    commercialPartner: optionalText(body.commercialPartner), marketStatus: optionalText(body.marketStatus), stage: optionalText(body.stage),
    trl: safeNumber(body.trl), revenueGenerated: safeNumber(body.revenueGenerated),
  };
  const record = await prisma.commercializationDetail.upsert({ where: { projectId }, update: data, create: { projectId, ...data } });
  return NextResponse.json(record);
}

export const PUT = withApiBoundary(PUTHandler);
