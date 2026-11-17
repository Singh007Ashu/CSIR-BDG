import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "./db";

// Database-backed per-identity budget, shared across processes and restarts.
// A gateway/WAF must additionally enforce source-IP and global traffic limits.
export async function loginThrottle(kind, identity) {
  const key = createHash("sha256").update(`${kind}:${String(identity || "").trim().toLowerCase()}`).digest("hex");
  const since = new Date(Date.now() - 15 * 60 * 1000);
  let allowed=false;
  try { allowed=await prisma.$transaction(async tx=>{
    const attempts=await tx.auditLog.count({where:{action:"AUTH_ATTEMPT",recordLabel:key,createdAt:{gte:since}}});
    if(attempts>=8)return false;
    await tx.auditLog.create({data:{actorType:"SYSTEM",action:"AUTH_ATTEMPT",recordLabel:key}});
    return true;
  },{isolationLevel:"Serializable",maxWait:5000,timeout:5000}); }
  catch(error) { if(!["P2034","P2028","P1008"].includes(error.code))throw error; }
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } });
  return null;
}
