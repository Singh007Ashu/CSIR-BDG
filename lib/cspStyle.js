const allowed=new Set(["maxWidth","color","fontSize","marginTop","fontWeight","border","padding","margin","minWidth","width","whiteSpace","left","top","height","backgroundColor","background","display","alignItems","gap"]);
const unitless=new Set(["fontWeight"]);
export function serializeStyle(styles={}) {
  return Object.entries(styles).map(([key,value])=>{
    if(!allowed.has(key)||value==null)return "";
    if(typeof value==="number") {if(!Number.isFinite(value))return "";value=String(value)+(value!==0&&!unitless.has(key)?"px":"");}
    if(typeof value!=="string"||/[;{}<>\\\u0000-\u001f]|url\s*\(|expression\s*\(|@/i.test(value))return "";
    return key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase())+":"+value+";";
  }).join("");
}
