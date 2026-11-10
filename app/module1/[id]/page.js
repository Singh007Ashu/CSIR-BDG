
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import OrgPicker from "../../components/OrgPicker";
import DocumentManager from "../../components/DocumentManager";

export default function TechnologyDetail() {
  const { id } = useParams(); const [tech, setTech] = useState(null); const [me, setMe] = useState(null); const [labMe, setLabMe] = useState(null); const [orgId, setOrgId] = useState(""); const [requestType, setRequestType] = useState("DEMO"); const [notes, setNotes] = useState(""); const [message, setMessage] = useState("");
  async function load() { const [record, auth, labAuth] = await Promise.all([fetch(`/api/technologies/${id}`).then((r) => r.json()), fetch("/api/auth/me").then((r) => r.json()).catch(()=>({})), fetch("/api/lab-auth/me").then((r)=>r.json()).catch(()=>({}))]); setTech(record); setMe(auth.user); setLabMe(labAuth.lab || null); } useEffect(() => { load(); }, [id]);
  const manager = ["HEAD_BDG", "ADMIN", "SUPER_ADMIN"].includes(me?.role);
  async function submit(e) { e.preventDefault(); const res = await fetch("/api/tech-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technologyId: id, organizationId: orgId, requestType, notes }) }); const data = await res.json(); setMessage(res.ok ? "Request submitted to Head BDG." : data.error); if (res.ok) load(); }
  if (!tech) return <div className="container"><p className="empty">Loading technology...</p></div>;
  return <div className="container"><p><a className="link" href="/projects">← Back to Projects</a></p><div className="page-heading"><div><span className="badge">{tech.sopLegacyExempt ? "Reference record" : "Laboratory submission"}</span><h2 className="section-title">{tech.name}</h2><p className="section-sub">{tech.lab.name} · {tech.sector || "Technology area not set"} · PI {tech.piName || tech.lab.piName || "not set"}</p></div></div><div className="card"><h3>Technology brief</h3><p>{tech.briefDescription || "Brief description has not been provided."}</p>{tech.advantages && <p><strong>Advantages:</strong> {tech.advantages}</p>}{tech.applications && <p><strong>Applications:</strong> {tech.applications}</p>}{tech.keyFeatures && <p><strong>Key Features:</strong> {tech.keyFeatures}</p>}<div className="grid-3"><p><strong>IP Status</strong><br />{tech.ipStatus || "Not provided"}</p><p><strong>TRL / CRL</strong><br />{tech.trl || "-"} / {tech.crl || "-"}</p><p><strong>Source</strong><br />CSIR-{tech.lab.code}</p></div></div>{labMe && <div className="editorial-card commercial-launch"><div><span className="eyebrow">Technology commercialisation</span><h3>Pricing & consultancy case</h3><p className="meta">Create a Technology Transfer, Consultancy (CNP), or Technical Service (TSP) pricing record without duplicating this technology.</p></div><a className="btn" href={`/commercial-engagements?technologyId=${tech.id}`}>Start commercial pricing</a></div>}<div className="card"><DocumentManager entityType="TECHNOLOGY" entityId={tech.id} canManage={Boolean(labMe)} /></div>
    {me?.role === "APPLICANT" && <form className="card" onSubmit={submit}><h3>Request Demo / Licensing / Service</h3><OrgPicker value={orgId} onChange={setOrgId} /><label>Request Type</label><select value={requestType} onChange={(e) => setRequestType(e.target.value)}><option value="DEMO">Demo</option><option value="LICENSING">Licensing</option><option value="SERVICE">Service</option></select><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} />{message && <p className="form-message">{message}</p>}<button className="btn">Submit Request</button></form>}
    {manager && <div><h3>Requests ({tech.requests.length})</h3>{tech.requests.map((request) => <div className="card" key={request.id}><span className="badge">{request.headStatus}</span><h3>{request.organization.name}</h3><p>{request.requestType} · {request.notes || "No notes"}</p></div>)}</div>}
  </div>;
}


