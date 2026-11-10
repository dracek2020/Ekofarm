// Integrační test API nad SQLite (náhrada za D1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      let args = [];
      const st = {
        bind(...a) { args = a; return st; },
        async first() { return db.prepare(sql).get(...args) ?? null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() {
          const r = db.prepare(sql).run(...args);
          return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
        },
      };
      return st;
    },
  };
}

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
