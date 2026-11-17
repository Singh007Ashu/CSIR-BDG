// Isolated MySQL fixtures only. Never seed or mutate the operational database.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'storage/mysql-local/connection-private.json'),'utf8'));
const suite=process.argv[2]||'business';if(!['business','roles'].includes(suite))throw Error('Unknown suite');
const dist=process.env.CSIR_TEST_DIST_DIR||'.next-mysql';
const name='csir_uat_'+suite+'_'+Date.now();
const {PrismaClient}=require('@csir/mysql-client');
const adminUrl=`mysql://root:${c.rootPassword}@127.0.0.1:${c.port}/${c.database}`;
const admin=new PrismaClient({datasources:{db:{url:adminUrl}}});
function replace(source,from,to){if(!source.includes(from))throw Error('Harness changed; missing expected marker: '+from.slice(0,70));return source.replace(from,to);}
(async()=>{
 await admin.$executeRawUnsafe('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin');
 await admin.$executeRawUnsafe("GRANT SELECT,INSERT,UPDATE,DELETE ON `"+name+"`.* TO 'csir_app'@'localhost'");
 const rootUrl=`mysql://root:${c.rootPassword}@127.0.0.1:${c.port}/${name}`;
 const appUrl=`mysql://${c.appUser}:${c.appPassword}@127.0.0.1:${c.port}/${name}`;
 const push=cp.spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--schema','prisma/mysql/schema.prisma','--skip-generate'],{cwd:root,env:{...process.env,MYSQL_DATABASE_URL:rootUrl},encoding:'utf8',windowsHide:true});
 if(push.status!==0)throw Error('Isolated test schema creation failed');
 let source=fs.readFileSync(path.join(root,'.tmp',suite==='business'?'business-uat.cjs':'security-role-matrix.cjs'),'utf8');
 source=replace(source,"require('../node_modules/@prisma/client')","require('../node_modules/@csir/mysql-client')");
 if(suite==='business'){
  source=replace(source,"const empty=new DatabaseSync(dbpath);empty.exec(fs.readFileSync('security-review/test-schema.sql','utf8'));empty.close();db=new PrismaClient({datasources:{db:{url:'file:'+dbpath}}});","db=new PrismaClient({datasources:{db:{url:process.env.MYSQL_DATABASE_URL}}});");
  source=replace(source,"CSIR_DIST_DIR:'.next-uat'","CSIR_DIST_DIR:"+JSON.stringify(dist));
  source=replace(source,"DB_PROVIDER:'sqlite'","DB_PROVIDER:'mysql'");
  source=replace(source,"await api(head,'/api/auth/login','POST',{email:headUser.email,password});await api(lab,'/api/lab-auth/login','POST',{labId:labs[0].labId,password});",`
const headLogin=await head.newPage();await headLogin.goto(base+'/governance-login');await headLogin.getByLabel('Official email',{exact:true}).fill(headUser.email);await headLogin.getByLabel('Password',{exact:true}).fill(password);await headLogin.getByRole('button',{name:'Login',exact:true}).click();await headLogin.waitForURL('**/head-admin');await headLogin.close();
const labLogin=await lab.newPage();await labLogin.goto(base+'/lab-login');await labLogin.getByLabel('Lab ID',{exact:true}).fill(labs[0].labId);await labLogin.getByLabel('Password',{exact:true}).fill(password);await labLogin.getByRole('button',{name:'Login',exact:true}).click();await labLogin.waitForURL('**/lab-dashboard');await labLogin.close();
`);
  source=source.replaceAll("name:'Close',exact:true","name:'Close technology details',exact:true");
  source=replace(source,"await ip.getByRole('button',{name:'Submit Problem Statement',exact:true}).click();", "const submittedProblem=ip.waitForResponse(r=>r.url().endsWith('/api/problem-statements')&&r.request().method()==='POST');await ip.getByRole('button',{name:'Submit Problem Statement',exact:true}).click();assert.equal((await submittedProblem).status(),201);");
  source=source.replaceAll('security-review/uat-screenshots','security-review/mysql-uat-screenshots');
  source=source.replaceAll('security-review/business-uat-results.json','security-review/mysql-business-uat-results.json');
  source=source.replaceAll('Isolated synthetic SQLite','Isolated synthetic MySQL');
  source=replace(source,'})().catch(async e=>',`
let annual=await api(lab,'/api/technology-year-data','POST',{technologyId:tech.id,financialYear:'2025-26',recordType:'ROYALTY_RECEIVED',royaltyAmountLakhs:0,royaltyRatePercent:2.5},201);
assert.equal(annual.financialYear,2025);assert.equal(annual.royaltyAmountLakhs,0);
annual=await api(lab,'/api/technology-year-data','POST',{id:annual.id,technologyId:tech.id,financialYear:'2024-25',recordType:'ROYALTY_RECEIVED',royaltyAmountLakhs:12.5,royaltyRatePercent:3});
annual=await api(lab,'/api/technology-year-data','POST',{id:annual.id,technologyId:tech.id,financialYear:'2023-24',recordType:'ROYALTY_RECEIVED',royaltyAmountLakhs:15.25,royaltyRatePercent:4});
assert.equal(annual.financialYear,2023);assert.equal((await api(head,'/api/technology-year-data?technologyId='+tech.id))[0].royaltyAmountLakhs,15.25);
await api(head,'/api/technology-year-data','POST',{technologyId:tech.id},403);await api(other,'/api/technology-year-data?technologyId='+tech.id,'GET',undefined,404);
pass('Financial-year entry and two successive edits persist; zero/decimal amounts preserved; HEAD read-only and other-lab isolation');
const project=await api(head,'/api/projects','POST',{name:'MySQL UAT Project',assignedLabIds:[labs[0].id]},201);
await api(lab,'/api/projects/'+project.id+'/technologies','POST',{technologyId:tech.id,projectStage:'PILOT',projectData:{notes:'MySQL UAT data'}},201);
assert((await api(head,'/api/projects/'+project.id+'/technologies')).some(x=>x.technologyId===tech.id));assert(!(await api(other,'/api/projects')).some(x=>x.id===project.id));
pass('HEAD creates project; assigned lab links technology and project data; other lab excluded');
const codev=await api(lab,'/api/co-development','POST',{title:'MySQL UAT collaboration',piName:'UAT PI',companyName:'UAT Partner',totalProjectCost:125000},201);
assert((await api(head,'/api/co-development')).some(x=>x.id===codev.id));assert(!(await api(other,'/api/co-development')).some(x=>x.id===codev.id));await notification(head,'NEW_CODEV_PROJECT');
pass('Lab co-development entry persists and reaches HEAD with notification and lab isolation');
})().catch(async e=>`);
 }else{
  source=replace(source,'const empty=new DatabaseSync(dbpath);try{empty.exec(fs.readFileSync("security-review/test-schema.sql","utf8"));}finally{empty.close();}','');
  source=replace(source,"db=new PrismaClient({datasources:{db:{url:'file:'+dbpath}}});","db=new PrismaClient({datasources:{db:{url:process.env.MYSQL_DATABASE_URL}}});");
  source=source.replaceAll('security-review/role-matrix-results.json','security-review/mysql-role-matrix-results.json');
 }
 const harness=path.join(root,'.tmp','mysql-'+suite+'-generated.cjs');fs.writeFileSync(harness,source);
 const test=cp.spawn(process.execPath,[harness],{cwd:root,env:{...process.env,DB_PROVIDER:'mysql',MYSQL_DATABASE_URL:appUrl,CSIR_DIST_DIR:dist},windowsHide:true,stdio:'inherit'});
 const code=await new Promise(resolve=>test.on('exit',resolve));if(code!==0)process.exitCode=1;
 console.log('Isolated MySQL test database retained for inspection: '+name);
})().catch(e=>{console.error(e.message.replaceAll(c.rootPassword,'[REDACTED]').replaceAll(c.appPassword,'[REDACTED]'));process.exitCode=1;}).finally(()=>admin.$disconnect());
