const sensitive=/password|secret|token|authorization|cookie|api.?key/i;
export function auditJson(value){return JSON.stringify(value,(key,item)=>sensitive.test(key)?"[REDACTED]":item);}
export function safeAuditRows(rows){return rows.map(row=>({...row,...Object.fromEntries(['details','oldValue','newValue'].map(key=>{if(!row[key])return [key,row[key]];try{return [key,auditJson(JSON.parse(row[key]))];}catch{return [key,"[Unstructured audit text withheld]"];} }))}));}
