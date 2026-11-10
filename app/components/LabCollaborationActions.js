"use client";
import { useEffect, useState } from "react";

export default function LabCollaborationActions({ item, kind, onSaved }) {
  const [lab, setLab] = useState(null);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(item.proposal || { scopeOfWork: "", milestones: "", deliverables: "", estimatedCost: "", timeline: "" });
  const [approach, setApproach] = useState(item.matchedApproach || "");
  const [query, setQuery] = useState("");
  useEffect(() => { Promise.all([fetch("/api/lab-auth/me").then(r=>r.json()), fetch("/api/auth/me").then(r=>r.json())]).then(([l,u])=>{setLab(l.lab);setUser(u.user);}).catch(()=>{}); }, []);
  const manager = ["HEAD_BDG", "HEAD_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user?.role);
  async function send(url, method, body) {
    setBusy(true); setMessage("");
    try { const r = await fetch(url, {method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const data=await r.json(); if(!r.ok)throw new Error(data.error || "Unable to save."); setMessage("Saved successfully."); onSaved?.(); return true; } catch(e){setMessage(e.message); return false;} finally{setBusy(false);}
  }
  return <>{message && <p className="notice" role="status">{message}</p>}
    {lab?.id === item.labId && lab.role !== "PI" && <form className="card" onSubmit={e=>{e.preventDefault(); kind==="research" ? send("/api/proposals","POST",{...form,problemStatementId:item.id}) : send("/api/partnerships/"+item.id+"/lab-response","POST",{matchedApproach:approach});}}>
      <h3>{kind==="research" ? "Laboratory technical proposal" : "Laboratory response & approach"}</h3>
      {kind==="research" ? Object.entries({scopeOfWork:"Scope of work",milestones:"Milestones",deliverables:"Deliverables",estimatedCost:"Estimated cost (INR)",timeline:"Timeline"}).map(([key,label])=><div key={key}><label>{label}</label>{key==="estimatedCost"?<input type="number" min="0" step="0.01" value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<textarea required={key==="scopeOfWork"} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</div>):<><label>Proposed approach, progress and next steps</label><textarea required value={approach} onChange={e=>setApproach(e.target.value)}/></>}
      <button className="btn" disabled={busy}>Submit laboratory update</button><p className="meta">HEAD can review this update and send questions to your laboratory.</p>
    </form>}
    {manager && item.labId && <form className="card" onSubmit={async e=>{e.preventDefault();if(await send("/api/queries","POST",{queryType:"LAB_SPECIFIC",targetLabId:item.labId,title:(kind==="research"?"Sponsored research":"Partnership")+" #"+item.id+" — clarification",description:query+"\n\nRelated record: "+(kind==="research"?"/module2/":"/module3/")+item.id})){setQuery("");}}}><h3>Ask the assigned laboratory</h3><label>Question or requested correction</label><textarea required value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn" disabled={busy}>Send query to {item.lab?.name || "laboratory"}</button><p><a href="/queries">View questions and laboratory replies</a></p></form>}
  </>;
}
