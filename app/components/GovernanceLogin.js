"use client";
import {useState} from "react";
import styles from "./governance-login.module.css";

export default function GovernanceLogin(){
 const [form,setForm]=useState({email:"",password:""}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[visible,setVisible]=useState(false);
 async function login(e){
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const data=await r.json().catch(()=>({error:"Unable to connect. Please try again."}));
   if(!r.ok)throw new Error(data.error||"Login failed.");
   window.location.replace(["HEAD_ADMIN","HEAD_BDG","ADMIN","SUPER_ADMIN"].includes(data.role)?"/head-admin":data.role==="APPLICANT"?"/industry":"/governance-dashboard");
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className={`${styles.page} hq-governance-page`}><section className={styles.panel}>
  <header><span className={styles.eyebrow}>CSIR BDG</span><h2>HEAD BDG & Governing Body Login</h2><p>Login to review laboratory submissions, track projects and respond to queries.</p></header>
  <form onSubmit={login}>
   <label htmlFor="governance-email">Official email</label>
   <input id="governance-email" type="email" autoComplete="username" required placeholder="Enter your registered email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
   <div className={styles.passwordLabel}><label htmlFor="governance-password">Password</label><button type="button" onClick={()=>setVisible(!visible)} aria-pressed={visible}>{visible?"Hide":"Show"} password</button></div>
   <input id="governance-password" type={visible?"text":"password"} autoComplete="current-password" required placeholder="Enter your password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <button className={styles.submit} type="submit" disabled={busy}>{busy?"Logging in…":"Login"}</button>
  </form>
  <p className={styles.help}>Need an account or password help? Contact your platform administrator.</p>
  <nav className={styles.links} aria-label="Other login options"><a href="/lab-login">Lab Login</a><a href="/login">Industry Login</a></nav>
 </section><p className={styles.footer}>Your account opens the dashboard assigned to your role.</p></div>;
}
