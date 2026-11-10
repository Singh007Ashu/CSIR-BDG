import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireRole, requireUser } from "../../../lib/session";

async function GETHandler() {
  const { error } = await requireRole(["HEAD_ADMIN", "HEAD_BDG", "ADMIN"]);
  if (error) return error;
  const requests = await prisma.technologyRequest.findMany({
    include: { technology: true, organization: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

// Any logged-in user can submit a request. It always goes to Head, BDG (headStatus PENDING)
// for accept/reject, on top of the normal pipeline `status`.
async function POSTHandler(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const required = ["technologyId", "requestType"];
  for (const f of required) {
    if (!body[f]) return NextResponse.json({ error: `${f} is required` }, { status: 400 });
  }

  // Applicants can only submit on behalf of their own organization.
  const organizationId = session.role === "HEAD_BDG" && body.organizationId
    ? Number(body.organizationId)
    : session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
  }

  const request = await prisma.technologyRequest.create({
    data: {
      technologyId: Number(body.technologyId),
      organizationId,
      requestType: body.requestType,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(request, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
