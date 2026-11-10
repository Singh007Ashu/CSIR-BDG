// Stored links are data, not trusted router instructions.
export function safeInternalPath(value, fallback = "/notifications") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const url = new URL(value, "https://internal.invalid");
    return url.origin === "https://internal.invalid" ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}
