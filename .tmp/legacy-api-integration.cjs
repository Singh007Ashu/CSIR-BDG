const sourceFs=require('fs');let source=sourceFs.readFileSync('.tmp/security-integration.cjs','utf8');
source=source.replaceAll('3011','3015');
source=source.replace("MALWARE_SCAN_MODE:'defender'","MALWARE_SCAN_MODE:'defender',CSIR_DIST_DIR:'.next-five-review',DOCUMENT_PARSER_MODE:'container',LEGACY_PARSER_IMAGE:'csir-legacy-parser:review',DOCKER_BIN:'C:/Program Files/Docker/Docker/resources/bin/docker.exe',OPENAI_API_KEY:''");
const marker="ok('workflow document owner access works and foreign-lab access is denied');";
source=source.replace(marker,marker+`
for(const ext of ['doc','xls','ppt']){const result=await labReq.post('/api/intake',{multipart:{file:{name:'synthetic.'+ext,mimeType:'application/octet-stream',buffer:fs.readFileSync('.tmp/legacy-fixture.'+ext)}}});assert.equal(result.status(),201,await result.text());const packet=await result.json();assert.equal(packet.status,'IN_REVIEW');const extraction=await db.documentAnalysis.findFirst({where:{document:{fileName:'synthetic.'+ext}},orderBy:{id:'desc'}});assert.equal(extraction.status,'COMPLETED');assert(extraction.localExtractJson.includes('CSIR LEGACY FIXTURE 7429'));}ok('DOC/XLS/PPT lab intake: scan, isolated conversion, persisted extraction and workflow routing');
`);
source=source.replaceAll('security-review/test-results.json','security-review/legacy-api-integration-results.json');eval(source);
