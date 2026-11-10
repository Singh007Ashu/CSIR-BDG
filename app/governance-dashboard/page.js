"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const mandates = {
  BDG: "Central register, reconciliation, commercialization decisions and dashboards.", CPD: "Planning alignment, performance indicators and consolidated reporting.", IMD: "Mission, social, environmental and public-good impact validation.", TMD: "Technology pipeline, maturity, TRL and CRL validation.", IPU: "IP linkage, patent, licence and royalty validation.", URDIP: "Market intelligence, commercial viability and business value.", ICM: "Industry connect, customer pipeline and conversion actions.", LAB_BD: "Lab register, commitments, reconciliation and evidence handoffs.", PI: "Technical scope, milestones, deployment and impact evidence.",
};

export default function GovernanceDashboardPage() {
  const [data, setData] = useState(null); const [me, setMe] = useState(null);
  useEffect(() => { Promise.all([fetch("/api/intake").then((r) => r.json()), fetch("/api/auth/me").then((r) => r.json())]).then(([packets, identity]) => { setData(packets); setMe(identity.user); }); }, []);
  const metrics = useMemo(() => { const rows = data?.packets || []; return { inbox: rows.filter((p) => p.status === "IN_REVIEW" || p.status === "RETURNED").length, urgent: rows.filter((p) => ["HIGH", "URGENT"].includes(p.priority) && !["COMPLETED", "REJECTED"].includes(p.status)).length, done: rows.filter((p) => p.status === "COMPLETED").length, ai: rows.filter((p) => p.documents.some((d) => d.document.analyses[0]?.provider === "OPENAI")).length }; }, [data]);
  if (!data || !me) return <div className="container"><p className="empty">Loading your governance workspace…</p></div>;
  return <div className="container wide-container">
    <div className="governance-hero"><div><span className="eyebrow">{me.role} role workspace</span><h2>{me.name}</h2><p>{mandates[me.role] || "Role-scoped governance decisions and tracked file handoffs."}</p></div><div className="hero-actions"><Link className="btn green" href="/workflow-tracker">Open work queue</Link><Link className="btn secondary" href="/ai-intake">Analyse new file</Link></div></div>
    <div className="stat-grid dashboard-stats">{[[metrics.inbox,"Files in my view","Review or forward"],[metrics.urgent,"High priority","Act first"],[metrics.done,"Completed","Full audit trail"],[metrics.ai,"AI enriched",data.aiConfigured?"OpenAI connected":"Local analysis active"]].map(([n,l,h]) => <article className="stat card" key={l}><strong>{n}</strong><span>{l}</span><small>{h}</small></article>)}</div>
    <div className="dashboard-layout"><section className="card"><div className="section-row"><div><span className="eyebrow">Current work</span><h3>Recently updated files</h3></div><Link className="link" href="/workflow-tracker">View all →</Link></div><div className="queue-list">{data.packets.slice(0,8).map((packet) => <Link href={`/workflow-tracker?packet=${packet.id}`} className="queue-item" key={packet.id}><div className={`unit-orb ${packet.status.toLowerCase()}`}>{packet.currentUnit || "✓"}</div><div><strong>{packet.title}</strong><p>{packet.referenceNo} · CSIR-{packet.lab.code} · {packet.sopStage?.code || "SOP mapping pending"}</p></div><span className="badge">{packet.status}</span></Link>)}{!data.packets.length && <p className="empty compact">No files assigned yet.</p>}</div></section>
      <aside className="card role-mandate"><span className="eyebrow">Your SOP lane</span><h3>{me.role}</h3><p>{mandates[me.role]}</p><ol><li>Open the source and AI extraction.</li><li>Validate only your assigned mandate.</li><li>Add comments and forward, return or reject.</li><li>Do not treat AI output as final approval.</li></ol><Link className="btn" href="/sop-roadmap">Open SOP roadmap</Link></aside></div>
  </div>;
}
