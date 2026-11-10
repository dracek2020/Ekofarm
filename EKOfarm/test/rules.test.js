import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherAt, WEATHER, growMs, fishSize, FISH, FISH_LIST, pondStock, hiveStock, TUTORIAL_DONE, townObject, dailyQuests, questProgress, isRoad, fits, dealerDiscount, maxOrchards, maxBigFields, BUILDINGS, LEVEL_XP, START_PLOTS, newFarm, applyAction, plotState, levelForXp, siloUsed, CROPS, SILO_START, maxPlots, objectAt, findObject, queueState, objectStatus, normalize, fieldState, freeMachine, treeState, marketMult, sellPrice, RECIPES, FRUITS, upgradeCost, statekLevel, machinePrice, stallOffers, stallLeft, runHelper, helperCapacity, canDeliver, orderReady, orderableItems, ITEMS, findVill, villAt, seedCap, workAreas } from '../public/js/rules.js';

const T0 = 1_700_000_000_000;
// hráč na dané úrovni s penězi, plně vylepšeným statkem a stodolou (pro testy strojů)
function rich(f, level, coins = 1e6) {
  f.level = level; f.xp = LEVEL_XP[level]; f.coins = coins;
  f.objects.find(o => o.kind === 'statek').lvl = 10;
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
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'corn' }, T0).error, 'locked');
  f.coins = 0;
  assert.equal(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'wheat' }, T0).error, 'no_coins');
});

test('úrovně', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(9), 1);
  assert.equal(levelForXp(10), 2);
  assert.equal(levelForXp(LEVEL_XP[50]), 50, 'úroveň roste i po 20');
  assert.equal(levelForXp(1e12), 200);
});

test('level up při sklizni', () => {
  const f = farm6();
  f.xp = 9;
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
  const c = applyAction(f, { type: 'collect', id }, T0 + 600000);
  assert.deepEqual(c.gained.items, [{ item: 'vejce', qty: 2 }]);
  assert.equal(c.gained.xp, 4);
});

test('plný sklad u výroby a rozšíření skladu', () => {
  const f = farm6();
  f.coins = 1000; f.level = 3; f.xp = 25;
  const id = applyAction(f, { type: 'place', kind: 'kurnik', x: 0, y: 0 }, T0).id;
  applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  f.silo.krmivo_slepice = 1;
  applyAction(f, { type: 'feed', id }, T0);
  f.silo.wheat = 50;
  assert.equal(applyAction(f, { type: 'collect', id }, T0 + 600000).error, 'silo_full');
  const coins = f.coins;
  assert.ok(applyAction(f, { type: 'upgradeSilo' }, T0).ok);
  assert.equal(f.coins, coins - 80);
  assert.equal(f.siloCap, 75);
  assert.ok(applyAction(f, { type: 'collect', id }, T0 + 600000).ok);
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
  f.level = 3; f.xp = 25;
  const id = applyAction(f, { type: 'place', kind: 'sad', x: 0, y: 0 }, T0).id;
  assert.equal(f.coins, 970);
  assert.ok(applyAction(f, { type: 'place', kind: 'sad', x: 1, y: 0 }, T0).ok);
  assert.equal(f.coins, 920, 'druhý sad dražší');
  assert.equal(applyAction(f, { type: 'place', kind: 'sad', x: 2, y: 0 }, T0).error, 'max_orchards');
  assert.equal(applyAction(f, { type: 'plantTree', id, tree: 'hrusen' }, T0).error, 'locked');
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

test('vesničané: nákup, vylepšení, práce ve výrobně, ohradě a obchodník', () => {
  const f = rich(farm6(), 20, 10000);
  // nákup a vylepšení: 100, pak 100 / 200 / 300 / 400, nejvýš úroveň 5
  const id = applyAction(f, { type: 'buyVill' }, T0).id;
  assert.equal(f.coins, 9900);
  for (const cost of [100, 200, 300, 400]) { const c = f.coins; assert.ok(applyAction(f, { type: 'upVill', id }, T0).ok); assert.equal(c - f.coins, cost); }
  assert.equal(findVill(f, id).lvl, 5);
  assert.equal(applyAction(f, { type: 'upVill', id }, T0).error, 'vill_lvl_max');
  // výrobna: Mlýn mele mouku z pšenice ze skladu, hotovou nosí do skladu
  const mlyn = applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 3 }, T0).id;
  assert.ok(mlyn, 'mlýn postaven');
  assert.equal(applyAction(f, { type: 'assignVill', id, at: f.objects.find(o => o.kind === 'statek').id }, T0).error, 'bad_job', 've Statku ne');
  assert.ok(applyAction(f, { type: 'assignVill', id, at: mlyn }, T0).ok);
  assert.ok(applyAction(f, { type: 'villJob', id, r: 'mouka' }, T0).ok);
  assert.equal(applyAction(f, { type: 'villJob', id, r: 'chleb' }, T0).error, 'bad_action', 'chleb se v mlýně nedělá');
  f.silo.wheat = 30; f.silo.mouka = 0;
  const need = RECIPES.mouka.in.wheat;
  applyAction(f, { type: 'nop' }, T0 + 3600 * 1000);           // hodina práce
  assert.ok(f.silo.mouka > 0, 'mouka je ve skladu');
  assert.equal((f.silo.wheat || 0) + (f.silo.mouka + findObject(f, mlyn).queue.length) * need, 30, 'pšenice se spotřebovala jen na mouku');
  // obchodník ve skladu prodává mouku, ale nechá si 2 kusy
  let sk = f.objects.find(o => o.kind === 'sklad');
  if (!sk) sk = findObject(f, applyAction(f, { type: 'place', kind: 'sklad', x: 12, y: 0 }, T0 + 3600 * 1000).id);
  const tid = applyAction(f, { type: 'buyVill' }, T0 + 3600 * 1000).id;
  assert.ok(applyAction(f, { type: 'assignVill', id: tid, at: sk.id }, T0 + 3600 * 1000).ok);
  assert.ok(applyAction(f, { type: 'villSell', id: tid, item: 'mouka', keep: 2 }, T0 + 3600 * 1000).ok);
  const coins = f.coins;
  applyAction(f, { type: 'nop' }, T0 + 5 * 3600 * 1000);
  assert.ok(f.coins > coins, 'obchodník vydělal');
  assert.ok(f.silo.mouka >= 2, 'nechal si 2 kusy');
  assert.ok(findVill(f, tid).earned > 0);
  // obchodník prodává jen jednou za 30 min (úroveň 1), najednou až 10 kusů
  assert.ok(applyAction(f, { type: 'villJob', id, r: null }, T0 + 5 * 3600 * 1000).ok, 'mlýn stojí');
  f.siloCap = 1000;
  f.silo.wheat = 100;
  assert.ok(applyAction(f, { type: 'villSell', id: tid, item: 'wheat', keep: 0 }, T0 + 5 * 3600 * 1000).ok);
  const tv = findVill(f, tid), n0 = tv.n, w1 = f.silo.wheat;
  applyAction(f, { type: 'nop' }, T0 + 7 * 3600 * 1000);              // 2 hodiny = 4 prodeje
  assert.ok(tv.n - n0 >= 3 && tv.n - n0 <= 4, `prodejů: ${tv.n - n0}`);
  assert.ok(w1 - f.silo.wheat <= (tv.n - n0) * 10, 'nejvýš 10 kusů najednou');
  assert.ok(w1 - f.silo.wheat > 0);
  // jedna budova = jeden vesničan: nový tam vystřídá starého
  const v3 = applyAction(f, { type: 'buyVill' }, T0).id;
  assert.ok(applyAction(f, { type: 'assignVill', id: v3, at: mlyn }, T0).ok);
  assert.equal(findVill(f, id).at, 0);
  assert.equal(villAt(f, mlyn).id, v3);
  // ohrada: krmí krmivem ze skladu a sbírá vejce
  const kurnik = applyAction(f, { type: 'place', kind: 'kurnik', x: 5, y: 3 }, T0).id;
  for (let i = 0; i < 2; i++) assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
  assert.ok(applyAction(f, { type: 'assignVill', id, at: kurnik }, T0 + 6 * 3600 * 1000).ok);
  f.silo.krmivo_slepice = 10; f.silo.vejce = 0;
  applyAction(f, { type: 'nop' }, T0 + 8 * 3600 * 1000);
  assert.ok(f.silo.vejce > 0, 'vejce ve skladu');
  assert.ok((f.silo.krmivo_slepice || 0) < 10, 'krmivo spotřebováno');
  // odvolat
  assert.ok(applyAction(f, { type: 'assignVill', id, at: 0 }, T0).ok);
  assert.equal(villAt(f, kurnik), null);
});

test('vesničané: dlouhá nepřítomnost se dopočítá rychle', () => {
  const f = rich(farm6(), 20, 1e6);
  const at = [];
  ['mlyn', 'pekarna', 'krmivarna', 'semenarna', 'konzervarna', 'mlekarna', 'olejna', 'cukrovar'].forEach((kind, i) => {
    const b = BUILDINGS[kind];
    let pos = null;
    for (let y = 0; y < 17 && !pos; y++) for (let x = 0; x < 17 && !pos; x++) if (fits(f, x, y, b.w, b.h)) pos = [x, y];
    const o = applyAction(f, { type: 'place', kind, x: pos[0], y: pos[1] }, T0);
    assert.ok(o.ok, kind);
    const v = applyAction(f, { type: 'buyVill' }, T0).id;
    for (let k = 0; k < 4; k++) applyAction(f, { type: 'upVill', id: v }, T0);
    applyAction(f, { type: 'assignVill', id: v, at: o.id }, T0);
    if (kind === 'mlyn') applyAction(f, { type: 'villJob', id: v, r: 'mouka' }, T0);
    at.push(o.id);
  });
  f.silo.wheat = 5000; f.siloCap = 100000;
  const t0 = performance.now();
  applyAction(f, { type: 'nop' }, T0 + 30 * 24 * 3600 * 1000);   // měsíc pryč
  const ms = performance.now() - t0;
  assert.ok(ms < 150, `dopočet trval ${ms.toFixed(1)} ms`);
  assert.ok(f.silo.mouka > 0);
});

test('zásoby ve Statku, nákup v městečku, farmáři v pracovních oblastech', () => {
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
  // farmáři: nejvýš 5, jen do oblastí
  const ids = [];
  for (let i = 0; i < 5; i++) ids.push(applyAction(f, { type: 'buyFarmer' }, T0).id);
  assert.equal(applyAction(f, { type: 'buyFarmer' }, T0).error, 'farm_max');
  const [a, b] = ids;
  assert.equal(applyAction(f, { type: 'assignVill', id: a, at: f.objects[0].id }, T0).error, 'bad_job');
  assert.ok(applyAction(f, { type: 'assignArea', id: a, kind: 'pole', a: f.plots[0].id }, T0).ok);
  assert.ok(applyAction(f, { type: 'farmerJob', id: a, crop: 'wheat' }, T0).ok);
  // sází jen se semeny ze zásoby; sklízí do skladu
  f.seeds = { s_wheat: 3 };
  for (const p of f.plots) { p.crop = null; }
  applyAction(f, { type: 'nop' }, T0 + 150 * 1000);              // první obchůzka (úroveň 1 = po 2 min)
  const area1 = workAreas(f)[0].ids.map(id => f.plots.find(p => p.id === id));
  assert.equal(area1.filter(p => p.crop === 'wheat').length, 3, 'zasadil jen 3 – víc semen nebylo');
  assert.equal(f.seeds.s_wheat, undefined);
  const coins = f.coins;
  f.silo.wheat = 0;
  applyAction(f, { type: 'nop' }, T0 + 24 * 3600 * 1000);
  assert.ok(f.silo.wheat > 0, 'sklizeno');
  assert.equal(f.coins, coins, 'za osivo neplatil');
  // druhý farmář do stejné oblasti → první se uvolní; větší oblast se nerozbije
  assert.ok(applyAction(f, { type: 'assignArea', id: b, kind: 'pole', a: f.plots[2].id }, T0).ok);
  assert.equal(findVill(f, a).area, null);
  f.coins += 1000;
  assert.ok(applyAction(f, { type: 'buyPlot', x: 16, y: 14 }, T0).ok);
  assert.equal(workAreas(f).filter(g => g.kind === 'pole').length, 2);
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
  f.coins = 1000; f.level = 3; f.xp = 25;
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
  assert.deepEqual(orderableItems(1).sort(), ['redkvicka', 'wheat']);
  const l5 = orderableItems(5);
  for (const id of ['corn', 'carrot', 'soy', 'chleb', 'krmivo_slepice', 'vejce', 'mleko', 'jablko', 'hruska', 'svestka']) assert.ok(l5.includes(id), id);
  assert.ok(!l5.includes('syr') && !l5.includes('tresne'));
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
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'locked');
  rich(f, 9, f.coins); f.objects = f.objects.filter(o => o.kind !== 'stodola'); f.objects.find(o => o.kind === 'statek').lvl = 1;
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'no_garage');
  rich(f, 9, f.coins);
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'owned');
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'klas8' }, T0).error, 'locked');
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
  f.objects.find(o => o.kind === 'statek').lvl = 3;   // statek 3 = jedno velké pole
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
  assert.equal(r.streak, 7); assert.equal(r.coins, 200);
  r = applyAction(f, { type: 'claimDaily' }, t0 + 7 * day);
  assert.equal(r.streak, 1, 'po 7. dni znovu od 1');
  r = applyAction(f, { type: 'claimDaily' }, t0 + 9 * day);
  assert.equal(r.streak, 1, 'vynechaný den = znovu');
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
  assert.ok(orderableItems(8).includes('cukr') && orderableItems(9).includes('buchty') && !orderableItems(8).includes('buchty'));
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
    const out = ITEMS[r.id].price * (r.qty || 1);
    const inp = Object.entries(r.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    assert.ok(out > inp, 'výrobek se musí vyplatit: ' + r.id);
  }
});

test('v9: vylepšování budov a statek odemyká budovy', () => {
  const f = farm6();
  f.level = 5; f.xp = LEVEL_XP[5]; f.coins = 1e6;
  assert.equal(applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 0 }, T0).error, 'statek_low');
  const st = f.objects.find(o => o.kind === 'statek');
  const c = upgradeCost(st);
  assert.equal(c.level, 2);
  assert.ok(c.items.length >= 2 && c.coins > 0);
  assert.equal(applyAction(f, { type: 'upgrade', id: st.id }, T0).error, 'no_inputs');
  for (const x of c.items) f.silo[x.item] = x.qty;
  f.siloCap = 1000;
  assert.ok(applyAction(f, { type: 'upgrade', id: st.id }, T0).ok);
  assert.equal(statekLevel(f), 2);
  const mid = applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 0 }, T0).id;
  assert.ok(mid);
  const mlyn = findObject(f, mid);
  const c2 = upgradeCost(mlyn);
  for (const x of c2.items) f.silo[x.item] = (f.silo[x.item] || 0) + x.qty;
  assert.ok(applyAction(f, { type: 'upgrade', id: mid }, T0).ok);
  const c3 = upgradeCost(mlyn);
  for (const x of c3.items) f.silo[x.item] = (f.silo[x.item] || 0) + x.qty;
  assert.equal(applyAction(f, { type: 'upgrade', id: mid }, T0).error, 'statek_low', 'budova nesmí předběhnout statek');
  f.silo.wheat = 3;
  applyAction(f, { type: 'produce', id: mid, recipe: 'mouka' }, T0);
  assert.equal(mlyn.queue[0].end - T0, Math.round(240000 * 0.95), 'úroveň 2 = o 5 % rychlejší');
  assert.deepEqual(upgradeCost(mlyn), c3, 'cena je stabilní');
});

test('v9: stodola, prodej strojů a sleva prodejny', () => {
  const f = farm6();
  f.level = 9; f.xp = LEVEL_XP[9]; f.coins = 1e6;
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'no_garage');
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'kolecko' }, T0).ok, 'náčiní nepotřebuje stodolu');
  f.objects.find(o => o.kind === 'statek').lvl = 3;
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
  assert.ok(applyAction(f, { type: 'hire', plan: 0, crop: 'wheat' }, T0).ok);
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
  f.objects.find(o => o.kind === 'statek').lvl = 3;
  assert.ok(applyAction(f, { type: 'place', kind: 'stodola', x: 0, y: 0 }, T0).ok);
  assert.equal(maxBigFields(f), 1);
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  assert.equal(maxPlots(f), 66);
  assert.equal(maxBigFields(f), 4);
  for (const b of Object.values(BUILDINGS)) assert.ok(b.st <= 7, b.id);
  // statek se dá vylepšit bez ohledu na úroveň hráče
  const g = farm6();
  const st = g.objects.find(o => o.kind === 'statek');
  for (const x of upgradeCost(st).items) g.silo[x.item] = x.qty;
  g.coins = 1e4; g.siloCap = 999;
  assert.ok(applyAction(g, { type: 'upgrade', id: st.id }, T0).ok, 'úroveň 1 stačí');
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
  assert.deepEqual(old.town, { stanek: 2, prodejna: 4, trziste: 1 });
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
  assert.ok(c1.ok && FISH[c1.fish] && FISH[c1.fish].level <= 5);
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
