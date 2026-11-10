"use client";
import { useState } from "react";
export default function LabForgotPasswordPage() {
  const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");const [saving,setSaving]=useState(false);
  async function submit(event){event.preventDefault();setError("");setSaving(true);try{
    const response=await fetch("/api/lab-auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({officialEmail:email})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Request could not be submitted.");setMessage(data.message);
  }catch(error){setError(error.message||"Connection failed. Please try again.");}finally{setSaving(false);}}
  return <div className="container narrow"><h2 className="section-title">Laboratory Password Assistance</h2><div className="card">
    <p>Your administrator will verify your identity through an official channel before resetting your password. This form does not send an email reset link.</p>
    {message?<p role="status">{message}</p>:<form onSubmit={submit}><label htmlFor="assistance-email">Official email</label><input id="assistance-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/>{error&&<p role="alert">{error}</p>}<button className="btn" disabled={saving}>{saving?"Submitting...":"Request Password Assistance"}</button></form>}
    <a className="btn secondary" href="/lab-login">Back to Lab Login</a>
  </div></div>;
}
