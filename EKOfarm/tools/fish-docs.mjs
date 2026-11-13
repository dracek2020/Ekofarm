// Dokumenty v47 ze skutečných dat:  node tools/fish-docs.mjs
//   RYBARENI_ANALYZA.md – EXISTUJÍCÍ vs. NOVÉ (v47), stabilní ID, návrh ze zadání → skutečné ID a hodnoty, kontrola duplicit
//   RYBARENI_GRAFIKA.md – grafický manifest: každý obrázek v47, odkud je, rozměr a velikost (jen skutečné soubory)
// Návrh ze zadání: audit/v47_navrh_receptu.json, audit/v47_navrh_rybareni.json (kopie z balíčku od uživatele).
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import * as R from '../public/js/rules.js';
import { ECO_FLAGS, ECO_FISH, BAITS, FISH_RECIPES, BAKERY_RECIPES, BAKERY_CROPS, BAIT_PREF, FIGHT } from '../public/js/eco-config.js';
import { ASSETS } from '../public/js/assets.js';

const root = new URL('../', import.meta.url);
const J = f => JSON.parse(readFileSync(new URL(f, root), 'utf8'));
const NR = J('audit/v47_navrh_receptu.json'), NF = J('audit/v47_navrh_rybareni.json');
const N = id => (R.ITEMS[id] ? R.ITEMS[id].name : id);
const byName = Object.fromEntries(R.ITEM_LIST.map(it => [it.name.toLowerCase(), it.id]));
const BAIT_NAME = Object.fromEntries(BAITS.map(b => [b.name.toLowerCase(), b]));
const idOf = name => byName[name.toLowerCase()] || (BAIT_NAME[name.toLowerCase()] || {}).item || null;
const NEW = new Set([...FISH_RECIPES, ...BAKERY_RECIPES].map(r => r.id));
const ins = r => Object.entries(r.in).map(([id, q]) => `${q}× ${N(id)}`).join(', ');
const min = s => `${Math.round(s / 60)} min`;
const POND_NAME = id => R.BUILDINGS[id].name;
const t = (s, n = 0) => String(s).replace('.', ',');

// ---------- ANALÝZA ----------
let md = '# EKOfarm v47 – analýza rybaření, návnad a pečiva (vygenerováno `node tools/fish-docs.mjs`)\n\n';
md += `Zdroj: skutečná pravidla \`public/js/rules.js\` a \`public/js/eco-config.js\`; návrh ze zadání \`audit/v47_navrh_*.json\`. Zapnuté skupiny: ${Object.entries(ECO_FLAGS).filter(([, v]) => v).map(([k]) => '`' + k + '`').join(', ')}.\n\n`;
md += '## 1. Co hra měla před v47 a co přibylo\n| Oblast | EXISTUJÍCÍ (v46) | v47 |\n|---|---|---|\n';
const rods = R.MACHINE_LIST.filter(m => m.type === 'rod');
md += `| Rybaření – akce | \`fishCast\` + \`fishLand\`; druh ryby se losoval v prohlížeči i na serveru stejně (deterministicky ze seedu farmy), minihra jen v prohlížeči | Stejné akce, nově **serverové tajemství**: druh a váhu losuje jen server (\`farm.sx\`, do prohlížeče se nikdy neposílá), klient dostane jen profil obtížnosti 1–3; výsledek souboje server ověří přehráním klepnutí. Nová akce \`fishGiveUp\` (vzdát se). Idempotentní klíč \`k\`, jeden nához na hráče. |\n`;
md += `| Minihra | Původní rybaření (v26) | Nová minihra: farmář s prutem (5 póz), nához, čekání na záběr, souboj se šipkou a zelenou zónou, postup chytání, napětí vlasce, výsledek. Pevný krok ${FIGHT.hz} Hz, max. ${FIGHT.maxS} s. Původní kód zůstává za přepínačem \`fishing_minigame_v2\`. |\n`;
md += `| Návnada | 1 položka „Návnada“ (\`navnada\`, Krmivárna: ${ins(R.RECIPES.navnada)} → ${R.recipeQty(R.RECIPES.navnada)}) | 8 návnad (\`BAITS\`), okénko „Vyber návnadu“ před náhozem; \`navnada\` zůstává stejné ID, jen se jmenuje „${N('navnada')}“ |\n`;
md += `| Ryby | 14 druhů | 24 druhů (+10), stejné ID starých ryb |\n`;
md += `| Vodní plochy | ${['rybnik', 'rybnik2', 'rybnik3', 'rybnik4'].map(id => `${POND_NAME(id)} ${R.POND[id].cap}`).join(', ')} | beze změny (žádná nová budova, kapacity stejné) |\n`;
md += `| Udice | ${rods.length} udic | beze změny; lepší udice = širší zóna, rychlejší postup, pomalejší napětí |\n`;
md += `| Deník a rekordy | \`farm.fj\` (ulovené druhy, rekordy vah) | stejný deník + nově „bral(a) na: …“ (\`farm.fj.b\`), poslední návnada \`farm.fb\` |\n`;
md += `| Denní úkoly | 10 druhů (mezi nimi „Ulovit ryb“) | + „Nahodit s návnadou“ (\`stats.cast\`) a „Uvařit rybích jídel“ (\`stats.fishdish\`), jen se zapnutou minihrou a s rybníkem a udicí |\n`;
const fr = FISH_RECIPES.filter(r => r.id !== 'rohlik' && r.id !== 'masova_navnada'), cntB = {};
for (const r of fr) cntB[R.BUILDINGS[r.b].name] = (cntB[R.BUILDINGS[r.b].name] || 0) + 1;
md += `| Rybí recepty | ${Object.values(R.RECIPES).filter(r => r.building === 'rybarna' && !NEW.has(r.id)).length} v Rybárně (+ uzené ryby v Uzenářství) | +${fr.length} (${Object.entries(cntB).map(([b, n]) => `${b} ${n}`).join(', ')}) |\n`;
md += `| Pečivo | ${Object.values(R.RECIPES).filter(r => r.building === 'pekarna' && !NEW.has(r.id)).length} receptů v Pekárně | +${BAKERY_RECIPES.filter(r => r.b === 'pekarna').length} pečiv + Rohlík (pečivo i návnada) |\n`;
md += `| Plodiny | ${R.CROP_LIST.length - BAKERY_CROPS.length} | + ${BAKERY_CROPS.map(c => N(c.id)).join(', ')} |\n\n`;
md += 'Databáze: **žádná migrace**. Farma je JSON v D1 (`farms.data`); nová pole jsou volitelná a `normalize()` je doplní: `sx` (tajemství serveru, jen na serveru), `fb`, `fj.b`, `stats.cast`, `stats.fishdish`, `hook` u rybníka (rozběhnutý nához). Stará farma se načte beze změny zásob.\n\n';

// ryby
md += '## 2. Ryby – stabilní ID\n| ID | Ryba | Nejmenší voda | Rybaření | Váha | Cena | Obtížnost | Návrh ze zadání |\n|---|---|---|---|---|---|---|---|\n';
const nfByName = Object.fromEntries(NF.new_fish.map(f => [f.name.toLowerCase(), f]));
for (const f of R.FISH_LIST) {
  const p = nfByName[f.name.toLowerCase()];
  const lv = f.fishLv;
  md += `| \`${f.id}\` | ${f.name}${f.eco ? ' *(v47)*' : ''} | ${POND_NAME(f.pond || 'rybnik')} | ${lv ?? ''} | ${t(f.kg[0])}–${t(f.kg[1])} kg | ${f.price} | ${t(Math.round(f.diff * 100) / 100)} | ${p ? `\`${p.id}\`: Rybaření ${p.min_fishing_level}, ${p.min_pond_name}` : 'stávající'} |\n`;
}
md += '\nCena, obtížnost a váha nových ryb se dopočítaly z úrovně Rybaření podle stávajících ryb (interpolace) – návrh je nechal prázdné (`base_price: null`).\n\n';

// návnady
md += '## 3. Návnady – stabilní ID\n| ID návnady | Návnada | Skladová položka | Odemčení | Oblíbené ryby | Návrh ze zadání |\n|---|---|---|---|---|---|\n';
const nbByName = Object.fromEntries(NF.baits.map(b => [b.name.toLowerCase(), b]));
for (const b of BAITS) {
  const p = nbByName[b.name.toLowerCase()];
  md += `| \`${b.id}\` | ${b.name} | \`${b.item}\` (${N(b.item)}) | Statek ${b.st}, Rybaření ${b.lv} | ${b.pref.map(id => R.FISH[id] ? R.FISH[id].name : id).join(', ')} | ${p ? `\`${p.id}\`: Statek ${p.unlocked_estate}, Rybaření ${p.fishing_level}` : ''} |\n`;
}
md += `\nNávnada násobí šanci oblíbených ryb ${t(BAIT_PREF.like)}× a ostatních ${t(BAIT_PREF.other)}× – jen mezi druhy, které v dané vodě a s danou úrovní berou. Kukuřice, hrách, sýr a rohlík jsou stávající zboží (žádná druhá položka); červ a třpytka se kupují ve Stánku (Zásoby) za mince; masová návnada je recept v Krmivárně.\n\n`;

// recepty – návrh → skutečnost
const prop = Object.fromEntries([...NR.recipes, ...NR.additional_crops_and_intermediates].map(r => [idOf(r.name), r]));
md += '## 4. Recepty a plodiny: návrh → skutečné ID a hodnoty\n| Skutečné ID | Název | Budova | Statek / Vaření | Čas | Suroviny → kusů | Cena | Návrh ze zadání | Rozdíl proti návrhu |\n|---|---|---|---|---|---|---|---|---|\n';
const diffs = [];
for (const r of [...FISH_RECIPES, ...BAKERY_RECIPES]) {
  const x = R.RECIPES[r.id], p = prop[R.recipeOut(x)];
  let d = '—';
  if (p) {
    const pin = Object.fromEntries((p.inputs || []).map(i => [idOf(i.name), i.quantity]));
    const diff = [];
    if (p.estate_level !== undefined && p.estate_level !== x.st) diff.push(`Statek ${p.estate_level} → ${x.st}`);
    if (p.cooking_level !== undefined && p.cooking_level !== x.cook) diff.push(`Vaření ${p.cooking_level} → ${x.cook}`);
    if (p.duration_minutes_proposal && Math.round(x.time / 60) !== p.duration_minutes_proposal) diff.push(`čas ${p.duration_minutes_proposal} → ${Math.round(x.time / 60)} min`);
    if (JSON.stringify(Object.entries(pin).sort()) !== JSON.stringify(Object.entries(x.in).sort())) diff.push('suroviny upraveny');
    if (p.output_quantity && p.output_quantity !== R.recipeQty(x)) diff.push(`kusů ${p.output_quantity} → ${R.recipeQty(x)}`);
    d = diff.length ? diff.join('; ') : 'podle návrhu';
    if (diff.length) diffs.push([N(R.recipeOut(x)), d]);
  }
  md += `| \`${r.id}\` | ${N(R.recipeOut(x))} | ${R.BUILDINGS[x.building].name} | ${x.st} / ${x.cook} | ${min(x.time)} | ${ins(x)} → ${R.recipeQty(x)} | ${R.ITEMS[R.recipeOut(x)].price} | ${p ? '`' + p.id + '`' : '—'} | ${d} |\n`;
}
for (const c of BAKERY_CROPS) {
  const cr = R.CROPS[c.id], p = prop[c.id];
  md += `| \`${c.id}\` | ${cr.name} (plodina) | pole | ${cr.st} / – | ${min(cr.time)} | osivo ${cr.cost} → ${cr.yield || 2} | ${cr.price} | ${p ? '`' + p.id + '`' : '—'} | ${p && p.estate_level !== cr.st ? `Statek ${p.estate_level} → ${cr.st}` : 'podle návrhu'} |\n`;
}
md += `\nCeny nejsou ručně: výrobek = (Σ surovin × 1,2 + čas v min + 2) / kusů, jako u všech receptů hry. ${diffs.length ? `Úpravy proti návrhu (${diffs.length}) vznikly kvůli dostupnosti surovin na daném Statku, pravidlu „hra chce jen to, co hráč může mít“ a auditu cen – viz sloupec Rozdíl.` : ''}\n\n`;

// duplicity
md += '## 5. Kontrola duplicit proti obsahu hry (v1–v46)\n';
const OLD = Object.values(R.RECIPES).filter(r => !NEW.has(r.id) && R.PRODUCTS[R.recipeOut(r)] && !R.SEEDS[r.id] && !R.SAPLINGS[r.id]);
const stem = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter(w => w.length >= 4 && !['rybi', 'peceny', 'pecena', 'uzeny', 'uzena', 's', 'na'].includes(w)).map(w => w.slice(0, 5));
const rows = [];
let sameId = 0, sameName = 0, sameIn = 0;
const SAME_IN_OK = { tvaroh: 'syr' };   // stejné suroviny, ale jiný výrobek – vědomě podle zadání
const PAIRS = { rybi_misa: 'rybi_talir', visnova_kapsa: 'visnovy_kolac', orechovy_venec: 'orechovy_kolac' };   // ručně porovnané dvojice
for (const r of [...FISH_RECIPES, ...BAKERY_RECIPES]) {
  const x = R.RECIPES[r.id], out = R.recipeOut(x), nm = N(out), st = stem(nm), key = JSON.stringify(Object.entries(x.in).sort());
  for (const o of OLD) {
    const oo = R.recipeOut(o);
    if (oo === out && o.id !== x.id) { sameId++; rows.push([nm, N(oo), 'stejný výrobek', '**konflikt**']); }
    else if (N(oo).toLowerCase() === nm.toLowerCase()) { sameName++; rows.push([nm, N(oo), 'stejný název', '**konflikt**']); }
    else if (JSON.stringify(Object.entries(o.in).sort()) === key) {
      const ok = SAME_IN_OK[x.id] === o.id;
      if (!ok) sameIn++;
      rows.push([nm, `${N(oo)} (${R.BUILDINGS[o.building].name})`, `stejné suroviny (${ins(x)})`, ok ? `jiný výrobek, jiný čas (${min(x.time)} vs ${min(o.time)}) a Vaření (${x.cook} vs ${o.cook}); zadání chce tvaroh z mléka výslovně – ponecháno` : '**konflikt**']);
    } else if (PAIRS[x.id] === o.id) rows.push([nm, `${N(oo)} (${R.BUILDINGS[o.building].name})`, 'podobný účel (ruční kontrola)', `jiné suroviny (${ins(x)} vs ${ins(o)}), jiný výrobek – ponecháno`]);
    else if (o.building === x.building) {   // podobný název ve stejné výrobně = možná duplicita
      const os = stem(N(oo)), shared = Object.keys(x.in).filter(k => o.in[k]);
      if (st.some(w => os.includes(w)) && shared.length) rows.push([nm, `${N(oo)} (${R.BUILDINGS[o.building].name})`, `podobný název, společné: ${shared.map(N).join(', ')}`, `jiné suroviny (${ins(x)} vs ${ins(o)}) a jiný výrobek – ponecháno`]);
    }
  }
}
md += `Porovnáno ${FISH_RECIPES.length + BAKERY_RECIPES.length} nových receptů proti ${OLD.length} stávajícím: **stejné ID výrobku ${sameId}, stejný název ${sameName}, nevysvětlená shoda surovin ${sameIn}.**\n\n`;
md += 'Podobná jména ve stejné výrobně (sdílené slovo i surovina), stejné suroviny a ručně vybrané dvojice – zkontrolováno, nejde o duplicity:\n\n| Nový | Stávající | Podobnost | Rozhodnutí |\n|---|---|---|---|\n';
for (const r of rows) md += `| ${r.join(' | ')} |\n`;
md += `\nZ návrhu se **nepřidalo nic dvakrát**: Rohlík je jediná položka (\`rohlik\`) pro pečivo i návnadu; Hrášek používá stávající \`hrach\`; Sýr stávající \`syr\`; Těsto je stávající \`navnada\`; Kukuřice stávající \`corn\`.\n`;
writeFileSync(new URL('RYBARENI_ANALYZA.md', root), md);

// ---------- GRAFIKA ----------
const art = readFileSync(new URL('tools/v47art.py', root), 'utf8');
const sheets = [...art.matchAll(/'(ikony__\w+)': \((\d), (\d), '([^']+)'\)/g)].map(m => [m[1], m[4].split(' ')]);
const size = p => { const s = statSync(new URL('public/img/' + p, root)).size; return `${(s / 1024).toFixed(1).replace('.', ',')} kB`; };
const file = (k, n) => `${k}/${n}.webp`;
let g = '# EKOfarm v47 – grafický manifest (vygenerováno `node tools/fish-docs.mjs`)\n\n';
g += 'Každý řádek je **skutečný soubor** ve hře (`public/img/…`), ověřený testem T28 a `tools/v47check.py` (rozměr, průhlednost, bez rámečků). Původ: Scenario (GPT Image), vlastní prompty bez cizích značek a her (`art/PROMPTY_scenario.json`, sekce `v47`), zpracování `tools/v47art.py`. Dva referenční náhledy ze zadání se ve hře **nepoužívají** – sloužily jen jako předloha rozvržení UI.\n\n';
const all = [];
for (const [sheet, names] of sheets) {
  g += `## Ikony z archu \`${sheet}\` (128 × 128, průhledné)\n| Soubor | Co to je | Velikost |\n|---|---|---|\n`;
  for (const n of names) { const p = file('i', n); all.push(p); g += `| \`${p}\` | ${R.ITEMS[n] ? R.ITEMS[n].name : { ryba_obecna: 'Neutrální ryba (postup chytání – druh se neprozradí)', vlasec: 'Cívka (napětí vlasce)', rybarska_bedna: 'Rybářská bedna (hlavička okénka návnad)' }[n] || n} | ${size(p)} |\n`; }
  g += '\n';
}
g += '## Plodiny žito a mák\n| Soubor | Co to je | Velikost |\n|---|---|---|\n';
for (const c of BAKERY_CROPS) {
  for (const s of [0, 1, 2]) { const p = file('c', `${c.id}_${s}`); all.push(p); g += `| \`${p}\` | ${N(c.id)} – fáze ${s + 1} (120 × 150) | ${size(p)} |\n`; }
  const p = file('i', 's_' + c.id); all.push(p); g += `| \`${p}\` | Osivo ${N(c.id)} (balíček) | ${size(p)} |\n`;
}
const meta = J('public/img/r/rybar.json');
g += '\n## Minihra\n| Soubor | Co to je | Velikost |\n|---|---|---|\n';
const POSE = ['stoj s prutem (čekání)', 'nápřah za rameno', 'nához – prut vpředu', 'navíjení – prut ohnutý', 'radost z úlovku'];
for (let i = 0; i < 5; i++) { const p = file('r', 'rybar_' + i); all.push(p); g += `| \`${p}\` | Farmář: ${POSE[i]} (${meta[i].w} × ${meta[i].h}, špička prutu ${meta[i].tip.join(', ')}) | ${size(p)} |\n`; }
all.push('r/scena.webp'); g += `| \`r/scena.webp\` | Pozadí minihry – břeh rybníka (900 px na šířku, neprůhledné) | ${size('r/scena.webp')} |\n`;
g += `| \`r/rybar.json\` | Rozměry póz a bod špičky prutu (odtud vede vlasec) | — |\n`;
g += '\nKreslené kódem (canvas/CSS, žádný obrázek): vlasec, splávek, vlnky, cákanec, dřevěná cedulka „Záběr!“, ukazatel se šipkou a zelenou zónou, panely „Postup chytání“ a „Napětí vlasce“, okénko návnad. Ikony kukuřice, těsta, hrachu, sýra a rohlíku v okénku jsou stávající ikony položek.\n';
const missing = all.filter(p => !existsSync(new URL('public/img/' + p, root)));
g += `\n**Celkem ${all.length} obrázků, chybí ${missing.length}.**${missing.length ? ' Chybí: ' + missing.join(', ') : ' Žádný grafický asset nechybí.'}\n`;
writeFileSync(new URL('RYBARENI_GRAFIKA.md', root), g);
console.log('RYBARENI_ANALYZA.md + RYBARENI_GRAFIKA.md hotovo', { duplicity: sameId + sameName + sameIn, podobne: rows.length, upravy: diffs.length, obrazku: all.length, chybi: missing.length });
