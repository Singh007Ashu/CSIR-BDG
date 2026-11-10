import { withApiBoundary } from "../../../lib/apiBoundary";
import { publicLabSelect } from "../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { cleanText, optionalText } from "../../../lib/request";
import { logAudit, notifyHeadBdgAndAdmins } from "../../../lib/labAuth";

const TECHNOLOGY_FIELDS = ["name", "briefDescription", "piName", "advantages", "applications", "keyFeatures", "classification", "ipStatus", "trl", "crl", "sector", "industryMap", "applicationMap", "servicesOffered", "status"];
const LAB_FIELDS = ["piName", "authorizedPerson", "designation", "officialEmail", "mobileNumber", "location", "expertise"];

function pick(source, fields) {
  return Object.fromEntries(fields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type !== "lab" && !isManager(session)) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  const requests = await prisma.changeRequest.findMany({
    where: session.type === "lab" ? { labId: session.labId } : {},
    include: { lab: { select: publicLabSelect }, technology: true, decidedBy: { select: { id: true, name: true } }, history: { include: { actedByUser: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" }, take: 500,
  });
  return NextResponse.json(requests);
}

async function POSTHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (session.type !== "lab") return NextResponse.json({ error: "Only a laboratory can submit this request." }, { status: 403 });
  const body = await req.json();
  const entityType = cleanText(body.entityType, 30).toUpperCase();
  let currentData;
  let proposedData;
  let technologyId = null;
  let changeType;
  if (entityType === "TECHNOLOGY") {
    technologyId = Number(body.entityId);
    const technology = await prisma.technology.findFirst({ where: { id: technologyId, labId: session.labId } });
    if (!technology) return NextResponse.json({ error: "Technology not found." }, { status: 404 });
    proposedData = pick(body.proposedData || {}, TECHNOLOGY_FIELDS);
    currentData = pick(technology, Object.keys(proposedData));
    changeType = "TECHNOLOGY_DETAILS";
  } else if (entityType === "LAB_PROFILE") {
    const lab = await prisma.lab.findUnique({ where: { id: session.labId } });
    proposedData = pick(body.proposedData || {}, LAB_FIELDS);
    currentData = pick(lab, Object.keys(proposedData));
    changeType = Object.prototype.hasOwnProperty.call(proposedData, "piName") ? "PI_CHANGE" : "LAB_PROFILE";
  } else return NextResponse.json({ error: "Unsupported change request type." }, { status: 400 });
  if (!Object.keys(proposedData).length) return NextResponse.json({ error: "At least one proposed change is required." }, { status: 400 });
  const request = await prisma.changeRequest.create({ data: {
    labId: session.labId, technologyId, entityType, entityId: technologyId, changeType,
    proposedData: JSON.stringify(proposedData), currentData: JSON.stringify(currentData), reason: optionalText(body.reason, 2000),
  }, include: { lab: { select: publicLabSelect }, technology: true } });
  await logAudit({ actorType: "LAB", actorLabId: session.labId, action: "CHANGE_REQUEST_SUBMITTED", entityType, entityId: technologyId || session.labId, details: proposedData });
  await notifyHeadBdgAndAdmins({ type: changeType === "PI_CHANGE" ? "PI_CHANGE_REQUEST" : "TECHNOLOGY_UPDATED", title: "Approval required", message: `${request.lab.name} submitted a ${changeType.replaceAll("_", " ").toLowerCase()} request.`, link: "/head-bdg" });
  return NextResponse.json(request, { status: 201 });
}

export const GET = withApiBoundary(GETHandler);
export const POST = withApiBoundary(POSTHandler);
