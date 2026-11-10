const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const load=async f=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(f,'utf8')).toString('base64'));
 const {serializeStyle}=await load('lib/cspStyle.js'),{contentSecurityPolicy}=await load('lib/securityPolicy.js');
 assert.equal(serializeStyle({width:15,fontWeight:600,margin:0,color:'var(--csir-blue)'}),'width:15px;font-weight:600;margin:0;color:var(--csir-blue);');
 for(const color of ['red;}body{display:none','</style><script>alert(1)</script>','url(https://evil.invalid)','expression(alert(1))','red; background:blue','\\72 ed'])assert.equal(serializeStyle({color}),'');
 assert.equal(serializeStyle({width:NaN,height:Infinity,unknown:'bad'}),'');
 assert(!contentSecurityPolicy('fixture').includes('unsafe-inline'));assert(!contentSecurityPolicy('fixture').includes('unsafe-eval'));assert(contentSecurityPolicy('fixture').includes("style-src-attr 'none'"));
 fs.writeFileSync('security-review/csp-style-unit-results.json',JSON.stringify({date:new Date().toISOString(),passed:11,failures:[],scope:'Style serialization and production CSP unit checks; browser required'},null,2));console.log('PASS style serialization, injection delimiters and strict production CSP');
})().catch(e=>{console.error(e);process.exitCode=1;});
