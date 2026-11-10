"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CommercialEngagementForm from "../../components/CommercialEngagementForm";
import DocumentManager from "../../components/DocumentManager";
import { ENGAGEMENT_TYPES } from "../../../lib/commercialPricing";

const managerRoles = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
const money = (value) => value === null || value === undefined ? "—" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function ReadOnlyRecord({ record }) {
  const facts = [
    ["Proposer", record.proposerName], ["Designation / department", record.designationDepartment], ["Client", record.clientName],
    ["Client address", record.clientAddress], ["Team", record.teamMembers], ["Knowledge product / service type", record.knowledgeProductType],
    ["Scope / service details", record.serviceDetails], ["Work packages", record.phasesWorkPackages], ["Timeline", record.timeline],
    ["Deliverables", record.deliverables], ["Client benefits", record.clientBenefits], ["Inventors", record.inventors],
    ["Patent applied", record.patentApplied === null ? null : record.patentApplied ? "Yes" : "No"], ["Patent details", record.patentDetails],
    ["Pre-licensing evaluated", record.preLicensingEvaluated === null ? null : record.preLicensingEvaluated ? "Yes" : "No"], ["TRL", record.trl],
    ["Biological resources", record.biologicalResources === null ? null : record.biologicalResources ? "Yes" : "No"], ["Territory", record.territory],
    ["Licence nature", record.licenseNature], ["Other information", record.otherInformation],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return <div className="editorial-card record-readonly"><h2>Proposal record</h2><div className="record-facts">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{String(value).replaceAll("_", " ")}</strong></div>)}</div>{record.engagementType === "TECHNOLOGY_TRANSFER" ? <div className="pricing-summary compact"><div className="accent"><span>Proposed fee</span><strong>{money(record.feeProposed)}</strong></div><div><span>Comparable market price</span><strong>{money(record.similarMarketPrice)}</strong></div><div><span>Annual client benefit</span><strong>{money(record.annualClientBenefit)}</strong></div></div> : <div className="pricing-summary compact"><div><span>Direct expenditure</span><strong>{money(record.directExpenditureTotal)}</strong></div><div><span>Laboratory share</span><strong>{money(record.laboratoryShareAmount)}</strong></div><div><span>Project fee</span><strong>{money(record.projectFeeAmount)}</strong></div><div><span>GST</span><strong>{money(record.gstAmount)}</strong></div><div className="accent"><span>Total charges</span><strong>{money(record.totalCharges)}</strong></div></div>}</div>;
}

export default function CommercialEngagementDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState(null), [technologies, setTechnologies] = useState([]), [user, setUser] = useState(null), [lab, setLab] = useState(null), [message, setMessage] = useState(""), [remarks, setRemarks] = useState(""), [saving, setSaving] = useState(false);
  async function load() {
    const [row, techRows, auth, labAuth] = await Promise.all([fetch(`/api/commercial-engagements/${id}`).then((response) => response.json()), fetch("/api/technologies?scope=MASTER").then((response) => response.json()), fetch("/api/auth/me").then((response) => response.json()).catch(() => ({})), fetch("/api/lab-auth/me").then((response) => response.json()).catch(() => ({}))]);
    setRecord(row); setTechnologies(Array.isArray(techRows) ? techRows : []); setUser(auth.user || null); setLab(labAuth.lab || null); setRemarks(row.headRemarks || "");
  }
  useEffect(() => { load(); }, [id]);
  if (!record) return <div className="container"><p className="empty">Loading commercial pricing record…</p></div>;
  if (record.error) return <div className="container"><p className="notice">{record.error}</p><a href="/commercial-engagements">Back to pricing</a></div>;
  const manager = managerRoles.includes(user?.role);
  const editable = Boolean(lab && ["DRAFT", "RETURNED"].includes(record.status));
  async function save(form, submit) {
    setSaving(true); const response = await fetch(`/api/commercial-engagements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, submit }) }); const body = await response.json(); setSaving(false); setMessage(response.ok ? (submit ? "Submitted to Head BDG." : "Draft updated.") : body.error || "Update failed."); if (response.ok) load();
  }
  async function decide(action) {
    if (["RETURN", "REJECT"].includes(action) && !remarks.trim()) return setMessage("Remarks are required when returning or rejecting a case.");
    setSaving(true); const response = await fetch(`/api/commercial-engagements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, headRemarks: remarks }) }); const body = await response.json(); setSaving(false); setMessage(response.ok ? `Decision recorded: ${action}.` : body.error || "Decision failed."); if (response.ok) load();
  }
  return <div className="container wide-container commercial-page"><p><a className="link" href="/commercial-engagements">← Back to commercial pricing</a></p><section className="record-hero"><div><span className="eyebrow">{ENGAGEMENT_TYPES[record.engagementType]}</span><h2>{record.title}</h2><p>{record.referenceNo} · CSIR-{record.lab.code} · {record.technology.name}</p></div><span className={`badge ${record.status === "APPROVED" ? "success" : record.status === "SUBMITTED" ? "warning" : ""}`}>{record.status}</span></section>{message && <div className="notice">{message}</div>}
    {editable ? <CommercialEngagementForm initial={{ ...record, technologyId: String(record.technologyId) }} technologies={technologies} lockedType onSave={save} saving={saving} /> : <ReadOnlyRecord record={record} />}
    {manager && record.status === "SUBMITTED" && <section className="decision-dock editorial-card"><div><span className="eyebrow">Head BDG decision</span><h2>Review commercial pricing</h2><p>Approve, return for correction, or reject. Remarks are mandatory for return and rejection.</p></div><textarea placeholder="Decision remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} /><div className="row-actions"><button className="btn secondary" disabled={saving} onClick={() => decide("RETURN")}>Return for changes</button><button className="btn danger" disabled={saving} onClick={() => decide("REJECT")}>Reject</button><button className="btn" disabled={saving} onClick={() => decide("APPROVE")}>Approve pricing</button></div></section>}
    {record.headRemarks && <section className="editorial-card decision-note"><span>Head BDG remarks</span><p>{record.headRemarks}</p>{record.decidedBy && <small>{record.decidedBy.name} · {record.decidedBy.role}</small>}</section>}
    <section className="editorial-card"><DocumentManager entityType="COMMERCIAL_ENGAGEMENT" entityId={record.id} canManage={editable} /></section>
  </div>;
}
