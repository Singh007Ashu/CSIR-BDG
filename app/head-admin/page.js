
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const cards = [
  ["totalTechnologies", "All Technologies", "Lab-wise master register", "/lab-monitoring"],
  ["legacyMasterRecords", "Legacy References", "Imported records, not automatic SOP completions", "/lab-monitoring"],
  ["sopTracked", "SOP Tracked", "New submissions under active Head-approved SOP", "/sop-roadmap"],
  ["pendingReview", "Pending Decisions", "Approve, return or reject new submissions", "/master-technologies"],
  ["commercialPending", "Pricing & Consultancy", "Technology Transfer, CNP and TSP cases awaiting decision", "/commercial-engagements?status=SUBMITTED"],
  ["missingEvidence", "Missing Evidence", "Only SOP-tracked records needing evidence", "/lab-monitoring"],
  ["monthlyPending", "Monthly Pending", "Laboratory reconciliation submissions", "/monthly-reporting"],
  ["quarterlyPending", "Quarterly Pending", "Value and impact submissions", "/quarterly-reporting"],
  ["openQueries", "Open Queries", "Lab-specific escalations and responses", "/queries"],
];

export default function HeadAdminPage() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch("/api/monitoring").then((response) => response.json()).then(setData); }, []);
  if (!data) return <div className="container"><p className="empty">Loading Head & Admin dashboard...</p></div>;

  return <div className="container wide-container">
    <div className="v2-head-banner"><div><span className="v2-badge">FINAL DECISION & OVERSIGHT</span><h2>HEAD BDG Dashboard</h2><p>One priority queue across technology transfer, sponsored research, co-development and repository governance.</p></div><div className="hero-actions"><Link className="btn" href="/workspace">Platform Overview</Link><Link className="btn secondary" href="/lab-monitoring">Laboratory Overview</Link><Link className="btn secondary" href="/platform-flow">Process Overview</Link></div></div>
    <div className="v2-mini-tracks">{[["01","Technology Transfer","/master-technologies"],["02","Sponsored Research","/module2"],["03","Co-Development","/co-development"],["04","Repository & CRM","/workflow-tracker"]].map(([no,label,href])=><Link href={href} key={no}><span>{no}</span><strong>{label}</strong><b>→</b></Link>)}</div>
    <div className="stat-grid interactive-stats">{cards.map(([key, label, help, href]) => <Link className="stat card stat-button" href={href} key={key}><strong>{data.totals[key] ?? 0}</strong><span>{label}</span><small>{help}</small><em>Open →</em></Link>)}</div>
    <div className="section-row"><div><span className="eyebrow">Decision workspaces</span><h3>Review and Management</h3></div></div>
    <div className="action-grid">
      <Link className="action-card primary" href="/lab-monitoring"><span>01</span><div><h3>Laboratories & Technologies</h3><p>Open any lab and inspect every technology, SOP status, report, evidence gap and query.</p></div></Link>
      <Link className="action-card" href="/master-technologies"><span>02</span><div><h3>Technology Decisions</h3><p>Review only new SOP-controlled submissions. Approve, return or reject with audit trail.</p></div></Link>
      <Link className="action-card" href="/sop-roadmap"><span>03</span><div><h3>SOP Workflow & Tracking</h3><p>Decide stage ownership, required handoffs and the documents expected at each step.</p></div></Link>
      <Link className="action-card primary" href="/sop-data-entry"><span>03A</span><div><h3>Laboratory SOP Submissions</h3><p>Review lab-entered SOP records and their immutable revision history directly.</p></div></Link>
      <Link className="action-card" href="/raci-access"><span>04</span><div><h3>Roles & Responsibilities</h3><p>Edit Responsible, Accountable, Consulted and Informed ownership separately.</p></div></Link>
      <Link className="action-card" href="/projects"><span>05</span><div><h3>Project Portfolio</h3><p>Open the FICCI demo project or create a new project and link technologies without duplication.</p></div></Link>
      <Link className="action-card" href="/commercial-engagements"><span>06</span><div><h3>Pricing & Consultancy Decisions</h3><p>Review Technology Transfer, Consultancy (CNP), and Technical Service (TSP) proposals.</p></div></Link>
      <Link className="action-card" href="/excel-templates"><span>07</span><div><h3>Excel Validation</h3><p>Download the approved template, preview validation and commit clean draft rows.</p></div></Link>
    </div>
  </div>;
}


