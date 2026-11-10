"use client";

import { useEffect, useState } from "react";

export default function OrgPicker({ value, onChange }) {
  const [me, setMe] = useState(undefined); // undefined = loading, null = not logged in
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, []);

  useEffect(() => {
    if (me?.role === "HEAD_BDG") {
      fetch("/api/organizations").then((r) => r.json()).then(setOrgs);
    } else if (me?.organization) {
      onChange(me.organization.id);
    }
  }, [me]);

  if (me === undefined) return <p className="empty">Loading account...</p>;

  // Applicant: organization comes from their own account (set when they registered
  // with their own organization / startup name) — no manual entry here.
  if (me && me.role !== "HEAD_BDG") {
    return (
      <div>
        <label>Organization</label>
        <input value={me.organization ? `${me.organization.name} (${me.organization.type})` : "No organization on this account"} disabled />
      </div>
    );
  }

  // Head, BDG: full picker across all registered organizations (for testing / manual entry).
  return (
    <div>
      <label>Organization</label>
      <select value={value || ""} onChange={(e) => onChange(Number(e.target.value))}>
        <option value="">-- Select organization --</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
        ))}
      </select>
    </div>
  );
}
