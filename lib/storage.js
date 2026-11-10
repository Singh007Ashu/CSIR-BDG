import { validateUploadBytes } from "./uploadValidation";
import { scanUpload } from "./malwareScan";
import path from "path";
import { mkdir, writeFile, readFile, stat, realpath, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { getCloudflareEnv } from "./cloudflare-env.js";

export const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "zip", "png", "jpg", "jpeg", "txt", "json", "xml", "md", "tsv"]);
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const STORAGE_ROOT = process.env.UPLOAD_ROOT ? path.resolve(process.env.UPLOAD_ROOT) : path.join(process.cwd(), "storage");
export const FICCI_ROOT = process.env.FICCI_ROOT ? path.resolve(process.env.FICCI_ROOT) : path.join(process.cwd(), "FICCI");

async function filesBinding() {
  return (await getCloudflareEnv())?.FILES || null;
}

function storageKey(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || /[:\x00-\x1f]/.test(normalized) || normalized.split("/").some((part) => !part || part === "." || part === ".." || /[. ]$/.test(part))) throw new Error("Invalid storage path.");
  return normalized;
}

export function extensionOf(name) { return path.extname(String(name)).slice(1).toLowerCase(); }
export function assertAllowedFile(file) {
  const extension = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error(`Unsupported file type: .${extension || "unknown"}`);
  if (file.size > MAX_FILE_SIZE) throw new Error("Each file must be 5 MB or smaller.");
  if (file.size <= 0) throw new Error("Empty files are not allowed.");
  return extension;
}

export async function saveUpload(file, entityType, entityId) {
  if (entityType === "LAB_PROFILE" && !["ppt", "pptx"].includes(extensionOf(file.name))) throw new Error("Laboratory profiles accept PPT or PPTX files only.");
  const extension = assertAllowedFile(file);
  if (!/^[A-Z_]+$/.test(entityType) || !Number.isSafeInteger(Number(entityId)) || Number(entityId) < 1) throw new Error("Invalid upload destination.");
  const folder = ["uploads", entityType.toLowerCase(), String(entityId)].join("/");
  const storedName = `${randomUUID()}.${extension}`;
  const relativePath = `${folder}/${storedName}`;
  const bytes = await file.arrayBuffer();
  await validateUploadBytes(bytes, extension);
  await scanUpload(bytes);
  const kv = await filesBinding();
  if (kv) {
    await kv.put(relativePath, bytes, {
      metadata: {
        size: bytes.byteLength,
        mimeType: file.type || "application/octet-stream",
        originalName: String(file.name || "").slice(0, 300),
      },
    });
    return { extension, relativePath };
  }

  const diskFolder = path.resolve(STORAGE_ROOT, folder);
  if (!diskFolder.startsWith(STORAGE_ROOT + path.sep)) throw new Error("Invalid storage path.");
  await mkdir(diskFolder, { recursive: true });
  await assertRealContainment(STORAGE_ROOT, diskFolder);
  await writeFile(path.join(/* turbopackIgnore: true */ diskFolder, storedName), Buffer.from(bytes), { flag: "wx" });
  return { extension, relativePath };
}

export function resolveStoredPath(relativePath) {
  const normalized = storageKey(relativePath);
  const isFicci = normalized === "FICCI" || normalized.startsWith("FICCI/");
  const root = isFicci ? FICCI_ROOT : STORAGE_ROOT;
  const child = isFicci ? normalized.replace(/^FICCI\/?/, "") : normalized;
  const resolved = path.resolve(root, child);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Invalid storage path.");
  return resolved;
}

export async function readStoredFile(relativePath) {
  const key = storageKey(relativePath);
  const kv = await filesBinding();
  if (kv) {
    const { value, metadata } = await kv.getWithMetadata(key, "arrayBuffer");
    if (!value) {
      const error = new Error("Stored file was not found.");
      error.code = "ENOENT";
      throw error;
    }
    return { bytes: Buffer.from(value), info: { size: metadata?.size ?? value.byteLength, metadata: metadata || {} } };
  }
  const fullPath = resolveStoredPath(relativePath);
  await assertRealContainment(key.startsWith("FICCI/") ? FICCI_ROOT : STORAGE_ROOT, fullPath);
  return { bytes: await readFile(/* turbopackIgnore: true */ fullPath), info: await stat(/* turbopackIgnore: true */ fullPath) };
}

async function assertRealContainment(root, target) {
  const [base, actual] = await Promise.all([realpath(root), realpath(target)]);
  const relative = path.relative(base, actual);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw new Error("Storage link escapes its configured directory.");
}

// Compensation is restricted to newly generated upload names, never arbitrary paths.
export async function discardNewUpload(relativePath) {
  const key = storageKey(relativePath);
  if (!/^uploads\/[a-z_]+\/[1-9]\d*\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(key)) throw new Error("Invalid upload cleanup path.");
  const kv = await filesBinding();
  if (kv) { await kv.delete(key); return; }
  const target = resolveStoredPath(key);
  try { await assertRealContainment(STORAGE_ROOT, target); await unlink(target); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

export async function ensureStorageFolder(relativePath) {
  if (await filesBinding()) return;
  const fullPath = path.resolve(STORAGE_ROOT, storageKey(relativePath));
  if (!fullPath.startsWith(STORAGE_ROOT + path.sep)) throw new Error("Invalid storage path.");
  await mkdir(fullPath, { recursive: true });
  await assertRealContainment(STORAGE_ROOT, fullPath);
}
