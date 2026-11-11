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
  assert.equal(P.TUTORIAL.length, 7);
  assert.ok(P.landHtml(f, 'n').includes('buyLand'));
  assert.ok(P.landHtml(f, 'nw').includes('nejdřív sousední'));
  // velké pole ve všech stavech
  const tr = R.applyAction(f, { type: 'buyMachine', model: 'brazda60' }, T).id;
  const kb = R.applyAction(f, { type: 'buyMachine', model: 'klas4' }, T).id;
  for (const m of ['pluh', 'secka', 'lis']) R.applyAction(f, { type: 'buyMachine', model: m }, T);
  f.siloCap = 9999;
  const fo = o(ids[4]);
  R.applyAction(f, { type: 'hire', plan: 0, crop: 'wheat' }, T);
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
    if (b.type === 'bigfield' || b.type === 'orchard') continue;
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
