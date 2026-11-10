"use client";

import { useEffect, useState } from "react";

async function responseBody(response) {
  const text = await response.text();
  if (!text) return { error: "The server returned an empty response. Check the development terminal for details." };
  try { return JSON.parse(text); }
  catch { return { error: "The server could not process this workbook. Please download and use the approved CSIR XLSX template." }; }
}

export default function ExcelTemplatesPage() {
  const [data, setData] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/sop").then(responseBody).then(setData).catch(() => setMessage("Unable to load template metadata."));
  }, []);

  async function upload(mode) {
    if (!file) return setMessage("Choose an XLSX file first.");
    setBusy(true);
    setMessage(mode === "preview" ? "Validating workbook…" : "Importing validated rows…");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      const response = await fetch("/api/excel/import", { method: "POST", body: form });
      const body = await responseBody(response);
      setPreview(body);
      setMessage(response.ok ? (mode === "preview" ? "Validation preview complete. No database changes were made." : "Imported " + body.imported + " draft technologies.") : body.error);
    } catch {
      setMessage("Upload failed before the server responded. Confirm the app is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="container">
    <div className="governance-hero">
      <div><span className="eyebrow">Controlled data exchange</span><h2>Data Templates & Imports</h2><p>Download the approved workbook, enter data only in its controlled sheets, preview every validation issue, then commit valid rows.</p></div>
      <a className="btn green" href="/api/excel/template">Download Approved Template</a>
    </div>
    {message && <div className="notice">{message}</div>}
    <div className="workflow-steps">
      <div><span>1</span><strong>Download</strong><small>Use the approved 13-sheet workbook</small></div>
      <div><span>2</span><strong>Complete</strong><small>Enter rows in Master_Register</small></div>
      <div><span>3</span><strong>Preview</strong><small>Review fields, lists and duplicates</small></div>
      <div><span>4</span><strong>Commit</strong><small>Create drafts only after a clean preview</small></div>
    </div>
    <div className="grid-2">
      <section className="card">
        <h3>Active Template</h3>
        {data?.templates?.map((template) => <p key={template.id}><strong>{template.name}</strong><br /><span className="meta">Version {template.version} · effective {new Date(template.effectiveFrom).toLocaleDateString()}</span></p>)}
        <p className="meta">Required import sheet: <strong>Master_Register</strong>. Uploading the laboratory master source workbook directly will be rejected with the detected sheet names.</p>
        <div className="row-actions"><a className="btn secondary small" href="/api/excel/export?type=master">Technology Register</a><a className="btn secondary small" href="/api/excel/export?type=monthly">Monthly</a><a className="btn secondary small" href="/api/excel/export?type=quarterly">Quarterly</a><a className="btn secondary small" href="/api/excel/export?type=queries">Queries</a></div>
      </section>
      <section className="card upload-workspace">
        <h3>Validate / Import XLSX</h3>
        <p className="meta">Maximum 5 MB. Preview never changes the database. Commit stays disabled until the latest preview has zero errors.</p>
        <label className="drop-zone"><input type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setMessage(""); }} /><strong>{file ? file.name : "Choose an XLSX workbook"}</strong><span>{file ? Math.ceil(file.size / 1024) + " KB selected" : "Click to browse"}</span></label>
        <div className="row-actions"><button className="btn" disabled={busy || !file} onClick={() => upload("preview")}>{busy ? "Working…" : "Preview Validation"}</button><button className="btn green" disabled={busy || !preview || preview.errors > 0 || !preview.valid} onClick={() => upload("commit")}>Commit Valid File</button></div>
        {preview && <div className="validation-summary"><div><strong>{preview.rowsDetected || 0}</strong><span>Rows</span></div><div className="valid"><strong>{preview.valid || 0}</strong><span>Valid</span></div><div className={preview.errors ? "invalid" : "valid"}><strong>{preview.errors || 0}</strong><span>Errors</span></div></div>}
        {preview?.detectedSheets && <p className="danger-text">Detected sheets: {preview.detectedSheets.join(", ")}</p>}
        {preview?.missingColumns && <p className="danger-text">Missing columns: {preview.missingColumns.join(", ")}</p>}
        {preview?.warning && <p className="meta">{preview.warning}</p>}
        {preview?.errorDetails?.length > 0 && <details><summary>Show validation errors ({preview.errorDetails.length})</summary>{preview.errorDetails.map((item) => <p key={item.row} className="danger-text">Row {item.row} · {item.technology}: {item.errors.join("; ")}</p>)}</details>}
      </section>
    </div>
  </div>;
}
