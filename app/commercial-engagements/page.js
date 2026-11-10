"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CommercialEngagementForm, { emptyCommercialEngagement } from "../components/CommercialEngagementForm";
import { ENGAGEMENT_TYPES } from "../../lib/commercialPricing";

const managerRoles = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];

export default function CommercialEngagementsPage() {
  const [labFilter, setLabFilter] = useState("");
  const [records, setRecords] = useState([]), [technologies, setTechnologies] = useState([]), [showForm, setShowForm] = useState(false), [initial, setInitial] = useState(emptyCommercialEngagement), [q, setQ] = useState(""), [status, setStatus] = useState(""), [type, setType] = useState(""), [message, setMessage] = useState(""), [saving, setSaving] = useState(false), [canCreate, setCanCreate] = useState(false);
  async function load(overrides = {}) {
    const activeQ = overrides.q ?? q, activeStatus = overrides.status ?? status, activeType = overrides.type ?? type;
    const params = new URLSearchParams({ ...(activeQ ? { q: activeQ } : {}), ...(activeStatus ? { status: activeStatus } : {}), ...(activeType ? { type: activeType } : {}) });
    const [rows, techRows, user, lab] = await Promise.all([
      fetch(`/api/commercial-engagements?${params}`).then((response) => response.json()),
      fetch("/api/technologies?scope=MASTER").then((response) => response.json()),
      fetch("/api/auth/me").then((response) => response.json()).catch(() => ({})),
      fetch("/api/lab-auth/me").then((response) => response.json()).catch(() => ({})),
    ]);
    setRecords(Array.isArray(rows) ? rows : []); setTechnologies(Array.isArray(techRows) ? techRows : []);
    setCanCreate(Boolean(lab.lab));
  }
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const technologyId = urlParams.get("technologyId") || "", initialStatus = urlParams.get("status") || "", initialType = urlParams.get("type") || "";
    if (technologyId) { setInitial({ ...emptyCommercialEngagement, technologyId }); setShowForm(true); }
    setStatus(initialStatus); setType(initialType); load({ status: initialStatus, type: initialType });
  }, []);
  async function save(form, submit) {
    setSaving(true); setMessage("");
    const response = await fetch("/api/commercial-engagements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, submit }) });
    const body = await response.json();
    setSaving(false); setMessage(response.ok ? `${body.referenceNo} ${submit ? "submitted to Head BDG" : "saved as draft"}.` : body.error || "Unable to save record.");
    if (response.ok) { setShowForm(false); setInitial(emptyCommercialEngagement); load(); }
  }
  const submitted = records.filter((record) => record.status === "SUBMITTED").length;
  const approved = records.filter((record) => record.status === "APPROVED").length;
  const portfolio = useMemo(() => records.reduce((sum, record) => sum + Number(record.totalCharges || record.feeProposed || 0), 0), [records]);
  return <div className="container wide-container commercial-page">
    <section className="editorial-hero"><div><span className="eyebrow">Commercialisation workspace</span><h2>Pricing & Consultancy</h2><p>Technology-transfer, CNP and TSP pricing records linked to the master technology register—kept separate from Co-Development and MOU records.</p></div>{canCreate && <button className="btn" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "+ New pricing case"}</button>}</section>
    <div className="editorial-kpis"><div><span>Total cases</span><strong>{records.length}</strong></div><div><span>Awaiting Head BDG</span><strong>{submitted}</strong></div><div><span>Approved</span><strong>{approved}</strong></div><div><span>Recorded value</span><strong>₹{portfolio.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></div></div>
    {message && <div className="notice">{message}</div>}
    {showForm && canCreate && <CommercialEngagementForm initial={initial} technologies={technologies} onSave={save} saving={saving} />}
    {!canCreate && <section className="card"><h3>Laboratory pricing outputs</h3><p>Select a laboratory to see its technology pricing submissions. HEAD reviews submitted data and returns corrections to the laboratory.</p><div className="grid-3">{[...new Map(records.map(r=>[r.lab.id,r.lab])).values()].map(l=><button type="button" className="btn secondary" key={l.id} onClick={()=>setLabFilter(String(l.id))}>{l.name} · {records.filter(r=>r.lab.id===l.id).length} cases</button>)}</div><label>Laboratory<select aria-label="Laboratory filter" value={labFilter} onChange={e=>setLabFilter(e.target.value)}><option value="">All lab outputs</option>{[...new Map(records.map(r=>[r.lab.id,r.lab])).values()].map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label></section>}
    <form className="toolbar editorial-toolbar" onSubmit={(event) => { event.preventDefault(); load(); }}><input className="search-input grow" placeholder="Search reference, technology, title or client" value={q} onChange={(event) => setQ(event.target.value)} /><select aria-label="Record type filter" value={type} onChange={(event) => setType(event.target.value)}><option value="">All record types</option>{Object.entries(ENGAGEMENT_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "REJECTED"].map((item) => <option key={item}>{item}</option>)}</select><button className="btn small">Apply filters</button></form>
    {!records.length ? <div className="empty editorial-empty"><strong>No commercial pricing cases found.</strong><span>Laboratory submissions will appear here when available.</span></div> : <div className="commercial-record-grid">{records.filter(record=>!labFilter||String(record.lab.id)===labFilter).map((record) => <Link className="commercial-record" href={`/commercial-engagements/${record.id}`} key={record.id}><div className="record-top"><span className={`badge ${record.status === "APPROVED" ? "success" : record.status === "SUBMITTED" ? "warning" : ""}`}>{record.status}</span><span>{record.referenceNo}</span></div><h3>{record.title}</h3><p>{record.technology.name}</p><div className="record-meta"><span>CSIR-{record.lab.code}</span><span>{ENGAGEMENT_TYPES[record.engagementType]}</span><span>{record.clientName || "Client not set"}</span></div><footer><strong>{record.totalCharges || record.feeProposed ? `₹${Number(record.totalCharges || record.feeProposed).toLocaleString("en-IN")}` : "Pricing pending"}</strong><span>Open case →</span></footer></Link>)}</div>}
  </div>;
}
