import { spawn } from "node:child_process";

// No shell, bounded output and one cleanup path for every child-process outcome.
export function runJsonProcess(command, args, payload, { timeoutMs = 30000, maxOutputBytes = 2 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false, size = 0, errors = 0;
    const output = [];
    // Parsers do not need database credentials, signing secrets or API keys.
    const env = {};
    for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "LANG", "LC_ALL", "PYTHONHOME", "PYTHONPATH"]) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true, shell: false, env });
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) child.kill();
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("Document worker timed out.")), timeoutMs);
    child.on("error", () => finish(new Error("Document worker unavailable.")));
    child.stdin.on("error", () => finish(new Error("Document worker input failed.")));
    child.stdout.on("data", chunk => {
      size += chunk.length;
      if (size > maxOutputBytes) return finish(new Error("Document worker output exceeds limit."));
      output.push(chunk);
    });
    child.stderr.on("data", chunk => {
      errors += chunk.length;
      if (errors > 65536) finish(new Error("Document worker error output exceeds limit."));
    });
    child.on("close", code => {
      if (settled) return;
      if (code !== 0) return finish(new Error("Document worker failed."));
      try { finish(null, JSON.parse(Buffer.concat(output).toString("utf8"))); }
      catch { finish(new Error("Document worker returned invalid JSON.")); }
    });
    try { child.stdin.end(JSON.stringify(payload)); }
    catch { finish(new Error("Document worker input is invalid.")); }
  });
}
