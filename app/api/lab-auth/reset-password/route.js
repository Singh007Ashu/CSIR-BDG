import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifySessionToken, credentialVersion } from "../../../../lib/auth";
import { hashPassword, validatePassword } from "../../../../lib/password";
import { logAudit } from "../../../../lib/labAuth";

async function POSTHandler(req) {
  const body = await req.json();
  const passwordError = validatePassword(body.newPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const payload = await verifySessionToken(body.token);
  if (!payload || payload.type !== "lab-reset" || payload.purpose !== "password-reset") return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
  const current=await prisma.lab.findUnique({where:{id:payload.labId}});
  if(!current || current.accountStatus!=="ACTIVE" || !payload.credentialVersion || payload.credentialVersion!==await credentialVersion(current.passwordHash)) return NextResponse.json({error:"Reset link is invalid or has already been used."},{status:400});
  const { passwordHash, passwordSalt } = await hashPassword(body.newPassword);
  const result=await prisma.lab.updateMany({where:{id:payload.labId,passwordHash:current.passwordHash,passwordSalt:current.passwordSalt},data:{passwordHash,passwordSalt}});
  if(result.count!==1)return NextResponse.json({error:"Reset link has already been used."},{status:400});
  await logAudit({ actorType: "LAB", actorLabId: payload.labId, action: "PASSWORD_RESET" });
  return NextResponse.json({ ok: true });
}

export const POST = withApiBoundary(POSTHandler);
