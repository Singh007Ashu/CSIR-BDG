"use client";
import {useEffect,useState} from "react";
import DocumentManager from "../components/DocumentManager";
export default function LabProfiles(){
 const [labs,setLabs]=useState([]),[own,setOwn]=useState(null),[selected,setSelected]=useState(null),[q,setQ]=useState(""),[error,setError]=useState("");
 useEffect(()=>{Promise.all([fetch("/api/lab-profiles").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d}),fetch("/api/lab-auth/me").then(r=>r.json())]).then(([rows,auth])=>{setLabs(rows);setOwn(auth.lab?.id);if(auth.lab)setSelected(rows.find(l=>l.id===auth.lab.id));}).catch(e=>setError(e.message));},[]);
 return <div className="container"><h2 className="section-title">Laboratory Profiles</h2><p className="section-sub">Laboratory capabilities, work areas and presentations. Upload PPT/PPTX files up to 5 MB each; HEAD can download profiles laboratory-wise.</p>{error&&<p className="notice">{error}</p>}
 {selected?<><button className="btn secondary" onClick={()=>setSelected(null)}>Back to laboratories</button><section className="card"><h3>{selected.name}</h3><p>{selected.expertise}</p><DocumentManager entityType="LAB_PROFILE" entityId={selected.id} canManage={own===selected.id}/></section></>:<><label>Find laboratory</label><input aria-label="Find laboratory" value={q} onChange={e=>setQ(e.target.value)} placeholder="Lab name or work area"/><div className="grid-2">{labs.filter(l=>[l.name,l.code,l.expertise].join(" ").toLowerCase().includes(q.toLowerCase())).map(l=><article className="card" key={l.id}><h3>{l.name}</h3><p>{l.expertise||"Capabilities are described in the laboratory presentation."}</p><p className="meta">{l.files.length} presentation(s)</p><button className="btn secondary" onClick={()=>setSelected(l)}>Open profile & presentations</button></article>)}</div></>}
 </div>;
}
