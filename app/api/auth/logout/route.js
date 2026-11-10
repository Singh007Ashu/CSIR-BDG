import { withApiBoundary } from "../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";

async function POSTHandler() {
  const jar=await cookies();const session=await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if(session?.jti)await prisma.auditLog.create({data:{actorType:"SYSTEM",action:"SESSION_REVOKED",recordLabel:session.jti}});
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

export const POST = withApiBoundary(POSTHandler);
