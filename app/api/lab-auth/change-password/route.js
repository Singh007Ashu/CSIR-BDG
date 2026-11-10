import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireLab } from "../../../../lib/session";
import { hashPassword, verifyPassword, validatePassword } from "../../../../lib/password";
import { logAudit } from "../../../../lib/labAuth";

async function POSTHandler(req) {
  const { session, error } = await requireLab();
  if (error) return error;
  const body = await req.json();
  const passwordError = validatePassword(body.newPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const lab = await prisma.lab.findUnique({ where: { id: session.labId } });
  if (!lab || !await verifyPassword(body.currentPassword, lab.passwordHash, lab.passwordSalt)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  const { passwordHash, passwordSalt } = await hashPassword(body.newPassword);
  await prisma.lab.update({ where: { id: lab.id }, data: { passwordHash, passwordSalt } });
  await logAudit({ actorType: "LAB", actorLabId: lab.id, action: "PASSWORD_CHANGED" });
  return NextResponse.json({ ok: true });
}

export const POST = withApiBoundary(POSTHandler);
