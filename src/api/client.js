// ============================================================
//  api(): one helper for every backend call.
//  It automatically attaches the login token and the active
//  company id, so screens just call api('/products') etc.
// ============================================================
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Save the API base so the standalone print pages (public/*-invoice.html) can use it.
try { localStorage.setItem('apiBase', BASE); } catch (e) {}

const getToken = () => localStorage.getItem('token');
const getCompanyId = () => localStorage.getItem('companyId');

export async function api(path, { method = 'GET', body, company = true, headers: extraHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Most endpoints need to know which company we're working in.
  if (company) {
    const cid = getCompanyId();
    if (cid) headers['X-Company-Id'] = cid;
  }

  // Optional extra headers (e.g. an Idempotency-Key for safe retries).
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    // If the session expired, clear it so the app sends us back to login.
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const message = data && data.error ? data.error : 'Something went wrong. Please try again.';
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}
