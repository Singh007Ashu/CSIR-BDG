"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function FicciTechnologies() {
  const [items,setItems]=useState([]),[labs,setLabs]=useState([]),[filters,setFilters]=useState({q:"",labId:"",sector:""}),[loading,setLoading]=useState(true);
  async function load(){setLoading(true);const params=new URLSearchParams({scope:"PROJECT_ONLY",projectSlug:"ficci",...Object.fromEntries(Object.entries(filters).filter(([,value])=>value))});const[technologies,labRows]=await Promise.all([fetch(`/api/technologies?${params}`).then(r=>r.json()),fetch("/api/labs").then(r=>r.json())]);setItems(Array.isArray(technologies)?technologies:[]);setLabs(Array.isArray(labRows)?labRows:[]);setLoading(false);}
  useEffect(()=>{load();},[]);
  const groups=useMemo(()=>items.reduce((map,item)=>{const key=item.lab.name;(map[key]??=[]).push(item);return map;},{}),[items]);
  const fileCount=items.reduce((sum,item)=>sum+item.documents.length,0);
  return <div className="container wide-container"><section className="module-hero green"><div><span className="eyebrow">Dedicated project repository</span><h2>FICCI–CSIR Technology Showcase</h2><p>Only FICCI project records appear here. They never merge into the 1,736-record Master Technology Register.</p><div className="module-kpis"><span>{items.length} technologies in this view</span><span>{Object.keys(groups).length} laboratories</span><span>{fileCount} linked documents in this view</span></div></div><div><div className="folder-proof">✓ Root folder: FICCI/</div><br/><Link className="btn secondary" href="/projects">Project containers</Link></div></section>
    <form className="toolbar filters card" onSubmit={(e)=>{e.preventDefault();load();}}><input className="search-input grow" placeholder="Search FICCI technology, PI or description" value={filters.q} onChange={(e)=>setFilters({...filters,q:e.target.value})}/><select value={filters.labId} onChange={(e)=>setFilters({...filters,labId:e.target.value})}><option value="">All FICCI labs</option>{labs.map((lab)=><option value={lab.id} key={lab.id}>CSIR-{lab.code}</option>)}</select><input className="search-input" placeholder="Technology area" value={filters.sector} onChange={(e)=>setFilters({...filters,sector:e.target.value})}/><button className="btn small">Apply filters</button></form>
    {loading?<p className="empty">Loading preserved FICCI repository…</p>:!items.length?<p className="empty">No FICCI technologies match these filters.</p>:Object.entries(groups).map(([labName,technologies])=><section className="ficci-lab-section" key={labName}><h3><span>{labName}</span><span className="ficci-count">{technologies.length} technologies</span></h3><div className="module-card-grid">{technologies.map((technology)=><Link href={`/ficci/${technology.id}`} className="module-record-card" key={technology.id}><div><span className="badge success">FICCI PROJECT</span><h3>{technology.name}</h3><p>{technology.briefDescription}</p></div><footer><span>PI {technology.piName||"Not recorded"}</span><span>{technology.documents.length} source file(s) →</span></footer></Link>)}</div></section>)}
  </div>;
}
