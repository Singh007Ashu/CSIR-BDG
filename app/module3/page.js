
"use client";

import CspElement from "../components/CspElement";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../components/collaboration-list.module.css";

const emptyForm = { challengeStatement: "", expectedOutcome: "", commercialPotential: "", technologyGap: "" };

export default function Module3Page() {
  const [items, setItems] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  async function load() {
    setLoading(true);
    const [items, auth] = await Promise.all([fetch("/api/partnerships").then((r) => r.json()), fetch("/api/auth/me").then((r) => r.json()).catch(() => ({}))]);
    setItems(Array.isArray(items) ? items : []);
    setCanSubmit(auth.user?.role === "APPLICANT");
    setOrgId(auth.user?.organization?.id || "");
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId) { alert("Please select or register an organization."); return; }
    setSaving(true);
    const response = await fetch("/api/partnerships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, organizationId: orgId }),
    });
    if (!response.ok) { const result = await response.json(); setSaving(false); alert(result.error || "Submission failed. Please try again."); return; }
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  return (
    <div className="container">
      <h2 className="section-title">Industry Challenges & Partnership Pipeline</h2>
      <p className="section-sub">Industry challenge · capability matching · BDG approval · handoff to Co-Development and the MoU & Agreements</p>

      {canSubmit ? <button className="btn purple" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "+ Submit Industry Challenge"}
      </button> : <div className="notice">Open an assigned challenge to add the laboratory approach and progress. HEAD reviews updates and sends clarification requests.</div>}

      {canSubmit && showForm && (
        <CspElement as="form" className="card" onSubmit={handleSubmit} css={{ marginTop: 16 }}>
          <p className="meta">This request will be submitted under your registered organisation.</p>
          <label>Challenge Statement</label>
          <textarea required value={form.challengeStatement} onChange={(e) => setForm({ ...form, challengeStatement: e.target.value })} />
          <label>Technology Gap</label>
          <textarea value={form.technologyGap} onChange={(e) => setForm({ ...form, technologyGap: e.target.value })} placeholder="Emerging needs / capability gap / opportunity area" />
          <label>Expected Outcome</label>
          <textarea value={form.expectedOutcome} onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })} />
          <label>Commercial Potential</label>
          <textarea value={form.commercialPotential} onChange={(e) => setForm({ ...form, commercialPotential: e.target.value })} />
          <button className="btn purple" disabled={saving} type="submit">{saving ? "Submitting..." : "Submit Challenge"}</button>
        </CspElement>
      )}

      <CspElement as="h3" css={{ marginTop: 28 }}>Partnerships & Challenges ({items.length})</CspElement>
      {loading && <p className="empty">Loading...</p>}
      {!loading && items.length === 0 && <p className="empty">No partnerships yet.</p>}
      {items.map((p) => (
        <Link key={p.id} href={`/module3/${p.id}`} className={`card ${styles.record}`}>
          <CspElement as="span" className="badge" css={{ background: "#f1e9fa", color: "#5b2d8e" }}>{p.status.replaceAll("_", " ")}</CspElement>{" "}
          <CspElement as="span" className="badge" css={{ background: p.headStatus === "APPROVED" ? "#e7f5ee" : p.headStatus === "REJECTED" ? "#fbe4e4" : "#fdf3d8", color: p.headStatus === "APPROVED" ? "#1a7a4c" : p.headStatus === "REJECTED" ? "#a12626" : "#705300" }}>Head BDG: {p.headStatus}</CspElement>
          <h3>{p.organization.name}</h3>
          <p className="meta">{p.lab ? p.lab.name : "Lab not yet matched"} · {new Date(p.createdAt).toLocaleDateString()}</p>
          <p>{p.challengeStatement}</p>
        </Link>
      ))}
    </div>
  );
}


