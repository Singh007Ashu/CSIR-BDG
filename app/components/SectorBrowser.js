"use client";
import SectorTreemap from "./SectorTreemap";
import { useMemo } from 'react';
import { TECHNOLOGY_SECTORS, UNCLASSIFIED, matchesSector } from '../../lib/technologySectors';

export default function SectorBrowser({items, sector, subSector, onChange}) {
 const groups=useMemo(()=>TECHNOLOGY_SECTORS.map(s=>({...s,count:items.filter(t=>matchesSector(t,s.name)).length})),[items]);
 const selected=TECHNOLOGY_SECTORS.find(s=>s.name===sector);
 const unclassified=useMemo(()=>items.filter(t=>matchesSector(t,UNCLASSIFIED)).length,[items]);
 return <section className="sector-browser" aria-label="Browse technologies by industrial application">
  <div className="sector-heading"><div><h3>Browse by Industrial Application</h3><p>Select a sector, then a sub-sector to explore technology records.</p></div>{sector&&<button className="btn secondary small" onClick={()=>onChange('','')}>Clear sector filter</button>}</div>
  <SectorTreemap groups={[...groups,...(unclassified?[{name:UNCLASSIFIED,count:unclassified}]:[])]} selected={sector} onSelect={s=>onChange(s,'')}/>
  <details className="sector-list-disclosure"><summary>View all sectors and counts</summary><div className="sector-grid">{groups.map(s=><button type="button" key={s.name} aria-pressed={sector===s.name} className={`sector-tile ${sector===s.name?'selected':''}`} onClick={()=>onChange(sector===s.name?'':s.name,'')}><span>{s.name}</span><strong>{s.count}</strong></button>)}{unclassified>0&&<button className={`sector-tile ${sector===UNCLASSIFIED?'selected':''}`} aria-pressed={sector===UNCLASSIFIED} onClick={()=>onChange(UNCLASSIFIED,'')}><span>{UNCLASSIFIED}</span><strong>{unclassified}</strong></button>}</div>
  </details>
  {selected&&<div className="sector-subcategories"><h4>{selected.name}</h4><div><button className={!subSector?'selected':''} aria-pressed={!subSector} onClick={()=>onChange(sector,'')}>All sub-sectors</button>{selected.children.map(child=><button key={child} className={subSector===child?'selected':''} aria-pressed={subSector===child} onClick={()=>onChange(sector,child)}>{child}<span>{items.filter(t=>matchesSector(t,sector,child)).length}</span></button>)}<button className={subSector===UNCLASSIFIED?'selected':''} aria-pressed={subSector===UNCLASSIFIED} onClick={()=>onChange(sector,UNCLASSIFIED)}>Other / unrecorded sub-sector<span>{items.filter(t=>matchesSector(t,sector,UNCLASSIFIED)).length}</span></button></div></div>}
  <p className="sector-note">Counts use the records available in this view. A technology may appear in multiple sectors; sector totals are not additive. Unmapped records remain available.</p>
 </section>;
}
