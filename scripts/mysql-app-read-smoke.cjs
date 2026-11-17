const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'storage/mysql-local');
const c=JSON.parse(fs.readFileSync(path.join(folder,'connection-private.json'),'utf8'));
const {PrismaClient}=require('@csir/mysql-client');
const url=`mysql://${c.appUser}:${encodeURIComponent(c.appPassword)}@127.0.0.1:${c.port}/${c.database}`;
const db=new PrismaClient({datasources:{db:{url}}});
const external=process.env.CSIR_SMOKE_EXISTING==='1';
const base=external?'http://localhost:3000':'http://127.0.0.1:3017',secret=external?JSON.parse(fs.readFileSync(path.join(folder,'website-secret-private.json'),'utf8')).sessionSecret:crypto.randomBytes(48).toString('hex');
const sign=s=>crypto.createHmac('sha256',secret).update(s).digest('base64url');
const results=[];let server;
function token(p,hash){const body=Buffer.from(JSON.stringify({...p,jti:crypto.randomUUID(),iat:Date.now(),exp:Date.now()+600000,credentialVersion:sign('credential:'+hash)})).toString('base64url');return body+'.'+sign(body);}
(async()=>{
 if(!external)server=cp.spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3017'],{cwd:root,windowsHide:true,env:{...process.env,DB_PROVIDER:'mysql',MYSQL_DATABASE_URL:url,SESSION_SECRET:secret,APP_ORIGINS:base,TRUST_PROXY:'0',CSIR_DIST_DIR:'.next-mysql',NODE_ENV:'production',UPLOAD_ROOT:path.join(root,'.tmp/security-preview-storage-2026-11-06'),FICCI_ROOT:path.join(root,'FICCI')},stdio:['ignore',fs.openSync(path.join(folder,'app-smoke.log'),'a'),fs.openSync(path.join(folder,'app-smoke.err'),'a')]});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Application did not start');
 const head=await db.user.findFirst({where:{role:'HEAD_BDG',accountStatus:'ACTIVE'}});
 const lab=await db.lab.findFirst({where:{accountStatus:'ACTIVE',passwordHash:{not:null}}});
 const industry=await db.user.findFirst({where:{role:'APPLICANT',accountStatus:'ACTIVE'}});
 for(const [label,account]of [['HEAD',head],['LAB',lab],['INDUSTRY',industry]]){
  if(!account){results.push({role:label,skipped:'No active account'});continue;}
  const p=label==='LAB'?{type:'lab',labId:account.id,role:account.primaryRole}:{type:'user',userId:account.id,role:account.role,assignedLabId:account.assignedLabId,organizationId:account.organizationId};
  const paths=label==='INDUSTRY'?['/api/industry-catalog','/api/problem-statements','/api/notifications']:['/api/technologies','/api/projects','/api/problem-statements','/api/reports','/api/notifications'];
  for(const route of paths){const response=await fetch(base+route,{headers:{Cookie:'csir_bdg_session='+token(p,account.passwordHash),Origin:base}});const text=await response.text();results.push({role:label,route,status:response.status,passed:response.status===200&&!/"password(Hash|Salt)"\s*:/.test(text)});}
 }
 if(results.some(r=>r.passed===false))throw Error('Some MySQL application read checks failed');
 console.log('MySQL application read checks passed: '+results.filter(r=>r.passed).length);
})().catch(e=>{results.push({error:e.message});console.error(e.message);process.exitCode=1;}).finally(async()=>{if(server)server.kill();await db.$disconnect();fs.writeFileSync(path.join(root,'security-review/mysql-app-read-smoke-2026-11-16.json'),JSON.stringify({date:new Date().toISOString(),scope:'Read API checks with short-lived test sessions for existing accounts; no password reset or form submission',results},null,2));});
