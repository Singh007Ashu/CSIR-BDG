import { withApiBoundary } from "../../../../lib/apiBoundary";
import { loginThrottle } from "../../../../lib/loginThrottle";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { hashPassword, validatePassword } from "../../../../lib/password";
import { generateLabId, logAudit, notifyHeadBdgAndAdmins } from "../../../../lib/labAuth";
import { cleanText, requestMeta } from "../../../../lib/request";

async function POSTHandler(req) {
  const body = await req.json();
  const throttled = await loginThrottle("lab-registration", body.officialEmail); if (throttled) return throttled;
  const required = ["labName", "labCode", "piName", "authorizedPerson", "designation", "officialEmail", "mobileNumber", "password"];
  if (required.some((key) => !cleanText(body[key], key === "password" ? 200 : 300))) return NextResponse.json({ error: "All registration fields are required." }, { status: 400 });
  const passwordError = validatePassword(body.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const code = cleanText(body.labCode, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const officialEmail = cleanText(body.officialEmail, 254).toLowerCase();
  if (!code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) return NextResponse.json({ error: "Valid lab code and official email are required." }, { status: 400 });
  const emailInUse = await prisma.lab.findFirst({ where: { officialEmail } });
  if (emailInUse) return NextResponse.json({ error: "This official email is already registered." }, { status: 409 });
  let lab = await prisma.lab.findUnique({ where: { code } });
  if (lab?.passwordHash) return NextResponse.json({ error: "This laboratory is already registered." }, { status: 409 });
  const generatedLabId = await generateLabId(code);
  const { passwordHash, passwordSalt } = await hashPassword(body.password);
  const data = {
    name: lab?.name || cleanText(body.labName, 300), code, labId: generatedLabId, piName: cleanText(body.piName, 150),
    authorizedPerson: cleanText(body.authorizedPerson, 150), designation: cleanText(body.designation, 120), officialEmail,
    mobileNumber: cleanText(body.mobileNumber, 30), passwordHash, passwordSalt, accountStatus: "PENDING", registeredAt: new Date(),
  };
  lab = lab ? await prisma.lab.update({ where: { id: lab.id }, data }) : await prisma.lab.create({ data });
  await logAudit({ actorType: "LAB", actorLabId: lab.id, action: "LAB_REGISTERED", entityType: "LAB", entityId: lab.id, ...requestMeta(req) });
  await notifyHeadBdgAndAdmins({ type: "NEW_REGISTRATION", title: "New laboratory registration", message: `${lab.name} (${lab.labId}) is awaiting approval.`, link: "/admin" });
  return NextResponse.json({ id: lab.id, name: lab.name, code: lab.code, labId: lab.labId, accountStatus: lab.accountStatus }, { status: 201 });
}

export const POST = withApiBoundary(POSTHandler);
