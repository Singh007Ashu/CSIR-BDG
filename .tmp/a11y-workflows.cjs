const sourceFs=require('fs');let source=sourceFs.readFileSync('.tmp/business-uat.cjs','utf8');
if(process.env.CSIR_TEST_DIST_DIR)source=source.replace("CSIR_DIST_DIR:'.next-uat'","CSIR_DIST_DIR:"+JSON.stringify(process.env.CSIR_TEST_DIST_DIR));
const marker='})().catch(async e=>';
if(!source.includes(marker))throw Error('UAT insertion marker missing');
source=source.replace(marker,`
const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');const audits=[];
const publicContext=await browser.newContext({baseURL:base});
const roles=[['PUBLIC',publicContext,['/governance-login','/lab-login','/login','/register-lab','/lab-forgot-password']],['HEAD',head,['/workspace','/head-admin','/master-technologies','/lab-monitoring','/lab-profiles','/projects','/module2','/module3','/co-development','/mou-repository','/commercial-engagements','/sop-data-entry','/monthly-reporting','/quarterly-reporting','/queries','/notifications','/industry-matchmaking','/ai-intake','/workflow-tracker','/raci-access','/sop-roadmap','/excel-templates']],['LAB',lab,['/lab-dashboard','/master-technologies','/projects','/module2','/module3','/monthly-reporting','/quarterly-reporting','/queries','/lab-profiles','/sop-data-entry']],['INDUSTRY',industry,['/industry','/module2','/module3','/notifications']]];
for(const [role,context,routes] of roles){const page=await context.newPage();for(const route of routes){await page.goto(base+route,{waitUntil:'load'});await page.waitForTimeout(700);await page.evaluate(axeSource);const result=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));audits.push({role,route,url:page.url(),violations:result.violations,incomplete:result.incomplete.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length}))});fs.writeFileSync('security-review/accessibility-audit.json',JSON.stringify({audits},null,2));console.log('AXE',role,route,result.violations.map(v=>v.id+':'+v.nodes.length).join(','));}await page.close();}
fs.writeFileSync('security-review/accessibility-audit.json',JSON.stringify({date:new Date().toISOString(),engine:'axe-core '+require('axe-core/package.json').version,audits},null,2));
`+marker);
eval(source);
