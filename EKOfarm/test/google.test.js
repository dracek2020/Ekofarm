// Přihlášení přes Google – podepsané testovací tokeny a podvržené klíče Google.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';
import { _resetGoogleKeys } from '../src/google.js';

const CLIENT = 'test-client.apps.googleusercontent.com';
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
globalThis.fetch = async url => {
  assert.equal(url, 'https://www.googleapis.com/oauth2/v3/certs');
  return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=600' } });
};
_resetGoogleKeys();

const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function token(payload, key = kp.privateKey) {
  const head = b64u({ alg: 'RS256', kid: 'k1', typ: 'JWT' }) + '.' + b64u(payload);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head));
  return head + '.' + Buffer.from(sig).toString('base64url');
}
const base = sub => ({ iss: 'https://accounts.google.com', aud: CLIENT, sub, exp: Math.floor(Date.now() / 1000) + 3600, given_name: 'Vojtěch' });

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return { prepare(sql) { let args = []; const st = {
    bind(...a) { args = a; return st; },
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
  }; return st; } };
}
const env = { DB: fakeD1(), GOOGLE_CLIENT_ID: CLIENT };
async function call(path, { method = 'GET', body, tok } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (tok) headers.authorization = 'Bearer ' + tok;
  const res = await worker.fetch(new Request('https://x' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}

test('config', async () => {
  assert.equal((await call('/api/config')).data.googleClientId, CLIENT);
  const r = await worker.fetch(new Request('https://x/api/config'), { DB: env.DB, GOOGLE_CLIENT_ID: 'SEM_VLOZ_GOOGLE_CLIENT_ID' });
  assert.equal((await r.json()).googleClientId, null, 'nevyplněné ID se neposílá');
});

test('nový hráč přes Google, pak znovu přihlášení', async () => {
  let r = await call('/api/google', { method: 'POST', body: { credential: await token(base('g-1')) } });
  assert.equal(r.status, 200);
  assert.equal(r.data.name, 'Vojtěch');
  assert.ok(r.data.created && r.data.google);
  r = await call('/api/google', { method: 'POST', body: { credential: await token(base('g-2')) } });
  assert.equal(r.data.name, 'Vojtěch2', 'stejné jméno dostane číslo');
  r = await call('/api/google', { method: 'POST', body: { credential: await token(base('g-1')) } });
  assert.equal(r.data.name, 'Vojtěch');
  assert.ok(!r.data.created);
  r = await call('/api/login', { method: 'POST', body: { name: 'Vojtěch', password: 'cokoliv' } });
  assert.equal(r.status, 401);
  assert.match(r.data.message, /Google/);
});

test('neplatné tokeny', async () => {
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  for (const t of [
    await token(base('x'), other.privateKey),
    await token({ ...base('x'), aud: 'cizi' }),
    await token({ ...base('x'), iss: 'evil.com' }),
    await token({ ...base('x'), exp: 1000 }),
    'nesmysl',
  ]) {
    const r = await call('/api/google', { method: 'POST', body: { credential: t } });
    assert.equal(r.status, 401);
  }
});

test('propojení existujícího účtu s Googlem', async () => {
  let r = await call('/api/register', { method: 'POST', body: { name: 'Pepa', password: 'tajne123' } });
  const tok = r.data.token;
  r = await call('/api/google', { method: 'POST', tok, body: { mode: 'link', credential: await token(base('g-1')) } });
  assert.equal(r.status, 409, 'Google už patří jiné farmě');
  r = await call('/api/google', { method: 'POST', tok, body: { mode: 'link', credential: await token(base('g-pepa')) } });
  assert.equal(r.status, 200);
  r = await call('/api/state', { tok });
  assert.equal(r.data.google, true);
  r = await call('/api/google', { method: 'POST', body: { credential: await token(base('g-pepa')) } });
  assert.equal(r.data.name, 'Pepa', 'přihlášení Googlem do propojené farmy');
  r = await call('/api/login', { method: 'POST', body: { name: 'pepa', password: 'tajne123' } });
  assert.equal(r.status, 200, 'heslo dál funguje');
});
