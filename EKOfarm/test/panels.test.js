// Každý panel se musí vykreslit bez chyby (chybějící funkce = panel nejde otevřít).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const v = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8').match(/main\.js\?v=(\d+)/)[1];
const R = await import(`../public/js/rules.js?v=${v}`);
const P = await import(`../public/js/panels.js?v=${v}`);

test('všechny panely se vykreslí', () => {
  const T = 1e12;
  const f = R.newFarm(T); f.level = 9; f.xp = 250; f.coins = 9999;
  const ids = [['pekarna', 0, 0], ['kurnik', 0, 4], ['ker', 4, 0], ['sad', 5, 0], ['velkepole', 0, 9]]
    .map(([kind, x, y]) => { const r = R.applyAction(f, { type: 'place', kind, x, y, w: 4, h: 4 }, T); assert.ok(r.ok, kind); return r.id; });
  R.applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T);
  const o = id => R.findObject(f, id);
  const out = [
    P.factoryHtml(f, o(ids[0]), T), P.penHtml(f, o(ids[1]), T), P.decoHtml(f, o(ids[2])),
    P.orchardHtml(f, o(ids[3]), T), P.bigfieldHtml(f, o(ids[4]), T), P.siloHtml(f), P.siloTitle(f),
    P.dealerHtml(f, T), P.shopHtml(f, 'zvirata'), P.shopHtml(f, 'farma'), P.buildHtml(f), P.statekHtml(f, 'X', T),
  ];
  for (const h of out) assert.ok(typeof h === 'string' && h.length > 5);
  assert.ok(P.landHtml(f, 'n').includes('buyLand'));
  assert.ok(P.landHtml(f, 'nw').includes('nejdřív sousední'));
  // velké pole ve všech stavech
  const tr = R.applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T).id;
  const kb = R.applyAction(f, { type: 'buyMachine', model: 'klas4' }, T).id;
  for (const m of ['pluh', 'secka', 'lis']) R.applyAction(f, { type: 'buyMachine', model: m }, T);
  f.siloCap = 9999;
  const fo = o(ids[4]);
  const steps = [
    t => R.applyAction(f, { type: 'fieldPlow', id: fo.id, machine: tr }, t),
    t => R.applyAction(f, { type: 'fieldSow', id: fo.id, crop: 'wheat', machine: tr }, t),
    null,
    t => R.applyAction(f, { type: 'fieldHarvest', id: fo.id, machine: kb }, t),
    t => R.applyAction(f, { type: 'fieldUnload', id: fo.id }, t),
    t => R.applyAction(f, { type: 'fieldBale', id: fo.id, machine: tr }, t),
    t => R.applyAction(f, { type: 'fieldUnload', id: fo.id }, t),
  ];
  let t = T;
  const seen = new Set();
  for (const step of steps) {
    if (step) assert.ok(step(t).ok);
    for (const dt of [1000, 100000, 3600000]) {
      seen.add(R.fieldState(fo, t + dt).state);
      assert.ok(P.bigfieldHtml(f, fo, t + dt).length > 10);
    }
    t += 3600000;
  }
  for (const s of ['plowing', 'empty', 'sowing', 'growing', 'ready', 'harvesting', 'unload', 'baling']) assert.ok(seen.has(s), 'stav ' + s);
});
