// v41: hra všude chce jen to, co hráč může teď získat (odemčené Statkem a dovednostmi, ze surovin, které jsou k dispozici):
// zakázky, Stánek, dárky, pohoštění na nástěnce, odpovědi v událostech; týdenní soutěž jen v úkolech pro všechny.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, normalize, applyAction, availableItems, orderableItems, farmAvail, stallOffers, adOffers, answerShown, EVENTS_BY,
  RECIPES, FISH, SKILL_XP, weekTask, WEEK_V41, WEEK_TASKS_ALL, LEVEL_XP, START_PLOTS, ITEMS,
} from '../public/js/rules.js';

const T0 = 1_700_000_000_000;
function farm(st = 1, cook = 1, fish = 1) {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.objects.find(o => o.kind === 'statek').lvl = st;
  f.sk = { f: 0, r: SKILL_XP[fish], v: SKILL_XP[cook] };
  f.level = 20; f.xp = LEVEL_XP[20]; f.coins = 1e6;
  return f;
}

test('dostupné věci: Statek, Vaření, Rybaření a suroviny (i výrobky z výrobků)', () => {
  const a = availableItems(1, 1, 1);
  assert.ok(a.has('wheat') && a.has('chleb'));
  assert.ok(!a.has('vejce') && !a.has('krmivo_kravy') && !a.has('plotice'));
  assert.ok(availableItems(4).has('krmivo_kravy') && !availableItems(3).has('krmivo_kravy'), 'krmivo pro krávy až s Kravínem');
  // uzený pstruh: Rybárna je odemčená, ale pstruh bere až od Rybaření 7
  assert.ok(RECIPES.uzeny_pstruh.in.pstruh);
  assert.ok(!availableItems(10, 99, FISH.pstruh.fishLv - 1).has('uzeny_pstruh'));
  assert.ok(availableItems(10, 99, FISH.pstruh.fishLv).has('uzeny_pstruh'));
  // výrobek s vyšším receptem až s Vařením
  const hard = Object.values(RECIPES).find(r => r.cook > 1 && r.st <= 3);
  assert.ok(!availableItems(3, hard.cook - 1, 99).has(hard.id) && availableItems(3, hard.cook, 99).has(hard.id));
  // med z pláství až se Včelínem
  assert.ok(availableItems(10).has('med') && !availableItems(4).has('plast'));
  // nic, co vyžaduje nedostupnou surovinu
  for (const st of [1, 3, 5, 8, 10]) for (const ck of [1, 5, 50]) for (const fi of [1, 7, 50]) {
    const ok = availableItems(st, ck, fi);
    for (const id of ok) { const r = RECIPES[id]; if (r) for (const x of Object.keys(r.in)) assert.ok(ok.has(x), `${id} potřebuje ${x}`); }
  }
});

test('zakázky chtějí jen dostupné zboží, staré nedostupné zakázky se vymění', () => {
  for (const [st, ck, fi] of [[1, 1, 1], [2, 1, 1], [3, 2, 1], [5, 3, 2], [7, 10, 5], [10, 50, 50]]) {
    const f = farm(st, ck, fi), ok = farmAvail(f);
    for (let i = 0; i < 30; i++) {
      f.orders = []; normalize(f);
      for (const o of f.orders) for (const x of o.items) assert.ok(ok.has(x.item), `Statek ${st}, vaření ${ck}, rybaření ${fi}: ${x.item}`);
    }
  }
  const f = farm(2);
  f.orders[0] = { items: [{ item: 'syr', qty: 2 }, { item: 'wheat', qty: 1 }], coins: 99, xp: 5, readyAt: 0 };
  f.orders[1] = { items: [{ item: 'chleb', qty: 2 }], coins: 30, xp: 3, readyAt: 0 };
  normalize(f);
  assert.ok(!f.orders[0].items.some(x => x.item === 'syr'), 'zakázka na sýr na Statku 2 je pryč');
  assert.deepEqual(f.orders[1].items, [{ item: 'chleb', qty: 2 }], 'dobrá zakázka zůstane');
  assert.equal(f.orders.length, 6);
});

test('Stánek a dárky jen z dostupného', () => {
  for (const st of [1, 2, 4, 6, 9]) {
    const f = farm(st, 1, 1), ok = farmAvail(f);
    for (let k = 0; k < 20; k++) {
      const o = stallOffers(f, T0 + k * 2 * 3600000);
      for (const x of [...o.buy, ...o.sell]) assert.ok(ok.has(x.item), `Statek ${st}: ${x.item}`);
    }
  }
  assert.ok(orderableItems(10, 1, 1).every(id => availableItems(10, 1, 1).has(id)));
});

test('pohoštění na nástěnce: jen dostupné věci, dvě různé možnosti, inzerát jde vyvěsit', () => {
  for (const [size, st] of [[0, 1], [3, 1], [6, 2], [10, 3], [20, 4], [20, 6]]) {
    const f = farm(st, 1, 1), ok = farmAvail(f);
    f.vill = Array.from({ length: size }, (_, i) => ({ id: 9000 + i }));
    const offers = adOffers(f);
    assert.equal(offers.length, 2);
    for (const opt of offers) for (const [id, n] of opt) { assert.ok(ok.has(id), `tým ${size}, Statek ${st}: ${id}`); assert.ok(n >= 1 && n <= 40); }
    assert.notDeepEqual(offers[0], offers[1], 'možnosti se liší');
  }
  // původní pohoštění zůstane, když je dostupné
  const g = farm(10, 50, 50); g.vill = Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i }));
  assert.deepEqual(adOffers(g), [[['syr', 2]], [['marmelada', 2]]]);
  // inzerát s náhradním pohoštěním
  const h = farm(1);
  h.objects.push({ id: h.nextId++, kind: 'chatrc', x: 0, y: 0, lvl: 1 }, { id: h.nextId++, kind: 'chatrc', x: 2, y: 0, lvl: 1 });
  h.vill = [];
  for (const v of [9001, 9002]) h.vill.push({ id: v, prof: 'pole', lvl: 1, xp: 0, trait: 'pecliv', job: null });
  const [o1, o2] = adOffers(h);   // tým 2–4: chléb nebo vejce → vejce na Statku 1 ještě nejsou
  assert.deepEqual(o1, [['chleb', 3]]);
  assert.ok(o2[0][0] !== 'vejce' && o2[0][0] !== 'chleb');
  for (const [id, n] of o2) h.silo[id] = n;
  const r = applyAction(h, { type: 'postAd', prof: 'pole', opt: 1 }, T0);
  assert.ok(r.ok, r.error);
  for (const [id] of o2) assert.equal(h.silo[id] || 0, 0, 'pohoštění se spotřebovalo');
});

test('události: odpověď, která chce nedostupnou věc (návnadu bez Krmivárny), se neukáže', () => {
  const e = EVENTS_BY.liska, trap = e.a.find(a => a.use && a.use.item === 'navnada');
  assert.ok(trap);
  assert.equal(answerShown(farm(1), e, trap), false);
  assert.equal(answerShown(farm(10), e, trap), true);
  assert.ok(e.a.filter(a => answerShown(farm(1), e, a)).length >= 2);
  // každá událost má na Statku 1 aspoň dvě odpovědi
  for (const ev of Object.values(EVENTS_BY)) assert.ok(ev.a.filter(a => answerShown(farm(1), ev, a)).length >= 2, ev.id);
});

test('týdenní soutěž: od 16. 11. 2026 jen úkoly, které zvládne každý od začátku', () => {
  assert.equal(weekTask(WEEK_V41 - 1).k, 'sold', 'rozjetý týden se nemění');
  const ks = new Set();
  for (let w = WEEK_V41; w < WEEK_V41 + 12; w++) ks.add(weekTask(w).k);
  assert.deepEqual([...ks].sort(), ['harvest', 'orders', 'plant', 'sold']);
  for (const t of WEEK_TASKS_ALL) assert.ok(t.name && t.icon && t.unit && ITEMS.wheat);
  // setí se počítá do soutěže
  const f = farm(1); f.wk = { w: WEEK_V41 + 3, k: 'plant', b: f.stats.plant || 0, s: 0 };
  assert.equal(weekTask(WEEK_V41 + 3).k, 'plant');
  const [x, y] = START_PLOTS[0];
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0).ok);
  assert.equal(f.wk.s, 1);
});
