"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams(); const [token, setToken] = useState(params.get("token") || ""); const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  async function submit(e) { e.preventDefault(); const res = await fetch("/api/lab-auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }) }); const data = await res.json(); setMessage(res.ok ? "Password reset. You can now log in." : data.error); }
  return <div className="container narrow"><h2 className="section-title">Reset Laboratory Password</h2><form className="card" onSubmit={submit}><label>Reset Token</label><textarea required value={token} onChange={(e) => setToken(e.target.value)} /><label>New Password</label><input type="password" minLength="10" required value={password} onChange={(e) => setPassword(e.target.value)} /><p className="meta">Use 10+ characters with uppercase, lowercase, number and special character.</p>{message && <p className="form-message">{message}</p>}<button className="btn">Reset Password</button></form></div>;
}
