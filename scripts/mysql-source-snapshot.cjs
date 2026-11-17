const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'.tmp/security-preview-2026-11-06.sqlite');
const destination=path.join(root,'storage/mysql-local/source-snapshot.sqlite');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 if(fs.existsSync(destination))throw Error('Snapshot exists; refusing overwrite');
 const before=sha(source),db=new DatabaseSync(source,{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Invalid source');
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Source FK errors');
  await backup(db,destination);
  const counts={};for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())counts[name]=db.prepare('SELECT COUNT(*) AS n FROM "'+name.replaceAll('"','""')+'"').get().n;
  if(before!==sha(source))throw Error('Source changed during backup');
  const report={date:new Date().toISOString(),source,sourceUnchanged:true,sourceSha256:before,counts};
  fs.writeFileSync(path.join(root,'security-review/mysql-migration-source-2026-11-16.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({tables:Object.keys(counts).length,rows:Object.values(counts).reduce((a,b)=>a+b,0),users:counts.User,labs:counts.Lab,technologies:counts.Technology,sourceUnchanged:true}));
 }finally{db.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
