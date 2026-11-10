import { withApiBoundary } from "../../../../lib/apiBoundary";
import { loginThrottle } from "../../../../lib/loginThrottle";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { hashPassword, validatePassword } from "../../../../lib/password";
import { createSessionToken, credentialVersion, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../../../../lib/auth";
import { cleanText, optionalText } from "../../../../lib/request";

async function POSTHandler(req) {
  const body = await req.json();
  const throttled = await loginThrottle("registration", body.email, req); if (throttled) return throttled;
  const email = cleanText(body.email, 254).toLowerCase();
  if (!cleanText(body.name, 150) || !email || !cleanText(body.orgName, 200) || !cleanText(body.orgType, 50)) {
    return NextResponse.json({ error: "Name, email, organization name and type are required." }, { status: 400 });
  }
  const passwordError = validatePassword(body.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const { passwordHash, passwordSalt } = await hashPassword(body.password);
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: {
      name: cleanText(body.orgName, 200), type: cleanText(body.orgType, 50), contactName: cleanText(body.name, 150),
      contactEmail: email, contactPhone: optionalText(body.contactPhone, 30),
    } });
    const user = await tx.user.create({ data: {
      name: cleanText(body.name, 150), email, passwordHash, passwordSalt, role: "APPLICANT", organizationId: organization.id,
    } });
    return { user, organization };
  });
  const token = await createSessionToken({ credentialVersion: await credentialVersion(result.user.passwordHash), type: "user", userId: result.user.id, role: "APPLICANT", name: result.user.name, email, organizationId: result.organization.id });
  (await cookies()).set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return NextResponse.json({ id: result.user.id, name: result.user.name, email, role: "APPLICANT", organization: result.organization }, { status: 201 });
}

export const POST = withApiBoundary(POSTHandler);
