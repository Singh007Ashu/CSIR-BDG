import { withApiBoundary } from "../../../../lib/apiBoundary";
import { loginThrottle } from "../../../../lib/loginThrottle";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { verifyPassword } from "../../../../lib/password";
import { createSessionToken, credentialVersion, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../../../../lib/auth";
import { requestMeta } from "../../../../lib/request";

async function POSTHandler(req) {
  const body = await req.json();
  const throttled = await loginThrottle("user", body.email, req); if (throttled) return throttled;
  const email = String(body.email || "").toLowerCase().trim();
  const user = email ? await prisma.user.findUnique({ where: { email }, include: { organization: true, assignedLab: { select: { code: true, name: true } } } }) : null;
  const success = Boolean(user && user.accountStatus === "ACTIVE" && await verifyPassword(body.password, user.passwordHash, user.passwordSalt));
  await prisma.loginHistory.create({ data: { userId: user?.id || null, success, ...requestMeta(req) } });
  if (!success) return NextResponse.json({ error: "Invalid email or password, or the account is inactive." }, { status: 401 });
  const token = await createSessionToken({ credentialVersion: await credentialVersion(user.passwordHash), type: "user", userId: user.id, role: user.role, name: user.name, email: user.email, organizationId: user.organizationId || null, assignedLabId: user.assignedLabId || null });
  (await cookies()).set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, assignedLabId: user.assignedLabId, assignedLab: user.assignedLab, organization: user.organization });
}

export const POST = withApiBoundary(POSTHandler);
