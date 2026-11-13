// Dokumenty rozšíření ze skutečných dat:  node tools/eco-docs.mjs
//   EKOFARM_CONTENT_MAP.md   – návrhové ID ze zadání → skutečné ID ve hře, odemčení, vstupy, ceny, grafika, skupina
//   EKOFARM_PRICE_PROPOSAL.csv – ceny nových předmětů (jak vznikly) a prodejní kanály
// Návrh ze zadání: audit/navrh_receptu.csv, audit/navrh_plodin.csv (uložené kopie z balíčku od uživatele).
import { readFileSync, writeFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';
import { ECO_FLAGS, ECO_RECIPES, ECO_CROPS, ECO_BYPRODUCTS, ECO_STRAW, ECO_AWARDS, ECO_FROM } from '../public/js/eco-config.js';
import { ASSETS } from '../public/js/assets.js';

const root = new URL('../', import.meta.url);
const csv = f => readFileSync(new URL(f, root), 'utf8').replace(/^﻿/, '').trim().split('\n').map(l => l.split(';'));
const [, ...navrh] = csv('audit/navrh_receptu.csv');
const [, ...navrhP] = csv('audit/navrh_plodin.csv');
const ALIAS = {
  eco_rec_ovesne_krmivo: 'krmivo_slepice__oves', eco_rec_krmivo_s_otrubami: 'krmivo_slepice__otruby', eco_rec_krmivo_s_pokrutinami: 'krmivo_prasata__pokrutiny',
  eco_rec_krmivo_s_rizky: 'krmivo_kravy__rizky', eco_rec_krmivo_s_vylisky: 'krmivo_prasata__vylisky', eco_rec_bylinkova_rybi_polevka: 'bylinkova_polevka',
  eco_rec_kapr_s_petrzeli: 'kapr_petrzel', eco_rec_bolen_s_koprem: 'bolen_kopr', eco_rec_mistrovsky_rybi_talir: 'rybi_talir',
  eco_rec_slavnostni_ovocny_dort: 'slavnostni_dort', eco_rec_farmarska_hostina: 'hostina',
};
const real = pid => ALIAS[pid] || pid.replace(/^eco_(rec|item|crop)_/, '');
const N = id => (R.ITEMS[id] ? R.ITEMS[id].name : id);
const ins = r => Object.entries(r.in).map(([id, k]) => `${k}× ${N(id)}`).join(' + ');
const icon = id => (ASSETS.i.includes(id) ? `i/${id}.webp` : '**chybí**');
const t = s => `${Math.round(s / 60)} min`;
const flags = Object.entries(ECO_FLAGS).map(([k, v]) => `\`${k}\` ${v ? '**zapnuto**' : 'vypnuto'}`).join(' · ');

let md = `# EKOfarm – mapa obsahu rozšíření (v46)\n\nVygenerováno \`node tools/eco-docs.mjs\` ze skutečných pravidel. Přepínače (public/js/eco-config.js): ${flags}.\n\n`;
md += `Návrhová ID ze zadání (\`eco_rec_*\`, \`eco_item_*\`, \`eco_crop_*\`) nejsou ID ve hře – ve hře platí sloupec **ID ve hře** (jména jsou česky zvlášť). Výrobek receptu má stejné ID jako recept; alternativní recept (\`out\`) vyrábí existující krmivo a nový předmět nevytváří.\n\n`;
md += `## Recepty\n| Návrh | ID ve hře | Název | Budova | Statek (návrh → hra) | Vaření (návrh → hra) | Suroviny | Čas | Výrobek | Cena | XP | Ikona | Skupina | Odchylka od návrhu |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const row of navrh) {
  const [pid, name, bld, stN, ckN, minN, inN, , qtyN] = row;
  const id = real(pid), r = R.RECIPES[id];
  if (!r) { md += `| ${pid} | – | ${name} | ${bld} | ${stN} → – | ${ckN} → – | ${inN} | ${minN} min | – | – | – | – | – | **není ve hře** (vypnutá skupina nebo chybí surovina) |\n`; continue; }
  const out = R.recipeOut(r), dev = [];
  if (+stN !== r.st) dev.push(`Statek ${stN} → ${r.st}`);
  if (+ckN !== r.cook) dev.push(`Vaření ${ckN} → ${r.cook}`);
  if (+minN * 60 !== r.time) dev.push(`čas ${minN} → ${r.time / 60} min`);
  if (+(qtyN || 1) !== R.recipeQty(r)) dev.push(`kusů ${qtyN} → ${R.recipeQty(r)}`);
  const e = ECO_RECIPES.find(x => x.id === id);
  md += `| ${pid} | \`${id}\` | ${R.recipeName(r)} | ${R.BUILDINGS[r.building].name} | ${stN} → ${r.st} | ${ckN} → ${r.cook} | ${ins(r)} | ${t(r.time)} | ${R.recipeQty(r)}× ${N(out)}${r.out ? ' (existující)' : ''} | ${R.ITEMS[out].price} | ${r.xp} | ${r.out ? `i/${out}.webp (původní)` : icon(out)} | ${e.flag} | ${dev.join(', ') || '–'}${dev.length && pid === 'eco_rec_ovesne_krmivo' ? ', suroviny 2× Oves → 1× Oves (návrh 2× oves + 1× kukuřice → 1 krmivo by byl ztrátový: suroviny 48 mincí, krmivo 21)' : ''}${dev.length && pid === 'eco_rec_krmivo_s_vylisky' ? ' (prasata a jejich krmivo jsou od Statku 7)' : ''} |\n`;
}
md += `\n## Plodiny\n| Návrh | ID ve hře | Název | Statek | Růst (návrh → hra) | Stroj na velkém poli | Výnos | Osivo (mince) | Cena | XP | Semena | Grafika (3 fáze + ikona) |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const [pid, name, st, min] of navrhP) {
  const id = real(pid), c = R.CROPS[id];
  if (!c) { md += `| ${pid} | – | ${name} | ${st} | ${min} min | – | – | – | – | – | – | **vypnuto** |\n`; continue; }
  md += `| ${pid} | \`${id}\` | ${c.name} | ${st} → ${c.st} | ${min} → ${c.time / 60} min | ${R.MACHINE_TYPE_NAME[c.harvester]} | ${c.yield} | ${c.cost} | ${c.price} | ${c.xp} | Semenárna: 2× ${c.name} → 3× \`s_${id}\` | ${[0, 1, 2].every(s => ASSETS.c.includes(`${id}_${s}`)) ? `c/${id}_0..2.webp` : '**chybí**'}, ${icon(id)}, ${icon('s_' + id)} |\n`;
}
md += `\nCena, osivo a XP nové plodiny = lineárně mezi plodinami se stejným strojem podle doby růstu (mimo rozsah úměrně času); výnos 2 jako všechny polní plodiny.\n`;
md += `\n## Vedlejší produkty (platí pro dávky, které začaly od ${new Date(ECO_FROM).toISOString().slice(0, 10)})\n| Návrh | ID ve hře | Název | Z čeho | Kolik | Cena | Spotřebitel | Ikona |\n|---|---|---|---|---|---|---|---|\n`;
for (const b of ECO_BYPRODUCTS) {
  const live = R.BYPRODUCTS.find(x => x.id === b.id);
  const use = Object.values(R.RECIPES).filter(r => r.in[b.id]).map(r => R.recipeName(r)).join(', ');
  md += `| eco_item_${b.id} | \`${b.id}\` | ${b.name} | ${(live || b).from.map(N).join(', ')} | ${b.n} ks za ${b.per} hotových dávek | ${live ? R.ITEMS[b.id].price : '–'} | ${use || '–'} | ${icon(b.id)} |\n`;
}
md += `\nPočítadlo dávek je u farmy (\`farm.byc\`), vydávají se jen celé kusy a jen když se vejdou do Skladu (jinak počkají). Zrušená ani nedokončená dávka nic nedá.\n`;
md += `\n## Sláma a ocenění\n- **${ECO_STRAW.name}** (\`penStraw\`, pole \`o.pod\` u ohrady): od Statku ${ECO_STRAW.st}, jednorázově ${ECO_STRAW.qty}× sláma + ${ECO_STRAW.coins} mincí, krmný cyklus × ${ECO_STRAW.cycle}. Skupina \`${ECO_STRAW.flag}\`.\n`;
for (const a of ECO_AWARDS) md += `- **${a.name}** (\`${a.id}\`, \`farm.aw\`): Vaření ${a.level}, jen kosmetické, ikona ${icon(a.icon)}. Skupina \`${a.flag}\`.\n`;
md += `\n## Plán výroby\n- Výpočet \`planChain(farm, výrobek, počet, { pref, pick, orders })\` – jen čtení; akce \`planApply\` nastaví cílové zásoby výroben (atomicky, vyšší dosavadní cíl zůstane).\n- Skladník (\`tradeRound\`) neprodá zboží, které výrobny drží pro cílové zásoby, ani suroviny na chybějící dávky (\`planHeld\`).\n`;
writeFileSync(new URL('EKOFARM_CONTENT_MAP.md', root), md);

// ---- ceny ----
let pc = '﻿' + ['id', 'nazev', 'druh', 'skupina', 'cena', 'vykup_sklad_stred', 'stanek_vykup_od_do', 'zakazka_stred', 'jak_vznikla'].join(';') + '\n';
const row = (id, kind, flag, how) => { const p = R.ITEMS[id].price; pc += [id, N(id), kind, flag, p, R.sellPrice(id, 0) && Math.max(1, Math.round(p * 0.5)), `${Math.round(p * 0.7)}–${Math.round(p * 0.88)}`, Math.round(p * 1.5), how].join(';') + '\n'; };
for (const c of ECO_CROPS) if (R.CROPS[c.id]) row(c.id, 'plodina', c.flag, 'interpolace mezi plodinami se stejným strojem podle doby růstu');
for (const c of ECO_CROPS) if (R.CROPS[c.id]) row('s_' + c.id, 'osivo', c.flag, 'jako cena osiva za mince (stejně jako u ostatních plodin)');
for (const b of R.BYPRODUCTS) row(b.id, 'vedlejší produkt', b.flag, '80 % hodnoty suroviny, kterou nahradí v alternativní krmné směsi');
for (const e of ECO_RECIPES) if (R.RECIPES[e.id] && !e.out) row(e.id, 'výrobek', e.flag, '(Σ suroviny × 1,2 + minuty + 2) / kusů – stejný vzorec jako všechny výrobky');
writeFileSync(new URL('EKOFARM_PRICE_PROPOSAL.csv', root), pc);
console.log('EKOFARM_CONTENT_MAP.md + EKOFARM_PRICE_PROPOSAL.csv hotovo');
