"use client";
import Link from 'next/link';
import {safeInternalPath} from '../../lib/safeNavigation';
import {useEffect,useRef,useState} from 'react';
export default function NotificationBell(){
 const [rows,setRows]=useState([]),[queue,setQueue]=useState([]);const seen=useRef(new Set()),dismissed=useRef(new Set()),initialized=useRef(false);
 useEffect(()=>{let closed=false,running=false;async function refresh(){if(running||document.hidden)return;running=true;try{const r=await fetch('/api/notifications',{cache:'no-store'});if(!r.ok)return;const data=await r.json();if(!Array.isArray(data)||closed)return;
 const fresh=data.filter(n=>!n.read&&!dismissed.current.has(n.id)&&!seen.current.has(n.id)&&(initialized.current||['NEW_TECHNOLOGY','TECHNOLOGY_UPDATE'].includes(n.type)));
 data.forEach(n=>seen.current.add(n.id));initialized.current=true;setRows(data);setQueue(old=>{const unread=new Set(data.filter(n=>!n.read).map(n=>n.id));return [...old.filter(n=>unread.has(n.id)),...fresh.filter(n=>!old.some(x=>x.id===n.id))];});
 }catch{}finally{running=false;}}refresh();const timer=setInterval(refresh,10000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{closed=true;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 async function dismiss(n){dismissed.current.add(n.id);setQueue(q=>q.filter(x=>x.id!==n.id));try{const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:n.id})});if(r.ok)setRows(old=>old.map(x=>x.id===n.id?{...x,read:true}:x));}catch{}}
 const unread=rows.filter(n=>!n.read).length,toast=queue[0];
 return <><Link className="topbar-action notification-link" href="/notifications">Notifications{unread>0&&<span className="notification-count" aria-label={unread+' unread notifications'}>{unread>99?'99+':unread}</span>}</Link>{toast&&<aside className="notification-toast" role="status" aria-live="polite"><button type="button" onClick={()=>dismiss(toast)} aria-label="Dismiss notification">×</button><strong>{toast.title}</strong><p>{toast.message}</p>{queue.length>1&&<p>{queue.length-1} more updates waiting</p>}<Link href={safeInternalPath(toast.link)} onClick={()=>dismiss(toast)}>{['NEW_TECHNOLOGY','TECHNOLOGY_UPDATE'].includes(toast.type)?'View technology →':'View update →'}</Link></aside>}</>;
}
