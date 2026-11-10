"use client";

import CspElement from "../../components/CspElement";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LabCollaborationActions from "../../components/LabCollaborationActions";
import ResearchTracker from "../../components/ResearchTracker";

const STATUS_FLOW = [
  "SUBMITTED", "DOMAIN_CLASSIFIED", "BDG_SCREENED", "COMMITTEE_REVIEWED", "LAB_DISCUSSION",
  "PROPOSAL_SENT", "INDUSTRY_APPROVED", "NOT_SUITABLE", "PROJECT_INITIATED", "IN_EXECUTION",
  "PROTOTYPE_DEVELOPED", "VALIDATED", "DELIVERED", "COMPLETED",
];

const NON_ENGAGEMENT_REASONS = [
  "Infrastructure Gap", "Budget Constraints", "Timeline Constraints", "Technology Mismatch",
  "Expertise Not Available", "Regulatory Issues", "Commercial Feasibility", "Strategic Priorities",
];

const HEAD_BADGE = {
  PENDING: { bg: "#fdf3d8", color: "#705300" },
  APPROVED: { bg: "#e7f5ee", color: "#1a7a4c" },
  REJECTED: { bg: "#fbe4e4", color: "#a12626" },
};

export default function ProblemDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [labs, setLabs] = useState([]);
  const [me, setMe] = useState(null);
  const [proposalForm, setProposalForm] = useState({ scopeOfWork: "", milestones: "", deliverables: "", estimatedCost: "", timeline: "" });
  const [savingProposal, setSavingProposal] = useState(false);

  async function load() {
    const [p, l, m] = await Promise.all([
      fetch(`/api/problem-statements/${id}`).then((r) => r.json()),
      fetch("/api/labs").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItem(p);
    setLabs(l);
    setMe(m.user);
  }
  useEffect(() => { load(); }, [id]);
  const isHead = ["HEAD_BDG", "HEAD_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(me?.role);

  async function patch(data) {
    const response = await fetch(`/api/problem-statements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) { const result = await response.json(); alert(result.error || "Update failed."); return; }
    load();
  }

  async function submitProposal(e) {
    e.preventDefault();
    setSavingProposal(true);
    await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...proposalForm, problemStatementId: id }),
    });
    setSavingProposal(false);
    load();
  }

  if (!item) return <div className="container"><p className="empty">Loading...</p></div>;
  if (item.error) return <div className="container"><p className="notice">{item.error}</p></div>;
  const hb = HEAD_BADGE[item.headStatus] || HEAD_BADGE.PENDING;

  return (
    <div className="container">
      <p><CspElement as="a" href="/module2" css={{ color: "var(--csir-blue)" }}>&larr; Back to problem statements</CspElement></p>
      <h2 className="section-title">{item.organization.name} · {item.domain}</h2>
      <CspElement as="span" className="badge" css={{ background: hb.bg, color: hb.color }}>Head BDG: {item.headStatus}</CspElement>
      <LabCollaborationActions item={item} kind="research" onSaved={load} />
      <ResearchTracker id={id} currentStatus={item.status} onSaved={load} />

      <div className="card">
        <p>{item.description}</p>
        {item.currentStatus && <p><strong>Current Status:</strong> {item.currentStatus}</p>}
        {item.painPoints && <p><strong>Pain Points:</strong> {item.painPoints}</p>}
        {item.budget && <p><strong>Budget:</strong> ₹{item.budget}</p>}
        {item.timeline && <p><strong>Timeline:</strong> {item.timeline}</p>}
        {item.expectedOutcome && <p><strong>Expected Outcome:</strong> {item.expectedOutcome}</p>}

        {isHead ? (
          <>
            <label>Pipeline Status</label>
            <select value={item.status} onChange={(e) => patch({ status: e.target.value })}>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>

            <label>Assign CSIR Lab</label>
            <select value={item.labId || ""} onChange={(e) => patch({ labId: e.target.value })}>
              <option value="">-- Not assigned --</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            {item.status === "NOT_SUITABLE" && (
              <>
                <label>Non-Engagement Reason</label>
                <select value={item.nonEngagementReason || ""} onChange={(e) => patch({ nonEngagementReason: e.target.value })}>
                  <option value="">-- Select reason --</option>
                  {NON_ENGAGEMENT_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </>
            )}
            <CspElement as="p" css={{ fontSize: 12, marginTop: 6 }}>Accept / reject this problem statement from the <CspElement as="a" href="/head-bdg" css={{ color: "var(--csir-blue)" }}>Head, BDG dashboard</CspElement>.</CspElement>
          </>
        ) : (
          <>
            <p><strong>Status:</strong> {item.status.replaceAll("_", " ")}</p>
            <p><strong>Lab:</strong> {item.lab ? item.lab.name : "Not yet assigned"}</p>
          </>
        )}
      </div>

      <h3>Technical Proposal & Budget Estimation</h3>
      {item.proposal ? (
        <div className="card">
          <p><strong>Scope:</strong> {item.proposal.scopeOfWork}</p>
          {item.proposal.milestones && <p><strong>Milestones:</strong> {item.proposal.milestones}</p>}
          {item.proposal.deliverables && <p><strong>Deliverables:</strong> {item.proposal.deliverables}</p>}
          {item.proposal.estimatedCost && <p><strong>Estimated Cost:</strong> ₹{item.proposal.estimatedCost}</p>}
          {item.proposal.timeline && <p><strong>Timeline:</strong> {item.proposal.timeline}</p>}
        </div>
      ) : (
        <p className="empty">No laboratory proposal has been submitted yet. HEAD BDG can review and assign the case, but does not enter the laboratory's technical proposal.</p>
      )}
    </div>
  );
}
