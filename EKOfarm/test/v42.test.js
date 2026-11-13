// v42: hráč si vybírá, jestli seje osivem ze zásob, nebo za mince (osivo pak zůstane týmu).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFarm, applyAction, START_PLOTS, CROPS, LEVEL_XP, ERRORS, have } from '../public/js/rules.js';

const T0 = 1_700_000_000_000;
function farm() {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.level = 10; f.xp = LEVEL_XP[10]; f.coins = 100;
  return f;
}
const seeds = (f, id) => have(f, 's_' + id);
function giveSeeds(f, id, n) { f.seeds = f.seeds || {}; f.seeds['s_' + id] = n; }

test('setí za mince: osivo ve zásobách zůstane', () => {
  const f = farm(); giveSeeds(f, 'wheat', 5);
  assert.equal(seeds(f, 'wheat'), 5, 'osivo je ve zásobách');
  const coins = f.coins;
  const [x, y] = START_PLOTS[0];
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat', pay: 'coin' }, T0).ok);
  assert.equal(seeds(f, 'wheat'), 5);
  assert.equal(f.coins, coins - CROPS.wheat.cost);
});

test('setí ze zásob: nestojí mince, bez osiva nejde', () => {
  const f = farm(); giveSeeds(f, 'wheat', 1);
  const coins = f.coins;
  const [a, b] = START_PLOTS;
  const r = applyAction(f, { type: 'plant', x: a[0], y: a[1], crop: 'wheat', pay: 'seed' }, T0);
  assert.ok(r.ok && r.seed);
  assert.equal(seeds(f, 'wheat'), 0);
  assert.equal(f.coins, coins);
  const r2 = applyAction(f, { type: 'plant', x: b[0], y: b[1], crop: 'wheat', pay: 'seed' }, T0);
  assert.equal(r2.error, 'no_seeds');
  assert.ok(ERRORS.no_seeds);
  assert.equal(f.plots.find(p => p.x === b[0] && p.y === b[1]).crop, null);
  // bez volby jako dřív: nejdřív osivo, pak mince
  f.seeds.s_wheat = 1;
  assert.ok(applyAction(f, { type: 'plant', x: b[0], y: b[1], crop: 'wheat' }, T0).ok);
  assert.equal(seeds(f, 'wheat'), 0);
  assert.equal(f.coins, coins);
});

test('traktor na malá pole a velké pole: „jen za mince“ nechá osivo týmu', () => {
  const f = farm(); giveSeeds(f, 'wheat', 10);
  f.coins = 1e5;
  f.objects.find(o => o.kind === 'statek').lvl = 4;
  f.objects.push({ id: f.nextId++, kind: 'stodola', x: 0, y: 15, lvl: 4 });
  f.sk = { f: 1e7, r: 0, v: 0 };
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  const r = applyAction(f, { type: 'sowAll', crop: 'wheat', pay: 'coin' }, T0);
  assert.ok(r.ok && r.count === START_PLOTS.length);
  assert.equal(seeds(f, 'wheat'), 10);
  // velké pole jen za mince
  const o = { id: f.nextId++, kind: 'velkepole', x: 2, y: 10, w: 3, h: 3, lvl: 1, crop: null, job: null, readyAt: 0, load: null, soil: 'raw', straw: false };
  f.objects.push(o);
  const tr = f.machines.find(m => m.model === 'brazda60');
  const c0 = f.coins;
  assert.ok(applyAction(f, { type: 'fieldSow', id: o.id, crop: 'wheat', machine: tr.id, pay: 'coin' }, T0).ok);
  assert.equal(seeds(f, 'wheat'), 10);
  assert.equal(f.coins, c0 - 9 * CROPS.wheat.cost);
  const g = farm(); giveSeeds(g, 'wheat', 10); g.coins = 1e5; g.sk = { f: 1e7, r: 0, v: 0 };
  g.objects.find(o => o.kind === 'statek').lvl = 4;
  g.objects.push({ id: g.nextId++, kind: 'stodola', x: 0, y: 15, lvl: 4 });
  assert.ok(applyAction(g, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.ok(applyAction(g, { type: 'sowAll', crop: 'wheat' }, T0).ok);
  assert.equal(seeds(g, 'wheat'), 10 - START_PLOTS.length, 'výchozí: nejdřív osivo');
});
