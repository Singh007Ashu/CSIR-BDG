"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MANAGERS = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
const GOVERNING = ["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM", "LAB_BD", "PI"];

function active(pathname, links) { return links.some((link) => pathname.startsWith(link.href)); }

export default function NavTabs({ user, lab }) {
  const pathname = usePathname(); if (!user && !lab) return null;
  const manager = MANAGERS.includes(user?.role), governing = GOVERNING.includes(user?.role), applicant = Boolean(user && !manager && !governing);
  const portfolio = [
    { href: "/master-technologies", label: lab ? "My Technologies" : "Technology Register" },
    { href: "/ficci", label: "FICCI Showcase" },
    { href: "/projects", label: "Project Portfolio" },
    ...(manager ? [{ href: "/lab-monitoring", label: "Laboratories" }] : []),
  ];
  const collaboration = [
    ...(!lab ? [{ href: "/module2", label: "Sponsored Research" }, { href: "/module3", label: "Industry Partnerships" }] : []),
    { href: "/co-development", label: "Co-Development" },
    { href: "/mou-repository", label: "MoU & Agreements" },
  ];
  const governance = [
    { href: "/ai-intake", label: "AI Intake" }, { href: "/workflow-tracker", label: "Workflow Tracker" },
    { href: "/sop-roadmap", label: "SOP Roadmap" }, ...(manager ? [{ href: "/raci-access", label: "Roles & Responsibilities" }] : []),
    { href: "/monthly-reporting", label: "Monthly Reporting" }, { href: "/quarterly-reporting", label: "Quarterly Reporting" },
    { href: "/queries", label: "Queries" }, { href: "/reports", label: "Reports" },
  ];
  if (applicant) return <nav className="tabs sorted-nav"><Link href="/workspace" className={`tab ${pathname === "/workspace" ? "active-head" : ""}`}>Home</Link><Link href="/ficci" className={`tab ${pathname.startsWith("/ficci") ? "active-head" : ""}`}>FICCI Technologies</Link><Link href="/module2" className={`tab ${pathname.startsWith("/module2") ? "active-head" : ""}`}>Sponsored Research</Link><Link href="/module3" className={`tab ${pathname.startsWith("/module3") ? "active-head" : ""}`}>Industry Partnership</Link></nav>;
  return <nav className="tabs sorted-nav">
    <Link href="/workspace" className={`tab command-link ${pathname === "/workspace" ? "active-head" : ""}`}>HEAD BDG</Link>
    {lab && <Link href="/lab-dashboard" className={`tab ${pathname.startsWith("/lab-dashboard") ? "active-head" : ""}`}>Lab Dashboard</Link>}
    {manager && <Link href="/head-admin" className={`tab ${pathname.startsWith("/head-admin") ? "active-head" : ""}`}>Head Dashboard</Link>}
    {governing && <Link href="/governance-dashboard" className={`tab ${pathname.startsWith("/governance-dashboard") ? "active-head" : ""}`}>Assigned Reviews</Link>}
    {[["Technology Portfolio", portfolio], ["Collaboration & Agreements", collaboration], ["SOP Governance", governance]].map(([label, links]) => <details className={`nav-group ${active(pathname, links) ? "active" : ""}`} key={label}><summary>{label}<span>⌄</span></summary><div className="nav-menu">{links.map((link) => <Link href={link.href} key={link.href} className={pathname.startsWith(link.href) ? "current" : ""}>{link.label}<span>→</span></Link>)}</div></details>)}
    <Link href="/notifications" className={`tab ${pathname.startsWith("/notifications") ? "active-head" : ""}`}>Notifications</Link>
    {manager && <Link href="/admin" className={`tab ${pathname.startsWith("/admin") ? "active-head" : ""}`}>Admin</Link>}
  </nav>;
}
