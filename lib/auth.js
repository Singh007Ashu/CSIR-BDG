import { sessionSecret } from "./securityPolicy";
export const SESSION_COOKIE = "csir_bdg_session";
const DEFAULT_TTL = 60 * 60 * 8;

export async function credentialVersion(hash) { return sign("credential:" + String(hash || "")); }


function toBase64Url(bytes) {
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function sign(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(payload, ttlSeconds = DEFAULT_TTL) {
  const now = Date.now();
  const fullPayload = { ...payload, jti: crypto.randomUUID(), iat: now, exp: now + ttlSeconds * 1000 };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, supplied] = parts;
  const expected = await sign(encoded);
  if (!safeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)));
    if (!Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) || Date.now() >= payload.exp || payload.iat > Date.now() + 60000 || payload.exp - payload.iat > DEFAULT_TTL * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  // Production remains secure by default. Local `next start` over plain HTTP
  // can opt out explicitly; HTTPS deployments must not set this to false.
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DEFAULT_TTL,
};
