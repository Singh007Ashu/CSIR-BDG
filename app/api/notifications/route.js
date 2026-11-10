import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";

async function GETHandler() {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const where = session.type === "lab" ? { recipientLabId: session.labId } : { recipientUserId: session.userId };
  const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(notifications);
}

async function PATCHHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  const body = await req.json();
  const owner = session.type === "lab" ? { recipientLabId: session.labId } : { recipientUserId: session.userId };
  if (body.all) await prisma.notification.updateMany({ where: { ...owner, read: false }, data: { read: true, readAt: new Date() } });
  else if (body.id) await prisma.notification.updateMany({ where: { id: Number(body.id), ...owner }, data: { read: true, readAt: new Date() } });
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);
