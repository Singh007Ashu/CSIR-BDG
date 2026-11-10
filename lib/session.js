import { prisma } from "./db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, credentialVersion } from "./auth";
import { isManagerRole } from "./roles";
import { dataPrincipal } from "./accessPolicy";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || !["user","lab"].includes(session.type)) return null;
  const account = session.type === "lab" ? await prisma.lab.findUnique({where:{id:session.labId},select:{accountStatus:true,primaryRole:true,passwordHash:true}}) : await prisma.user.findUnique({where:{id:session.userId},select:{accountStatus:true,passwordHash:true,role:true,organizationId:true,assignedLabId:true}});
  if (!account || account.accountStatus !== "ACTIVE") return null;
  if (session.type === "user" && (account.role !== session.role || (account.organizationId||null)!==(session.organizationId||null) || (account.assignedLabId||null)!==(session.assignedLabId||null))) return null;
  if (!session.jti || session.credentialVersion !== await credentialVersion(account.passwordHash)) return null;
  if (session.type === "lab" && session.role !== account.primaryRole) return null;
  if (await prisma.auditLog.findFirst({where:{action:"SESSION_REVOKED",recordLabel:session.jti},select:{id:true}})) return null;
  const last=await prisma.auditLog.findFirst({where:{action:"SESSION_ACTIVITY",recordLabel:session.jti},orderBy:{createdAt:"desc"},select:{createdAt:true}});
  const lastSeen=last?.createdAt?.getTime() || session.iat;
  if(Date.now()-lastSeen>30*60*1000)return null;
  if(Date.now()-lastSeen>60000)await prisma.auditLog.create({data:{actorType:"SYSTEM",action:"SESSION_ACTIVITY",recordLabel:session.jti}});
  return session;
}

function denied(message, status) { return { error: NextResponse.json({ error: message }, { status }) }; }

export async function requireUser() {
  const session = await getSession();
  if (!session || session.type !== "user") return denied("Login required.", 401);
  return { session };
}

export async function requireLab() {
  const session = await getSession();
  if (!session || session.type !== "lab") return denied("Lab login required.", 401);
  return { session };
}

export async function requireAnyAuth() {
  const session = await getSession();
  if (!session) return denied("Login required.", 401);
  const principal = dataPrincipal(session);
  if (!principal) return denied("An active laboratory assignment is required.", 403);
  return { session: principal };
}

export async function requireRole(roles) {
  const { session, error } = await requireUser();
  if (error) return { error };
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (session.role === "SUPER_ADMIN" || allowed.includes(session.role)) return { session };
  return denied("You do not have permission to perform this action.", 403);
}

export function isManager(session) { return session?.type === "user" && isManagerRole(session.role); }
export function isAdmin(session) { return session?.type === "user" && ["SUPER_ADMIN", "ADMIN"].includes(session.role); }
