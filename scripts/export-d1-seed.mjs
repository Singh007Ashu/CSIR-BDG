import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const outputPath = path.resolve("prisma", "d1", "seed.sql");
const credentialsPath = path.resolve("prisma", "d1", "initial-credentials.json");
const PBKDF2_ITERATIONS = 100000;
let credentials = [];
try { credentials = JSON.parse(await readFile(credentialsPath, "utf8")); } catch {}
const credentialMap = new Map(credentials.map((item) => [item.login, item.password]));

function identifier(value) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return "'" + value.toISOString().replaceAll("'", "''") + "'";
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return "X'" + Buffer.from(value).toString("hex") + "'";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  const safeText = text
    .replace(/\$2[aby]\$[^"'\\\s]+/g, "[REDACTED]")
    .replace(/("(?:password|passwordHash|passwordSalt|resetToken|resetTokenHash)"\s*:\s*")[^"]*"/gi, '$1[REDACTED]"');
  return "'" + safeText.replaceAll("'", "''") + "'";
}

function workerSafeRow(tableName, sourceRow) {
  if (!String(sourceRow.passwordHash || "").startsWith("$2")) return sourceRow;
  const login = sourceRow.email || sourceRow.officialEmail || sourceRow.labId || `${tableName}-${sourceRow.id}`;
  let password = credentialMap.get(login);
  if (!password) {
    password = `${randomBytes(18).toString("base64url")}aA1!`;
    credentials.push({ accountType: tableName, login, password });
    credentialMap.set(login, password);
  }
  const salt = randomBytes(16);
  return {
    ...sourceRow,
    passwordHash: pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256").toString("hex"),
    passwordSalt: salt.toString("hex"),
  };
}

try {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
  );
  const lines = [
    "-- Generated from prisma/dev.db for the first Cloudflare D1 deployment.",
    "-- INSERT OR IGNORE makes an accidental second seed non-destructive.",
    "PRAGMA defer_foreign_keys = ON;",
    "BEGIN TRANSACTION;",
    "",
  ];
  let totalRows = 0;

  for (const { name } of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${identifier(name)}`);
    if (!rows.length) continue;
    lines.push(`-- ${name}: ${rows.length} row(s)`);
    for (const sourceRow of rows) {
      const row = workerSafeRow(name, sourceRow);
      const columns = Object.keys(row);
      lines.push(
        `INSERT OR IGNORE INTO ${identifier(name)} (${columns.map(identifier).join(", ")}) VALUES (${columns.map((column) => sqlValue(row[column])).join(", ")});`
      );
    }
    lines.push("");
    totalRows += rows.length;
  }

  lines.push("COMMIT;", "");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join("\n"), "utf8");
  if (credentials.length) await writeFile(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, "utf8");
  console.log(`D1 seed generated: ${totalRows} rows -> ${outputPath}`);
  if (credentials.length) console.log(`Cloudflare temporary credentials: ${credentials.length} account(s) -> ${credentialsPath}`);
} finally {
  await prisma.$disconnect();
}
