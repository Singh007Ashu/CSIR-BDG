// Shared, dependency-free policy: usable in both middleware and Node routes.
export function sessionSecret(env = process.env) {
  const value = env.SESSION_SECRET || "";
  if (value.length < 32 || /change[-_ ]?me|replace[-_ ]?with|dev-secret/i.test(value)) {
    throw new Error("SESSION_SECRET must be a unique random secret of at least 32 characters.");
  }
  return value;
}

export function sameOriginMutation(req, env = process.env) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const source = req.headers.get("origin") || req.headers.get("referer");
  if (!source || source === "null") return false;
  let actual;
  try { actual = new URL(source).origin; } catch { return false; }
  const allowed = new Set();
  const configured = (env.APP_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  for (const value of configured) { try { allowed.add(new URL(value).origin); } catch {} }
  // Without a configured public origin, use the actual HTTP Host only.
  // Forwarded headers are not trusted unless the administrator opts in.
  if (!configured.length) {
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host;
    if (host && !/[\s,/@\\]/.test(host)) {
      allowed.add(`${url.protocol}//${host}`);
      if (env.TRUST_PROXY === "1" && req.headers.get("x-forwarded-proto") === "https") allowed.add(`https://${host}`);
    }
  }
  return allowed.has(actual);
}

export function contentSecurityPolicy(nonce, development = false) {
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}; style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}; style-src-attr 'none'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
}
