import { spawn } from "node:child_process";
import path from "node:path";
import { patchCloudflareWorkerBundle } from "./patch-cloudflare-worker-bundle.mjs";

const args = process.argv.slice(2);
const cliPath = path.resolve("node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js");
const hookUrl = new URL("./register-cloudflare-workers-stub.mjs", import.meta.url).href;
const nodeOptions = [process.env.NODE_OPTIONS, `--import=${hookUrl}`].filter(Boolean).join(" ");
const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    CSIR_CLOUDFLARE_BUILD: "1",
    NODE_OPTIONS: nodeOptions,
  },
});

const code = await new Promise((resolve) => {
  child.on("error", (error) => {
    console.error(error);
    resolve(1);
  });
  child.on("exit", (exitCode) => resolve(exitCode ?? 1));
});

if (code === 0 && args[0] === "build") await patchCloudflareWorkerBundle();
process.exitCode = code;