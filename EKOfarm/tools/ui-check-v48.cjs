// v48 – kontrola okna výrobny v prohlížeči (Playwright) na testovací verzi build/ekofarm-artifact.html.
// Hlavní akceptace: Pekárna, ve které automaticky vyrábí Řemeslník podle procent a cílové zásoby → „Vyrobit sám“ →
// chléb do vlastní fronty → počkat (posun hodin) → vyzvednout; tým mezitím pracuje dál a plán se nezmění.
// Dál: 4 záložky na telefonu 320–430 px, Androidu a tabletu bez vodorovného přetečení, Uložit plán, klávesnice,
// omezený pohyb, vypnutý přepínač (staré okno), rybník otevírá rybaření.
//   node tools/build-artifact.mjs && (cd build && python3 -m http.server 8790 &) && node tools/ui-check-v48.cjs [složka na snímky]
// Výsledek: audit/ui48.json (čte ho tools/test-report-v48.mjs), snímky ui48_<zařízení>_<stav>.png.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const D = (process.argv[2] || path.join(__dirname, '..', 'build')) + '/';
const URL = process.env.EKO_URL || 'http://localhost:8790/ekofarm-artifact.html';
const out = { runs: {}, flow: null, flagOff: null };

async function setup(q) {
  await q.goto(URL); await q.waitForTimeout(2500);
  await q.evaluate(() => {
    const f = JSON.parse(localStorage.getItem('ekofarm_local_v1')), now = Date.now();
    f.level = 30; f.xp = 49700; f.coins = 50000; f.tut = 99; f.pending = []; f.ev = { k: 1e9, h: [] }; f.story = { n: 99, d: '', f: [], r: {}, log: [] };
    f.objects = f.objects.filter(o => o.kind === 'statek'); f.objects.find(o => o.kind === 'statek').lvl = 6;
    const pek = { id: f.nextId++, kind: 'pekarna', x: 9, y: 3, lvl: 4, queue: [], plan: { chleb: 60, kolac: 40 }, target: [['chleb', 100]], pv: 1 };
    const kur = { id: f.nextId++, kind: 'kurnik', x: 12, y: 7, lvl: 1, animals: [{ fed: 0 }, { fed: now - 3 * 3600000 }] };
    f.objects.push({ id: f.nextId++, kind: 'sklad', x: 3, y: 11, lvl: 1 }, pek, { id: f.nextId++, kind: 'rybnik', x: 1, y: 2, lvl: 1 }, { id: f.nextId++, kind: 'chatrc', x: 13, y: 12, lvl: 1 },
      kur, { id: f.nextId++, kind: 'vcelin', x: 4, y: 7, lvl: 1 });
    f.silo.krmivo_slepice = 4;
    f.silo = { wheat: 120, vejce: 30, mouka: 12, med: 6, cukr: 3, mleko: 8 }; f.keep = { cukr: 8, wheat: 20 }; f.siloCap = 400;
    f.sk = { f: 0, r: 0, v: 12000 }; f.skv = 2;
    f.vill = [{ id: f.nextId++, prof: 'vyroba', trait: null, xp: { vyroba: 900 }, hist: [], at: pek.id, area: null, t: now, n: 0 },
      { id: f.nextId++, prof: 'chov', trait: null, xp: { chov: 300 }, hist: [], at: kur.id, area: null, t: now, n: 0 }];
    localStorage.setItem('ekofarm_local_v1', JSON.stringify(f));
  });
  await q.reload(); await q.waitForTimeout(3500);
  await dismiss(q);
  return q.evaluate(() => window.__eko.farm.objects.find(o => o.kind === 'pekarna').id);
}
const overflow = q => q.evaluate(() => {
  const W = innerWidth, bad = [];
  for (const el of document.querySelectorAll('#panel .bv *')) {
    if (!el.offsetParent) continue;
    const r = el.getBoundingClientRect();
    if (r.width && (r.left < -1 || r.right > W + 1)) { bad.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '–' + Math.round(r.right)); if (bad.length > 5) break; }
  }
  const p = document.getElementById('panel');
  if (p.scrollWidth > p.clientWidth + 1) bad.push('panel scrollWidth ' + p.scrollWidth + ' > ' + p.clientWidth);
  return bad;
});
const tabsOk = q => q.evaluate(() => [...document.querySelectorAll('.bv-tab')].map(t => { const b = t.querySelector('b'); return b.scrollWidth <= t.clientWidth + 1 && t.getBoundingClientRect().height < 80; }).every(Boolean));
// dotykové cíle menší než 40 px (zadání: asi 44 px; čipy a obrázky výrobků se nepočítají) – vrací seznam „třída/akce rozměr“
const small = async (q, sel) => q.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [(e.dataset.act || e.className || e.tagName), Math.round(Math.min(r.width, r.height))]; }).filter(x => x[1] < 40).map(x => x.join(' ')), sel);
const shot = (q, name) => q.screenshot({ path: D + `ui48_${name}.png` });
const dismiss = q => q.evaluate(() => { for (const id of ['lvlUp', 'banner']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; } });   // okno nové úrovně apod.
const click = async (q, sel) => { await dismiss(q); await q.click(sel); };

(async () => {
  const b = await chromium.launch();
  const DEV = [
    ['iphone13', { ...devices['iPhone 13'] }],
    ['iphone_se1', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
    ['pixel7', { ...devices['Pixel 7'] }],
    ['tablet', { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ];
  for (const [name, opt] of DEV) {
    const c = await b.newContext(opt), q = await c.newPage(), errs = [];
    q.on('pageerror', e => errs.push(e.message)); q.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const id = await setup(q);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(700);
    const r = { viewport: await q.evaluate(() => innerWidth + ' × ' + innerHeight), tabs: {}, errs };
    for (const [tab, mode] of [['prehled'], ['tym'], ['plan', 'auto'], ['plan', 'manual'], ['suroviny']]) {
      await click(q, `.bv-tab[data-v="${tab}"]`); await q.waitForTimeout(300);
      if (mode) { await click(q, `.bv-seg [data-v="${mode}"]`); await q.waitForTimeout(300); }
      const key = tab + (mode ? '_' + mode : '');
      r.tabs[key] = { ov: await overflow(q), tabsOk: await tabsOk(q), smallButtons: await small(q, '#panel .bv button:not(.bv-tab):not(.chip):not(.bv-pic)') };
      if (name === 'iphone13' || name === 'tablet' || (name === 'iphone_se1' && key === 'plan_manual')) await shot(q, `${name}_${key}`);
    }
    out.runs[name] = r;
    await c.close();
  }

  // ---- hlavní akceptace (iPhone 13, hodiny pod kontrolou) ----
  {
    const c = await b.newContext({ ...devices['iPhone 13'] }), q = await c.newPage(), errs = [];
    q.on('pageerror', e => errs.push(e.message)); q.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await q.clock.install();
    const id = await setup(q);
    const st = () => q.evaluate(i => { const f = window.__eko.farm, o = f.objects.find(x => x.id === i); return { plan: JSON.stringify(o.plan), target: JSON.stringify(o.target), pv: o.pv || 0, manual: o.queue.filter(x => !x.t).length, team: o.queue.filter(x => x.t).length, chleb: f.silo.chleb || 0, wheat: f.silo.wheat || 0, xp: f.xp, cook: f.sk.v, vjob: f.vill[0].job ? f.vill[0].job.k : f.vill[0].w, made: (o.log || []).reduce((n, [, m]) => n + (m.chleb || 0) + (m.kolac || 0), 0) }; }, id);
    await q.clock.fastForward('02:00'); await q.waitForTimeout(800);
    const s0 = await st();
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(500);
    await click(q, '[data-act="bvGo"][data-v="manual"]'); await q.waitForTimeout(400);
    await click(q, '.bv-row[data-v="chleb"]'); await q.waitForTimeout(300);
    await shot(q, 'flow_1_vyrobit_sam');
    await click(q, '.bv-go'); await q.waitForTimeout(600);
    const s1 = await st();
    await shot(q, 'flow_2_zarazeno');
    await q.clock.fastForward('08:00'); await q.waitForTimeout(1500);
    const s2 = await st();
    await shot(q, 'flow_3_hotovo');
    await dismiss(q);
    if (await q.$('.bv-lane.me [data-act="collect"]')) { await click(q, '.bv-lane.me [data-act="collect"]'); await q.waitForTimeout(600); }
    const s3 = await st();
    await shot(q, 'flow_4_vyzvednuto');
    // Uložit plán: změna procent, uložení, verze
    await click(q, '.bv-tab[data-v="plan"]'); await q.waitForTimeout(300);
    await click(q, '.bv-seg [data-v="auto"]'); await q.waitForTimeout(300);
    await click(q, '[data-act="bvPct"][data-v="kolac|-1"]'); await q.waitForTimeout(300);
    const dirty = await q.evaluate(() => !!document.querySelector('.bv-ban.warn'));
    await shot(q, 'flow_5_neulozeno');
    await click(q, '[data-act="bvSave"]'); await q.waitForTimeout(600);
    const s4 = await st();
    // klávesnice: záložka přes Tab + Enter
    await dismiss(q); await q.focus('.bv-tab[data-v="suroviny"]'); await q.keyboard.press('Enter'); await q.waitForTimeout(300);
    const kbd = await q.evaluate(() => !!document.querySelector('.bv-tab.on[data-v="suroviny"]'));
    // zavřít hru a vrátit se za hodinu (offline): tým pokračoval, ruční se nezdvojily
    await q.clock.fastForward(3600000); await q.reload(); await q.waitForTimeout(4000);
    const s5 = await st();
    // rybník dál otevírá rybaření
    const pondId = await q.evaluate(() => window.__eko.farm.objects.find(o => o.kind === 'rybnik').id);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), pondId); await q.waitForTimeout(500);
    const pond = await q.evaluate(() => ({ bv: !!document.querySelector('#panel .bv-tabs, #panel .bv-slide'), fish: !!document.querySelector('#panel [data-act="fish"]') }));   // výrobní záložky/posuvníky nesmí mít
    out.flow = { s0, s1, s2, s3, s4, s5, dirty, kbd, pond, errs };
    await c.close();
  }
  // ---- ostatní budovy: společná hlavička, vlastní akce (ohrada: Postarat se sám i s chovatelem; rybník: rybaření) ----
  {
    const c = await b.newContext({ ...devices['iPhone 13'] }), q = await c.newPage(), errs = [];
    q.on('pageerror', e => errs.push(e.message));
    await setup(q);
    const res = {};
    for (const kind of ['kurnik', 'vcelin', 'rybnik', 'chatrc']) {
      const id = await q.evaluate(k => (window.__eko.farm.objects.find(o => o.kind === k) || {}).id, kind);
      if (!id) { res[kind] = 'chybí'; continue; }
      await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(500);
      res[kind] = await q.evaluate(() => ({ hero: !!document.querySelector('#panel .bv-hero'), status: (document.querySelector('#panel .bv-st') || {}).textContent, care: !!document.querySelector('#panel .bv-lane.me'),
        feed: !!document.querySelector('#panel [data-act="feed"]'), collect: !!document.querySelector('#panel [data-act="collect"]'), fish: !!document.querySelector('#panel [data-act="fish"]'), plan: !!document.querySelector('#panel .bv-slide') }));
      res[kind].ov = await overflow(q);
      await shot(q, 'iphone13_' + kind);
    }
    // ruční krmení s chovatelem
    const kid = await q.evaluate(() => window.__eko.farm.objects.find(o => o.kind === 'kurnik').id);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), kid); await q.waitForTimeout(400);
    const egg0 = await q.evaluate(() => window.__eko.farm.silo.vejce || 0);
    const btn = await q.$('#panel .bv-lane.me [data-act="collect"]');
    if (btn) { await click(q, '#panel .bv-lane.me [data-act="collect"]'); await q.waitForTimeout(500); }
    res.collectManual = { button: !!btn, before: egg0, after: await q.evaluate(() => window.__eko.farm.silo.vejce || 0), chovatel: await q.evaluate(() => window.__eko.farm.vill.some(v => v.prof === 'chov' && v.at)) };
    res.errs = errs;
    out.others = res;
    await c.close();
  }
  // ---- bez pracovníka: automatika pozastavená, Vyrobit sám funguje ----
  {
    const c = await b.newContext({ ...devices['iPhone 13'] }), q = await c.newPage();
    await c.addInitScript(() => { window.__noWorker = 1; });
    const id = await setup(q);
    await q.evaluate(() => { const f = JSON.parse(localStorage.getItem('ekofarm_local_v1')); f.vill = f.vill.filter(v => v.prof !== 'vyroba'); localStorage.setItem('ekofarm_local_v1', JSON.stringify(f)); });
    await q.reload(); await q.waitForTimeout(3000); await dismiss(q);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(500);
    const head = await q.evaluate(() => document.querySelector('#panel .bv-hero .bv-st').textContent);
    await click(q, '.bv-tab[data-v="plan"]'); await q.waitForTimeout(300);
    const ban = await q.evaluate(() => !!document.querySelector('.bv-ban.neu'));
    await shot(q, 'noworker_plan');
    await click(q, '.bv-seg [data-v="manual"]'); await q.waitForTimeout(300);
    await click(q, '.bv-go'); await q.waitForTimeout(500);
    out.noWorker = { head, ban, manual: await q.evaluate(i => window.__eko.farm.objects.find(x => x.id === i).queue.filter(x => !x.t).length, id) };
    await c.close();
  }
  // ---- omezený pohyb ----
  {
    const c = await b.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' }), q = await c.newPage();
    const id = await setup(q);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(500);
    await click(q, '[data-act="bvGo"][data-v="manual"]'); await q.waitForTimeout(300);
    await click(q, '.bv-go'); await q.waitForTimeout(500);
    out.reduced = await q.evaluate(i => ({ rm: matchMedia('(prefers-reduced-motion: reduce)').matches, manual: window.__eko.farm.objects.find(x => x.id === i).queue.filter(x => !x.t).length }), id);
    await c.close();
  }
  // ---- vypnutý přepínač: staré okno výrobny ----
  {
    const c = await b.newContext({ ...devices['iPhone 13'] });
    await c.addInitScript(() => { window.EKO_FLAGS = { building_ui_v2: false }; });
    const q = await c.newPage();
    const id = await setup(q);
    await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), id); await q.waitForTimeout(500);
    out.flagOff = await q.evaluate(() => ({ bv: !!document.querySelector('#panel .bv'), old: !!document.querySelector('#panel .slots') && !!document.querySelector('#panel .recipes') }));
    await shot(q, 'flag_off');
    await c.close();
  }
  const sum = { date: new Date().toISOString().slice(0, 10), commit: require('child_process').execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..') }).toString().trim(), ...out };
  fs.writeFileSync(path.join(__dirname, '..', 'audit', 'ui48.json'), JSON.stringify(sum, null, 1));
  console.log(JSON.stringify(sum, null, 1));
  await b.close();
})();
