const fs=require('fs'),assert=require('assert/strict'),cp=require('child_process');
(async()=>{
 const {assertAnalysisFormat}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('lib/analysisFormat.js','utf8')).toString('base64'));
 const passed=[];
 for(const ext of ['doc','xls','ppt']) {
  assert.throws(()=>assertAnalysisFormat('legacy.'+ext),/Save a copy/);
  const child=cp.spawnSync(process.execPath,['scripts/document-extract-worker.cjs'],{input:JSON.stringify({fileName:'legacy.'+ext,base64:Buffer.from('legacy fixture').toString('base64')}),timeout:20000,windowsHide:true});
  assert.equal(child.status,1);passed.push(ext+' fails explicitly rather than claiming content analysis');
 }
 const child=cp.spawnSync(process.execPath,['scripts/document-extract-worker.cjs'],{input:JSON.stringify({fileName:'sample.txt',base64:Buffer.from('Supported sample').toString('base64')}),timeout:20000,windowsHide:true});
 assert.equal(child.status,0);assert.equal(JSON.parse(child.stdout).extractedText,'Supported sample');passed.push('Supported text still extracts');
 fs.writeFileSync('security-review/analysis-format-results.json',JSON.stringify({date:new Date().toISOString(),passed,scope:'Explicit legacy rejection, not certified legacy conversion/extraction'},null,2));console.log(passed);
})().catch(e=>{console.error(e);process.exitCode=1;});
