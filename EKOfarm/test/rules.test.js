import test from 'node:test';
import assert from 'node:assert/strict';
import { START_PLOTS, newFarm, applyAction, plotState, levelForXp, siloUsed, CROPS, SILO_START, maxPlots, objectAt, findObject, queueState, objectStatus, normalize, fieldState, freeMachine, treeState, marketMult, sellPrice, canDeliver, orderReady, orderableItems, ITEMS } from '../public/js/rules.js';

const T0 = 1_700_000_000_000;
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
  assert.equal(levelForXp(100000), 15);
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
  assert.equal(f.coins, 50 + 4 * CROPS.wheat.price);
  assert.equal(siloUsed(f), 0);
  assert.equal(f.silo.wheat, undefined);
});

test('nákup pole', () => {
  const f = farm6();
  assert.equal(applyAction(f, { type: 'buyPlot', x: 11, y: 8 }, T0).error, 'occupied');
  assert.equal(applyAction(f, { type: 'buyPlot', x: 99, y: 8 }, T0).error, 'out_of_farm');
  assert.equal(applyAction(f, { type: 'buyPlot', x: 14, y: 8 }, T0).error, 'max_plots');
  f.level = 2; f.coins = 100;
  assert.ok(applyAction(f, { type: 'buyPlot', x: 14, y: 8 }, T0).ok);
  assert.equal(f.coins, 85);
  assert.ok(applyAction(f, { type: 'buyPlot', x: 14, y: 9 }, T0).ok);
  assert.equal(f.coins, 65);
  assert.equal(maxPlots(2), 12);
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
  assert.equal(applyAction(f, { type: 'place', kind: 'pekarna', x: 0, y: 0 }, T0).error, 'locked');
  f.level = 2; f.xp = 10;
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
  assert.deepEqual(f.objects.map(o => o.kind), ['statek']);
  assert.equal(f.siloCap, 50);
});

test('statek uprostřed a sklad k umístění zdarma', () => {
  const f = farm6();
  const st = f.objects.find(o => o.kind === 'statek');
  assert.deepEqual([st.x + 1.5, st.y + 1.5], [8.5, 8.5], 'střed statku = střed mřížky 17×17');
  assert.equal(applyAction(f, { type: 'move', id: st.id, x: 0, y: 0 }, T0).error, 'fixed');
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
  f.coins = 2000; f.level = 5; f.xp = 70;
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
  assert.equal(applyAction(f, { type: 'buyPlot', x: 0, y: 1 }, T0).error, 'max_plots');
  f.level = 2; f.coins = 15;
  assert.ok(applyAction(f, { type: 'buyPlot', x: 0, y: 1 }, T0).ok);
  assert.equal(f.coins, 0);
});

test('sad a stromy', () => {
  const f = farm6();
  f.coins = 1000;
  assert.equal(applyAction(f, { type: 'place', kind: 'sad', x: 0, y: 0 }, T0).error, 'locked');
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

test('zakázky: stejné na serveru i v prohlížeči, doručení a zrušení', () => {
  const a = newFarm(T0), b = JSON.parse(JSON.stringify(a));
  assert.equal(a.orders.length, 6);
  assert.ok(a.orders.every(o => o.items.every(x => x.item === 'wheat')), 'na úrovni 1 jen pšenice');
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
  assert.deepEqual(orderableItems(1), ['wheat']);
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
  f.level = 7; f.xp = 140;
  assert.ok(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T0).error, 'owned');
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'klas8' }, T0).error, 'locked');
  assert.equal(applyAction(f, { type: 'buyMachine', model: 'nic' }, T0).error, 'bad_action');
  assert.equal(f.coins, 4750);
  const old = { coins: 0, xp: 0, level: 5, silo: {}, plots: [], nextId: 9, objects: [
    { id: 1, kind: 'statek', x: 7, y: 7 }, { id: 5, kind: 'traktor', x: 0, y: 0 }, { id: 6, kind: 'kombajn', x: 0, y: 3 }] };
  normalize(old);
  assert.deepEqual(old.machines, [{ id: 5, model: 'brazda60' }, { id: 6, model: 'klas4' }]);
  assert.deepEqual(old.objects.map(o => o.kind), ['statek']);
});

test('velké pole: stavba s vlastní velikostí a cenou za políčko', () => {
  const f = farm6();
  f.coins = 5000;
  assert.equal(applyAction(f, { type: 'place', kind: 'velkepole', x: 0, y: 0, w: 4, h: 4 }, T0).error, 'locked');
  f.level = 5; f.xp = 70;
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
  f.coins = 5000; f.level = 5; f.xp = 70;
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
  f.coins = 20000; f.level = 9; f.xp = 250;
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
  f.coins = 5000; f.level = 8; f.xp = 190;
  assert.ok(applyAction(f, { type: 'plant', x: 11, y: 8, crop: 'beet' }, T0).ok);
  const mid = applyAction(f, { type: 'place', kind: 'mlyn', x: 0, y: 0 }, T0).id;
  f.silo.wheat = 3;
  assert.ok(applyAction(f, { type: 'produce', id: mid, recipe: 'mouka' }, T0).ok);
  assert.ok(applyAction(f, { type: 'collect', id: mid }, T0 + 240000).ok);
  assert.equal(f.silo.mouka, 1);
  assert.ok(orderableItems(8).includes('cukr') && orderableItems(8).includes('buchty'));
});
