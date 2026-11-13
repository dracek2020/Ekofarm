// v38: úrovně 8× pomaleji, dovednosti (farmaření, rybaření, vaření), udice až s rybníkem, zrušení výsevu, vynucená nová verze.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, normalize, applyAction, LEVEL_XP, START_PLOTS, MACHINES, MACHINE_LIST, FISH_LIST, RECIPES, PRODUCTS, CROPS,
  skillLevel, skillProgress, SKILL_XP, SKILL_MAX, machineLock, fishOk, recipeOk, pickFish, CLIENT_MIN, RULES_VERSION,
} from '../public/js/rules.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import * as R from '../public/js/rules.js';
import { fishOnce } from './fixtures/fish-bot.mjs';
import worker from '../src/worker.js';

const T0 = 1_700_000_000_000;
function farm6() {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) assert.ok(applyAction(f, { type: 'buyPlot', x, y }, T0).ok);
  return f;
}
const pond = f => { f.objects.push({ id: f.nextId++, kind: 'rybnik', x: 2, y: 2, lvl: 1 }); return f; };

test('dovednosti: nová farma začíná na 1, křivka roste a končí na 50', () => {
  const f = newFarm(T0);
  assert.deepEqual(f.sk, { f: 0, r: 0, v: 0 });
  for (const k of ['f', 'r', 'v']) assert.equal(skillLevel(f, k), 1);
  assert.equal(SKILL_MAX, 50);
  for (let L = 3; L <= SKILL_MAX; L++) assert.ok(SKILL_XP[L] > SKILL_XP[L - 1]);
  f.sk.f = SKILL_XP[5] + 3;
  assert.equal(skillLevel(f, 'f'), 5);
  assert.deepEqual(skillProgress(f, 'f'), { L: 5, cur: 3, need: SKILL_XP[6] - SKILL_XP[5] });
  f.sk.f = 1e9;
  assert.equal(skillLevel(f, 'f'), SKILL_MAX);
});

test('dovednosti: farmaření roste sklizní, setím ne', () => {
  const f = farm6();
  const [x, y] = START_PLOTS[0];
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0).ok);
  assert.equal(f.sk.f, 0, 'setí se nepočítá');
  assert.ok(applyAction(f, { type: 'harvest', x, y }, T0 + CROPS.wheat.time * 1000 + 1).ok);
  assert.ok(f.sk.f > 0, 'sklizeň přidá farmaření');
  assert.equal(f.sk.r, 0);
  assert.equal(f.sk.v, 0);
});

test('dosavadní hráč: dovednosti se odhadnou ze statistik, XP ×8/3 z v37, jen jednou', () => {
  const old = { ...newFarm(T0), v: 22, level: 12, xp: 1500, stats: { harvest: 100, fish: 4, produce: 10 } };
  delete old.sk;
  const f = normalize(old);
  assert.equal(f.v, RULES_VERSION);
  assert.equal(f.xp, 4000);
  assert.equal(f.level, 12);
  assert.deepEqual(f.sk, { f: 30, r: 60, v: 12 });   // v44: nové tempo (odhad ze statistik)
  assert.equal(normalize(f).xp, 4000);
  assert.ok(LEVEL_XP[12] <= f.xp && f.xp < LEVEL_XP[13]);
});

test('udice: první až s rybníkem, lepší podle rybaření; stroje podle farmaření', () => {
  const f = newFarm(T0);
  f.coins = 1e6;
  const rod = MACHINES.udice;
  assert.equal(machineLock(f, rod), 'no_pond');
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'udice' }, T0).error, 'no_pond');
  pond(f);
  assert.equal(machineLock(f, rod), null);
  const rods = MACHINE_LIST.filter(m => m.type === 'rod').sort((a, b) => a.tier - b.tier);
  assert.equal(machineLock(f, rods[1]), 'locked', 'druhá udice chce rybaření 2');
  assert.equal(applyAction(f, { type: 'buyMachine', model: rods[1].id }, T0).error, 'locked');
  f.sk.r = SKILL_XP[rods[1].skl];
  assert.equal(machineLock(f, rods[1]), null);
  // traktory podle farmaření, nejlepší až na 36
  const tr = MACHINE_LIST.filter(m => m.type === 'tractor').sort((a, b) => a.tier - b.tier);
  assert.equal(tr[0].skl, 1);
  assert.equal(tr[9].skl, 36);
  assert.equal(machineLock(f, tr[1]), 'locked');
  f.sk.f = SKILL_XP[tr[1].skl];
  assert.equal(machineLock(f, tr[1]), null);
  for (const m of MACHINE_LIST) assert.equal(m.sk, m.type === 'rod' ? 'r' : 'f');
});

test('ryby: vzácnější druhy berou až s vyšším rybařením', () => {
  const f = pond(newFarm(T0));
  const ok = FISH_LIST.filter(x => fishOk(f, x)).map(x => x.id).sort();
  assert.deepEqual(ok, ['karas', 'plotice']);
  for (let i = 0; i < 200; i++) assert.ok(['karas', 'plotice'].includes(pickFish(f, i / 200, T0)));
  f.sk.r = 1e9;
  assert.equal(FISH_LIST.filter(x => fishOk(f, x)).length, FISH_LIST.length);
  // úlovek přidá rybaření
  const g = pond(newFarm(T0)); g.coins = 1e6; g.silo.navnada = 3; g.objects.find(o => o.kind === 'statek').lvl = 3;
  assert.ok(applyAction(g, { type: 'buyMachine', model: 'udice' }, T0).ok);
  const po = g.objects.find(o => o.kind === 'rybnik');
  const c = fishOnce(R, g, po.id, T0 + 3_600_000);   // v47: nová minihra (serverový výběr ryby, přehrání klepnutí)
  assert.ok(c.cast.ok, c.cast.error);
  assert.ok(c.land.ok && c.land.fish, JSON.stringify(c.land));
  assert.ok(g.sk.r > 0);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(pickFish(f, i / 2000, T0));
  assert.equal(seen.size, FISH_LIST.length, 's plným rybařením můžou brát všechny druhy');
});

test('recepty: první v každé výrobně hned, další podle vaření', () => {
  const f = newFarm(T0);
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  const by = {};
  for (const r of Object.values(RECIPES)) (by[r.building] = by[r.building] || []).push(r);
  for (const [b, rs] of Object.entries(by)) assert.ok(rs.some(r => r.cook === 1), `${b}: aspoň jeden recept hned`);
  for (const r of Object.values(RECIPES)) if (/^(krmivo_|navnada$|s_|z_)/.test(r.id) && !r.out) assert.equal(r.cook, 1, r.id);   // v46: alternativní směsi (out) mají vlastní Vaření
  const hard = Object.values(RECIPES).filter(r => PRODUCTS[r.id] && r.cook > 1);
  assert.ok(hard.length > 10);
  for (const r of hard) assert.equal(recipeOk(f, r), false, r.id);
  const pec = { id: f.nextId++, kind: hard[0].building, x: 3, y: 3, lvl: 1, queue: [] };
  f.objects.push(pec);
  for (const [id, n] of Object.entries(hard[0].in)) f.silo[id] = n;
  assert.equal(applyAction(f, { type: 'produce', id: pec.id, recipe: hard[0].id }, T0).error, 'locked');
  f.sk.v = SKILL_XP[hard[0].cook];
  assert.equal(recipeOk(f, hard[0]), true);
  assert.ok(applyAction(f, { type: 'produce', id: pec.id, recipe: hard[0].id }, T0).ok);
});

test('zrušení výsevu: malé pole je hned volné, osivo ani mince se nevrací', () => {
  const f = farm6();
  const [x, y] = START_PLOTS[0];
  assert.equal(applyAction(f, { type: 'clearPlot', x, y }, T0).error, 'nothing');
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0).ok);
  const coins = f.coins;
  assert.ok(applyAction(f, { type: 'clearPlot', x, y }, T0 + 1000).ok);
  assert.equal(f.coins, coins, 'nic se nevrátí');
  const p = f.plots.find(q => q.x === x && q.y === y);
  assert.equal(p.crop, null);
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0 + 2000).ok, 'jde zasadit znovu');
  assert.equal(applyAction(f, { type: 'clearPlot', x, y }, T0 + 2000 + CROPS.wheat.time * 1000).error, 'plot_ready');
});

test('zrušení osetí velkého pole', () => {
  const f = newFarm(T0);
  const o = { id: f.nextId++, kind: 'velkepole', x: 4, y: 4, w: 4, h: 4, lvl: 1, soil: 'plowed', mult: 1.5, crop: 'wheat',
    job: { type: 'sow', m: 1, start: T0, end: T0 + 10_000 }, readyAt: T0 + 3_600_000 };
  f.objects.push(o);
  assert.equal(applyAction(f, { type: 'fieldClear', id: o.id }, T0 + 5_000).error, 'machine_busy');
  assert.ok(applyAction(f, { type: 'fieldClear', id: o.id }, T0 + 20_000).ok);
  assert.equal(o.crop, null);
  assert.equal(o.soil, 'raw', 'zorání propadne');
  assert.equal(applyAction(f, { type: 'fieldClear', id: o.id }, T0 + 30_000).error, 'nothing');
});

test('server: stará verze aplikace dostane 409 old_client, nová projde', async () => {
  const env = { DB: fakeD1() };
  const call = async (path, ver, token, body) => {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = 'Bearer ' + token;
    if (ver !== undefined) headers['x-eko-version'] = String(ver);
    const res = await worker.fetch(new Request('https://x' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }), env);
    return { status: res.status, data: await res.json() };
  };
  const reg = await call('/api/register', undefined, null, { name: 'Verze', password: 'tajne123' });
  assert.equal(reg.status, 200, 'registrace funguje i bez hlavičky');
  const token = reg.data.token;
  let r = await call('/api/state', undefined, token);
  assert.equal(r.status, 409);
  assert.equal(r.data.error, 'old_client');
  r = await call('/api/actions', CLIENT_MIN - 1, token, { actions: [] });
  assert.equal(r.status, 409);
  r = await call('/api/state', CLIENT_MIN, token);
  assert.equal(r.status, 200);
  assert.equal(r.data.farm.coins, 50, 'postup zůstal');
});
