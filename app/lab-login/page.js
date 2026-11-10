"use client";

import CspElement from "../components/CspElement";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LabLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("next") || "/lab-dashboard";
  const nextPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") && !/[\\\x00-\x1f]/.test(requestedPath) ? requestedPath : "/lab-dashboard";

  const [form, setForm] = useState({ labId: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
    const res = await fetch("/api/lab-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({ error: "Server response could not be read. Please try again." }));
    if (!res.ok) { setError(data.error || "Login failed."); return; }
    router.push(nextPath);
    router.refresh();
    } catch { setError("Connection failed. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <CspElement as="div" className="container hq-lab-panel" css={{ maxWidth: 460 }}>
      <h2 className="section-title">CSIR Laboratory Login</h2>
      <p className="section-sub">
        Internal portal for CSIR laboratories. Use the Lab ID issued at registration.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="lab-login-id">Lab ID</label>
          <input
            id="lab-login-id" autoComplete="username"
            required
            placeholder="e.g. CSIR-CSIO-0001"
            value={form.labId}
            onChange={(e) => setForm({ ...form, labId: e.target.value })}
          />
          <label htmlFor="lab-login-password">Password</label>
          <input
            id="lab-login-password" autoComplete="current-password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <CspElement as="p" role="alert" css={{ color: "#c0392b", fontSize: 13 }}>{error}</CspElement>}
          <button className="btn" disabled={saving} type="submit">{saving ? "Signing in..." : "Login"}</button>
          <CspElement as="p" css={{ fontSize: 13, marginTop: 12 }}>
            New laboratory?{" "}
            <CspElement as="a" href="/register-lab" css={{ color: "var(--csir-blue)", fontWeight: 600 }}>
              Register your lab
            </CspElement>
          </CspElement>
          <CspElement as="p" css={{ fontSize: 13, marginTop: 6 }}>
            Forgot password?{" "}
            <CspElement as="a" href="/lab-forgot-password" css={{ color: "var(--csir-blue)", fontWeight: 600 }}>
              Reset it here
            </CspElement>
          </CspElement>
        </form>
      </div>
    </CspElement>
  );
}
