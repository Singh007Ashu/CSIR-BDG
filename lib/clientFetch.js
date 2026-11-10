export async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Unable to complete request (${response.status}). Please retry.`);
  if (body === null) throw new Error('Server returned an invalid response. Please retry.');
  return body;
}
