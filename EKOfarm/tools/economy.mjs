// Vygeneruje přehled ekonomiky do EKONOMIKA.md:  node tools/economy.mjs
import { writeFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';

const t = s => (s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.0', '')} h`);
const n = id => R.ITEMS[id].name;
const usedIn = id => Object.values(R.RECIPES).filter(r => r.in[id]).map(r => n(r.id));
let md = '# EKOfarm – ekonomika (vygenerováno z pravidel)\n\n';
md += 'Výkup ve skladu platí **50 % ceny** × tržní výkyv (0,7–1,4×). Stánek vykupuje za 70–88 %, prodává za 133–160 %. Zakázky platí **130–170 %** + XP.\n\n';
md += '## Plodiny (malé pole, výnos 2 ks)\n| Plodina | Druh | Úroveň | Osivo | Růst | Cena/ks | Použití |\n|---|---|---|---|---|---|---|\n';
for (const c of R.CROP_LIST) md += `| ${c.name} | ${R.CROP_CATS[c.cat]} | ${c.level} | ${c.cost} | ${t(c.time)} | ${c.price} | ${usedIn(c.id).join(', ')} |\n`;
md += '\n## Sad (stromy a keře)\n| Strom/keř | Úroveň | Sazenice | První úroda | Další | Úrod × kusů | Ovoce cena | Použití |\n|---|---|---|---|---|---|---|---|\n';
for (const x of R.TREE_LIST) md += `| ${x.name} | ${x.level} | ${x.cost} | ${t(x.first)} | ${t(x.regrow)} | ${x.harvests} × ${x.yield} | ${R.FRUITS[x.fruit].price} | ${usedIn(x.fruit).join(', ')} |\n`;
md += '\n## Zvířata\n| Zvíře | Úroveň | Cena | Krmivo | Produkt | Čas | Cena produktu |\n|---|---|---|---|---|---|---|\n';
for (const a of R.ANIMAL_LIST) md += `| ${a.name} | ${a.level} | ${a.cost} | ${n(a.feed)} | ${n(a.product)} | ${t(a.time)} | ${R.ITEMS[a.product].price} |\n`;
md += '\n## Výroba\n| Výrobek | Budova | Úroveň | Suroviny | Čas | Cena |\n|---|---|---|---|---|---|\n';
for (const r of Object.values(R.RECIPES)) md += `| ${n(r.id)} | ${R.BUILDINGS[r.building].name} | ${r.level} | ${Object.entries(r.in).map(([id, q]) => `${q}× ${n(id)}`).join(', ')} | ${t(r.time)} | ${R.ITEMS[r.id].price} |\n`;
md += '\n## Budovy\n| Budova | Úroveň hráče | Statek | Cena |\n|---|---|---|---|\n';
for (const b of R.BUILDING_LIST.filter(b => b.type !== 'deco')) md += `| ${b.name} | ${b.level} | ${b.st || '–'} | ${b.cost || 'zdarma'} |\n`;
md += `\nStatek úroveň 2–10 potřebuje úroveň hráče: ${R.STATEK_LEVELS.slice(2).join(', ')}. Ostatní budovy nesmí mít vyšší úroveň než Statek.\n`;
writeFileSync(new URL('../EKONOMIKA.md', import.meta.url), md);
console.log('EKONOMIKA.md hotovo');
