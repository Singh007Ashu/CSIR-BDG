"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function AssignedCollaboration() {
  const [items,setItems]=useState([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{ Promise.all(["problem-statements","partnerships"].map(async path=>{const r=await fetch("/api/"+path);const data=await r.json();if(!r.ok)throw new Error(data.error);return data.map(item=>({...item,kind:path==="problem-statements"?"Sponsored Research":"Industry Partnership",href:(path==="problem-statements"?"/module2/":"/module3/")+item.id}));})).then(rows=>setItems(rows.flat())).catch(e=>setMessage(e.message)); },[]);
  return <section className="project-section"><h3>Assigned industry work</h3><p className="meta">Industry research requests and partnership assignments appear here as well as in their respective sections.</p>{message&&<p className="notice">{message}</p>}<div className="project-card-grid">{items.map(item=><article className="card" key={item.href}><span className="badge">{item.kind}</span><h3>{item.organization?.name}</h3><p>{item.description||item.challengeStatement}</p><p className="meta">{item.lab?.name||"Awaiting laboratory assignment"} · {item.status.replaceAll("_"," ")}</p><Link className="btn secondary" href={item.href}>Open assignment</Link></article>)}</div>{!items.length&&!message&&<p className="empty">No industry research or partnership assignments yet.</p>}</section>;
}
