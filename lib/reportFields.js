export const REPORT_FIELDS = {
 MONTHLY: [["commitment","ECF commitment (INR)","number"],["received","Amount received (INR)","number"],["royalty","Royalty received (INR)","number"],["variance","Variance explanation","text"],["correctiveAction","Corrective action / next steps","text"]],
 QUARTERLY: [["technologiesTransferred","Technologies transferred","integer"],["industryPartners","Industry partners engaged","integer"],["revenue","Revenue realised (INR)","number"],["businessValue","Business value / outcomes","text"],["impact","Social and environmental impact","text"],["risks","Risks and next-quarter plan","text"]],
};
export function readReportData(value){try{return JSON.parse(value||"{}")}catch{return {}}}
export function validateReportData(type, body, submit) {
 const result={};
 for(const [key,label,kind] of REPORT_FIELDS[type]||[]){
  const value=body[key];
  if(kind==="text"){result[key]=String(value||"").trim().slice(0,10000);continue;}
  if(value===""||value==null){if(submit)throw new Error(label+" is required; enter 0 if none.");result[key]=null;continue;}
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||(kind==="integer"&&!Number.isInteger(n)))throw new Error(label+" must be a valid non-negative "+(kind==="integer"?"whole number.":"number."));
  result[key]=n;
 }
 result.notes=String(body.notes||"").trim().slice(0,10000);
 result.evidenceReference=String(body.evidenceReference||"").trim().slice(0,2000);
 if(submit&&!result.notes)throw new Error("Enter the submission summary / response to HEAD instructions.");
 return result;
}
