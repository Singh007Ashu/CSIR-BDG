import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth } from "../../../../lib/session";
import { canActForUnit, isManagerRole } from "../../../../lib/roles";
import { cleanText } from "../../../../lib/request";
import { getVisiblePacket, workflowInclude } from "../../../../lib/workflow";
import { logAudit } from "../../../../lib/labAuth";

async function GETHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const packet = await getVisiblePacket((await params).id, session);
  return packet ? NextResponse.json(packet) : NextResponse.json({ error: "Workflow packet not found." }, { status: 404 });
}

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const id = Number((await params).id);
  const packet = await getVisiblePacket(id, session);
  if (!packet) return NextResponse.json({ error: "Workflow packet not found." }, { status: 404 });
  const body = await req.json();
  const action = cleanText(body.action, 30).toUpperCase();
  const comments = cleanText(body.comments, 3000);
  const active = packet.steps.find((step) => step.status === "IN_REVIEW") || null;
  if (!active || (!canActForUnit(session, active.unitRole) && !(session.type === "user" && isManagerRole(session.role)))) return NextResponse.json({ error: `This file is currently with ${packet.currentUnit}; your role cannot action it.` }, { status: 403 });
  if (["RETURN", "REJECT"].includes(action) && !comments) return NextResponse.json({ error: "Comments are required for return or rejection." }, { status: 400 });
  if (!["ADVANCE", "APPROVE", "RETURN", "REJECT"].includes(action)) return NextResponse.json({ error: "Invalid workflow action." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    if (action === "REJECT") {
      await tx.workflowStep.update({ where: { id: active.id }, data: { status: "REJECTED", decision: action, comments, completedAt: new Date(), assignedUserId: session.type === "user" ? session.userId : null } });
      await tx.workflowPacket.update({ where: { id }, data: { status: "REJECTED", currentUnit: null, completedAt: new Date() } });
      await tx.workflowEvent.create({ data: { packetId: id, action, fromUnit: active.unitRole, comments, actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null } });
      return;
    }
    if (action === "RETURN") {
      const labStep = packet.steps.find((step) => ["LAB_BD", "PI"].includes(step.unitRole)) || packet.steps[0];
      await tx.workflowStep.update({ where: { id: active.id }, data: { status: "RETURNED", decision: action, comments, completedAt: new Date(), assignedUserId: session.type === "user" ? session.userId : null } });
      await tx.workflowStep.update({ where: { id: labStep.id }, data: { status: "IN_REVIEW", receivedAt: new Date(), completedAt: null, decision: null, comments } });
      await tx.workflowPacket.update({ where: { id }, data: { status: "RETURNED", currentUnit: labStep.unitRole } });
      await tx.workflowEvent.create({ data: { packetId: id, action, fromUnit: active.unitRole, toUnit: labStep.unitRole, comments, actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null } });
      return;
    }
    const next = packet.steps.find((step) => step.sequence > active.sequence && step.status === "QUEUED");
    await tx.workflowStep.update({ where: { id: active.id }, data: { status: "COMPLETED", decision: action, comments: comments || null, completedAt: new Date(), assignedUserId: session.type === "user" ? session.userId : null } });
    if (next) {
      await tx.workflowStep.update({ where: { id: next.id }, data: { status: "IN_REVIEW", receivedAt: new Date() } });
      await tx.workflowPacket.update({ where: { id }, data: { status: "IN_REVIEW", currentUnit: next.unitRole } });
    } else await tx.workflowPacket.update({ where: { id }, data: { status: "COMPLETED", currentUnit: null, completedAt: new Date() } });
    await tx.workflowEvent.create({ data: { packetId: id, action, fromUnit: active.unitRole, toUnit: next?.unitRole || null, comments: comments || null, actorType: session.type.toUpperCase(), actorUserId: session.type === "user" ? session.userId : null, actorLabId: session.type === "lab" ? session.labId : null } });
  });
  await logAudit({ actorType: session.type.toUpperCase(), actorLabId: session.type === "lab" ? session.labId : null, actorUserId: session.type === "user" ? session.userId : null, action: `WORKFLOW_${action}`, entityType: "WORKFLOW_PACKET", entityId: id, details: { comments } });
  return NextResponse.json(await prisma.workflowPacket.findUnique({ where: { id }, include: workflowInclude }));
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
