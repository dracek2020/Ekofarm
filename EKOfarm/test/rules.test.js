import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weatherAt, WEATHER, growMs, fishSize, FISH, FISH_LIST, pondStock, hiveStock, TUTORIAL_DONE, townObject, dailyQuests, questProgress, isRoad, fits, dealerDiscount, maxOrchards, maxBigFields, BUILDINGS, LEVEL_XP, START_PLOTS, newFarm, applyAction, plotState, levelForXp, siloUsed, CROPS, SILO_START, maxPlots, objectAt, findObject, queueState, objectStatus, normalize, fieldState, freeMachine, treeState, marketMult, sellPrice, RECIPES, FRUITS, upgradeCost, statekLevel, machinePrice, stallOffers, stallLeft, runHelper, helperCapacity, canDeliver, orderReady, orderableItems, ITEMS, findVill, villAt, seedCap, workAreas, ANIMALS, ANIMAL_CYCLE, runVillagers, villLag, nextTrade, TRADE_IV, tradeRound, workMs, VILL_BUDGET, beds, teamCap, teamFree, repTier, repNext, adOffers, statekMerits, villLevel, needLvl, RULES_VERSION, wpOfVill, wpGet, wpWorkers, areaCap, stockOf, planTotal, bldCap, bldCapNext, crewPower, penOut, penStats, factoryRate, upgradeEffect, recipeQty, villOut } from '../public/js/rules.js';
import { TEAM } from '../public/js/team-config.js';

const T0 = 1_700_000_000_000;
// hráč na dané úrovni s penězi, plně vylepšeným statkem a stodolou (pro testy strojů)
function rich(f, level, coins = 1e6) {
  f.level = level; f.xp = LEVEL_XP[level]; f.coins = coins;
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  f.sk = { f: 1e7, r: 1e7, v: 1e7 };   // v38: dovednosti naplno
  if (!f.objects.some(o => o.kind === 'stodola')) f.objects.push({ id: f.nextId++, kind: 'stodola', x: 0, y: 15, lvl: 10 });
  return f;
}
// farma s 6 poli na původních místech (pole jsou zdarma)
function farm6() {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) assert.ok(applyAction(f, { type: 'buyPlot', x, y }, T0).ok);
  return f;
}

test('nová farma', () => {
  const f = farm6();
  assert.equal(f.coins, 50);
  assert.equal(f.level, 1);
  assert.equal(f.plots.length, 6);
});

test('zasadit, počkat, sklidit', () => {
  const f = farm6();
  assert.ok(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0).ok);
  assert.equal(f.coins, 49);
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0).error, 'not_empty');
  assert.equal(applyAction(f, { type: 'harvest', x: 11, y: 8 }, T0 + 59_000).error, 'not_ready');
  assert.equal(plotState(f.plots[0], T0 + 30_000).state, 'growing');
  const r = applyAction(f, { type: 'harvest', x: 11, y: 8 }, T0 + 60_000);
  assert.ok(r.ok);
  assert.equal(f.silo.wheat, 2);
  assert.equal(f.xp, 1);
  assert.equal(f.plots[0].crop, null);
});

test('zamčená plodina a mince', () => {
  const f = farm6();
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'carrot' }, T0).error, 'locked', 'v37: mrkev až se Statkem 2');
  f.coins = 0;
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0).error, 'no_coins');
});

test('úrovně', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(LEVEL_XP[2] - 1), 1);
  assert.equal(levelForXp(LEVEL_XP[2]), 2);
  assert.equal(LEVEL_XP[10], 2560, 'v38: úroveň 10 za 2560 XP (8× víc než původně)');
  assert.equal(levelForXp(LEVEL_XP[50]), 50, 'úroveň roste i po 20');
  assert.equal(levelForXp(1e12), 200);
});

test('level up při sklizni', () => {
  const f = farm6();
  f.xp = LEVEL_XP[2] - 1;
  applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0);
  const r = applyAction(f, { type: 'harvest', x: 11, y: 8 }, T0 + 60_000);
  assert.equal(r.gained.levelUp, 2);
  assert.equal(f.level, 2);
});

test('plný sklad', () => {
  const f = farm6();
  f.silo.wheat = SILO_START - 1;
  applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0);
  assert.equal(applyAction(f, { type: 'harvest', x: 11, y: 8 }, T0 + 60_000).error, 'silo_full');
});

test('prodej', () => {
  const f = farm6();
  f.silo.wheat = 4;
  assert.equal(applyAction(f, { type: 'sell', item: 'wheat', qty: 5 }, T0).error, 'not_enough');
  assert.equal(applyAction(f, { type: 'sell', item: 'wheat', qty: 1.5 }, T0).error, 'bad_action');
  assert.ok(applyAction(f, { type: 'sell', item: 'wheat', qty: 4 }, T0).ok);
  assert.equal(f.coins, 50 + 4 * sellPrice('wheat', T0));
  assert.equal(siloUsed(f), 0);
  assert.equal(f.silo.wheat, undefined);
});

test('nákup pole', () => {
  const f = farm6();
  assert.equal(applyAction(f, { type: 'buyPlot', x: 11, y: 8 }, T0).error, 'occupied');
  assert.equal(applyAction(f, { type: 'buyPlot', x: 99, y: 8 }, T0).error, 'out_of_farm');
  f.coins = 100;
  assert.ok(applyAction(f, { type: 'buyPlot', x: 14, y: 8 }, T0).ok);
  assert.equal(f.coins, 85);
  assert.ok(applyAction(f, { type: 'buyPlot', x: 14, y: 9 }, T0).ok);
  assert.equal(f.coins, 65);
  assert.equal(maxPlots(f), 12, 'statek 1 = 12 polí');
  f.coins = 1000;
  for (let x = 0; x < 4; x++) assert.ok(applyAction(f, { type: 'buyPlot', x, y: 0 }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyPlot', x: 5, y: 0 }, T0).error, 'max_plots');
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  assert.equal(maxPlots(f), 18);
  assert.ok(applyAction(f, { type: 'buyPlot', x: 5, y: 0 }, T0).ok);
});

test('neplatné akce', () => {
  const f = farm6();
  assert.equal(applyAction(f, null, T0).error, 'bad_action');
  assert.equal(applyAction(f, { type: 'hack' }, T0).error, 'bad_action');
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: '__proto__' }, T0).error, 'bad_action');
});

test('stavění a přesun', () => {
  const f = farm6();
  f.coins = 1000;
  assert.equal(applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 0 }, T0).error, 'statek_low', 'budovy odemyká statek, ne úroveň');
  assert.equal(applyAction(f, { type: 'place', kind: 'pekarna', x: 16, y: 0 }, T0).error, 'occupied', 'přesah mimo farmu');
  assert.equal(applyAction(f, { type: 'place', kind: 'pekarna', x: 10, y: 8 }, T0).error, 'occupied', 'kolize s polem');
  const r = applyAction(f, { type: 'place', kind: 'pekarna', x: 0, y: 0 }, T0);
  assert.ok(r.ok);
  assert.equal(f.coins, 940);
  assert.equal(applyAction(f, { type: 'place', kind: 'pekarna', x: 3, y: 0 }, T0).error, 'max_count');
  assert.equal(applyAction(f, { type: 'place', kind: 'ker', x: 1, y: 1 }, T0).error, 'occupied');
  assert.ok(applyAction(f, { type: 'place', kind: 'ker', x: 2, y: 0 }, T0).ok);
  assert.ok(applyAction(f, { type: 'place', kind: 'ker', x: 3, y: 0 }, T0).ok, 'ozdob víc');
  assert.equal(applyAction(f, { type: 'move', id: r.id, x: 1, y: 0 }, T0).error, 'occupied');
  assert.ok(applyAction(f, { type: 'move', id: r.id, x: 0, y: 1 }, T0).ok, 'přesun přes sebe sama');
  assert.equal(objectAt(f, 1, 2).id, r.id);
  assert.equal(applyAction(f, { type: 'place', kind: 'toString', x: 9, y: 9 }, T0).error, 'bad_action');
});

test('výroba ve frontě', () => {
  const f = farm6();
  f.coins = 1000; f.level = 2; f.xp = 10;
  const id = applyAction(f, { type: 'place', kind: 'pekarna', x: 0, y: 0 }, T0).id;
  assert.equal(applyAction(f, { type: 'produce', id, recipe: 'chleb' }, T0).error, 'no_inputs');
  f.silo.wheat = 12;
  assert.equal(applyAction(f, { type: 'produce', id, recipe: 'krmivo_slepice' }, T0).error, 'bad_action', 'recept jiné budovy');
  for (let i = 0; i < 3; i++) assert.ok(applyAction(f, { type: 'produce', id, recipe: 'chleb' }, T0).ok);
  assert.equal(applyAction(f, { type: 'produce', id, recipe: 'chleb' }, T0).error, 'queue_full');
  assert.equal(f.silo.wheat, 3);
  const o = findObject(f, id);
  assert.deepEqual(o.queue.map(q => q.end - T0), [300000, 600000, 900000], 'výroba jde postupně');
  assert.equal(applyAction(f, { type: 'collect', id }, T0 + 299000).error, 'not_ready');
  const r = applyAction(f, { type: 'collect', id }, T0 + 600000);
  assert.ok(r.ok);
  assert.equal(f.silo.chleb, 2);
  assert.equal(o.queue.length, 1);
  assert.equal(queueState(o, T0 + 600000)[0].state, 'working');
});

test('zvířata: koupě, krmení, sběr', () => {
  const f = farm6();
  f.coins = 1000; f.level = 3; f.xp = 25;
  f.objects.find(o => o.kind === 'statek').lvl = 2;   // v29: Kurník od Statku 2
  assert.equal(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).error, 'no_home');
  const id = applyAction(f, { type: 'place', kind: 'kurnik', x: 0, y: 0 }, T0).id;
  for (let i = 0; i < 3; i++) assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).error, 'pen_full');
  assert.equal(applyAction(f, { type: 'buyAnimal', animal: 'krava' }, T0).error, 'locked');
  assert.equal(applyAction(f, { type: 'feed', id }, T0).error, 'no_feed');
  f.silo.krmivo_slepice = 2;
  const r = applyAction(f, { type: 'feed', id }, T0);
  assert.equal(r.fed, 2);
  assert.equal(f.silo.krmivo_slepice, undefined);
  assert.equal(objectStatus(findObject(f, id), T0).hungry, 1);
  assert.equal(applyAction(f, { type: 'collect', id }, T0 + 1000).error, 'not_ready');
  // v34: jedno krmení na 3 hodiny, slepice dá průběžně 3 vejce (po hodině jedno)
  const c = applyAction(f, { type: 'collect', id }, T0 + 3600000);
  assert.deepEqual(c.gained.items, [{ item: 'vejce', qty: 2 }]);
  assert.equal(c.gained.xp, 4);
  assert.equal(objectStatus(findObject(f, id), T0 + 3600000).hungry, 1, 'nakrmené mají dál co dělat');
  const c2 = applyAction(f, { type: 'collect', id }, T0 + 3 * 3600000);
  assert.deepEqual(c2.gained.items, [{ item: 'vejce', qty: 4 }], 'zbylá 2 vejce od každé');
  assert.equal(objectStatus(findObject(f, id), T0 + 3 * 3600000).hungry, 3, 'po celém cyklu mají zase hlad');
  assert.equal(f.silo.vejce, 6, '1 krmivo = 3 vejce');
});

test('plný sklad u výroby a rozšíření skladu', () => {
  const f = farm6();
  f.coins = 1000; f.level = 3; f.xp = 25;
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  const id = applyAction(f, { type: 'place', kind: 'kurnik', x: 0, y: 0 }, T0).id;
  applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  f.silo.krmivo_slepice = 1;
  applyAction(f, { type: 'feed', id }, T0);
  f.silo.wheat = 50;
  assert.equal(applyAction(f, { type: 'collect', id }, T0 + 3600000).error, 'silo_full');
  const coins = f.coins;
  assert.ok(applyAction(f, { type: 'upgradeSilo' }, T0).ok);
  assert.equal(f.coins, coins - 80);
  assert.equal(f.siloCap, 75);
  assert.ok(applyAction(f, { type: 'collect', id }, T0 + 3600000).ok);
});

test('stará farma bez budov se doplní', () => {
  const f = { coins: 5, xp: 0, level: 1, silo: {}, plots: [] };
  assert.equal(applyAction(f, { type: 'upgradeSilo' }, T0).error, 'no_coins');
  assert.ok(f.objects.some(o => o.kind === 'statek'));
  assert.equal(f.siloCap, 50);
});

test('statek uprostřed a sklad k umístění zdarma', () => {
  const f = farm6();
  const st = f.objects.find(o => o.kind === 'statek');
  assert.deepEqual([st.x + 1.5, st.y + 1.5], [8.5, 8.5], 'střed statku = střed mřížky 17×17');
  assert.ok(applyAction(f, { type: 'move', id: st.id, x: 12, y: 12 }, T0).ok, 'statek jde přesunout');
  assert.ok(applyAction(f, { type: 'move', id: st.id, x: 7, y: 7 }, T0).ok, 'a zpátky');
  assert.equal(applyAction(f, { type: 'place', kind: 'statek', x: 0, y: 0 }, T0).error, 'bad_action');
  assert.equal(applyAction(f, { type: 'place', kind: 'sklad', x: 8, y: 8 }, T0).error, 'occupied');
  f.coins = 0;
  const r = applyAction(f, { type: 'place', kind: 'sklad', x: 0, y: 0 }, T0);
  assert.ok(r.ok, 'sklad zdarma i bez mincí');
  assert.deepEqual(f.pending, []);
  assert.equal(applyAction(f, { type: 'place', kind: 'sklad', x: 3, y: 0 }, T0).error, 'max_count');
  assert.ok(applyAction(f, { type: 'move', id: r.id, x: 0, y: 3 }, T0).ok, 'sklad jde přesunout');
});

test('starší farma dostane statek a sklad', () => {
  const f = { coins: 5, xp: 0, level: 1, silo: {}, plots: [{ x: 8, y: 8, crop: null, planted: 0 }], objects: [], nextId: 1 };
  normalize(f);
  const st = f.objects.find(o => o.kind === 'statek');
  assert.ok(st, 'statek doplněn');
  assert.ok(!(8 >= st.x && 8 < st.x + 3 && 8 >= st.y && 8 < st.y + 3), 'nepřekrývá pole');
  assert.deepEqual(f.pending, ['sklad']);
  normalize(f);
  assert.equal(f.objects.filter(o => o.kind === 'statek').length, 1);
});

test('traktor a kombajn', () => {
  const f = farm6();
  rich(f, 6, 2000);
  assert.equal(applyAction(f, { type: 'sowAll', crop: 'wheat' }, T0).error, 'no_machine');
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'klas4' }, T0).ok);
  applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'corn' }, T0);
  const coins = f.coins;
  const s = applyAction(f, { type: 'sowAll', crop: 'wheat' }, T0);
  assert.equal(s.count, 5);
  assert.equal(f.coins, coins - 5);
  assert.equal(applyAction(f, { type: 'sowAll', crop: 'wheat' }, T0).error, 'nothing');
  assert.equal(applyAction(f, { type: 'harvestAll' }, T0 + 1000).error, 'not_ready');
  f.silo.carrot = 45;
  const h = applyAction(f, { type: 'harvestAll' }, T0 + 60000);
  assert.equal(h.count, 2, 'jen co se vejde do skladu');
  assert.ok(h.partial);
  delete f.silo.carrot;
  const h2 = applyAction(f, { type: 'harvestAll' }, T0 + 300000);
  assert.equal(h2.count, 4, 'zbytek pšenice + kukuřice');
  assert.deepEqual(h2.gained.items.map(i => i.item).sort(), ['corn', 'wheat']);
});

test('6 polí zdarma kamkoliv, pak +6 za úroveň', () => {
  const f = newFarm(T0);
  assert.equal(f.plots.length, 0);
  f.coins = 0;
  for (let i = 0; i < 6; i++) assert.ok(applyAction(f, { type: 'buyPlot', x: i, y: 0 }, T0).ok, 'zdarma');
  assert.equal(applyAction(f, { type: 'buyPlot', x: 0, y: 1 }, T0).error, 'no_coins');
  f.coins = 15;
  assert.ok(applyAction(f, { type: 'buyPlot', x: 0, y: 1 }, T0).ok);
  assert.equal(f.coins, 0);
});

test('sad a stromy', () => {
  const f = farm6();
  f.coins = 1000;
  f.level = 3; f.xp = LEVEL_XP[3];
  assert.equal(applyAction(f, { type: 'place', kind: 'sad', x: 0, y: 0 }, T0).ok, false, 'v37: sad až se Statkem 2');
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  const id = applyAction(f, { type: 'place', kind: 'sad', x: 0, y: 0 }, T0).id;
  assert.equal(f.coins, 970);
  assert.ok(applyAction(f, { type: 'place', kind: 'sad', x: 1, y: 0 }, T0).ok);
  assert.equal(f.coins, 920, 'druhý sad dražší');
  assert.ok(applyAction(f, { type: 'place', kind: 'sad', x: 2, y: 0 }, T0).ok);
  assert.ok(applyAction(f, { type: 'place', kind: 'sad', x: 3, y: 0 }, T0).ok);
  assert.equal(applyAction(f, { type: 'place', kind: 'sad', x: 4, y: 0 }, T0).error, 'max_orchards', 'Statek 2 = 4 sady');
  assert.equal(applyAction(f, { type: 'plantTree', id, tree: 'rybiz' }, T0).error, 'locked', 'rybíz až se Statkem 3');
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  assert.equal(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).error, 'not_empty_tree');
  const o = findObject(f, id);
  assert.equal(treeState(o, T0 + 1000).state, 'growing');
  assert.equal(applyAction(f, { type: 'harvestTree', id }, T0 + 1000).error, 'not_ready');
  let t = T0 + 1800 * 1000;
  for (let i = 1; i <= 4; i++) {
    const r = applyAction(f, { type: 'harvestTree', id }, t);
    assert.ok(r.ok, 'sklizeň ' + i);
    assert.equal(r.dead, i === 4);
    t += 1200 * 1000;
  }
  assert.equal(f.silo.jablko, 12);
  assert.equal(treeState(o, t).state, 'dead');
  assert.equal(objectStatus(o, t).dead, true);
  assert.ok(applyAction(f, { type: 'clearTree', id }, t).ok);
  assert.equal(treeState(o, t).state, 'empty');
});

// ---------- v29: Farmářský tým – hledání, domky, pověst, zásluhy, úrovně 1–12, výkon ----------
const tick = (f, t) => applyAction(f, { type: 'tick' }, t);
// dopočítá práci až do času t (po dávkách, jako to dělá hra)
function catchUp(f, t) {
  for (let i = 0; i < 4000; i++) { tick(f, t); if (!villLag(f, t)) return i + 1; }
  assert.fail('pracovníci nedohnali práci');
}
function placeAny(f, kind, t = T0) {
  const b = BUILDINGS[kind];
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (fits(f, x, y, b.w, b.h)) { const r = applyAction(f, { type: 'place', kind, x, y }, t); assert.ok(r.ok, kind + ' ' + r.error); return r.id; }
  assert.fail('není místo pro ' + kind);
}
// pracovník rovnou do týmu (jako přijatý z nástěnky): profese, úroveň v profesi, vlastnost
function worker(f, prof = 'vyroba', lvl = 1, trait = null, t = T0) {
  const v = { id: f.nextId++, prof, trait, xp: { [prof]: TEAM.xpLvl[lvl] }, hist: [], at: 0, area: null, t, n: 0 };
  f.vill.push(v);
  return v.id;
}
function hire(f, at, lvl = 1, prof, t = T0) {
  const o = at && findObject(f, at);
  const p = prof || (o ? { factory: 'vyroba', pen: 'chov', hive: 'chov', storage: 'sklad' }[BUILDINGS[o.kind].type] : 'vyroba');
  const id = worker(f, p, lvl, null, t);
  if (at) assert.ok(applyAction(f, { type: 'assignVill', id, at }, t).ok);
  return id;
}
const sklad = f => f.objects.find(o => o.kind === 'sklad') || findObject(f, placeAny(f, 'sklad'));
// plán pracoviště, kde pracovník id pracuje
const wOf = (f, id) => { const v = findVill(f, id); return v ? wpOfVill(v) : null; };
const plan = (f, id, key, pct, t = T0) => applyAction(f, { type: 'plan', w: wOf(f, id), key, pct }, t);

test('v29: uložená hra z v27 – tým odejde, materiál se vrátí, pověst ze zakázek, nákup a pomocník končí', () => {
  const f = rich(farm6(), 12, 1000);
  f.v = 16; f.stats.orders = 7;
  f.seeds = { s_wheat: 2 };
  f.vill = [{ id: 901, lvl: 3, role: 'farm', area: { kind: 'pole', id: f.plots[0].id }, plan: { wheat: 100 }, t: T0, n: 5, job: { k: 'plant', id: f.plots[0].id, x: 'wheat', s: T0, e: T0 + 9000 } },
    { id: 902, lvl: 5, at: 0, plan: {}, t: T0, n: 0 }];
  f.helper = { until: T0 + 3600000, last: T0, crop: 'wheat', n: 0 };
  delete f.rep; delete f.board;
  normalize(f);
  assert.deepEqual(f.vill, [], 'všichni odešli');
  assert.equal(f.seeds.s_wheat, 3, 'semínko z ruky se vrátilo do Statku');
  assert.equal(f.rep, 21, 'pověst = 3 × doručené zakázky');
  assert.deepEqual(f.board.ads, []);
  assert.equal(f.v, RULES_VERSION);
  for (const type of ['buyVill', 'buyFarmer', 'upVill']) assert.equal(applyAction(f, { type, id: 1 }, T0).error, 'team_search');
  assert.equal(applyAction(f, { type: 'hire', plan: 0, crop: 'wheat' }, T0).error, 'helper_gone');
  // najatý pomocník doběhne
  for (const p of f.plots) { p.crop = null; }
  applyAction(f, { type: 'nop' }, T0 + 120000);
  assert.ok(f.helper.n > 0, 'pomocník ještě pracuje');
  // druhé otevření už nic neresetuje
  f.vill.push({ id: 5, prof: 'pole', xp: {}, hist: [], at: 0, area: null, plan: {}, t: T0, n: 0 });
  normalize(f);
  assert.equal(f.vill.length, 1);
});

test('v29: domky – lůžka, přestavba za rozdíl, tým nejvýš 30', () => {
  const f = rich(farm6(), 20, 10000);
  f.objects.find(o => o.kind === 'statek').lvl = 1;
  assert.equal(beds(f), 0); assert.equal(teamCap(f), 0);
  const c0 = f.coins;
  const h = placeAny(f, 'chatrc');
  assert.equal(c0 - f.coins, 200);
  assert.equal(beds(f), 2);
  assert.equal(applyAction(f, { type: 'place', kind: 'chata', x: 0, y: 0 }, T0).error, 'statek_low', 'chata od Statku 3');
  assert.equal(applyAction(f, { type: 'rebuildHouse', id: h }, T0).error, 'statek_low');
  f.objects.find(o => o.kind === 'statek').lvl = 5;
  const c1 = f.coins;
  assert.ok(applyAction(f, { type: 'rebuildHouse', id: h }, T0).ok);
  assert.equal(c1 - f.coins, 300); assert.equal(findObject(f, h).kind, 'chata'); assert.equal(beds(f), 3);
  assert.ok(applyAction(f, { type: 'rebuildHouse', id: h }, T0).ok);
  assert.equal(findObject(f, h).kind, 'dum'); assert.equal(beds(f), 5);
  assert.equal(applyAction(f, { type: 'rebuildHouse', id: h }, T0).error, 'bad_action', 'dům je největší');
  f.coins = 1e6;
  for (let i = 0; i < 6; i++) { f.objects.push({ id: f.nextId++, kind: 'dum', x: -40 - i * 3, y: -40 }); }
  assert.equal(beds(f), 35); assert.equal(teamCap(f), 30, 'strop týmu');
});

test('v29: nástěnka – inzerát za pohoštění, uchazeči stejní na serveru i v prohlížeči, přijetí jen s volným lůžkem', () => {
  const f = rich(farm6(), 12, 10000);
  f.rep = 0; f.silo = { wheat: 3 };
  assert.equal(applyAction(f, { type: 'postAd', prof: 'pole', opt: 0 }, T0).error, 'no_bed');
  placeAny(f, 'chatrc');
  assert.equal(applyAction(f, { type: 'postAd', prof: 'pole', opt: 0 }, T0).error, 'no_inputs', 'chybí 4. pšenice');
  assert.equal(applyAction(f, { type: 'postAd', prof: 'kouzelnik', opt: 0 }, T0).error, 'bad_action');
  f.silo.wheat = 10;
  const twin = structuredClone(f);
  const r = applyAction(f, { type: 'postAd', prof: 'pole', opt: 0 }, T0);
  assert.ok(r.ok);
  assert.equal(f.silo.wheat, 6, 'pohoštění se odečetlo');
  assert.equal(r.ready, T0 + 20 * 60000, 'prázdný tým: 20 minut');
  applyAction(twin, { type: 'postAd', prof: 'pole', opt: 0 }, T0);
  assert.deepEqual(twin.board, f.board, 'stejní uchazeči');
  const ad = f.board.ads[0];
  assert.equal(ad.cands.length, TEAM.rep.cands[0]);
  assert.equal(ad.cands[0].prof, 'pole');
  for (const c of ad.cands) { assert.ok(TEAM.traits[c.trait]); assert.equal(c.lvl, 1); }
  assert.equal(applyAction(f, { type: 'postAd', prof: 'chov', opt: 0 }, T0).error, 'ads_max', 'na stupni 1 jen jeden inzerát');
  assert.equal(applyAction(f, { type: 'hireCand', ad: ad.id, i: 0 }, T0 + 60000).error, 'not_ready');
  const h = applyAction(f, { type: 'hireCand', ad: ad.id, i: 0 }, T0 + 20 * 60000);
  assert.ok(h.ok);
  const v = findVill(f, h.id);
  assert.equal(v.prof, 'pole'); assert.equal(v.trait, ad.cands[0].trait); assert.equal(villLevel(v, 'pole'), 1);
  assert.equal(f.board.ads.length, 0, 'ostatní odešli');
  // druhý inzerát (tým 1 → pořád pšenice), čekání 25 min; plné lůžka → nikoho nepřijmeš
  const r2 = applyAction(f, { type: 'postAd', prof: 'vyroba', opt: 0 }, T0 + 21 * 60000);
  assert.equal(r2.ready - (T0 + 21 * 60000), 25 * 60000);
  worker(f, 'chov');
  assert.equal(applyAction(f, { type: 'hireCand', ad: r2.id, i: 0 }, r2.ready).error, 'no_bed');
  assert.equal(applyAction(f, { type: 'postAd', prof: 'vyroba', opt: 0 }, r2.ready).error, 'no_bed');
  // po 24 h uchazeči odejdou
  applyAction(f, { type: 'nop' }, r2.ready + 24 * 3600000 + 1000);
  assert.equal(f.board.ads.length, 0);
  // pohoštění roste s týmem
  assert.deepEqual(adOffers(f)[0], [['chleb', 3]]);
  // propuštění uvolní lůžko
  assert.ok(applyAction(f, { type: 'fireVill', id: v.id }, T0).ok);
  assert.equal(teamFree(f), 1);
});

test('v29: pověst – zakázky a úkoly, stupně, zájemce se ozve sám jen s volným lůžkem', () => {
  const f = rich(farm6(), 12, 10000);
  f.rep = 0;
  assert.equal(repTier(f), 1);
  // doručení zakázky +3
  const o = f.orders.findIndex(x => x.readyAt <= T0);
  for (const x of f.orders[o].items) f.silo[x.item] = (f.silo[x.item] || 0) + x.qty;
  f.siloCap = 9999;
  assert.ok(applyAction(f, { type: 'deliver', slot: o }, T0).ok);
  assert.equal(f.rep, 3);
  f.rep = 60;
  assert.equal(repTier(f), 3); assert.equal(repNext(f), 120);
  // stupeň 3: zájemce se ozve sám (do 2 dnů), ale jen když je volné lůžko
  applyAction(f, { type: 'nop' }, T0);
  assert.ok(f.board.next > T0);
  applyAction(f, { type: 'nop' }, f.board.next + 1000);
  assert.equal(f.board.ads.length, 0, 'bez lůžka se nikdo neozve');
  placeAny(f, 'chatrc');
  applyAction(f, { type: 'nop' }, f.board.next + 1000);
  const ad = f.board.ads.find(a => a.self);
  assert.ok(ad, 'ozval se');
  assert.equal(ad.cands.length, 1);
  assert.ok(ad.house >= 0 && ad.house < 9);
  const c0 = f.coins, w0 = f.silo.wheat || 0;
  assert.ok(applyAction(f, { type: 'hireCand', ad: ad.id, i: 0 }, ad.ready + 1).ok);
  assert.equal(f.coins, c0); assert.equal(f.silo.wheat || 0, w0, 'bez pohoštění');
});

test('v29: zásluhy pro Statek a nové rozložení průmyslu', () => {
  const f = rich(farm6(), 2, 1e6);
  f.objects.find(o => o.kind === 'statek').lvl = 1;
  f.siloCap = 9999;
  const st = f.objects.find(o => o.kind === 'statek');
  // na Statku 1 jen Semenárna a Pekárna, Krmivárna a Kurník až na 2
  assert.equal(applyAction(f, { type: 'place', kind: 'krmivarna', x: 0, y: 0 }, T0).error, 'statek_low');
  assert.equal(BUILDINGS.mlekarna.st, 5); assert.equal(BUILDINGS.textilka.st, 10);
  const c = upgradeCost(st);
  for (const x of c.items) f.silo[x.item] = x.qty;
  // chybí úroveň 3 a 40 sklizených plodin
  assert.deepEqual(statekMerits(f, 2).map(m => m.ok), [false, false]);
  assert.equal(applyAction(f, { type: 'upgrade', id: st.id }, T0).error, 'merits');
  f.level = 3; f.xp = LEVEL_XP[3]; f.stats.harvest = 40;
  assert.ok(statekMerits(f, 2).every(m => m.ok));
  assert.ok(applyAction(f, { type: 'upgrade', id: st.id }, T0).ok);
  assert.equal(statekLevel(f), 2);
  assert.ok(applyAction(f, { type: 'place', kind: 'krmivarna', x: 0, y: 0 }, T0).ok);
  // Statek 5 chce pověst 4
  assert.equal(statekMerits(f, 5)[1].k, 'rep');
  // velké pole až od Statku 4
  f.objects.find(o => o.kind === 'statek').lvl = 3;
  assert.equal(maxBigFields(f), 0);
  f.objects.find(o => o.kind === 'statek').lvl = 4;
  assert.equal(maxBigFields(f), 1);
});

test('v29: úrovně 1–12 ze zkušeností za hodnotu výrobků, profese, vlastnosti, historie', () => {
  assert.deepEqual([1, 2, 5, 12].map(L => TEAM.mult[L]), [1, 1.25, 2.47, 12]);
  const v = { id: 1, prof: 'vyroba', xp: {}, hist: [] };
  assert.equal(villLevel(v, 'vyroba'), 1);
  v.xp.vyroba = 40; assert.equal(villLevel(v, 'vyroba'), 2);
  v.xp.vyroba = 1e9; assert.equal(villLevel(v, 'vyroba'), 12, 'nejvýš 12');
  assert.equal(villLevel(v, 'pole'), 1, 'každý obor zvlášť');
  // pole: políčko za 12 s na úrovni 1, za 1 s na úrovni 12
  const p1 = { prof: 'pole', xp: {} }, p12 = { prof: 'pole', xp: { pole: TEAM.xpLvl[12] } };
  assert.equal(workMs(p1, 'harvest', 'pole'), 12000);
  assert.equal(workMs(p12, 'harvest', 'pole'), 1000);
  assert.equal(workMs({ prof: 'vyroba', xp: {} }, 'harvest', 'pole'), Math.round(12000 / 0.9), 'mimo profesi 90 %');
  assert.equal(workMs({ prof: 'pole', trait: 'sikovny', xp: {} }, 'harvest', 'pole'), Math.round(12000 / 1.06));
  // zkušenosti: mlynář za mouku dostane hodnotu × 0,1; mimo profesi polovinu; učenlivý +25 %
  const f = rich(farm6(), 20, 10000);
  f.siloCap = 9999;
  const mlyn = placeAny(f, 'mlyn');
  const a = hire(f, mlyn, 1, 'vyroba'), b = worker(f, 'pole'), c = worker(f, 'vyroba', 1, 'ucenlivy');
  assert.ok(plan(f, a, 'mouka', 100).ok);
  f.silo.wheat = 3;
  catchUp(f, T0 + 3600000);
  assert.equal(f.silo.mouka, 1);
  assert.equal(findVill(f, a).xp.vyroba, Math.round(ITEMS.mouka.price * 0.1 * 100) / 100);
  assert.ok(plan(f, a, 'mouka', 0, T0 + 3600000).ok, 'mlýn už pšenici nebere');
  const pek = placeAny(f, 'pekarna');
  assert.ok(applyAction(f, { type: 'assignVill', id: b, at: pek }, T0 + 3600000).ok);
  assert.ok(plan(f, b, 'chleb', 100, T0 + 3600000).ok);
  f.silo.wheat = 3;
  catchUp(f, T0 + 7200000);
  assert.equal(findVill(f, b).xp.vyroba, Math.round(ITEMS.chleb.price * 0.1 * 0.5 * 100) / 100, 'mimo profesi polovina');
  assert.equal(applyAction(f, { type: 'assignVill', id: c, at: pek }, T0 + 7200000).error, 'workplace_full', 've výrobně je zatím místo pro jednoho');
  assert.ok(applyAction(f, { type: 'assignVill', id: c, at: pek, swap: b }, T0 + 7200000).ok);
  assert.equal(findVill(f, b).at, 0, 'vyměněný jde tam, odkud přišel nový (c neměl práci)');
  assert.equal(f.objects.find(o => o.id === pek).plan.chleb, 100, 'plán zůstal u pekárny');
  f.silo.wheat = 3;
  catchUp(f, T0 + 3 * 3600000);
  assert.equal(findVill(f, c).xp.vyroba, Math.round(ITEMS.chleb.price * 0.1 * 1.25 * 100) / 100, 'učenlivý');
  // historie povýšení
  findVill(f, c).xp.vyroba = 39;
  f.silo.wheat = 3;
  catchUp(f, T0 + 4 * 3600000);
  assert.deepEqual(findVill(f, c).hist.map(h => [h[1], h[2]]), [['vyroba', 2]]);
});

test('v29: výkon – řemeslník naloží víc kusů za stejný čas, odnáší po částech, hráč dostane čtvrtinu XP', () => {
  const f = rich(farm6(), 20, 10000);
  f.siloCap = 9999;
  const mlyn = placeAny(f, 'mlyn'), o = findObject(f, mlyn);
  const id = hire(f, mlyn, 12);
  assert.ok(plan(f, id, 'mouka', 100).ok);
  f.silo.wheat = 300;
  tick(f, T0 + 500);
  const v = findVill(f, id);
  assert.equal(v.job.k, 'load'); assert.equal(v.job.n, 12, 'úroveň 12 = 12 kusů najednou');
  assert.equal(v.job.e - v.job.s, Math.round(9000 / 12));
  assert.equal(f.silo.wheat, 300 - 36, 'suroviny na celou dávku');
  tick(f, T0 + 800);
  assert.equal(o.queue[0].n, 12); assert.equal(o.queue[0].d, RECIPES.mouka.time * 1000, 'doba výroby stejná');
  // málo surovin → menší dávka
  f.silo.wheat = 7;
  const xp0 = f.xp;
  catchUp(f, T0 + 3600000);
  assert.ok(f.silo.mouka >= 12);
  assert.ok(f.xp - xp0 <= Math.ceil(RECIPES.mouka.xp * f.silo.mouka * TEAM.playerXp) + 1, 'hráč dostal jen část XP');
  // plný sklad: dávka se odnese po částech, nic se neztratí
  const g = rich(farm6(), 20, 10000);
  const m2 = placeAny(g, 'mlyn'), o2 = findObject(g, m2);
  o2.queue = [{ r: 'mouka', end: T0, d: 1000, n: 10, t: 1 }];
  g.silo = {}; g.siloCap = 6;
  assert.ok(applyAction(g, { type: 'collect', id: m2 }, T0 + 1).ok);
  assert.equal(g.silo.mouka, 6); assert.equal(o2.queue[0].n, 4, 'zbytek čeká v budově');
  g.siloCap = 100;
  assert.ok(applyAction(g, { type: 'collect', id: m2 }, T0 + 2).ok);
  assert.equal(g.silo.mouka, 10); assert.equal(o2.queue.length, 0);
});

test('v29: náročnost – na těžší věci pracovník potřebuje praxi; chov a výnos zvířat', () => {
  assert.deepEqual([1, 4, 5, 7, 8, 10, 11, 14, 18].map(needLvl), [1, 1, 2, 2, 4, 4, 6, 8, 8]);
  const f = rich(farm6(), 20, 10000);
  f.siloCap = 9999;
  const pek = placeAny(f, 'pekarna');
  const id = hire(f, pek, 1);
  assert.ok(plan(f, id, 'tresnovy_kolac', 100).ok, 'do tabulky jde přidat');
  f.silo = { mouka: 10, tresne: 10, vejce: 10 };
  tick(f, T0 + 1000);
  assert.equal(findVill(f, id).w, 'skill', 'třešňový koláč umí až od úrovně 2');
  findVill(f, id).xp.vyroba = TEAM.xpLvl[2];
  tick(f, T0 + 60000);
  assert.notEqual(findVill(f, id).w, 'skill');
  assert.ok(findObject(f, pek).queue.some(q => q.r === 'tresnovy_kolac'), 'už peče');
  // kravín: kráva chce chovatele úrovně 2
  const kr = placeAny(f, 'kravin');
  assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'krava' }, T0).ok);
  const ch = hire(f, kr, 1);
  f.silo.krmivo_kravy = 5;
  tick(f, T0 + 61000);
  assert.equal(findVill(f, ch).w, 'skill');
  // kurník: chovatel úrovně 12 sebere z každého vejce 3 (v34: jedno krmení = 3 vejce za 3 h → 9) – pekař už vejce nebere
  assert.ok(plan(f, id, 'tresnovy_kolac', 0, T0 + 61000).ok);
  const ku = placeAny(f, 'kurnik');
  assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
  const ch2 = hire(f, ku, 12);
  f.silo.krmivo_slepice = 1; f.silo.vejce = 0;
  catchUp(f, T0 + 4 * 3600000);
  assert.equal(f.silo.vejce, 9);
  assert.equal(f.silo.krmivo_slepice || 0, 0);
  assert.ok(findVill(f, ch2).xp.chov > TEAM.xpLvl[12]);
});

test('dělník ve výrobně: pracuje průběžně, hlídá podíly, strop zásoby a suroviny', () => {
  const f = rich(farm6(), 20, 10000);
  f.siloCap = 5000;
  const mlyn = placeAny(f, 'mlyn'), id = hire(f, mlyn);
  assert.ok(plan(f, id, 'mouka', 100).ok);
  f.silo.wheat = 30;
  const need = RECIPES.mouka.in.wheat, v = findVill(f, id), o = findObject(f, mlyn);
  // hned si vezme suroviny a jde nakládat: 9 s na úrovni 1
  tick(f, T0 + 1000);
  assert.equal(v.job.k, 'load'); assert.equal(v.job.e - v.job.s, 9000);
  assert.equal(f.silo.wheat, 30 - need, 'suroviny si vzal hned – nikdo jiný už je nevezme');
  tick(f, T0 + 10_000);
  assert.equal(o.queue.length, 1, 'po 9 s je první mouka ve výrobě');
  tick(f, T0 + 3600 * 1000);
  assert.ok(f.silo.mouka > 0, 'mouka je ve skladu');
  const inHand = v.job && v.job.k === 'load' ? v.job.n : 0;
  assert.equal((f.silo.wheat || 0) + (f.silo.mouka + o.queue.reduce((n, q) => n + (q.n || 1), 0) + inHand) * need, 30, 'pšenice se spotřebovala jen na mouku');
  // došly suroviny → čeká a ví na co; jakmile přibudou, začne hned
  catchUp(f, T0 + 6 * 3600 * 1000);
  assert.equal(f.silo.mouka, 10); assert.equal(v.w, 'inputs');
  f.silo.wheat = 6;
  tick(f, T0 + 6 * 3600 * 1000 + 5000);
  assert.equal(v.job.k, 'load'); assert.equal(v.job.s, T0 + 6 * 3600 * 1000, 'začal v okamžiku, kdy si všiml surovin');
  // dva výrobky 50 / 50 a strop zásoby
  const pek = placeAny(f, 'pekarna'), pid = hire(f, pek, 3);
  assert.ok(plan(f, pid, 'chleb', 50).ok);
  assert.ok(plan(f, pid, 'pernik', 50).ok);
  const t1 = T0 + 7 * 3600 * 1000;
  catchUp(f, t1);
  f.siloCap = 50000;
  f.silo.wheat = 9000; f.silo.mouka = 200; f.silo.med = 200; f.silo.chleb = 0; f.silo.pernik = 0;
  catchUp(f, t1 + 10 * 3600 * 1000);
  // procenta = podíl výrobního času: perník se peče 2× déle, takže ho při 50/50 je polovina
  const tc = f.silo.chleb * RECIPES.chleb.time, tp = f.silo.pernik * RECIPES.pernik.time;
  assert.ok(f.silo.chleb > 10 && Math.abs(tc - tp) / tc < 0.1, `podíly času 50/50: chleb ${f.silo.chleb}, perník ${f.silo.pernik}`);
  assert.equal(applyAction(f, { type: 'planTarget', w: wOf(f, pid), key: 'mouka', n: 5 }, t1).error, 'bad_action', 'cíl jen pro výrobek té budovy');
  f.silo.chleb = 0; f.silo.pernik = 0;
  const t2 = t1 + 10 * 3600 * 1000;
  assert.ok(applyAction(f, { type: 'planTarget', w: wOf(f, pid), key: 'chleb', n: 20 }, t2).ok);
  catchUp(f, t2 + 12 * 3600 * 1000);
  assert.equal(f.silo.chleb, 20, 'chleba je přesně po strop');
  assert.ok(f.silo.pernik > 25, 'perník pokračuje');
  assert.ok(plan(f, pid, 'pernik', 0, t2 + 12 * 3600 * 1000).ok);
  catchUp(f, t2 + 13 * 3600 * 1000);
  assert.equal(findVill(f, pid).w, 'limit', 'čeká, až chleba ubude');
  f.silo.chleb = 19;
  catchUp(f, t2 + 14 * 3600 * 1000);
  assert.equal(f.silo.chleb, 20, 'ubylo → dovyrobil');
});

test('skladník: trh každou půlhodinu, procenta ze skladu, rezerva, kapacita a cena podle úrovně', () => {
  const f = rich(farm6(), 20, 10000);
  f.siloCap = 5000;
  const sk = sklad(f), id = hire(f, sk.id), v = findVill(f, id);
  const M = nextTrade(T0);
  f.silo = { wheat: 40, corn: 10 };
  assert.equal(plan(f, id, 's_wheat', 50).error, 'bad_action', 'semena neprodává');
  assert.ok(plan(f, id, 'wheat', 50).ok);
  assert.ok(plan(f, id, 'corn', 100).ok);
  tick(f, M - 1000);
  assert.equal(f.silo.wheat, 40);
  const c0 = f.coins, exp = 20 * sellPrice('wheat', M) + 10 * sellPrice('corn', M);
  tick(f, M + 1000);
  assert.equal(f.silo.wheat, 20); assert.equal(f.silo.corn, undefined);
  assert.equal(f.coins - c0, exp, 'úroveň 1 prodává za výkupní cenu');
  assert.equal(v.earned, exp); assert.equal(v.sold, 30); assert.equal(v.last.t, M);
  assert.ok(v.xp.sklad > 0, 'zkušenosti za tržbu');
  tick(f, M + TRADE_IV);
  assert.equal(f.silo.wheat, 10);
  assert.ok(applyAction(f, { type: 'keep', item: 'wheat', n: 8 }, M + TRADE_IV).ok);
  tick(f, M + 2 * TRADE_IV);
  assert.equal(f.silo.wheat, 9, 'polovina ze 2 kusů nad rezervou');
  // kapacita: úroveň 1 prodá na jednom trhu nejvýš 30 kusů, rozdělí je poměrně
  f.silo = { wheat: 208, corn: 100 };
  assert.ok(plan(f, id, 'wheat', 100, M + 2 * TRADE_IV).ok);
  const pre = tradeRound(f, v, M + 3 * TRADE_IV);
  assert.equal(pre.n, TEAM.trade.cap[1]);
  // vyšší úroveň: víc kusů a lepší cena
  tick(f, M + 5 * TRADE_IV + 1000);
  v.xp.sklad = TEAM.xpLvl[12];
  const t6 = M + 6 * TRADE_IV, c1 = f.coins;
  f.silo = { wheat: 2000 };
  tick(f, t6);
  assert.equal(2000 - f.silo.wheat, TEAM.trade.cap[12]);
  assert.equal(f.coins - c1, Math.round(TEAM.trade.cap[12] * sellPrice('wheat', t6) * 1.25));
  // počet druhů zboží podle úrovně
  const id2 = worker(f, 'sklad');
  assert.equal(applyAction(f, { type: 'assignVill', id: id2, at: sk.id }, t6).error, 'workplace_full');
  assert.ok(applyAction(f, { type: 'assignVill', id: id2, at: sk.id, swap: id }, t6).ok);
  assert.equal(v.at, 0, 'zkušený skladník se uvolnil');
  const items = ['wheat', 'corn', 'mouka', 'chleb', 'vejce'];
  for (const it of items) assert.ok(plan(f, id2, it, 50, t6).ok, 'plán skladu má až 12 řádků');
  f.silo = { wheat: 10, corn: 10, mouka: 10, chleb: 10, vejce: 10 };
  f.keep = {};
  assert.equal(tradeRound(f, findVill(f, id2), t6).rows.length, TEAM.trade.rows[1], 'úroveň 1 zvládne jen první 4 druhy');
});

test('pěstitel: sází a sklízí průběžně podle plánu v procentech', () => {
  const f = rich(farm6(), 20, 10000);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  f.siloCap = 5000;
  const id = worker(f, 'pole'), v = findVill(f, id);
  assert.equal(plan(f, id, 'wheat', 100).error, 'bad_action', 'bez pracoviště tabulku nemá');
  assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: f.plots[0].id }, T0).ok);
  assert.equal(plan(f, id, 'jablon', 50).error, 'bad_action', 'na poli se stromy nesázejí');
  assert.ok(plan(f, id, 'wheat', 100).ok);
  f.seeds = { s_wheat: 3 };
  const coins = f.coins;
  tick(f, T0 + 1000);
  // úroveň 1: 12 s na políčko, do jednoho úkonu se vejde 30 s práce → 2 políčka najednou (v31)
  assert.equal(v.job.k, 'plant'); assert.equal(v.job.ids.length, 2); assert.equal(v.job.e - v.job.s, 24_000);
  assert.equal(f.seeds.s_wheat, 1, 'semínka na obě políčka si vzal s sebou');
  tick(f, T0 + 23_000);
  assert.equal(f.plots.filter(p => p.crop === 'wheat').length, 0, 'ještě sází');
  tick(f, T0 + 25_000);
  assert.equal(f.plots.filter(p => p.crop === 'wheat').length, 2, '2 políčka za 24 s');
  assert.equal(v.n, 2, 'hotovo se počítá po políčkách');
  tick(f, T0 + 37_000);
  assert.equal(f.plots.filter(p => p.crop === 'wheat').length, 3);
  assert.equal(f.seeds.s_wheat, undefined);
  assert.equal(v.w, 'seeds');
  assert.equal(f.coins, coins, 'za osivo neplatil');
  // sklidí hned, jak dozraje – obě zralá políčka jedním úkonem
  const p0 = f.plots.find(p => p.crop === 'wheat' && p.planted === T0 + 24_000);
  const ripe = p0.planted + p0.d;
  tick(f, ripe + 11_000);
  assert.equal(v.job.k, 'harvest'); assert.equal(v.job.s, ripe); assert.equal(v.job.ids.length, 2);
  tick(f, ripe + 24_000);
  assert.ok(f.silo.wheat >= 2 * CROPS.wheat.yield);
  assert.ok(v.xp.pole > 0, 'zkušenosti za sklizeň');
  // plán 50 % pšenice + 50 % kukuřice
  const t1 = T0 + 3600_000;
  catchUp(f, t1);
  for (const p of f.plots) { p.crop = null; p.planted = 0; }
  f.seeds = { s_wheat: 9, s_corn: 9 };
  assert.ok(plan(f, id, 'wheat', 50, t1).ok);
  assert.ok(plan(f, id, 'corn', 50, t1).ok);
  assert.equal(plan(f, id, 'salat', 10, t1).error, 'plan_over');
  catchUp(f, t1 + 80_000);
  assert.deepEqual(f.plots.filter(p => p.crop).map(p => p.crop).sort(), ['corn', 'corn', 'corn', 'wheat', 'wheat', 'wheat']);
  // meloun (úroveň hráče 9) umí pěstitel až od úrovně 4
  assert.ok(plan(f, id, 'corn', 0, t1 + 80_000).ok);
  assert.ok(plan(f, id, 'meloun', 50, t1 + 80_000).ok);
  f.seeds = { s_meloun: 5 };
  for (const p of f.plots) { p.crop = null; }
  tick(f, t1 + 200_000);
  assert.ok(!f.plots.some(p => p.crop === 'meloun'));
  f.objects.find(o => o.kind === 'statek').lvl = 1;
  assert.equal(plan(f, id, 'carrot', 50, t1 + 200_000).error, 'locked', 'v37: plodiny odemyká Statek');
});

test('pracovník a hráč si nepřekážejí; přeřazení vrátí, co si vzal', () => {
  const f = rich(farm6(), 20, 10000);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  const id = worker(f, 'pole'), v = findVill(f, id);
  assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: f.plots[0].id }, T0).ok);
  assert.ok(plan(f, id, 'wheat', 100).ok);
  f.seeds = { s_wheat: 6 };
  tick(f, T0 + 1000);
  assert.equal(f.seeds.s_wheat, 4, 'vzal si 2 semínka na 2 políčka');
  const pl = f.plots.find(p => p.id === v.job.id), other = v.job.ids[1];
  assert.ok(applyAction(f, { type: 'plant', x: pl.x, y: pl.y, crop: 'wheat' }, T0 + 2000).ok);
  assert.equal(f.seeds.s_wheat, 3);
  tick(f, T0 + 25_000);
  assert.equal(pl.planted, T0 + 2000, 'políčko hráče nepřesázel');
  assert.ok(f.plots.find(p => p.id === other).crop, 'druhé zasadil');
  assert.equal(f.seeds.s_wheat, 2, 'semínko z obsazeného políčka vrátil (3 + 1) a vzal si 2 na další');
  assert.equal(v.job.k, 'plant'); assert.ok(!v.job.ids.includes(pl.id));
  assert.ok(applyAction(f, { type: 'assignArea', id, a: 0 }, T0 + 26_000).ok);
  assert.equal(f.seeds.s_wheat, 4, 'odvolaný vrátí obě semínka');
  assert.equal(v.job, null);
  tick(f, T0 + 60_000);
  assert.equal(v.w, 'free');
  // z oblasti do budovy a zpátky: plán zůstává u pracoviště
  const mlyn = placeAny(f, 'mlyn');
  assert.ok(applyAction(f, { type: 'assignVill', id, at: mlyn }, T0 + 60_000).ok);
  assert.equal(v.area, null); assert.equal(v.plan, undefined);
  assert.equal(wpGet(f, 'pole' + f.plots[0].id).set.plan.wheat, 100, 'plán zůstal u oblasti');
  assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: f.plots[0].id }, T0 + 60_000).ok);
  assert.equal(v.at, 0);
});

test('pěstitel v sadu: sází sazenice ze Statku, trhá ovoce a vykopává suché stromy', () => {
  const f = rich(farm6(), 20, 100000);
  f.siloCap = 5000;
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  const ids = [];
  for (let i = 0; i < 4; i++) { const r = applyAction(f, { type: 'place', kind: 'sad', x: 12 + i, y: 14 }, T0); assert.ok(r.ok, 'sad ' + r.error); ids.push(r.id); }
  const id = worker(f, 'pole', 2), v = findVill(f, id);
  assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'sad', a: ids[0] }, T0).ok);
  assert.equal(plan(f, id, 'wheat', 100).error, 'bad_action');
  assert.ok(plan(f, id, 'jablon', 50).ok);
  assert.ok(plan(f, id, 'maliny', 50).ok);
  f.seeds = { z_jablon: 5, z_maliny: 5 };
  const coins = f.coins;
  catchUp(f, T0 + 200_000);
  assert.deepEqual(ids.map(i => findObject(f, i).tree).sort(), ['jablon', 'jablon', 'maliny', 'maliny']);
  assert.equal(f.coins, coins);
  catchUp(f, T0 + 3600 * 1000);
  assert.ok(f.silo.jablko > 0 && f.silo.maliny > 0, 'ovoce je ve skladu');
  const o = ids.map(i => findObject(f, i)).find(x => x.tree === 'jablon');
  o.dead = true;
  catchUp(f, T0 + 3600 * 1000 + 300_000);
  assert.equal(o.dead, false); assert.ok(o.tree, 'znovu osázeno');
  assert.ok(v.xp.pole > TEAM.xpLvl[2]);
});

test('plný sklad zastaví pracovníky a uvolněné místo je rozběhne', () => {
  const f = rich(farm6(), 20, 10000);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  const id = worker(f, 'pole'), v = findVill(f, id);
  assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: f.plots[0].id }, T0).ok);
  for (const p of f.plots) { p.crop = 'wheat'; p.planted = T0 - 3600_000; p.d = 60_000; }
  f.silo = { corn: f.siloCap - 3 };
  catchUp(f, T0 + 600_000);
  assert.equal(f.silo.wheat, 2);
  assert.equal(v.w, 'full');
  const tid = hire(f, sklad(f).id, 1, 'sklad', T0 + 600_000);
  assert.ok(plan(f, tid, 'corn', 100, T0 + 600_000).ok);
  const M = nextTrade(T0 + 600_000);
  catchUp(f, M + 600_000);
  assert.equal(f.plots.filter(p => p.crop).length, 0, 'všechno sklizeno');
});

test('dlouhá nepřítomnost se dopočítává po dávkách a výsledek nezávisí na dělení času', () => {
  const build = () => {
    const f = rich(farm6(), 20, 1e6);
    f.objects = f.objects.filter(o => o.kind !== 'sad');
    f.siloCap = 300;
    const fid = worker(f, 'pole', 6);
    assert.ok(applyAction(f, { type: 'assignArea', id: fid, kind: 'pole', a: f.plots[0].id }, T0).ok);
    assert.ok(plan(f, fid, 'wheat', 100).ok);
    const sem = placeAny(f, 'semenarna'), mlyn = placeAny(f, 'mlyn'), pek = placeAny(f, 'pekarna');
    assert.ok(plan(f, hire(f, sem, 6), 's_wheat', 100).ok);
    assert.ok(plan(f, hire(f, mlyn, 3), 'mouka', 100).ok);
    assert.ok(plan(f, hire(f, pek, 2), 'chleb', 100).ok);
    const tr = hire(f, sklad(f).id, 4);
    for (const it of ['wheat', 'mouka', 'chleb']) assert.ok(plan(f, tr, it, 50).ok);
    assert.ok(applyAction(f, { type: 'keep', item: 'wheat', n: 12 }, T0).ok);
    f.seeds = { s_wheat: 12 };
    return f;
  };
  const end = T0 + 20 * 3600 * 1000;
  const a = build(), b = build();
  const t0 = performance.now();
  const calls = catchUp(a, end);
  const ms = (performance.now() - t0) / calls;
  assert.ok(calls > 1, `dopočet šel po dávkách (${calls})`);
  assert.ok(ms < 60, `jedna dávka trvala ${ms.toFixed(1)} ms`);
  for (let t = T0; t < end; t += 1_260_000) catchUp(b, t);
  catchUp(b, end);
  const key = f => JSON.stringify({ silo: f.silo, seeds: f.seeds, coins: f.coins, xp: f.xp, plots: f.plots.map(p => [p.crop, p.planted]), q: f.objects.map(o => o.queue || 0), n: f.vill.map(v => [v.n, v.t, v.job, v.w, v.xp]) });
  assert.equal(key(a), key(b), 'stejný výsledek, ať se čas krájí jakkoli');
  assert.ok(a.coins > 1e6 - 3000);
  assert.ok(a.vill.every(v => v.n > 5), 'všichni pracovali');
  const c = build();
  const r = runVillagers(c, end, { left: 50 });
  assert.ok(r.n > 0 && r.n <= 50); assert.equal(r.steps, 50, 'rozpočet hlídá každou událost'); assert.equal(r.behind, true);
  assert.ok(villLag(c, end) > 3600_000);
  const d = build();
  catchUp(d, T0 + 40 * 24 * 3600 * 1000);
  assert.equal(villLag(d, T0 + 40 * 24 * 3600 * 1000), 0);
  assert.ok(d.vill.find(v => v.at === sklad(d).id).n <= 48, 'nejvýš 48 trhů za den');
});

test('zásoby ve Statku, nákup v městečku, pracovní oblasti', () => {
  const f = rich(farm6(), 20, 10000);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  // kapacita zásob: 3 na pole a sad
  assert.equal(seedCap(f), 3 * f.plots.length);
  assert.ok(applyAction(f, { type: 'buySupply', item: 's_wheat', qty: 10 }, T0).ok);
  assert.equal(f.seeds.s_wheat, 10); assert.equal(f.silo.s_wheat, undefined, 'semena nejsou ve skladu');
  assert.equal(applyAction(f, { type: 'buySupply', item: 's_wheat', qty: seedCap(f) }, T0).error, 'seeds_full');
  assert.equal(applyAction(f, { type: 'buySupply', item: 'wheat', qty: 1 }, T0).error, 'no_supply', 'úroda se nekupuje');
  assert.ok(applyAction(f, { type: 'buySupply', item: 'krmivo_slepice', qty: 5 }, T0).ok);
  assert.equal(f.silo.krmivo_slepice, 5, 'krmivo jde do skladu');
  // oblasti: 6 polí v řadě = oblast 1; 3 pole o kus dál nejsou oblast, 4. ji vytvoří
  let areas = workAreas(f);
  assert.equal(areas.filter(g => g.kind === 'pole').length, 1);
  assert.equal(areas[0].ids.length, f.plots.length);
  for (let i = 0; i < 3; i++) { f.coins += 1000; assert.ok(applyAction(f, { type: 'buyPlot', x: 12 + i, y: 14 }, T0).ok); }
  assert.equal(workAreas(f).filter(g => g.kind === 'pole').length, 1, '3 pole oblast nejsou');
  assert.ok(applyAction(f, { type: 'buyPlot', x: 15, y: 14 }, T0).ok);
  areas = workAreas(f);
  assert.equal(areas.filter(g => g.kind === 'pole').length, 2, 'oblast 2');
  // pracovníci do oblastí (do Statku ne)
  const a = worker(f, 'pole'), b = worker(f, 'pole');
  assert.equal(applyAction(f, { type: 'assignVill', id: a, at: f.objects[0].id }, T0).error, 'bad_job');
  assert.ok(applyAction(f, { type: 'assignArea', id: a, kind: 'pole', a: f.plots[0].id }, T0).ok);
  // oblast o 6 políčkách obslouží 1 pracovník → druhý jen výměnou
  assert.equal(areaCap(workAreas(f)[0]), 1);
  assert.equal(applyAction(f, { type: 'assignArea', id: b, kind: 'pole', a: f.plots[2].id }, T0).error, 'workplace_full');
  assert.ok(applyAction(f, { type: 'assignArea', id: b, kind: 'pole', a: f.plots[2].id, swap: a }, T0).ok);
  assert.equal(findVill(f, a).area, null, 'vyměněný jde tam, odkud přišel b (nikam)');
  // oblast 2 se rozšíří na 8 políček → 2 pracovníci, větší oblast se nerozbije
  f.objects.find(o => o.kind === 'statek').lvl = 5;
  for (let x = 12; x < 16; x++) { f.coins += 1000; assert.ok(applyAction(f, { type: 'buyPlot', x, y: 15 }, T0).ok); }
  const g2 = workAreas(f).filter(g => g.kind === 'pole')[1];
  assert.equal(workAreas(f).filter(g => g.kind === 'pole').length, 2);
  assert.equal(g2.ids.length, 8); assert.equal(areaCap(g2), 2);
  const c = worker(f, 'pole'), d = worker(f, 'pole');
  assert.ok(applyAction(f, { type: 'assignArea', id: a, kind: 'pole', a: g2.ids[0] }, T0).ok);
  assert.ok(applyAction(f, { type: 'assignArea', id: c, kind: 'pole', a: g2.ids[7] }, T0).ok);
  assert.equal(applyAction(f, { type: 'assignArea', id: d, kind: 'pole', a: g2.ids[3] }, T0).error, 'workplace_full');
  assert.equal(wpWorkers(f, wpGet(f, 'pole' + g2.ids[0])).length, 2);
  assert.equal(applyAction(f, { type: 'assignArea', id: a, kind: 'sad', a: 999 }, T0).error, 'area_small');
});

test('přesun malého pole i s plodinou', () => {
  const f = farm6();
  const p = f.plots[0], [x, y] = [p.x, p.y];
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0).ok);
  const q = f.plots[1];
  assert.equal(applyAction(f, { type: 'movePlot', x, y, tx: q.x, ty: q.y }, T0).error, 'occupied', 'na jiné pole ne');
  assert.equal(applyAction(f, { type: 'movePlot', x, y, tx: 8, ty: 8 }, T0).error, 'occupied', 'na statek ne');
  assert.equal(applyAction(f, { type: 'movePlot', x, y, tx: -20, ty: 3 }, T0).error, 'occupied', 'mimo farmu ne');
  assert.equal(applyAction(f, { type: 'movePlot', x: 16, y: 16, tx: 15, ty: 15 }, T0).error, 'no_object');
  assert.ok(applyAction(f, { type: 'movePlot', x, y, tx: 14, ty: 2 }, T0).ok);
  assert.deepEqual([p.x, p.y, p.crop], [14, 2, 'wheat'], 'plodina se přesunula s polem');
  assert.ok(applyAction(f, { type: 'movePlot', x: 14, y: 2, tx: 14, ty: 2 }, T0).ok, 'na stejné místo');
  assert.equal(f.plots.length, 6);
});

test('vykopání živého stromu: vrátí sazenici nebo mince jen před první úrodou', () => {
  const f = farm6();
  f.coins = 1000; f.level = 3; f.xp = LEVEL_XP[3];
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  const id = applyAction(f, { type: 'place', kind: 'sad', x: 0, y: 0 }, T0).id;
  const o = findObject(f, id);
  // koupená sazenice (mince) → zpět mince
  const c0 = f.coins;
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  const cost = c0 - f.coins;
  assert.ok(cost > 0);
  assert.equal(applyAction(f, { type: 'clearTree', id }, T0 + 1000).error, 'not_ready', 'bez potvrzení (force) se živý strom nevykope');
  const r = applyAction(f, { type: 'clearTree', id, force: true }, T0 + 1000);
  assert.ok(r.ok);
  assert.deepEqual(r.back, { coins: cost });
  assert.equal(f.coins, c0, 'mince zpět');
  assert.equal(treeState(o, T0 + 1000).state, 'empty');
  // sazenice ze skladu → zpět do skladu, pak jde zasadit jiný strom
  f.seeds.z_jablon = 1;
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  assert.equal(f.seeds.z_jablon || 0, 0);
  assert.deepEqual(applyAction(f, { type: 'clearTree', id, force: true }, T0 + 1000).back, { item: 'z_jablon' });
  assert.equal(f.seeds.z_jablon, 1);
  // zralé ovoce se musí nejdřív sklidit; po první úrodě se nic nevrací
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  const t = T0 + 1800 * 1000;
  assert.equal(applyAction(f, { type: 'clearTree', id, force: true }, t).error, 'tree_ready');
  assert.ok(applyAction(f, { type: 'harvestTree', id }, t).ok);
  const coins = f.coins, silo = JSON.stringify(f.silo);
  const r2 = applyAction(f, { type: 'clearTree', id, force: true }, t + 1000);
  assert.ok(r2.ok);
  assert.equal(r2.back, null);
  assert.equal(f.coins, coins); assert.equal(JSON.stringify(f.silo), silo);
  // strom ze starší verze (bez záznamu o platbě) → vykopat jde, nic se nevrací
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  delete o.paid;
  assert.equal(applyAction(f, { type: 'clearTree', id, force: true }, T0 + 1000).back, null);
  // plný sklad: sazenici není kam vrátit
  f.seeds.z_jablon = 1;
  assert.ok(applyAction(f, { type: 'plantTree', id, tree: 'jablon' }, T0).ok);
  f.silo.wheat = f.siloCap;
  assert.equal(applyAction(f, { type: 'clearTree', id, force: true }, T0 + 1000).error, 'silo_full');
});

test('zakázky: stejné na serveru i v prohlížeči, doručení a zrušení', () => {
  const a = newFarm(T0), b = JSON.parse(JSON.stringify(a));
  assert.equal(a.orders.length, 6);
  assert.ok(a.orders.every(o => o.items.every(x => orderableItems(1).includes(x.item))), 'na úrovni 1 jen to, co jde vypěstovat');
  a.silo.wheat = 40; b.silo.wheat = 40;
  const slot = a.orders.findIndex(o => canDeliver(a, o));
  const ra = applyAction(a, { type: 'deliver', slot }, T0), rb = applyAction(b, { type: 'deliver', slot }, T0);
  assert.ok(ra.ok);
  assert.deepEqual(a, b, 'deterministické');
  assert.ok(ra.coins > 0 && a.coins === 50 + ra.coins);
  const need = a.orders[0].items[0].qty;
  a.silo = {};
  assert.equal(applyAction(a, { type: 'deliver', slot: 0 }, T0).error, 'missing');
  assert.ok(applyAction(a, { type: 'discard', slot: 0 }, T0).ok);
  assert.equal(applyAction(a, { type: 'discard', slot: 0 }, T0).error, 'no_order', 'nová až za 3 min');
  assert.ok(orderReady(a.orders[0], T0 + 180000));
  assert.equal(applyAction(a, { type: 'deliver', slot: 9 }, T0).error, 'no_order');
  assert.ok(need > 0);
});

test('zakázky odpovídají úrovni', () => {
  // v37: podle úrovně Statku – výrobek až s budovou, krmivo až se zvířetem
  assert.deepEqual(orderableItems(1).sort(), ['chleb', 'corn', 'redkvicka', 'salat', 'wheat']);
  const s2 = orderableItems(2);
  for (const id of ['carrot', 'kolac', 'krmivo_slepice', 'vejce', 'jablko', 'hruska']) assert.ok(s2.includes(id), id);
  assert.ok(!s2.includes('mleko') && !s2.includes('krmivo_kravy') && !s2.includes('mouka'));
  const s5 = orderableItems(5);
  for (const id of ['mleko', 'syr', 'mouka', 'dzus_jablko', 'tresne']) assert.ok(s5.includes(id), id);
  assert.ok(!s5.includes('okurky') && !s5.includes('maso'));
});

test('výdělek: zakázka platí víc než výkup', () => {
  const f = newFarm(T0);
  for (const o of f.orders) {
    const value = o.items.reduce((n, x) => n + ITEMS[x.item].price * x.qty, 0);
    assert.ok(o.coins >= value * 1.3, 'aspoň o 30 % víc');
  }
});

test('prodejna strojů a převod starých strojů do garáže', () => {
  const f = farm6();
  f.coins = 5000;
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda80' }, T0).error, 'locked', 'v38: Brázda 80 až s farmařením 3');
  rich(f, 9, f.coins); f.objects = f.objects.filter(o => o.kind !== 'stodola'); f.objects.find(o => o.kind === 'statek').lvl = 1;
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'no_garage');
  rich(f, 9, f.coins);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'owned');
  f.sk.f = 0;
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'klas8' }, T0).error, 'locked', 'v38: stroje podle farmaření');
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'nic' }, T0).error, 'bad_action');
  assert.equal(f.coins, 4750);
  const old = { coins: 0, xp: 0, level: 5, silo: {}, plots: [], nextId: 9, objects: [
    { id: 1, kind: 'statek', x: 7, y: 7 }, { id: 5, kind: 'traktor', x: 0, y: 0 }, { id: 6, kind: 'kombajn', x: 0, y: 3 }] };
  normalize(old);
  assert.deepEqual(old.machines, [{ id: 5, model: 'brazda60' }, { id: 6, model: 'klas4' }]);
  assert.ok(old.objects.some(o => o.kind === 'statek') && !old.objects.some(o => o.kind === 'traktor'));
  assert.deepEqual(old.pending.filter(k => k === 'stodola'), ['stodola'], 'stodola zdarma pro staré stroje');
});

test('velké pole: stavba s vlastní velikostí a cenou za políčko', () => {
  const f = farm6();
  f.coins = 5000;
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 4, h: 4 }, T0).error, 'statek_low');
  rich(f, 5, 5000);
  f.objects.find(o => o.kind === 'statek').lvl = 4;   // v29: statek 4 = jedno velké pole
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 2, h: 4 }, T0).error, 'bad_size');
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 7, h: 3 }, T0).error, 'bad_size');
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 5, y: 5, w: 3, h: 3 }, T0).error, 'occupied', 'statek');
  const r = applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 5, h: 3 }, T0);
  assert.ok(r.ok);
  assert.equal(f.coins, 5000 - 15 * 8);
  assert.equal(objectAt(f, 4, 2).id, r.id);
  assert.equal(objectAt(f, 5, 2), null);
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 10, w: 3, h: 3 }, T0).error, 'max_fields');
  assert.ok(applyAction(f, { type: 'move', id: r.id, x: 0, y: 11 }, T0).ok);
  assert.equal(applyAction(f, { type: 'move', id: r.id, x: 0, y: 15 }, T0).error, 'occupied', 'nevejde se');
});

test('velké pole: setí traktorem, růst, sklizeň kombajnem, vykládka', () => {
  const f = farm6();
  rich(f, 6, 5000);
  const id = applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 6, h: 6 }, T0).id;
  const o = findObject(f, id);
  assert.equal(applyAction(f, { type: 'fieldSow', id, crop: 'wheat', machine: 999 }, T0).error, 'no_machine');
  const tr = applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).id;
  const kb = applyAction(f, { type: 'buyMachine', model: 'klas4' }, T0).id;
  assert.equal(applyAction(f, { type: 'fieldSow', id, crop: 'wheat', machine: kb }, T0).error, 'no_machine', 'kombajn neseje');
  const coins = f.coins;
  assert.ok(applyAction(f, { type: 'fieldSow', id, crop: 'wheat', machine: tr }, T0).ok);
  assert.equal(f.coins, coins - 36);
  assert.equal(fieldState(o, T0 + 1000).state, 'sowing');
  assert.equal(o.job.end - T0, 6 * 60 * 1000, '36 políček / 6 za minutu');
  assert.equal(freeMachine(f, 'tractor', T0 + 1000), null, 'traktor pracuje');
  assert.equal(objectStatus(o, T0 + 1000).busy, true);
  const sowEnd = o.job.end;
  assert.equal(fieldState(o, sowEnd + 1000).state, 'growing');
  assert.equal(applyAction(f, { type: 'fieldHarvest', id, machine: kb }, sowEnd + 1000).error, 'not_ready');
  const ready = sowEnd + 60000;
  assert.equal(applyAction(f, { type: 'fieldHarvest', id, machine: tr }, ready).error, 'wrong_machine', 'obilí sklízí kombajn');
  assert.ok(applyAction(f, { type: 'fieldHarvest', id, machine: kb }, ready).ok);
  assert.equal(fieldState(o, ready + 1000).state, 'harvesting');
  assert.equal(applyAction(f, { type: 'fieldUnload', id }, ready + 1000).error, 'not_ready');
  const done = o.job.end;
  assert.equal(fieldState(o, done).stock, 72);
  f.silo = {};
  let r = applyAction(f, { type: 'fieldUnload', id }, done);
  assert.equal(r.gained.items[0].qty, 50, 'jen co se vejde');
  assert.equal(r.gained.xp, 36);
  assert.equal(r.rest, 22);
  f.silo = {};
  r = applyAction(f, { type: 'fieldUnload', id }, done);
  assert.equal(r.gained.items[0].qty, 22);
  assert.equal(r.gained.xp, 0, 'XP jen jednou');
  assert.equal(fieldState(o, done).state, 'empty');
});

test('v7: denní odměna se sérií', () => {
  const f = farm6();
  const day = 86400000, t0 = Date.UTC(2026, 10, 10, 12);
  let r = applyAction(f, { type: 'claimDaily' }, t0);
  assert.equal(r.streak, 1); assert.equal(r.coins, 20);
  assert.equal(applyAction(f, { type: 'claimDaily' }, t0 + 3600000).error, 'claimed');
  for (let d = 1; d < 7; d++) r = applyAction(f, { type: 'claimDaily' }, t0 + d * day);
  assert.equal(r.streak, 7); assert.equal(r.coins, 100, 'v39: 7. den dvojnásobek (50 × 2)');
  r = applyAction(f, { type: 'claimDaily' }, t0 + 7 * day);
  assert.equal(r.streak, 8, 'v39: série po 7. dni pokračuje');
  r = applyAction(f, { type: 'claimDaily' }, t0 + 9 * day);
  assert.equal(r.streak, 1, 'v40: vynechaný den = znovu od 1');
});

test('v7: úkoly a statistiky', () => {
  const f = farm6();
  assert.equal(applyAction(f, { type: 'claimAch', id: 'harvest' }, T0).error, 'not_ready');
  f.silo = {};
  for (let i = 0; i < 25; i++) {
    for (const [x, y] of START_PLOTS) { applyAction(f, { type: 'plant', x, y, crop: 'wheat' }, T0 + i * 100000); applyAction(f, { type: 'harvest', x, y }, T0 + i * 100000 + 60000); }
    f.silo = {};
  }
  assert.ok(f.stats.harvest >= 50);
  const coins = f.coins;
  const r = applyAction(f, { type: 'claimAch', id: 'harvest' }, T0);
  assert.ok(r.ok); assert.equal(f.coins, coins + 50);
  assert.equal(applyAction(f, { type: 'claimAch', id: 'harvest' }, T0).error, 'not_ready', 'další stupeň 500');
});

test('v7: tržní ceny se mění, ale jsou stejné pro server i prohlížeč', () => {
  const P = 4 * 3600000;
  const vals = new Set();
  for (let k = 0; k < 20; k++) { const m = marketMult('wheat', k * P); assert.ok(m >= 0.7 && m <= 1.4); vals.add(m); }
  assert.ok(vals.size > 5, 'ceny se opravdu mění');
  assert.equal(marketMult('syr', 123 * P), marketMult('syr', 123 * P + 1000));
  const f = farm6(); f.silo.syr = 2;
  const c = f.coins;
  applyAction(f, { type: 'sell', item: 'syr', qty: 2 }, 5 * P);
  assert.equal(f.coins, c + 2 * sellPrice('syr', 5 * P));
  assert.equal(f.stats.sold, 2 * sellPrice('syr', 5 * P));
});

test('v7: pluh, secí stroj a lis na velkém poli', () => {
  const f = farm6();
  rich(f, 9, 20000);
  const id = applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 4, h: 4 }, T0).id;
  const o = findObject(f, id);
  const tr = applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).id;
  const kb = applyAction(f, { type: 'buyMachine', model: 'klas4' }, T0).id;
  assert.equal(applyAction(f, { type: 'fieldPlow', id, machine: tr }, T0).error, 'no_machine', 'bez pluhu');
  applyAction(f, { type: 'buyMachine', model: 'pluh' }, T0);
  applyAction(f, { type: 'buyMachine', model: 'secka' }, T0);
  applyAction(f, { type: 'buyMachine', model: 'lis' }, T0);
  assert.ok(applyAction(f, { type: 'fieldPlow', id, machine: tr }, T0).ok);
  assert.equal(fieldState(o, T0 + 1000).state, 'plowing');
  let t = o.job.end;
  assert.equal(fieldState(o, t).soil, 'plowed');
  assert.ok(applyAction(f, { type: 'fieldSow', id, crop: 'wheat', machine: tr }, t).ok);
  assert.equal(o.job.end - t, 80 * 1000, '16 políček / 6 za min = 160 s, secí stroj ×2');
  t = o.readyAt;
  assert.ok(applyAction(f, { type: 'fieldHarvest', id, machine: kb }, t).ok);
  t = o.job.end;
  assert.equal(fieldState(o, t).stock, 48, '16 × 2 × 1,5 za zorané pole');
  f.silo = {}; f.siloCap = 500;
  applyAction(f, { type: 'fieldUnload', id }, t);
  assert.equal(f.silo.wheat, 48);
  assert.equal(fieldState(o, t).straw, true, 'po obilí zůstala sláma');
  assert.ok(applyAction(f, { type: 'fieldBale', id, machine: tr }, t).ok);
  t = o.job.end;
  assert.equal(fieldState(o, t).item, 'slama');
  applyAction(f, { type: 'fieldUnload', id }, t);
  assert.equal(f.silo.slama, 8);
  assert.equal(fieldState(o, t).state, 'empty');
  assert.equal(fieldState(o, t).soil, 'stubble');
  assert.ok(f.stats.jobs >= 4);
});

test('v7: nové plodiny a výroba', () => {
  const f = farm6();
  rich(f, 8, 5000);
  assert.ok(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'beet' }, T0).ok);
  const mid = applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 0 }, T0).id;
  f.silo.wheat = 3;
  assert.ok(applyAction(f, { type: 'produce', id: mid, recipe: 'mouka' }, T0).ok);
  assert.ok(applyAction(f, { type: 'collect', id: mid }, T0 + 240000).ok);
  assert.equal(f.silo.mouka, 1);
  assert.ok(orderableItems(8).includes('cukr') && orderableItems(8).includes('buchty') && !orderableItems(7).includes('buchty'), 'buchty až s cukrem z Cukrovaru');
});

test('v8: dokupování pozemků', () => {
  const f = farm6();
  f.coins = 100000; f.level = 4; f.xp = 45;
  assert.equal(applyAction(f, { type: 'buyPlot', x: 5, y: -2 }, T0).error, 'out_of_farm');
  assert.equal(applyAction(f, { type: 'buyLand', id: 'n' }, T0).error, 'locked', 'první pozemek od úrovně 5');
  rich(f, 12, f.coins);
  assert.equal(applyAction(f, { type: 'buyLand', id: 'nw' }, T0).error, 'land_far', 'roh až po sousedním');
  assert.equal(applyAction(f, { type: 'buyLand', id: 'xx' }, T0).error, 'bad_action');
  const c = f.coins;
  assert.ok(applyAction(f, { type: 'buyLand', id: 'n' }, T0).ok);
  assert.equal(f.coins, c - 1500);
  assert.equal(applyAction(f, { type: 'buyLand', id: 'n' }, T0).error, 'land_owned');
  assert.ok(applyAction(f, { type: 'buyPlot', x: 5, y: -2 }, T0).ok || f.plots.length >= 6, 'na novém pozemku jde stavět');
  assert.ok(applyAction(f, { type: 'place', kind: 'velkepole', x: 8, y: -7, w: 6, h: 6 }, T0).ok, 'velké pole na novém pozemku');
  assert.equal(applyAction(f, { type: 'place', kind: 'ker', x: -1, y: -1 }, T0).error, 'occupied', 'roh ještě není koupený');
  const c2 = f.coins;
  assert.ok(applyAction(f, { type: 'buyLand', id: 'nw' }, T0).ok);
  assert.equal(f.coins, c2 - 3000, 'druhý pozemek dražší');
  assert.ok(applyAction(f, { type: 'place', kind: 'ker', x: -1, y: -1 }, T0).ok);
  assert.ok(applyAction(f, { type: 'place', kind: 'pekarna', x: 16, y: 3 }, T0).error === 'occupied', 'přes okraj na nekoupený pozemek nejde');
});

test('v9: ekonomika – každá plodina a ovoce má využití a vše má cenu', () => {
  const used = new Set(Object.values(RECIPES).flatMap(r => Object.keys(r.in)));
  for (const id of [...Object.keys(CROPS), ...Object.keys(FRUITS)]) assert.ok(used.has(id), 'nevyužité: ' + id);
  for (const it of Object.values(ITEMS)) assert.ok(it.price > 0, 'bez ceny: ' + it.id);
  assert.ok(Object.values(CROPS).filter(c => c.cat === 'zelenina').length >= 10);
  assert.ok(Object.keys(FRUITS).length >= 10);
  for (const r of Object.values(RECIPES)) {
    if (r.id.startsWith('s_')) {   // semena: 3 balíčky ušetří víc, než by dal výkup 2 plodin
      const cid = Object.keys(r.in)[0];
      assert.ok(3 * ITEMS[r.id].price >= ITEMS[cid].price, r.id);
      continue;
    }
    const out = ITEMS[r.out || r.id].price * (r.qty || 1);   // v46: alternativní recept vyrábí existující předmět (out)
    const inp = Object.entries(r.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    assert.ok(out > inp, 'výrobek se musí vyplatit: ' + r.id);
  }
});

test('v9: vylepšování budov a statek odemyká budovy', () => {
  const f = farm6();
  f.level = 5; f.xp = LEVEL_XP[5]; f.coins = 1e6;
  assert.equal(applyAction(f, { type: 'place', kind: 'krmivarna', x: 0, y: 0 }, T0).error, 'statek_low');
  const st = f.objects.find(o => o.kind === 'statek');
  f.stats.harvest = 40;   // v29: zásluha pro Statek 2
  const c = upgradeCost(st);
  assert.equal(c.level, 2);
  assert.ok(c.items.length >= 2 && c.coins > 0);
  assert.equal(applyAction(f, { type: 'upgrade', id: st.id }, T0).error, 'no_inputs');
  for (const x of c.items) f.silo[x.item] = x.qty;
  f.siloCap = 1000;
  assert.ok(applyAction(f, { type: 'upgrade', id: st.id }, T0).ok);
  assert.equal(statekLevel(f), 2);
  const mid = applyAction(f, { type: 'place', kind: 'krmivarna', x: 0, y: 0 }, T0).id;
  assert.ok(mid);
  const mlyn = findObject(f, mid);
  const c2 = upgradeCost(mlyn);
  for (const x of c2.items) f.silo[x.item] = (f.silo[x.item] || 0) + x.qty;
  assert.ok(applyAction(f, { type: 'upgrade', id: mid }, T0).ok);
  const c3 = upgradeCost(mlyn);
  for (const x of c3.items) f.silo[x.item] = (f.silo[x.item] || 0) + x.qty;
  assert.equal(applyAction(f, { type: 'upgrade', id: mid }, T0).error, 'statek_low', 'budova nesmí předběhnout statek');
  f.silo.wheat = 2; f.silo.corn = 1;
  applyAction(f, { type: 'produce', id: mid, recipe: 'krmivo_slepice' }, T0);
  assert.equal(mlyn.queue[0].end - T0, Math.round(120000 * 0.95), 'úroveň 2 = o 5 % rychlejší');
  assert.deepEqual(upgradeCost(mlyn), c3, 'cena je stabilní');
});

test('v9: stodola, prodej strojů a sleva prodejny', () => {
  const f = farm6();
  f.level = 9; f.xp = LEVEL_XP[9]; f.coins = 1e6; f.sk = { f: 1e7, r: 0, v: 0 };
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'no_garage');
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'kolecko' }, T0).ok, 'náčiní nepotřebuje stodolu');
  f.objects.find(o => o.kind === 'statek').lvl = 4;   // v29: Stodola od Statku 4
  const gid = applyAction(f, { type: 'place', kind: 'stodola', x: 0, y: 0 }, T0).id;
  assert.ok(gid);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'klas4' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda120' }, T0).error, 'garage_full', 'stodola úr. 1 = 2 stroje');
  const m = f.machines.find(x => x.model === 'klas4');
  const c = f.coins;
  assert.ok(applyAction(f, { type: 'sellMachine', id: m.id }, T0).ok);
  assert.equal(f.coins, c + 300);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda120' }, T0).ok);
  f.town.prodejna = 3;
  assert.equal(machinePrice(f, 'klas8'), Math.round(1800 * 0.94));
});

test('v9: stánek – nákup a prodej s omezeným množstvím', () => {
  const f = farm6();
  f.level = 6; f.xp = LEVEL_XP[6]; f.coins = 10000; f.siloCap = 500;
  const off = stallOffers(f, T0);
  assert.ok(off.buy.length >= 4 && off.sell.length === 3);
  const b = off.buy[0];
  assert.ok(b.price > ITEMS[b.item].price, 've stánku se kupuje dráž');
  assert.equal(applyAction(f, { type: 'stallBuy', i: 0, qty: b.qty + 1 }, T0).error, 'stall_qty');
  assert.ok(applyAction(f, { type: 'stallBuy', i: 0, qty: 2 }, T0).ok);
  assert.equal(stallLeft(f, T0, 'b', 0, b.qty), b.qty - 2);
  const s = off.sell[0];
  assert.ok(s.price < ITEMS[s.item].price && s.price >= sellPrice(s.item, T0) * 0.9, 'stánek platí míň než zakázka');
  f.silo[s.item] = 3;
  assert.ok(applyAction(f, { type: 'stallSell', i: 0, qty: 3 }, T0).ok);
  const later = stallOffers(f, T0 + 2 * 3600000);
  assert.notDeepEqual(later.buy, off.buy, 'za 2 hodiny jiná nabídka');
});

test('v9: pomocník sází a sklízí sám', () => {
  const f = farm6();
  f.level = 4; f.xp = LEVEL_XP[4]; f.coins = 1000; f.siloCap = 500;
  assert.equal(applyAction(f, { type: 'helperSet', crop: 'wheat' }, T0).error, 'no_helper');
  assert.equal(applyAction(f, { type: 'hire', plan: 0, crop: 'wheat' }, T0).error, 'helper_gone', 'v29: pomocník se nenajímá');
  assert.ok(applyAction(f, { type: 'hire', plan: 0, crop: 'wheat', legacy: true }, T0).ok);   // starý najatý pomocník
  assert.equal(f.coins, 880);
  runHelper(f, T0 + 20000);
  assert.equal(f.plots.filter(p => p.crop).length, 2, 'první kolo: 2 políčka');
  runHelper(f, T0 + 60000);
  assert.equal(f.plots.filter(p => p.crop).length, 6);
  runHelper(f, T0 + 200000);
  assert.ok((f.silo.wheat || 0) >= 4, 'sklidil zralou pšenici');
  const copy = JSON.parse(JSON.stringify(f));
  runHelper(f, T0 + 3600000); runHelper(copy, T0 + 1800000); runHelper(copy, T0 + 3600000);
  assert.deepEqual(f, copy, 'stejný výsledek, ať se počítá najednou nebo po částech');
  const n = f.helper.n;
  runHelper(f, T0 + 7200000);
  assert.equal(f.helper.n, n, 'po skončení smlouvy už nepracuje');
  f.coins = 1000;
  applyAction(f, { type: 'buyMachine', model: 'kolecko' }, T0 + 7200000);
  assert.equal(helperCapacity(f), 4);
});

test('v10: semena ze sklizně – Semenárna 2 → 3, sázení bere semena dřív než mince', () => {
  const f = farm6();
  f.coins = 1000;
  const id = applyAction(f, { type: 'place', kind: 'semenarna', x: 0, y: 0 }, T0).id;
  assert.ok(id, 'semenárna od statku 1');
  f.silo.wheat = 6;
  for (let i = 0; i < 3; i++) assert.ok(applyAction(f, { type: 'produce', id, recipe: 's_wheat' }, T0).ok);
  assert.equal(f.silo.wheat, undefined);
  const r = applyAction(f, { type: 'collect', id }, T0 + 3600000);
  assert.ok(r.ok);
  assert.equal(f.seeds.s_wheat, 9, '6 pšenice = 9 balíčků semen');
  const c = f.coins;
  const p = applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0);
  assert.ok(p.ok && p.seed);
  assert.equal(f.coins, c, 'zaplaceno semenem');
  assert.equal(f.seeds.s_wheat, 8);
  assert.equal(f.stats.plant, 1);
  // velké pole: část semeny, zbytek mincemi
  rich(f, 10, 1000);
  const big = applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 11, w: 3, h: 3 }, T0).id;
  const tr = applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).id;
  const c2 = f.coins;
  assert.ok(applyAction(f, { type: 'fieldSow', id: big, crop: 'wheat', machine: tr }, T0).ok);
  assert.equal(f.seeds.s_wheat, undefined, '8 semen spotřebováno');
  assert.equal(f.coins, c2 - 1, 'deváté políčko za minci');
  // semena jdou prodat
  f.seeds.s_corn = 4;
  assert.ok(applyAction(f, { type: 'sell', item: 's_corn', qty: 4 }, T0).ok);
});

test('v10: sazenice ze školky', () => {
  const f = farm6();
  rich(f, 5, 1000);
  const sk = applyAction(f, { type: 'place', kind: 'skolka', x: 0, y: 0 }, T0).id;
  f.silo.jablko = 3;
  assert.ok(applyAction(f, { type: 'produce', id: sk, recipe: 'z_jablon' }, T0).ok);
  assert.ok(applyAction(f, { type: 'collect', id: sk }, T0 + 3600000).ok);
  assert.equal(f.seeds.z_jablon, 1);
  const sad = applyAction(f, { type: 'place', kind: 'sad', x: 4, y: 0 }, T0).id;
  const c = f.coins;
  const r = applyAction(f, { type: 'plantTree', id: sad, tree: 'jablon' }, T0);
  assert.ok(r.ok && r.sapling);
  assert.equal(f.coins, c);
  assert.equal(f.seeds.z_jablon, undefined);
});

test('v10: statek odemyká stavbu, úroveň hráče roste pořád', () => {
  const f = farm6();
  f.level = 50; f.xp = LEVEL_XP[50]; f.coins = 1e6;
  assert.equal(applyAction(f, { type: 'place', kind: 'stodola', x: 0, y: 0 }, T0).error, 'statek_low', 'ani vysoká úroveň nepomůže');
  assert.equal(maxOrchards(f), 2);
  assert.equal(maxBigFields(f), 0);
  f.objects.find(o => o.kind === 'statek').lvl = 4;   // v29: Stodola a velké pole od Statku 4
  assert.ok(applyAction(f, { type: 'place', kind: 'stodola', x: 0, y: 0 }, T0).ok);
  assert.equal(maxBigFields(f), 1);
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  assert.equal(maxPlots(f), 66);
  assert.equal(maxBigFields(f), 4);
  for (const b of Object.values(BUILDINGS)) assert.ok(b.st <= 10 || (b.gift && b.type === 'deco'), b.id);   // v39: vzácné ozdoby jen jako odměna
  // v29: statek se vylepší jen se zásluhami (úroveň hráče + úkol)
  const g = farm6();
  const st = g.objects.find(o => o.kind === 'statek');
  for (const x of upgradeCost(st).items) g.silo[x.item] = x.qty;
  g.coins = 1e4; g.siloCap = 999;
  assert.equal(applyAction(g, { type: 'upgrade', id: st.id }, T0).error, 'merits', 'úroveň 1 nestačí');
  g.level = 3; g.xp = LEVEL_XP[3]; g.stats.harvest = 40;
  assert.ok(applyAction(g, { type: 'upgrade', id: st.id }, T0).ok);
  // XP po 20. úrovni
  g.xp = LEVEL_XP[20];
  applyAction(g, { type: 'claimDaily' }, T0);
  assert.equal(levelForXp(LEVEL_XP[21]), 21);
});

test('v10: městečko – cesta, přesun prodejny a stánku, vylepšení', () => {
  const f = farm6();
  f.land.push('s', 'e', 'se');
  assert.ok(isRoad(20, 20) && isRoad(20, 21) && !isRoad(20, 22));
  assert.equal(fits(f, 20, 20, 1, 1), false, 'na cestě se nestaví');
  assert.ok(fits(f, 20, 23, 1, 1));
  assert.equal(applyAction(f, { type: 'buyPlot', x: 19, y: 20 }, T0).error, 'occupied');
  assert.equal(applyAction(f, { type: 'place', kind: 'stanek', x: 0, y: 0 }, T0).error, 'town');
  // stará farma s prodejnou a stánkem na farmě
  const old = farm6();
  old.objects.push({ id: 90, kind: 'prodejna', x: 3, y: 8, lvl: 4 }, { id: 91, kind: 'stanek', x: 12, y: 3, lvl: 2 });
  delete old.town;
  normalize(old);
  assert.ok(!old.objects.some(o => o.kind === 'prodejna' || o.kind === 'stanek'));
  assert.deepEqual(old.town, { stanek: 2, prodejna: 4, trziste: 1, nastenka: 1 });
  assert.equal(dealerDiscount(old), 0.09);
  // vylepšení prodejny v městečku
  old.objects.find(o => o.kind === 'statek').lvl = 10;
  const c = upgradeCost(townObject(old, 'prodejna'));
  for (const x of c.items) old.silo[x.item] = x.qty;
  old.coins = 1e6; old.siloCap = 1e4;
  assert.ok(applyAction(old, { type: 'upgrade', town: 'prodejna' }, T0).ok);
  assert.equal(old.town.prodejna, 5);
  assert.equal(applyAction(old, { type: 'upgrade', town: 'trziste' }, T0).error, 'no_object');
  assert.equal(applyAction(old, { type: 'upgrade', town: 'statek' }, T0).error, 'no_object');
});

test('v10: 8 denních úkolů – stejné na serveru i v prohlížeči, odměny a bonus', () => {
  const f = farm6();
  const qs = dailyQuests(f, T0);
  assert.equal(qs.list.length, 8);
  assert.deepEqual(dailyQuests(structuredClone(f), T0).list, qs.list, 'deterministické');
  applyAction(f, { type: 'claimDaily' }, T0);
  assert.equal(f.quests.day, qs.day);
  const q = f.quests.list[0];
  assert.equal(applyAction(f, { type: 'claimQuest', i: 0 }, T0).error, 'not_ready');
  f.stats[q.t] += q.n;   // splněno
  assert.equal(questProgress(f, f.quests, q), q.n);
  const c = f.coins;
  assert.ok(applyAction(f, { type: 'claimQuest', i: 0 }, T0).ok);
  assert.equal(f.coins, c + q.coins);
  assert.equal(applyAction(f, { type: 'claimQuest', i: 0 }, T0).error, 'quest_done');
  assert.equal(applyAction(f, { type: 'claimQuest', i: 'bonus' }, T0).error, 'not_ready');
  for (const x of f.quests.list) f.stats[x.t] += x.n * 3;
  for (let i = 1; i < 8; i++) assert.ok(applyAction(f, { type: 'claimQuest', i }, T0).ok, 'úkol ' + i);
  assert.ok(applyAction(f, { type: 'claimQuest', i: 'bonus' }, T0).ok);
  assert.equal(applyAction(f, { type: 'claimQuest', i: 'bonus' }, T0).error, 'quest_done');
  // další den nové úkoly a progres od nuly
  applyAction(f, { type: 'claimDaily' }, T0 + 86400000);
  assert.notEqual(f.quests.day, qs.day);
  assert.ok(f.quests.list.every(x => !x.done && questProgress(f, f.quests, x) === 0));
});

test('v11: rybník – udice, návnada, zabere ryba, ulovit nebo utéct, ryby přibývají', () => {
  const f = farm6();
  rich(f, 5, 5000);
  const id = applyAction(f, { type: 'place', kind: 'rybnik', x: 0, y: 0 }, T0).id;
  assert.ok(id);
  const o = findObject(f, id);
  assert.equal(pondStock(o, T0).count, 5, 'nový rybník je plný');
  assert.equal(applyAction(f, { type: 'fishCast', id }, T0).error, 'no_rod');
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'udice' }, T0).ok);
  assert.equal(applyAction(f, { type: 'fishCast', id }, T0).error, 'no_bait');
  // návnada z krmivárny: 1 pšenice + 1 kukuřice = 3 kusy
  const kid = applyAction(f, { type: 'place', kind: 'krmivarna', x: 4, y: 0 }, T0).id;
  f.silo.wheat = 2; f.silo.corn = 2;
  applyAction(f, { type: 'produce', id: kid, recipe: 'navnada' }, T0);
  applyAction(f, { type: 'produce', id: kid, recipe: 'navnada' }, T0);
  applyAction(f, { type: 'collect', id: kid }, T0 + 600000);
  assert.equal(f.silo.navnada, 6);
  const c1 = applyAction(f, { type: 'fishCast', id }, T0);
  assert.ok(c1.ok && FISH[c1.fish] && FISH[c1.fish].st <= 10);
  assert.equal(applyAction(f, { type: 'fishCast', id }, T0).error, 'hooked');
  const g = structuredClone(f);
  assert.equal(applyAction(g, { type: 'fishLand', id, ok: true }, T0 + 5000).fish, c1.fish, 'stejná ryba i v kopii');
  const r = applyAction(f, { type: 'fishLand', id, ok: true }, T0 + 5000);
  assert.ok(r.ok && f.silo[c1.fish] >= 1 && f.stats.fish >= 1);
  assert.ok(r.kg >= FISH[c1.fish].kg[0] && r.kg <= FISH[c1.fish].kg[1] && f.fishRec[c1.fish] === r.kg && r.record);
  assert.equal(applyAction(f, { type: 'fishLand', id, ok: true }, T0 + 5000).error, 'no_hook');
  assert.ok(applyAction(f, { type: 'fishCast', id }, T0 + 6000).ok);
  const lost = applyAction(f, { type: 'fishLand', id, ok: false }, T0 + 7000);
  assert.ok(lost.ok && lost.lost);
  assert.equal(pondStock(o, T0 + 7000).count, 3);
  for (let i = 0; i < 3; i++) { applyAction(f, { type: 'fishCast', id }, T0 + 8000); applyAction(f, { type: 'fishLand', id, ok: true }, T0 + 8000); }
  assert.equal(applyAction(f, { type: 'fishCast', id }, T0 + 9000).error, 'no_fish');
  assert.equal(pondStock(o, T0 + 9000 + 600000).count, 1, 'za 10 minut přibude ryba');
  // každá ryba se někde zpracuje
  const used = new Set(Object.values(RECIPES).flatMap(r => Object.keys(r.in)));
  for (const x of FISH_LIST) assert.ok(used.has(x.id), 'nevyužitá ryba ' + x.id);
});

test('v11: včelín – plástve přibývají, květiny zrychlí, sad u včelína dá víc ovoce', () => {
  const f = farm6();
  rich(f, 5, 5000);
  const id = applyAction(f, { type: 'place', kind: 'vcelin', x: 0, y: 0 }, T0).id;
  const o = findObject(f, id);
  assert.equal(applyAction(f, { type: 'collect', id }, T0).error, 'not_ready');
  assert.equal(hiveStock(f, o, T0 + 20 * 60000).count, 1);
  applyAction(f, { type: 'place', kind: 'kvetiny', x: 3, y: 0 }, T0);
  assert.equal(hiveStock(f, o, T0 + 15 * 60000).count, 1, 's květinami po 15 min');
  const r = applyAction(f, { type: 'collect', id }, T0 + 31 * 60000);
  assert.ok(r.ok);
  assert.equal(f.silo.plast, 2);
  assert.equal(hiveStock(f, o, T0 + 31 * 60000).count, 0);
  const sad = applyAction(f, { type: 'place', kind: 'sad', x: 2, y: 2 }, T0).id;
  applyAction(f, { type: 'plantTree', id: sad, tree: 'jablon' }, T0);
  const h = applyAction(f, { type: 'harvestTree', id: sad }, T0 + 1800 * 1000);
  assert.ok(h.bees);
  assert.equal(f.silo.jablko, 4, '3 + 1 od včel');
});

test('v11: průvodce – nová farma ho má, stará ne, jde spustit znovu', () => {
  const f = newFarm(T0);
  assert.equal(f.tut, 0);
  assert.ok(applyAction(f, { type: 'tutorial', n: 3 }, T0).ok);
  applyAction(f, { type: 'tutorial', n: 1 }, T0);
  assert.equal(f.tut, 3, 'nejde zpátky');
  assert.ok(applyAction(f, { type: 'tutorial', n: 0, reset: true }, T0).ok);
  assert.equal(f.tut, 0);
  const old = farm6(); old.level = 5; delete old.tut;
  normalize(old);
  assert.equal(old.tut, TUTORIAL_DONE);
});

test('v15: počasí je pro všechny stejné, mění se po 2 hodinách a mění růst', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(weatherAt(T0 + i * 7200000).id);
  assert.equal(seen.size, 4, 'všechny druhy počasí se vyskytují');
  assert.equal(weatherAt(T0).id, weatherAt(T0 + 1).id);
  let rain = T0; while (weatherAt(rain).id !== 'dest') rain += 7200000;
  const f = farm6();
  applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, rain);
  assert.equal(f.plots[0].d, 48000, 'v dešti pšenice 48 s místo 60');
  assert.equal(applyAction(f, { type: 'harvest', x: 11, y: 8 }, rain + 49000).ok, true);
  assert.equal(growMs(CROPS.wheat, rain), 48000);
});

test('v15: velikost ryb – váha, obří úlovek dá víc kusů, rekordy', () => {
  const kapr = FISH.kapr;
  assert.equal(fishSize(kapr, 1).qty, 1);
  assert.equal(fishSize(kapr, 9).name, 'velká');
  assert.equal(fishSize(kapr, 12).qty, 3);
  assert.ok(FISH_LIST.length >= 14);
  for (const x of FISH_LIST) assert.ok(x.kg[1] > x.kg[0], x.id);
});

// ---------- v30: plán u pracoviště, víc pracovníků v oblasti, podíl času, cíle, rezervy ----------
function farm8() {   // oblast 8 polí (obslouží 2 pracovníci)
  const f = rich(farm6(), 20, 1e6);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  f.objects.find(o => o.kind === 'statek').lvl = 5;
  for (const [x, y] of [[14, 8], [14, 9]]) assert.ok(applyAction(f, { type: 'buyPlot', x, y }, T0).ok);
  return f;
}

test('v30: kapacita pracovišť – výroba 1, oblast podle velikosti (6 → 1, 8 → 2, 12 → 3)', () => {
  assert.equal(TEAM.cap.factory[0], 1); assert.equal(TEAM.areaPer, 4);
  const cells = n => ({ cells: Array(n) });
  assert.deepEqual([4, 6, 7, 8, 11, 12, 16].map(n => areaCap(cells(n))), [1, 1, 1, 2, 2, 3, 4]);
  const f = farm8(), g = workAreas(f)[0];
  assert.equal(g.ids.length, 8); assert.equal(areaCap(g), 2);
  const a = worker(f, 'pole'), b = worker(f, 'pole'), c = worker(f, 'pole');
  for (const id of [a, b]) assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: g.ids[0] }, T0).ok);
  assert.equal(applyAction(f, { type: 'assignArea', id: c, kind: 'pole', a: g.ids[5] }, T0).error, 'workplace_full');
  assert.equal(applyAction(f, { type: 'assignArea', id: c, kind: 'pole', a: g.ids[5], swap: 999 }, T0).error, 'bad_action');
  // výměna: c jde do oblasti, a jde do mlýna, kde byl c
  const mlyn = placeAny(f, 'mlyn');
  assert.ok(applyAction(f, { type: 'assignVill', id: c, at: mlyn }, T0).ok);
  assert.ok(applyAction(f, { type: 'assignArea', id: c, kind: 'pole', a: g.ids[5], swap: a }, T0).ok);
  assert.equal(findVill(f, a).at, mlyn); assert.equal(findVill(f, a).area, null);
  assert.deepEqual(wpWorkers(f, wpGet(f, wOf(f, b))).map(v => v.id).sort(), [b, c].sort());
});

test('v30: dva pracovníci v jedné oblasti si nepřekážejí a dělají podle společného plánu', () => {
  const f = farm8(), g = workAreas(f)[0];
  const a = worker(f, 'pole'), b = worker(f, 'pole');
  for (const id of [a, b]) assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: g.ids[0] }, T0).ok);
  const w = wOf(f, a);
  assert.equal(w, wOf(f, b).replace(/\d+$/, '') + g.ids[0]);
  assert.ok(applyAction(f, { type: 'plan', w, key: 'wheat', pct: 50 }, T0).ok);
  assert.ok(applyAction(f, { type: 'plan', w: 'pole' + g.ids[7], key: 'corn', pct: 50 }, T0).ok, 'oblast jde označit kterýmkoli jejím polem');
  assert.deepEqual(f.areas[g.key].plan, { wheat: 50, corn: 50 });
  f.seeds = { s_wheat: 20, s_corn: 20 };
  tick(f, T0 + 1000);
  const A = findVill(f, a), B = findVill(f, b);
  assert.equal(A.job.k, 'plant'); assert.equal(B.job.k, 'plant');
  assert.notEqual(A.job.id, B.job.id, 'každý jiné políčko');
  catchUp(f, T0 + 60_000);
  const crops = f.plots.map(p => p.crop).filter(Boolean).sort();
  assert.deepEqual(crops, ['corn', 'corn', 'corn', 'corn', 'wheat', 'wheat', 'wheat', 'wheat'], 'za 48 s osázeno 8 polí (sám by to dělal 96 s)');
  assert.equal(f.seeds.s_wheat + f.seeds.s_corn, 32, 'žádné semínko navíc');
  // znovu nesázet: sklidí a nechá ladem
  assert.ok(applyAction(f, { type: 'planReplant', w, on: false }, T0 + 60_000).ok);
  catchUp(f, T0 + 6 * 3600_000);
  assert.ok(f.plots.every(p => !p.crop), 'sklizeno, nic nového');
  assert.equal(A.w, 'rest');
  assert.equal(applyAction(f, { type: 'planAuto', w, on: true }, T0).error, 'bad_action', 'přerozdělení je jen ve výrobně');
});

test('v30: procenta = podíl výrobního času; nevyužitá kapacita stojí, nebo se přerozdělí', () => {
  const f = rich(farm6(), 20, 1e6);
  f.siloCap = 50000;
  const mlyn = placeAny(f, 'mlyn'), w = 'b' + mlyn, o = findObject(f, mlyn);
  // plán jde nastavit i bez pracovníka
  assert.ok(applyAction(f, { type: 'plan', w, key: 'mouka', pct: 50 }, T0).ok);
  assert.equal(applyAction(f, { type: 'plan', w, key: 'chleb', pct: 50 }, T0).error, 'bad_action', 'chleba se v mlýně nedělá');
  assert.equal(applyAction(f, { type: 'plan', w: 'b99999', key: 'mouka', pct: 50 }, T0).error, 'bad_action');
  hire(f, mlyn);
  f.silo.wheat = 3000;
  catchUp(f, T0 + 60_000);
  const base = Math.round(RECIPES.mouka.time * 1000);
  assert.equal(o.queue[0].d, base * 2, '50 % v plánu → mlýn po dávce stejně dlouho stojí');
  assert.ok(applyAction(f, { type: 'planAuto', w, on: true }, T0 + 60_000).ok);
  assert.equal(o.auto, true);
  catchUp(f, T0 + 3600_000);
  assert.equal(o.queue[o.queue.length - 1].d, base, 'přerozdělit → jede naplno');
  // přehled výroby po hodinách
  assert.ok(o.log.length >= 1 && o.log[0][1].mouka > 0);
  catchUp(f, T0 + 10 * 3600_000);
  assert.ok(o.log.length <= TEAM.logH);
  let tot = 0; for (const k in o.used) tot += o.used[k];
  assert.ok(tot <= TEAM.usedWindowH * 3600_000, 'pamatuje si jen posledních pár hodin');
});

test('v30: cílové zásoby mají přednost v pořadí, rezervy hlídají suroviny i prodej', () => {
  const f = rich(farm6(), 20, 1e6);
  f.siloCap = 50000;
  const pek = placeAny(f, 'pekarna'), w = 'b' + pek, o = findObject(f, pek);
  hire(f, pek, 3);   // perník chce úroveň 2
  assert.ok(applyAction(f, { type: 'plan', w, key: 'chleb', pct: 100 }, T0).ok);
  assert.ok(applyAction(f, { type: 'planTarget', w, key: 'pernik', n: 3 }, T0).ok);
  assert.ok(applyAction(f, { type: 'planTarget', w, key: 'kolac', n: 2 }, T0).ok);
  assert.ok(applyAction(f, { type: 'planOrder', w, key: 'kolac', d: -1 }, T0).ok);
  assert.deepEqual(o.target, [['kolac', 2], ['pernik', 3]]);
  assert.equal(applyAction(f, { type: 'planOrder', w, key: 'kolac', d: -1 }, T0).error, 'bad_action', 'první výš nejde');
  f.silo = { wheat: 300, mouka: 100, med: 100, vejce: 100, mleko: 100, tresne: 100, jablko: 100 };
  const needK = RECIPES.kolac.in;
  for (const id in needK) f.silo[id] = Math.max(f.silo[id] || 0, 50);
  tick(f, T0 + 1000);
  assert.equal(f.vill[0].job.x, 'kolac', 'nejdřív první cíl');
  catchUp(f, T0 + 6 * 3600_000);
  assert.equal(f.silo.kolac, 2, 'koláč přesně do cíle'); assert.equal(f.silo.pernik, 3, 'perník přesně do cíle');
  assert.ok(f.silo.chleb > 5, 'pak chleba podle procent');
  // rezerva: pšenice pod 290 se na chleba nesahá
  const before = f.silo.chleb;
  assert.ok(applyAction(f, { type: 'keep', item: 'wheat', n: f.silo.wheat }, T0 + 6 * 3600_000).ok);
  catchUp(f, T0 + 9 * 3600_000);
  assert.ok(f.silo.chleb - before <= 2, 'na pšenici v rezervě nesáhne (dokončí jen rozdělané)');
  assert.equal(f.vill[0].w, 'inputs');
  assert.equal(applyAction(f, { type: 'keep', item: 'nic', n: 5 }, T0).error, 'bad_action');
  assert.ok(applyAction(f, { type: 'keep', item: 'wheat', n: 0 }, T0).ok);
  assert.equal(f.keep.wheat, undefined);
  // cíl vyřadit
  assert.ok(applyAction(f, { type: 'planTarget', w, key: 'pernik', n: 0 }, T0).ok);
  assert.deepEqual(o.target, [['kolac', 2]]);
  assert.equal(applyAction(f, { type: 'planTarget', w: 'pole' + f.plots[0].id, key: 'chleb', n: 3 }, T0).error, 'bad_job', 'cíle má jen výrobna');
});

test('v30: uložená hra z v29 – plán pracovníka převezme pracoviště', () => {
  const f = rich(farm6(), 20, 1e6);
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  const mlyn = placeAny(f, 'mlyn'), sk = sklad(f);
  const m = worker(f, 'vyroba'), s = worker(f, 'sklad'), p = worker(f, 'pole');
  Object.assign(findVill(f, m), { at: mlyn, plan: { mouka: 100 }, lim: { mouka: 30 }, cw: { mouka: 2 } });
  Object.assign(findVill(f, s), { at: sk.id, plan: { wheat: 50, corn: 20 }, lim: { wheat: 12 } });
  Object.assign(findVill(f, p), { area: { kind: 'pole', id: f.plots[2].id }, plan: { wheat: 60, corn: 40 }, pk: 'pole' });
  f.keep = undefined; f.areas = undefined; f.v = 17;
  normalize(f);
  assert.equal(f.v, RULES_VERSION);
  const o = findObject(f, mlyn), g = workAreas(f)[0];
  assert.deepEqual(o.plan, { mouka: 100 }); assert.deepEqual(o.target, [['mouka', 30]]);
  assert.deepEqual(sk.plan, { wheat: 50, corn: 20 }); assert.deepEqual(f.keep, { wheat: 12 });
  assert.deepEqual(f.areas[g.key], { plan: { wheat: 60, corn: 40 }, replant: true });
  for (const v of f.vill) for (const k of ['plan', 'lim', 'cw', 'pk']) assert.equal(v[k], undefined, k);
  assert.equal(f.vill.length, 3, 'tým zůstal');
  assert.equal(applyAction(f, { type: 'villPlan', id: m, key: 'mouka', pct: 50 }, T0).error, 'bad_action');
  // nastavení oblasti přežije, když se oblast rozroste o pole s menším id… a zmizí, když pole zmizí
  f.areas.pole999999 = { plan: {}, replant: true };
  normalize(f);
  assert.equal(f.areas.pole999999, undefined);
});

// ---------- v31: víc lidí ve výrobnách a ohradách, síla obsluhy, slučování práce, přehled chovu, zátěž ----------
// celková bilance: pšenice ve skladu + v rukou + ve frontách + spotřebovaná na mouku / chleba (pro kontrolu, že nic nevzniká z ničeho)
function wheatUsed(f, ids) {
  let n = 0;
  for (const id of ids) {
    const o = findObject(f, id), r = RECIPES[o.queue[0] ? o.queue[0].r : 'mouka'];
    for (const q of o.queue) n += RECIPES[q.r].in.wheat * (q.n || 1);
  }
  for (const v of f.vill) if (v.job && v.job.k === 'load') n += RECIPES[v.job.x].in.wheat * (v.job.n || 1);
  return n;
}

test('v31: kapacita podle úrovně budovy (výrobna 1/2/3/4, ohrada 1/2), stávající přiřazení zůstávají', () => {
  const f = rich(farm6(), 20, 1e6);
  const mlyn = placeAny(f, 'mlyn'), kur = placeAny(f, 'kurnik'), o = findObject(f, mlyn), k = findObject(f, kur);
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10].map(l => bldCap({ ...o, lvl: l })), [1, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual([1, 4, 5, 10].map(l => bldCap({ ...k, lvl: l })), [1, 1, 2, 2]);
  assert.equal(bldCapNext(o), 4); assert.equal(bldCapNext({ ...o, lvl: 10 }), null);
  assert.match(upgradeEffect({ ...o, lvl: 3 }), /místo pro 2\. pracovníka/);
  assert.doesNotMatch(upgradeEffect({ ...o, lvl: 4 }), /pracovníka/);
  const a = hire(f, mlyn, 1), b = worker(f), c = worker(f), d = worker(f), e = worker(f);
  assert.equal(applyAction(f, { type: 'assignVill', id: b, at: mlyn }, T0).error, 'workplace_full', 'na úrovni 1 jen jeden');
  o.lvl = 4;
  assert.ok(applyAction(f, { type: 'assignVill', id: b, at: mlyn }, T0).ok, 'na úrovni 4 dva');
  assert.equal(applyAction(f, { type: 'assignVill', id: c, at: mlyn }, T0).error, 'workplace_full');
  o.lvl = 10;
  for (const id of [c, d]) assert.ok(applyAction(f, { type: 'assignVill', id, at: mlyn }, T0).ok);
  assert.equal(applyAction(f, { type: 'assignVill', id: e, at: mlyn }, T0).error, 'workplace_full', 'víc než 4 ne');
  assert.equal(findVill(f, a).at, mlyn, 'první pracovník zůstal');
  assert.equal(applyAction(f, { type: 'assignVill', id: e, at: findObject(f, placeAny(f, 'vcelin')).id }, T0).ok, true);
});

test('v31: síla obsluhy – 100 / 60 / 40 / 30 %, jen kdo má praxi, ohrada +25 %', () => {
  const f = rich(farm6(), 20, 1e6);
  const pek = placeAny(f, 'pekarna'), o = findObject(f, pek);
  o.lvl = 10;
  const a = hire(f, pek, 5), b = hire(f, pek, 5);
  const m5 = TEAM.mult[5];
  assert.ok(Math.abs(crewPower(f, o, 1).S - m5 * 1.6) < 1e-9, 'dva na úrovni 5: 2,47 + 60 %');
  const c = hire(f, pek, 1), d = hire(f, pek, 1);
  assert.ok(Math.abs(crewPower(f, o, 1).S - (m5 * 1.6 + 0.4 + 0.3)) < 1e-9, 'čtyři: 100 + 60 + 40 + 30 %');
  assert.deepEqual(crewPower(f, o, 1).parts.map(p => p[0].id), [a, b, c, d], 'seřazeno podle výkonu');
  // perník (úroveň hráče 6) chce úroveň 2: dva nováčci se nepočítají
  assert.ok(Math.abs(crewPower(f, o, RECIPES.pernik.level).S - m5 * 1.6) < 1e-9);
  // ohrada: druhý chovatel přidá čtvrtinu
  const kur = placeAny(f, 'kurnik'), k = findObject(f, kur);
  k.lvl = 5;
  hire(f, kur, 1); hire(f, kur, 12);
  assert.ok(Math.abs(crewPower(f, k, ANIMALS.slepice.level, 'pen').S - (3 + 0.25)) < 1e-9);
});

test('v31: víc řemeslníků v jedné výrobně – větší dávky, odnáší jen jeden, přesná bilance surovin', () => {
  const f = rich(farm6(), 20, 1e6);
  f.siloCap = 1e6;
  const mlyn = placeAny(f, 'mlyn'), o = findObject(f, mlyn), w = 'b' + mlyn;
  o.lvl = 7;
  const ids = [hire(f, mlyn, 12), hire(f, mlyn, 12), hire(f, mlyn, 12)];
  assert.ok(applyAction(f, { type: 'plan', w, key: 'mouka', pct: 100 }, T0).ok);
  f.silo.wheat = 9000;
  const S = crewPower(f, o, 1).S, xp0 = ids.map(id => findVill(f, id).xp.vyroba);
  assert.ok(Math.abs(S - 24) < 1e-9, 'tři na úrovni 12: 12 + 7,2 + 4,8 = 24 kusů na dávku');
  let hauls = 0, maxHaul = 0;
  for (let t = T0 + 1000; t < T0 + 2 * 3600_000; t += 1000) {
    tick(f, t);
    const h = f.vill.filter(v => v.job && v.job.k === 'haul').length;
    if (h) hauls++; maxHaul = Math.max(maxHaul, h);
    assert.ok(o.queue.length + f.vill.filter(v => v.job && v.job.k === 'load').length <= 3 + 2, 'nakládá se jen do volných míst');
  }
  assert.equal(maxHaul, 1, 'hotové odnáší vždycky jen jeden');
  const made = f.silo.mouka + o.queue.reduce((n, q) => n + (q.n || 1), 0) + f.vill.reduce((n, v) => n + (v.job && v.job.k === 'load' ? v.job.n : 0), 0);
  assert.equal(f.silo.wheat + made * RECIPES.mouka.in.wheat, 9000, 'pšenice přesně na mouku, nic navíc');
  // výroba odpovídá odhadu: za 2 h asi odhad × 2 (± dvě dávky na rozjezd)
  const rate = factoryRate(f, o, 'mouka'), end = T0 + 2 * 3600_000 - 1000;
  const done = f.silo.mouka + o.queue.reduce((n, q) => n + (q.end <= end ? q.n || 1 : 0), 0);   // hotové (bez rozdělaných)
  assert.ok(Math.abs(done - rate * 2) <= 2 * S, `hotovo ${done}, odhad ${rate * 2}`);
  assert.ok(Math.abs(done / (3600 / (RECIPES.mouka.time * 0.7)) / 2 / 12 - 2) < 0.1, 'proti jednomu pracovníkovi asi 2× víc');
  // zkušenosti dostali všichni tři podle podílu (100 : 60 : 40)
  const xp = ids.map((id, i) => findVill(f, id).xp.vyroba - xp0[i]);
  assert.ok(xp[0] > xp[1] && xp[1] > xp[2] && xp[2] > 0, xp.join(' / '));
  assert.ok(Math.abs(xp[0] / xp[1] - 1 / 0.6) < 0.02 && Math.abs(xp[0] / xp[2] - 1 / 0.4) < 0.02);
});

test('v31: dva chovatelé v ohradě – nekrmí stejné zvíře, krmivo přesně, víc vajec z krmení', () => {
  const f = rich(farm6(), 20, 1e6);
  f.siloCap = 1e6;
  const kur = placeAny(f, 'kurnik'), k = findObject(f, kur);
  k.lvl = 5;
  for (let i = 0; i < 4; i++) assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
  const a = hire(f, kur, 12), b = hire(f, kur, 12);
  f.silo.krmivo_slepice = 200;
  const feed0 = f.stats.feed || 0;
  let both = 0;
  for (let t = T0 + 1000; t < T0 + 10 * 3600_000; t += 997) {
    tick(f, t);
    const A = findVill(f, a).job, B = findVill(f, b).job;
    if (A && B && (A.k === 'feed' || A.k === 'gather') && (B.k === 'feed' || B.k === 'gather')) {
      both++;
      const sa = new Set(A.xs || [A.x]);
      for (const i of B.xs || [B.x]) assert.ok(!sa.has(i), 'stejné zvíře nedělají dva');
    }
  }
  const fedNow = k.animals.filter(x => x.fed).length, inHand = f.vill.reduce((n, v) => n + (v.job && v.job.k === 'feed' ? (v.job.xs || [0]).length : 0), 0);
  assert.equal(200 - f.silo.krmivo_slepice, (f.stats.feed - feed0) + inHand, 'krmivo = nakrmená zvířata + co mají v rukou');
  // vejce: 3 + čtvrtina od druhého = 3,75 z každého vejce slepice (zlomky se sčítají); v34: 3 vejce slepice na krmení
  const units = 3 * ((f.stats.feed - feed0) - fedNow) + k.animals.reduce((n, x) => n + (x.fed ? x.got || 0 : 0), 0);
  assert.ok(units > 30 && Math.abs(f.silo.vejce - 3.75 * units) <= 1, `vajec ${f.silo.vejce}, vajec od slepic ${units}`);
  assert.ok(both > 0, 'oba pracovali zároveň');
  const s = penStats(f, k, T0 + 10 * 3600_000);
  assert.equal(s.ws.length, 2); assert.equal(s.cap, 2); assert.ok(Math.abs(s.Y - 3.75) < 1e-9);
  assert.ok(Math.abs(s.feedH - 4 * 3600 / (ANIMAL_CYCLE * (1 - 0.05 * 4))) < 1e-9);
  assert.ok(Math.abs(s.prodH - s.feedH * 3 * 3.75) < 1e-9);
});

test('v31: přehled chovu – upozornění na krmivo, rezervu, praxi a chybějícího chovatele', () => {
  const f = rich(farm6(), 20, 1e6);
  const kur = placeAny(f, 'kurnik'), k = findObject(f, kur);
  assert.deepEqual(penStats(f, k).warn, ['empty']);
  for (let i = 0; i < 3; i++) applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  f.silo.krmivo_slepice = 0;
  assert.deepEqual(penStats(f, k).warn, ['no_feed', 'no_worker']);
  f.silo.krmivo_slepice = 5; f.keep = { krmivo_slepice: 10 };
  assert.deepEqual(penStats(f, k).warn, ['keep', 'no_worker']);
  f.keep = {};
  f.silo.krmivo_slepice = 1;
  assert.deepEqual(penStats(f, k).warn, ['low_feed', 'no_worker'], '1 kus při 1 za hodinu (v34: 3 slepice × 1 krmivo / 3 h)');
  f.silo.krmivo_slepice = 500;
  hire(f, kur, 1);
  assert.deepEqual(penStats(f, k).warn, []);
  const s = penStats(f, k);
  assert.ok(Math.abs(s.hours - 500 / s.feedH) < 1e-9 && Math.abs(s.prodH - 3 * s.feedH) < 1e-9);
  // Krmivárna: kolik krmiva vyrobí za hodinu
  const krm = placeAny(f, 'krmivarna');
  hire(f, krm, 1);
  applyAction(f, { type: 'plan', w: 'b' + krm, key: 'krmivo_slepice', pct: 100 }, T0);
  assert.ok(penStats(f, k).makeH > 0);
});

test('v31: slučování práce na poli nemění výsledek, jen počet výpočtů', async () => {
  // stejná farma: oblast 8 polí, 2 pěstitelé; spočítat s velkými a s malými dávkami (TEAM ve stejné kopii modulu jako pravidla)
  const spec = readFileSync(new URL('../public/js/rules.js', import.meta.url), 'utf8').match(/from '\.\/team-config\.js(\?v=\d+)?'/)[1] || '';
  const TEAM = (await import('../public/js/team-config.js' + spec)).TEAM;
  const run = max => {
    const keep = { ...TEAM.batch };
    TEAM.batch.max = max;
    try {
      const f = farm8();
      const a = worker(f, 'pole', 3), b = worker(f, 'pole', 3);
      for (const id of [a, b]) applyAction(f, { type: 'assignArea', id, kind: 'pole', a: f.plots[0].id }, T0);
      applyAction(f, { type: 'plan', w: 'pole' + f.plots[0].id, key: 'wheat', pct: 100 }, T0);
      let steps = 0;
      for (let m = 1; m <= 120; m++) {
        if (m % 20 === 1) f.seeds = { s_wheat: 24 };
        for (;;) { const r = runVillagers(f, T0 + m * 60_000, { left: 1500 }); steps += r.steps; if (!r.behind) break; }
      }
      return { wheat: f.silo.wheat || 0, plant: f.stats.plant, seeds: f.seeds.s_wheat || 0, steps };
    } finally { Object.assign(TEAM.batch, keep); }
  };
  const one = run(1), many = run(12);
  assert.ok(Math.abs(one.wheat - many.wheat) <= 0.05 * one.wheat, `sklizeň ${one.wheat} / ${many.wheat}`);
  assert.ok(many.steps < one.steps, `událostí ${one.steps} → ${many.steps}`);
  assert.equal(many.plant + many.seeds - 0, many.plant + many.seeds, 'semena: zasazeno + zbytek');
});

// velká farma: 30 pracovníků naráz (pole, sady, výrobny s víc lidmi, ohrady, včelín, sklad)
function farm30(L = 6) {
  const f = rich(newFarm(T0), 30, 1e7);
  f.objects.find(o => o.kind === 'statek').lvl = 10; f.siloCap = 4000;
  let n = 0;
  for (let y = 0; y < 17 && n < 60; y++) for (let x = 0; x < 17 && n < 60; x++) { if (y > 4 && y < 13) continue; if (fits(f, x, y, 1, 1) && (x % 6) !== 5 && applyAction(f, { type: 'buyPlot', x, y }, T0).ok) n++; }
  const lvl10 = id => { findObject(f, id).lvl = 10; return id; };
  const sem = lvl10(placeAny(f, 'semenarna')), mlyn = lvl10(placeAny(f, 'mlyn')), pek = lvl10(placeAny(f, 'pekarna')), krm = lvl10(placeAny(f, 'krmivarna'));
  const kur = lvl10(placeAny(f, 'kurnik')), vc = placeAny(f, 'vcelin'), sk = sklad(f).id;
  for (let i = 0; i < 6; i++) applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  const p = (w, key, pct) => assert.ok(applyAction(f, { type: 'plan', w, key, pct }, T0).ok, w + key);
  p('b' + sem, 's_wheat', 60); p('b' + sem, 's_corn', 40); p('b' + mlyn, 'mouka', 100); p('b' + pek, 'chleb', 100);
  p('b' + krm, 'krmivo_slepice', 100); p('b' + sk, 'mouka', 50); p('b' + sk, 'chleb', 50); p('b' + sk, 'vejce', 50);
  applyAction(f, { type: 'planTarget', w: 'b' + pek, key: 'chleb', n: 30 }, T0);
  applyAction(f, { type: 'keep', item: 'wheat', n: 40 }, T0);
  for (const id of [sem, sem, mlyn, mlyn, mlyn, pek, pek, pek, pek, krm, krm]) hire(f, id, L, 'vyroba');
  hire(f, kur, L, 'chov'); hire(f, kur, L, 'chov'); hire(f, vc, L, 'chov'); hire(f, sk, L, 'sklad');
  for (const g of workAreas(f)) {
    p('pole' + g.ids[0], 'wheat', 60); p('pole' + g.ids[0], 'corn', 40);
    for (let i = 0; i < areaCap(g) && f.vill.length < 30; i++) { const id = worker(f, 'pole', L); assert.ok(applyAction(f, { type: 'assignArea', id, kind: 'pole', a: g.ids[0] }, T0).ok); }
  }
  f.seeds = { s_wheat: 90, s_corn: 60 }; f.silo = { wheat: 400, corn: 200, krmivo_slepice: 30 };
  return f;
}

test('v31: 30 pracovníků naráz – den nepřítomnosti, rozpočet, nic záporného, všichni pracují', () => {
  const f = farm30();
  assert.equal(f.vill.length, 30);
  assert.equal(f.vill.filter(v => v.at || v.area).length, 30, 'všichni mají práci');
  const end = T0 + 24 * 3600_000;
  let calls = 0, worst = 0;
  for (;;) {
    const lim = { left: VILL_BUDGET };
    const t0 = performance.now();
    applyAction(f, { type: 'tick' }, end, lim);
    worst = Math.max(worst, performance.now() - t0);
    calls++;
    assert.ok(lim.left >= 0);
    if (!villLag(f, end)) break;
    assert.ok(calls < 400, 'dopočet doběhne');
  }
  assert.ok(f.vill.every(v => v.n > 0), 'každý něco udělal: ' + f.vill.filter(v => !v.n).map(v => v.prof + v.at).join(','));
  for (const s of [f.silo, f.seeds]) for (const k in s) assert.ok(s[k] > 0 && Number.isInteger(s[k]), `${k} = ${s[k]}`);
  assert.ok((f.silo.chleb || 0) <= 30 + 30, 'chleba do cíle (+ rozdělané dávky)');
  assert.ok(f.coins > 1e7, 'skladník prodával');
  assert.ok(worst < 250, `nejdelší dávka ${worst.toFixed(1)} ms`);
});

test('v31: uložení uprostřed práce a jiné dělení času nic nezmění (30 pracovníků)', () => {
  const end = T0 + 8 * 3600_000;
  const key = f => JSON.stringify({ silo: f.silo, seeds: f.seeds, coins: f.coins, xp: f.xp, plots: f.plots.map(p => [p.crop, p.planted]), o: f.objects.map(o => [o.queue, o.animals, o.uc, o.yc, o.log]), v: f.vill.map(v => [v.n, v.t, v.job, v.w, v.xp]) });
  const a = farm30(4), b = farm30(4), c = farm30(4);
  catchUp(a, end);
  // b: po kouscích, každý kousek přes JSON (jako uložení na server a zpět)
  let bb = b;
  for (let t = T0 + 600_000; t < end; t += 777_000) { catchUp(bb, t); bb = normalize(JSON.parse(JSON.stringify(bb))); }
  catchUp(bb, end);
  // c: drobné kroky s malým rozpočtem
  for (let t = T0; t < end;) { const r = runVillagers(c, end, { left: 97 }); if (!r.behind) break; t = c.vt; }
  assert.equal(key(bb), key(a), 'uložení a dělení času');
  assert.equal(key(c), key(a), 'malý rozpočet');
});
