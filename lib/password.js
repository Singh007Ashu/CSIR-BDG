import bcrypt from "bcryptjs";

const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(password)), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256
  );
  const passwordHash = Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const passwordSalt = Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { passwordHash, passwordSalt };
}

export async function verifyPassword(password, passwordHash, passwordSalt) {
  if (!passwordHash) return false;
  if (passwordHash.startsWith("$2")) return bcrypt.compare(String(password), passwordHash);
  if (!passwordSalt) return false;
  const salt = Uint8Array.from(passwordSalt.match(/.{1,2}/g) || [], (hex) => parseInt(hex, 16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(password)), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256
  );
  const computed = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  if (computed.length !== passwordHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i += 1) mismatch |= computed.charCodeAt(i) ^ passwordHash.charCodeAt(i);
  return mismatch === 0;
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "Password must include uppercase, lowercase, number, and special character.";
  }
  return null;
}
