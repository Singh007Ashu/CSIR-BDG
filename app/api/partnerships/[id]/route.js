import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole, requireAnyAuth } from "../../../../lib/session";
import { collaborationScope, collaborationIncludes } from "../../../../lib/collaborationAccess";
import { notifyLab } from "../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const item = await prisma.partnership.findFirst({
    where: { id: Number((await params).id), ...collaborationScope(session) },
    include: { ...collaborationIncludes },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireRole(["HEAD_BDG", "HEAD_ADMIN", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  if (body.labId && !await prisma.lab.findUnique({ where: { id: Number(body.labId) }, select: { id: true } })) return NextResponse.json({ error: "Select a valid laboratory." }, { status: 400 });
  const headDecision = body.headStatus === "APPROVED" || body.headStatus === "REJECTED";
  const item = await prisma.partnership.update({
    where: { id: Number((await params).id) },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.labId !== undefined ? { labId: body.labId ? Number(body.labId) : null } : {}),
      ...(body.matchedApproach !== undefined ? { matchedApproach: body.matchedApproach } : {}),
      ...(body.mouSigned !== undefined ? { mouSigned: body.mouSigned } : {}),
      ...(body.royaltyNotes !== undefined ? { royaltyNotes: body.royaltyNotes } : {}),
      ...(headDecision
        ? {
            headStatus: body.headStatus,
            headRemarks: body.headRemarks ?? null,
            decidedById: session.userId,
            decidedAt: new Date(),
            status: body.status || (body.headStatus === "APPROVED" ? "SKILL_MATCHED" : "GAP_IDENTIFIED"),
          }
        : {}),
    },
  });
  if (body.labId) await notifyLab(Number(body.labId), { type: "NEW_ASSIGNMENT", title: "Industry request assigned to your laboratory", message: "Open the assigned record to submit your laboratory update.", link: "/module3/" + item.id });
  return NextResponse.json(item);
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
