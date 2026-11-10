"use client";

import CspElement from "../../components/CspElement";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LabCollaborationActions from "../../components/LabCollaborationActions";

const STATUS_FLOW = [
  "CONSULTATION", "TREND_ANALYSIS", "GAP_IDENTIFIED", "CHALLENGE_SUBMITTED", "SKILL_MATCHED",
  "PROPOSAL_DEVELOPMENT", "APPROVED", "MOU_SIGNED", "IN_DEVELOPMENT", "TESTING_VALIDATION",
  "COMMERCIALIZATION", "POST_COMMERCIALIZATION",
];

const HEAD_BADGE = {
  PENDING: { bg: "#fdf3d8", color: "#705300" },
  APPROVED: { bg: "#e7f5ee", color: "#1a7a4c" },
  REJECTED: { bg: "#fbe4e4", color: "#a12626" },
};

export default function PartnershipDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [labs, setLabs] = useState([]);
  const [me, setMe] = useState(null);
  const [matchNote, setMatchNote] = useState("");
  const [royaltyNote, setRoyaltyNote] = useState("");

  async function load() {
    const [p, l, m] = await Promise.all([
      fetch(`/api/partnerships/${id}`).then((r) => r.json()),
      fetch("/api/labs").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItem(p);
    setLabs(l);
    setMe(m.user);
    setMatchNote(p.matchedApproach || "");
    setRoyaltyNote(p.royaltyNotes || "");
  }
  useEffect(() => { load(); }, [id]);
  const isHead = ["HEAD_BDG", "HEAD_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(me?.role);

  async function patch(data) {
    const response = await fetch(`/api/partnerships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) { const result = await response.json(); alert(result.error || "Update failed."); return; }
    load();
  }

  if (!item) return <div className="container"><p className="empty">Loading...</p></div>;
  if (item.error) return <div className="container"><p className="notice">{item.error}</p></div>;
  const hb = HEAD_BADGE[item.headStatus] || HEAD_BADGE.PENDING;

  return (
    <div className="container">
      <p><CspElement as="a" href="/module3" css={{ color: "var(--csir-blue)" }}>&larr; Back to partnerships</CspElement></p>
      <h2 className="section-title">{item.organization.name}</h2>
      <CspElement as="span" className="badge" css={{ background: hb.bg, color: hb.color }}>Head BDG: {item.headStatus}</CspElement>
      <LabCollaborationActions item={item} kind="partnership" onSaved={load} />

      <div className="card">
        {item.challengeStatement && <p><strong>Challenge:</strong> {item.challengeStatement}</p>}
        {item.technologyGap && <p><strong>Technology Gap:</strong> {item.technologyGap}</p>}
        {item.expectedOutcome && <p><strong>Expected Outcome:</strong> {item.expectedOutcome}</p>}
        {item.commercialPotential && <p><strong>Commercial Potential:</strong> {item.commercialPotential}</p>}

        {isHead ? (
          <>
            <label>Pipeline Status</label>
            <select value={item.status} onChange={(e) => patch({ status: e.target.value })}>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>

            <label>Matched CSIR Lab</label>
            <select value={item.labId || ""} onChange={(e) => patch({ labId: e.target.value })}>
              <option value="">-- Not matched --</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <label>AI Match Engine Notes (recommended approach / TRL pathway)</label>
            <textarea value={matchNote} onChange={(e) => setMatchNote(e.target.value)} onBlur={() => patch({ matchedApproach: matchNote })} />

            <CspElement as="label" css={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CspElement as="input" type="checkbox" css={{ width: "auto" }} checked={item.mouSigned} onChange={(e) => patch({ mouSigned: e.target.checked })} />
              MoU / Agreement Signed
            </CspElement>

            <label>Royalty & License Monitoring Notes</label>
            <textarea value={royaltyNote} onChange={(e) => setRoyaltyNote(e.target.value)} onBlur={() => patch({ royaltyNotes: royaltyNote })} />
            <CspElement as="p" css={{ fontSize: 12, marginTop: 6 }}>Accept / reject this challenge from the <CspElement as="a" href="/head-bdg" css={{ color: "var(--csir-blue)" }}>Head, BDG dashboard</CspElement>.</CspElement>
          </>
        ) : (
          <>
            <p><strong>Status:</strong> {item.status.replaceAll("_", " ")}</p>
            <p><strong>Matched Lab:</strong> {item.lab ? item.lab.name : "Not yet matched"}</p>
            <p><strong>MoU Signed:</strong> {item.mouSigned ? "Yes" : "No"}</p>
          </>
        )}
      </div>
    </div>
  );
}
