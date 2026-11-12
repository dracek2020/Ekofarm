// Upozornění: šifrování zprávy (ověřeno dešifrováním jako prohlížeč), podpis VAPID a kolo časovače.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, vapidAuth, hkdf, concat, b64u, unb64u } from '../src/webpush.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker, { pushRound } from '../src/worker.js';
import { readyEvents, newFarm, applyAction, START_PLOTS } from '../public/js/rules.js';

const enc = new TextEncoder();
const vk = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const VAPID = { VAPID_PUBLIC: b64u(await crypto.subtle.exportKey('raw', vk.publicKey)), VAPID_PRIVATE: (await crypto.subtle.exportKey('jwk', vk.privateKey)).d };
// „prohlížeč“ s vlastními klíči
const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPub = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));
const SUB = { endpoint: 'https://push.example.com/abc', keys: { p256dh: b64u(uaPub), auth: b64u(auth) } };

async function decrypt(body) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  assert.equal(pt[pt.length - 1], 2, 'oddělovač posledního záznamu');
  return new TextDecoder().decode(pt.slice(0, -1));
}

test('v11: zašifrovanou zprávu prohlížeč přečte, podpis VAPID sedí', async () => {
  const body = await encryptPayload(SUB.keys.p256dh, SUB.keys.auth, 'Úroda je zralá 🌾');
  assert.equal(await decrypt(body), 'Úroda je zralá 🌾');
  const h = await vapidAuth(VAPID, SUB.endpoint);
  const [, jwt, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, VAPID.VAPID_PUBLIC);
  const [hd, cl, sig] = jwt.split('.');
  assert.equal(JSON.parse(new TextDecoder().decode(unb64u(cl))).aud, 'https://push.example.com');
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vk.publicKey, unb64u(sig), enc.encode(hd + '.' + cl)));
});

test('v11: co je hotové mezi dvěma časy', () => {
  const T = 1_700_000_000_000;
  const f = newFarm(T);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T);
  applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T);
  assert.deepEqual(readyEvents(f, T, T + 30000), []);
  assert.equal(readyEvents(f, T, T + 61000)[0].k, 'crop');
  assert.deepEqual(readyEvents(f, T + 61000, T + 120000), [], 'podruhé už ne');
});

test('v11: odběr upozornění a kolo časovače (s podvrženou push službou)', async () => {
  const env = { DB: fakeD1(), ...VAPID };
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await worker.fetch(new Request('https://x' + path, { method, headers: { 'content-type': 'application/json', 'x-eko-version': '999', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
    return { status: res.status, data: await res.json() };
  };
  assert.equal((await call('/api/config')).data.vapidPublic, VAPID.VAPID_PUBLIC);
  const token = (await call('/api/register', { method: 'POST', body: { name: 'Pusher', password: 'tajne123' } })).data.token;
  assert.equal((await call('/api/push/subscribe', { method: 'POST', token, body: { sub: { endpoint: 'nehttps' } } })).status, 400);
  assert.equal((await call('/api/push/subscribe', { method: 'POST', token, body: { sub: SUB } })).status, 200);
  await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'buyPlot', x: 11, y: 8 }, { type: 'plant', x: 11, y: 8, crop: 'wheat' }] } });
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opt) => { sent.push({ url, body: JSON.parse(await decrypt(new Uint8Array(opt.body))) }); return new Response('', { status: 201 }); };
  try {
    assert.equal(await pushRound(env, Date.now() + 5000), 0, 'ještě nic hotového');
    assert.equal(await pushRound(env, Date.now() + 70000), 1);
    assert.equal(sent[0].url, SUB.endpoint);
    assert.match(sent[0].body.body, /Úroda je zralá/);
    assert.equal(await pushRound(env, Date.now() + 80000), 0, 'stejná věc se neposílá dvakrát');
    // neplatný odběr se smaže
    globalThis.fetch = async () => new Response('', { status: 410 });
    await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'harvest', x: 11, y: 8 }] } });
  } finally { globalThis.fetch = realFetch; }
  assert.equal((await call('/api/push/unsubscribe', { method: 'POST', token, body: { endpoint: SUB.endpoint } })).status, 200);
  assert.equal(await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first().then(r => r.n), 0);
});
