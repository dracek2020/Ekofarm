// v45: ovoce – Sušárna ovoce (Statek 2), ovocné recepty v Pekárně, Džusárně a Mlékárně, Cukrárna (Statek 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, BUILDINGS, TREE_LIST, ITEMS, availableItems, orderableItems } from '../public/js/rules.js';

const NEW = ['krizaly', 'susene_hrusky', 'malinovy_caj', 'susene_svestky', 'ovocny_caj', 'susene_boruvky', 'susene_merunky', 'rozinky',
  'zavin', 'svestkove_knedliky', 'bublanina', 'angrestovy_kolac', 'malinovy_sirup', 'tresnovy_dzus', 'broskvovy_sirup', 'ovocny_jogurt',
  'ovocny_salat', 'jahodove_knedliky', 'zmrzlina', 'ovocny_dort'];

test('nové budovy a výrobky: Sušárna od Statku 2, Cukrárna od Statku 6, ceny z receptů', () => {
  assert.equal(BUILDINGS.susarna.st, 2); assert.equal(BUILDINGS.susarna.type, 'factory');
  assert.equal(BUILDINGS.cukrarna.st, 6); assert.equal(BUILDINGS.cukrarna.type, 'factory');
  assert.equal(NEW.length, 20);
  for (const id of NEW) {
    const r = RECIPES[id];
    assert.ok(r && ITEMS[id] && ITEMS[id].price > 0, id);
    const value = Object.entries(r.in).reduce((n, [x, k]) => n + ITEMS[x].price * k, 0);
    assert.ok(ITEMS[id].price >= value, `${id}: výrobek stojí aspoň jako suroviny`);
  }
  // Sušárna: první recepty hned se sadem, bez potřeby Vaření
  for (const id of ['krizaly', 'susene_hrusky', 'malinovy_caj']) {
    assert.equal(RECIPES[id].st, 2, id); assert.equal(RECIPES[id].cook, 1, id);
    assert.ok(availableItems(2, 1, 1).has(id) && !availableItems(1, 99, 99).has(id));
    assert.ok(orderableItems(2, 1, 1).includes(id), `${id} se může objevit v zakázce`);
  }
});

test('každé ovoce do Statku 5 se dá zpracovat už se Statkem, který ho odemkne', () => {
  for (const t of TREE_LIST.filter(x => x.st <= 5)) {
    const uses = Object.values(RECIPES).filter(r => r.in[t.fruit] && !r.id.startsWith('z_') && r.st <= t.st);
    assert.ok(uses.length, `${t.fruit} (Statek ${t.st})`);
    assert.ok(Math.min(...uses.map(r => r.cook)) <= 7, `${t.fruit}: aspoň jeden recept s Vařením nejvýš 7`);
  }
});
