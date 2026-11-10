import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { logAudit, notifyLab } from "../../../../lib/labAuth";

const TECH_FIELDS = new Set(["name", "briefDescription", "piName", "advantages", "applications", "keyFeatures", "classification", "ipStatus", "trl", "crl", "sector", "industryMap", "applicationMap", "servicesOffered", "status"]);
const LAB_FIELDS = new Set(["piName", "authorizedPerson", "designation", "officialEmail", "mobileNumber", "location", "expertise"]);

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireRole(["HEAD_BDG", "ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const action = cleanText(body.status, 30).toUpperCase();
  if (!["APPROVED", "REJECTED", "REVISION_REQUESTED"].includes(action)) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const request = await prisma.changeRequest.findUnique({ where: { id: Number((await params).id) } });
  if (!request) return NextResponse.json({ error: "Change request not found." }, { status: 404 });
  if (request.status !== "PENDING" && request.status !== "REVISION_REQUESTED") return NextResponse.json({ error: "This request is already closed." }, { status: 409 });
  let proposed = JSON.parse(request.proposedData);
  if (body.proposedData && typeof body.proposedData === "object") proposed = body.proposedData;
  const allowed = request.entityType === "TECHNOLOGY" ? TECH_FIELDS : LAB_FIELDS;
  proposed = Object.fromEntries(Object.entries(proposed).filter(([key]) => allowed.has(key)));
  const remarks = cleanText(body.headRemarks, 3000) || null;
  await prisma.$transaction(async (tx) => {
    if (action === "APPROVED") {
      if (request.entityType === "TECHNOLOGY") await tx.technology.update({ where: { id: request.technologyId }, data: proposed });
      else await tx.lab.update({ where: { id: request.labId }, data: proposed });
    }
    await tx.changeRequest.update({ where: { id: request.id }, data: { status: action, headRemarks: remarks, proposedData: JSON.stringify(proposed), decidedById: session.userId, decidedAt: new Date() } });
    await tx.approvalHistory.create({ data: { changeRequestId: request.id, action, comments: remarks, proposedSnapshot: JSON.stringify(proposed), actedByUserId: session.userId } });
  });
  await notifyLab(request.labId, { type: action === "APPROVED" ? "APPROVAL_GRANTED" : action === "REJECTED" ? "APPROVAL_REJECTED" : "HEAD_BDG_COMMENTS", title: `Change request ${action.replaceAll("_", " ").toLowerCase()}`, message: remarks || `Your change request is ${action.replaceAll("_", " ").toLowerCase()}.`, link: "/lab-dashboard" });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: `CHANGE_REQUEST_${action}`, entityType: "CHANGE_REQUEST", entityId: request.id, details: proposed });
  return NextResponse.json({ ok: true, status: action });
}

export const PATCH = withApiBoundary(PATCHHandler);
