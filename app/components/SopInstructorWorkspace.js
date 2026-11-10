"use client";

import CspElement from "./CspElement";
import { useEffect, useMemo, useState } from "react";

function calculate(stageCode, raw) {
  const data = { ...raw };
  const n = (key) => Number.isFinite(Number(data[key])) ? Number(data[key]) : 0;
  if (stageCode === "SOP-03") {
    data.balance = n("amountDue") - n("amountReceived");
    const due = data.dueDate ? new Date(data.dueDate) : null;
    const end = data.dateReceived ? new Date(data.dateReceived) : new Date();
    data.delayDays = due && !Number.isNaN(due.getTime()) && !Number.isNaN(end.getTime()) ? Math.max(0, Math.floor((end - due) / 86400000)) : 0;
  }
  if (stageCode === "SOP-06") {
    const keys = ["directFinancialRealisation", "futureRevenueRoyalty", "industryAdoption", "strategicRelevance", "socialImpactScore", "environmentalImpactScore", "importExportPotential", "scalability", "intangibleValue"];
    data.totalScore = keys.reduce((sum, key) => sum + n(key), 0);
    data.category = data.totalScore > 75 ? "Category A - High" : data.totalScore >= 50 ? "Category B - Moderate" : data.totalScore >= 30 ? "Category C - Emerging" : "Category D - Monitor";
  }
  if (stageCode === "SOP-07") { data.balance = n("amountDue") - n("actualRealised"); data.realisationRatio = n("amountDue") > 0 ? Number((n("actualRealised") * 100 / n("amountDue")).toFixed(2)) : 0; }
  if (stageCode === "SOP-08") data.variance = n("committedAmountDue") - n("actualRealised");
  return data;
}

function list(items) { return <ul className="instruction-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>; }

export default function SopInstructorWorkspace({ definitions, entryOnly = false }) {
  const [payload, setPayload] = useState(null);
  const [stageCode, setStageCode] = useState(definitions[0]?.code || "SOP-01");
  const [labId, setLabId] = useState("");
  const [technologyId, setTechnologyId] = useState("");
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [sourceRecordId, setSourceRecordId] = useState(null);
  const [section, setSection] = useState(entryOnly ? "form" : "instructions");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [historyRecord, setHistoryRecord] = useState(null);

  const definition = definitions.find((item) => item.code === stageCode) || definitions[0];
  const calculatedForm = useMemo(() => calculate(stageCode, form), [stageCode, form]);

  async function load(next = {}) {
    const query = new URLSearchParams();
    const nextStage = next.stageCode ?? stageCode;
    const nextLab = next.labId ?? labId;
    const nextTechnology = next.technologyId ?? technologyId;
    if (nextStage) query.set("stageCode", nextStage);
    if (nextLab) query.set("labId", nextLab);
    if (nextTechnology) query.set("technologyId", nextTechnology);
    const response = await fetch(`/api/sop-records?${query}`);
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Unable to load SOP workspace."); return; }
    setPayload(body);
    if (!nextLab && body.selectedLabId) setLabId(String(body.selectedLabId));
    if (next.resetForm) { setForm(body.prefill || {}); setEditingId(null); setSourceRecordId(null); setReason(""); }
    return body;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialStage = definitions.some((item) => item.code === params.get("stage")) ? params.get("stage") : stageCode;
    const initialLab = params.get("lab") || "";
    setStageCode(initialStage); setLabId(initialLab);
    load({ stageCode: initialStage, labId: initialLab, resetForm: true });
  }, []);

  async function selectStage(code) {
    setStageCode(code); setTechnologyId(""); setSection(entryOnly ? "form" : "instructions"); setMessage(""); setErrors([]);
    await load({ stageCode: code, technologyId: "", resetForm: true });
    document.getElementById("sop-operator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function selectLab(value) {
    setLabId(value); setTechnologyId(""); setEditingId(null); setForm({});
    await load({ labId: value, technologyId: "", resetForm: true });
  }

  async function selectTechnology(value) {
    setTechnologyId(value); setEditingId(null); setReason("");
    const body = await load({ technologyId: value, resetForm: true });
    if (body?.prefill) setForm(body.prefill);
  }

  function editRecord(record) {
    setStageCode(record.recordType); setLabId(String(record.labId)); setTechnologyId(record.technologyId ? String(record.technologyId) : "");
    setForm(record.data || {}); setEditingId(record.id); setReason(""); setErrors([]); setMessage(`Editing revision ${record.revision} of ${record.recordType}.`); setSection("form");
    document.getElementById("sop-operator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reusePrevious() {
    setForm((current) => ({ ...current, ...(payload?.prefill || {}) }));
    const source = payload?.records?.find((record) => record.technologyId === Number(technologyId));
    setSourceRecordId(source?.id || null); setMessage("Reusable values were copied from the latest governed records. Review them before saving.");
  }

  async function save(action) {
    setBusy(true); setMessage(""); setErrors([]);
    const response = await fetch("/api/sop-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, stageCode, labId, technologyId, data: calculatedForm, action, reason, sourceRecordId }) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(body.error || "Unable to save SOP record."); setErrors(body.errors || []); if (body.calculated) setForm(body.calculated); return; }
    setEditingId(body.record.id); setForm(body.calculated || body.record.data); setMessage(action === "SUBMIT" ? "SOP record submitted with an immutable audit-history entry." : "Draft saved with version history.");
    await load({ labId, stageCode, technologyId });
  }

  if (!payload || !definition) return <p className="empty">Loading operational SOP guide...</p>;
  const selectedLab = payload.labs.find((item) => item.id === Number(labId));
  const selectedTechnology = payload.technologies.find((item) => item.id === Number(technologyId));
  const progress = definitions.findIndex((item) => item.code === stageCode) + 1;
  const visibleRecords = payload.records.filter((record) => record.recordType === stageCode);
  const canDraft = payload.permissions.canDraft;
  const canSubmit = payload.permissions.canSubmit;

  const navigation = entryOnly ? [["form", canDraft ? "Enter / Update Data" : "View Submitted Data"], ["history", "Submission History"], ["instructions", "Quick Instructions"]] : [["instructions","Overview"],["fields","Required Fields"],["evidence","Evidence"],["bdg","BDG Action"],["completion","Completion / Next"]];
  return <div className={`sop-instructor ${entryOnly ? "sop-entry-only" : ""}`}>
    <div className="sop-progress"><div><strong>{progress} of {definitions.length}</strong><span>{definition.code} operational step</span></div><div className="progress-track"><CspElement as="i" css={{ width: `${progress * 100 / definitions.length}%` }} /></div><span>{Math.round(progress * 100 / definitions.length)}%</span></div>
    <div className="sop-stage-grid">{definitions.map((item, index) => <article className={`sop-stage-card ${item.code === stageCode ? "selected" : ""}`} key={item.code}><div><span className="stage-number">{String(index + 1).padStart(2, "0")}</span><span className="badge">{item.annexure}</span></div><h4>{item.name}</h4>{!entryOnly && <p>{item.whatFor}</p>}<button className="btn secondary small" onClick={() => selectStage(item.code)}>{item.code === stageCode ? (entryOnly ? "Selected" : "Open Step") : (entryOnly ? "Enter Data" : "Start SOP")}</button></article>)}</div>

    <section className="sop-operator" id="sop-operator">
      <aside className="sop-guide-nav"><span className="eyebrow">{definition.code} {entryOnly ? "data entry" : "operator guide"}</span><h3>{definition.name}</h3><p>{entryOnly ? "Select a technology, enter the required fields and submit directly to HEAD BDG." : definition.whenUse}</p>{navigation.map(([key,label]) => <button key={key} className={section === key ? "active" : ""} onClick={() => setSection(key)}>{label}<span aria-hidden="true">›</span></button>)}</aside>
      <div className="sop-guide-content">
        <div className="sop-guide-header"><div><span className="badge success">{definition.code} · {definition.annexure}</span><h3>{definition.name}</h3></div><div className="owner-chips"><span><small>Responsible</small>{definition.who.responsible}</span><span><small>Supporting</small>{definition.who.supporting}</span></div></div>
        {message && <div className="notice">{message}</div>}{errors.length > 0 && <div className="notice error-notice"><strong>Validation issues</strong>{list(errors)}</div>}

        {section === "instructions" && <div className="instruction-sections"><article><span>A</span><div><h4>What this SOP is for</h4><p>{definition.whatFor}</p></div></article><article><span>B</span><div><h4>When to use it</h4><p>{definition.whenUse}</p></div></article><article><span>C</span><div><h4>Who performs it</h4><p><strong>Responsible:</strong> {definition.who.responsible}<br/><strong>Supporting:</strong> {definition.who.supporting}</p></div></article><article><span>D</span><div><h4>Prerequisites</h4>{list(definition.prerequisites)}</div></article><article><span>E</span><div><h4>Step-by-step</h4><ol>{definition.steps.map((item) => <li key={item}>{item}</li>)}</ol></div></article><article><span>G</span><div><h4>What not to enter</h4>{list(definition.doNotEnter)}</div></article><article><span>I</span><div><h4>System checks</h4>{list(definition.systemChecks)}</div></article><article><span>J</span><div><h4>Submission</h4><p>{definition.submission}</p></div></article></div>}

        {section === "fields" && <div><div className="section-row"><div><span className="eyebrow">Section F</span><h3>Exact {definition.annexure} fields</h3><p className="meta">Fields retain the supplied workbook structure. Calculated values are locked.</p></div></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Excel Field</th><th>Required</th><th>Entry Guidance</th></tr></thead><tbody>{definition.fields.map((item,index) => <tr key={item.key}><td>{index+1}</td><td><strong>{item.label}</strong>{item.calculated && <><br/><span className="badge success">Auto calculated</span></>}</td><td>{item.mandatory ? "Yes" : "No"}</td><td>{item.guidance}</td></tr>)}</tbody></table></div></div>}

        {section === "evidence" && <div className="guide-panel"><span className="eyebrow">Section H</span><h3>Evidence required</h3>{list(definition.evidence)}<div className="callout"><strong>Evidence rule</strong><p>Use a stable evidence reference. Lab BD confirms laboratory-source monetary information; PI or the relevant authorised source confirms technical/impact evidence.</p></div></div>}
        {section === "bdg" && <div className="guide-panel"><span className="eyebrow">Section K</span><h3>BDG action</h3><p>{definition.bdgAction}</p><div className="bdg-boundary"><strong>BDG may</strong><span>Monitor · analyse · consolidate · flag · query · escalate</span><strong>BDG does not</strong><span>Perform accounting · certify receipts · process payments</span></div></div>}
        {section === "completion" && <div className="guide-panel"><span className="eyebrow">Sections L and M</span><h3>Completion condition</h3><p>{definition.completion}</p>{definition.next ? <button className="btn green" onClick={() => selectStage(definition.next)}>Continue to {definition.next} →</button> : <div className="callout"><strong>Roadmap complete</strong><p>Continue periodic review and preserve all historical versions.</p></div>}</div>}

        {section === "form" && <div className="sop-form-panel"><div className="section-row"><div><span className="eyebrow">Enter once · reuse later</span><h3>{editingId ? `Update record #${editingId}` : `Start ${definition.code}`}</h3><p className="meta">Role: {payload.role}. Laboratory ownership and calculated values are enforced by the server.</p></div>{technologyId && <button className="btn secondary small" type="button" onClick={reusePrevious}>Reuse Previous Data</button>}</div>
          <div className="grid-2 sop-context-selectors"><div><label>Laboratory</label><select aria-label="Laboratory" value={labId} disabled={payload.labs.length === 1} onChange={(event) => selectLab(event.target.value)}><option value="">Select laboratory</option>{payload.labs.map((item) => <option value={item.id} key={item.id}>CSIR-{item.code} — {item.name}</option>)}</select></div><div><label>Technology</label><select aria-label="Technology" value={technologyId} onChange={(event) => selectTechnology(event.target.value)}><option value="">{definition.code === "SOP-10" ? "Not technology-specific" : "Select technology"}</option>{payload.technologies.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div></div>
          {!canDraft && <div className="notice">Your role can view instructions, fields, evidence and submitted records, but cannot enter laboratory source data for this stage.</div>}
          <div className="sop-field-grid">{definition.fields.map((item) => {
            const forced = item.key === "lab" ? selectedLab?.name || calculatedForm.lab || "" : item.key === "technology" ? selectedTechnology?.name || calculatedForm.technology || "" : calculatedForm[item.key] ?? "";
            const disabled = !canDraft || item.calculated || item.key === "lab" || item.key === "technology";
            return <div className={item.type === "textarea" ? "wide" : ""} key={item.key}><label>{item.label}{item.mandatory && <b> *</b>}{item.calculated && <span className="calculated-tag">Calculated</span>}</label>{item.type === "textarea" ? <textarea aria-label={item.label} value={forced} disabled={disabled} onChange={(event) => setForm({ ...form, [item.key]: event.target.value })} /> : item.type === "select" ? <select aria-label={item.label} value={forced} disabled={disabled} onChange={(event) => setForm({ ...form, [item.key]: event.target.value })}><option value="">Select</option>{item.options.map((option) => <option key={option}>{option}</option>)}</select> : <input aria-label={item.label} type={item.type === "number" ? "number" : item.type === "date" ? "date" : "text"} min={item.type === "number" ? "0" : undefined} value={forced} disabled={disabled} onChange={(event) => setForm({ ...form, [item.key]: event.target.value })} />}<small>{item.guidance}</small></div>})}</div>
          {editingId && <div><label>Reason for revision</label><textarea aria-label="Reason for revision" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required when revising a submitted record." /></div>}
          {canDraft && <div className="row-actions"><button className="btn secondary" disabled={busy || !labId} onClick={() => save("SAVE_DRAFT")}>{busy ? "Saving..." : "Save Draft"}</button><button className="btn green" disabled={busy || !labId || (!technologyId && definition.code !== "SOP-10") || !canSubmit} onClick={() => save("SUBMIT")}>{canSubmit ? "Validate & Submit" : "Lab BD / BDG submission required"}</button></div>}
        </div>}

        {section === "history" && <div><div className="section-row"><div><span className="eyebrow">Immutable audit trail</span><h3>{definition.code} submission history</h3></div><span className="filter-chip">{visibleRecords.length} records</span></div><div className="sop-history-list">{visibleRecords.map((record) => <article className="card" key={record.id}><div className="stage-heading"><div><span className={`badge ${record.status === "SUBMITTED" ? "success" : "warning"}`}>{record.status}</span><h4>{record.technology?.name || record.lab.name}</h4></div><span className="meta">Revision {record.revision}</span></div><p className="meta">CSIR-{record.lab.code} · Updated {new Date(record.updatedAt).toLocaleString()}</p><div className="row-actions"><button className="btn secondary small" onClick={() => editRecord(record)}>Open / Revise</button><button className="btn secondary small" onClick={() => setHistoryRecord(record)}>View {record.histories.length} History Entries</button></div></article>)}{!visibleRecords.length && <p className="empty compact">No records for this stage and laboratory yet.</p>}</div></div>}
      </div>
    </section>
    {historyRecord && <div className="modal-backdrop" onClick={() => setHistoryRecord(null)}><div className="editor-modal history-modal" onClick={(event) => event.stopPropagation()}><div className="detail-header"><div><span className="eyebrow">Record #{historyRecord.id}</span><h3>Version History</h3></div><button className="icon-button" aria-label="Close" onClick={() => setHistoryRecord(null)}>×</button></div>{historyRecord.histories.map((item) => <article className="history-entry" key={item.id}><div><strong>{item.action.replaceAll("_", " ")}</strong><span>{new Date(item.createdAt).toLocaleString()}</span></div>{item.reason && <p><strong>Reason:</strong> {item.reason}</p>}<p className="meta">Actor: {item.actorType}{item.actorUserId ? ` #${item.actorUserId}` : ""}{item.actorLabId ? ` lab #${item.actorLabId}` : ""}</p></article>)}</div></div>}
  </div>;
}
