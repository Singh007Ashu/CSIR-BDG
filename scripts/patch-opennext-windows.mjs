import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bundleTarget = path.resolve("node_modules", "@opennextjs", "cloudflare", "dist", "cli", "build", "bundle-server.js");
const bundleOriginal = `        external: ["./middleware/handler.mjs"],`;
const bundleReplacement = `        external: ["./middleware/handler.mjs", "cloudflare:workers"],`;
const bundleContent = await readFile(bundleTarget, "utf8");
if (bundleContent.includes(bundleReplacement)) {
  console.log("OpenNext native Cloudflare module external already active.");
} else if (bundleContent.includes(bundleOriginal)) {
  await writeFile(bundleTarget, bundleContent.replace(bundleOriginal, bundleReplacement), "utf8");
  console.log("Applied OpenNext native Cloudflare module external.");
} else {
  throw new Error("Installed OpenNext server bundler changed; update the native module patch.");
}

if (process.platform !== "win32") process.exit(0);

const target = path.resolve("node_modules", "@opennextjs", "aws", "dist", "build", "copyTracedFiles.js");
const original = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }`;
const replacement = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code === "EPERM" && process.platform === "win32") {
                    symlinkSync(symlink, to, "junction");
                }
                else if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }`;

const content = await readFile(target, "utf8");
if (content.includes(replacement)) {
  console.log("OpenNext Windows junction fallback already active.");
} else if (content.includes(original)) {
  await writeFile(target, content.replace(original, replacement), "utf8");
  console.log("Applied OpenNext Windows junction fallback.");
} else {
  throw new Error("Installed OpenNext copy routine changed; use WSL for the Cloudflare build.");
}