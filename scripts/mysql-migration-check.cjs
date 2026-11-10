// Offline source preflight only. Does NOT connect to MySQL or modify SQLite.
const fs=require('fs'),crypto=require('crypto');const {DatabaseSync}=require('node:sqlite');
const source=process.env.SQLITE_MIGRATION_SOURCE;if(!source)throw Error('Set SQLITE_MIGRATION_SOURCE to an explicit SQLite snapshot path.');
const db=new DatabaseSync(source,{readOnly:true});
try{
 const integrity=db.prepare('PRAGMA integrity_check').all();const foreignKeys=db.prepare('PRAGMA foreign_key_check').all();
 const counts={},issues=[];const schema=fs.readFileSync('prisma/mysql/schema.prisma','utf8');
 for(const model of schema.matchAll(/model (\w+)\s*\{([\s\S]*?)\n\}/g)){
  const name=model[1];if(!/^\w+$/.test(name))throw Error('Invalid schema identifier');
  const rows=db.prepare(`SELECT * FROM "${name}"`).all();counts[name]=rows.length;
  for(const field of model[2].matchAll(/^\s*(\w+)\s+String\??[^\n]*@db.VarChar\(191\)/gm))for(const row of rows)if(row[field[1]]!=null&&[...String(row[field[1]])].length>191)issues.push({model:name,id:row.id,field:field[1],reason:'Indexed string exceeds target 191-character limit'});
 }
 const output={sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),integrity,foreignKeys,counts,issues,mysqlValidated:false,note:'No credentials or row values included. Actual MySQL import and reconciliation still required.'};
 fs.writeFileSync('security-review/mysql-source-preflight.json',JSON.stringify(output,null,2));
 console.log(JSON.stringify({tables:Object.keys(counts).length,rows:Object.values(counts).reduce((a,b)=>a+b,0),issues:issues.length,foreignKeyErrors:foreignKeys.length,mysqlValidated:false}));
 if(issues.length||foreignKeys.length||integrity.some(r=>r.integrity_check!=='ok'))process.exitCode=1;
}finally{db.close();}
