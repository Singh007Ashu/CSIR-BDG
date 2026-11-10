"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import SectorBrowser from "../components/SectorBrowser";
import { matchesSector } from "../../lib/technologySectors";

export default function IndustryPage() {
  const [sector,setSector]=useState(""),[subSector,setSubSector]=useState("");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("Loading technologies…");
  useEffect(() => { fetch("/api/industry-catalog").then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setItems(data); setMessage(""); }).catch(e => setMessage(e.message)); }, []);
  const baseFiltered = items.filter(t => [t.name, t.applications, t.sector, t.lab.name].join(" ").toLowerCase().includes(q.toLowerCase()));
  const filtered=baseFiltered.filter(t=>matchesSector(t,sector,subSector));
  return <div className="container"><h2 className="section-title">Industry Technology Catalogue</h2><p className="section-sub">Explore technology briefs and track requests submitted by your organisation. Availability and transfer terms are confirmed by CSIR.</p>
    <div className="row-actions"><Link className="btn" href="/module2">My research requests</Link><Link className="btn secondary" href="/module3">My partnership requests</Link></div>
    <label>Search technology, application or laboratory</label><input value={q} onChange={e => setQ(e.target.value)} placeholder="For example: water treatment" />
    <SectorBrowser items={baseFiltered} sector={sector} subSector={subSector} onChange={(s,sub)=>{setSector(s);setSubSector(sub);setSelected(null);}}/>
    {message && <p className="notice">{message}</p>}
    {selected && <section className="card"><button className="btn small secondary" onClick={() => setSelected(null)}>Close brief</button><h3>{selected.name}</h3><p className="meta">{selected.lab.name} · TRL {selected.trl ?? "Not provided"}</p><p>{selected.briefDescription}</p><h4>Applications</h4><p>{selected.applications || "Contact CSIR for details."}</p><h4>Advantages</h4><p>{selected.advantages || "Not provided."}</p><Link className="btn" href="/module2">Submit a related requirement</Link></section>}
    <p>{filtered.length} technologies</p><div className="grid-2">{filtered.slice(0, 100).map(t => <article className="card" key={t.id}><span className="badge">{t.lab.code}</span><h3>{t.name}</h3><p>{t.briefDescription?.slice(0, 220)}</p><button className="btn secondary" onClick={() => { setSelected(t); window.scrollTo({top:0,behavior:"smooth"}); }}>Read technology brief</button></article>)}</div>{filtered.length > 100 && <p>Showing the first 100 results. Use search to narrow the catalogue.</p>}
  </div>;
}
