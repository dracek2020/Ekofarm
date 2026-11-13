// RYBARENI_TEST_REPORT.md ze skutečného běhu:  node tools/test-report-v47.mjs
// Akceptační testy 1–29 ze zadání rybaření (05_TESTY_A_INTEGRACE/TESTY_A_KRITERIA.md) = T01–T29.
// Zdroje: test/v47.test.js (TAP), celá sada (npm test), kontrola grafiky (tools/v47check.py), kontrola UI v prohlížeči
// (audit/ui47.json z tools/ui-check-v47.cjs) a simulace (RYBARENI_SIMULACE.md z tools/fish-sim.mjs).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const ALL = Array.from({ length: 29 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
const NAMES = {
  T01: 'Přesné počty v okénku, nulová návnada neaktivní', T02: 'Otevření/zavření okénka nic neodečte', T03: 'Nához odečte přesně 1 kus, po prohře se nevrací',
  T04: 'Dvojklik / opakovaný požadavek nezaúčtuje 2 návnady', T05: 'Poslední kus v rezervě skladu nejde nahodit', T06: 'Těsto = stará „Návnada“ (zásoby i fronta)',
  T07: 'Hrášek bere skladový Hrách', T08: 'Rohlík je jedna položka; Třpytka za mince', T09: 'Prázdný rybník – návnada se neodečte',
  T10: 'Druh a váha skryté do vylovení', T11: 'Úspěch: ryba, rekord, deník, XP jednou', T12: 'Neúspěch: jen „Ryba unikla“',
  T13: 'Výsledek nejde podvrhnout', T14: 'Zamčené ryby nemají žádnou šanci', T15: 'Návnada má měřitelný, ne absolutní vliv',
  T16: 'Výpadek spojení: obnova nebo timeout bez zdvojení', T17: 'Staré ryby, udice, kapacity, deník, rekordy', T18: 'Telefon na výšku a tablet bez přetékání',
  T19: 'PC klik a mezerník, dotyk, kolísání FPS', T20: 'prefers-reduced-motion nezabrání úlovku', T21: 'Dlouhý stisk nevytváří opakované klepnutí',
  T22: 'Server bez průběžného výpočtu každého snímku', T23: '10 ryb, 16 receptů, bez duplicit', T24: 'Recepty neobchází Statek ani Vaření',
  T25: '19 pečiv, žito a mák, 3 mezivýrobky', T26: 'Zakázky/Stánek chtějí jen dosažitelné', T27: 'Ceny ze vzorce, žádná nekonečná smyčka',
  T28: 'Grafický manifest odpovídá realitě', T29: 'Stará farma se načte beze ztráty',
};

// 1) testy v47
const tap = sh(process.execPath, ['--test', '--test-reporter=tap', 'test/v47.test.js']).stdout;
const res = {};
for (const m of tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)) {
  const codes = m[2].match(/^(T\d\d(?: \+ T\d\d)*)/);
  if (!codes) continue;
  for (const c of codes[1].split(' + ')) (res[c] = res[c] || []).push({ ok: m[1] === 'ok', name: m[2].replace(/^T\d\d(?: \+ T\d\d)* /, '') });
}
// 2) celá sada
const full = sh('npm', ['test', '--silent']).stdout;
const num = k => Number((full.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [0, 0])[1]);
// 3) grafika
const art = sh('python3', ['-W', 'ignore', 'tools/v47check.py']);
const artRes = JSON.parse(art.stdout || '{"checked":0,"bad":["kontrola neproběhla"]}');
// 4) prohlížeč
const ui = existsSync(ROOT + 'audit/ui47.json') ? JSON.parse(readFileSync(ROOT + 'audit/ui47.json', 'utf8')) : null;
const runs = ui ? Object.entries(ui.runs) : [];
const uiOk = (pred) => runs.length && runs.every(([, r]) => pred(r) && !r.errs.length);
const uiTxt = (f) => runs.map(([n, r]) => `${n} (${r.viewport}, ${r.input}${r.cpu > 1 ? `, CPU ${r.cpu}× zpomalené` : ''}): ${f(r)}`).join('; ');
const commit = sh('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();
const ver = (readFileSync(ROOT + 'public/js/api.js', 'utf8').match(/APP_VERSION = (\d+)/) || [0, '?'])[1];

const UI_WHERE = 'tools/ui-check-v47.cjs → audit/ui47.json, snímky v náhledu v47';
const MANUAL = {
  T02: ui && [uiOk(r => r.t02 && r.backToPanel) ? 'PASS' : 'FAIL', 'Prohlížeč: okénko otevřeno a zavřeno 3× (Zrušit, Esc, klik vedle) – sklad beze změny, hráč se vrátí do okna rybníka. ' + uiTxt(r => r.t02 ? 'sklad stejný' : 'SKLAD SE ZMĚNIL') + '. Pravidla: test T02 + T03 (výběr nic nestojí).', UI_WHERE],
  T18: ui && [uiOk(r => !r.modalOv.length && !r.fightOv.length && r.modalDuring === false) ? 'PASS' : 'FAIL', 'Prohlížeč: okénko návnad i minihra uvnitř obrazovky, bez vodorovného posunu; během souboje je okénko návnad skryté. ' + uiTxt(r => `okénko ${r.modalOv.length ? r.modalOv.join(',') : 'OK'}, minihra ${r.fightOv.length ? r.fightOv.join(',') : 'OK'}, okénko během souboje ${r.modalDuring ? 'VIDĚT' : 'skryté'}`), UI_WHERE],
  T19: ui && [uiOk(r => /^Úlovek!/.test(r.res)) ? 'PASS' : 'FAIL', 'Prohlížeč: celý nához až po vylovení dotykem, mezerníkem a se 4× zpomaleným CPU (nižší FPS) – server přijal klepnutí ve všech případech. ' + uiTxt(r => r.res.split(' | ').slice(0, 3).join(' ')) + '. Pravidla: test T19 + T21 (pevný krok 30 Hz).', UI_WHERE],
  T20: ui && [uiOk(r => !r.reduced || /^Úlovek!/.test(r.res)) && runs.some(([, r]) => r.reduced) ? 'PASS' : 'FAIL', 'Prohlížeč s prefers-reduced-motion: reduce – bez paprsků a odskoků, úlovek proběhl. ' + uiTxt(r => r.reduced ? r.res.split(' | ').slice(0, 2).join(' ') : 'bez omezení pohybu'), UI_WHERE],
};
const date = new Date().toISOString().slice(0, 10);
let md = `# EKOfarm – test report rybaření, návnad a pečiva (v${ver})\n\nVygenerováno \`node tools/test-report-v47.mjs\` · ${date} · verze hry ${ver} · commit \`${commit}\`${ui ? ` · kontrola v prohlížeči ${ui.date}` : ''}\n\n`;
const rows = ALL.map(c => {
  const auto = res[c] && [res[c].every(x => x.ok) ? 'PASS' : 'FAIL', res[c].map(x => x.name).join('; '), 'test/v47.test.js'];
  const man = MANUAL[c];
  if (auto && man) return [c, auto[0] === 'PASS' && man[0] === 'PASS' ? 'PASS' : 'FAIL', auto[1] + ' · ' + man[1], auto[2] + ', ' + man[2]];
  if (auto) return [c, ...auto];
  if (man) return [c, ...man];
  return [c, 'NOT RUN', 'Bez testu.', ''];
});
const cnt = s => rows.filter(r => r[1] === s).length;
md += `## Souhrn\n- Celá sada testů (\`npm test\`): **${num('pass')} PASS / ${num('fail')} FAIL** z ${num('tests')}.\n`;
md += `- Akceptační testy 1–29: **${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('NOT RUN')} NOT RUN**.\n`;
md += `- Kontrola grafiky (\`tools/v47check.py\`): ${artRes.checked} souborů, chyb ${artRes.bad.length}${artRes.bad.length ? ': ' + artRes.bad.join('; ') : ''}.\n`;
md += `- Úspěšnost minihry je ověřená **automatem** (RYBARENI_SIMULACE.md), ne skutečnými hráči – kalibrace obtížnosti podle hraní zůstává otevřená.\n\n`;
md += `Reprodukce: \`npm test\` (pravidla, server, API přes Worker s falešnou D1), \`node --test test/v47.test.js\` (jen tento balíček), \`python3 tools/v47check.py\` (grafika), \`node tools/build-artifact.mjs\` + \`tools/ui-check-v47.cjs\` (prohlížeč).\n\n`;
md += `| Bod | Kritérium | Stav | Co se ověřilo | Kde |\n|---|---|---|---|---|\n`;
for (const [c, s, why, where] of rows) md += `| ${c} | ${NAMES[c]} | **${s}** | ${why.replace(/\|/g, '/')} | ${where} |\n`;
writeFileSync(ROOT + 'RYBARENI_TEST_REPORT.md', md);
console.log(`RYBARENI_TEST_REPORT.md: ${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('NOT RUN')} NOT RUN; npm test ${num('pass')}/${num('tests')}; grafika ${artRes.checked}/${artRes.bad.length} chyb`);
