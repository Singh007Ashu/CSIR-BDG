"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DocumentManager from "../../components/DocumentManager";

const deliverableTypes = ["Prototype", "Patent", "Software", "Product", "Process", "Report", "Publication", "Technology Package"];

export default function CoDevelopmentDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [edit, setEdit] = useState({});
  const [commercial, setCommercial] = useState({});
  const [deliverable, setDeliverable] = useState({ type: "Prototype", title: "", description: "", dueDate: "" });
  const [message, setMessage] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  async function load() {
    const [response, labAuth] = await Promise.all([fetch(`/api/co-development/${id}`), fetch("/api/lab-auth/me").then((row) => row.json()).catch(() => ({}))]);
    const data = await response.json();
    setProject(data);
    setEdit(data);
    setCommercial(data.commercialization || {});
    setCanEdit(Boolean(labAuth.lab));
  }
  useEffect(() => { load(); }, [id]);

  async function saveProject(event) { event.preventDefault(); const response = await fetch(`/api/co-development/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) }); setMessage(response.ok ? "Project details updated." : (await response.json()).error); if (response.ok) load(); }
  async function saveCommercial(event) { event.preventDefault(); const response = await fetch(`/api/co-development/${id}/commercialization`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(commercial) }); setMessage(response.ok ? "Commercialization details updated." : (await response.json()).error); if (response.ok) load(); }
  async function addDeliverable(event) { event.preventDefault(); const response = await fetch(`/api/co-development/${id}/deliverables`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deliverable) }); if (response.ok) { setDeliverable({ type: "Prototype", title: "", description: "", dueDate: "" }); load(); } }
  async function complete(item) { await fetch(`/api/co-development/${id}/deliverables`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: item.status === "COMPLETED" ? "PLANNED" : "COMPLETED" }) }); load(); }

  if (!project) return <div className="container"><p className="empty">Loading project…</p></div>;
  if (project.error) return <div className="container"><p className="notice danger-text">{project.error}</p></div>;

  const booleanFields = [["royaltyApplicable", "Royalty"], ["licensing", "Licensing"], ["technologyTransfer", "Technology Transfer"], ["patentFiled", "Patent Filed"], ["patentGranted", "Patent Granted"], ["startupCreated", "Startup Created"]];
  const detailFields = [["Technology area", project.technologyArea], ["PI", project.piName], ["Co-PI", project.coPiName], ["Duration", project.duration], ["Funding agency", project.fundingAgency], ["Payment status", project.paymentStatus], ["Total project cost", project.totalProjectCost == null ? null : `₹${Number(project.totalProjectCost).toLocaleString("en-IN")}`], ["Industry contribution", project.industryContribution == null ? null : `₹${Number(project.industryContribution).toLocaleString("en-IN")}`]];

  return <div className="container wide-container">
    <p><a className="link" href="/co-development">← Back to projects</a></p>
    <div className="page-heading"><div><span className="eyebrow">{canEdit ? "Laboratory data entry" : "HEAD oversight"}</span><h2 className="section-title">{project.title}</h2><p className="section-sub">{project.projectId} · {project.lab.name} · {project.company.name}</p></div><span className="badge">{project.status}</span></div>
    {!canEdit && <div className="notice"><strong>Read-only HEAD view.</strong> This record is maintained by CSIR-{project.lab.code}. If data is incomplete, use Laboratory Monitoring to request corrections.</div>}
    {message && <div className="notice">{message}</div>}

    {!canEdit ? <>
      <div className="grid-2">
        <section className="card"><h3>Project details</h3><div className="record-detail-grid">{detailFields.map(([label,value])=><p key={label}><small>{label}</small><strong>{value || "Not provided"}</strong></p>)}</div><p><strong>Objectives</strong><br/>{project.objectives || "Not provided"}</p><p><strong>Scope of work</strong><br/>{project.scopeOfWork || "Not provided"}</p><p><strong>Milestones</strong><br/>{project.milestones || "Not provided"}</p></section>
        <section className="card"><h3>Commercialization snapshot</h3><div className="module-kpis">{booleanFields.map(([key,label])=><span key={key}>{label}: <strong>{commercial[key] ? "Yes" : "No"}</strong></span>)}</div><div className="record-detail-grid"><p><small>Commercial partner</small><strong>{commercial.commercialPartner || "Not provided"}</strong></p><p><small>Market status</small><strong>{commercial.marketStatus || "Not provided"}</strong></p><p><small>Stage</small><strong>{commercial.stage || "Not provided"}</strong></p><p><small>Revenue generated</small><strong>{commercial.revenueGenerated == null ? "Not provided" : `₹${Number(commercial.revenueGenerated).toLocaleString("en-IN")}`}</strong></p></div></section>
      </div>
    </> : <div className="grid-2">
      <form className="card" onSubmit={saveProject}><h3>Project Details</h3>{[["title", "Project Title"], ["technologyArea", "Technology Area"], ["piName", "PI"], ["coPiName", "Co-PI"], ["duration", "Duration"], ["fundingAgency", "Funding Agency"], ["paymentStatus", "Payment Status"], ["status", "Project Status"]].map(([key, label]) => <div key={key}><label>{label}</label><input value={edit[key] || ""} onChange={(event) => setEdit({ ...edit, [key]: event.target.value })} /></div>)}<label>Objectives</label><textarea value={edit.objectives || ""} onChange={(event) => setEdit({ ...edit, objectives: event.target.value })} /><label>Scope of Work</label><textarea value={edit.scopeOfWork || ""} onChange={(event) => setEdit({ ...edit, scopeOfWork: event.target.value })} /><label>Milestones</label><textarea value={edit.milestones || ""} onChange={(event) => setEdit({ ...edit, milestones: event.target.value })} /><button className="btn">Save Details</button></form>
      <form className="card" onSubmit={saveCommercial}><h3>Commercialization</h3><div className="check-grid">{booleanFields.map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={Boolean(commercial[key])} onChange={(event) => setCommercial({ ...commercial, [key]: event.target.checked })} /> {label}</label>)}</div>{[["royaltyDetails", "Royalty Details"], ["equity", "Equity"], ["revenueSharing", "Revenue Sharing"], ["commercialPartner", "Commercial Partner"], ["marketStatus", "Market Status"], ["stage", "Commercialization Stage"], ["trl", "TRL"], ["revenueGenerated", "Revenue Generated"]].map(([key, label]) => <div key={key}><label>{label}</label><input type={["trl", "revenueGenerated"].includes(key) ? "number" : "text"} value={commercial[key] ?? ""} onChange={(event) => setCommercial({ ...commercial, [key]: event.target.value })} /></div>)}<button className="btn purple">Save Commercialization</button></form>
    </div>}

    <div className="card"><div className="section-row"><div><h3>Deliverables</h3><p className="meta">{project.deliverables.length} recorded item(s)</p></div></div>{canEdit && <form className="inline-form" onSubmit={addDeliverable}><select value={deliverable.type} onChange={(event) => setDeliverable({ ...deliverable, type: event.target.value })}>{deliverableTypes.map((type) => <option key={type}>{type}</option>)}</select><input required placeholder="Deliverable title" value={deliverable.title} onChange={(event) => setDeliverable({ ...deliverable, title: event.target.value })} /><input type="date" value={deliverable.dueDate} onChange={(event) => setDeliverable({ ...deliverable, dueDate: event.target.value })} /><button className="btn small">Add</button></form>}{project.deliverables.length ? project.deliverables.map((item) => <div className="doc-row" key={item.id}><div><strong>{item.type}: {item.title}</strong><p className="meta">{item.status} · Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "not set"}</p></div>{canEdit && <button className="btn secondary small" onClick={() => complete(item)}>{item.status === "COMPLETED" ? "Reopen" : "Complete"}</button>}</div>) : <p className="empty compact">No deliverables entered.</p>}</div>
    <div className="card"><DocumentManager entityType="CODEV_PROJECT" entityId={project.id} canManage={canEdit} /></div>
  </div>;
}

