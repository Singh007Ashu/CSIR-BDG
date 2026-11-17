const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'storage/mysql-local');
const c=JSON.parse(fs.readFileSync(path.join(folder,'connection-private.json'),'utf8'));
const {PrismaClient,Prisma}=require('@prisma/client'),{PrismaClient:MySQL}=require('@csir/mysql-client');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'security-review/mysql-migration-source-2026-11-16.json'),'utf8'));
const source=new PrismaClient({datasources:{db:{url:'file:'+path.join(folder,'source-snapshot.sqlite').replaceAll('\\','/')}}});
const target=new MySQL({datasources:{db:{url:`mysql://${c.appUser}:${c.appPassword}@127.0.0.1:${c.port}/${c.database}`}}});
const digest=(rows,fields)=>crypto.createHash('sha256').update(rows.map(row=>JSON.stringify(Object.fromEntries(fields.map(k=>[k,row[k]])),(_,v)=>typeof v==='bigint'?String(v):v)).sort().join('\n')).digest('hex');
(async()=>{
 const results=[];for(const m of Prisma.dmmf.datamodel.models){const key=m.name[0].toLowerCase()+m.name.slice(1),fields=m.fields.filter(f=>f.kind!=='object').map(f=>f.name).sort();const a=await source[key].findMany(),b=await target[key].findMany();results.push({table:m.name,rows:b.length,exactMatch:a.length===b.length&&digest(a,fields)===digest(b,fields)});}
 const sourceUnchanged=crypto.createHash('sha256').update(fs.readFileSync(baseline.source)).digest('hex')===baseline.sourceSha256;
 const report={date:new Date().toISOString(),sourceUnchanged,allFieldsAndCredentialHashesMatch:results.every(r=>r.exactMatch),tables:results.length,rows:results.reduce((a,b)=>a+b.rows,0),results};
 fs.writeFileSync(path.join(root,'security-review/mysql-final-verification-2026-11-16.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,results:undefined}));if(!sourceUnchanged||!report.allFieldsAndCredentialHashesMatch)throw Error('Final reconciliation failed');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await source.$disconnect();await target.$disconnect();});
