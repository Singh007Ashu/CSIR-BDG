"use client";
import {useEffect,useState} from "react";
import SopInstructorWorkspace from "../components/SopInstructorWorkspace";

export default function SopDataEntryPage(){const[data,setData]=useState(null);useEffect(()=>{fetch("/api/sop").then(r=>r.json()).then(setData)},[]);if(!data)return <div className="container"><p className="empty">Opening SOP data-entry desk…</p></div>;return <div className="container wide-container sop-entry-page"><section className="sop-entry-hero"><div><span className="eyebrow">Direct laboratory submission</span><h2>SOP Data Entry</h2><p>Select the SOP, choose your technology, fill only the required fields and submit. Submitted records appear in the HEAD BDG view with their complete revision history.</p></div><div className="sop-entry-rule"><strong>3 simple actions</strong><span>1. Select SOP</span><span>2. Enter data</span><span>3. Submit to HEAD BDG</span></div></section><SopInstructorWorkspace definitions={data.instructor||[]} entryOnly/></div>}
