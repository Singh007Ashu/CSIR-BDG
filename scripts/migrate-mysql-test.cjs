// Guarded rehearsal only: never overwrites a non-empty target or the source.
const fs=require('fs'),crypto=require('crypto');const {PrismaClient,Prisma}=require('@prisma/client');const {PrismaClient:MysqlClient}=require('@csir/mysql-client');
const sourcePath=process.env.SQLITE_MIGRATION_SOURCE,targetUrl=process.env.MYSQL_DATABASE_URL;
if(!sourcePath||!fs.existsSync(sourcePath)||!targetUrl)throw Error('Set existing SQLITE_MIGRATION_SOURCE snapshot and MYSQL_DATABASE_URL using a secret store.');
const target=new URL(targetUrl);if(target.protocol!=='mysql:'||!/^\/csir_migration_test_[a-z0-9_]+$/i.test(target.pathname)||process.env.CONFIRM_MYSQL_REHEARSAL!=='EMPTY_TEST_DATABASE_ONLY')throw Error('Only explicitly confirmed csir_migration_test_* databases are allowed.');
const before=crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const source=new PrismaClient({datasources:{db:{url:'file:'+sourcePath.replaceAll('\\','/')}}});const destination=new MysqlClient();
const models=Prisma.dmmf.datamodel.models,rows=new Map(),key=name=>name[0].toLowerCase()+name.slice(1);
const canonical=value=>JSON.stringify(value,(_k,v)=>typeof v==='bigint'?v.toString():v);
const digest=(items,fields)=>crypto.createHash('sha256').update(items.map(row=>canonical(Object.fromEntries(fields.map(f=>[f,row[f]])))).sort().join('\n')).digest('hex');
(async()=>{
 for(const model of models){const values=await source[key(model.name)].findMany();rows.set(model.name,values);if(await destination[key(model.name)].count())throw Error('Target is not empty; refusing migration.');}
 // Verify every declared source FK before temporarily disabling target insertion order checks.
 for(const model of models)for(const field of model.fields.filter(f=>f.kind==='object'&&f.relationFromFields?.length)){
  const targetKeys=new Set(rows.get(field.type).map(r=>canonical(field.relationToFields.map(k=>r[k]))));
  for(const row of rows.get(model.name)){const values=field.relationFromFields.map(k=>row[k]);if(values.some(v=>v==null))continue;if(!targetKeys.has(canonical(values)))throw Error('Invalid source foreign key: '+model.name+'.'+field.name);}
 }
 const reconciliation=[];
 await destination.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try{
   for(const model of models){const values=rows.get(model.name);for(let i=0;i<values.length;i+=100)await tx[key(model.name)].createMany({data:values.slice(i,i+100)});}
   for(const model of models){const actual=await tx[key(model.name)].findMany(),expected=rows.get(model.name),fields=model.fields.filter(f=>f.kind!=='object').map(f=>f.name).sort();const match=actual.length===expected.length&&digest(actual,fields)===digest(expected,fields);reconciliation.push({model:model.name,count:actual.length,exactMatch:match});if(!match)throw Error('Data reconciliation failed for '+model.name);}
  }finally{await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');}
 },{maxWait:10000,timeout:300000,isolationLevel:'Serializable'});
 const after=crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');if(before!==after)throw Error('Source snapshot checksum changed; investigate before proceeding.');
 fs.writeFileSync('security-review/mysql-rehearsal-results.json',JSON.stringify({date:new Date().toISOString(),sourceUnchanged:true,reconciliation,passwordHashesPreserved:true,note:'Exact scalar-field reconciliation includes credential hashes/salts; these values are never printed. Run application/UAT against the target separately.'},null,2));
 console.log('Rehearsal completed with exact row reconciliation; source snapshot preserved.');
})().catch(e=>{console.error('Migration rehearsal failed:',e.code||e.name);process.exitCode=1;}).finally(async()=>{await source.$disconnect();await destination.$disconnect();});
