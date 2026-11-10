import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { runJsonProcess } from "./boundedProcess";

const capacityKey = Symbol.for("csir.documentParser.capacity");
const capacity = globalThis[capacityKey] ||= { active: 0 };

export async function runDocumentParser(payload, options = {}) {
  if (process.env.DOCUMENT_PARSER_MODE && !["container", "process"].includes(process.env.DOCUMENT_PARSER_MODE)) throw new Error("Invalid document parser mode.");
  // A burst must not spawn an unbounded number of 256 MB containers. This limit
  // is per Node service; production ingress also needs a distributed rate limit.
  if (capacity.active >= 2) { const error = new Error("Document processing is busy. Please retry shortly."); error.code = "PARSER_BUSY"; throw error; }
  capacity.active++;
  try { return await executeParser(payload, options); }
  finally { capacity.active--; }
}

async function executeParser(payload, options) {
  const legacy=/\.(doc|xls|ppt)$/i.test(String(payload.fileName||''));
  if(legacy && (process.env.DOCUMENT_PARSER_MODE!=='container'||!process.env.LEGACY_PARSER_IMAGE))throw new Error('Legacy Office analysis requires the dedicated conversion sandbox. Convert to DOCX, XLSX or PPTX.');
  const limits = { timeoutMs: legacy?30000:15000, ...options };
  if (process.env.DOCUMENT_PARSER_MODE !== "container") {
    return runJsonProcess(process.execPath, ["--max-old-space-size=128", path.join(process.cwd(), "scripts", "document-extract-worker.cjs")], payload, limits);
  }
  const name = "csir-parser-" + randomUUID();
  const binary = process.env.DOCKER_BIN || "docker";
  const connection = process.platform === "win32" ? ["--host", "npipe:////./pipe/dockerDesktopLinuxEngine"] : [];
  const memory=legacy?'512m':'256m';
  const args = [...connection, "run", "--rm", "--pull=never", "--name", name, "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pids-limit=64", "--memory="+memory, "--memory-swap="+memory, "--cpus=1", "--user=65532:65532", "--tmpfs", legacy?"/tmp:rw,noexec,nosuid,size=64m":"/tmp:rw,noexec,nosuid,size=16m", "-i", legacy?process.env.LEGACY_PARSER_IMAGE:(process.env.DOCUMENT_PARSER_IMAGE || "csir-document-parser:review")];
  try { return await runJsonProcess(binary, args, payload, limits); }
  finally {
    // Kill only this generated job, including after CLI timeout/disconnection.
    await new Promise(resolve => execFile(binary, [...connection, "rm", "-f", name], { windowsHide: true, timeout: 5000 }, () => resolve()));
  }
}
