"use client";

import { useRouter } from "next/navigation";
import ProfileEditor from "./ProfileEditor";
import { ROLE_LABELS } from "../../lib/roles";

export default function AuthBar({user,lab}){
  const router=useRouter(); async function logout(){await fetch(user?"/api/auth/logout":"/api/lab-auth/logout",{method:"POST"});router.push(user?"/governance-login":"/lab-login");router.refresh();}
  if(!user&&!lab)return <div className="authbar public-auth"><a href="/lab-login" className="header-link">Lab Login</a><a href="/governance-login" className="header-link accent">Governing Body Login</a><a href="/login" className="header-link">Industry</a></div>;
  return <div className="authbar">{user&&["HEAD_ADMIN","HEAD_BDG","ADMIN","SUPER_ADMIN"].includes(user.role)?<ProfileEditor user={user}/>:<div className="identity-dot">{(user?.name||lab?.name||"C").charAt(0)}</div>}<span className="authbar-name"><strong>{user?.name||lab?.name}</strong>{user?.designation&&<small title={user.designation}>{user.designation}</small>}<span className="authbar-role">{user?ROLE_LABELS[user.role]||user.role:lab.labId}</span></span><button className="logout-button" onClick={logout}>Logout</button></div>;
}
