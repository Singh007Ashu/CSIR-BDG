const sourceFs=require('fs');let source=sourceFs.readFileSync('.tmp/security-integration.cjs','utf8');
source=source.replace("MALWARE_SCAN_MODE:'defender'","MALWARE_SCAN_MODE:'defender',CSIR_DIST_DIR:'.next-five-review'");
const apiMarker="ok('activation requires verification evidence and omits credential hashes');";
source=source.replace(apiMarker,apiMarker+`
const payloads=["' OR 1=1 --","' UNION SELECT passwordHash FROM User --","1; DROP TABLE Technology;--","%27 OR %271%27=%271","\\\" OR 1=1 --","' AND randomblob(1000000)--","<svg/onload=alert(1)>","</script><script>alert(1)</script>","../../.env","%00"];
const countBefore=await db.technology.count();let probes=0;
for(const endpoint of ['/api/search','/api/technologies','/api/co-development','/api/commercial-engagements','/api/industry-catalog'])for(const actor of [labReq,admin])for(const payload of payloads){const r=await actor.get(endpoint+'?q='+encodeURIComponent(payload));assert.equal(r.status(),endpoint==='/api/industry-catalog'&&actor===labReq?403:200,endpoint+' '+await r.text());const text=await r.text();assert(!/passwordHash|passwordSalt|SQLITE_ERROR|PrismaClientValidationError/.test(text));probes++;}
assert.equal(await db.technology.count(),countBefore);ok(probes+' query payload/role/endpoint combinations preserve schema and avoid diagnostic leakage');
for(const link of ['javascript:alert(1)','//evil.invalid','/\\\\evil.invalid','/%2fevil.invalid']){const r=await admin.post('/api/admin/notifications',{data:{title:'Unsafe fixture',message:'Synthetic',link}});assert.equal(r.status(),400,await r.text());}ok('Stored notification link injection rejected at API boundary');
const marker='XSS_REVIEW_SENTINEL';const markup=marker+'<img src=x onerror="window.__reviewXss=1"><svg onload="window.__reviewXss=1"></svg></script><script>window.__reviewXss=1</script>';
await db.technology.update({where:{id:ownTech.id},data:{name:markup,briefDescription:markup}});
assert.equal((await admin.post('/api/queries',{data:{title:markup,description:markup,targetLabId:lab.id}})).status(),201);
assert.equal((await admin.post('/api/admin/notifications',{data:{title:markup,message:markup,target:'HEAD_BDG',link:'/queries'}})).status(),201);
`);
const uiMarker="ok('stored HTML-like technology name renders as text and does not execute in browser');";
// Keep the baseline's expected literal available as an additional fixture.
source=source.replace("await db.technology.update({where:{id:ownTech.id},data:{name:markup,briefDescription:markup}});","await db.technology.create({data:{labId:lab.id,name:markup,briefDescription:markup}});");
source=source.replace(uiMarker,uiMarker+`
for(const route of ['/master-technologies','/queries','/notifications']){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.getByText('XSS_REVIEW_SENTINEL',{exact:false}).first().waitFor({timeout:20000});assert((await page.locator('body').innerText()).includes('XSS_REVIEW_SENTINEL'),route);assert.equal(await page.evaluate(()=>window.__reviewXss),undefined);assert.equal(await page.locator('[onerror],[onload]').count(),0);}ok('Stored HTML payloads render as text in technology, query and notification surfaces');
await db.technology.createMany({data:Array.from({length:2000},(_,i)=>({labId:lab.id,name:'Synthetic load technology '+i,briefDescription:'Synthetic load fixture',sector:'Agriculture'}))});
const timings=[],errors=[],stages=[];for(const concurrency of [4,12,24]){const startStage=Date.now(),until=startStage+30000;let requests=0;await Promise.all(Array.from({length:concurrency},(_,worker)=>(async()=>{while(Date.now()<until){const start=Date.now();try{const endpoint=worker%3===0?'/api/search?q=Synthetic':worker%3===1?'/api/technologies?q=Synthetic':'/api/notifications';const r=await admin.get(endpoint);if(r.status()!==200)errors.push(r.status());await r.body();await r.dispose();timings.push(Date.now()-start);requests++;}catch{errors.push('request-error');}await new Promise(r=>setTimeout(r,150));}})()));stages.push({concurrency,requests,durationMs:Date.now()-startStage});}timings.sort((a,b)=>a-b);assert.equal(errors.length,0);fs.writeFileSync('security-review/expanded-load-results.json',JSON.stringify({date:new Date().toISOString(),syntheticTechnologies:2000,stages,requests:timings.length,p95Ms:timings[Math.floor(timings.length*.95)],maxMs:timings.at(-1),errors,scope:'90-second bounded multi-endpoint local load, synthetic data, not distributed production DDoS certification'},null,2));ok('2000-record multi-endpoint load ramp passes with no errors');
`);
source=source.replaceAll('security-review/test-results.json','security-review/five-area-integration-results.json');
eval(source);
