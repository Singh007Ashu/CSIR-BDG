const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {safeInternalPath}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('lib/safeNavigation.js','utf8')).toString('base64'));
 const unsafe=['javascript:alert(1)','data:text/html,test','https://evil.invalid','//evil.invalid','/\\evil.invalid','/\nevil.invalid','/%5cevil.invalid','/%2fevil.invalid','/%00bad','/%zz',null,{},''];
 for(const value of unsafe)assert.equal(safeInternalPath(value),'/notifications');
 for(const value of ['/projects/1','/admin?tab=laboratories','/master-technologies?name=Animal%20Hair#details'])assert.equal(safeInternalPath(value),value);
 const result={date:new Date().toISOString(),passed:unsafe.length+3,failed:0,scope:'Stored navigation URL normalization and unsafe scheme/authority/control rejection'};
 fs.writeFileSync('security-review/navigation-security-results.json',JSON.stringify(result,null,2));console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1;});
