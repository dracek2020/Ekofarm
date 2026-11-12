// v37: úrovně 3× pomaleji (nikdo o úroveň nepřijde) a plodiny, stromy, zvířata, ryby a výrobky odemyká Statek.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, normalize, applyAction, LEVEL_XP, XP_K, levelForXp, RECIPES, BUILDINGS, CROP_LIST, TREE_LIST, ANIMAL_LIST, FISH_LIST, PRODUCTS,
  orderableItems, stOk, START_PLOTS, CROPS, FISH, TREES,
} from '../public/js/rules.js';

const T0 = 1_700_000_000_000;

test('úrovně (v38): 8× víc XP na každou úroveň než původně, úroveň 10 až za 2560 XP', () => {
  assert.equal(XP_K, 8);
  assert.equal(LEVEL_XP[2], 80);
  assert.equal(LEVEL_XP[10], 2560);
  assert.equal(LEVEL_XP[20], 16800);
});

test('úrovně: dosavadní hráč si úroveň i rozdělaný postup ponechá (v36 ×8, v37 ×8/3 při načtení)', () => {
  const old = { ...newFarm(T0), v: 21, level: 10, xp: 360 };   // původní měřítko: úroveň 10 = 320, 11 = 400 → půlka cesty
  const f = normalize(old);
  assert.equal(f.v, 23);
  assert.equal(f.level, 10);
  assert.equal(f.xp, 2880);
  assert.equal(levelForXp(f.xp), 10);
  const half = (f.xp - LEVEL_XP[10]) / (LEVEL_XP[11] - LEVEL_XP[10]);
  assert.equal(half, 0.5, 'postup v úrovni stejný');
  assert.equal(normalize(f).xp, 2880, 'násobí se jen jednou');
  const g = normalize({ ...newFarm(T0), v: 22, level: 10, xp: 1080 });   // z v37 (měřítko ×3)
  assert.equal(g.xp, 2880);
  assert.equal(g.level, 10);
  // další XP přidá úroveň až podle nové křivky
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  applyAction(f, { type: 'plant', x: START_PLOTS[0][0], y: START_PLOTS[0][1], crop: 'wheat' }, T0);
  applyAction(f, { type: 'harvest', x: START_PLOTS[0][0], y: START_PLOTS[0][1] }, T0 + 3600_000);
  assert.equal(f.level, 10);
});

test('Statek odemyká: výrobek nikdy dřív než jeho budova a suroviny, krmivo až se zvířetem', () => {
  for (const r of Object.values(RECIPES)) {
    assert.ok(r.st >= BUILDINGS[r.building].st, `${r.id}: ${r.st} < budova ${BUILDINGS[r.building].st}`);
    for (const i of Object.keys(r.in)) {
      const src = CROPS[i] || FISH[i] || RECIPES[i] || TREE_LIST.find(t => t.fruit === i) || ANIMAL_LIST.find(a => a.product === i);
      if (src && src.st) assert.ok(r.st >= src.st, `${r.id}: surovina ${i} až se Statkem ${src.st}`);
    }
  }
  for (const a of ANIMAL_LIST) {
    assert.ok(a.st >= BUILDINGS[a.home].st);
    assert.ok(RECIPES[a.feed].st <= a.st, `krmivo pro ${a.id} se dá vyrobit, když je zvíře`);
    assert.ok(RECIPES[a.feed].st === a.st || RECIPES[a.feed].st >= BUILDINGS[RECIPES[a.feed].building].st);
  }
  for (const f of FISH_LIST) assert.ok(f.st >= BUILDINGS.rybnik.st);
  for (const t of TREE_LIST) assert.ok(t.st >= BUILDINGS.sad.st, `${t.id}: strom až se sadem`);
  // každý odemčený výrobek ze zakázek jde opravdu vyrobit (budova je na té úrovni Statku k dispozici)
  for (let st = 1; st <= 10; st++) {
    for (const id of orderableItems(st)) {
      if (PRODUCTS[id] && RECIPES[id]) assert.ok(BUILDINGS[RECIPES[id].building].st <= st, `${id} na Statku ${st}`);
    }
  }
});

test('Statek odemyká: nová farma na Statku 1 nesází ani nevyrábí, co ještě nemá', () => {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.level = 30; f.xp = LEVEL_XP[30]; f.coins = 1e6;
  const [x, y] = START_PLOTS[0];
  assert.equal(applyAction(f, { type: 'plant', x, y, crop: 'carrot' }, T0).error, 'locked', 'i hráč úrovně 30 potřebuje Statek 2');
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'corn' }, T0).ok);
  assert.ok(CROP_LIST.filter(c => stOk(f, c)).every(c => c.st === 1));
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  assert.ok(stOk(f, CROPS.carrot) && stOk(f, TREES.jablon) && !stOk(f, CROPS.cibule));
});
