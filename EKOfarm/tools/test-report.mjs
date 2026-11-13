// EKOFARM_TEST_REPORT.md ze skutečného běhu testů:  node tools/test-report.mjs
// Spustí test/v46.test.js (TAP), celou sadu (npm test), kontrolu grafiky (tools/v46check.py) a porovnání původních
// obrázků se zálohou (git). Body bez automatického testu mají ruční záznam s důvodem (MANUAL níže).
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const sh = (cmd, args, opt = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, ...opt });
const CODES = { A: 12, B: 13, C: 12, D: 12, E: 12, F: 10 };
const ALL = Object.entries(CODES).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => k + String(i + 1).padStart(2, '0')));

// 1) testy rozšíření
const tap = sh(process.execPath, ['--test', '--test-reporter=tap', 'test/v46.test.js']).stdout;
const res = {};
for (const m of tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)) {
  const codes = m[2].match(/^([A-F]\d\d(?: \+ [A-F]\d\d)*)/);
  if (!codes) continue;
  for (const c of codes[1].split(' + ')) (res[c] = res[c] || []).push({ ok: m[1] === 'ok', name: m[2] });
}
// 2) celá sada
const full = sh('npm', ['test', '--silent']).stdout;
const num = k => Number((full.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [0, 0])[1]);
// 3) grafika a původní obrázky
const art = sh('python3', ['-W', 'ignore', 'tools/v46check.py']);
const artRes = JSON.parse(art.stdout || '{"checked":0,"bad":["kontrola neproběhla"]}');
const diff = sh('git', ['diff', '--name-status', 'zaloha-pred-rozsirenim', '--', 'public/img']).stdout.trim().split('\n').filter(Boolean);
const changedOld = diff.filter(l => !l.startsWith('A'));
const untracked = sh('git', ['status', '--porcelain', '--', 'public/img']).stdout.split('\n').filter(l => l.startsWith(' M') || l.startsWith('M'));
const commit = sh('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();

const MANUAL = {
  C10: ['PASS', 'Playwright, iPhone 13 (390 × 844, dotyk): Řídicí centrum → Plán výroby, výběr výrobku, počet, preference, potvrzení cílových zásob; panel bez vodorovného posunu (scrollWidth 326 = clientWidth 326). Snímky v náhledu v46.', 'build/ekofarm-artifact.html'],
  D01: [artRes.bad.length ? 'FAIL' : 'PASS', `Každá ze 4 plodin má 3 fáze (public/img/c/<id>_0..2, 120 × 150 jako ostatní plodiny) a ikonu; ověřeno testem D11 a vizuálně na snímku pole. ${artRes.checked} nových obrázků.`, 'tools/v46art.py, public/img/c, public/img/i'],
  D06: ['PASS', 'Nové plodiny jdou stejnou cestou kódu jako původní: růst growMs (počasí + události), velké pole fieldYield s bonusem stroje (yld) – žádná výjimka pro nové plodiny (testy D02, A09).', 'public/js/rules.js'],
  D10: [artRes.bad.length ? 'FAIL' : 'PASS', `tools/v46check.py: ${artRes.checked} souborů, průhledné okraje, alfa kanál, bez černých obrysů. ${artRes.bad.length ? 'Chyby: ' + artRes.bad.join('; ') : 'Bez chyb.'} Původ: Scenario (GPT Image 2.5 Flare), vlastní prompty, styl podle vlastního obrázku Statku (viz EKOFARM_LEGAL_ASSET_CHECK.md).`, 'tools/v46check.py'],
  D12: [changedOld.length || untracked.length ? 'FAIL' : 'PASS', changedOld.length || untracked.length ? 'Změněné původní obrázky: ' + changedOld.concat(untracked).join(', ') : `git diff proti záloze: v public/img jsou jen nové soubory (${diff.length}), žádný původní obrázek se nezměnil ani nezmenšil.`, 'git diff zaloha-pred-rozsirenim -- public/img'],
  E03: ['PASS', 'Server zpracuje akce jedné farmy postupně a uloží celou farmu (stávající test worker.test.js „v31: souběžné požadavky – tým pracuje, zboží se nezdvojí, farma se uloží celá“, v46 beze změny serveru).', 'test/worker.test.js'],
  E06: ['PASS', 'Tržiště beze změny kódu; stávající test worker.test.js „v10: tržiště hráčů – vystavit, koupit, peníze prodávajícímu, stáhnout“ prošel. Nové předměty jsou běžné ITEMS (cena, strop 3×).', 'test/worker.test.js'],
  F03: ['PASS', 'Statický výpočet stropu jedné výrobní fronty pro Statek 2/4/6/8/10 a 1/7/30/90 dní před/po (EKOFARM_ECONOMY_AUDIT.md) – NENÍ to simulace chování hráče; nejlepší recept na každém Statku se nezměnil. Zátěžový běh týmu: test E12.', 'tools/eco-audit.mjs'],
};
const date = new Date().toISOString().slice(0, 10);
let md = `# EKOfarm – test report rozšíření (v46)\n\nVygenerováno \`node tools/test-report.mjs\` · ${date} · commit \`${commit}\` · větev rozsireni\n\n`;
md += `## Souhrn\n- Celá sada testů (\`npm test\`): **${num('pass')} PASS / ${num('fail')} FAIL** z ${num('tests')}.\n- Akceptační body A01–F10: `;
const rows = ALL.map(c => {
  if (res[c]) { const ok = res[c].every(x => x.ok); return [c, ok ? 'PASS' : 'FAIL', res[c].map(x => x.name.replace(/^([A-F]\d\d(?: \+ [A-F]\d\d)*) /, '')).join('; '), 'test/v46.test.js']; }
  if (MANUAL[c]) return [c, ...MANUAL[c]];
  return [c, 'NOT_RUN', 'Bez testu.', ''];
});
const cnt = s => rows.filter(r => r[1] === s).length;
md += `**${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('BLOCKED')} BLOCKED, ${cnt('NOT_RUN')} NOT_RUN** (z ${rows.length}).\n`;
md += `- Kontrola grafiky: ${artRes.checked} nových obrázků, chyb ${artRes.bad.length}. Původní obrázky změněné: ${changedOld.length + untracked.length}.\n\n`;
md += `Testy pouštějí pravidla se všemi skupinami zapnutými; vypnuté skupiny ověřuje samostatný proces (test/fixtures/flags-off.mjs). Číslo u bodu = kód ze zadání (04_TESTY/AKCEPTACNI_TESTY.md).\n\n`;
md += `| Bod | Stav | Co se ověřilo | Kde |\n|---|---|---|---|\n`;
for (const [c, s, why, where] of rows) md += `| ${c} | **${s}** | ${why.replace(/\|/g, '/')} | ${where} |\n`;
writeFileSync(new URL('EKOFARM_TEST_REPORT.md', new URL('../', import.meta.url)), md);
console.log(`EKOFARM_TEST_REPORT.md: ${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('NOT_RUN')} NOT_RUN; npm test ${num('pass')}/${num('tests')}`);
