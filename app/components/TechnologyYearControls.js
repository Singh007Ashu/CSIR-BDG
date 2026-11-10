"use client";

import { useMemo, useState } from "react";
import { formatFinancialYear, currentFinancialYear } from "../../lib/financialYear";

export function technologyYears(items) {
  return [...new Set(items.flatMap((item) => [item.recordFinancialYear, ...(item.financialYearData || []).map((row) => row.financialYear)]).filter(Boolean))].sort((a, b) => b - a);
}

export function TechnologyYearBadge({ technology }) {
  const years = technologyYears([technology]);
  if (!years.length) return <span className="badge neutral">Undated legacy</span>;
  return <span className="badge year-badge">{years.length === 1 ? `FY ${formatFinancialYear(years[0])}` : `FY ${formatFinancialYear(years.at(-1))} to ${formatFinancialYear(years[0])}`}</span>;
}

export function YearDataEditor({ technology, onSaved, readOnly = false }) {
  const [form, setForm] = useState({ financialYear: formatFinancialYear(technology.recordFinancialYear || currentFinancialYear()), recordType: "ROYALTY_RECEIVED", royaltyAmountLakhs: "", royaltyRatePercent: "", commercialProductionValueLakhs: "", sector: technology.sector || "", notes: "" });
  const [message, setMessage] = useState("");
  const [editingId,setEditingId]=useState(null),[busy,setBusy]=useState(false);
  function editRow(row){setEditingId(row.id);setForm({...row,financialYear:formatFinancialYear(row.financialYear),royaltyAmountLakhs:row.royaltyAmountLakhs??"",royaltyRatePercent:row.royaltyRatePercent??"",commercialProductionValueLakhs:row.commercialProductionValueLakhs??"",sector:row.sector||"",notes:row.notes||""});setMessage("Editing the existing row. Change the year below, then save.");}
  const rows = technology.financialYearData || [];
  async function save() {
    if(busy||readOnly)return;setBusy(true);try{
    const response = await fetch("/api/technologies/year-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editingId, technologyId: technology.id }) });
    const body = await response.json(); setMessage(response.ok ? `FY ${formatFinancialYear(body.financialYear)} data saved.` : body.error);
    if (response.ok) onSaved?.();
    }catch(error){setMessage("Unable to save. Your entries are preserved; please retry.");}finally{setBusy(false);}
  }
  async function remove(id) {
    if (!confirm("Remove this financial-year row? The technology itself will remain unchanged.")) return;
    const response = await fetch(`/api/technologies/year-data?id=${id}`, { method: "DELETE" }); const body = await response.json();
    setMessage(response.ok ? "Financial-year row removed." : body.error); if (response.ok) onSaved?.();
  }
  return <section className="year-data-editor"><div className="section-row"><div><span className="eyebrow">Annual commercial data</span><h3>Financial-year history</h3></div><span className="badge">{rows.length} entries</span></div>
    {rows.length > 0 && <div className="year-data-list">{rows.map((row) => <article key={row.id}><div><strong>FY {formatFinancialYear(row.financialYear)}</strong><span>{row.recordType === "ROYALTY_RECEIVED" ? "Royalty received" : "Commercial production · no royalty"}</span></div><div>{row.recordType === "ROYALTY_RECEIVED" ? <><b>₹{Number(row.royaltyAmountLakhs || 0).toLocaleString("en-IN")} lakh</b><small>{row.royaltyRatePercent == null ? "Rate not supplied" : `${row.royaltyRatePercent}% of net sales`}</small></> : <><b>₹{Number(row.commercialProductionValueLakhs || 0).toLocaleString("en-IN")} lakh</b><small>Estimated commercial production</small></>}</div>{!readOnly && <div className="row-actions"><button type="button" className="btn secondary small" disabled={busy} onClick={()=>editRow(row)}>Edit year / figures</button><button type="button" className="text-button danger-text" onClick={() => remove(row.id)}>Remove</button></div>}</article>)}</div>}
    {!rows.length && <p className="empty compact">No year-wise figures yet. Legacy technology details remain unchanged.</p>}
    {!readOnly && <><div className="annual-entry-grid"><div><label>Financial year</label><input type="text" placeholder="2025-26" aria-label="Financial year" value={form.financialYear} onChange={(event) => setForm({ ...form, financialYear: event.target.value })}/></div><div><label>Commercial record type</label><select value={form.recordType} onChange={(event) => setForm({ ...form, recordType: event.target.value })}><option value="ROYALTY_RECEIVED">Royalty received</option><option value="COMMERCIAL_NO_ROYALTY">Commercial production — no royalty</option></select></div><div><label>Sector</label><input value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}/></div>
      {form.recordType === "ROYALTY_RECEIVED" ? <><div><label>Royalty received (₹ lakh)</label><input type="number" min="0" step="0.01" value={form.royaltyAmountLakhs} onChange={(event) => setForm({ ...form, royaltyAmountLakhs: event.target.value })}/></div><div><label>Royalty rate (% of net sales)</label><input type="number" min="0" max="100" step="0.01" value={form.royaltyRatePercent} onChange={(event) => setForm({ ...form, royaltyRatePercent: event.target.value })}/></div></> : <div><label>Estimated commercial production (₹ lakh)</label><input type="number" min="0" step="0.01" value={form.commercialProductionValueLakhs} onChange={(event) => setForm({ ...form, commercialProductionValueLakhs: event.target.value })}/></div>}
      <div className="wide"><label>Notes</label><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/></div>
    </div>{message && <p className="form-message">{message}</p>}<button type="button" className="btn green small" disabled={busy} onClick={save}>{busy?"Saving…":editingId?"Save changes to this year":"Save financial-year row"}</button>{editingId&&<button type="button" className="btn secondary small" disabled={busy} onClick={()=>{setEditingId(null);setForm({financialYear:formatFinancialYear(currentFinancialYear()),recordType:"ROYALTY_RECEIVED",royaltyAmountLakhs:"",royaltyRatePercent:"",commercialProductionValueLakhs:"",sector:technology.sector||"",notes:""});setMessage("");}}>Cancel edit / add another year</button>}</>}
    {readOnly && <p className="meta">Laboratory-submitted figures. Use Request Changes to ask the laboratory for corrections.</p>}
  </section>;
}

export function YearImportPanel({ selectedLabId, manager, onImported, onClose }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const formatLabel = useMemo(() => preview?.format === "ROYALTY_RECEIVED" ? "Royalty received" : preview?.format === "COMMERCIAL_NO_ROYALTY" ? "Commercial production — no royalty" : "", [preview]);
  async function upload(mode) {
    if (!file) return setMessage("Choose an XLSX file first.");
    if (manager && !selectedLabId) return setMessage("Select one laboratory in the list filter before uploading.");
    setBusy(true); const data = new FormData(); data.set("file", file); data.set("mode", mode); if (selectedLabId) data.set("labId", selectedLabId);
    const response = await fetch("/api/technologies/year-data/import", { method: "POST", body: data }); const body = await response.json(); setPreview(body);
    setMessage(response.ok ? mode === "preview" ? "Validation preview ready. Review it before importing." : `Saved ${body.annualRowsSaved} annual rows; created ${body.technologiesCreated} new draft technologies.` : body.error); setBusy(false);
    if (response.ok && mode === "commit") onImported?.();
  }
  return <section className="card year-import-panel"><div className="section-row"><div><span className="eyebrow">Backdated Excel intake</span><h3>Upload financial-year technology data</h3><p>Supports both supplied formats: royalties received, and commercial production with no royalty. Upload does not alter unrelated legacy records.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close upload panel">×</button></div>
    <div className="year-import-actions"><input type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); }}/><button type="button" className="btn secondary" disabled={busy} onClick={() => upload("preview")}>{busy ? "Checking…" : "Preview validation"}</button>{preview?.valid > 0 && preview?.errors === 0 && <button type="button" className="btn green" disabled={busy} onClick={() => upload("commit")}>Import valid rows</button>}</div>
    {message && <div className="notice">{message}</div>}{preview && !preview.error && <div className="import-summary"><span><b>{formatLabel}</b>Detected format</span><span><b>{preview.valid}</b>Valid rows</span><span><b>{preview.matched}</b>Matched technologies</span><span><b>{preview.newTechnologies}</b>New drafts</span><span><b>{preview.errors}</b>Errors</span></div>}
    {preview?.errorDetails?.length > 0 && <div className="table-wrap compact-table"><table><thead><tr><th>Row</th><th>Technology</th><th>Validation issue</th></tr></thead><tbody>{preview.errorDetails.map((error) => <tr key={error.row}><td>{error.row}</td><td>{error.technology}</td><td>{error.errors.join("; ")}</td></tr>)}</tbody></table></div>}
  </section>;
}

