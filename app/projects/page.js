"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AssignedCollaboration from "../components/AssignedCollaboration";

const fresh = () => ({ name:"", description:"", projectType:"GENERAL", startDate:"", endDate:"", notes:"", assignedLabIds:[], initialTechnologyId:"", initialTechnologyName:"", initialTechnologyDescription:"", initialTechnologyPi:"", initialTechnologySector:"", initialTechnologyTrl:"", initialTechnologyYear:new Date().getFullYear() });

export default function ProjectsPage() {
  const [projects,setProjects]=useState([]), [me,setMe]=useState(null), [labs,setLabs]=useState([]), [labTechnologies,setLabTechnologies]=useState([]), [form,setForm]=useState(fresh()), [show,setShow]=useState(false), [message,setMessage]=useState("");

  async function load() {
    const [rows,userResult,labResult,labRows]=await Promise.all([fetch("/api/projects").then(r=>r.json()),fetch("/api/auth/me").then(r=>r.json()).catch(()=>({})),fetch("/api/lab-auth/me").then(r=>r.json()).catch(()=>({})),fetch("/api/labs").then(r=>r.json()).catch(()=>[])]);
    setProjects(Array.isArray(rows)?rows:[]); setLabs(Array.isArray(labRows)?labRows:[]); setMe(userResult.user||labResult.lab||null);
    if(labResult.lab){const technologies=await fetch("/api/technologies?scope=MASTER").then(r=>r.json());setLabTechnologies(Array.isArray(technologies)?technologies:[])}
  }
  useEffect(()=>{load()},[]);
  const manager=["HEAD_ADMIN","HEAD_BDG","ADMIN","SUPER_ADMIN"].includes(me?.role), labIdentity=Boolean(me?.labId), canCreate=manager;
  const demos=projects.filter(project=>project.isSystem), regular=projects.filter(project=>!project.isSystem);

  function toggleLab(id){setForm(value=>({...value,assignedLabIds:value.assignedLabIds.includes(id)?value.assignedLabIds.filter(item=>item!==id):[...value.assignedLabIds,id]}))}

  async function submit(event) {
    event.preventDefault();
    if(manager&&!form.assignedLabIds.length)return setMessage("Assign at least one laboratory so it can enter project data.");
    const response=await fetch("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const body=await response.json(); setMessage(response.ok?(manager?"Project created and assigned laboratories can now add technologies.":"Project and initial technology sent for review."):(body.error||"Unable to create project."));
    if(response.ok){setForm(fresh());setShow(false);load()}
  }

  const card=(project,demo=false)=><article className={`project-container-card ${demo?"demo":""}`} key={project.id}><div className="project-card-top"><span className={`badge ${project.status==="ACTIVE"?"success":"warning"}`}>{demo?"DEMO PROJECT":project.status.replaceAll("_"," ")}</span><small>{project.projectType.replaceAll("_"," ")}</small></div><h3>{project.name}</h3><p>{project.description||"Project technologies and their laboratory-provided briefs."}</p>{project.assignedLabs?.length>0&&<p className="meta">Assigned: {project.assignedLabs.map(lab=>`CSIR-${lab.code}`).join(", ")}</p>}<div className="project-card-counts"><span><strong>{project._count.technologies}</strong> technologies</span>{!demo&&<><span><strong>{project._count.reports}</strong> reports</span><span><strong>{project._count.queries}</strong> queries</span></>}</div><footer><Link className="btn" href={`/projects/${project.id}`}>{demo?"Browse technologies":"Open project"}</Link></footer></article>;

  return <div className="container wide-container project-hub">
    <section className="project-hub-hero"><div><span className="eyebrow">Controlled workspaces</span><h2>Project Portfolio</h2><p>{manager?"Create a project container and assign laboratories. Assigned labs will enter and maintain project technologies.":"Enter your laboratory technologies in projects assigned by HEAD BDG."}</p></div>{canCreate&&<button className="btn" onClick={()=>setShow(!show)}>{show?"Close form":"+ Create New Project"}</button>}</section>
    {message&&<div className="notice">{message}</div>}
    {labIdentity && <AssignedCollaboration />}
    {show&&<form className="card project-create-form" onSubmit={submit}><div className="section-row"><div><span className="eyebrow">{manager?"HEAD project setup":"Laboratory project entry"}</span><h3>Create Project Container</h3></div><button type="button" className="btn secondary" onClick={()=>setShow(false)}>Cancel</button></div>
      <div className="grid-2"><label>Project name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Project type<select value={form.projectType} onChange={e=>setForm({...form,projectType:e.target.value})}><option value="GENERAL">General</option><option value="SPONSORED_RESEARCH">Sponsored Research</option><option value="CO_DEVELOPMENT">Co-Development</option><option value="INDUSTRY_PARTNERSHIP">Industry Partnership</option><option value="MISSION_MODE">Mission Mode</option></select></label><label>Start date<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>End date<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label></div>
      <label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      {manager&&<fieldset><legend>Assign laboratories *</legend><p className="meta">Only selected laboratories will see this project and add their technology data.</p><div className="lab-assignment-grid">{labs.filter(lab=>lab.accountStatus==="ACTIVE").map(lab=><label className="check" key={lab.id}><input type="checkbox" checked={form.assignedLabIds.includes(lab.id)} onChange={()=>toggleLab(lab.id)}/> CSIR-{lab.code}<small>{lab.name}</small></label>)}</div></fieldset>}
      {labIdentity&&<fieldset><legend>Initial laboratory technology</legend><label>Use existing technology<select value={form.initialTechnologyId} onChange={e=>setForm({...form,initialTechnologyId:e.target.value})}><option value="">Create a new draft technology</option>{labTechnologies.map(technology=><option value={technology.id} key={technology.id}>{technology.name}</option>)}</select></label>{!form.initialTechnologyId&&<div className="grid-2"><label>Technology name *<input required value={form.initialTechnologyName} onChange={e=>setForm({...form,initialTechnologyName:e.target.value})}/></label><label>PI / owner<input value={form.initialTechnologyPi} onChange={e=>setForm({...form,initialTechnologyPi:e.target.value})}/></label><label>Sector / theme<input value={form.initialTechnologySector} onChange={e=>setForm({...form,initialTechnologySector:e.target.value})}/></label><label>TRL<input type="number" min="1" max="9" value={form.initialTechnologyTrl} onChange={e=>setForm({...form,initialTechnologyTrl:e.target.value})}/></label><label>Financial year<input type="number" min="1900" max={new Date().getFullYear()} value={form.initialTechnologyYear} onChange={e=>setForm({...form,initialTechnologyYear:e.target.value})}/></label><label>Brief description<textarea value={form.initialTechnologyDescription} onChange={e=>setForm({...form,initialTechnologyDescription:e.target.value})}/></label></div>}</fieldset>}
      <button className="btn">{manager?"Create & Assign Project":"Create Project"}</button>
    </form>}
    {demos.length>0&&<section className="project-section"><div className="section-row"><div><span className="eyebrow">Reference workspace</span><h3>Demo Projects</h3><p className="meta">Examples remain separate from operational projects.</p></div></div><div className="project-card-grid">{demos.map(project=>card(project,true))}</div></section>}
    <section className="project-section"><div className="section-row"><div><span className="eyebrow">Operational work</span><h3>{manager?"Lab Projects":"My Assigned Projects"}</h3><p className="meta">{manager?"Open any project to review lab-submitted data.":"Projects assigned to your laboratory by HEAD BDG. Open one to enter or link your technology data."}</p></div>{canCreate&&<button className="btn secondary" onClick={()=>setShow(true)}>+ New Project</button>}</div>{regular.length?<div className="project-card-grid">{regular.map(project=>card(project))}</div>:<div className="empty">No operational project is available yet.</div>}</section>
  </div>;
}
