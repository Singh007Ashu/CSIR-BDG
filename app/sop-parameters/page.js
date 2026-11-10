"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SopInstructorWorkspace from "../components/SopInstructorWorkspace";

const managerRoles = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
const emptyParameter = { key: "", label: "", fieldType: "TEXT", mandatory: false, sopStageId: "", displayOrder: 0 };

export default function SopParametersPage({ initialTab = "roadmap" }) {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyParameter);
  const [editingStage, setEditingStage] = useState(null);
  const [editingRaci, setEditingRaci] = useState(null);

  async function load() {
    const [frameworkResponse, authResponse] = await Promise.all([fetch("/api/sop"), fetch("/api/auth/me")]);
    const framework = await frameworkResponse.json();
    const auth = authResponse.ok ? await authResponse.json() : {};
    setData(framework);
    setMe(auth.user || null);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const manager = managerRoles.includes(me?.role);

  async function addParameter(event) {
    event.preventDefault();
    const response = await fetch("/api/parameters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    setMessage(response.ok ? "Parameter added to the active framework." : body.error);
    if (response.ok) { setForm(emptyParameter); await load(); }
  }

  async function toggle(parameter) {
    const response = await fetch("/api/parameters/" + parameter.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !parameter.active }) });
    const body = await response.json();
    setMessage(response.ok ? "Parameter updated without deleting historical data." : body.error);
    if (response.ok) await load();
  }

  async function saveStage(event) {
    event.preventDefault();
    const response = await fetch("/api/sop/stages/" + editingStage.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingStage) });
    const body = await response.json();
    setMessage(response.ok ? editingStage.code + " updated by Head & Admin." : body.error);
    if (response.ok) { setEditingStage(null); await load(); }
  }

  async function saveRaci(event) {
    event.preventDefault();
    const response = await fetch("/api/raci/" + editingRaci.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingRaci) });
    const body = await response.json();
    setMessage(response.ok ? "RACI ownership updated with an audit entry." : body.error);
    if (response.ok) { setEditingRaci(null); await load(); }
  }

  if (!data) return <div className="container"><p className="empty">Loading SOP framework…</p></div>;
  const sop = data.sops[0];
  const stages = data.sops.flatMap((item) => item.stages);

  return <div className="container wide-container">
    <div className="governance-hero"><div><span className="eyebrow">Reference and role control</span><h2>SOP Roadmap</h2><p>This area explains stages, evidence and ownership only. Laboratory data entry is kept in a separate, shorter workspace.</p></div><div className="hero-actions"><Link className="btn" href="/sop-data-entry">Open SOP Data Entry</Link><span className="badge success">{sop?.code || "SOP"} · v{sop?.version || "1.0"}</span></div></div>
    {message && <div className="notice">{message}</div>}
    <div className="subtabs governance-tabs">
      <button className={tab === "roadmap" ? "active" : ""} onClick={() => setTab("roadmap")}>Operational SOP Guide</button>
      <button className={tab === "sop" ? "active" : ""} onClick={() => setTab("sop")}>SOP Stage Control</button>
      <button className={tab === "parameters" ? "active" : ""} onClick={() => setTab("parameters")}>Technology Parameters</button>
      <button className={tab === "raci" ? "active" : ""} onClick={() => setTab("raci")}>Roles & Responsibilities</button>
    </div>

    {tab === "roadmap" && <SopInstructorWorkspace definitions={data.instructor || []} />}

    {tab === "sop" && <section>
      <div className="section-row"><div><h3>SOP Stage Control</h3><p className="meta">Only Head & Admin can edit stage purpose, mandatory status and R/A/C/I ownership.</p></div><span className="filter-chip">{stages.length} ordered stages</span></div>
      <div className="stage-control-list">{stages.map((stage) => <article className="card stage-control" key={stage.id}><div className="stage-heading"><div><span className="badge">{stage.code}</span><h3>{stage.name}</h3></div><div className="row-actions"><span className={"badge " + (stage.mandatoryForNew ? "success" : "warning")}>{stage.mandatoryForNew ? "Mandatory for new" : "Optional"}</span>{manager && <button className="btn secondary small" onClick={() => setEditingStage({ ...stage })}>Edit Stage</button>}</div></div><p>{stage.objective}</p><div className="raci-strip"><div><small>R</small><span>{stage.responsibleUnit || "Unassigned"}</span></div><div><small>A</small><span>{stage.accountableUnit || "Unassigned"}</span></div><div><small>C</small><span>{stage.consultedUnits || "—"}</span></div><div><small>I</small><span>{stage.informedUnits || "—"}</span></div></div></article>)}</div>
      {editingStage && <div className="modal-backdrop" onClick={() => setEditingStage(null)}><form className="editor-modal" onSubmit={saveStage} onClick={(event) => event.stopPropagation()}><div className="detail-header"><div><span className="eyebrow">Head decision</span><h3>Edit {editingStage.code}</h3></div><button type="button" className="icon-button" onClick={() => setEditingStage(null)}>×</button></div><label>Stage Name</label><input required value={editingStage.name} onChange={(event) => setEditingStage({ ...editingStage, name: event.target.value })} /><label>Objective</label><textarea value={editingStage.objective || ""} onChange={(event) => setEditingStage({ ...editingStage, objective: event.target.value })} /><div className="grid-2"><div><label>Responsible</label><input value={editingStage.responsibleUnit || ""} onChange={(event) => setEditingStage({ ...editingStage, responsibleUnit: event.target.value })} /></div><div><label>Accountable</label><input value={editingStage.accountableUnit || ""} onChange={(event) => setEditingStage({ ...editingStage, accountableUnit: event.target.value })} /></div><div><label>Consulted</label><input value={editingStage.consultedUnits || ""} onChange={(event) => setEditingStage({ ...editingStage, consultedUnits: event.target.value })} /></div><div><label>Informed</label><input value={editingStage.informedUnits || ""} onChange={(event) => setEditingStage({ ...editingStage, informedUnits: event.target.value })} /></div></div><label className="check"><input type="checkbox" checked={editingStage.mandatoryForNew} onChange={(event) => setEditingStage({ ...editingStage, mandatoryForNew: event.target.checked })} /> Mandatory for new technology submissions</label><div className="row-actions"><button className="btn green">Save Head Decision</button><button type="button" className="btn secondary" onClick={() => setEditingStage(null)}>Cancel</button></div></form></div>}
    </section>}

    {tab === "parameters" && <section>
      <div className="section-row"><div><h3>Technology Parameters</h3><p className="meta">Versioned fields attached to SOP stages. Historical data is preserved when a parameter is deactivated.</p></div></div>
      {manager && <details className="card parameter-builder"><summary><strong>+ Add Technology Parameter</strong></summary><form onSubmit={addParameter}><div className="grid-3"><div><label>Key</label><input required value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} /></div><div><label>Label</label><input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></div><div><label>Field Type</label><select value={form.fieldType} onChange={(event) => setForm({ ...form, fieldType: event.target.value })}>{["TEXT", "TEXTAREA", "NUMBER", "SELECT", "DATE", "BOOLEAN", "FILE"].map((value) => <option key={value}>{value}</option>)}</select></div><div><label>SOP Stage</label><select value={form.sopStageId} onChange={(event) => setForm({ ...form, sopStageId: event.target.value })}><option value="">None</option>{stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.code} · {stage.name}</option>)}</select></div><label className="check"><input type="checkbox" checked={form.mandatory} onChange={(event) => setForm({ ...form, mandatory: event.target.checked })} /> Mandatory</label></div><button className="btn green">Add Parameter</button></form></details>}
      <div className="table-wrap"><table><thead><tr><th>Parameter</th><th>Type</th><th>Scope</th><th>SOP</th><th>Mandatory</th>{manager && <th>Action</th>}</tr></thead><tbody>{data.parameters.map((parameter) => <tr key={parameter.id}><td><strong>{parameter.label}</strong><br /><span className="meta">{parameter.key} · v{parameter.version}</span></td><td>{parameter.fieldType}</td><td>{parameter.project?.name || "CSIR-wide"}</td><td>{parameter.sopStage?.code || "—"}</td><td>{parameter.mandatory ? "Yes" : "No"}</td>{manager && <td><button className="btn secondary small" onClick={() => toggle(parameter)}>{parameter.active ? "Deactivate" : "Activate"}</button></td>}</tr>)}</tbody></table></div>
    </section>}

    {tab === "raci" && <section>
      <div className="section-row"><div><h3>Roles & Responsibilities Ownership</h3><p className="meta">Separate ownership register. R = executes, A = final authority, C = consulted before decision, I = informed after decision.</p></div><span className="filter-chip">{data.raci.length} activities</span></div>
      <div className="role-summary">{data.units.map((unit) => <span key={unit}>{unit}</span>)}</div>
      <div className="table-wrap"><table className="raci-table"><thead><tr><th>Activity</th><th><span className="raci-letter r">R</span> Responsible</th><th><span className="raci-letter a">A</span> Accountable</th><th><span className="raci-letter c">C</span> Consulted</th><th><span className="raci-letter i">I</span> Informed</th>{manager && <th></th>}</tr></thead><tbody>{data.raci.map((item) => <tr key={item.id}><td><strong>{item.activity}</strong></td><td>{item.responsibleUnit}</td><td>{item.accountableUnit}</td><td>{item.consultedUnits || "—"}</td><td>{item.informedUnits || "—"}</td>{manager && <td><button className="btn secondary small" onClick={() => setEditingRaci({ ...item })}>Edit</button></td>}</tr>)}</tbody></table></div>
      {editingRaci && <div className="modal-backdrop" onClick={() => setEditingRaci(null)}><form className="editor-modal" onSubmit={saveRaci} onClick={(event) => event.stopPropagation()}><div className="detail-header"><div><span className="eyebrow">Role assignment</span><h3>Edit RACI Ownership</h3></div><button type="button" className="icon-button" onClick={() => setEditingRaci(null)}>×</button></div><label>Activity</label><input required value={editingRaci.activity} onChange={(event) => setEditingRaci({ ...editingRaci, activity: event.target.value })} /><label>Responsible (R)</label><input required value={editingRaci.responsibleUnit} onChange={(event) => setEditingRaci({ ...editingRaci, responsibleUnit: event.target.value })} /><label>Accountable (A)</label><input required value={editingRaci.accountableUnit} onChange={(event) => setEditingRaci({ ...editingRaci, accountableUnit: event.target.value })} /><label>Consulted (C)</label><input value={editingRaci.consultedUnits || ""} onChange={(event) => setEditingRaci({ ...editingRaci, consultedUnits: event.target.value })} /><label>Informed (I)</label><input value={editingRaci.informedUnits || ""} onChange={(event) => setEditingRaci({ ...editingRaci, informedUnits: event.target.value })} /><div className="row-actions"><button className="btn green">Save RACI</button><button type="button" className="btn secondary" onClick={() => setEditingRaci(null)}>Cancel</button></div></form></div>}
    </section>}
  </div>;
}
