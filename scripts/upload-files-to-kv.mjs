import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MAX_VALUE = 25 * 1024 * 1024;
const MAX_TOTAL = 1024 * 1024 * 1024;
const roots = [
  { directory: path.resolve("FICCI"), prefix: "FICCI" },
  { directory: path.resolve("storage"), prefix: "" },
];

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result;
}

const uploads = [];
for (const root of roots) {
  for (const filePath of await walk(root.directory)) {
    const relative = path.relative(root.directory, filePath).replaceAll("\\", "/");
    if (!root.prefix && relative.startsWith("source/")) continue;
    const info = await stat(filePath);
    if (info.size > MAX_VALUE) throw new Error(`${filePath} exceeds the Cloudflare KV 25 MiB per-file limit.`);
    uploads.push({
      filePath,
      key: [root.prefix, relative].filter(Boolean).join("/"),
      size: info.size,
    });
  }
}

const total = uploads.reduce((sum, item) => sum + item.size, 0);
if (total > MAX_TOTAL) throw new Error("Files exceed the Workers KV free storage limit of 1 GB.");
if (uploads.length > 1000) throw new Error("Files exceed the Workers KV free daily write limit of 1,000.");

const runner = process.platform === "win32" ? "npx.cmd" : "npx";
for (let index = 0; index < uploads.length; index += 1) {
  const item = uploads[index];
  console.log(`[${index + 1}/${uploads.length}] ${item.key}`);
  const result = spawnSync(runner, [
    "wrangler", "kv", "key", "put", item.key,
    "--path", item.filePath,
    "--binding", "FILES",
    "--remote",
  ], { stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`KV upload failed for ${item.key}`);
}
console.log(`Uploaded ${uploads.length} files (${(total / 1024 / 1024).toFixed(1)} MB) to FILES KV.`);
