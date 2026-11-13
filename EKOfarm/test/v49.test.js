// v49: server a výkon na telefonech – klíč dávky (nic se nezdvojí po výpadku sítě), úklid prošlých přihlášení,
// hlavičky mezipaměti, ikony pro Android, šetření na pozadí, kontrola uložených farem (tools/farm-check.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as R from '../public/js/rules.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker, { cleanup } from '../src/worker.js';

const env = { DB: fakeD1() };
async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json', 'x-eko-version': '999' };
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://x' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('V01 klíč dávky: opakované odeslání téže dávky se neprovede podruhé', async () => {
  const r0 = await call('/api/register', { method: 'POST', body: { name: 'Dávka', password: 'tajne123' } });
  const token = r0.data.token;
  const body = { actions: [{ type: 'buyPlot', x: 11, y: 8 }], b: 'abc12345' };
  let r = await call('/api/actions', { method: 'POST', token, body });
  assert.equal(r.status, 200);
  assert.equal(r.data.results[0].ok, true);
  const after = r.data.farm.coins;
  assert.deepEqual(r.data.farm.bk, ['abc12345']);
  // telefon nedostal odpověď a pošle totéž znovu
  r = await call('/api/actions', { method: 'POST', token, body });
  assert.equal(r.status, 200);
  assert.equal(r.data.dup, true);
  assert.deepEqual(r.data.results, [{ ok: true, dup: true }]);
  assert.equal(r.data.farm.coins, after, 'nic se nezdvojilo');
  assert.equal(r.data.farm.plots.length, r0.data.farm.plots.length + 1);
  // jiná dávka se provede normálně
  r = await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'buyPlot', x: 12, y: 8 }], b: 'def67890' } });
  assert.equal(r.data.results[0].ok, true);
  assert.equal(r.data.farm.plots.length, r0.data.farm.plots.length + 2);
  // bez klíče (starší klient) i se špatným klíčem funguje jako dřív
  r = await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'buyPlot', x: 13, y: 8 }], b: 'X; drop' } });
  assert.equal(r.data.results[0].ok, true);
  assert.deepEqual(r.data.farm.bk, ['abc12345', 'def67890']);
});

test('V02 klíč dávky: pamatuje se posledních 8, samotný tick se neukládá', async () => {
  const r0 = await call('/api/register', { method: 'POST', body: { name: 'Klíče', password: 'tajne123' } });
  const token = r0.data.token;
  await env.DB.prepare("UPDATE farms SET state = json_set(state, '$.coins', 100000) WHERE user_id = (SELECT id FROM users WHERE name = 'Klíče')").run();
  let r;
  for (let i = 0; i < 10; i++) r = await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'buyPlot', x: 11 + (i % 5), y: 9 + Math.floor(i / 5) }], b: 'key' + String(i).padStart(4, '0') } });
  assert.equal(r.data.farm.bk.length, 8);
  assert.equal(r.data.farm.bk[0], 'key0002');
  r = await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'tick' }], b: 'tick0001' } });
  assert.ok(!r.data.farm.bk.includes('tick0001'), 'tick má vlastní ochranu (nic nezměnil = neuloží se)');
  assert.ok(!r.data.dup);
});

test('V03 noční úklid smaže jen prošlá přihlášení', async () => {
  const db = fakeD1();
  await db.prepare("INSERT INTO users (id, name, created) VALUES (1, 'A', 0)").run();
  const now = 1_800_000_000_000;
  for (const [h, exp] of [['a', now - 1], ['b', now - 86_400_000], ['c', now + 1], ['d', now + 86_400_000]]) {
    await db.prepare('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)').bind(h, 1, 0, exp).run();
  }
  assert.equal(await cleanup({ DB: db }, now), 2);
  const left = (await db.prepare('SELECT token_hash FROM sessions ORDER BY token_hash').all()).results.map(x => x.token_hash);
  assert.deepEqual(left, ['c', 'd']);
  assert.equal(await cleanup({ DB: db }, now), 0);
});

test('V04 _headers: kód a písma na rok (adresy mají ?v=), obrázky týden, stránka a sw.js vždy čerstvé', () => {
  const h = src('public/_headers');
  const block = path => { const m = h.split(/\n(?=\S)/).find(b => b.split('\n')[0].trim() === path); assert.ok(m, 'chybí ' + path); return m; };
  for (const p of ['/js/*', '/css/*', '/fonts/*']) assert.match(block(p), /max-age=31536000, immutable/);
  assert.match(block('/img/*'), /max-age=3600,/);   // grafika se občas přepíše pod stejným jménem → jen hodina
  assert.match(src('public/sw.js'), /fetch\(e\.request, \{ cache: 'no-cache' \}\)/);
  for (const p of ['/', '/index.html', '/sw.js']) assert.match(block(p), /no-cache/);
  assert.doesNotMatch(block('/sw.js'), /immutable/);
  assert.match(block('/*'), /nosniff/);
  // všechny skripty a styly v index.html mají číslo verze → dlouhá mezipaměť je bezpečná
  const idx = src('public/index.html');
  for (const m of idx.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"]+)"/g)) assert.match(m[1], /\?v=\d+$/, m[1]);
  // a importy mezi moduly taky
  for (const f of ['main.js', 'panels.js', 'render.js', 'rules.js', 'api.js']) {
    for (const m of src('public/js/' + f).matchAll(/from '(\.\/[^']+)'/g)) assert.match(m[1], /\?v=\d+$/, f + ': ' + m[1]);
  }
});

test('V05 manifest: ikony pro Android (maskable) existují a mají správnou velikost', () => {
  const m = JSON.parse(src('public/manifest.webmanifest'));
  assert.equal(m.lang, 'cs');
  assert.equal(m.display, 'standalone');
  const mask = m.icons.filter(i => i.purpose === 'maskable');
  assert.equal(mask.length, 2);
  for (const i of m.icons) {
    const buf = readFileSync(new URL('../public' + i.src, import.meta.url));
    const w = buf.readUInt32BE(16), hh = buf.readUInt32BE(20);
    assert.equal(`${w}x${hh}`, i.sizes, i.src);
  }
  const idx = src('public/index.html');
  assert.match(idx, /apple-mobile-web-app-capable|mobile-web-app-capable/);
  assert.match(idx, /viewport-fit=cover/);
  assert.match(idx, /apple-touch-icon/);
});

test('V06 šetření na pozadí a odeslání před zamčením telefonu', () => {
  const m = src('public/js/main.js'), a = src('public/js/api.js');
  assert.match(m, /window\.addEventListener\('pagehide', flushNow\)/);
  assert.match(m, /if \(document\.hidden\) \{ flushNow\(\); return; \}/);
  assert.match(m, /!document\.hidden && game\.panel && game\.panel\.kind === 'chat'\) chatPoll\(\); \}, 4000/);
  assert.match(m, /!document\.hidden && \(!game\.panel \|\| game\.panel\.kind !== 'chat'\)\) chatPoll\(\); \}, 20000/);
  assert.match(m, /game\.visit \|\| document\.hidden\) return;   \/\/ v49/);
  assert.match(m, /function frameGap\(t\)/);
  assert.match(a, /keepalive: !!data && data\.length < 60000/);
  assert.match(a, /send\(actions, b\)/);
});

test('V07 kontrola uložených farem: nic se neztratí, chybějící věc se pozná', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eko49-'));
  const T = 1_800_000_000_000;
  const good = R.newFarm(T);
  good.skv = 2;
  const bad = R.newFarm(T);
  bad.skv = 2;
  bad.silo = { neexistuje_xyz: 3 };
  const file = join(dir, 'farms.json');
  writeFileSync(file, JSON.stringify([{ results: [{ user_id: 1, state: JSON.stringify(good) }] }]));
  let r = spawnSync(process.execPath, ['tools/farm-check.mjs', file, String(T + 60_000)], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /hráč #1: .*OK – nic se neztratilo/);
  assert.match(r.stdout, /Farem: 1, s problémem: 0/);
  writeFileSync(file, JSON.stringify([{ user_id: 1, state: JSON.stringify(good) }, { user_id: 2, state: JSON.stringify(bad) }]));
  r = spawnSync(process.execPath, ['tools/farm-check.mjs', file, String(T + 60_000)], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /hráč #2: .*PROBLÉM: neznámé ID: předmět neexistuje_xyz/);
  assert.doesNotMatch(r.stdout, /"name"|heslo|pass/);
});

test('V08 verze: klient i server chtějí v49', () => {
  assert.ok(R.CLIENT_MIN >= 49);
  assert.match(src('public/js/main.js'), /from '\.\/rules\.js\?v=49'/);
});
