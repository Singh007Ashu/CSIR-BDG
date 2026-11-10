const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const {PrismaClient}=require('../node_modules/@prisma/client');const {DatabaseSync}=require('node:sqlite');
const base='http://localhost:3013',dbpath=process.cwd().replaceAll('\\','/')+'/.tmp/role-matrix-'+Date.now()+'.sqlite';
const secret=crypto.randomBytes(48).toString('hex'),sign=s=>crypto.createHmac('sha256',secret).update(s).digest('base64url');
const roles=['HEAD_ADMIN','HEAD_BDG','ADMIN','SUPER_ADMIN','BDG','CPD','IMD','TMD','IPU','URDIP','ICM','LAB_BD','PI','APPLICANT','READ_ONLY'];
const managers=['HEAD_ADMIN','HEAD_BDG','ADMIN','SUPER_ADMIN'];let server,db;const results=[],failures=[];
const check=(name,condition,detail)=>{results.push({name,passed:!!condition,...(!condition?{detail}: {})});if(!condition)failures.push({name,detail});};
async function call(principal,path,method='GET',data){const encoded=Buffer.from(JSON.stringify({...principal,iat:Date.now(),exp:Date.now()+3600000,jti:crypto.randomUUID(),credentialVersion:sign('credential:synthetic-hash')})).toString('base64url');const response=await fetch(base+path,{method,headers:{Origin:base,Cookie:'csir_bdg_session='+encoded+'.'+sign(encoded),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,text:await response.text()};}
(async()=>{
 const empty=new DatabaseSync(dbpath);try{empty.exec(fs.readFileSync("security-review/test-schema.sql","utf8"));}finally{empty.close();}
 db=new PrismaClient({datasources:{db:{url:'file:'+dbpath}}});
 const labs=[];for(const n of ['A','B'])labs.push(await db.lab.create({data:{name:'Synthetic Lab '+n,code:'MATRIX-'+n,labId:'MATRIX-'+n,accountStatus:'ACTIVE',primaryRole:'LAB_BD',passwordHash:'synthetic-hash',passwordSalt:'synthetic-salt'}}));
 const orgs=[];for(const n of ['A','B'])orgs.push(await db.organization.create({data:{name:'Synthetic industry '+n,type:'INDUSTRY'}}));
 const company=await db.company.create({data:{name:'Synthetic company'}});const techs=[],problems=[],mous=[];
 for(let i=0;i<2;i++){techs.push(await db.technology.create({data:{labId:labs[i].id,name:'PRIVATE_TECH_'+i,briefDescription:'Private test data',approvalStatus:'DRAFT',sopLegacyExempt:false}}));problems.push(await db.problemStatement.create({data:{labId:labs[i].id,organizationId:orgs[i].id,description:'PRIVATE_PROBLEM_'+i}}));mous.push(await db.mou.create({data:{labId:labs[i].id,companyId:company.id,title:'PRIVATE_MOU_'+i}}));}
 const principals=[];for(const role of roles){const u=await db.user.create({data:{name:role,email:role.toLowerCase()+'@matrix.invalid',role,accountStatus:'ACTIVE',passwordHash:'synthetic-hash',passwordSalt:'synthetic-salt',assignedLabId:['LAB_BD','PI'].includes(role)?labs[0].id:null,organizationId:role==='APPLICANT'?orgs[0].id:null}});principals.push({type:'user',userId:u.id,role,assignedLabId:u.assignedLabId,organizationId:u.organizationId});}principals.push({type:'lab',labId:labs[0].id,role:'LAB_BD',name:'Lab A'});
 server=cp.spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3013'],{windowsHide:true,env:{...process.env,NODE_ENV:'production',DATABASE_URL:'file:'+dbpath,SESSION_SECRET:secret,APP_ORIGINS:base},stdio:['ignore',fs.openSync('.tmp/role-matrix-server.log','a'),fs.openSync('.tmp/role-matrix-server.log','a')]});
 for(let i=0;i<90;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
 const inventory=JSON.parse(fs.readFileSync('security-review/api-inventory.json'));
 for(const p of principals){const label=p.type==='lab'?'LAB_ACCOUNT':p.role;
  for(const row of inventory.filter(r=>r.method==='GET')){
   const path=row.route.replace(/\[[^\]]+\]/g,'999999'),r=await call(p,path);
   check(label+' GET '+path+' handled',r.status<500,'HTTP '+r.status);
   check(label+' GET '+path+' no credential fields',!/("passwordHash"|"passwordSalt")\s*:/.test(r.text),'Credential fields found');
   if(row.route.startsWith('/api/admin/'))check(label+' admin GET boundary', ['ADMIN','SUPER_ADMIN'].includes(p.role)?r.status===200:[401,403].includes(r.status),r.status);
   if(p.role==='APPLICANT'&&!/^\/api\/(auth|industry-catalog|problem-statements|partnerships|notifications)(\/|$)/.test(path))check(label+' internal GET denied '+path,[401,403].includes(r.status),r.status);
  }
  for(const row of inventory.filter(r=>r.method!=='GET'&&!['/api/auth/login','/api/auth/register','/api/lab-auth/login','/api/lab-auth/register','/api/lab-auth/forgot-password','/api/lab-auth/reset-password'].includes(r.route))){const path=row.route.replace(/\[[^\]]+\]/g,'999999'),r=await call(p,path,row.method,{});check(label+' '+row.method+' '+path+' malformed/missing handled',r.status<500,r.status);check(label+' '+row.method+' '+path+' no credential fields',!/("passwordHash"|"passwordSalt")\s*:/.test(r.text),'Credential fields found');}
  if(['LAB_BD','PI'].includes(p.role)){
   for(const [path,sentinel] of [['/api/technologies','PRIVATE_TECH_1'],['/api/mous','PRIVATE_MOU_1'],['/api/problem-statements','PRIVATE_PROBLEM_1'],['/api/search','PRIVATE_TECH_1']]){const r=await call(p,path);check(label+' isolated '+path,r.status===200&&!r.text.includes(sentinel),r.status);}
   for(const path of ['/api/technologies/'+techs[1].id,'/api/mous/'+mous[1].id]){const r=await call(p,path);check(label+' foreign record denied '+path,r.status===404,r.status);}
  }
  if(p.role==='APPLICANT'){const r=await call(p,'/api/problem-statements');check('Industry sees only own organization',r.status===200&&r.text.includes('PRIVATE_PROBLEM_0')&&!r.text.includes('PRIVATE_PROBLEM_1'),r.status);const catalog=await call(p,'/api/industry-catalog');check('Industry catalog excludes draft technology',catalog.status===200&&!catalog.text.includes('PRIVATE_TECH_'),catalog.status);}
  if(!['ADMIN','SUPER_ADMIN'].includes(p.role)){for(const row of inventory.filter(r=>r.route.startsWith('/api/admin/')&&r.method!=='GET')){const r=await call(p,row.route.replace(/\[[^\]]+\]/g,String(labs[1].id)),row.method,{});check(label+' admin mutation denied '+row.route,[401,403].includes(r.status),r.status);}}
  if(!managers.includes(p.role)&&!['APPLICANT','LAB_BD'].includes(p.role)){for(const [path,method] of [['/api/technologies/'+techs[0].id,'PATCH'],['/api/projects','POST'],['/api/reports','POST']]){const r=await call(p,path,method,{name:'FORBIDDEN'});check(label+' mutation denied '+path,[401,403].includes(r.status),r.status);}}
  if(['LAB_BD'].includes(p.role)){const edited=await call(p,'/api/technologies/'+techs[0].id,'PATCH',{briefDescription:'OWN UPDATE '+label});check(label+' can edit own technology',edited.status===200,edited.status);}
  if(['BDG','CPD','IMD','TMD','IPU','URDIP','ICM','PI'].includes(p.role)){
   const packet=await db.workflowPacket.create({data:{referenceNo:'TEST-'+label,title:'Synthetic review',packetType:'TEST',labId:labs[0].id,submittedByType:'LAB',currentUnit:p.role,status:'IN_REVIEW'}});await db.workflowStep.create({data:{packetId:packet.id,sequence:1,unitRole:p.role,raciType:'RESPONSIBLE',status:'IN_REVIEW'}});
   const reviewed=await call(p,'/api/intake/'+packet.id,'PATCH',{action:'APPROVE',comments:'Synthetic role approval test'});check(label+' can action own workflow unit',reviewed.status===200,reviewed.status);
   const another=principals.find(x=>x.role==='APPLICANT');const denied=await call(another,'/api/intake/'+packet.id);check('Industry denied internal workflow '+label,denied.status===403,denied.status);
  }
  console.log('Checked role '+label);
 }
 const lab=principals.at(-1);const injection=await call(lab,'/api/search?q='+encodeURIComponent("' OR 1=1 --"));check('SQL-like search stays scoped and handled',injection.status===200&&!injection.text.includes('PRIVATE_TECH_1'),injection.status);
 const head=principals.find(p=>p.role==='HEAD_BDG');const forbiddenEdit=await call(head,'/api/technologies/'+techs[0].id,'PATCH',{name:'HEAD CANNOT EDIT'});check('Head cannot directly edit lab technology',forbiddenEdit.status===403,forbiddenEdit.status);
 console.log(JSON.stringify({checks:results.length,failures},null,2));
})().catch(e=>{failures.push({fatal:e.message});console.error(e);}).finally(async()=>{if(server)server.kill();if(db)await db.$disconnect();fs.writeFileSync('security-review/role-matrix-results.json',JSON.stringify({date:new Date().toISOString(),roles:roles.concat('LAB_ACCOUNT'),checks:results.length,failures,results,scope:'Every inventoried GET across all roles; admin mutation denials; selected write, tenant and draft visibility cases. Not exhaustive successful mutation workflows.'},null,2));if(failures.length)process.exitCode=1;});
