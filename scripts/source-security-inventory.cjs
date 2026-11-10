// Review aid: inventory is not a substitute for contextual penetration testing.
const fs=require('fs'),path=require('path');const files=[],matches=[];
function visit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,ent.name);if(ent.isDirectory())visit(f);else if(/\.(js|jsx|py)$/.test(f)){files.push(f);const lines=fs.readFileSync(f,'utf8').split(/\r?\n/);lines.forEach((line,i)=>{for(const [kind,re]of Object.entries({rawSql:/\$(queryRaw|executeRaw)/,htmlSink:/dangerouslySetInnerHTML|\.innerHTML\s*=/,dynamicCode:/\beval\s*\(|new Function\s*\(/,navigation:/router\.(push|replace)\s*\(/,inlineStyle:/\bstyle=\{/})){if(re.test(line))matches.push({file:f,line:i+1,kind});}});}}}
for(const root of ['app','lib','python'])visit(root);
fs.mkdirSync('security-review',{recursive:true});
fs.writeFileSync('security-review/source-security-inventory.json',JSON.stringify({date:new Date().toISOString(),files:files.length,matches,scope:'Pattern inventory only; ORM use, URL normalization, encoding, access control and parser inputs still require contextual tests'},null,2));console.log({files:files.length,matches});
