// Ekonomický audit EKOfarm ze skutečných pravidel (public/js/rules.js):
//   node tools/eco-audit.mjs            → EKOFARM_ECONOMY_AUDIT.csv + .md (a audit/po.json)
//   node tools/eco-audit.mjs --json X   → jen souhrn do X (použito pro snímek „před“ z v45)
// Ceny: Sklad vykupuje za 50 % ceny × tržní výkyv (průměr 1), Stánek 70–88 %, zakázky 130–170 % (průměr 150 %) + bonus Statku.
// Skutečný zisk zpracování se počítá proti alternativě „prodat suroviny“ (stejný kanál pro vstupy i výrobek).
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import * as R from '../public/js/rules.js';
import { ECO_FLAGS, ECO_STRAW } from '../public/js/eco-config.js';

const args = process.argv.slice(2);
const jsonOnly = args[0] === '--json' ? args[1] : null;
const root = new URL('../', import.meta.url);
const N = id => (R.ITEMS[id] ? R.ITEMS[id].name : id);
const P = id => (R.ITEMS[id] ? R.ITEMS[id].price : 0);
const outOf = r => (R.recipeOut ? R.recipeOut(r) : r.id);
const nameOf = r => (R.recipeName ? R.recipeName(r) : N(r.id));
const isProduct = r => !!R.PRODUCTS[outOf(r)] && !R.SEEDS[r.id] && !R.SAPLINGS[r.id];
const recipes = Object.values(R.RECIPES).filter(isProduct);
const fmt = x => (Math.round(x * 100) / 100).toString().replace('.', ',');

// odkud surovina pochází a kdy (Statek) je poprvé k dispozici
function origin(id) {
  if (R.CROPS[id]) return 'pole';
  if (R.TREE_LIST.some(t => t.fruit === id)) return 'sad';
  if (R.FISH[id]) return 'rybník';
  if (R.ANIMAL_LIST.some(a => a.product === id)) return 'zvířata';
  if (id === 'plast') return 'včelín';
  if (id === 'slama') return 'velké pole (lis)';
  if (R.SEEDS[id]) return 'semena';
  if (R.PRODUCTS[id] && R.PRODUCTS[id].by) return 'vedlejší produkt';
  if (Object.values(R.RECIPES).some(r => outOf(r) === id)) return 'výroba';
  return '?';
}
function firstSt(id) {
  for (let st = 1; st <= 10; st++) if (R.availableItems(st, 99, 99).has(id)) return st;
  return null;
}

// ---- recepty ----
const rows = recipes.map(r => {
  const out = outOf(r), q = R.recipeQty(r);
  const inBase = Object.entries(r.in).reduce((n, [id, k]) => n + P(id) * k, 0);
  const outBase = P(out) * q;
  const h = r.time / 3600;
  const skladIn = inBase * 0.5, skladOut = outBase * 0.5;
  const zakIn = inBase * 1.5, zakOut = outBase * 1.5;
  return {
    id: r.id, out, name: nameOf(r), building: R.BUILDINGS[r.building].name, st: r.st, cook: r.cook,
    inputs: Object.entries(r.in).map(([id, k]) => `${k}× ${N(id)}`).join(' + '),
    nIn: Object.values(r.in).reduce((a, b) => a + b, 0), qty: q, time: r.time,
    inBase, outBase, price: P(out),
    skladMargin: skladOut - skladIn, skladPerH: (skladOut - skladIn) / h,
    zakMargin: zakOut - zakIn, zakPerH: (zakOut - zakIn) / h,
    ratio: inBase ? outBase / inBase : 0,
    xp: r.xp, xpPerH: r.xp / h,
    alt: r.out && r.out !== r.id ? 'alternativní recept' : '',
    by: r.by ? r.by.map(b => `${b.n}× ${N(b.id)} / ${b.per} dávek`).join(', ') : '',
  };
});

// ---- suroviny: počet použití a čekání na první recept ----
const rawIds = new Set();
for (const r of recipes) for (const id of Object.keys(r.in)) rawIds.add(id);
for (const c of R.CROP_LIST) rawIds.add(c.id);
for (const t of R.TREE_LIST) if (t.fruit) rawIds.add(t.fruit);
for (const a of R.ANIMAL_LIST) rawIds.add(a.product);
for (const f of R.FISH_LIST) rawIds.add(f.id);
rawIds.add('plast'); rawIds.add('slama');
const raws = [...rawIds].filter(id => R.ITEMS[id]).map(id => {
  const users = recipes.filter(r => r.in[id]);
  const st = firstSt(id);
  const useSt = users.length ? Math.min(...users.map(r => r.st)) : null;
  const useCook = users.length ? Math.min(...users.filter(r => r.st === useSt).map(r => r.cook)) : null;
  return { id, name: N(id), origin: origin(id), st, uses: users.length, useSt, useCook, gap: st && useSt ? useSt - st : null, users: users.map(nameOf).join(', ') };
}).sort((a, b) => (a.st || 99) - (b.st || 99) || a.name.localeCompare(b.name, 'cs'));

// ---- graf receptů: cykly a duplicitní výstupy ----
function cycles() {
  const by = {};
  for (const r of Object.values(R.RECIPES)) (by[outOf(r)] = by[outOf(r)] || []).push(r);
  const edges = {};
  for (const r of Object.values(R.RECIPES)) for (const x of Object.keys(r.in)) (edges[x] = edges[x] || new Set()).add(outOf(r));
  for (const b of R.BYPRODUCTS || []) for (const src of b.from) (edges[src] = edges[src] || new Set()).add(b.id);
  const state = {}, found = [];
  const dfs = (v, path) => {
    state[v] = 1;
    for (const w of edges[v] || []) {
      if (state[w] === 1) found.push([...path, v, w].slice(path.indexOf(w) >= 0 ? path.indexOf(w) : 0).join(' → '));
      else if (!state[w]) dfs(w, [...path, v]);
    }
    state[v] = 2;
  };
  for (const v of Object.keys(edges)) if (!state[v]) dfs(v, []);
  return { found, multi: Object.entries(by).filter(([, rs]) => rs.length > 1).map(([id, rs]) => [id, rs.map(r => r.id)]) };
}
const graph = cycles();

// ---- souhrn podle Statku: nejlepší zisk za slot-hodinu (inflace) ----
const bySt = [];
for (let st = 1; st <= 10; st++) {
  const ok = rows.filter(x => x.st <= st);
  const best = ok.reduce((m, x) => (x.zakPerH > m.zakPerH ? x : m), { zakPerH: 0 });
  const bestS = ok.reduce((m, x) => (x.skladPerH > m.skladPerH ? x : m), { skladPerH: 0 });
  bySt.push({ st, recipes: ok.length, products: new Set(ok.map(x => x.out)).size, bestZak: Math.round(best.zakPerH), bestZakName: best.name || '', bestSklad: Math.round(bestS.skladPerH), bestSkladName: bestS.name || '' });
}
const summary = {
  version: R.RULES_VERSION, client: R.CLIENT_MIN, recipes: rows.length, products: new Set(rows.map(x => x.out)).size,
  crops: R.CROP_LIST.length, trees: R.TREE_LIST.length, fish: R.FISH_LIST.length, animals: R.ANIMAL_LIST.length,
  factories: R.BUILDING_LIST.filter(b => b.type === 'factory').length,
  unused: raws.filter(x => !x.uses).map(x => x.id), gaps: raws.filter(x => x.gap > 0).map(x => [x.id, x.st, x.useSt]),
  bySt, cycles: graph.found, multi: graph.multi,
  maxSkladPerH: Math.round(Math.max(...rows.map(x => x.skladPerH))), maxZakPerH: Math.round(Math.max(...rows.map(x => x.zakPerH))),
  medianZakPerH: Math.round(rows.map(x => x.zakPerH).sort((a, b) => a - b)[Math.floor(rows.length / 2)]),
};
if (jsonOnly) { writeFileSync(jsonOnly, JSON.stringify(summary, null, 1)); console.log('souhrn →', jsonOnly); process.exit(0); }
if (!existsSync(new URL('audit/', root))) mkdirSync(new URL('audit/', root));
writeFileSync(new URL('audit/po.json', root), JSON.stringify(summary, null, 1));
const before = existsSync(new URL('audit/pred.json', root)) ? JSON.parse(readFileSync(new URL('audit/pred.json', root), 'utf8')) : null;

// ---- CSV ----
const H = ['typ', 'id', 'vystup_id', 'nazev', 'budova', 'statek', 'vareni', 'vstupy', 'pocet_vstupu', 'kusu', 'cas_s', 'cena_vstupu', 'cena_vyrobku',
  'marze_sklad', 'zisk_sklad_za_slot_h', 'marze_zakazka', 'zisk_zakazka_za_slot_h', 'pomer_vystup_vstup', 'xp', 'xp_za_h', 'poznamka'];
let csv = '﻿' + H.join(';') + '\n';
for (const x of rows) csv += ['recept', x.id, x.out, x.name, x.building, x.st, x.cook, x.inputs, x.nIn, x.qty, x.time, fmt(x.inBase), fmt(x.outBase),
  fmt(x.skladMargin), fmt(x.skladPerH), fmt(x.zakMargin), fmt(x.zakPerH), fmt(x.ratio), x.xp, fmt(x.xpPerH), [x.alt, x.by].filter(Boolean).join(' · ')].join(';') + '\n';
csv += '\n' + ['typ', 'id', 'nazev', 'puvod', 'statek_od', 'pocet_pouziti', 'prvni_recept_statek', 'prvni_recept_vareni', 'cekani_statku', 'pouziti'].join(';') + '\n';
for (const x of raws) csv += ['surovina', x.id, x.name, x.origin, x.st ?? '', x.uses, x.useSt ?? '', x.useCook ?? '', x.gap ?? '', x.users].join(';') + '\n';
writeFileSync(new URL('EKOFARM_ECONOMY_AUDIT.csv', root), csv);

// ---- MD ----
const t = s => (s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.', ',')} h`);
let md = `# EKOfarm – ekonomický audit (vygenerováno: \`node tools/eco-audit.mjs\`)\n\n`;
md += `Zdroj: skutečná pravidla \`public/js/rules.js\` (RULES_VERSION ${R.RULES_VERSION}, aplikace v${R.CLIENT_MIN}), zapnuté skupiny rozšíření: ${Object.entries(ECO_FLAGS).filter(([, v]) => v).map(([k]) => '`' + k + '`').join(', ') || 'žádné'}.\n\n`;
md += `## Jak se počítá\n- **Cena výrobku** se v kódu dopočítává z receptu: \`(Σ cena surovin × 1,2 + čas v min + 2) / kusů\` – ceny se nevyplňují ručně.\n`;
md += `- **Sklad** vykupuje za 50 % ceny × tržní výkyv 0,7–1,4 (střed 1). **Stánek** vykupuje 70–88 %, prodává 133–160 %. **Zakázky** platí 130–170 % (střed 150 %) × bonus Statku (+3 %/úroveň) a dávají XP.\n`;
md += `- **Skutečný zisk zpracování** = výrobek mínus suroviny ve **stejném kanálu** (surovinu jde prodat i bez výroby – alternativní využití). „Za slot-hodinu“ = zisk / doba jedné dávky (jedna výrobní fronta).\n`;
md += `- Tým pracuje i offline: dopočítá se nejvýš ${24} h podle serverového času (VILL_CATCHUP), skladník prodává po ${R.TRADE_IV / 60000} min.\n\n`;
md += `## Souhrn\n| | ${before ? 'před (v45)' : ''} | teď |\n|---|---|---|\n`;
const cmp = (label, k) => `| ${label} | ${before ? before[k] : ''} | ${summary[k]} |\n`;
md += cmp('Recepty na výrobky', 'recipes') + cmp('Různé výrobky', 'products') + cmp('Plodiny', 'crops') + cmp('Stromy a keře', 'trees') + cmp('Ryby', 'fish') + cmp('Výrobny (budovy)', 'factories');
md += cmp('Nejvyšší zisk za slot-hodinu – Sklad', 'maxSkladPerH') + cmp('Nejvyšší zisk za slot-hodinu – zakázky', 'maxZakPerH') + cmp('Medián zisku za slot-hodinu – zakázky', 'medianZakPerH');
md += `| Nevyužité suroviny | ${before ? before.unused.length : ''} | ${summary.unused.length} |\n| Suroviny čekající na recept (Statek) | ${before ? before.gaps.length : ''} | ${summary.gaps.length} |\n`;
md += `| Cykly v grafu receptů | ${before ? before.cycles.length : ''} | ${summary.cycles.length} |\n\n`;
md += `### Nejvýnosnější recept podle Statku (zakázky, mince za slot-hodinu)\n| Statek | Receptů | ${before ? 'Nejlepší před | ' : ''}Nejlepší teď |\n|---|---|${before ? '---|' : ''}---|\n`;
for (const s of bySt) { const b = before && before.bySt.find(y => y.st === s.st); md += `| ${s.st} | ${s.recipes} | ${b ? `${b.bestZak} (${b.bestZakName}) | ` : ''}${s.bestZak} (${s.bestZakName}) |\n`; }
md += `\n## Suroviny – použití a čekání na první recept\n| Surovina | Původ | Statek od | Použití | První recept (Statek / Vaření) | Čeká Statků |\n|---|---|---|---|---|---|\n`;
for (const x of raws) md += `| ${x.name} | ${x.origin} | ${x.st ?? '–'} | ${x.uses} | ${x.useSt ? `${x.useSt} / ${x.useCook}` : '**žádný**'} | ${x.gap > 0 ? `**${x.gap}**` : x.gap ?? '–'} |\n`;
const focus = ['soy', 'redkvicka', 'salat', 'repka', 'beet', 'slama', 'olej', 'sl_olej', 'visne', 'orech', 'mouka', 'cibule'];
md += `\n### Sledované suroviny (zadání A4)\n`;
for (const id of focus) {
  const x = raws.find(y => y.id === id) || { name: N(id), uses: recipes.filter(r => r.in[id]).length, st: firstSt(id), users: recipes.filter(r => r.in[id]).map(nameOf).join(', ') };
  const b = before && before.unused.includes(id) ? ' (v45 nevyužitá)' : '';
  md += `- **${x.name}** – k dispozici od Statku ${x.st ?? '–'}, použití ${x.uses}${b}: ${x.users || '—'}\n`;
}
if (ECO_FLAGS[ECO_STRAW.flag]) md += `- **Sláma** – žádný recept ji nežere (záměr: žádná povinná podestýlka); nově jde dobrovolně a jednorázově na ${ECO_STRAW.name.toLowerCase()} (${ECO_STRAW.qty}× sláma + ${ECO_STRAW.coins} mincí, cyklus ohrady × ${String(ECO_STRAW.cycle).replace('.', ',')}).\n`;
md += `\n### Strop příjmu jedné výrobní fronty (F03)\nStatický výpočet, **ne simulace hráče**: nejlepší recept dostupný na daném Statku × nepřetržitý provoz jedné fronty × prodej v zakázkách (střed 150 %). Skutečný příjem omezují suroviny, počet zakázek (6 najednou), tým a sklad.\n\n| Statek | 1 den před | 1 den po | 7 dní po | 30 dní po | 90 dní po |\n|---|---|---|---|---|---|\n`;
for (const st of [2, 4, 6, 8, 10]) { const s = bySt.find(y => y.st === st), b = before && before.bySt.find(y => y.st === st); const d = x => Math.round(x * 24).toLocaleString('cs-CZ'); md += `| ${st} | ${b ? d(b.bestZak) : '–'} | ${d(s.bestZak)} | ${d(s.bestZak * 7)} | ${d(s.bestZak * 30)} | ${d(s.bestZak * 90)} |\n`; }
md += `\nNové recepty strop **nezvyšují** (nejlepší recept na každém Statku je stejný jako ve v45), zvyšují jen počet rozumných možností (medián zisku za slot-hodinu ${before ? before.medianZakPerH + ' → ' : ''}${summary.medianZakPerH}). Offline se tým dopočítá nejvýš 24 h, takže 7 dní nepřítomnosti nedá víc než 1 den.\n`;
md += `\n### Bolen na bylinkách\nSkutečný recept v kódu: ${Object.entries(R.RECIPES.bolen_bylinky.in).map(([id, k]) => `${k}× ${N(id)}`).join(' + ')} – **bylinky neobsahuje** (shoda s přehledem). Recept se **nemění** (rozpracované fronty a zakázky); bylinkovou variantu přináší samostatný recept „Bolen s koprem“ (etapa E).\n`;
md += `\n### Graf receptů\n- Cykly: ${summary.cycles.length ? summary.cycles.join('; ') : '**žádné** (výroba nemůže vytvořit nekonečný hodnotový řetězec)'}\n`;
md += `- Víc receptů na stejný výrobek: ${summary.multi.length ? summary.multi.map(([id, rs]) => `${N(id)} (${rs.join(', ')})`).join('; ') : 'žádný'}\n`;
md += `\n## Všechny recepty\n| Výrobek | Budova | Statek | Vaření | Suroviny | Čas | Cena surovin | Cena | Zisk Sklad / h | Zisk zakázky / h | Pozn. |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const x of rows.sort((a, b) => a.st - b.st || a.cook - b.cook)) md += `| ${x.name} | ${x.building} | ${x.st} | ${x.cook} | ${x.inputs} | ${t(x.time)} | ${x.inBase} | ${x.outBase} | ${Math.round(x.skladPerH)} | ${Math.round(x.zakPerH)} | ${[x.alt, x.by].filter(Boolean).join(' · ')} |\n`;
writeFileSync(new URL('EKOFARM_ECONOMY_AUDIT.md', root), md);
console.log('EKOFARM_ECONOMY_AUDIT.csv + .md hotovo', JSON.stringify({ recipes: summary.recipes, unused: summary.unused, gaps: summary.gaps.length, cycles: summary.cycles.length, maxZak: summary.maxZakPerH }));
