import { writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const packageDir = path.resolve("node_modules", "@csir", "d1-client");
await build({
  entryPoints: [path.join(packageDir, "client.ts")],
  outfile: path.join(packageDir, "client.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  external: ["*.wasm?module"],
  legalComments: "none",
});

const packageJson = {
  name: "@csir/d1-client",
  private: true,
  type: "module",
  exports: { ".": "./client.js" },
};
await writeFile(path.join(packageDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
console.log("Prepared bundled @csir/d1-client package boundary.");