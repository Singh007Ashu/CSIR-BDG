// Local launch helper. Secrets remain in the restricted, gitignored storage folder.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),net=require('net');
const root=path.resolve(__dirname,'..'),mode=process.argv[2];
if(!['dev','build','start'].includes(mode))throw Error('Expected dev, build or start');
process.env.NODE_ENV=mode==='dev'?'development':'production';
require('@next/env').loadEnvConfig(root,mode==='dev');
const listening=port=>new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port});s.setTimeout(1000);s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>resolve(false));s.once('timeout',()=>{s.destroy();resolve(false)});});
(async()=>{
 if(process.env.CSIR_LOCAL_MYSQL==='1'&&process.env.DB_PROVIDER==='mysql'){
  const folder=path.join(root,'storage/mysql-local'),c=JSON.parse(fs.readFileSync(path.join(folder,'connection-private.json'),'utf8'));
  if(c.host!=='127.0.0.1'||c.port!==3307||!/^csir_migration_test_[a-z0-9_]+$/.test(c.database))throw Error('Unexpected local database settings');
  process.env.MYSQL_DATABASE_URL ||= `mysql://${encodeURIComponent(c.appUser)}:${encodeURIComponent(c.appPassword)}@127.0.0.1:${c.port}/${c.database}`;
  const secretFile=path.join(folder,'website-secret-private.json');
  if(!process.env.SESSION_SECRET){
   if(!fs.existsSync(secretFile))fs.writeFileSync(secretFile,JSON.stringify({sessionSecret:crypto.randomBytes(48).toString('hex')}),{flag:'wx'});
   process.env.SESSION_SECRET=JSON.parse(fs.readFileSync(secretFile,'utf8')).sessionSecret;
  }
  if(!(await listening(c.port))){
   if(process.platform!=='win32')throw Error('Start the configured MySQL service first');
   const server=cp.spawn('C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqld.exe',['--defaults-file='+path.join(folder,'my.ini')],{detached:true,windowsHide:true,stdio:'ignore'});server.unref();
   for(let i=0;i<60&&!(await listening(c.port));i++)await new Promise(r=>setTimeout(r,500));
   if(!(await listening(c.port)))throw Error('Local MySQL did not start');
  }
 }
 const args=['node_modules/next/dist/bin/next',mode,...process.argv.slice(3)];
 if(mode!=='build'&&!args.includes('-H')&&!args.includes('--hostname'))args.push('-H','127.0.0.1');
 const child=cp.spawn(process.execPath,args,{cwd:root,env:process.env,windowsHide:true,stdio:'inherit'});
 child.on('error',()=>{console.error('Website process could not start');process.exitCode=1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
 child.on('exit',code=>{process.exitCode=code??1});
})().catch(e=>{console.error('Website startup failed: '+e.message);process.exitCode=1;});
