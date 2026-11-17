export function requestMeta(req) {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
  };
}

export function cleanText(value, max = 5000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

export function optionalText(value, max = 5000) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

export function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
