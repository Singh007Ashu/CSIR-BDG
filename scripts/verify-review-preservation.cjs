const {DatabaseSync}=require('node:sqlite'),fs=require('fs'),crypto=require('crypto');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const source='.tmp/security-preview-2026-11-06.sqlite',baseline='.tmp/recovery-review-HGPeAu/backup.sqlite';
const a=new DatabaseSync(source,{readOnly:true}),b=new DatabaseSync(baseline,{readOnly:true});
try{
 const tables=a.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(),changed=[];
 for(const {name}of tables){const query='SELECT * FROM "'+name.replaceAll('"','""')+'"';const rows=db=>db.prepare(query).all().map(r=>JSON.stringify(r)).sort();if(hash(rows(a))!==hash(rows(b)))changed.push(name);}
 const credentials={};for(const name of ['User','Lab']){const query='SELECT id,passwordHash,passwordSalt FROM "'+name+'" ORDER BY id';const current=a.prepare(query).all();credentials[name]={count:current.length,unchanged:hash(current)===hash(b.prepare(query).all())};}
 const result={date:new Date().toISOString(),comparedTables:tables.length,changedTables:changed,credentials,scope:'Read-only comparison of existing testing database to pre-work backup; no credential values written'};
 fs.writeFileSync('security-review/five-area-preservation.json',JSON.stringify(result,null,2));console.log(result);if(changed.length||Object.values(credentials).some(r=>!r.unchanged))process.exitCode=1;
}finally{a.close();b.close();}
