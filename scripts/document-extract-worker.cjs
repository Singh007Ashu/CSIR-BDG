const ExcelJS = require("exceljs");
const JSZip = require("jszip");

const ALLOWED_ROUTE_UNITS = new Set(["LAB_BD", "PI", "BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM"]);

function xmlText(xml) {
  return String(xml || "")
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<w:br\s*\/>/g, "\n")
    .replace(/<\/w:p>|<\/a:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function scalar(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return value.text || value.result || value.hyperlink || JSON.stringify(value);
  return String(value);
}

async function extractSpreadsheet(bytes, extension) {
  if (extension === "csv" || extension === "tsv") {
    const text = bytes.toString("utf8").slice(0, 300000);
    const separator = extension === "tsv" ? "\t" : ",";
    const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 1001);
    return { kind: "SPREADSHEET", sheets: [{ name: "Data", rows: lines.length, headers: (lines[0] || "").split(separator).slice(0, 80), sampleRows: lines.slice(1, 31).map((line) => line.split(separator).slice(0, 80)) }], extractedText: lines.slice(0, 80).join("\n") };
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheets = workbook.worksheets.map((sheet) => {
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row) => { if (rows.length < 80) rows.push(row.values.slice(1).map(scalar).slice(0, 80)); });
    const headerRow = rows.find((row) => row.filter(Boolean).length >= 2) || [];
    return { name: sheet.name, rows: sheet.rowCount, columns: sheet.columnCount, headers: headerRow, sampleRows: rows.slice(0, 30) };
  });
  const extractedText = sheets.map((sheet) => `${sheet.name}\n${sheet.sampleRows.map((row) => row.join(" | ")).join("\n")}`).join("\n\n").slice(0, 300000);
  return { kind: "SPREADSHEET", sheets, extractedText };
}

async function extractOfficeZip(bytes, extension) {
  const zip = await JSZip.loadAsync(bytes);
  let names = [];
  if (extension === "docx") names = ["word/document.xml", ...Object.keys(zip.files).filter((name) => /^word\/(header|footer)\d+\.xml$/i.test(name))];
  if (extension === "pptx") names = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort();
  const chunks = [];
  for (const name of names.slice(0, 200)) {
    const entry = zip.file(name);
    if (entry) chunks.push(xmlText(await entry.async("string")));
  }
  return { kind: extension === "docx" ? "WORD" : "PRESENTATION", sections: chunks.length, extractedText: chunks.join("\n\n").slice(0, 300000) };
}

function extractPdf(bytes) {
  const raw = bytes.toString("latin1");
  const snippets = [];
  for (const match of raw.matchAll(/\(([^()]{3,240})\)\s*Tj/g)) snippets.push(match[1].replace(/\\[nrt]/g, " "));
  return { kind: "PDF", pagesEstimated: (raw.match(/\/Type\s*\/Page\b/g) || []).length, extractedText: snippets.join(" ").slice(0, 100000), note: "Local PDF extraction is limited; configured AI performs full text and page-image analysis." };
}

async function extractLocally(fileName, bytes) {
  const extension = String(fileName).split(".").pop().toLowerCase();
  if (["doc", "xls", "ppt"].includes(extension)) {
    const converted=await require('./legacy-office.cjs').convertLegacy(bytes,extension);
    const zip=await JSZip.loadAsync(converted.bytes);let total=0;
    if(Object.keys(zip.files).length>2000)throw new Error('Converted document has too many entries');
    for(const entry of Object.values(zip.files)){
      if(entry.dir)continue;
      if(/vbaProject|\/(embeddings|activeX)\/|\.\.|^[\\/]|[\x00-\x1f:]/i.test(entry.unsafeOriginalName||entry.name))throw new Error('Unsafe converted Office content');
      if((entry._data?.uncompressedSize||0)>10*1024*1024)throw new Error('Converted entry too large');
      const content=await entry.async('nodebuffer');total+=content.length;
      if(content.length>10*1024*1024||total>50*1024*1024)throw new Error('Converted document too large');
      if(/\.(xml|rels)$/i.test(entry.name)&&/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External/i.test(content.toString('utf8')))throw new Error('External converted resources rejected');
    }
    const result=await extractLocally('converted.'+converted.extension,converted.bytes);
    return {...result,convertedFrom:extension,conversion:'isolated LibreOffice; original preserved'};
  }
  if (["xlsx", "csv", "tsv"].includes(extension)) return extractSpreadsheet(bytes, extension);
  if (["docx", "pptx"].includes(extension)) return extractOfficeZip(bytes, extension);
  if (extension === "pdf") return extractPdf(bytes);
  if (["txt", "json", "xml", "md"].includes(extension)) return { kind: "TEXT", extractedText: bytes.toString("utf8").slice(0, 300000) };
  return { kind: extension.toUpperCase() || "FILE", extractedText: "", note: "Metadata captured. Configure AI for content analysis of this format." };
}


async function importWorkbook(bytes) {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
  if (workbook.worksheets.length > 30) throw new Error("Too many worksheets.");
  let cells = 0;
  const sheets = workbook.worksheets.map(sheet => {
    if (sheet.rowCount > 5000 || sheet.columnCount > 100) throw new Error("Workbook import limits exceeded.");
    const rows = [];
    for (let i=1;i<=sheet.rowCount;i++) {
      const values = sheet.getRow(i).values.slice(1);
      cells += values.length; if (cells > 200000) throw new Error("Workbook cell limit exceeded.");
      rows.push(values);
    }
    return { name: sheet.name, rows };
  });
  return { sheets };
}
let input=""; process.stdin.setEncoding("utf8"); process.stdin.on("data",chunk=>{input+=chunk;if(input.length>8*1024*1024)process.exit(2);}); process.stdin.on("end",async()=>{try{const p=JSON.parse(input),bytes=Buffer.from(p.base64,"base64");const result=p.mode==="import"?await importWorkbook(bytes):await extractLocally(p.fileName,bytes);process.stdout.write(JSON.stringify(result));}catch{process.exitCode=1;}});

