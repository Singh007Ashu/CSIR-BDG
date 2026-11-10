import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function patchCloudflareWorkerBundle() {
  const target = path.resolve(".open-next", "server-functions", "default", "handler.mjs");
  const marker = `import { env as __csirCloudflareEnv } from "cloudflare:workers";`;
  const requireCall = `require("cloudflare:workers")`;
  const wasmSource = path.resolve("node_modules", "@csir", "d1-client", "internal", "query_compiler_bg.wasm");
  const wasmTarget = path.resolve(".open-next", "server-functions", "default", "query_compiler_bg.wasm");
  let content = await readFile(target, "utf8");
  let changed = false;

  if (!content.includes(marker)) {
    if (!content.includes(requireCall)) {
      throw new Error("Generated Worker no longer contains the expected Cloudflare env require call.");
    }
    content = `${marker}\n${content.replaceAll(requireCall, "({ env: __csirCloudflareEnv })")}`;
    changed = true;
  }

  const interopPattern = /([A-Za-z0-9_$]+)=([A-Za-z0-9_$]+)\.x\("cloudflare:workers",\(\)=>\(\{ env: __csirCloudflareEnv \}\),!0\);async function ([A-Za-z0-9_$]+)\(\)\{return \1\.env\|\|null\}/g;
  if (interopPattern.test(content)) {
    interopPattern.lastIndex = 0;
    content = content.replace(interopPattern, (_match, moduleVar, _runtimeVar, functionName) =>
      `${moduleVar}={env:__csirCloudflareEnv};async function ${functionName}(){return __csirCloudflareEnv||null}`
    );
    changed = true;
  }

  const absoluteWasmImport = /import\(["'][^"']*[@\\/]csir[\\/]d1-client[\\/]query_compiler_bg\.wasm\?module["']\)/g;
  if (absoluteWasmImport.test(content)) {
    absoluteWasmImport.lastIndex = 0;
    content = content.replace(absoluteWasmImport, 'import("./query_compiler_bg.wasm?module")');
    changed = true;
  }

  await copyFile(wasmSource, wasmTarget);

  if (changed) {
    await writeFile(target, content, "utf8");
    console.log("Applied Cloudflare native env bundle rewrite.");
  } else {
    console.log("Cloudflare native env bundle rewrite already active.");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"))) {
  await patchCloudflareWorkerBundle();
}