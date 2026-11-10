const fs=require('fs'),path=require('path');
// Generate a separate target schema. Never alter the SQLite source schema/database.
const source=fs.readFileSync(path.join(__dirname,'../prisma/schema.prisma'),'utf8');
let schema=source.replace(/generator client\s*\{[^}]*\}/,'generator client {\n provider = "prisma-client-js"\n output = "../../node_modules/@csir/mysql-client"\n}').replace(/generator d1Client\s*\{[^}]*\}/,'').replace('provider = "sqlite"','provider = "mysql"').replace('env("DATABASE_URL")','env("MYSQL_DATABASE_URL")');
schema=schema.replace(/model (\w+)\s*\{([\s\S]*?)\n\}/g,(whole,name,body)=>{
 const unique=new Set(),longStrings=new Set();
 for(const match of body.matchAll(/@@(?:unique|id)\(\[([^\]]+)\]/g))for(const item of match[1].split(','))unique.add(item.trim().split(/[ (]/)[0]);
 body=body.split('\n').map(line=>{const m=line.match(/^\s*(\w+)\s+String\??\s*(.*)$/);if(!m)return line;if(unique.has(m[1])||/@unique|@id/.test(m[2]))return line+' @db.VarChar(191)';longStrings.add(m[1]);return line+' @db.LongText';}).join('\n');
 body=body.replace(/@@index\(\[([^\]]+)\]/g,(all,fields)=>'@@index(['+fields.split(',').map(field=>longStrings.has(field.trim())?field.trim()+'(length: 191)':field).join(', ')+']');
 return `model ${name} {${body}\n}`;
});
const target=path.join(__dirname,'../prisma/mysql');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'schema.prisma'),schema);
console.log('Prepared separate MySQL schema; source SQLite unchanged.');
