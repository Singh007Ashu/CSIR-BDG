"use client";

import CspElement from "../components/CspElement";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const metricCards = [
  ["totalTechnologies", "All Technologies", "Complete lab-wise master register", "all"],
  ["legacyMasterRecords", "Legacy Reference", "Imported source records; SOP not auto-imposed", "legacy"],
  ["sopTracked", "SOP Tracked", "New records governed by active Head-approved SOP", "tracked"],
  ["sopComplete", "SOP Complete", "Tracked records with all mandatory stages", "complete"],
  ["sopIncomplete", "SOP Incomplete", "Tracked records needing action", "incomplete"],
  ["pendingReview", "Pending Review", "Awaiting Head & Admin decision", "pending"],
  ["missingEvidence", "Missing Evidence", "Tracked records missing evidence", "evidence"],
  ["monthlyPending", "Monthly Pending", "Labs with a pending monthly report", "monthly"],
  ["quarterlyPending", "Quarterly Pending", "Labs with a pending quarterly report", "quarterly"],
  ["openQueries", "Open Queries", "Unresolved lab-specific queries", "queries"],
];

function matchesMetric(lab, filter) {
  if (filter === "legacy") return lab.legacyMasterRecords > 0;
  if (filter === "tracked") return lab.sopTracked > 0;
  if (filter === "complete") return lab.sopComplete > 0;
  if (filter === "incomplete") return lab.sopIncomplete > 0;
  if (filter === "pending") return lab.pendingTechnologies > 0;
  if (filter === "evidence") return lab.missingEvidence > 0;
  if (filter === "monthly") return lab.monthlyStatus === "PENDING";
  if (filter === "quarterly") return lab.quarterlyStatus === "PENDING";
  if (filter === "queries") return lab.openQueries > 0;
  return true;
}

export default function LabMonitoringPage() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [metric, setMetric] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [techQuery, setTechQuery] = useState("");
  const [revision, setRevision] = useState(null);
  const [revisionMessage, setRevisionMessage] = useState("");

  useEffect(() => {
    fetch("/api/monitoring").then((response) => response.json()).then(setData);
  }, []);

  async function openLab(lab) {
    setDetailLoading(true);
    setSelected({ id: lab.id, code: lab.code, name: lab.name, technologies: [] });
    setTechQuery("");
    const response = await fetch("/api/monitoring?labId=" + lab.id);
    const body = await response.json();
    setSelected(body.selectedLab || null);
    setDetailLoading(false);
  }

  async function sendRevision(event) {
    event.preventDefault();
    const response = await fetch("/api/technology-revisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technologyId: revision.id, instructions: revision.instructions, dueAt: revision.dueAt || null }) });
    const body = await response.json();
    setRevisionMessage(response.ok ? `Change request sent to CSIR-${selected.code}.` : (body.error || "Request could not be sent."));
    if (response.ok) setRevision(null);
  }

  const rows = useMemo(() => {
    if (!data) return [];
    return data.labs.filter((lab) => (lab.code + " " + lab.name).toLowerCase().includes(q.toLowerCase()) && matchesMetric(lab, metric));
  }, [data, q, metric]);

  const visibleTechnologies = useMemo(() => {
    if (!selected?.technologies) return [];
    const search = techQuery.toLowerCase();
    return selected.technologies.filter((item) => (item.name + " " + (item.theme || item.sector || "") + " " + (item.piName || "")).toLowerCase().includes(search));
  }, [selected, techQuery]);

  if (!data) return <div className="container"><p className="empty">Loading lab monitoring…</p></div>;

  const comparison = [...data.labs].sort((a, b) => b.technologySubmissions - a.technologySubmissions).slice(0, 10);
  const maxTechnologies = Math.max(1, ...comparison.map((lab) => lab.technologySubmissions));

  return <div className="container wide-container">
    <div className="governance-hero"><div><span className="eyebrow">Head & Admin control room</span><h2>Laboratory Monitoring</h2><p>Click any metric to filter laboratories. Click a laboratory row to open every technology, SOP status, project link, report and open query for that lab.</p></div><a className="btn secondary" href="/sop-roadmap">Open SOP Roadmap</a></div>
    <div className="stat-grid interactive-stats">
      {metricCards.map(([key, label, help, filter]) => <button type="button" className={"stat card stat-button " + (metric === filter ? "active" : "")} key={key} onClick={() => setMetric(metric === filter ? "all" : filter)}><strong>{data.totals[key] ?? 0}</strong><span>{label}</span><small>{help}</small></button>)}
    </div>
    <div className="head-analytics-grid">
      <section className="card analytics-card"><div className="section-row"><div><span className="eyebrow">Lab comparison</span><h3>Technology records by laboratory</h3></div><span className="filter-chip">Top 10</span></div>{comparison.map((lab) => <button className="analytics-bar-row" key={lab.id} onClick={() => openLab(lab)}><span>CSIR-{lab.code}</span><i><CspElement as="b" css={{ width: `${Math.max(2, (lab.technologySubmissions / maxTechnologies) * 100)}%` }} /></i><strong>{lab.technologySubmissions}</strong></button>)}</section>
      <section className="card analytics-card"><div><span className="eyebrow">Data requiring attention</span><h3>Pending actions by laboratory</h3></div>{[...data.labs].sort((a,b)=>(b.pendingTechnologies+b.missingEvidence+b.openQueries)-(a.pendingTechnologies+a.missingEvidence+a.openQueries)).slice(0,10).map((lab)=><button className="attention-row" key={lab.id} onClick={()=>openLab(lab)}><span><strong>CSIR-{lab.code}</strong><small>{lab.name}</small></span><span><b>{lab.pendingTechnologies}</b> review</span><span><b>{lab.missingEvidence}</b> evidence</span><span><b>{lab.openQueries}</b> queries</span></button>)}</section>
    </div>
    <div className="toolbar monitoring-toolbar">
      <input className="search-input grow" placeholder="Search laboratory code or name" value={q} onChange={(event) => setQ(event.target.value)} />
      <span className="filter-chip">{rows.length} labs · {metric === "all" ? "all records" : metric}</span>
      {(q || metric !== "all") && <button className="btn secondary small" onClick={() => { setQ(""); setMetric("all"); }}>Clear filters</button>}
    </div>
    <div className="table-wrap">
      <table className="clickable-table"><thead><tr><th>Laboratory</th><th>Technologies</th><th>SOP Tracked</th><th>Pending / Evidence</th><th>Monthly</th><th>Quarterly</th><th>Queries</th><th></th></tr></thead>
        <tbody>{rows.map((lab) => <tr key={lab.id} onClick={() => openLab(lab)}><td><strong>CSIR-{lab.code}</strong><br /><span className="meta">{lab.name}</span></td><td><strong>{lab.technologySubmissions}</strong><br /><span className="meta">{lab.legacyMasterRecords} legacy reference</span></td><td>{lab.sopTracked}<br /><span className="meta">{lab.sopComplete} complete · {lab.sopIncomplete} incomplete</span></td><td>{lab.pendingTechnologies} pending<br /><span className="meta">{lab.missingEvidence} missing evidence</span></td><td><span className="badge">{lab.monthlyStatus}</span></td><td><span className="badge">{lab.quarterlyStatus}</span></td><td>{lab.openQueries}</td><td><button className="btn small" onClick={(event) => { event.stopPropagation(); openLab(lab); }}>Open Lab</button></td></tr>)}</tbody>
      </table>
    </div>
    {!rows.length && <p className="empty">No laboratories match this filter.</p>}

    {selected && <div className="detail-overlay" onClick={() => setSelected(null)}>
      <aside className="lab-detail" onClick={(event) => event.stopPropagation()}>
        <div className="detail-header"><div><span className="eyebrow">Laboratory workspace</span><h2>CSIR-{selected.code}</h2><p>{selected.name}</p></div><button className="icon-button" aria-label="Close laboratory detail" onClick={() => setSelected(null)}>×</button></div>
        {detailLoading ? <p className="empty">Loading all technologies…</p> : <>
          <div className="mini-stat-row"><div><strong>{selected.technologies.length}</strong><span>Technologies</span></div><div><strong>{selected.technologies.filter((item) => !item.sopLegacyExempt).length}</strong><span>SOP tracked</span></div><div><strong>{selected.targetQueries.length}</strong><span>Open queries</span></div></div>
          <div className="lab-contact"><p><strong>PI:</strong> {selected.piName || "Not registered"}</p><p><strong>Authorized person:</strong> {selected.authorizedPerson || "Not registered"}</p><p><strong>Email:</strong> {selected.officialEmail || "Not registered"}</p></div>
          <div className="subtabs detail-tabs"><a href="#lab-technologies">Technologies</a><a href="#lab-reports">Reports</a><a href="#lab-queries">Queries</a></div>
          <section id="lab-technologies"><div className="section-row"><h3>Data submitted by this laboratory</h3><input className="search-input" placeholder="Search technology, theme or PI" value={techQuery} onChange={(event) => setTechQuery(event.target.value)} /></div><p className="meta">{visibleTechnologies.length} matching record(s). Open a brief to inspect the submitted data; request a correction when anything is missing or unclear.</p>
            {revisionMessage && <div className="notice">{revisionMessage}</div>}
            <div className="technology-list">{visibleTechnologies.map((item) => <article className="technology-row" key={item.id}><div><Link className="link" href={`/module1/${item.id}`}><strong>{item.name}</strong></Link><p>{item.theme || item.sector || "Theme not specified"} · PI {item.piName || "not specified"}</p><small>Added {new Date(item.submittedAt || item.createdAt).toLocaleDateString()} · FY {item.recordFinancialYear || "not provided"} · TRL/CRL {item.trl || "—"}/{item.crl || "—"}</small>{item.projectLinks.length > 0 && <small>Projects: {item.projectLinks.map((link) => link.project.name).join(", ")}</small>}</div><div className="technology-status"><span className="badge">{item.sopLegacyExempt ? "Reference data" : "Lab submission"}</span><Link className="btn secondary small" href={`/module1/${item.id}`}>View details</Link><button className="btn small" onClick={() => { setRevision({ id: item.id, name: item.name, instructions: "", dueAt: "" }); setRevisionMessage(""); }}>Request changes</button></div></article>)}</div>
          </section>
          <section id="lab-reports"><h3>Recent Reports</h3>{selected.reportSubmissions.length ? selected.reportSubmissions.map((item) => <div className="compact-record" key={item.id}><div><strong>{item.report.title}</strong><span>{item.report.periodLabel} · due {new Date(item.report.dueDate).toLocaleDateString()}</span></div><span className="badge">{item.status}</span></div>) : <p className="empty compact">No report assignments.</p>}</section>
          <section id="lab-queries"><h3>Open Queries</h3>{selected.targetQueries.length ? selected.targetQueries.map((item) => <a className="compact-record" href="/queries" key={item.id}><div><strong>{item.title}</strong><span>{item.priority} priority</span></div><span className="badge">{item.status}</span></a>) : <p className="empty compact">No open query.</p>}</section>
        </>}
      </aside>
    </div>}
    {revision && <div className="detail-overlay revision-overlay" onClick={() => setRevision(null)}><form className="card revision-dialog" onSubmit={sendRevision} onClick={(event)=>event.stopPropagation()}><div className="section-row"><div><span className="eyebrow">Send to concerned laboratory</span><h3>Request changes</h3><p className="meta">{revision.name} · CSIR-{selected?.code}</p></div><button type="button" className="icon-button" onClick={()=>setRevision(null)}>×</button></div><label>What must the laboratory correct or add?</label><textarea required autoFocus value={revision.instructions} onChange={(event)=>setRevision({...revision,instructions:event.target.value})} placeholder="Mention the missing field, incorrect value or evidence required."/><label>Due date (optional)</label><input type="date" value={revision.dueAt} onChange={(event)=>setRevision({...revision,dueAt:event.target.value})}/><div className="row-actions"><button className="btn">Send request</button><button type="button" className="btn secondary" onClick={()=>setRevision(null)}>Cancel</button></div></form></div>}
  </div>;
}
