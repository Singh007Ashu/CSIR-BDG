const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'storage/mysql-local');
const c=JSON.parse(fs.readFileSync(path.join(folder,'connection-private.json'),'utf8'));
const bin='C:/Program Files/MySQL/MySQL Server 8.4/bin';
const {PrismaClient}=require('@csir/mysql-client');
const url=user=>`mysql://${user}:${encodeURIComponent(user==='root'?c.rootPassword:c.appPassword)}@127.0.0.1:${c.port}/${c.database}`;
const admin=new PrismaClient({datasources:{db:{url:url('root')}}});
const app=new PrismaClient({datasources:{db:{url:url(c.appUser)}}});
(async()=>{
 const info=await app.$queryRawUnsafe('SELECT VERSION() AS version, DATABASE() AS db');
 const rollbackName='MIGRATION_ROLLBACK_'+crypto.randomUUID();
 try{await app.$transaction(async tx=>{await tx.lab.create({data:{name:rollbackName,code:rollbackName}});throw Error('EXPECTED_ROLLBACK');});}catch(e){if(e.message!=='EXPECTED_ROLLBACK')throw e;}
 if(await app.lab.count({where:{name:rollbackName}}))throw Error('Rollback failed');
 const file=path.join(folder,'export-client.cnf');
 fs.writeFileSync(file,`[client]\nuser=root\npassword=${c.rootPassword}\nhost=127.0.0.1\nport=${c.port}\n`);
 const dump=path.join(folder,'CSIR-BDG-MySQL-2026-11-16.sql');
 try{
  const r=cp.spawnSync(path.join(bin,'mysqldump.exe'),[`--defaults-extra-file=${file}`,'--single-transaction','--no-tablespaces','--set-gtid-purged=OFF','--default-character-set=utf8mb4',`--result-file=${dump}`,c.database],{encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw Error('SQL backup export failed');
 }finally{fs.unlinkSync(file);}
 const report={date:new Date().toISOString(),server:info[0],restrictedApplicationUserWorks:true,transactionRollbackPassed:true,sqlBackup:{file:dump,bytes:fs.statSync(dump).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex')}};
 fs.writeFileSync(path.join(root,'security-review/mysql-local-export-2026-11-16.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message.replaceAll(c.rootPassword,'[REDACTED]').replaceAll(c.appPassword,'[REDACTED]'));process.exitCode=1;}).finally(async()=>{await admin.$disconnect();await app.$disconnect();});
