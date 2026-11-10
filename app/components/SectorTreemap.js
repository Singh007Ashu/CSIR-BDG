"use client";
import CspElement from "./CspElement";
import {useMemo,useState} from 'react';
import {sectorTreemap} from '../../lib/sectorTreemap';
const colors=['#326f9c','#5361ad','#7653a3','#a14385','#ad4e60','#a55835','#8b6a21','#687929','#377f53','#247b79','#386897','#615899'];
export default function SectorTreemap({groups,selected,onSelect}){
 const [highlight,setHighlight]=useState(null);
 const blocks=useMemo(()=>sectorTreemap(groups.map((g,index)=>({...g,color:colors[index%colors.length]}))),[groups]);
 return <div className="sector-chart-wrap"><div className="sector-chart-heading"><strong>Technology Portfolio by Sector</strong><span>Block area represents technology count</span></div>
  {!blocks.length?<p className="empty">No technologies match the current filters.</p>:<div className="sector-treemap" role="group" aria-label="Technology counts by sector. Select a sector to filter technologies.">{blocks.map(block=><CspElement as="button" type="button" key={block.name} className={`treemap-block ${selected===block.name?'selected':''}`} css={{left:`${block.x/10}%`,top:`${block.y/4.2}%`,width:`${block.width/10}%`,height:`${block.height/4.2}%`,backgroundColor:block.color}} title={`${block.name}: ${block.count} technologies`} aria-label={`${block.name}: ${block.count} technologies`} aria-pressed={selected===block.name} onMouseEnter={()=>setHighlight(block)} onMouseLeave={()=>setHighlight(null)} onFocus={()=>setHighlight(block)} onBlur={()=>setHighlight(null)} onClick={()=>onSelect(selected===block.name?'':block.name)}><span className="treemap-name">{block.name}</span><strong>{block.count.toLocaleString('en-IN')}</strong></CspElement>)}</div>}
  <p className="treemap-caption" aria-live="polite">{highlight?`${highlight.name} · ${highlight.count.toLocaleString('en-IN')} technologies`:selected?`Selected: ${selected}`:'Select any block to explore its technologies and sub-sectors. Full names are also available in the sector list below.'}</p>
 </div>;
}
