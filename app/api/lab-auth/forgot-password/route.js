import { withApiBoundary } from "../../../../lib/apiBoundary";
import { loginThrottle } from "../../../../lib/loginThrottle";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { notifyHeadBdgAndAdmins } from "../../../../lib/labAuth";

async function POSTHandler(req) {
  const body = await req.json();
  const throttled = await loginThrottle("reset", body.officialEmail, req); if (throttled) return throttled;
  const officialEmail = String(body.officialEmail || "").toLowerCase().trim();
  const response = { ok: true, message: "If this email is registered, an administrator has been notified. Contact your administrator through your official channel to verify your identity and obtain a reset." };
  if (!officialEmail) return NextResponse.json({ error: "Official email is required." }, { status: 400 });
  const lab = await prisma.lab.findUnique({ where: { officialEmail } });
  if (!lab) return NextResponse.json(response);
  await notifyHeadBdgAndAdmins({type:"PASSWORD_RESET_REQUEST",title:"Laboratory password assistance requested",message:`${lab.code || lab.name} requested password assistance. Verify the requester through an official channel before resetting credentials.`,link:"/admin?tab=laboratories"});
  return NextResponse.json(response);
}

export const POST = withApiBoundary(POSTHandler);
