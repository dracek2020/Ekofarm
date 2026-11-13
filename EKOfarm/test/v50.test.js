// v50: oprava „kreslení: ITEMS[first.r].icon“ – hotová dávka alternativního receptu (v46, např. krmivo_slepice__oves)
// shodila kreslení farmy, protože id receptu není id předmětu. Výrobek receptu je vždy recipeOut(r).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';

const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('W01 každý recept má výrobek s ikonou (i alternativní recepty)', () => {
  const alt = Object.values(R.RECIPES).filter(r => !R.ITEMS[r.id]);
  assert.ok(alt.length >= 5, 'alternativní recepty existují (krmné směsi z v46)');
  for (const r of Object.values(R.RECIPES)) {
    const it = R.ITEMS[R.recipeOut(r)];
    assert.ok(it && it.icon, r.id);
  }
});

test('W02 kreslení a okna neberou ikonu podle id receptu', () => {
  const o = src('public/js/objects.js'), p = src('public/js/panels.js');
  assert.doesNotMatch(o, /ITEMS\[first\.r\]\.icon/);
  assert.match(o, /ITEMS\[recipeOut\(RECIPES\[first\.r\]\)\]/);
  assert.doesNotMatch(p, /ITEMS\[j\.x\]\.icon/);
  // žádné další místo v kódu klienta nečte ITEMS[<něco>.r] bez recipeOut
  for (const f of ['objects.js', 'panels.js', 'main.js', 'render.js']) {
    for (const m of src('public/js/' + f).matchAll(/ITEMS\[(\w+)\.r\]\.(icon|name)/g)) assert.fail(`${f}: ITEMS[${m[1]}.r].${m[2]}`);
  }
});

test('W03 hotová ruční dávka alternativního receptu se dá vyzvednout a dá správný výrobek', () => {
  const T = 1_800_000_000_000;
  const f = R.newFarm(T);
  f.objects.find(x => x.kind === 'statek').lvl = 10;
  f.level = 40; f.xp = R.LEVEL_XP[40]; f.coins = 1e6; f.siloCap = 5000;
  const rec = R.RECIPES.krmivo_slepice__oves;
  let o = null;
  const b = R.BUILDINGS[rec.building];
  for (let y = 0; y < 17 && !o; y++) for (let x = 0; x < 17 && !o; x++) if (R.fits(f, x, y, b.w, b.h)) { assert.ok(R.applyAction(f, { type: 'place', kind: rec.building, x, y }, T).ok); o = f.objects[f.objects.length - 1]; }
  for (const [id, n] of Object.entries(rec.in)) { const s = R.isSeedItem(id) ? f.seeds : f.silo; s[id] = (s[id] || 0) + n * 3; }
  const r = R.applyAction(f, { type: 'produce', id: o.id, recipe: rec.id }, T);
  assert.ok(r.ok, JSON.stringify(r));
  const done = R.queueState(o, T + rec.time * 1000 + 1000).find(q => q.state === 'done');
  assert.equal(done.r, rec.id);
  assert.equal(R.ITEMS[done.r], undefined, 'id receptu není předmět – přesně tenhle případ padal');
  const before = f.silo[rec.out] || 0;
  assert.ok(R.applyAction(f, { type: 'collect', id: o.id }, T + rec.time * 1000 + 1000).ok);
  assert.equal(f.silo[rec.out], before + rec.qty);
});
