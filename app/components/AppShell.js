"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NotificationBell from "./NotificationBell";
import AuthBar from "./AuthBar";
import AccessibilitySupport from "./AccessibilitySupport";

const MANAGERS = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
const GOVERNING = ["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM", "LAB_BD", "PI"];
const LABELS = {"lab-profiles":"Laboratory Profiles","industry-matchmaking":"Technology Matching","industry":"Technology Catalogue","workspace":"Overview","platform-flow":"Process Overview","head-admin":"HEAD BDG Dashboard","governance-dashboard":"Assigned Reviews","lab-dashboard":"Lab Data Entry","sop-data-entry":"SOP Data Entry","master-technologies":"Technology Register","ficci":"FICCI Showcase","projects":"Project Portfolio","lab-monitoring":"Laboratories","module2":"Sponsored Research","module3":"Industry Partnerships","co-development":"Co-Development","commercial-engagements":"Pricing & Consultancy","mou-repository":"MoU & Agreements","ai-intake":"AI Document Analysis","workflow-tracker":"Workflow Tracker","sop-roadmap":"SOP Roadmap","raci-access":"Roles & Responsibilities","monthly-reporting":"Monthly Reporting","quarterly-reporting":"Quarterly Reporting","queries":"Queries","reports":"Reports & Exports","excel-templates":"Data Templates","notifications":"Notifications","admin":"Administration","search":"Global Search"};

function isCurrent(pathname,href){return pathname===href||(href!=="/workspace"&&pathname.startsWith(`${href}/`));}
function NavItem({item,pathname,collapsed,onNavigate}){return <Link href={item.href} className={`shell-nav-item ${isCurrent(pathname,item.href)?"current":""}`} onClick={onNavigate} title={collapsed?item.label:undefined} aria-current={isCurrent(pathname,item.href)?"page":undefined}><span className="shell-nav-mark" aria-hidden="true">{item.mark}</span><span className="shell-nav-label">{item.label}</span></Link>;}

export default function AppShell({children,user,lab}){
  const pathname=usePathname();const[collapsed,setCollapsed]=useState(false);const[drawerOpen,setDrawerOpen]=useState(false);
  const role=user?.role||lab?.role,manager=MANAGERS.includes(role),governing=GOVERNING.includes(role);
  useEffect(()=>{setDrawerOpen(false);},[pathname]);
  const groups=useMemo(()=>{
    if(role === "APPLICANT") return [["Industry workspace", [{href:"/industry",label:"Technology Catalogue",mark:"TC"},{href:"/module2",label:"My Research Requests",mark:"SR"},{href:"/module3",label:"My Partnership Requests",mark:"IP"},{href:"/notifications",label:"Notifications",mark:"NO"}]]];
    if(lab)return [
      ["Overview",[
        {href:"/lab-dashboard",label:"Data Entry & Submissions",mark:"DE"},
        {href:"/lab-profiles",label:"Laboratory Profile",mark:"LP"},
        {href:"/platform-flow",label:"Process Overview",mark:"FL"},
      ]],
      ["Technology Portfolio",[
        {href:"/master-technologies",label:"Technology Register",mark:"MT"},
        {href:"/projects",label:"Assigned Projects",mark:"PJ"},
      ]],
      ["Collaboration & Agreements",[
        {href:"/module2",label:"Sponsored Research",mark:"SR"},
        {href:"/module3",label:"Industry Partnerships",mark:"IP"},
        {href:"/co-development",label:"Co-Development",mark:"CD"},
        {href:"/mou-repository",label:"MoU & Agreements",mark:"MO"},
        {href:"/commercial-engagements",label:"Pricing & Consultancy",mark:"CP"},
      ]],
      ["SOP & Reporting",[
        {href:"/sop-data-entry",label:"SOP Data Entry",mark:"SD"},
        {href:"/monthly-reporting",label:"Monthly Reporting",mark:"MR"},
        {href:"/quarterly-reporting",label:"Quarterly Reporting",mark:"QR"},
        {href:"/workflow-tracker",label:"Submission Tracker",mark:"FT"},
      ]],
      ["Communication",[
        {href:"/queries",label:"HEAD BDG Queries",mark:"QE"},
        {href:"/notifications",label:"Notifications",mark:"NO"},
      ]],
    ];
    const overview=[{href:"/workspace",label:"Platform Overview",mark:"OV"}];
    overview.push({href:"/platform-flow",label:"Process Overview",mark:"FL"});
    if(lab)overview.push({href:"/lab-dashboard",label:"Lab Dashboard",mark:"LD"});
    if(manager)overview.push({href:"/head-admin",label:"HEAD BDG Dashboard",mark:"DD"});
    if(manager)overview.push({href:"/lab-profiles",label:"Laboratory Profiles",mark:"LP"});
    if(governing)overview.push({href:"/governance-dashboard",label:"Assigned Reviews",mark:"RQ"});
    const portfolio=[{href:"/master-technologies",label:lab?"My Technologies":"Technology Register",mark:"MT"},{href:"/projects",label:"Project Portfolio",mark:"PJ"},...(manager?[{href:"/lab-monitoring",label:"Laboratories",mark:"LB"}]:[])];
    const collaboration=[...(!lab?[{href:"/module2",label:"Sponsored Research",mark:"SR"},{href:"/module3",label:"Industry Partnerships",mark:"IP"}]:[]),{href:"/co-development",label:"Co-Development",mark:"CD"},{href:"/mou-repository",label:"MoU & Agreements",mark:"MO"},{href:"/commercial-engagements",label:"Pricing & Consultancy",mark:"CP"}];
    const governanceItems=[{href:"/sop-data-entry",label:manager?"SOP Submissions":"SOP Data Entry",mark:"SD"},{href:"/ai-intake",label:"AI Document Analysis",mark:"AI"},...(manager?[{href:"/industry-matchmaking",label:"Technology Matching",mark:"IM"}]:[]),{href:"/workflow-tracker",label:"Workflow Tracker",mark:"FT"},{href:"/sop-roadmap",label:"SOP Reference Guide",mark:"SO"},...(manager?[{href:"/raci-access",label:"Roles & Responsibilities",mark:"RA"}]:[]),{href:"/monthly-reporting",label:"Monthly Reporting",mark:"MR"},{href:"/quarterly-reporting",label:"Quarterly Reporting",mark:"QR"},{href:"/queries",label:"Queries & Escalations",mark:"QE"}];
    const system=[{href:"/reports",label:"Reports & Exports",mark:"RE"}];if(manager)system.push({href:"/excel-templates",label:"Data Templates",mark:"XT"},{href:"/admin",label:"Administration",mark:"AD"});
    return [["Overview",overview],["Technology Portfolio",portfolio],["Collaboration & Agreements",collaboration],["SOP Governance",governanceItems],["Reports & Administration",system]];
  },[manager,governing,lab,role]);
  const firstSegment=pathname.split("/").filter(Boolean)[0];const activeItem=groups.flatMap(([,items])=>items).find((item)=>isCurrent(pathname,item.href));const pageLabel=activeItem?.label||LABELS[firstSegment]||"CSIR BDG Platform";
  const breadcrumbs=pathname.split("/").filter(Boolean).map((part)=>LABELS[part]||(/^\d+$/.test(part)?`Record ${part}`:part.replaceAll("-"," ")));

  if(!user&&!lab)return <div className="public-layout"><a className="skip-link" href="#main-content">Skip to main content</a><AccessibilitySupport/><header className="public-header"><Link className="brand" href="/"><Image src="/csir-logo.png" width={46} height={46} alt="CSIR logo" priority/><div><h1>CSIR BDG PLATFORM</h1><p>Technology Portfolio · Collaboration · Agreements · SOP Governance</p></div></Link><AuthBar user={user} lab={lab}/></header><main id="main-content" tabIndex={-1} className={["/governance-login","/lab-login","/login"].includes(pathname)?"hq-login-background":undefined}>{children}</main><footer className="site-footer">CSIR internal platform · Secure role-based access</footer></div>;
  return <div className={`app-shell ${collapsed?"is-collapsed":""} ${drawerOpen?"drawer-open":""}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a><AccessibilitySupport/>
    <button className="drawer-scrim" aria-label="Close navigation" onClick={()=>setDrawerOpen(false)}/>
    <aside id="primary-navigation" className="shell-sidebar" aria-label="Primary navigation">
      <div className="shell-brand"><Link href={lab?"/lab-dashboard":role==="APPLICANT"?"/industry":"/workspace"}><Image src="/csir-logo.png" width={42} height={42} alt="CSIR logo" priority/><span><strong>CSIR BDG</strong><small>{lab?"Laboratory Workspace":"Governance Platform"}</small></span></Link><button className="sidebar-close" onClick={()=>setDrawerOpen(false)} aria-label="Close navigation">×</button></div>
      <nav className="shell-navigation">{groups.map(([title,items])=><section className="shell-nav-group" key={title}><h2>{title}</h2>{items.map((item)=><NavItem item={item} pathname={pathname} collapsed={collapsed} onNavigate={()=>setDrawerOpen(false)} key={item.href}/>)}</section>)}</nav>
      <button className="sidebar-collapse" onClick={()=>setCollapsed((value)=>!value)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}><span aria-hidden="true">{collapsed?"›":"‹"}</span><span className="shell-nav-label">Collapse sidebar</span></button>
    </aside>
    <div className="shell-content">
      <header className="shell-topbar"><div className="topbar-context"><button className="mobile-menu" aria-expanded={drawerOpen} aria-controls="primary-navigation" onClick={()=>setDrawerOpen(true)} aria-label="Open navigation">☰</button><div><div className="breadcrumbs"><Link href={lab?"/lab-dashboard":role==="APPLICANT"?"/industry":"/workspace"}>Home</Link>{breadcrumbs.map((crumb,index)=><span key={`${crumb}-${index}`}><b>/</b>{index===breadcrumbs.length-1?<strong>{crumb}</strong>:crumb}</span>)}</div><h1>{pageLabel}</h1></div></div><div className="topbar-actions"><Link className="topbar-action" href="/search">Search</Link><NotificationBell/><AuthBar user={user} lab={lab}/></div></header>
      <main id="main-content" tabIndex={-1} className="shell-main">{children}</main><footer className="site-footer">CSIR internal platform · Portfolio, collaboration and SOP records remain separately controlled</footer>
    </div>
  </div>;
}
