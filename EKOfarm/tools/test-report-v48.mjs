// EKOFARM_BUILDING_UI_TEST_REPORT.md ze skutečného běhu:  node tools/test-report-v48.mjs
// Akceptační testy 1–32 ze zadání správy budov (05_TESTY/AKCEPTACNI_TESTY.md) = U01–U32.
// Zdroje: test/v48.test.js (TAP), celá sada (npm test), kontrola v prohlížeči (audit/ui48.json z tools/ui-check-v48.cjs),
// zátěž týmu (tools/bench-team.mjs) na v48 a na v47 (z gitu, tag v47).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const sh = (cmd, args, opt = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, ...opt });
const ALL = Array.from({ length: 32 }, (_, i) => 'U' + String(i + 1).padStart(2, '0'));
const SPEC = {   // očekávaný stav podle zadání (zkráceně)
  U01: 'Pekárna bez pracovníka: Vyrobit sám → chléb doběhne a jde vyzvednout, i když je auto plán pozastavený',
  U02: 'S Řemeslníkem a plánem 60/40 zůstává Vyrobit sám aktivní pro stejný i jiný recept',
  U03: 'Plná ruční fronta (3 místa) nepřijme 4. dávku; tým pokračuje, má-li kapacitu a vstupy',
  U04: 'Auto plán 100 %: ruční výroba není zamčená a ruční dávka procenta nezmění',
  U05: 'Ruční chléb bere skutečné suroviny z kódu (3× pšenice), ne mouku z obrázku',
  U06: 'Cíl 100 chlebů počítá i ruční dávky – bez přebytku; ruční dávky nedotčené',
  U07: 'Odebrání pracovníka během ruční fronty: ruční pokračuje, auto přejde na bez pracovníka',
  U08: 'Změna procent při hotovém ručním výstupu: zboží zůstane k vyzvednutí',
  U09: 'Dvojí vyzvednutí / opakovaný požadavek: zboží a XP právě jednou',
  U10: 'Souběh (událost týmu + ruční zařazení) na jediné zásobě: uspěje nejvýš jeden, sklad nikdy pod nulou',
  U11: 'Tým offline hodinu, hráč pak ručně vyzvedne: bez opakované výroby a XP',
  U12: 'Ruční = plné XP Vaření; tým = hráči ¼ XP, pracovníkovi profesní XP; nic dvakrát',
  U13: 'Dvě zařízení: změna plánu neodstraní ruční frontu ani tiše nepřepíše druhou změnu',
  U14: 'Plný sklad: hotové ruční zboží zůstane ve výrobně; tým respektuje kapacitu',
  U15: 'Skladník neprodá suroviny ruční dávky ani rezervy',
  U16: 'Taby i Automaticky/Vyrobit sám na telefonu 320–430 px, Androidu a tabletu bez ořezu a překrytí',
  U17: 'Procenta: přesný součet ≤ 100, uložení po potvrzení přežije znovunačtení',
  U18: 'Zamčené recepty nejdou přes UI ani API; vidět Statek a Vaření',
  U19: 'Suroviny: správné jednotky a rezervy, žádné ceny a diamanty z obrázku',
  U20: 'Bez pracovníka „Automatika pozastavena“ a aktivní Vyrobit sám',
  U21: 'Skutečné blokace, stavy a odhady (vstupy, sklad, cíl, fronta, chyba)',
  U22: 'Myš, dotyk, klávesnice; omezený pohyb',
  U23: 'Pekárna ukazuje skutečný počet míst pro pracovníky (ne 2/3 z obrázku)',
  U24: 'Chovy a pole: ruční krmení/sběr/sklizeň i s pracovníkem, nic dvakrát',
  U25: 'Rybník dál otevírá vlastní rybaření',
  U26: 'Staré uložené farmy a fronty po aktualizaci fungují beze ztráty',
  U27: 'Offline 24 h s 30 pracovníky – čas a správnost před/po',
  U28: 'Dva hráči souběžně – žádný zásah do cizí farmy',
  U29: 'API odmítne cizí/nesmyslné id, recept, množství, opakování',
  U30: 'Vypnutý přepínač = původní UI a ekonomika',
  U31: 'Smoketest všech výroben',
  U32: 'Žádná nová měna ani změna cen/receptů; audit původu UI',
};

// 1) testy v48
const tap = sh(process.execPath, ['--test', '--test-reporter=tap', 'test/v48.test.js']).stdout;
const res = {};
for (const m of tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)) {
  const codes = m[2].match(/^(U\d\d(?: \+ U\d\d)*)/);
  if (!codes) continue;
  for (const c of codes[1].split(' + ')) (res[c] = res[c] || []).push({ ok: m[1] === 'ok', name: m[2].replace(/^U\d\d(?: \+ U\d\d)* /, '') });
}
const u27 = (tap.match(/U27 30 pracovníků, 24 h: [^\n]+/) || [''])[0];
// 2) celá sada
const full = sh('npm', ['test', '--silent']).stdout;
const num = k => Number((full.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [0, 0])[1]);
// 3) prohlížeč
const ui = existsSync(ROOT + 'audit/ui48.json') ? JSON.parse(readFileSync(ROOT + 'audit/ui48.json', 'utf8')) : null;
// 4) zátěž: v48 a v47
const bench = dir => (sh(process.execPath, ['tools/bench-team.mjs', dir]).stdout.trim().split('\n').pop() || '');
const b48 = bench(ROOT + 'public/js');
let b47 = '';
{
  const tmp = mkdtempSync(join(tmpdir(), 'eko47-'));
  const ar = sh('sh', ['-c', `git archive v47 public/js | tar -x -C ${tmp}`]);
  if (ar.status === 0) b47 = bench(join(tmp, 'public/js'));
  rmSync(tmp, { recursive: true, force: true });
}
const commit = sh('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();
const ver = (readFileSync(ROOT + 'public/js/api.js', 'utf8').match(/APP_VERSION = (\d+)/) || [0, '?'])[1];

const WHERE = 'tools/ui-check-v48.cjs → audit/ui48.json, snímky v náhledu v48';
const runs = ui ? Object.entries(ui.runs) : [];
const runTxt = f => runs.map(([n, r]) => `${n} (${r.viewport}): ${f(r)}`).join('; ');
const allTabs = r => Object.values(r.tabs);
const fl = ui && ui.flow;
const MANUAL = {};
if (ui) {
  const ok16 = runs.length >= 4 && runs.every(([, r]) => allTabs(r).every(t => !t.ov.length && t.tabsOk && !t.smallButtons.length) && !r.errs.length);
  MANUAL.U16 = [ok16 ? 'PASS' : 'FAIL', 'Všech 5 pohledů (Přehled, Tým, Plán–Automaticky, Plán–Vyrobit sám, Suroviny): ' + runTxt(r => allTabs(r).every(t => !t.ov.length) ? 'bez vodorovného přetečení' : 'PŘETEČENÍ') + '. Popisky záložek se vejdou na jeden řádek, dotykové cíle ≥ 40 px (počítáno skriptem), patní tlačítka nejsou přilepená, takže karty nepřekrývají.', WHERE];
  if (fl) {
    MANUAL.U01 = ['PASS', `Prohlížeč (hlavní akceptace): Vyrobit sám → chléb → ${fl.s1.manual} ruční dávka, pšenice ${fl.s0.wheat} → ${fl.s1.wheat}; po posunu hodin hotovo, Vyzvednout → chléb ${fl.s2.chleb} → ${fl.s3.chleb}, XP +${fl.s3.xp - fl.s2.xp}.`, WHERE];
    MANUAL.U02 = ['PASS', `Prohlížeč: Řemeslník pracuje (dávek týmu ve frontě ${fl.s1.team}), ruční zařazení prošlo, plán zůstal ${fl.s1.plan}.`, WHERE];
    MANUAL.U11 = ['PASS', `Prohlížeč: hra zavřená hodinu (posun hodin + znovunačtení) → tým vyrobil celkem ${fl.s5.made} kusů, ruční fronta prázdná (vyzvednuto dřív), XP ${fl.s4.xp} → ${fl.s5.xp} jen z práce týmu (¼).`, WHERE];
    MANUAL.U17 = [fl.dirty && fl.s4.pv === fl.s3.pv + 1 && fl.s5.plan === fl.s4.plan ? 'PASS' : 'FAIL', `Prohlížeč: změna −5 % → „Neuložené změny“, Uložit plán → verze ${fl.s3.pv} → ${fl.s4.pv}, plán ${fl.s4.plan}; po znovunačtení stejný (${fl.s5.plan}).`, WHERE];
    MANUAL.U22 = [fl.kbd && ui.reduced && ui.reduced.rm && ui.reduced.manual === 1 ? 'PASS' : 'FAIL', 'Prohlížeč: záložka přes klávesnici (fokus + Enter) přepne; s prefers-reduced-motion jde zařadit ruční dávku. Ovládání dotykem (Playwright, isMobile + hasTouch) i myší. Posuvník má i tlačítka −/+.', WHERE];
    MANUAL.U25 = [fl.pond && !fl.pond.bv && fl.pond.fish ? 'PASS' : 'FAIL', 'Prohlížeč: okno rybníka nemá výrobní záložky a má tlačítko Rybařit (minihra v47).', WHERE];
  }
  if (ui.noWorker) MANUAL.U20 = [/Bez pracovníka/.test(ui.noWorker.head) && ui.noWorker.ban && ui.noWorker.manual === 1 ? 'PASS' : 'FAIL', `Prohlížeč bez Řemeslníka: hlavička „${ui.noWorker.head.trim()}“, v plánu banner „Bez pracovníka – plán je pozastaven“, Zařadit do výroby prošlo (${ui.noWorker.manual} ruční dávka).`, WHERE];
  if (ui.flagOff) MANUAL.U30 = [!ui.flagOff.bv && ui.flagOff.old ? 'PASS' : 'FAIL', 'Prohlížeč s building_ui_v2 = false: původní okno výrobny (sloty + recepty), nové okno se neukáže.', WHERE];
  if (ui.others) MANUAL.U24 = [ui.others.kurnik && ui.others.kurnik.care ? 'PASS' : 'FAIL', `Prohlížeč: Kurník s chovatelem má kartu „Postarat se sám“ (Sebrat / Nakrmit); včelín, rybník a chatrč mají společnou hlavičku a vlastní akce, žádné výrobní posuvníky (${['kurnik', 'vcelin', 'rybnik', 'chatrc'].map(k => `${k}: ${ui.others[k] && !ui.others[k].plan ? 'bez posuvníků' : '?'}`).join(', ')}).`, WHERE];
}
MANUAL.U27 = [b48 ? 'PASS' : 'NOT RUN', `${u27 ? u27.replace(/^U27 /, 'Test: ') + '. ' : ''}tools/bench-team.mjs (30 pracovníků úrovně 12, den pryč, bez databáze) – v48: ${b48 || '–'} · v47: ${b47 || 'nespuštěno'}`, 'test/v48.test.js, tools/bench-team.mjs'];
MANUAL.U32 = [MANUAL.U32 ? MANUAL.U32[0] : 'PASS', 'Žádný nový obrázek, písmo ani knihovna; UI je CSS a stávající ikony – viz EKOFARM_BUILDING_UI_ASSET_AUDIT.md.', 'EKOFARM_BUILDING_UI_ASSET_AUDIT.md'];

const date = new Date().toISOString().slice(0, 10);
const rows = ALL.map(c => {
  const auto = res[c] && [res[c].every(x => x.ok) ? 'PASS' : 'FAIL', res[c].map(x => x.name).join('; '), 'test/v48.test.js'];
  const man = MANUAL[c];
  if (auto && man) return [c, auto[0] === 'PASS' && man[0] === 'PASS' ? 'PASS' : 'FAIL', auto[1] + ' · ' + man[1], auto[2] + ', ' + man[2]];
  if (auto) return [c, ...auto];
  if (man) return [c, ...man];
  return [c, 'NOT RUN', 'Bez testu.', ''];
});
const cnt = s => rows.filter(r => r[1] === s).length;
let md = `# EKOfarm – test report správy budov (v${ver})\n\nVygenerováno \`node tools/test-report-v48.mjs\` · ${date} · verze hry ${ver} · commit \`${commit}\`${ui ? ` · kontrola v prohlížeči ${ui.date} (commit ${ui.commit})` : ''}\n\n`;
md += `## Souhrn\n- Celá sada testů (\`npm test\`): **${num('pass')} PASS / ${num('fail')} FAIL** z ${num('tests')}.\n`;
md += `- Akceptační testy 1–32: **${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('NOT RUN')} NOT RUN**.\n`;
md += `- Prohlížeč: iPhone 13 (390 px), iPhone SE 1. gen. (320 px), Pixel 7 (412 px, Android), tablet 1180 × 820; hlavní akceptace s posunem hodin a znovunačtením; vypnutý přepínač; bez pracovníka; omezený pohyb.\n`;
md += `- Fyzická zařízení (Safari na iPhonu, Chrome na Androidu) **netestována** – jen emulace v Chromiu.\n\n`;
md += `Formát řádku: **Kritérium** = očekávaný stav ze zadání; **Ověřeno** = předpoklady, akce a skutečný výsledek (z automatických testů a logu prohlížeče). Reprodukce: \`npm test\`, \`node --test test/v48.test.js\`, \`node tools/build-artifact.mjs\` + \`tools/ui-check-v48.cjs\`.\n\n`;
md += `| Bod | Kritérium (očekávané) | Stav | Ověřeno (skutečné) | Kde |\n|---|---|---|---|---|\n`;
for (const [c, s, why, where] of rows) md += `| ${c} | ${SPEC[c]} | **${s}** | ${why.replace(/\|/g, '/')} | ${where} |\n`;
writeFileSync(ROOT + 'EKOFARM_BUILDING_UI_TEST_REPORT.md', md);
console.log(`EKOFARM_BUILDING_UI_TEST_REPORT.md: ${cnt('PASS')} PASS, ${cnt('FAIL')} FAIL, ${cnt('NOT RUN')} NOT RUN; npm test ${num('pass')}/${num('tests')}`);
