export function assertAnalysisFormat(fileName) {
  const extension=String(fileName||"").split(".").pop().toLowerCase();
  const modern={doc:"DOCX",xls:"XLSX",ppt:"PPTX"}[extension];
  if(modern && !(process.env.DOCUMENT_PARSER_MODE==='container' && process.env.LEGACY_PARSER_IMAGE))throw new Error(`Legacy ${extension.toUpperCase()} analysis needs the dedicated conversion sandbox. Save a copy as ${modern} and upload that copy. The original document is not modified.`);
  return extension;
}
