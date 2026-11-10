
"use client";

import CspElement from "../components/CspElement";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../components/collaboration-list.module.css";

const DOMAINS = ["Healthcare", "Agri", "Energy", "Materials", "AI", "Water", "Electronics", "Space", "Others"];

const emptyForm = {
  description: "", currentStatus: "", painPoints: "", budget: "", timeline: "", expectedOutcome: "", domain: "Healthcare",
};

export default function Module2Page() {
  const [items, setItems] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  async function load() {
    setLoading(true);
    const [items, auth] = await Promise.all([fetch("/api/problem-statements").then((r) => r.json()), fetch("/api/auth/me").then((r) => r.json()).catch(() => ({}))]);
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
    const response = await fetch("/api/problem-statements", {
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
      <h2 className="section-title">Sponsored Research & Problem-Solving</h2>
      <p className="section-sub">Industry problem intake · BDG screening · laboratory assignment · proposal · sponsored project execution</p>

      {canSubmit ? <button className="btn" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "+ Submit Problem Statement"}
      </button> : <div className="notice">Assigned laboratories submit technical proposals inside each case. HEAD reviews progress, assigns laboratories and sends clarification requests.</div>}

      {canSubmit && showForm && (
        <CspElement as="form" className="card" onSubmit={handleSubmit} css={{ marginTop: 16 }}>
          <p className="meta">This request will be submitted under your registered organisation.</p>

          <label>Domain</label>
          <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>

          <label>Problem Description</label>
          <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <label>Current Status</label>
          <textarea value={form.currentStatus} onChange={(e) => setForm({ ...form, currentStatus: e.target.value })} />

          <label>Pain Points</label>
          <textarea value={form.painPoints} onChange={(e) => setForm({ ...form, painPoints: e.target.value })} />

          <div className="grid-2">
            <div>
              <label>Budget (INR)</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label>Timeline</label>
              <input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="e.g. 6 months" />
            </div>
          </div>

          <label>Expected Outcome</label>
          <textarea value={form.expectedOutcome} onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })} />

          <button className="btn" disabled={saving} type="submit">{saving ? "Submitting..." : "Submit Problem Statement"}</button>
        </CspElement>
      )}

      <CspElement as="h3" css={{ marginTop: 28 }}>Problem Statements ({items.length})</CspElement>
      {loading && <p className="empty">Loading...</p>}
      {!loading && items.length === 0 && <p className="empty">No problem statements yet.</p>}
      {items.map((p) => (
        <Link key={p.id} href={`/module2/${p.id}`} className={`card ${styles.record}`}>
          <span className="badge">{p.status.replaceAll("_", " ")}</span>{" "}
          <CspElement as="span" className="badge" css={{ background: p.headStatus === "APPROVED" ? "#e7f5ee" : p.headStatus === "REJECTED" ? "#fbe4e4" : "#fdf3d8", color: p.headStatus === "APPROVED" ? "#1a7a4c" : p.headStatus === "REJECTED" ? "#a12626" : "#705300" }}>Head BDG: {p.headStatus}</CspElement>
          <h3>{p.organization.name} · {p.domain}</h3>
          <p className="meta">{p.lab ? p.lab.name : "Lab not yet assigned"} · {new Date(p.createdAt).toLocaleDateString()}</p>
          <p>{p.description}</p>
        </Link>
      ))}
    </div>
  );
}


