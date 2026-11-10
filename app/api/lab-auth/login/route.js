import { withApiBoundary } from "../../../../lib/apiBoundary";
import { loginThrottle } from "../../../../lib/loginThrottle";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { verifyPassword } from "../../../../lib/password";
import { createSessionToken, credentialVersion, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../../../../lib/auth";
import { logAudit } from "../../../../lib/labAuth";
import { requestMeta } from "../../../../lib/request";

async function POSTHandler(req) {
  const body = await req.json();
  const throttled = await loginThrottle("lab", body.labId, req); if (throttled) return throttled;
  const labId = String(body.labId || "").trim().toUpperCase();
  const lab = labId ? await prisma.lab.findUnique({ where: { labId } }) : null;
  const success = Boolean(lab && lab.accountStatus === "ACTIVE" && await verifyPassword(body.password, lab.passwordHash, lab.passwordSalt));
  await prisma.loginHistory.create({ data: { labId: lab?.id || null, success, ...requestMeta(req) } });
  if (!success) {
    const pending = lab?.accountStatus === "PENDING";
    const inactive = lab && lab.accountStatus !== "ACTIVE"; return NextResponse.json({ error: pending ? "Registration is awaiting Admin approval." : inactive ? `This laboratory account is ${lab.accountStatus.toLowerCase()}. Contact Admin.` : "Invalid Lab ID or password." }, { status: pending || inactive ? 403 : 401 });
  }
  await prisma.lab.update({ where: { id: lab.id }, data: { lastLoginAt: new Date() } });
  await logAudit({ actorType: "LAB", actorLabId: lab.id, action: "LAB_LOGIN", ...requestMeta(req) });
  const token = await createSessionToken({ credentialVersion: await credentialVersion(lab.passwordHash), type: "lab", labId: lab.id, labCode: lab.code, role: lab.primaryRole, name: lab.name, officialEmail: lab.officialEmail });
  (await cookies()).set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return NextResponse.json({ id: lab.id, name: lab.name, code: lab.code, labId: lab.labId });
}

export const POST = withApiBoundary(POSTHandler);
