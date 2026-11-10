const fs=require('fs'),cp=require('child_process');
const sql=cp.execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
fs.writeFileSync('security-review/test-schema.sql',sql);console.log('Generated empty test schema without copying real records.');
