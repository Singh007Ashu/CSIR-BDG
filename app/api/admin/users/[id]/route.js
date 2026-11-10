import { withApiBoundary } from "../../../../../lib/apiBoundary";

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/session";
import { hashPassword } from "../../../../../lib/password";
import { logAudit } from "../../../../../lib/labAuth";

const ROLES = ["SUPER_ADMIN", "ADMIN", "HEAD_ADMIN", "HEAD_BDG", "BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM", "LAB_BD", "PI", "READ_ONLY", "APPLICANT"];
async function PATCHHandler(req, { params }) {
  const { session, error } = await requireRole(["ADMIN"]); if (error) return error;
  const body = await req.json(); const data = {}; let temporaryPassword = null;
  const targetId=Number((await params).id);
  if(!Number.isSafeInteger(targetId)||targetId<1)return NextResponse.json({error:"Invalid account."},{status:400});
  const target=await prisma.user.findUnique({where:{id:targetId},select:{role:true}});
  if(!target)return NextResponse.json({error:"Account not found."},{status:404});
  if(session.role!=="SUPER_ADMIN"&&(target.role==="SUPER_ADMIN"||body.role==="SUPER_ADMIN"))return NextResponse.json({error:"Only a Super Admin can manage Super Admin privileges or credentials."},{status:403});
  if (body.role !== undefined) { if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 }); data.role = body.role; }
  if (body.accountStatus !== undefined) { if (!["ACTIVE", "INACTIVE"].includes(body.accountStatus)) return NextResponse.json({ error: "Invalid status." }, { status: 400 }); data.accountStatus = body.accountStatus; }
  if (body.resetPassword) { temporaryPassword = `Csir@${randomBytes(6).toString("base64url")}9`; const password = await hashPassword(temporaryPassword); data.passwordHash = password.passwordHash; data.passwordSalt = password.passwordSalt; }
  const user = await prisma.user.update({ where: { id: Number((await params).id) }, data, select: { id: true, name: true, email: true, role: true, accountStatus: true } });
  await logAudit({ actorType: "USER", actorUserId: session.userId, action: body.resetPassword ? "USER_PASSWORD_RESET" : "USER_UPDATED", entityType: "USER", entityId: user.id, details: { role: data.role, accountStatus: data.accountStatus } });
  return NextResponse.json({ user, temporaryPassword });
}



export const PATCH = withApiBoundary(PATCHHandler);
