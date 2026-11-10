import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "./db";

// Shared database-backed identity and per-endpoint source-IP budgets work across app workers.
export async function loginThrottle(kind, identity, req) {
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  const identityKey = digest(`identity:${kind}:${String(identity || "").trim().toLowerCase()}`);
  // Forwarded IP headers are trusted only when the configured reverse proxy overwrites them.
  const ip = process.env.TRUST_PROXY === "1"
    ? (req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers.get("x-real-ip")?.trim())
    : req?.ip;
  const ipKey = ip ? digest(`ip:${kind}:${ip}`) : null;
  const windows = [
    { key: identityKey, since: new Date(Date.now() - 15 * 60 * 1000), limit: 8 },
    ...(ipKey ? [{ key: ipKey, since: new Date(Date.now() - 15 * 60 * 1000), limit: 40 }] : []),
  ];
  let allowed = false;
  try {
    allowed = await prisma.$transaction(async (tx) => {
      for (const window of windows) {
        const attempts = await tx.auditLog.count({ where: { action: "AUTH_ATTEMPT", recordLabel: window.key, createdAt: { gte: window.since } } });
        if (attempts >= window.limit) return false;
      }
      for (const { key } of windows) await tx.auditLog.create({ data: { actorType: "SYSTEM", action: "AUTH_ATTEMPT", recordLabel: key } });
      return true;
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 5000 });
  } catch (error) {
    if (!["P2034", "P2028", "P1008"].includes(error.code)) throw error;
  }
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } });
  return null;
}
