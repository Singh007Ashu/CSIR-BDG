"use client";
import Link from "next/link";
import {useState} from "react";
import {useSearchParams} from "next/navigation";

export default function LoginPage(){
 const searchParams=useSearchParams(),nextPath=searchParams.get("next")||"/industry";
 const[mode,setMode]=useState("login"),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const[loginForm,setLoginForm]=useState({email:"",password:""});
 const[regForm,setRegForm]=useState({name:"",email:"",password:"",contactPhone:"",orgName:"",orgType:"Startup"});
 async function authenticate(register) {
  setError("");setSaving(true);
  try {
   const res=await fetch(register?"/api/auth/register":"/api/auth/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(register?regForm:loginForm)});
   const data=await res.json().catch(()=>({error:"Server could not complete the request. Please try again."}));
   if(!res.ok){
    if(register&&res.status===409){setLoginForm({email:regForm.email,password:""});setMode("login");throw new Error("This email is already registered. Sign in using your existing password.");}
    throw new Error(data.error||"Unable to sign in.");
   }
   const check=await fetch("/api/auth/me",{cache:"no-store",credentials:"same-origin"});
   const identity=await check.json();
   if(!identity.user)throw new Error(register?"Account created, but the browser did not retain your session. Enable cookies and sign in with the same email and password.":"Your browser did not retain the login session. Enable cookies and try again.");
   const safeNext=nextPath.startsWith("/")&&!nextPath.startsWith("//")&&!nextPath.includes("\\")?nextPath:"/industry";
   const industryNext=["/industry","/module2","/module3","/notifications"].some(p=>safeNext===p||safeNext.startsWith(p+"/")||safeNext.startsWith(p+"?"))?safeNext:"/industry";
   window.location.replace(identity.user.role==="APPLICANT"?industryNext:safeNext==="/industry"?"/workspace":safeNext);
  }catch(err){setError(err.message||"Connection failed. Please try again.");}finally{setSaving(false);}
 }
 async function handleLogin(e){e.preventDefault();await authenticate(false);}
 async function handleRegister(e){e.preventDefault();await authenticate(true);}
 return <div className="container wide-container v2-login-page">
  <section className="v2-login-intro"><div><span className="v2-badge">CSIR BUSINESS DEVELOPMENT GROUP</span><h2>One platform.<br/>The right desk for every role.</h2><p>Select your portal. Laboratory users enter source data; governing bodies validate and decide; industry users submit problems and track engagement.</p><Link href="/platform-flow">Understand the four-track flow →</Link></div><div className="v2-login-flow"><span>01 Technology Transfer</span><span>02 Sponsored Research</span><span>03 Co-Development</span><span>04 Repository & CRM</span></div></section>
  <section className="v2-portal-choices"><Link href="/lab-login"><span>LAB</span><div><strong>Laboratory Data Entry</strong><small>Enter technologies, evidence and responses</small></div><b>→</b></Link><Link href="/governance-login"><span>HQ</span><div><strong>Governing Body</strong><small>BDG, CPD, IMD, TMD, IPU, URDIP, ICM</small></div><b>→</b></Link><a className="active" href="#industry-login"><span>IN</span><div><strong>Industry / Startup</strong><small>Submit problems and track collaboration</small></div><b>↓</b></a></section>
  <section className="v2-industry-login" id="industry-login"><div><span className="eyebrow">Industry & startup portal</span><h3>{mode==="login"?"Continue your engagement":"Create your organization account"}</h3><p>{mode==="login"?"Submit a problem, review proposals and track delivery through one governed engagement record.":"Register the organization once, then create problem statements and collaboration requests."}</p></div><div className="card"><h2 className="section-title">{mode==="login"?"Sign in":"Register"}</h2>
   {mode==="login"?<form onSubmit={handleLogin}><label>Email<input type="email" required value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})}/></label><label>Password<input type="password" required value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})}/></label>{error&&<p className="danger-text">{error}</p>}<button className="btn" disabled={saving}>{saving?"Signing in…":"Open industry workspace"}</button><p className="meta">New Industry / Startup? <button type="button" className="inline-text-button" onClick={()=>{setError("");setMode("register")}}>Register here</button></p></form>
   :<form onSubmit={handleRegister}><label>Your name<input required value={regForm.name} onChange={e=>setRegForm({...regForm,name:e.target.value})}/></label><label>Email<input type="email" required value={regForm.email} onChange={e=>setRegForm({...regForm,email:e.target.value})}/></label><label>Password<input type="password" required minLength="10" value={regForm.password} onChange={e=>setRegForm({...regForm,password:e.target.value})}/></label><label>Contact phone<input value={regForm.contactPhone} onChange={e=>setRegForm({...regForm,contactPhone:e.target.value})}/></label><label>Organization / startup<input required value={regForm.orgName} onChange={e=>setRegForm({...regForm,orgName:e.target.value})}/></label><label>Type<select value={regForm.orgType} onChange={e=>setRegForm({...regForm,orgType:e.target.value})}><option>Industry</option><option>Startup</option><option>Government</option><option>Other</option></select></label>{error&&<p className="danger-text">{error}</p>}<button className="btn" disabled={saving}>{saving?"Creating account…":"Register & continue"}</button><p className="meta">Already registered? <button type="button" className="inline-text-button" onClick={()=>{setError("");setMode("login")}}>Sign in</button></p></form>}
  </div></section>
 </div>
}
