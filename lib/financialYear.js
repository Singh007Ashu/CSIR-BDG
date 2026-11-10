export function parseFinancialYear(value) {
  const match = String(value ?? "").trim().replace(/^FY\s*/i, "").match(/^(\d{4})(?:\s*[-–/]\s*(\d{2}|\d{4}))?$/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1900 || year > 9998) return null;
  if (match[2] && Number(match[2]) !== (match[2].length === 2 ? (year + 1) % 100 : year + 1)) return null;
  return year;
}
export function formatFinancialYear(value) { const year = parseFinancialYear(value); return year === null ? "" : year + "-" + String((year + 1) % 100).padStart(2, "0"); }
export function currentFinancialYear() { const now = new Date(); return now.getFullYear() - (now.getMonth() < 3 ? 1 : 0); }

