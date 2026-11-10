// Integrační test API nad SQLite (náhrada za D1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker from '../src/worker.js';

const env = { DB: fakeD1() };
async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://x' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}

test('registrace, hraní, přihlášení', async () => {
  let r = await call('/api/register', { method: 'POST', body: { name: 'Vojta', password: 'tajne123' } });
  assert.equal(r.status, 200);
  const token = r.data.token;
  assert.equal(r.data.farm.coins, 50);

  r = await call('/api/register', { method: 'POST', body: { name: 'vojta', password: 'tajne123' } });
  assert.equal(r.status, 409, 'jméno bez ohledu na velikost písmen');

  r = await call('/api/state');
  assert.equal(r.status, 401);

  r = await call('/api/actions', { method: 'POST', token, body: { actions: [
    { type: 'buyPlot', x: 11, y: 8 },
    { type: 'buyPlot', x: 12, y: 8 },
    { type: 'plant', x: 11, y: 8, crop: 'wheat' },
    { type: 'plant', x: 12, y: 8, crop: 'wheat' },
    { type: 'harvest', x: 11, y: 8 },
    { type: 'plant', x: 12, y: 8, crop: 'corn' },
  ] } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.results.map(x => x.ok), [true, true, true, true, false, false]);
  assert.equal(r.data.farm.coins, 48);

  r = await call('/api/login', { method: 'POST', body: { name: 'VOJTA', password: 'spatne' } });
  assert.equal(r.status, 401);
  r = await call('/api/login', { method: 'POST', body: { name: 'VOJTA', password: 'tajne123' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.coins, 48, 'farma uložená v DB');

  const t2 = r.data.token;
  r = await call('/api/logout', { method: 'POST', token: t2 });
  assert.equal(r.status, 200);
  r = await call('/api/state', { token: t2 });
  assert.equal(r.status, 401);
  r = await call('/api/state', { token });
  assert.equal(r.status, 200);
});

test('validace vstupů', async () => {
  let r = await call('/api/register', { method: 'POST', body: { name: 'ab', password: 'tajne123' } });
  assert.equal(r.status, 400);
  r = await call('/api/register', { method: 'POST', body: { name: 'Pepa', password: '123' } });
  assert.equal(r.status, 400);
  r = await call('/api/register', { method: 'POST', body: { name: '<script>', password: '123456' } });
  assert.equal(r.status, 400);
});

test('žebříček', async () => {
  const a = (await call('/api/register', { method: 'POST', body: { name: 'Prvni', password: 'tajne123' } })).data.token;
  const b = (await call('/api/register', { method: 'POST', body: { name: 'Druhy', password: 'tajne123' } })).data.token;
  await call('/api/actions', { method: 'POST', token: b, body: { actions: [{ type: 'claimDaily' }] } });
  let r = await call('/api/leaderboard', { token: a });
  assert.equal(r.status, 200);
  assert.ok(r.data.top.length >= 2);
  assert.ok(r.data.top.some(x => x.me && x.name === 'Prvni'));
  assert.equal(r.data.me.xp, 0);
  r = await call('/api/leaderboard');
  assert.equal(r.status, 401);
});

// pomocník: upraví farmu přímo v databázi
async function patchFarm(name, fn) {
  const u = await env.DB.prepare('SELECT id FROM users WHERE name = ?').bind(name).first();
  const r = await env.DB.prepare('SELECT state FROM farms WHERE user_id = ?').bind(u.id).first();
  const f = JSON.parse(r.state);
  fn(f);
  await env.DB.prepare('UPDATE farms SET state = ?, version = version + 1 WHERE user_id = ?').bind(JSON.stringify(f), u.id).run();
}

test('v10: tržiště hráčů – vystavit, koupit, peníze prodávajícímu, stáhnout', async () => {
  const s = (await call('/api/register', { method: 'POST', body: { name: 'Prodavac', password: 'tajne123' } })).data.token;
  const k = (await call('/api/register', { method: 'POST', body: { name: 'Kupec', password: 'tajne123' } })).data.token;
  await patchFarm('Prodavac', f => { f.silo = { corn: 10, wheat: 5 }; f.machines = [{ id: 99, model: 'kolecko' }]; });
  await patchFarm('Kupec', f => { f.coins = 1000; });
  // cena nejvýš 3× skutečná (kukuřice 8 → 5 ks max 120)
  let r = await call('/api/market/list', { method: 'POST', token: s, body: { item: 'corn', qty: 5, price: 121 } });
  assert.equal(r.status, 400);
  r = await call('/api/market/list', { method: 'POST', token: s, body: { item: 'corn', qty: 50, price: 10 } });
  assert.equal(r.status, 400, 'tolik nemá');
  r = await call('/api/market/list', { method: 'POST', token: s, body: { item: 'corn', qty: 5, price: 100 } });
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.silo.corn, 5, 'zboží odešlo do nabídky');
  r = await call('/api/market/list', { method: 'POST', token: s, body: { machine: 99, price: 400 } });
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.machines.length, 0);
  r = await call('/api/market/list', { method: 'POST', token: s, body: { item: 'wheat', qty: 5, price: 20 } });
  assert.equal(r.status, 200);

  r = await call('/api/market', { token: k });
  assert.equal(r.status, 200);
  assert.equal(r.data.offers.length, 3);
  const corn = r.data.offers.find(o => o.item === 'corn');
  const wheel = r.data.offers.find(o => o.machine === 'kolecko');
  assert.equal(corn.name, 'Prodavac');

  r = await call('/api/market/buy', { method: 'POST', token: s, body: { id: corn.id } });
  assert.equal(r.status, 400, 'vlastní nabídku nekoupí');
  r = await call('/api/market/buy', { method: 'POST', token: k, body: { id: corn.id } });
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.coins, 900);
  assert.equal(r.data.farm.silo.corn, 5);
  r = await call('/api/market/buy', { method: 'POST', token: k, body: { id: corn.id } });
  assert.equal(r.status, 404, 'podruhé už není');
  r = await call('/api/market/buy', { method: 'POST', token: k, body: { id: wheel.id } });
  assert.equal(r.status, 200);
  assert.ok(r.data.farm.machines.some(m => m.model === 'kolecko'));

  // prodávající dostane peníze při dalším načtení – jen jednou
  r = await call('/api/state', { token: s });
  assert.equal(r.data.farm.coins, 50 + 100 + 400);
  assert.equal(r.data.sales.length, 2);
  r = await call('/api/state', { token: s });
  assert.equal(r.data.farm.coins, 550);
  assert.equal(r.data.sales, undefined);

  // stáhnout nabídku = zboží zpět
  r = await call('/api/market', { token: s });
  assert.equal(r.data.mine.length, 1);
  assert.equal(r.data.sold.length, 2);
  r = await call('/api/market/cancel', { method: 'POST', token: k, body: { id: r.data.mine[0].id } });
  assert.equal(r.status, 404, 'cizí nabídku stáhnout nejde');
  const mine = (await call('/api/market', { token: s })).data.mine[0];
  r = await call('/api/market/cancel', { method: 'POST', token: s, body: { id: mine.id } });
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.silo.wheat, 5);
  assert.equal((await call('/api/market', { token: s })).data.mine.length, 0);
});

test('v10: návštěva farmy a žebříček podle úrovně', async () => {
  const a = (await call('/api/register', { method: 'POST', body: { name: 'Mistr', password: 'tajne123' } })).data.token;
  await patchFarm('Mistr', f => { f.level = 40; f.xp = 1; });
  let r = await call('/api/leaderboard', { token: a });
  assert.equal(r.data.top[0].name, 'Mistr', 'řadí se podle úrovně, ne XP');
  assert.equal(r.data.me.rank, 1);
  r = await call('/api/visit?name=mistr', { token: a });
  assert.equal(r.status, 200);
  assert.equal(r.data.name, 'Mistr');
  assert.equal(r.data.farm.level, 40);
  r = await call('/api/visit?name=nikdo', { token: a });
  assert.equal(r.status, 404);
});
