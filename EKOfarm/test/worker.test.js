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

test('v15: chat pro celý server', async () => {
  const a = (await call('/api/register', { method: 'POST', body: { name: 'Chatar', password: 'tajne123' } })).data.token;
  const b = (await call('/api/register', { method: 'POST', body: { name: 'Chatarka', password: 'tajne123' } })).data.token;
  assert.equal((await call('/api/chat', { method: 'POST', token: a, body: { text: '   ' } })).status, 400);
  assert.equal((await call('/api/chat', { method: 'POST', token: a, body: { text: 'Ahoj <b>všichni</b>\n' + 'x'.repeat(300) } })).status, 200);
  assert.equal((await call('/api/chat', { method: 'POST', token: a, body: { text: 'hned znovu' } })).status, 429, 'ochrana proti spamu');
  assert.equal((await call('/api/chat', { method: 'POST', token: b, body: { text: 'Čau!' } })).status, 200);
  let r = await call('/api/chat', { token: b });
  assert.equal(r.data.msgs.length, 2);
  assert.equal(r.data.msgs[0].name, 'Chatar');
  assert.equal(r.data.msgs[0].text.length, 200, 'zkrácená zpráva');
  assert.ok(!r.data.msgs[0].text.includes('\n'));
  r = await call('/api/chat?after=' + r.data.msgs[0].id, { token: a });
  assert.deepEqual(r.data.msgs.map(m => m.text), ['Čau!']);
  assert.equal((await call('/api/chat')).status, 401, 'jen přihlášení');
});

test('v27: akce tick dopočítá práci vesničanů a farma se uloží', async () => {
  let r = await call('/api/register', { method: 'POST', body: { name: 'Tikac', password: 'tajne123' } });
  const token = r.data.token;
  r = await call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'tick' }, { type: 'villPlan', id: 1, key: 'wheat', pct: 50 }, { type: 'villJob', id: 1, r: 'mouka' }] } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.results.map(x => x.ok), [true, false, false], 'tick projde, plán bez vesničana ne, stará akce už neexistuje');
  assert.equal(r.data.results[2].error, 'bad_action');
  const v1 = (await call('/api/state', { token })).data.farm;
  assert.deepEqual(v1.vill, []);
});

test('v31: souběžné požadavky – tým pracuje, zboží se nezdvojí, farma se uloží celá', async () => {
  const R = await import('../public/js/rules.js');
  let r = await call('/api/register', { method: 'POST', body: { name: 'Soubeh', password: 'tajne123' } });
  const token = r.data.token, now0 = Date.now();
  // farma s mlýnem úrovně 4 (2 místa) a dvěma řemeslníky; 300 pšenice
  const f = (await call('/api/state', { token })).data.farm;
  f.level = 20; f.xp = R.LEVEL_XP[20]; f.coins = 5000; f.siloCap = 1000;
  f.objects.find(o => o.kind === 'statek').lvl = 5;
  let mlyn = 0;
  for (let y = 0; y < 17 && !mlyn; y++) for (let x = 0; x < 17 && !mlyn; x++) if (R.fits(f, x, y, 2, 2)) mlyn = R.applyAction(f, { type: 'place', kind: 'mlyn', x, y }, now0).id;
  R.findObject(f, mlyn).lvl = 4;
  for (const id of [9001, 9002]) { f.vill.push({ id, prof: 'vyroba', xp: { vyroba: 400 }, hist: [], at: 0, area: null, t: now0, n: 0 }); assert.ok(R.applyAction(f, { type: 'assignVill', id, at: mlyn }, now0).ok); }
  assert.ok(R.applyAction(f, { type: 'plan', w: 'b' + mlyn, key: 'mouka', pct: 100 }, now0).ok);
  assert.ok(R.applyAction(f, { type: 'keep', item: 'corn', n: 5 }, now0).ok);
  f.silo = { wheat: 300 };
  await env.DB.prepare("UPDATE farms SET state = ?, version = version + 1 WHERE user_id = (SELECT id FROM users WHERE name = 'Soubeh')").bind(JSON.stringify(f)).run();
  const coins0 = f.coins;
  // 6 požadavků naráz: každý dopočítá práci a prodá 10 pšenice
  const res = await Promise.all(Array.from({ length: 6 }, () => call('/api/actions', { method: 'POST', token, body: { actions: [{ type: 'tick' }, { type: 'sell', item: 'wheat', qty: 10 }] } })));
  let sold = 0, coins = 0;
  for (const x of res) {
    assert.ok(x.status === 200 || x.status === 409, 'projde, nebo „zkus znovu“');
    if (x.status === 200 && x.data.results[1].ok) { sold++; coins += 10 * R.sellPrice('wheat', x.data.now); }
  }
  assert.ok(sold >= 1);
  const g = (await call('/api/state', { token })).data.farm;
  const o = R.findObject(g, mlyn);
  const made = (g.silo.mouka || 0) + o.queue.reduce((n, q) => n + (q.n || 1), 0) + g.vill.reduce((n, v) => n + (v.job && v.job.k === 'load' ? v.job.n : 0), 0);
  assert.equal((g.silo.wheat || 0) + 10 * sold + 3 * made, 300, 'pšenice: zbytek + prodáno + na mouku = 300, nic navíc ani navíc prodané');
  assert.equal(g.coins - coins0, coins, 'mince jen za skutečné prodeje');
  // uložilo se všechno: tým, plán, rezerva, kapacita
  assert.deepEqual(g.vill.map(v => [v.id, v.at]), [[9001, mlyn], [9002, mlyn]]);
  assert.deepEqual(o.plan, { mouka: 100 }); assert.deepEqual(g.keep, { corn: 5 }); assert.equal(g.v, R.RULES_VERSION);
});
