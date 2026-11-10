import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireRole } from "../../../../lib/session";
import { cleanText } from "../../../../lib/request";
import { safeInternalPath } from "../../../../lib/safeNavigation";
import { logAudit } from "../../../../lib/labAuth";

async function POSTHandler(req) {
  const { session, error } = await requireRole(["ADMIN"]); if (error) return error;
  const body = await req.json(); const title = cleanText(body.title, 200); const message = cleanText(body.message, 2000); const target = cleanText(body.target || "ALL_LABS", 50);
  if(body.link && (typeof body.link!=="string" || !safeInternalPath(body.link,"")))return NextResponse.json({error:"Notification link must be a valid internal website path."},{status:400});
  if(body.link)body.link=safeInternalPath(body.link);
  if (!title || !message) return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  let rows = [];
  if (target === "ALL_LABS") { const labs = await prisma.lab.findMany({ where: { accountStatus: "ACTIVE" }, select: { id: true } }); rows = labs.map(({ id }) => ({ recipientType: "LAB", recipientLabId: id, type: "ADMIN_NOTICE", title, message, link: body.link || null })); }
  else { const users = await prisma.user.findMany({ where: { role: target, accountStatus: "ACTIVE" }, select: { id: true } }); rows = users.map(({ id }) => ({ recipientType: "USER", recipientUserId: id, type: "ADMIN_NOTICE", title, message, link: body.link || null })); }
  if (rows.length) await prisma.notification.createMany({ data: rows });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: "NOTIFICATION_BROADCAST", entityType: "NOTIFICATION", details: { target, recipients: rows.length } });
  return NextResponse.json({ recipients: rows.length }, { status: 201 });
}

export const POST = withApiBoundary(POSTHandler);
