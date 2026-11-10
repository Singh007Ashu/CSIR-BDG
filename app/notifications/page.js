"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { safeInternalPath } from "../../lib/safeNavigation";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  async function load() { await fetch("/api/mous/alerts", { method: "POST" }); setItems(await fetch("/api/notifications").then((r) => r.json())); }
  useEffect(() => { load(); }, []);
  async function read(id) { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) }); load(); }
  async function open(item) {
    if (!item.read) await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    const destination = item.type === "NEW_REGISTRATION" ? "/admin?tab=laboratories" : item.link;
    if (destination) router.push(safeInternalPath(destination));
  }
  if (!items) return <div className="container"><p className="empty">Loading notifications...</p></div>;
  return <div className="container"><div className="page-heading"><div><h2 className="section-title">Notifications</h2><p className="section-sub">Approvals, comments, registrations, technologies, MOUs and expiry alerts.</p></div><button className="btn secondary small" onClick={() => read(null)}>Mark all read</button></div>{!items.length ? <p className="empty">No notifications yet.</p> : items.map((item) => <div className={`card notification ${item.read ? "read" : ""}`} key={item.id} onClick={() => item.link ? open(item) : !item.read && read(item.id)} role={item.link ? "link" : undefined} tabIndex={item.link ? 0 : undefined} onKeyDown={(event) => { if (item.link && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(item); } }}><span className="badge">{item.type.replaceAll("_", " ")}</span><h3>{item.title}</h3><p>{item.message}</p><p className="meta">{new Date(item.createdAt).toLocaleString()} {item.link && <>· <button type="button" className="link" onClick={(event) => { event.stopPropagation(); open(item); }}>Open approval</button></>}</p></div>)}</div>;
}
