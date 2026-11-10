import { runJsonProcess } from "./boundedProcess";
import path from "node:path";

function fallback(payload) {
  const words = (value) => new Set(String(value || "").toLowerCase().match(/[a-z0-9][a-z0-9+./-]{2,}/g) || []);
  const need = words([payload.title, payload.description, payload.text].join(" "));
  const matches = payload.technologies.map((row) => {
    const corpus = [row.name,row.briefDescription,row.advantages,row.applications,row.keyFeatures,row.theme,row.sector,row.technologyType].join(" ");
    const common = [...words(corpus)].filter((word) => need.has(word));
    const trl = Number(row.trl) || 0;
    const ready = trl >= 7 || /commercial|transfer|market|production/i.test(row.commercialisationStage || "");
    return { technologyId: row.id, name: row.name, labCode: row.lab?.code, labName: row.lab?.name, score: Math.min(100, common.length * 8 + trl * 2.5 + (ready ? 12 : 0)), matchedTerms: common.slice(0,15), readiness: ready ? "Ready to sell / transfer" : "Needs technical/commercial review", trl: row.trl, commercialisationStage: row.commercialisationStage, reason: common.length ? `Requirement terms matched: ${common.slice(0,8).join(", ")}` : "Readiness-based candidate" };
  }).filter((row) => row.score >= 18).sort((a,b)=>b.score-a.score).slice(0,15);
  return { engine: "JAVASCRIPT_FALLBACK", needKeywords: [...need].slice(0,30), matches };
}

export async function matchIndustryNeed(payload) {
  if (process.env.NEXT_RUNTIME === "edge") return fallback(payload);
  const script = path.join(process.cwd(), "python", "matchmaking.py");
  const bundledPython = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe") : null;
  const candidates = process.env.PYTHON_BIN ? [process.env.PYTHON_BIN] : (process.platform === "win32" ? [bundledPython, "python", "py"].filter(Boolean) : ["python3", "python"]);
  for (const command of candidates) {
    try {
      const result = await runJsonProcess(command, command === "py" ? ["-3", script] : [script], payload, { timeoutMs: 20000 });
      return result;
    } catch {}
  }
  return fallback(payload);
}

export async function extractIndustryFileWithPython(fileName, bytes) {
  if (process.env.DOCUMENT_PARSER_MODE === "container") throw new Error("Document could not be parsed in the isolated worker. Convert legacy files to XLSX; unsafe host parsing is disabled.");
  const script = path.join(process.cwd(), "python", "matchmaking.py");
  const bundledPython = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe") : null;
  const candidates = process.env.PYTHON_BIN ? [process.env.PYTHON_BIN] : (process.platform === "win32" ? [bundledPython, "python", "py"].filter(Boolean) : ["python3", "python"]);
  for (const command of candidates) {
    try {
      return await runJsonProcess(command, command === "py" ? ["-3", script] : [script], { mode: "extract", fileName, base64: Buffer.from(bytes).toString("base64") });
    } catch {}
  }
  throw new Error("The spreadsheet could not be extracted by the local or Python parser.");
}
