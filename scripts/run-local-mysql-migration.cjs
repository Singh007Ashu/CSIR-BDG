const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'storage/mysql-local');
const c=JSON.parse(fs.readFileSync(path.join(folder,'connection-private.json'),'utf8'));
const url=`mysql://root:${encodeURIComponent(c.rootPassword)}@127.0.0.1:${c.port}/${c.database}`;
const env={...process.env,MYSQL_DATABASE_URL:url,SQLITE_MIGRATION_SOURCE:path.join(folder,'source-snapshot.sqlite'),CONFIRM_MYSQL_REHEARSAL:'EMPTY_TEST_DATABASE_ONLY'};
function run(args){const r=cp.spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',windowsHide:true,maxBuffer:5e6});const safe=(r.stdout+'\n'+r.stderr).replaceAll(c.rootPassword,'[REDACTED]').replaceAll(url,'[DATABASE URL]');console.log(safe);if(r.status!==0)throw Error('Step failed: '+args[0]);}
(async()=>{
 run(['scripts/generate-mysql-client.cjs']);
 const {PrismaClient}=require('@csir/mysql-client');const db=new PrismaClient({datasources:{db:{url}}});
 try{await db.$queryRawUnsafe('SELECT 1');}finally{await db.$disconnect();}
 const init=path.join(folder,'initialize-account.sql');if(fs.existsSync(init))fs.unlinkSync(init);
 run(['scripts/mysql-migration-check.cjs']);
 run(['node_modules/prisma/build/index.js','db','push','--schema','prisma/mysql/schema.prisma','--skip-generate']);
 run(['scripts/migrate-mysql-test.cjs']);
})().catch(e=>{console.error(e.message.replaceAll(c.rootPassword,'[REDACTED]'));process.exitCode=1;});
