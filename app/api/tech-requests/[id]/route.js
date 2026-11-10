import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireRole("HEAD_BDG");
  if (error) return error;

  const body = await req.json();
  const headDecision = body.headStatus === "APPROVED" || body.headStatus === "REJECTED";
  const updated = await prisma.technologyRequest.update({
    where: { id: Number((await params).id) },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.impactNotes !== undefined ? { impactNotes: body.impactNotes } : {}),
      ...(headDecision
        ? {
            headStatus: body.headStatus,
            headRemarks: body.headRemarks ?? null,
            decidedById: session.userId,
            decidedAt: new Date(),
            // Approving a request also advances the pipeline; rejecting closes it.
            status: body.status || (body.headStatus === "APPROVED" ? "BDG_EVALUATING" : "REJECTED"),
          }
        : {}),
    },
  });
  return NextResponse.json(updated);
}

export const PATCH = withApiBoundary(PATCHHandler);
