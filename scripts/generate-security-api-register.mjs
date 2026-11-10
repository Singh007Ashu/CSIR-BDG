import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "app", "api");
const output = path.join(root, "deployment", "security-api-register.csv");
const proxySource = fs.readFileSync(path.join(root, "proxy.js"), "utf8");
const publicBlock = proxySource.match(/const PUBLIC_APIS\s*=\s*\[([^\]]+)\]/);
const publicPaths = new Set([...(publicBlock?.[1].matchAll(/["']([^"']+)["']/g) || [])].map((match) => match[1]));
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const files = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (entry.isFile() && entry.name === "route.js") files.push(fullPath);
  }
}
function csv(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function referencedSources(source, file, visited = new Set()) {
  for (const match of source.matchAll(/export\s*\{[^}]+\}\s*from\s*["']([^"']+)["']/g)) {
    const target = path.resolve(path.dirname(file), match[1]);
    const candidates = [target, `${target}.js`, path.join(target, "route.js")];
    const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (found && !visited.has(found)) {
      visited.add(found);
      const child = fs.readFileSync(found, "utf8");
      referencedSources(child, found, visited);
    }
  }
  return [...visited].map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");
}

visit(apiRoot);
const rows = [["Route", "Method", "Static auth guard hints", "Object ownership review", "Dynamic auth/role/tenant test"]];
for (const file of files.sort()) {
  const source = fs.readFileSync(file, "utf8");
  const route = "/api/" + path.relative(apiRoot, path.dirname(file)).split(path.sep).join("/").replace(/\[\.\.\.([^\]]+)\]/g, "$1*").replace(/\[([^\]]+)\]/g, ":$1");
  const found = new Set();
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) found.add(match[1] || match[2]);
  for (const block of source.matchAll(/export\s*\{([^}]+)\}\s*from\s*["'][^"']+["']/g)) {
    for (const method of block[1].split(",").map((value) => value.trim().split(/\s+as\s+/)[0])) if (methods.has(method)) found.add(method);
  }
  const guardSource = source + "\n" + referencedSources(source, file);
  const helpers = [...new Set((guardSource.match(/\b(?:requireAnyAuth|requireRole|requireRoleOrLab|requireLabAuth|requireUserAuth|requireUser|requireLab|getSession|isManager|isAdmin|canActForUnit)\b/g) || []))].sort();
  const guardHints = [publicPaths.has(route) ? "proxy allows unauthenticated request; route-level review" : "proxy requires session", ...helpers].join("; ");
  for (const method of [...found].sort()) rows.push([route, method, guardHints, "Pending reviewer sign-off", "Not recorded in generated inventory"]);
}
fs.writeFileSync(output, rows.map((row) => row.map(csv).join(",")).join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} route/method rows from ${files.length} route files: ${path.relative(root, output)}`);
