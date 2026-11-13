// Simulace rybaření v47 ze skutečných pravidel:  node tools/fish-sim.mjs  → RYBARENI_SIMULACE.md
// 1) vliv návnad na druh (10 000 losů na návnadu a vodu), 2) úspěšnost minihry podle udice, profilu a „hráče“
// (automat s reakcí a omezeným tempem klepání – NE skuteční hráči), 3) hodnota úlovku za nához proti ceně návnady,
// 4) cena ověření na serveru (přehrání souboje).
import { writeFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';
import { botTaps, srv } from '../test/fixtures/fish-bot.mjs';
import { FIGHT } from '../public/js/eco-config.js';

const T0 = 1_800_000_000_000;
const pct = x => `${Math.round(x * 100)} %`;
const rods = R.MACHINE_LIST.filter(m => m.type === 'rod').sort((a, b) => a.tier - b.tier);
function farm(r, pond, rod = rods[0]) {
  const f = R.newFarm(T0); f.objects.find(o => o.kind === 'statek').lvl = 10; f.sk = { f: 0, r: R.SKILL_XP[r], v: 0 };
  f.machines = [{ id: 1, model: rod.id }];
  const o = { id: 2, kind: pond, x: 0, y: 0, lvl: 1 }; f.objects.push(o);
  return { f, o };
}
let md = '# EKOfarm v47 – simulace rybaření (vygenerováno `node tools/fish-sim.mjs`)\n\n';
md += 'Všechno počítají skutečná pravidla hry (`public/js/rules.js`). Úspěšnost minihry hraje **automat**, ne skuteční hráči: klepe podle polohy šipky a zóny, s reakcí 0,08–0,35 s a nejvýš 4–10 klepnutími za sekundu podle „šikovnosti“. Skutečnou úspěšnost je potřeba ověřit hraním (návrh: sbírat počet úspěšných a uniklých ryb podle profilu a udice).\n\n';

// 1) návnady
md += '## 1. Vliv návnady na druh (10 000 losů, podíl oblíbených ryb návnady)\n| Voda / Rybaření | Návnada | Oblíbené ryby, které tu berou | Bez návnady | S návnadou | Poměr |\n|---|---|---|---|---|---|\n';
for (const [pond, r] of [['rybnik', 12], ['rybnik2', 20], ['rybnik4', 50]]) {
  const { f, o } = farm(r, pond), S = srv(5), pool = R.fishPool(f, o);
  for (const b of R.BAIT_LIST) {
    const liked = b.pref.filter(id => pool.some(x => x.id === id));
    if (!liked.length) continue;
    const share = bait => { let n = 0; for (let i = 0; i < 10000; i++) if (liked.includes(R.pickFish(f, S.rand(), T0, o, bait))) n++; return n / 10000; };
    const a = share(null), c = share(b.id);
    md += `| ${R.BUILDINGS[pond].name} / ${r} | ${b.name} | ${liked.map(id => R.FISH[id].name).join(', ')} | ${pct(a)} | ${pct(c)} | ${(c / a).toFixed(2).replace('.', ',')}× |\n`;
  }
}
md += '\nNávnada mění jen poměr mezi druhy, které v dané vodě a s danou úrovní Rybaření berou (násobek 1,6 oblíbené / 0,85 ostatní); nikdy nepřidá zamčený druh a nikdy nezaručí konkrétní rybu.\n';

// 2) minihra
md += '\n## 2. Úspěšnost minihry (automat, 300 soubojů na buňku) a průměrná délka úspěšného souboje\n| Udice | Hráč | Profil 1 (lehká) | Profil 2 (střední) | Profil 3 (těžká) |\n|---|---|---|---|---|\n';
const levels = { 'pozorný': 1, 'průměrný': 0.6, 'začátečník': 0.3, 'náhodné klepání': 0 };
for (const t of [1, 5, 10]) for (const [name, skill] of Object.entries(levels)) {
  const cells = [1, 2, 3].map(p => {
    let win = 0, steps = 0;
    for (let i = 0; i < 300; i++) { const { f } = farm(t * 3, 'rybnik', rods[t - 1]); const P = R.fightParams(f, { p, z: i * 7919 + 13 }); const b = botTaps(R, P, skill, i + 1); if (b.res === 'win') { win++; steps += b.steps; } }
    return `${pct(win / 300)}${win ? ` · ${(steps / win / FIGHT.hz).toFixed(1).replace('.', ',')} s` : ''}`;
  });
  md += `| ${rods[t - 1].name} (${t}) | ${name} | ${cells.join(' | ')} |\n`;
}
md += '\nProfil obtížnosti posílá server (1 = ryba s obtížností pod 0,35, 2 = do 0,65, 3 = těžší; velký kus občas o stupeň výš). Z profilu nejde poznat druh – v každém je víc ryb. Lepší udice = širší zóna, rychlejší postup a pomalejší napětí; náhodné klepání skoro nikdy neuspěje.\n';

// 3) ekonomika
md += '\n## 3. Hodnota úlovku za nához proti ceně návnady (pozorný hráč, úspěšný úlovek)\nCena návnady = prodejní cena položky ve skladu (to, o co hráč přijde, když ji místo prodeje nahodí). Hodnota úlovku = průměr ceny ryby × počtu kusů podle velikosti.\n\n| Voda / Rybaření | ' + R.BAIT_LIST.map(b => b.name).join(' | ') + ' |\n|---|' + R.BAIT_LIST.map(() => '---').join('|') + '|\n';
const neg = {};
for (const [pond, r, t] of [['rybnik', 6, 2], ['rybnik2', 12, 3], ['rybnik3', 15, 5], ['rybnik4', 25, 8], ['rybnik4', 40, 10]]) {
  const cells = R.BAIT_LIST.map(b => {
    const { f, o } = farm(r, pond, rods[t - 1]), S = srv(11);
    if (R.baitLock(f, b)) return '—';
    let val = 0; const N = 3000;
    for (let i = 0; i < N; i++) {
      const fish = R.FISH[R.pickFish(f, S.rand(), T0, o, b.id)];
      const kg = fish.kg[0] + (fish.kg[1] - fish.kg[0]) * Math.pow(S.rand(), 1.8);
      val += fish.price * R.fishSize(fish, kg).qty;
    }
    val /= N;
    const cost = R.ITEMS[b.item].price, d = Math.round(val - cost);
    if (d < 0) (neg[b.name] ||= []).push(`${R.BUILDINGS[pond].name} / ${r}`);
    return `${cost} → ${Math.round(val)} (${d > 0 ? '+' : ''}${d})`;
  });
  md += `| ${R.BUILDINGS[pond].name} / ${r} | ${cells.join(' | ')} |\n`;
}
md += '\nZápis: cena návnady → průměrná hodnota úlovku (rozdíl za nához). „—“ = návnada je na téhle úrovni ještě zamčená.\n\n';
md += Object.keys(neg).length
  ? '**Ekonomická poznámka:** ' + Object.entries(neg).map(([n, w]) => `${n} je dražší než průměrný úlovek (${w.join(', ')})`).join('; ') + '. Sýr je podle zadání existující výrobek z Mlékárny (žádný nový), masová návnada je navržený recept 1 maso → 3 kusy. Obojí je volba hráče – návnada jen zvýší šanci na své ryby, nic nezaručí a cena je vidět ve skladu. Pokud se má sýr a masová návnada vyplácet i průměrně, je potřeba po zkušenostech hráčů upravit recept (např. 1 maso → 6) nebo ceny ryb – v této verzi zůstávají přesně podle zadání.\n'
  : 'Všechny odemčené návnady se v uvedených vodách vyplatí.\n';
md += '\nKukuřice, hrách a rohlík jsou zároveň zboží, takže hráč „platí“ jejich cenou. Lepší udice navíc občas návnadu ušetří.\n';

// 4) server
{
  const { f } = farm(20, 'rybnik'), P = R.fightParams(f, { p: 3, z: 99 }), b = botTaps(R, P, 1, 1);
  const t0 = performance.now(); for (let i = 0; i < 1000; i++) R.fightReplay(P, b.taps);
  md += `\n## 4. Server\nOvěření souboje = jedno přehrání při vylovení (žádný průběžný výpočet každého snímku): ${((performance.now() - t0) / 1000).toFixed(3).replace('.', ',')} ms na souboj (${b.steps} kroků).\n`;
}
writeFileSync(new URL('../RYBARENI_SIMULACE.md', import.meta.url), md);
console.log('RYBARENI_SIMULACE.md hotovo');
