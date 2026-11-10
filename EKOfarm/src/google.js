// Ověření přihlašovacího tokenu Google (ID token, JWT podepsaný RS256).
// Klíče Google se stahují z veřejné adresy a drží se v paměti podle cache-control.

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
let keys = null;
let keysExp = 0;

async function googleKeys(force) {
  if (!force && keys && Date.now() < keysExp) return keys;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error('google_certs');
  const j = await r.json();
  keys = j.keys || [];
  const m = (r.headers.get('cache-control') || '').match(/max-age=(\d+)/);
  keysExp = Date.now() + (m ? Number(m[1]) * 1000 : 3600000);
  return keys;
}

function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
const b64urlJson = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

// Vrací obsah tokenu ({ sub, email, given_name, name, … }), nebo null, když neplatí.
export async function verifyGoogleToken(token, clientId, now = Date.now()) {
  if (typeof token !== 'string' || !clientId) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try { header = b64urlJson(parts[0]); payload = b64urlJson(parts[1]); } catch { return null; }
  if (header.alg !== 'RS256') return null;
  let jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find(k => k.kid === header.kid); // Google klíče střídá
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  if (payload.aud !== clientId) return null;
  if (!ISSUERS.includes(payload.iss)) return null;
  if (!payload.exp || payload.exp * 1000 < now - 60000) return null;
  if (!payload.sub) return null;
  return payload;
}

// jen pro testy
export function _resetGoogleKeys() { keys = null; keysExp = 0; }
