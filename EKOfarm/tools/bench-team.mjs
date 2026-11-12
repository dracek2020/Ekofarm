// Zátěž týmu: farma s 30 pracovníky, hráč pryč 24 h; celý požadavek bez databáze (JSON → normalize → akce → JSON).
//   node tools/bench-team.mjs $PWD/public/js [úroveň pracovníků]
const base = process.argv[2], L = Number(process.argv[3] || 12);
const R = await import(base + '/rules.js'), { TEAM } = await import(base + '/team-config.js');
const T0 = 1_700_000_000_000;
function build() {
  const f = R.newFarm(T0);
  f.level = 30; f.xp = R.LEVEL_XP[30]; f.coins = 1e7; f.objects.find(o => o.kind === 'statek').lvl = 10; f.siloCap = 3000;
  let n = 0;
  for (let y = 0; y < 17 && n < 60; y++) for (let x = 0; x < 17 && n < 60; x++) { if (y > 4 && y < 13) continue; if (R.fits(f, x, y, 1, 1) && (x % 6) !== 5 && R.applyAction(f, { type: 'buyPlot', x, y }, T0).ok) n++; }
  const place = kind => { const b = R.BUILDINGS[kind]; for (let y = 5; y < 13; y++) for (let x = 0; x < 17; x++) if (R.fits(f, x, y, b.w, b.h)) { const r = R.applyAction(f, { type: 'place', kind, x, y }, T0); if (r.ok) { const o = R.findObject(f, r.id); o.lvl = 10; return r.id; } } return 0; };
  const ids = [];
  const w = (prof, at, area) => {
    const v = { id: f.nextId++, prof, xp: { [prof]: TEAM.xpLvl[L] }, hist: [], at: 0, area: null, t: T0, n: 0 }; f.vill.push(v); ids.push(v.id);
    const r = area ? R.applyAction(f, { type: 'assignArea', id: v.id, kind: 'pole', a: area }, T0) : R.applyAction(f, { type: 'assignVill', id: v.id, at }, T0);
    return r.ok;
  };
  const plan = (wk, key, pct) => R.applyAction(f, { type: 'plan', w: wk, key, pct }, T0);
  const sem = place('semenarna'), mlyn = place('mlyn'), pek = place('pekarna'), krm = place('krmivarna'), kur = place('kurnik'), krav = place('kravin'), vc = place('vcelin');
  if (!f.objects.some(o => o.kind === 'sklad')) place('sklad');
  const sk = f.objects.find(o => o.kind === 'sklad').id;
  for (let i = 0; i < 6; i++) R.applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  for (let i = 0; i < 6; i++) R.applyAction(f, { type: 'buyAnimal', animal: 'krava' }, T0);
  plan('b' + sem, 's_wheat', 60); plan('b' + sem, 's_corn', 40); plan('b' + mlyn, 'mouka', 100); plan('b' + pek, 'chleb', 100);
  plan('b' + krm, 'krmivo_slepice', 50); plan('b' + krm, 'krmivo_kravy', 50);
  for (const it of ['mouka', 'chleb', 'vejce', 'mleko']) plan('b' + sk, it, 50);
  R.applyAction(f, { type: 'keep', item: 'wheat', n: 60 }, T0);
  const areas = R.workAreas(f).filter(g => g.kind === 'pole');
  for (const g of areas) { plan('pole' + g.ids[0], 'wheat', 50); plan('pole' + g.ids[0], 'corn', 30); plan('pole' + g.ids[0], 'carrot', 20); }
  // 30 lidí: nejdřív budovy, pak oblasti, zbytek do výroben (kolik se vejde)
  for (const [p, at] of [['vyroba', sem], ['vyroba', mlyn], ['vyroba', pek], ['vyroba', krm], ['chov', kur], ['chov', krav], ['chov', vc], ['sklad', sk]]) w(p, at);
  for (const g of areas) for (let i = 0; i < 5; i++) w('pole', 0, g.ids[0]);
  const extra = [['vyroba', mlyn], ['vyroba', pek], ['vyroba', sem], ['vyroba', krm], ['chov', kur], ['chov', krav], ['vyroba', mlyn], ['vyroba', pek], ['vyroba', sem], ['vyroba', krm], ['vyroba', mlyn], ['vyroba', pek]];
  if (!process.env.NOEXTRA) for (const [p, at] of extra) { if (f.vill.length >= 30) break; if (!w(p, at)) { f.vill.pop(); ids.pop(); } }
  while (f.vill.length < 30) { f.vill.push({ id: f.nextId++, prof: 'vyroba', xp: {}, hist: [], at: 0, area: null, t: T0, n: 0 }); }
  f.seeds = { s_wheat: 60, s_corn: 40, s_carrot: 40 }; f.silo = { wheat: 300, corn: 200, carrot: 100, krmivo_slepice: 20, krmivo_kravy: 20 };
  return f;
}
const f = build();
const busy = f.vill.filter(v => v.at || v.area).length;
const now = T0 + 24 * 3600 * 1000;
// celý požadavek na serveru: JSON → normalize → akce → JSON (bez databáze)
let raw = JSON.stringify(f), calls = 0, total = 0, worst = 0, rulesMs = 0; const times = [];
for (;;) {
  const t0 = performance.now();
  const farm = R.normalize(JSON.parse(raw)); const lim = { left: R.VILL_BUDGET };
  const t1 = performance.now(); R.applyAction(farm, { type: 'tick' }, now, lim); rulesMs += performance.now() - t1;
  raw = JSON.stringify(farm);
  const ms = performance.now() - t0; calls++; total += ms; times.push(ms); worst = Math.max(worst, ms);
  if (!R.villLag(farm, now) || calls > 5000) { Object.assign(f, farm); break; }
}
times.sort((a, b) => a - b);
// jedna běžná akce na dohnané farmě (hráč klepne)
let act = []; for (let i = 0; i < 30; i++) { const t0 = performance.now(); const farm = R.normalize(JSON.parse(raw)); R.applyAction(farm, { type: 'tick' }, now + i * 1000, { left: R.VILL_BUDGET }); JSON.stringify(farm); act.push(performance.now() - t0); }
act.sort((a, b) => a - b);
console.log(`úroveň ${L}: pracuje ${busy}/30, den pryč: požadavků ${calls}, celkem ${total.toFixed(0)} ms (pravidla ${rulesMs.toFixed(0)} ms), medián ${times[calls >> 1].toFixed(1)} ms, nejhorší ${worst.toFixed(1)} ms; běžný požadavek medián ${act[15].toFixed(2)} ms; farma ${(raw.length / 1024).toFixed(0)} kB JSON; vejce ${f.silo.vejce || 0}, mléko ${f.silo.mleko || 0}, chléb ${f.silo.chleb || 0}`);
