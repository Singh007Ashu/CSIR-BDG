import { runDocumentParser } from "./parserRunner";
import { validateUploadBytes } from "./uploadValidation";
import { scanUpload } from "./malwareScan";

export async function readImportWorkbook(file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  await validateUploadBytes(bytes, "xlsx");
  await scanUpload(bytes);
  const result = await runDocumentParser({ mode: "import", base64: bytes.toString("base64") }, { maxOutputBytes: 8 * 1024 * 1024 });
  const worksheets = result.sheets.map(sheet => ({
    name: sheet.name, rowCount: sheet.rows.length,
    getRow(index) { const values = [null, ...(sheet.rows[index - 1] || [])]; return { values, getCell(column) { return { value: values[column] ?? null }; } }; },
  }));
  return { worksheets, getWorksheet(name) { return worksheets.find(sheet => sheet.name === name); } };
}
