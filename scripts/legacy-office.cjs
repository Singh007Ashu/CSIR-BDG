const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
async function convertLegacy(bytes,extension){
 if(process.env.CSIR_LEGACY_SANDBOX!=='1'||process.platform!=='linux'||process.getuid()!==65532)throw Error('Legacy conversion requires its dedicated sandbox');
 if(!['doc','xls','ppt'].includes(extension)||bytes.length>5*1024*1024||!bytes.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex')))throw Error('Invalid legacy Office input');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'csir-legacy-'));
 try{
  const profile=path.join(dir,'profile'),out=path.join(dir,'out');await fs.mkdir(path.join(profile,'user'),{recursive:true});await fs.mkdir(out);
  await fs.writeFile(path.join(profile,'user','registrymodifications.xcu'),'<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item></oor:items>',{flag:'wx'});
  const input=path.join(dir,'input.'+extension);await fs.writeFile(input,bytes,{flag:'wx'});
  const target={doc:'docx',xls:'xlsx',ppt:'pptx'}[extension];
  const conversion=await run('/usr/bin/soffice',['-env:UserInstallation=file://'+profile,'--headless','--norestore','--nodefault','--nolockcheck','--convert-to',target,'--outdir',out,input],{timeout:22000,maxBuffer:65536,env:{PATH:'/usr/bin:/bin',HOME:dir,TMPDIR:dir,LANG:'C.UTF-8'}});
  const converted=path.join(out,'input.'+target),stat=await fs.stat(converted).catch(()=>{throw Error('Legacy conversion produced no output: '+conversion.stdout+' '+conversion.stderr);});
  if(!stat.isFile()||!stat.size||stat.size>10*1024*1024)throw Error('Converted document exceeds limits');
  return {bytes:await fs.readFile(converted),extension:target};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
module.exports={convertLegacy};
