// Každý panel se musí vykreslit bez chyby (chybějící funkce = panel nejde otevřít).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const v = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8').match(/main\.js\?v=(\d+)/)[1];
const R = await import(`../public/js/rules.js?v=${v}`);
const P = await import(`../public/js/panels.js?v=${v}`);

test('všechny panely se vykreslí', () => {
  const T = 1e12;
  const f = R.newFarm(T); f.level = 12; f.xp = R.LEVEL_XP[12]; f.coins = 99999;
  f.objects.find(x => x.kind === 'statek').lvl = 10;
  f.sk = { f: 1e7, r: 1e7, v: 1e7 };   // v38: dovednosti naplno
  const ids = [['pekarna', 0, 0], ['kurnik', 0, 4], ['ker', 4, 0], ['sad', 5, 0], ['velkepole', 0, 11], ['stodola', 13, 13]]
    .map(([kind, x, y]) => { const r = R.applyAction(f, { type: 'place', kind, x, y, w: 4, h: 4 }, T); assert.ok(r.ok, kind); return r.id; });
  R.applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T);
  const o = id => R.findObject(f, id);
  const out = [
    P.factoryHtml(f, o(ids[0]), T), P.penHtml(f, o(ids[1]), T), P.decoHtml(f, o(ids[2])),
    P.orchardHtml(f, o(ids[3]), T), P.bigfieldHtml(f, o(ids[4]), T), P.siloHtml(f), P.siloTitle(f),
    P.dealerHtml(f, T), P.shopHtml(f, 'zvirata'), P.shopHtml(f, 'farma'), P.shopHtml(f, 'lide'), P.buildHtml(f), P.statekHtml(f, 'X', T), P.statekHtml(f, 'X', T, 'farmari'), ...P.WIKI_TABS.map(t => P.wikiHtml(f, t[0])), ...R.ITEM_LIST.map(it => P.itemHtml(f, it.id, true)), P.statekHtml(f, 'X', T, 'zasoby'), P.stallHtml(f, null, T, 'zasoby'),
    P.garageHtml(f, o(ids[5]), T), P.stallHtml(f, R.townObject(f, 'stanek'), T),
    P.dealerHtml(f, T, R.townObject(f, 'prodejna')), P.newsHtml(), P.helperHtml(f, T),
    P.questsHtml(f, T), P.tasksHtml(f, T, 'denni'), P.tasksHtml(f, T, 'zebricek', { top: [{ name: 'A', level: 3, xp: 5 }], me: { rank: 2, level: 1 } }),
    ...['koupit', 'prodat', 'moje'].map(tab => P.marketHtml(f, null, tab)),
    ...['zakazky', 'pomocnik', 'statek'].map(tab => P.statekHtml(f, 'X', T, tab, f.objects.find(x => x.kind === 'statek'))),
    P.siloHtml(f, T), P.upgradeBlock(f, o(ids[0])),
  ];
  assert.ok(P.statekHtml(f, 'X', T, 'statek', f.objects.find(x => x.kind === 'statek')).includes('Vylepšit') === false, 'statek 10 = max');
  for (const h of out) assert.ok(typeof h === 'string' && h.length > 5);
  // tržiště: nabídky, prodej suroviny i stroje
  const md = { offers: [{ id: 1, name: 'Eva', item: 'corn', qty: 5, price: 50 }, { id: 2, name: 'Eva', machine: 'pluh', qty: 1, price: 400 }], mine: [{ id: 3, item: 'wheat', qty: 2, price: 9 }], sold: [{ item: 'corn', qty: 1, coins: 9, buyer_name: 'Petr' }], slots: 8 };
  f.silo.corn = 20;
  assert.ok(P.marketHtml(f, md, 'koupit').includes('marketBuy'));
  assert.ok(P.marketHtml(f, md, 'moje').includes('marketCancel'));
  assert.ok(P.marketHtml(f, md, 'prodat', { item: 'corn', qty: 5, price: 999 }, T).includes('Vystavit za 120'), 'cena max 3×');
  assert.ok(P.marketHtml(f, md, 'prodat', { machine: f.machines[0] ? f.machines[0].id : -1 }, T).length > 50);
  // v11: rybník, včelín, nápověda
  const spot = (w, h) => { for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (R.fits(f, x, y, w, h)) return { x, y }; return null; };
  const pond = R.applyAction(f, { type: 'place', kind: 'rybnik', ...spot(3, 3) }, T);
  const hive = R.applyAction(f, { type: 'place', kind: 'vcelin', ...spot(2, 2) }, T);
  assert.ok(pond.ok && hive.ok);
  assert.ok(P.pondHtml(f, o(pond.id), T).includes('data-act="fish"'));
  assert.ok(P.hiveHtml(f, o(hive.id), T + 3600000).includes('data-act="collect"'));
  for (const [tab] of P.HELP_TABS) assert.ok(P.helpHtml(f, tab).length > 200, tab);
  // v34: postupný průvodce a Řídicí centrum
  assert.ok(P.GUIDE.length >= 20 && new Set(P.GUIDE.map(s => s.id)).size === P.GUIDE.length, 'id kroků jsou jedinečná');
  const g0 = R.newFarm(T);
  assert.equal(P.guideStep(g0).id, 'pole', 'nová farma začíná polem');
  assert.equal(P.guideStep({ ...g0, tut: R.TUTORIAL_DONE }), null, 'přeskočený průvodce');
  for (const tab of ['prehled', 'hosp', 'chov']) assert.ok(P.centerHtml(f, T, tab).length > 200, 'centrum ' + tab);
  assert.ok(P.centerHtml(R.newFarm(T), T).includes('Upozornění'), 'centrum i na nové farmě');
  assert.ok(P.landHtml(f, 'n').includes('buyLand'));
  assert.ok(P.landHtml(f, 'nw').includes('nejdřív sousední'));
  // velké pole ve všech stavech
  const tr = R.applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T).id;
  const kb = R.applyAction(f, { type: 'buyMachine', model: 'klas4' }, T).id;
  for (const m of ['pluh', 'secka', 'lis']) R.applyAction(f, { type: 'buyMachine', model: m }, T);
  f.siloCap = 9999;
  const fo = o(ids[4]);
  R.applyAction(f, { type: 'hire', plan: 0, crop: 'wheat', legacy: true }, T);
  assert.ok(P.helperHtml(f, T + 1000).includes('Pomocník pracuje'));
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

test('každá surovina, budova, zvíře a stroj má ikonu', async () => {
  const I = await import(`../public/js/icons.js?v=${v}`);
  const need = [...Object.values(R.ITEMS).map(i => i.icon), ...R.BUILDING_LIST.map(b => b.icon), ...R.ANIMAL_LIST.map(a => a.icon), ...R.MACHINE_LIST.map(m => m.icon)];
  const A = await import(`../public/js/assets.js?v=${v}`);
  for (const k of need) assert.ok(I.ICONS[k] || A.ASSETS.i.includes(k), 'chybí ikona ' + k);
});

test('v16: grafika – každá budova, plodina, strom, stroj, zvíře a člověk má obrázek', async () => {
  const A = (await import(`../public/js/assets.js?v=${v}`)).ASSETS;
  const has = (k, n) => A[k].includes(n);
  for (const b of R.BUILDING_LIST) {
    if (b.type === 'bigfield' || b.type === 'orchard' || b.type === 'board' || b.type === 'house') continue;   // nástěnka a domky mají zatím náhradní obrázky
    const name = b.id === 'statek' || b.id === 'sklad' ? b.id + '_1' : b.id;
    assert.ok(has('b', name), 'budova ' + b.id);
  }
  for (let L = 1; L <= 10; L++) assert.ok(has('b', 'statek_' + L) && has('b', 'sklad_' + L), 'úroveň ' + L);
  for (const c of R.CROP_LIST) for (const s of [0, 1, 2]) assert.ok(has('c', `${c.id}_${s}`), `plodina ${c.id}_${s}`);
  for (const t of R.TREE_LIST) for (const s of ['grow', 'ready', 'dead']) assert.ok(has('s', `${t.id}_${s}`), `strom ${t.id}_${s}`);
  for (const m of R.MACHINE_LIST.filter(m => ['tractor', 'combine', 'plow', 'seeder', 'baler'].includes(m.type))) for (const s of ['l', 'r']) assert.ok(has('m', `${m.id}_${s}`), `stroj ${m.id}`);
  for (const a of R.ANIMAL_LIST) assert.ok(has('z', a.id), 'zvíře ' + a.id);
  for (const n of ['farmar_l', 'farmar_r', 'pomocnik_l', 'pomocnik_r']) assert.ok(has('p', n));
  for (const n of ['trava_a', 'louka_a', 'cesta_a', 'dlazba', 'pole', 'pole_osete', 'plot_se', 'plot_ne', 'cedule']) assert.ok(has('t', n));
  for (const n of ['domek_a', 'domek_b', 'domek_c']) assert.ok(has('b', n));
  for (const c of R.CROP_LIST) assert.ok(has('i', 's_' + c.id), 'semena ' + c.id);
});

test('v29: Farmářský tým, nástěnka, domky, zásluhy a tabulky práce se vykreslí', async () => {
  const { TEAM } = await import(`../public/js/team-config.js?v=${v}`);
  const T = 1_700_000_000_000;
  const f = R.newFarm(T); f.level = 12; f.xp = R.LEVEL_XP[12]; f.coins = 99999; f.siloCap = 9999;
  f.objects.find(x => x.kind === 'statek').lvl = 10;
  f.sk = { f: 1e7, r: 1e7, v: 1e7 };   // v38: dovednosti naplno
  f.objects = f.objects.filter(o => o.kind !== 'sad');
  for (const [x, y] of R.START_PLOTS) R.applyAction(f, { type: 'buyPlot', x, y }, T);
  const ok = (a, t = T) => { const r = R.applyAction(f, a, t); assert.ok(r.ok, a.type + ' ' + r.error); return r; };
  const spot = (w, h) => { for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (R.fits(f, x, y, w, h)) return { x, y }; return null; };
  const place = kind => ok({ type: 'place', kind, ...spot(R.BUILDINGS[kind].w, R.BUILDINGS[kind].h) }).id;
  const worker = (prof, lvl = 1, trait = null) => { const w = { id: f.nextId++, prof, trait, xp: { [prof]: TEAM.xpLvl[lvl] }, hist: [], at: 0, area: null, t: T, n: 0 }; f.vill.push(w); return w.id; };
  const sklad = f.objects.find(o => o.kind === 'sklad') || R.findObject(f, place('sklad'));
  const pek = place('pekarna'), kur = place('kurnik'), vc = place('vcelin');
  for (let i = 0; i < 4; i++) ok({ type: 'place', kind: 'sad', x: 12 + i, y: 14 });
  ok({ type: 'buyAnimal', animal: 'slepice' });
  const o = id => R.findObject(f, id);
  const bad = h => assert.ok(!/undefined|NaN|\[object/.test(h), (h.match(/.{60}(undefined|NaN|\[object).{40}/s) || [''])[0]);
  // bez lůžka a bez lidí
  let h = P.teamHtml(f, T); bad(h);
  assert.ok(h.includes('Postav <b>Chatrč</b>') && h.includes('Tým 0 / 0'));
  h = P.boardHtml(f, T); bad(h);
  assert.ok(h.includes('Nemáš volné lůžko') && h.includes('data-act="postAd"'));
  assert.ok(P.factoryHtml(f, o(pek), T).includes('Hledat na nástěnce'));
  // domek a přestavba
  const hut = place('chatrc');
  h = P.houseHtml(f, o(hut)); bad(h);
  assert.ok(h.includes('2 lůžka') && h.includes('Přestavět na Chata') && h.includes('300 :coin:'));
  assert.ok(P.buildHtml(f, 'farma').includes('Chatrč'));
  // nástěnka: inzerát, čekání, uchazeči
  f.silo.wheat = 10;
  const ad = ok({ type: 'postAd', prof: 'vyroba', opt: 0 });
  h = P.boardHtml(f, T + 1000, 'vyroba'); bad(h);
  assert.ok(h.includes('Uchazeči přijdou za') && h.includes('Stáhnout'));
  h = P.boardHtml(f, ad.ready + 1); bad(h);
  assert.ok(h.includes('data-act="hireCand"') && h.includes('Řemeslník'));
  ok({ type: 'hireCand', ad: ad.id, i: 0 }, ad.ready + 1);
  // pracovníci: řemeslník v pekárně, chovatel, včelař, skladník, pěstitel v oblasti a v sadu
  const rem = f.vill[0].id;
  ok({ type: 'assignVill', id: rem, at: pek });
  ok({ type: 'plan', w: 'b' + pek, key: 'chleb', pct: 60 });
  ok({ type: 'plan', w: 'b' + pek, key: 'tresnovy_kolac', pct: 20 });
  ok({ type: 'planTarget', w: 'b' + pek, key: 'chleb', n: 20 });
  f.silo.wheat = 3;
  R.applyAction(f, { type: 'tick' }, T + 2000);
  h = P.factoryHtml(f, o(pek), T + 3000); bad(h);
  assert.ok(h.includes('<span class="pv">60</span> %') && h.includes('20 ks') && h.includes('umí až od úrovně 2') && h.includes('úroveň <b>1</b>/12') && h.includes('Chystá výrobu'));
  // v30: plán u budovy – cíle, posuvníky, využití času, přerozdělení, odhad za hodinu
  assert.ok(h.includes('Cílové zásoby') && h.includes('data-act="tgtN"') && h.includes('class="pslide"') && h.includes('data-max="80"'));
  assert.ok(h.includes('Využito <b>80 %</b>') && h.includes('20 % času budova stojí') && h.includes('data-act="planAuto"') && h.includes('za hodinu'));
  ok({ type: 'planAuto', w: 'b' + pek, on: true });
  assert.ok(P.factoryHtml(f, o(pek), T + 3000).includes('✓ Přerozdělit nevyužité'));
  // pekárna je plná (1 místo) → nový pracovník ji jen vystřídá
  const rem2 = worker('vyroba');
  h = P.factoryHtml(f, o(pek), T + 3000); bad(h);
  assert.ok(h.includes(`data-v="${rem2}|${pek}|${rem}"`) && h.includes('Vystřídat'));
  f.vill = f.vill.filter(x => x.id !== rem2);
  const ch = worker('chov', 4, 'peclivy'), vcel = worker('chov'), sk = worker('sklad', 6), pe = worker('pole', 3), sa = worker('pole', 1, 'vsestranny');
  ok({ type: 'assignVill', id: ch, at: kur }); ok({ type: 'assignVill', id: vcel, at: vc }); ok({ type: 'assignVill', id: sk, at: sklad.id });
  f.silo.corn = 100;
  ok({ type: 'plan', w: 'b' + sklad.id, key: 'corn', pct: 50 });
  ok({ type: 'keep', item: 'corn', n: 20 });
  h = P.siloHtml(f, T + 4000); bad(h);
  assert.ok(h.includes('Další trh za') && h.includes('úroveň <b>6</b>/12'));
  assert.ok(h.includes('Rezervy pro tým') && h.includes('rezerva 20') && h.includes('data-act="keepN"') && h.includes('příště prodá <b>40</b>'));
  assert.ok(P.siloHtml(f, T + 4000, true).includes('data-act="keepAdd"') === false, 'kukuřice už rezervu má, nic dalšího ve skladu není');
  h = P.penHtml(f, o(kur), T + 4000); bad(h);
  assert.ok(h.includes('Pečlivý') === false && h.includes('Ve skladu došlo krmivo') || h.includes('Krmí'));
  bad(P.hiveHtml(f, o(vc), T + 4000));
  ok({ type: 'assignArea', id: pe, kind: 'pole', a: f.plots[0].id });
  ok({ type: 'assignArea', id: sa, kind: 'sad', a: f.objects.find(x => x.kind === 'sad').id });
  ok({ type: 'plan', w: 'pole' + f.plots[0].id, key: 'wheat', pct: 50 });
  ok({ type: 'plan', w: 'pole' + f.plots[0].id, key: 'meloun', pct: 30 });
  h = P.statekHtml(f, 'X', T + 5000, 'farmari'); bad(h);
  assert.ok(h.includes('3 z 6 polí') && h.includes('umí až od úrovně 4') && h.includes('Plán je prázdný'));
  assert.ok(h.includes('pracovníci 1/1') && h.includes('dalšího vezme oblast od 8 polí') && h.includes('✓ Znovu sázet') && h.includes('nechá ležet ladem'));
  // obrazovka Tým: seznam, filtr, detail s přeřazením a propuštěním
  h = P.teamHtml(f, T + 6000, 'all'); bad(h);
  assert.ok(h.includes('data-act="teamSel"') && h.includes('Pověst farmy') && (h.match(/class="trow"/g) || []).length === f.vill.length);
  h = P.teamHtml(f, T + 6000, 'pole'); bad(h);
  assert.equal((h.match(/class="trow"/g) || []).length, 2);
  h = P.teamHtml(f, T + 6000, 'all', ch); bad(h);
  assert.ok(h.includes('Dovednosti') && h.includes('Pečlivý') && h.includes('data-act="teamMove"') && h.includes('data-act="fireAsk"'));
  assert.ok(h.includes(`plno – vyměnit s`) && h.includes(`data-v="${ch}|b|${pek}|${rem}"`), 'na plné místo jen výměnou');
  assert.ok(P.teamHtml(f, T + 6000, 'all', ch, true).includes('Opravdu propustit'));
  // Statek: zásluhy pro další úroveň
  const g = R.newFarm(T);
  h = P.statekHtml(g, 'X', T, 'statek', g.objects.find(x => x.kind === 'statek')); bad(h);
  assert.ok(h.includes('Zásluhy') && h.includes('Sklizeno plodin'));
  assert.ok(P.buildHtml(g, 'vyrobny').includes('sklizeno plodin 40'));
  assert.ok(!P.shopHtml(f, 'zvirata').includes('Vesničan'));
});
