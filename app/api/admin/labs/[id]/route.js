import { withApiBoundary } from "../../../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/session";
import { hashPassword } from "../../../../../lib/password";
import { notifyLab, logAudit } from "../../../../../lib/labAuth";

async function PATCHHandler(req, { params }) {
  const { session, error } = await requireRole(["ADMIN"]); if (error) return error;
  const body = await req.json();
  const verificationReference=String(body.verificationReference||"").trim();
  if (body.accountStatus === "ACTIVE" && (body.identityVerified !== true || body.emailOwnershipVerified !== true)) return NextResponse.json({ error: "Confirm the authorized person's identity and access to the submitted email using a previously known official channel before activation." }, { status: 400 });
  if (body.accountStatus === "ACTIVE" && verificationReference.length < 12) return NextResponse.json({ error: "Record the official identity verification reference (at least 12 characters) before activation." }, { status: 400 });
  const allowed = ["PENDING", "ACTIVE", "INACTIVE", "UNREGISTERED"]; const data = {}; let temporaryPassword = null;
  if (body.accountStatus !== undefined) { if (!allowed.includes(body.accountStatus)) return NextResponse.json({ error: "Invalid lab status." }, { status: 400 }); data.accountStatus = body.accountStatus; data.approvedAt = body.accountStatus === "ACTIVE" ? new Date() : null; }
  if (body.resetPassword) { temporaryPassword = `CsirLab@${randomBytes(5).toString("base64url")}9`; const password = await hashPassword(temporaryPassword); data.passwordHash = password.passwordHash; data.passwordSalt = password.passwordSalt; }
  if (!Object.keys(data).length) return NextResponse.json({ error: "No laboratory update was supplied." }, { status: 400 });
  const lab = await prisma.lab.update({ where: { id: Number((await params).id) }, data });
  if (body.accountStatus !== undefined) await notifyLab(lab.id, { type: body.accountStatus === "ACTIVE" ? "APPROVAL_GRANTED" : "ACCOUNT_STATUS", title: "Laboratory account status updated", message: `Your account is now ${body.accountStatus}.`, link: "/lab-login" });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: body.resetPassword ? "LAB_PASSWORD_RESET" : "LAB_STATUS_CHANGED", entityType: "LAB", entityId: lab.id, details: { accountStatus: body.accountStatus, identityVerified: body.accountStatus === "ACTIVE", emailOwnershipVerified: body.accountStatus === "ACTIVE", verificationMethod: body.accountStatus === "ACTIVE" ? "ADMIN_ATTESTED_OFFICIAL_CHANNEL" : null, verificationReference: verificationReference.slice(0,1000) || null } });
  const {passwordHash: _hash,passwordSalt: _salt,...safeLab}=lab;
  return NextResponse.json({ lab:safeLab, temporaryPassword });
}

export const PATCH = withApiBoundary(PATCHHandler);
