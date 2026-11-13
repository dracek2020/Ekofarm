// v46: rozšíření ekonomiky (zadání EKOfarm_kompletni_rozsireni_pro_Claude) – akceptační testy A01–F10.
// Názvy testů začínají kódem z 04_TESTY/AKCEPTACNI_TESTY.md; tools/test-report.mjs z nich skládá EKOFARM_TEST_REPORT.md.
// Pravidla se načítají se VŠEMI skupinami zapnutými (globalThis.EKO_FLAGS před dynamickým importem);
// vypnuté skupiny ověřuje samostatný proces (test/fixtures/flags-off.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

globalThis.EKO_FLAGS = { eco_recipes: true, eco_planner: true, eco_byproducts: true, eco_straw: true, eco_crops: true, eco_mastery: true };
const R = await import('../public/js/rules.js');
const { ECO_FROM, ECO_STRAW, ECO_RECIPES, ECO_CROPS, ECO_BYPRODUCTS, BYPRODUCT_WORTH } = await import('../public/js/eco-config.js');
const { TEAM } = await import('../public/js/team-config.js');
const V45 = JSON.parse(readFileSync(new URL('./fixtures/v45-obsah.json', import.meta.url), 'utf8'));
const OFF = new URL('./fixtures/flags-off.mjs', import.meta.url).pathname;
const { RECIPES, ITEMS, CROPS, PRODUCTS, BUILDINGS, applyAction, normalize, newFarm, recipeOut } = R;

const T0 = ECO_FROM + 3_600_000;
const ECO = Object.values(RECIPES).filter(r => r.eco);
const NEW_ITEMS = [...ECO.filter(r => !r.out).map(r => r.id), ...R.BYPRODUCTS.map(b => b.id), ...ECO_CROPS.map(c => c.id)];

function farm(st = 10, cook = 50, fish = 50) {
  const f = newFarm(T0);
  for (const [x, y] of R.START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.objects.find(o => o.kind === 'statek').lvl = st;
  f.sk = { f: R.SKILL_XP[50], r: R.SKILL_XP[fish], v: R.SKILL_XP[cook] };
  f.level = 30; f.xp = R.LEVEL_XP[30]; f.coins = 1e6; f.siloCap = 5000;
  return f;
}
const bld = (f, kind) => { const o = { id: f.nextId++, kind, x: 0, y: 0, lvl: 1, queue: [] }; if (BUILDINGS[kind].type === 'pen') { delete o.queue; o.animals = []; } f.objects.push(o); return o; };
const give = (f, items) => { for (const [id, n] of Object.entries(items)) f.silo[id] = (f.silo[id] || 0) + n; };
// vyrobit n dávek receptu a odnést (vstupy dodá test)
function run(f, o, rid, n = 1, t = T0) {
  const r = RECIPES[rid];
  for (let i = 0; i < n; i++) {
    give(f, Object.fromEntries(Object.entries(r.in).map(([id, k]) => [id, k])));
    const p = applyAction(f, { type: 'produce', id: o.id, recipe: rid }, t);
    assert.ok(p.ok, `${rid}: ${p.error}`);
    t += r.time * 1000 + 1;
    const c = applyAction(f, { type: 'collect', id: o.id }, t);
    assert.ok(c.ok, `${rid} collect: ${c.error}`);
  }
  return t;
}
const clone = x => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------- A: obsah a odemykání
test('A01 nová id nekolidují se starými ani mezi sebou; opakovaná migrace nic nezdvojí', () => {
  const ids = ECO_RECIPES.map(r => r.id).concat(ECO_CROPS.map(c => c.id), ECO_BYPRODUCTS.map(b => b.id));
  assert.equal(new Set(ids).size, ids.length, 'unikátní mezi sebou');
  for (const id of ids) assert.ok(!(id in V45.recipes) && !(id in V45.prices), 'koliduje se starým id: ' + id);
  for (const c of ECO_CROPS) assert.ok(!V45.prices['s_' + c.id], 'osivo ' + c.id);
  for (const id of NEW_ITEMS) assert.ok(ITEMS[id] && ITEMS[id].name && !/^eco_/.test(id), id);
  const f = farm(); give(f, { otruby: 3, oves: 2 }); f.byc = { otruby: 4 };
  const a = JSON.stringify(normalize(clone(f))), b = JSON.stringify(normalize(normalize(clone(f))));
  assert.equal(a, b, 'normalize je idempotentní');
});

test('A02 nové recepty jen v existujících výrobnách, nikdy dřív než budova; bez budovy se nevyrábí', () => {
  for (const r of ECO) {
    const b = BUILDINGS[r.building];
    assert.ok(b && b.type === 'factory', r.id);
    assert.ok(r.st >= b.st, `${r.id} před budovou`);
  }
  assert.equal(R.BUILDING_LIST.filter(b => b.type === 'factory').length, Object.values(V45.buildings).length && 17, 'žádná nová výrobna (17 jako v45)');
  for (const id of Object.keys(BUILDINGS)) assert.ok(id in V45.buildings, 'nová budova ' + id);
  const f = farm(); give(f, { chleb: 1, salat: 1, redkvicka: 1 });
  assert.equal(applyAction(f, { type: 'produce', id: 999, recipe: 'farmarsky_sendvic' }, T0).error, 'no_object');
  const mlyn = bld(f, 'mlyn');
  assert.equal(applyAction(f, { type: 'produce', id: mlyn.id, recipe: 'farmarsky_sendvic' }, T0).error, 'bad_action', 'jen ve své budově');
});

test('A03 každý vstup je dosažitelný na Statku a Vaření receptu; o úroveň níž recept není', () => {
  for (const r of ECO) {
    const ok = R.availableItems(r.st, r.cook, 50);
    for (const x of Object.keys(r.in)) assert.ok(ok.has(x), `${r.id}: ${x} na Statku ${r.st}`);
    assert.ok(ok.has(recipeOut(r)), r.id);
    if (!r.out) {
      assert.ok(!R.availableItems(r.st - 1, 50, 50).has(r.id), `${r.id} o Statek níž`);
      if (r.cook > 1) assert.ok(!R.availableItems(r.st, r.cook - 1, 50).has(r.id) || R.recipesFor(r.id).some(x => x !== r && x.cook < r.cook), `${r.id} o Vaření níž`);
    }
  }
  // UI ukáže, co chybí (zámek Vaření / Statek)
  const f = farm(7, 1); const o = bld(f, 'pekarna');
  const P = import('../public/js/panels.js');
  return P.then(p => { const h = p.factoryHtml(f, o, T0); assert.ok(h.includes('Vaření 7') && h.includes('Statek')); });
});

test('A04 zakázky, Stánek a pohoštění nikdy nechtějí nezpřístupněnou novinku; dostupné novinky se objevují', () => {
  const seen = new Set();
  for (const [st, ck, fi] of [[1, 1, 1], [2, 1, 1], [3, 2, 1], [4, 6, 2], [6, 8, 5], [7, 10, 10], [8, 30, 20], [10, 50, 50]]) {
    const f = farm(st, ck, fi), ok = R.farmAvail(f);
    for (let i = 0; i < 40; i++) { f.orders = []; normalize(f); for (const o of f.orders) for (const x of o.items) { assert.ok(ok.has(x.item), `St ${st} V ${ck}: ${x.item}`); seen.add(x.item); } }
    for (let k = 0; k < 12; k++) { const so = R.stallOffers(f, T0 + k * 7_200_000); for (const x of [...so.buy, ...so.sell]) assert.ok(ok.has(x.item), `stánek ${x.item}`); }
    f.vill = Array.from({ length: 8 }, (_, i) => ({ id: 9000 + i }));
    for (const opt of R.adOffers(f)) for (const [id] of opt) assert.ok(ok.has(id), 'pohoštění ' + id);
  }
  assert.ok(NEW_ITEMS.filter(id => seen.has(id)).length >= 10, 'novinky se v zakázkách objevují: ' + NEW_ITEMS.filter(id => seen.has(id)).length);
  for (const b of R.BYPRODUCTS) assert.ok(!seen.has(b.id), 'vedlejší produkt nejde do zakázek');
});

test('A05 Farmářský sendvič: chléb + salát + ředkvička, spotřebuje existující chléb', () => {
  const f = farm(2, 1); const o = bld(f, 'pekarna');
  give(f, { chleb: 1, salat: 1, redkvicka: 1 });
  assert.ok(applyAction(f, { type: 'produce', id: o.id, recipe: 'farmarsky_sendvic' }, T0).ok);
  assert.equal(f.silo.chleb || 0, 0); assert.equal(f.silo.salat || 0, 0); assert.equal(f.silo.redkvicka || 0, 0);
  assert.ok(applyAction(f, { type: 'collect', id: o.id }, T0 + RECIPES.farmarsky_sendvic.time * 1000).ok);
  assert.equal(f.silo.farmarsky_sendvic, 1);
  assert.equal(RECIPES.farmarsky_sendvic.st, 2);
  assert.equal(R.farmAvail(farm(1)).has('farmarsky_sendvic'), false);
});

test('A06 Sójová mouka v Mlýně od St3, sójový chléb od St4 podle Vaření, sójový olej od St7', () => {
  assert.deepEqual([RECIPES.sojova_mouka.building, RECIPES.sojova_mouka.st], ['mlyn', 3]);
  assert.deepEqual([RECIPES.sojovy_chleb.st, RECIPES.sojovy_chleb.cook], [4, 6]);
  assert.deepEqual([RECIPES.sojovy_olej.building, RECIPES.sojovy_olej.st], ['olejna', 7]);
  assert.ok(R.availableItems(3, 2, 1).has('sojova_mouka') && !R.availableItems(2, 50, 50).has('sojova_mouka'));
  assert.ok(!R.availableItems(4, 5, 1).has('sojovy_chleb') && R.availableItems(4, 6, 1).has('sojovy_chleb'));
  assert.ok(!R.availableItems(6, 50, 50).has('sojovy_olej') && R.availableItems(7, 4, 1).has('sojovy_olej'));
});

test('A07 bramboráky a zelenina v oleji nepoužijí olej před Olejnou (St7)', () => {
  for (const id of ['bramboraky', 'zelenina_v_oleji', 'dynove_placicky']) {
    assert.ok(RECIPES[id].st >= BUILDINGS.olejna.st, id);
    assert.ok(!R.availableItems(BUILDINGS.olejna.st - 1, 50, 50).has(id), id);
  }
});

test('A08 višňová marmeláda až s cukrem (St8), višňový koláč bez cukru', () => {
  assert.ok(RECIPES.visnova_marmelada.in.cukr && RECIPES.visnova_marmelada.st >= BUILDINGS.cukrovar.st);
  assert.ok(!RECIPES.visnovy_kolac.in.cukr && RECIPES.visnovy_kolac.st === 4);
  assert.ok(R.availableItems(4, 8, 1).has('visnovy_kolac') && !R.availableItems(7, 50, 50).has('visnova_marmelada'));
});

test('A09 oves, len, petržel a kopr se sejí a sklízejí stejně jako ostatní plodiny (malé i velké pole)', () => {
  for (const c of ECO_CROPS) {
    const f = farm(); const [x, y] = R.START_PLOTS[0];
    assert.ok(applyAction(f, { type: 'plant', x, y, crop: c.id }, T0).ok, c.id);
    assert.equal(applyAction(f, { type: 'harvest', x, y }, T0 + 1000).error, 'not_ready');
    const p = R.findPlot(f, x, y);
    assert.ok(applyAction(f, { type: 'harvest', x, y }, p.planted + p.d + 1).ok);
    assert.equal(f.silo[c.id], 2, 'výnos 2');
    // velké pole se správným strojem
    const g = farm(); g.siloCap = 9999; bld(g, 'stodola');
    const tr = applyAction(g, { type: 'buyMachine', model: 'brazda60' }, T0).id, kb = applyAction(g, { type: 'buyMachine', model: 'klas4' }, T0).id;
    const fo = { id: g.nextId++, kind: 'velkepole', x: 0, y: 0, w: 4, h: 4, lvl: 1, soil: 'raw' }; g.objects.push(fo);
    assert.ok(applyAction(g, { type: 'fieldSow', id: fo.id, crop: c.id, machine: tr }, T0).ok);
    const ready = fo.readyAt + 1, right = c.harvester === 'combine' ? kb : tr, wrong = c.harvester === 'combine' ? tr : kb;
    assert.equal(applyAction(g, { type: 'fieldHarvest', id: fo.id, machine: wrong }, ready).error, 'wrong_machine');
    assert.ok(applyAction(g, { type: 'fieldHarvest', id: fo.id, machine: right }, ready).ok);
  }
});

test('A10 staré recepty, ceny, plodiny a budovy jsou beze změny (v45)', () => {
  for (const [id, s] of Object.entries(V45.recipes)) {
    const r = RECIPES[id];
    assert.ok(r, id);
    assert.deepEqual({ b: r.building, in: r.in, t: r.time, st: r.st, cook: r.cook, q: R.recipeQty(r), xp: r.xp }, s, id);
  }
  for (const [id, p] of Object.entries(V45.prices)) assert.equal(ITEMS[id].price, p, 'cena ' + id);
  for (const [id, c] of Object.entries(V45.crops)) assert.deepEqual({ st: CROPS[id].st, time: CROPS[id].time, price: CROPS[id].price, cost: CROPS[id].cost }, c, id);
  for (const [id, b] of Object.entries(V45.buildings)) assert.deepEqual({ st: BUILDINGS[id].st, cost: BUILDINGS[id].cost }, b, id);
});

test('A11 Bolen na bylinkách beze změny, Bolen s koprem je samostatný recept', () => {
  assert.deepEqual(RECIPES.bolen_bylinky.in, { bolen: 1, maslo: 1, cibule: 1 });
  assert.equal(ITEMS.bolen_bylinky.name, 'Bolen na bylinkách');
  assert.ok(RECIPES.bolen_kopr && RECIPES.bolen_kopr.in.kopr && ITEMS.bolen_kopr.name === 'Bolen s koprem');
  assert.notEqual(ITEMS.bolen_kopr.icon, ITEMS.bolen_bylinky.icon);
});

test('A12 Vaření 25/30/40 odemyká mistrovské recepty, Vaření 50 kosmetické ocenění; nic předem', () => {
  assert.deepEqual(['rybi_talir', 'slavnostni_dort', 'hostina'].map(id => RECIPES[id].cook), [25, 30, 40]);
  for (const id of ['rybi_talir', 'slavnostni_dort', 'hostina']) {
    const r = RECIPES[id];
    assert.equal(R.recipeOk(farm(10, r.cook - 1), r), false, id);
    assert.equal(R.recipeOk(farm(10, r.cook), r), true, id);
    const f = farm(10, r.cook - 1);
    for (let i = 0; i < 30; i++) { f.orders = []; normalize(f); for (const o of f.orders) assert.ok(!o.items.some(x => x.item === id), 'zakázka předem ' + id); }
  }
  const f = farm(10, 49);
  assert.equal(R.hasAward(f, 'mistr_kuchyne'), false);
  f.sk.v = R.SKILL_XP[50] - 1; const o = bld(f, 'pekarna');
  run(f, o, 'chleb', 1);
  assert.equal(R.hasAward(f, 'mistr_kuchyne'), true, 'ocenění na Vaření 50');
  assert.equal(f.aw.filter(x => x === 'mistr_kuchyne').length, 1);
  normalize(f); assert.equal(f.aw.length, 1, 'jen jednou');
  const g = farm(10, 50); normalize(g); assert.ok(R.hasAward(g, 'mistr_kuchyne'), 'dosavadní hráč s Vařením 50 ho dostane při načtení');
});

// ---------------------------------------------------------------- B: sklad, vedlejší produkty, recepty
test('B01 vstupy se odečtou přesně jednou, zásoby nikdy záporné', () => {
  const f = farm(); const o = bld(f, 'konzervarna');
  give(f, { hrach: 2, cesnek: 1 });
  assert.ok(applyAction(f, { type: 'produce', id: o.id, recipe: 'hrachova_pomazanka' }, T0).ok);
  assert.equal(applyAction(f, { type: 'produce', id: o.id, recipe: 'hrachova_pomazanka' }, T0).error, 'no_inputs');
  assert.ok(Object.values(f.silo).every(n => n > 0));
  const t = T0 + RECIPES.hrachova_pomazanka.time * 1000;
  assert.ok(applyAction(f, { type: 'collect', id: o.id }, t).ok);
  assert.equal(applyAction(f, { type: 'collect', id: o.id }, t).error, 'not_ready', 'podruhé nic');
  assert.equal(f.silo.hrachova_pomazanka, 1);
});

test('B02 počet kusů podle receptu (qty), ne vždy 1', () => {
  const f = farm(); const o = bld(f, 'krmivarna');
  run(f, o, 'krmivo_slepice__oves');
  assert.equal(f.silo.krmivo_slepice, 2, 'ovesná směs dává 2 krmiva');
  const s = bld(f, 'semenarna'); run(f, s, 's_oves');
  assert.equal(f.seeds.s_oves, 3, 'semena po 3');
});

test('B03 výrobek i vedlejší produkt se vejdou celé, jinak výroba počká a nic se neztratí', () => {
  const f = farm(); const m = bld(f, 'mlyn');
  let t = run(f, m, 'mouka', 4);
  f.siloCap = R.siloUsed(f) + 3;   // pro dávku je 3 místa (výrobek 1)
  give(f, { wheat: 3 }); f.siloCap += 3;
  assert.ok(applyAction(f, { type: 'produce', id: m.id, recipe: 'mouka' }, t).ok);
  f.siloCap = R.siloUsed(f) + 1;   // místo jen na mouku, ne na otruby
  t += RECIPES.mouka.time * 1000 + 1;
  const c = applyAction(f, { type: 'collect', id: m.id }, t);
  assert.ok(c.ok); assert.equal(f.silo.otruby || 0, 0, 'otruby se nevešly');
  assert.equal(f.byc.otruby, 5, 'počítadlo čeká');
  f.siloCap += 5; t = run(f, m, 'mouka', 1, t);
  assert.equal(f.silo.otruby, 1, 'vydají se příště'); assert.equal(f.byc.otruby, 1);
  // plný sklad: výrobek zůstane ve frontě
  give(f, { wheat: 3 }); assert.ok(applyAction(f, { type: 'produce', id: m.id, recipe: 'mouka' }, t).ok);
  f.siloCap = R.siloUsed(f);
  assert.equal(applyAction(f, { type: 'collect', id: m.id }, t + RECIPES.mouka.time * 1000 + 1).error, 'silo_full');
  assert.equal(m.queue.length, 1);
});

test('B04 otruby jen za hotové dávky mouky (1 za 5), ne při načtení ani náhledu', () => {
  const f = farm(); const m = bld(f, 'mlyn');
  run(f, m, 'mouka', 4);
  assert.equal(f.silo.otruby || 0, 0);
  normalize(f); R.planChain(f, 'mouka', 10, { now: T0 }); applyAction(f, { type: 'tick' }, T0 + 9e6);
  assert.equal(f.silo.otruby || 0, 0, 'načtení ani plán nic nedá');
  run(f, m, 'mouka', 1, T0 + 1e7);
  assert.equal(f.silo.otruby, 1);
  run(f, m, 'mouka', 9, T0 + 2e7);
  assert.equal(f.silo.otruby, 2); assert.equal(f.byc.otruby, 4);
});

test('B05 pokrutiny ze všech olejů dohromady, bez zdvojení', () => {
  const f = farm(); const o = bld(f, 'olejna');
  let t = run(f, o, 'olej', 2); t = run(f, o, 'sojovy_olej', 1, t); t = run(f, o, 'lneny_olej', 1, t);
  assert.equal(f.silo.pokrutiny, 1); assert.equal(f.byc.pokrutiny, 0);
  run(f, o, 'sl_olej', 3, t);
  assert.equal(f.silo.pokrutiny, 1); assert.equal(f.byc.pokrutiny, 3);
});

test('B06 řepné řízky 1 za 4 cukry, výlisky 1 za 6 vybraných džusů (mrkvová šťáva ne)', () => {
  const f = farm(); const c = bld(f, 'cukrovar'), d = bld(f, 'dzusarna');
  run(f, c, 'cukr', 8);
  assert.equal(f.silo.repne_rizky, 2);
  let t = run(f, d, 'dzus_mrkev', 6);
  assert.equal(f.silo.ovocne_vylisky || 0, 0);
  t = run(f, d, 'dzus_jablko', 3, t); run(f, d, 'most', 3, t);
  assert.equal(f.silo.ovocne_vylisky, 1);
  for (const b of R.BYPRODUCTS) assert.ok(Object.values(RECIPES).some(r => r.in[b.id]), 'má spotřebitele: ' + b.id);
});

test('B07 alternativní směsi vyrábí existující krmivo, ne nový předmět', () => {
  const feeds = new Set(R.ANIMAL_LIST.map(a => a.feed));
  const alts = Object.values(RECIPES).filter(r => r.out);
  assert.equal(alts.length, 5);
  for (const r of alts) { assert.ok(feeds.has(r.out), r.id); assert.ok(!ITEMS[r.id], 'žádný nový předmět ' + r.id); }
  const f = farm(); const k = bld(f, 'krmivarna');
  run(f, k, 'krmivo_prasata__pokrutiny');
  assert.equal(f.silo.krmivo_prasata, 1);
  assert.ok(R.stockOf(f, k, 'krmivo_prasata__pokrutiny') === R.stockOf(f, k, 'krmivo_prasata'), 'zásoba alternativního receptu = zásoba krmiva');
});

test('B08 + E11 vypnuté skupiny: hra jede dál, nic se nesmaže, po zapnutí se vše vrátí', () => {
  const f = farm(); const m = bld(f, 'mlyn'), p = bld(f, 'pekarna');
  give(f, { otruby: 2, oves: 5, farmarsky_sendvic: 3, wheat: 10, hostina: 1 });
  f.seeds.s_kopr = 2; f.byc = { otruby: 3 }; m.pod = undefined;
  give(f, { soy: 3 }); assert.ok(applyAction(f, { type: 'produce', id: m.id, recipe: 'sojova_mouka' }, T0).ok);
  give(f, { wheat: 3 }); assert.ok(applyAction(f, { type: 'produce', id: m.id, recipe: 'mouka' }, T0).ok);
  const [x, y] = R.START_PLOTS[1]; assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'oves' }, T0).ok);
  p.target = [['farmarsky_sendvic', 5], ['chleb', 4]];
  const now = T0 + 3_600_000;
  const out = JSON.parse(execFileSync(process.execPath, [OFF, 'farm', String(now)], { input: JSON.stringify(f) }).toString());
  assert.ok(Object.values(out.flags).every(v => v === false), 'v procesu je vše vypnuté');
  const g = out.farm;
  assert.ok(!out.res.some(x => String(x).startsWith('neznámé')), 've skladu nic neznámého');
  assert.ok(out.res.includes('ok'), 'sebrat a prodat jde: ' + out.res.join(','));
  assert.equal(g.silo.mouka, 1, 'stará dávka ve frontě se dokončila');
  assert.equal(g.hold.s.otruby, 2); assert.equal(g.hold.s.farmarsky_sendvic, 3); assert.equal(g.hold.s.s_kopr, 2); assert.equal(g.hold.s.s_oves, 1, 'zasetý oves se vrátí jako osivo');
  assert.equal(g.hold.q.length, 1, 'nová dávka odložená');
  assert.deepEqual(g.objects.find(o => o.id === p.id).target, [['chleb', 4]]);
  // zase zapnuto
  const h = normalize(clone(g));
  assert.equal(h.hold, undefined, 'vše vráceno');
  assert.equal(h.silo.otruby, 2); assert.equal(h.silo.farmarsky_sendvic, 3); assert.equal(h.seeds.s_kopr, 2); assert.equal(h.seeds.s_oves, 1);
  assert.equal(h.objects.find(o => o.id === m.id).queue.length, 1, 'odložená dávka zpátky ve frontě');
  assert.equal(h.byc.otruby, 3, 'počítadlo zůstalo');
});

test('E11 se všemi skupinami vypnutými je obsah hry přesně jako ve v45', () => {
  const snap = JSON.parse(execFileSync(process.execPath, [OFF, 'snapshot']).toString());
  assert.deepEqual(snap, V45);
});

test('B09 sláma a lis beze změny, sláma se spotřebuje jen dobrovolným vylepšením ohrady', () => {
  assert.ok(!Object.values(RECIPES).some(r => r.in.slama), 'žádný recept slámu nežere');
  const f = farm(); const k = bld(f, 'kurnik');
  give(f, { slama: 9 });
  assert.equal(applyAction(f, { type: 'penStraw', id: k.id }, T0).error, 'no_inputs');
  give(f, { slama: 1 });
  const coins = f.coins, before = R.animalCycleMs(k);
  assert.ok(applyAction(f, { type: 'penStraw', id: k.id }, T0).ok);
  assert.equal(f.silo.slama || 0, 0); assert.equal(f.coins, coins - ECO_STRAW.coins);
  assert.equal(R.animalCycleMs(k), Math.round(before * ECO_STRAW.cycle));
  give(f, { slama: 10 });
  assert.equal(applyAction(f, { type: 'penStraw', id: k.id }, T0).error, 'pod_done', 'jen jednou');
  assert.equal(applyAction(farm(3), { type: 'penStraw', id: k.id }, T0).error, 'no_object');
  const g = farm(3); const kg = bld(g, 'kurnik'); give(g, { slama: 10 });
  assert.equal(applyAction(g, { type: 'penStraw', id: kg.id }, T0).error, 'statek_low');
  const old = farm(); const ko = bld(old, 'kravin'); normalize(old);
  assert.equal(ko.pod, undefined, 'staré ohrady se samy nemění');
});

test('B10 + E02 opakované načtení v okamžiku dokončení dávky nic nepřidá', () => {
  const f = farm(); const m = bld(f, 'mlyn');
  let t = run(f, m, 'mouka', 4);
  give(f, { wheat: 3 }); applyAction(f, { type: 'produce', id: m.id, recipe: 'mouka' }, t);
  t += RECIPES.mouka.time * 1000;
  const saved = JSON.stringify(f);
  const a = normalize(JSON.parse(saved)); applyAction(a, { type: 'collect', id: m.id }, t);
  const b = normalize(JSON.parse(saved)); normalize(b); applyAction(b, { type: 'collect', id: m.id }, t);
  assert.equal(applyAction(b, { type: 'collect', id: m.id }, t).error, 'not_ready');
  assert.deepEqual([a.silo.otruby, a.silo.mouka], [b.silo.otruby, b.silo.mouka]);
  assert.equal(a.silo.otruby, 1);
});

test('E08 po aktualizaci nevzniknou vedlejší produkty za dobu nepřítomnosti před ní (dopočet týmu)', () => {
  const { f } = teamFarm(); delete f.byFrom;   // farma uložená ve v45: tým pracoval, hráč byl 10 h pryč
  const later = T0 + 10 * 3_600_000;
  for (let i = 0; i < 2000 && (i === 0 || R.villLag(f, later)); i++) applyAction(f, { type: 'tick' }, later, { left: R.VILL_BUDGET });
  assert.ok((f.silo.mouka || 0) > 100, 'tým za nepřítomnosti mlel');
  assert.equal(f.silo.otruby || 0, 0); assert.equal((f.byc || {}).otruby || 0, 0, 'za dobu před aktualizací nic');
  assert.equal(f.byFrom, later);
  const m = f.objects.find(o => o.kind === 'mlyn'); m.queue = []; f.vill = [];
  run(f, m, 'mouka', 5, later + 1);
  assert.equal(f.silo.otruby, 1, 'od teď normálně');
});

test('B11 + E08 rozpracované dávky z doby před zapnutím: původní výrobek, žádné vedlejší produkty zpětně', () => {
  const f = farm(); const m = bld(f, 'mlyn'); f.created = ECO_FROM - 1e8;
  for (let i = 0; i < 3; i++) m.queue.push({ r: 'mouka', end: ECO_FROM + 1000 * (i + 1), d: RECIPES.mouka.time * 1000 });   // začaly před ECO_FROM
  m.queue.push({ r: 'mouka', end: ECO_FROM - 10, d: RECIPES.mouka.time * 1000, n: 7, t: 1 });
  m.queue.sort((a, b) => a.end - b.end);
  normalize(f);
  assert.ok(applyAction(f, { type: 'collect', id: m.id }, ECO_FROM + 1e7).ok);
  assert.equal(f.silo.mouka, 10, 'všechny dávky dokončené');
  assert.equal(f.silo.otruby || 0, 0); assert.equal((f.byc || {}).otruby || 0, 0, 'nic zpětně');
});

test('B12 + F09 vedlejší produkty mají malou cenu a nedají se zneužít', () => {
  for (const b of R.BYPRODUCTS) {
    const it = ITEMS[b.id];
    const src = Math.min(...b.from.map(id => ITEMS[id].price));
    assert.ok(it.price * b.n / b.per <= src * 0.1, `${b.id}: hodnota na dávku ≤ 10 % výrobku`);
    const alt = Object.values(RECIPES).find(r => r.out && r.in[b.id]);
    const main = RECIPES[alt.out], val = inp => Object.entries(inp).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    const rest = { ...alt.in }; delete rest[b.id];
    assert.ok(it.price <= BYPRODUCT_WORTH * (val(main.in) - val(rest)) + 1e-9, b.id + ' cena ≤ 80 % nahrazené suroviny');
    assert.ok(R.marketMaxPrice({ item: b.id, qty: 1 }) <= 3 * it.price);
    assert.ok(!R.orderableItems(10, 50, 50).includes(b.id));
  }
});

test('B13 + E05 skladník neprodá rezervu ani zboží držené pro cílové zásoby (potvrzený plán)', () => {
  const f = farm(); const sk = f.objects.find(o => o.kind === 'sklad') || bld(f, 'sklad'); const m = bld(f, 'mlyn');
  sk.plan = { mouka: 100, wheat: 100 };
  give(f, { mouka: 30, wheat: 60 });
  const v = { id: 9001, prof: 'sklad', xp: { sklad: TEAM.xpLvl[TEAM.maxLvl] }, hist: [], at: sk.id };
  f.vill = [v];
  const before = R.tradeRound(f, v, T0);
  m.target = [['mouka', 40]];   // cíl 40 mouky: drží 30 mouky a pšenici na 10 dávek (30)
  f.keep.wheat = 10;   // (přímo – akce by spustila tým a skladník by hned prodával)
  const after = R.tradeRound(f, v, T0);
  const row = (x, id) => x.rows.find(r => r.item === id).want;
  assert.ok(row(before, 'mouka') > 0);
  assert.equal(row(after, 'mouka'), 0, 'mouka pod cílem se neprodá');
  assert.equal(row(after, 'wheat'), 30, 'pšenice: 60 − 30 na dávky (rezerva 10 je menší)');
});

// ---------------------------------------------------------------- C: plán výroby
test('C01 20 medovníků = 40 mouky + 20 medu + 40 vajec → 120 pšenice + 40 pláství', () => {
  const f = farm(); for (const k of ['pekarna', 'mlyn', 'medarna']) bld(f, k);
  const p = R.planChain(f, 'medovnik', 20, { now: T0 });
  const st = Object.fromEntries(p.steps.map(s => [s.rid, s.units]));
  assert.deepEqual(st, { medovnik: 20, mouka: 40, med: 20 });
  const miss = Object.fromEntries(p.missing.map(x => [x.id, x.n]));
  assert.deepEqual(miss, { wheat: 120, plast: 40, vejce: 40 });
  assert.equal(RECIPES.medovnik.in.mouka, 2); assert.equal(RECIPES.mouka.in.wheat, 3); assert.equal(RECIPES.med.in.plast, 2);
});

test('C02 + C03 plán odečte dostupné zásoby, ale ne rezervu', () => {
  const f = farm(); for (const k of ['pekarna', 'mlyn', 'medarna']) bld(f, k);
  give(f, { mouka: 10, med: 5 }); f.keep = { med: 5, mouka: 4 };
  const p = R.planChain(f, 'medovnik', 20, { now: T0 });
  const st = Object.fromEntries(p.steps.map(s => [s.rid, s.units]));
  assert.equal(st.mouka, 34, '40 − (10 − rezerva 4)');
  assert.equal(st.med, 20, 'med celý v rezervě');
  assert.deepEqual(p.use, [{ id: 'mouka', n: 6 }]);
  assert.deepEqual(Object.fromEntries(p.reserved.map(x => [x.id, x.n])), { mouka: 4, med: 5 });
  // zakázky jako rezerva (volitelně)
  f.keep = {}; f.orders = [{ items: [{ item: 'mouka', qty: 10 }], coins: 1, xp: 1, readyAt: 0 }];
  assert.equal(Object.fromEntries(R.planChain(f, 'medovnik', 20, { now: T0, orders: true }).steps.map(s => [s.rid, s.units])).mouka, 40);
});

test('C04 + C05 náhled nic nezmění; potvrzení jen nastaví cílové zásoby (fronty a sklad beze změny)', () => {
  const f = farm(); const pe = bld(f, 'pekarna'), ml = bld(f, 'mlyn'); bld(f, 'medarna');
  give(f, { mouka: 3, wheat: 3, vejce: 2, med: 1 }); assert.ok(applyAction(f, { type: 'produce', id: ml.id, recipe: 'mouka' }, T0).ok);
  const before = JSON.stringify(f);
  R.planChain(f, 'medovnik', 50, { now: T0, pref: 'cas', orders: true });
  assert.equal(JSON.stringify(f), before);
  pe.target = [['medovnik', 99]];
  const r = applyAction(f, { type: 'planApply', item: 'medovnik', qty: 20, pref: 'cena' }, T0);
  assert.ok(r.ok, r.error);
  assert.deepEqual(f.silo, JSON.parse(before).silo); assert.deepEqual(ml.queue, JSON.parse(before).objects.find(o => o.id === ml.id).queue);
  assert.deepEqual(pe.target, [['medovnik', 99]], 'vyšší dosavadní cíl zůstal');
  assert.ok(ml.target.some(([id, n]) => id === 'mouka' && n === 1 + 39), 'mouka: zásoba 1 + ve frontě + vyrobit');
});

test('C06 stejné poslední kusy se nepřidělí dvakrát (účetní kniha)', () => {
  const f = farm(); for (const k of ['uzenarstvi', 'pekarna']) bld(f, k);
  give(f, { maso: 3 });
  const p = R.planChain(f, 'hostina', 1, { now: T0 });   // klobása 2 maso + uzené 2 maso
  assert.deepEqual(p.use.find(x => x.id === 'maso'), { id: 'maso', n: 3 });
  assert.deepEqual(p.missing.find(x => x.id === 'maso').n, 1);
});

test('C07 dva recepty na stejné krmivo: volba hráče nebo deterministický výběr', () => {
  const f = farm(); bld(f, 'krmivarna');
  const a = R.planChain(f, 'krmivo_slepice', 10, { now: T0 }), b = R.planChain(f, 'krmivo_slepice', 10, { now: T0 });
  assert.deepEqual(a.steps, b.steps);
  assert.ok(a.steps[0].alt.length === 3, 'nabídne varianty');
  const c = R.planChain(f, 'krmivo_slepice', 10, { now: T0, pick: { krmivo_slepice: 'krmivo_slepice__otruby' } });
  assert.equal(c.steps[0].rid, 'krmivo_slepice__otruby');
  assert.ok(c.missing.some(x => x.id === 'otruby' && x.src === 'vedlejší produkt'));
  assert.equal(R.planChain(f, 'krmivo_slepice', 10, { now: T0, pref: 'cas' }).steps[0].rid, 'krmivo_slepice', 'nejrychleji = 2 min');
});

test('C08 cyklický recept skončí bezpečnou chybou', () => {
  const f = farm(); bld(f, 'mlyn');
  RECIPES.zz_a = { id: 'zz_a', building: 'mlyn', level: 1, in: { mouka: 1 }, time: 60, xp: 1, st: 1, cook: 1, out: 'wheat' };
  R.RECIPES_BY_OUT.wheat = [RECIPES.zz_a];
  try {
    const p = R.planChain(f, 'chleb', 5, { now: T0 });
    assert.ok(p.warn.some(w => w.k === 'cycle'));
    assert.ok(p.blocked);
  } finally { delete RECIPES.zz_a; delete R.RECIPES_BY_OUT.wheat; }
});

test('C09 odhad času podle dávek, obsluhy a vylepšení budovy', () => {
  const f = farm(); const pe = bld(f, 'pekarna');
  const a = R.planChain(f, 'chleb', 10, { now: T0 });
  assert.equal(a.steps[0].sec, 10 * RECIPES.chleb.time);
  pe.lvl = 3;
  assert.equal(R.planChain(f, 'chleb', 10, { now: T0 }).steps[0].sec, Math.round(10 * RECIPES.chleb.time * R.speedMult(pe)));
  f.vill = [{ id: 9001, prof: 'vyroba', xp: { vyroba: TEAM.xpLvl[TEAM.maxLvl] }, hist: [], at: pe.id }];
  const S = Math.floor(R.crewPower(f, pe, RECIPES.chleb.level).S);
  assert.ok(S >= 1);
  assert.equal(R.planChain(f, 'chleb', 10, { now: T0 }).steps[0].per, S);
  assert.ok(a.time.max >= a.time.min);
});

test('C11 plán nedovolí recept ani surovinu z vyšší úrovně', () => {
  const f = farm(5, 3); for (const k of ['rybarna', 'mlekarna']) bld(f, k);
  const p = R.planChain(f, 'bolen_kopr', 1, { now: T0 });
  assert.ok(p.blocked && p.warn.some(w => w.k === 'locked'));
  assert.equal(applyAction(f, { type: 'planApply', item: 'bolen_kopr', qty: 1 }, T0).error, 'plan_blocked');
  const g = farm(10, 50, 1); for (const k of ['rybarna', 'mlekarna']) bld(g, k);
  assert.ok(R.planChain(g, 'bolen_kopr', 1, { now: T0 }).warn.some(w => w.k === 'unavailable' && w.id === 'bolen'), 'bolen až s Rybařením 17');
});

test('C12 zboží nabídnuté na tržišti ani v zakázkách se jako dostupné nepočítá', () => {
  const f = farm(); bld(f, 'pekarna');
  give(f, { wheat: 3 });
  assert.deepEqual(R.planChain(f, 'chleb', 1, { now: T0 }).use, [{ id: 'wheat', n: 3 }]);
  f.silo.wheat = 0; f.market = [{ item: 'wheat', qty: 3 }];   // vystavené zboží už není ve skladu
  assert.deepEqual(R.planChain(f, 'chleb', 1, { now: T0 }).missing.map(x => [x.id, x.n]), [['wheat', 3]]);
});

// ---------------------------------------------------------------- D: pole, růst, stroje
test('D02 + D07 nové plodiny: výnos 2, čas a počasí podle serveru jako u ostatních', () => {
  for (const c of ECO_CROPS) {
    const cr = CROPS[c.id];
    assert.equal(cr.yield, 2); assert.equal(cr.time, c.min * 60); assert.equal(cr.st, c.st);
    assert.equal(R.growMs(cr, T0), Math.round(cr.time * 1000 * R.weatherAt(T0).grow));
    const p = { crop: c.id, planted: T0, d: R.growMs(cr, T0) };
    assert.equal(R.plotState(p, T0 + p.d - 1).state, 'growing'); assert.equal(R.plotState(p, T0 + p.d + 7 * 864e5).state, 'ready');
  }
});

test('D03 + D04 Semenárna: 2 plodiny → 3 semena; bez semen a mincí se nezasadí; sklizeň semena nedá', () => {
  for (const c of ECO_CROPS) assert.deepEqual([RECIPES['s_' + c.id].in, RECIPES['s_' + c.id].qty], [{ [c.id]: 2 }, 3]);
  const f = farm(); f.coins = 0; const [x, y] = R.START_PLOTS[0];
  assert.equal(applyAction(f, { type: 'plant', x, y, crop: 'oves', pay: 'seed' }, T0).error, 'no_seeds');
  assert.equal(applyAction(f, { type: 'plant', x, y, crop: 'oves' }, T0).error, 'no_coins');
  f.seeds.s_oves = 1;
  assert.ok(applyAction(f, { type: 'plant', x, y, crop: 'oves' }, T0).ok);
  const p = R.findPlot(f, x, y); applyAction(f, { type: 'harvest', x, y }, p.planted + p.d);
  assert.equal(f.seeds.s_oves || 0, 0); assert.equal(f.silo.oves, 2);
});

test('D05 sklizeň na velkém poli jen správným strojem (oves, len kombajn; petržel, kopr traktor)', () => {
  assert.deepEqual(ECO_CROPS.map(c => CROPS[c.id].harvester), ['combine', 'combine', 'tractor', 'tractor']);
});

test('D08 pěstitelé s novou plodinou: výnos 2 z políčka, žádná produktivita navíc', () => {
  const f = farm(); f.siloCap = 99999; f.seeds.s_oves = 18;
  const g = R.workAreas(f).find(x => x.kind === 'pole');
  assert.ok(g, 'oblast polí');
  const v = { id: 9101, prof: 'pole', xp: { pole: TEAM.xpLvl[TEAM.maxLvl] }, hist: [], at: 0, area: null, t: T0, n: 0 }; f.vill = [v];
  assert.ok(applyAction(f, { type: 'assignArea', id: v.id, kind: 'pole', a: g.ids[0] }, T0).ok);
  assert.ok(applyAction(f, { type: 'plan', w: 'pole' + g.ids[0], key: 'oves', pct: 100 }, T0).ok);
  const h = 6, now = T0 + h * 3_600_000;
  for (let i = 0; i < 500 && (i === 0 || R.villLag(f, now)); i++) applyAction(f, { type: 'tick' }, now, { left: R.VILL_BUDGET });
  const got = f.silo.oves || 0, max = g.ids.length * Math.ceil(h * 3600 / (CROPS.oves.time * 0.7)) * CROPS.oves.yield;
  assert.ok(got > 0 && got % 2 === 0, 'sklizeň po 2: ' + got);
  assert.ok(got <= max, `nejvýš ${max}, je ${got}`);
  assert.ok(f.stats.plant > 0 && (f.seeds.s_oves || 0) < 18, 'sázel z osiva');
});

test('D09 nové plodiny se nenabízí (Stánek, zakázky, osivo) před odemčením', () => {
  for (const c of ECO_CROPS) {
    const f = farm(c.st - 1, 50, 50), ok = R.farmAvail(f);
    assert.ok(!ok.has(c.id), c.id);
    for (let k = 0; k < 10; k++) { const s = R.stallOffers(f, T0 + k * 7_200_000); assert.ok(![...s.buy, ...s.sell].some(x => x.item === c.id || x.item === 's_' + c.id)); }
    assert.equal(R.supplyPrice(f, 's_' + c.id) !== null && !R.stOk(f, CROPS[c.id]), false);
    const [x, y] = R.START_PLOTS[0];
    assert.equal(applyAction(f, { type: 'plant', x, y, crop: c.id }, T0).error, 'locked');
  }
});

test('D11 skupina zapnutá jen s hotovou grafikou: každá nová položka má ikonu, plodina 3 fáze růstu a osivo', async () => {
  const { ASSETS } = await import('../public/js/assets.js');
  const has = (k, n) => ASSETS[k].includes(n);
  for (const id of NEW_ITEMS) assert.ok(has('i', ITEMS[id].icon), 'ikona ' + id);
  for (const c of ECO_CROPS) { for (const s of [0, 1, 2]) assert.ok(has('c', `${c.id}_${s}`), `fáze ${c.id}_${s}`); assert.ok(has('i', 's_' + c.id), 'osivo ' + c.id); }
  for (const a of R.AWARDS) assert.ok(has('i', a.icon), 'odznak ' + a.id);
});

// ---------------------------------------------------------------- E: offline, souběh, konzistence
function teamFarm() {
  const f = farm(); f.siloCap = 99999;
  const m = bld(f, 'mlyn'); m.lvl = 10;
  f.vill = [1, 2, 3].map(i => ({ id: 9000 + i, prof: 'vyroba', xp: { vyroba: TEAM.xpLvl[TEAM.maxLvl] }, hist: [], at: m.id, area: null, t: T0, n: 0 }));
  m.plan = { mouka: 100 };
  give(f, { wheat: 60000 });
  return { f, m };
}
test('E01 + E09 offline 1 h / 24 h / 7 dní: žádné zdvojení, počítadlo pokračuje z uloženého stavu', () => {
  for (const h of [1, 24, 168]) {
    const { f } = teamFarm();
    let raw = JSON.stringify(f), now = T0 + h * 3_600_000, guard = 0;
    for (;;) {
      const g = normalize(JSON.parse(raw)); applyAction(g, { type: 'tick' }, now, { left: R.VILL_BUDGET }); raw = JSON.stringify(g);
      if (!R.villLag(g, now) || ++guard > 3000) break;
    }
    const g = JSON.parse(raw), made = g.silo.mouka || 0, inQ = g.objects.find(o => o.kind === 'mlyn').queue.reduce((n, q) => n + (q.n || 1), 0);
    assert.ok(made > 0, h + ' h');
    assert.equal((g.silo.otruby || 0) * 5 + ((g.byc || {}).otruby || 0), made, `${h} h: otruby přesně z odnesené mouky`);
    assert.equal(60000 - (g.silo.wheat || 0), (made + inQ) * 3, `${h} h: pšenice odečtená přesně jednou`);
  }
});

test('E04 dvě výrobny nemůžou odečíst stejnou poslední surovinu', () => {
  const f = farm(); const a = bld(f, 'olejna'), b = bld(f, 'mlyn');
  give(f, { soy: 3 });
  assert.ok(applyAction(f, { type: 'produce', id: a.id, recipe: 'sojovy_olej' }, T0).ok);
  assert.equal(applyAction(f, { type: 'produce', id: b.id, recipe: 'sojova_mouka' }, T0).error, 'no_inputs');
  assert.equal(f.silo.soy || 0, 0);
});

test('E07 nepovedené odnesení nepřidá XP ani dovednost', () => {
  const f = farm(); const o = bld(f, 'pekarna'); give(f, { chleb: 1, salat: 1, redkvicka: 1, wheat: 5 });
  applyAction(f, { type: 'produce', id: o.id, recipe: 'farmarsky_sendvic' }, T0);
  f.siloCap = R.siloUsed(f);
  const xp = f.xp, sk = f.sk.v;
  assert.equal(applyAction(f, { type: 'collect', id: o.id }, T0 + 1e6).error, 'silo_full');
  assert.deepEqual([f.xp, f.sk.v], [xp, sk]);
});

test('E10 stejný stav a stejné akce = stejný výsledek', () => {
  const play = () => { const { f, m } = teamFarm(); const out = []; for (let i = 1; i <= 6; i++) { out.push(applyAction(f, { type: 'tick' }, T0 + i * 1_800_000).ok); applyAction(f, { type: 'collect', id: m.id }, T0 + i * 1_800_000); } return JSON.stringify(f); };
  assert.equal(play(), play());
});

test('E12 tým 30 lidí, den nepřítomnosti: výpočet zůstává rychlý', () => {
  const out = execFileSync(process.execPath, [new URL('../tools/bench-team.mjs', import.meta.url).pathname, new URL('../public/js', import.meta.url).pathname], { env: { ...process.env } }).toString();
  const ms = Number(out.match(/celkem (\d+) ms/)[1]);
  assert.ok(ms < 20000, out);
});

// ---------------------------------------------------------------- F: ekonomika
test('F01 + F02 audit je ze skutečných dat a obsahuje všechny recepty a prodejní kanály', () => {
  const csv = readFileSync(new URL('../EKOFARM_ECONOMY_AUDIT.csv', import.meta.url), 'utf8');
  for (const r of Object.values(RECIPES)) if (PRODUCTS[recipeOut(r)]) assert.ok(csv.includes(`;${r.id};${recipeOut(r)};`), 'v auditu chybí ' + r.id);
  const md = readFileSync(new URL('../EKOFARM_ECONOMY_AUDIT.md', import.meta.url), 'utf8');
  for (const k of ['Sklad', 'Stánek', 'zakázky', 'Bolen na bylinkách', 'Cykly']) assert.ok(md.includes(k), k);
  assert.ok(R.sellPrice('chleb', T0) < ITEMS.chleb.price);
});

test('F04 + F05 alternativní směsi nejsou nekonečný cyklus, marže je stejný vzorec v každém kroku', () => {
  const edges = {};
  for (const r of Object.values(RECIPES)) for (const x of Object.keys(r.in)) (edges[x] = edges[x] || []).push(recipeOut(r));
  for (const b of R.BYPRODUCTS) for (const s of b.from) (edges[s] = edges[s] || []).push(b.id);
  for (const a of R.ANIMAL_LIST) (edges[a.feed] = edges[a.feed] || []).push(a.product);
  const state = {};
  const dfs = v => { state[v] = 1; for (const w of edges[v] || []) { assert.notEqual(state[w], 1, 'cyklus přes ' + v + ' → ' + w); if (!state[w]) dfs(w); } state[v] = 2; };
  for (const v of Object.keys(edges)) if (!state[v]) dfs(v);
  for (const r of ECO.filter(x => !x.out)) {
    const inp = Object.entries(r.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    assert.equal(ITEMS[r.id].price, Math.max(1, Math.round((inp * 1.2 + r.time / 60 + 2) / R.recipeQty(r))), r.id);
  }
  for (const r of ECO.filter(x => x.out)) {
    const inp = Object.entries(r.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    assert.ok(ITEMS[r.out].price * R.recipeQty(r) > inp, 'směs se vyplatí ' + r.id);
    assert.ok(ITEMS[r.out].price * R.recipeQty(r) <= inp * 2.5, 'ale ne násobně ' + r.id);
  }
});

test('F06 výkonnější tým offline: dopočítá se nejvýš den, ne neomezeně', () => {
  const a = teamFarm(), b = teamFarm();
  const go = (f, h) => { let raw = JSON.stringify(f), n = 0; const now = T0 + h * 3_600_000; for (;;) { const g = normalize(JSON.parse(raw)); applyAction(g, { type: 'tick' }, now, { left: R.VILL_BUDGET }); raw = JSON.stringify(g); if (!R.villLag(g, now) || ++n > 3000) return JSON.parse(raw); } };
  const d1 = go(a.f, 24), d7 = go(b.f, 24 * 7);
  assert.ok((d7.silo.mouka || 0) <= (d1.silo.mouka || 0) * 1.05, `7 dní (${d7.silo.mouka}) ≈ 1 den (${d1.silo.mouka})`);
});

test('F07 týdenní soutěž, denní úkoly, vylepšení budov a příběh chtějí jen dosažitelné věci; ceny vylepšení beze změny', () => {
  for (const k of ['pekarna', 'mlyn', 'kurnik', 'konzervarna', 'rybarna', 'cukrarna', 'statek']) for (let L = 1; L < 10; L++) {
    const f = farm(Math.max(L, BUILDINGS[k].st || 1));
    const c = R.upgradeCost({ kind: k, lvl: L }, f);
    if (!c) continue;
    for (const x of c.items) assert.ok(!ITEMS[x.item] || !PRODUCTS[x.item] || !RECIPES[x.item] || !RECIPES[x.item].eco, `${k} ${L}: ${x.item}`);
  }
  for (const t of R.WEEK_TASKS_ALL) assert.ok(['harvest', 'orders', 'sold', 'plant'].includes(t.k));
  const f = farm(1, 1, 1);
  for (const ev of Object.values(R.EVENTS_BY)) for (const a of ev.a) if (a.use && a.use.item && R.answerShown(f, ev, a)) assert.ok(R.farmAvail(f).has(a.use.item), ev.id);
});

test('F08 nové plodiny nepřeválcují výnos na políčko a minutu', () => {
  const rate = c => c.price * c.yield / (c.time / 60);
  for (const c of ECO_CROPS) {
    const cr = CROPS[c.id], same = Object.values(CROPS).filter(x => !x.eco && x.harvester === cr.harvester);
    assert.ok(rate(cr) <= Math.max(...same.map(rate)), c.id);
    assert.ok(rate(cr) >= Math.min(...same.map(rate)) * 0.9, c.id + ' ani nevýhodné');
  }
});

test('F10 mistrovské výrobky: za jednotku vstupu ne víc než ostatní', () => {
  const ratio = r => ITEMS[recipeOut(r)].price * R.recipeQty(r) / Object.entries(r.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
  const old = Object.values(RECIPES).filter(r => PRODUCTS[r.id] && !r.eco).map(ratio);
  for (const id of ['rybi_talir', 'slavnostni_dort', 'hostina']) assert.ok(ratio(RECIPES[id]) <= Math.max(...old), id);
});
