// v47 – kontrola UI rybaření v prohlížeči (Playwright): T02 (otevření/zavření okénka nic nestojí), T18 (telefon na výšku
// a tablet bez přetékání, okénko návnad se během minihry neukazuje), T19 (mezerník, dotyk, 4× zpomalené CPU),
// T20 (prefers-reduced-motion nezabrání úlovku).
//   node tools/build-artifact.mjs && (cd build && python3 -m http.server 8790 &) && node tools/ui-check-v47.cjs [složka na snímky]
// Výsledek: audit/ui47.json (čte ho tools/test-report.mjs), snímky ui47_<běh>_<stav>.png do zadané složky (výchozí build/).
const { chromium, devices } = require('playwright');
const path = require('path');
const D = (process.argv[2] || path.join(__dirname, '..', 'build')) + '/';
const URL = process.env.EKO_URL || 'http://localhost:8790/ekofarm-artifact.html';
const out = {};
async function setup(q, rod = 'udice') {
  await q.goto(URL); await q.waitForTimeout(2500);
  await q.evaluate(rod => { const f = JSON.parse(localStorage.getItem('ekofarm_local_v1'));
    f.level = 30; f.xp = 1e5; f.coins = 50000; f.tut = 99; f.pending = []; f.ev = { k: 1e9, h: [] }; f.story = { n: 99, d: '', f: [], r: {}, log: [] };
    f.objects = f.objects.filter(o => o.kind === 'statek'); f.objects.find(o => o.kind === 'statek').lvl = 8;
    f.objects.push({ id: f.nextId++, kind: 'sklad', x: 3, y: 11, lvl: 1 }, { id: f.nextId++, kind: 'rybnik', x: 1, y: 2, lvl: 1 });
    f.machines = [{ id: f.nextId++, model: rod }];
    f.silo = { navnada: 6, corn: 4, hrach: 2, syr: 1, rohlik: 3, cerv: 5 }; f.keep = { syr: 1 };
    f.sk = { f: 0, r: 4900, v: 40000 }; f.skv = 2;
    localStorage.setItem('ekofarm_local_v1', JSON.stringify(f)); }, rod);
  await q.reload(); await q.waitForTimeout(3500);
  const pid = await q.evaluate(() => window.__eko.farm.objects.find(o => o.kind === 'rybnik').id);
  await q.evaluate(i => window.__ekoPanel({ kind: 'obj', id: i }), pid); await q.waitForTimeout(600);
}
const silo = q => q.evaluate(() => JSON.stringify(window.__eko.farm.silo));
const overflow = q => q.evaluate(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  for (const sel of ['#baitModal .bm-box', '#bmCast', '#bmCancel', '#f2Top', '#f2Bottom', '#f2Close', '#f2Done', '#f2Again', '.bm-card']) for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[hidden]') || !el.offsetParent) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) bad.push(sel + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round));
  }
  if (document.documentElement.scrollWidth > W + 1) bad.push('vodorovný posun ' + document.documentElement.scrollWidth);
  return bad;
});
async function fight(q, key) {
  await q.evaluate(key => { window.__tapper = setInterval(() => { const g = window.__eko.fish2; if (!g || g.phase !== 'fight') return; const a = parseFloat(document.getElementById('f2Arrow').style.left), z = document.getElementById('f2Zone'); const c = parseFloat(z.style.left) + parseFloat(z.style.width) / 2; if (a < c - 2) { if (key) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })); else document.getElementById('fish2').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 400 })); } }, 110); }, key);
  let modalDuring = null;
  for (let i = 0; i < 40; i++) { await q.waitForTimeout(500); const ph = await q.evaluate(() => window.__eko.fish2 && window.__eko.fish2.phase); if (ph === 'fight') break; }
  await q.waitForTimeout(1500);
  modalDuring = await q.evaluate(() => !document.getElementById('baitModal').hidden);
  const ov = await overflow(q);
  const shot = await q.screenshot();
  for (let i = 0; i < 90; i++) { await q.waitForTimeout(500); if (await q.evaluate(() => !document.getElementById('f2Result').hidden)) break; }
  await q.waitForTimeout(600);
  const res = await q.evaluate(() => document.getElementById('f2ResultText').innerText.replace(/\n+/g, ' | '));
  return { modalDuring, ov, shot, res };
}
(async () => {
  const b = await chromium.launch();
  const runs = [
    ['telefon', { ...devices['iPhone 13'] }, {}],
    ['tablet', { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, { cpu: 4 }],
    ['pc_reduced', { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, { key: true }],
  ];
  for (const [name, ctxOpt, o] of runs) {
    const errs = [];
    const c = await b.newContext(ctxOpt); const q = await c.newPage();
    q.on('pageerror', e => errs.push(e.message)); q.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    if (o.cpu) { const s = await c.newCDPSession(q); await s.send('Emulation.setCPUThrottlingRate', { rate: o.cpu }); }
    await setup(q);
    const r = { viewport: await q.evaluate(() => innerWidth + ' × ' + innerHeight), input: o.key ? 'mezerník' : 'dotyk', cpu: o.cpu || 1, silo0: await silo(q) };
    // T02: otevřít a zavřít třikrát (Zrušit, Escape, klik mimo) – sklad beze změny
    await q.click('[data-act="fish"]'); await q.waitForTimeout(400); await q.click('#bmCancel'); await q.waitForTimeout(300);
    await q.click('[data-act="fish"]'); await q.waitForTimeout(400); await q.keyboard.press('Escape'); await q.waitForTimeout(300);
    await q.click('[data-act="fish"]'); await q.waitForTimeout(400); await q.mouse.click(4, 4); await q.waitForTimeout(300);
    r.backToPanel = await q.evaluate(() => !!document.querySelector('[data-act="fish"]') && !!document.querySelector('[data-act="fish"]').offsetParent);
    await q.click('[data-act="fish"]'); await q.waitForTimeout(400);
    r.modalOv = await overflow(q);
    r.modalShot = await q.screenshot();
    await q.click('#bmCancel'); await q.waitForTimeout(300);
    r.silo1 = await silo(q);
    r.t02 = r.silo0 === r.silo1;
    r.reduced = await q.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    // nához a souboj
    await q.click('[data-act="fish"]'); await q.waitForTimeout(400);
    await q.click('.bm-card[data-bait="cerv"]'); await q.waitForTimeout(200);
    await q.click('#bmCast'); await q.waitForTimeout(500);
    r.siloCast = await silo(q);
    const f = await fight(q, !!o.key);
    Object.assign(r, { modalDuring: f.modalDuring, fightOv: f.ov, res: f.res });
    r.fightShot = f.shot; r.resShot = await q.screenshot();
    r.errs = errs;
    out[name] = r;
    await c.close();
  }
  const fs = require('fs');
  for (const [n, r] of Object.entries(out)) {
    for (const k of ['modalShot', 'fightShot', 'resShot']) { fs.writeFileSync(D + `ui47_${n}_${k}.png`, r[k]); delete r[k]; }
  }
  const sum = { date: new Date().toISOString().slice(0, 10), commit: require('child_process').execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..') }).toString().trim(), runs: out };
  fs.writeFileSync(path.join(__dirname, '..', 'audit', 'ui47.json'), JSON.stringify(sum, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
