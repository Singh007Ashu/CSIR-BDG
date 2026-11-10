"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const emptyTechnology = { labId: "", name: "", briefDescription: "", piName: "", sector: "", trl: "", recordFinancialYear: new Date().getFullYear() };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [master, setMaster] = useState([]);
  const [labSession, setLabSession] = useState(null);
  const [showTechnology, setShowTechnology] = useState(false);
  const [technology, setTechnology] = useState(emptyTechnology);
  const [filters, setFilters] = useState({ q: "", theme: "", trl: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [projectRow, labResult] = await Promise.all([
      fetch(`/api/projects/${id}`).then((response) => response.json()),
      fetch("/api/lab-auth/me").then((response) => response.json()).catch(() => ({})),
    ]);
    setProject(projectRow);
    setLabSession(labResult.lab || null);
    if (labResult.lab) setTechnology((value) => ({ ...value, labId: labResult.lab.id }));
  }

  useEffect(() => { load(); }, [id]);

  const isFicci = project && (project.slug === "ficci" || project.name?.toLowerCase().includes("ficci"));
  const canManage = Boolean(labSession) && !project?.isSystem;

  async function search(event) {
    event?.preventDefault();
    const params = new URLSearchParams({ scope: "MASTER", ...filters });
    const rows = await fetch(`/api/technologies?${params}`).then((response) => response.json());
    setMaster(Array.isArray(rows) ? rows.slice(0, 100) : []);
  }

  async function link(technologyId) {
    const response = await fetch(`/api/projects/${id}/technologies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technologyId }) });
    const body = await response.json();
    setMessage(response.ok ? "Technology linked to this project." : body.error);
    if (response.ok) { setMaster((rows) => rows.filter((row) => row.id !== technologyId)); load(); }
  }

  async function createTechnology(event) {
    event.preventDefault();
    const response = await fetch("/api/technologies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(technology) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Technology could not be created.");
    const linkResponse = await fetch(`/api/projects/${id}/technologies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technologyId: body.id }) });
    const linkBody = await linkResponse.json();
    if (!linkResponse.ok) return setMessage(`Technology was saved, but linking failed: ${linkBody.error}`);
    setMessage("New technology created and linked to the project.");
    setTechnology({ ...emptyTechnology, labId: labSession.id });
    setShowTechnology(false);
    load();
  }

  if (!project) return <div className="container"><p className="empty">Loading project…</p></div>;
  if (project.error) return <div className="container"><p className="notice danger-text">{project.error}</p></div>;

  const linked = new Set(project.technologies.map((item) => item.technologyId));

  return <div className="container wide-container">
    <p><Link className="link" href="/projects">← Projects</Link></p>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{isFicci ? "Reference / demo project" : "Laboratory project"}</span>
        <h2 className="section-title">{project.name}</h2>
        <p className="section-sub">{isFicci ? "Browse the technology collection. Open any technology to read its brief and source details." : (project.description || "Technologies linked to this project.")}</p>
      </div>
      {canManage && <button className="btn green" onClick={() => setShowTechnology(!showTechnology)}>{showTechnology ? "Cancel" : "+ New Technology"}</button>}
    </div>

    {message && <div className="notice">{message}</div>}

    {canManage && showTechnology && <form className="card" onSubmit={createTechnology}>
      <h3>Create and Link Technology</h3>
      <p className="meta">This laboratory entry is added once to the Technology Register and linked to this project.</p>
      <div className="grid-2">
        <div><label>Technology Name</label><input required value={technology.name} onChange={(event) => setTechnology({ ...technology, name: event.target.value })} /></div>
        <div><label>PI / Technical Owner</label><input value={technology.piName} onChange={(event) => setTechnology({ ...technology, piName: event.target.value })} /></div>
        <div><label>Sector / Theme</label><input value={technology.sector} onChange={(event) => setTechnology({ ...technology, sector: event.target.value })} /></div>
        <div><label>TRL</label><input type="number" min="1" max="9" value={technology.trl} onChange={(event) => setTechnology({ ...technology, trl: event.target.value })} /></div>
        <div><label>Financial Year</label><input type="number" min="1900" max={new Date().getFullYear()} value={technology.recordFinancialYear} onChange={(event) => setTechnology({ ...technology, recordFinancialYear: event.target.value })} /></div>
        <div><label>Brief Description</label><textarea value={technology.briefDescription} onChange={(event) => setTechnology({ ...technology, briefDescription: event.target.value })} /></div>
      </div>
      <button className="btn green">Save and Link Technology</button>
    </form>}

    <section className="card project-technology-panel">
      <div className="section-row"><div><h3>{isFicci ? "FICCI Demo Technologies" : "Project Technologies"}</h3><p className="meta">{project.technologies.length} technology record(s) · click a title to open the brief</p></div></div>
      {!project.technologies.length ? <p className="empty">No technology has been linked yet.</p> :
        <div className="table-wrap"><table className="clickable-table"><thead><tr><th>Laboratory</th><th>Technology</th><th>Sector / Theme</th><th>Technical Owner</th><th></th></tr></thead>
          <tbody>{project.technologies.map((item) => <tr key={item.id}>
            <td><strong>CSIR-{item.technology.lab.code}</strong><br/><span className="meta">{item.technology.lab.name}</span></td>
            <td><Link className="link" href={`/module1/${item.technology.id}`}><strong>{item.technology.name}</strong></Link></td>
            <td>{item.technology.theme || item.technology.sector || "Not provided"}</td>
            <td>{item.technology.piName || "Not provided"}</td>
            <td><Link className="btn secondary small" href={`/module1/${item.technology.id}`}>Open brief →</Link></td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    {canManage && <section>
      <div className="section-row"><div><h3>Link Existing Laboratory Technology</h3><p className="meta">Search your laboratory master records and link one without duplication.</p></div></div>
      <form className="toolbar filters card" onSubmit={search}>
        <input className="search-input grow" placeholder="Search master technology" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <input className="search-input" placeholder="Theme" value={filters.theme} onChange={(event) => setFilters({ ...filters, theme: event.target.value })} />
        <input type="number" min="1" max="9" placeholder="TRL" value={filters.trl} onChange={(event) => setFilters({ ...filters, trl: event.target.value })} />
        <button className="btn">Search</button>
      </form>
      {master.map((item) => <div className="card" key={item.id}><div className="page-heading"><div><h3>{item.name}</h3><p className="meta">CSIR-{item.lab.code} · {item.theme || item.sector || "Theme pending"} · TRL {item.trl || "—"}</p></div><button className="btn green small" disabled={linked.has(item.id)} onClick={() => link(item.id)}>{linked.has(item.id) ? "Linked" : "Link to Project"}</button></div></div>)}
    </section>}
  </div>;
}

