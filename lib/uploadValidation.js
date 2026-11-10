import JSZip from "jszip";

export const MIME_BY_EXTENSION = {pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",doc:"application/msword",xls:"application/vnd.ms-excel",ppt:"application/vnd.ms-powerpoint",zip:"application/zip",csv:"text/plain",tsv:"text/plain",txt:"text/plain",md:"text/plain",json:"application/json",xml:"text/plain"};

export async function validateUploadBytes(bytes, extension) {
  if (!Object.hasOwn(MIME_BY_EXTENSION, extension)) throw new Error("Unsupported file type.");
  const b = Buffer.from(bytes);
  if (!b.length || b.length > 5 * 1024 * 1024) throw new Error("File must be between 1 byte and 5 MB.");
  const prefix = hex => b.subarray(0,hex.length/2).equals(Buffer.from(hex,"hex"));
  if (extension === "pdf" && b.subarray(0,5).toString() !== "%PDF-") throw new Error("Invalid PDF signature.");
  if (extension === "png" && !prefix("89504e470d0a1a0a")) throw new Error("Invalid PNG signature.");
  if (["jpg","jpeg"].includes(extension) && !prefix("ffd8ff")) throw new Error("Invalid JPEG signature.");
  if (["doc","xls","ppt"].includes(extension) && !prefix("d0cf11e0a1b11ae1")) throw new Error("Invalid legacy Office signature. Use DOCX, XLSX or PPTX where possible.");
  if (["zip","docx","xlsx","pptx"].includes(extension)) {
    if (!prefix("504b")) throw new Error("Invalid Office or ZIP signature.");
    const zip = await JSZip.loadAsync(b);
    const entries = Object.values(zip.files);
    if (entries.length > 2000 || entries.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>50*1024*1024) throw new Error("Archive exceeds safe extraction limits.");
    for (const file of entries) {
      const name = file.unsafeOriginalName || file.name;
      if (/^[\\/]|^[a-z]:|(^|[\\/])\.\.([\\/]|$)/i.test(name)) throw new Error("Unsafe archive path.");
      if (/vbaProject\.bin$|\.(exe|dll|bat|cmd|ps1|js|vbs|scr|msi)$/i.test(name)) throw new Error("Executable or macro content is not accepted.");
      if (/[\x00-\x1f:]|[. ](?:\/|$)/.test(name) || /\\/.test(name)) throw new Error("Unsafe archive filename.");
      if (/\.(zip|rar|7z|tar|gz|iso|docm|xlsm|pptm|hta|html?|svg|lnk|url|com|jar)$/i.test(name)) throw new Error("Nested archives and active content are not accepted.");
      if (/\/(embeddings|activeX)\//i.test(name)) throw new Error("Embedded Office objects are not accepted.");
    }
    const required = {docx:"word/document.xml",xlsx:"xl/workbook.xml",pptx:"ppt/presentation.xml"}[extension];
    if (required && (!zip.file(required)||!zip.file("[Content_Types].xml"))) throw new Error("File content does not match the selected Office format.");
    // Validate actual inflated bytes as well as archive metadata before parsers run.
    let total = 0;
    for (const file of entries) {
      if (file.dir) continue;
      const xml = /\.(xml|rels)$/i.test(file.name), chunks = [];
      await new Promise((resolve, reject) => {
        let count = 0;
        const stream = file.internalStream("nodebuffer");
        stream.on("data", chunk => {
          count += chunk.length; total += chunk.length;
          if (count > 10 * 1024 * 1024 || total > 50 * 1024 * 1024) {
            stream.pause(); reject(new Error("Archive exceeds safe extraction limits.")); return;
          }
          if (xml) chunks.push(chunk);
        }).on("error", reject).on("end", resolve).resume();
      });
      if (xml) {
        const text = Buffer.concat(chunks).toString("utf8");
        if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("Office XML entities are not accepted.");
        for (const relationship of text.matchAll(/<Relationship\b[^>]*>/gi)) {
          if (/TargetMode\s*=\s*["']External["']/i.test(relationship[0]) && !/Type\s*=\s*["'][^"']*\/hyperlink["']/i.test(relationship[0])) throw new Error("External Office resources are not accepted.");
        }
      }
    }
  }
  if (["txt","csv","tsv","md","json","xml"].includes(extension)) {
    let text;try{text=new TextDecoder("utf-8",{fatal:true}).decode(b);}catch{throw new Error("Text uploads must use UTF-8 encoding.");}
    if(text.includes("\0"))throw new Error("Binary content is not allowed in text files.");
    if(extension==="json"){try{JSON.parse(text);}catch{throw new Error("Invalid JSON file.");}}
    if(extension==="xml"&&/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error("XML external entities and document types are not allowed.");
  }
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}
