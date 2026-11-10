const sourceFs=require('fs');let source=sourceFs.readFileSync('.tmp/business-uat.cjs','utf8');
source=source.replace("CSIR_DIST_DIR:'.next-uat'","CSIR_DIST_DIR:'.next-five-review'");
if(process.env.REVIEW_BROWSER==='edge')source=source.replaceAll('C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
const start=source.indexOf("await lp.goto(base+'/master-technologies');"),end=source.indexOf('})().catch(async e=>');
if(start<0||end<start)throw Error('Missing harness boundaries');
source=source.slice(0,start)+`
const reviewBrowser=process.env.REVIEW_BROWSER||'chrome',checks=[];
for(const [role,context,route] of [['HEAD',head,'/head-admin'],['LAB',lab,'/master-technologies'],['INDUSTRY',industry,'/industry']]){
 const p=await context.newPage();await p.setViewportSize({width:320,height:900});await p.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await p.goto(base+route,{waitUntil:'networkidle'});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.keyboard.press('Tab');assert.equal(await p.locator(':focus').innerText(),'Skip to main content');await p.keyboard.press('Enter');assert.equal(await p.locator(':focus').getAttribute('id'),'main-content');
 const duplicateIds=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)});assert.deepEqual(duplicateIds,[]);
 await p.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));const audit=await p.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));fs.writeFileSync('security-review/'+reviewBrowser+'-'+role+'-contrast-debug.json',JSON.stringify(audit.violations,null,2));assert.equal(audit.violations.length,0,role+JSON.stringify(audit.violations.map(v=>v.id)));
 const tree=await p.locator('body').ariaSnapshot();assert(tree.includes('main'));fs.writeFileSync('security-review/uat-screenshots/'+reviewBrowser+'-'+role+'-accessibility-tree.txt',tree);await p.screenshot({path:'security-review/uat-screenshots/'+reviewBrowser+'-'+role+'-forced-colors.png',fullPage:true});checks.push({role,route,forcedColors:true,reducedMotion:true,reflow320:true,skipLink:true,duplicateIds:0,axeViolations:0});await p.close();
}
await lp.goto(base+'/master-technologies');await lp.getByRole('button',{name:'+ Enter technology',exact:true}).click();const modal=lp.getByRole('dialog');await modal.waitFor();await modal.getByRole('button',{name:'Save & recalculate SOP',exact:true}).click();assert.equal(await lp.locator(':focus').getAttribute('aria-label'),'Technology name');assert.equal(await lp.locator(':focus').evaluate(e=>e.validity.valueMissing),true);await lp.keyboard.press('Escape');await modal.waitFor({state:'detached'});checks.push({role:'LAB',requiredFieldFocus:true,escape:true});
fs.writeFileSync('security-review/'+reviewBrowser+'-expanded-accessibility.json',JSON.stringify({date:new Date().toISOString(),checks,scope:'Browser accessibility tree, high contrast/reduced motion, keyboard, reflow and validation; not NVDA/JAWS spoken-output certification'},null,2));pass(reviewBrowser+' expanded accessibility checks');
`+source.slice(end);
source=source.replaceAll('security-review/business-uat-results.json','security-review/five-accessibility-harness-'+(process.env.REVIEW_BROWSER||'chrome')+'.json');eval(source);
