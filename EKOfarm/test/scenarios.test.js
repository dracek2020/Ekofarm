// v34: testovací scénáře ze zadání (chovy, zaměstnanci, server). Každý scénář vrací očekávaný a skutečný výsledek.
// Souhrn do tabulky: SCEN_REPORT=cesta.md npm test  (zapíše tabulku s očekávaným a skutečným výsledkem)
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import {
  newFarm, applyAction, normalize, findObject, findVill, fits, BUILDINGS, LEVEL_XP, START_PLOTS, ANIMALS, ANIMAL_CYCLE, RECIPES,
  penStats, penMax, villLag, villLevel, villPower, workMs, wpOfVill, stockOf, TRADE_IV, keepOf, farmAlerts, ledgerSum, siloUsed,
  VILL_BUDGET, RESET_V, isOldSeason, runVillagers,
} from '../public/js/rules.js';
import { TEAM } from '../public/js/team-config.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker from '../src/worker.js';

const T0 = 1_700_000_000_000, H = 3600_000;
const REPORT = [];
// ---------- pomocné ----------
function farm(level = 20) {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.level = level; f.xp = LEVEL_XP[level]; f.coins = 1e6; f.siloCap = 5000;
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  return f;
}
function placeAny(f, kind, t = T0) {
  const b = BUILDINGS[kind];
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (fits(f, x, y, b.w, b.h)) { const r = applyAction(f, { type: 'place', kind, x, y }, t); assert.ok(r.ok, kind + ' ' + r.error); return r.id; }
  assert.fail('není místo pro ' + kind);
}
function hire(f, at, lvl = 1, prof = null, t = T0) {
  const o = at && findObject(f, at);
  const p = prof || (o ? { factory: 'vyroba', pen: 'chov', hive: 'chov', storage: 'sklad' }[BUILDINGS[o.kind].type] : 'vyroba');
  const v = { id: f.nextId++, prof: p, trait: null, xp: { [p]: TEAM.xpLvl[lvl] }, hist: [], at: 0, area: null, t, n: 0 };
  f.vill.push(v);
  if (at) assert.ok(applyAction(f, { type: 'assignVill', id: v.id, at }, t).ok);
  return v.id;
}
const tick = (f, t, lim) => applyAction(f, { type: 'tick' }, t, lim);
function catchUp(f, t) { for (let i = 0; i < 5000; i++) { tick(f, t); if (!villLag(f, t)) return i + 1; } assert.fail('nedohnáno'); }
const plan = (f, id, key, pct, t = T0) => applyAction(f, { type: 'plan', w: wpOfVill(findVill(f, id)), key, pct }, t);
const pen = (f, kind, n, lvl = 1) => { const id = placeAny(f, kind); findObject(f, id).lvl = lvl; for (let i = 0; i < n; i++) assert.ok(applyAction(f, { type: 'buyAnimal', animal: BUILDINGS[kind].animal }, T0).ok); return id; };
const noNegative = f => Object.values(f.silo).every(n => n >= 0) && Object.values(f.seeds).every(n => n >= 0);
// scénář: run() vrací { expected, actual, ok }
function scenario(n, group, name, run) {
  test(`${n}. ${group}: ${name}`, async () => {
    const r = await run();
    REPORT.push({ n, group, name, ...r });
    assert.ok(r.ok, `očekáváno: ${r.expected} | skutečnost: ${r.actual}`);
  });
}

// ---------------------------------------------------------------- chovy
scenario(1, 'Chov', 'chov má dostatek krmiva', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3); hire(f, k, 1);
  f.silo.krmivo_slepice = 30;
  catchUp(f, T0 + 3 * H + 10 * 60000);
  const eggs = f.silo.vejce || 0, used = 30 - (f.silo.krmivo_slepice || 0);
  return { expected: 'za 3 h: 3 slepice × 3 vejce = 9 vajec; 3 krmiva na první cyklus + 3 na druhý', actual: `${eggs} vajec, spotřeba ${used} krmiv`, ok: eggs === 9 && used === 6 };
});
scenario(2, 'Chov', 'krmivo dochází', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3); hire(f, k, 1);
  f.silo.krmivo_slepice = 1;
  catchUp(f, T0 + 5 * 60000);
  const s = penStats(f, findObject(f, k), T0 + 5 * 60000), al = farmAlerts(f, T0 + 5 * 60000);
  const fed = findObject(f, k).animals.filter(x => x.fed).length;
  return { expected: 'nakrmí se jen 1 slepice, krmivo 0, upozornění „došlo krmivo“ (kritické)', actual: `nakrmeno ${fed}, krmivo ${f.silo.krmivo_slepice || 0}, warn ${s.warn.join(',')}, alert ${al.map(a => a.k + '/' + a.lvl).join(',')}`, ok: fed === 1 && !f.silo.krmivo_slepice && s.warn.includes('no_feed') && al.some(a => a.k === 'no_feed' && a.lvl === 0) };
});
scenario(3, 'Chov', 'krmivo je chráněné skladovou rezervou', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3); const v = hire(f, k, 1);
  f.silo.krmivo_slepice = 10; f.keep = { krmivo_slepice: 10 };
  catchUp(f, T0 + H);
  const s = penStats(f, findObject(f, k), T0 + H);
  return { expected: 'chovatel nesáhne na 10 kusů v rezervě (dostupné 0), stav pracovníka „feed“, upozornění „v rezervě“', actual: `krmivo ${f.silo.krmivo_slepice}, dostupné ${s.avail}, pracovník ${findVill(f, v).w}, warn ${s.warn.join(',')}`, ok: f.silo.krmivo_slepice === 10 && s.avail === 0 && findVill(f, v).w === 'feed' && s.warn.includes('keep') };
});
scenario(4, 'Chov', 'víc chovů používá společné zásoby', () => {
  // a) kurník + kravín a Krmivárna, která dělá obě krmiva ze stejné kukuřice
  const f = farm(); const a = pen(f, 'kurnik', 3), b = pen(f, 'kravin', 3); hire(f, a, 6); hire(f, b, 6);
  const kr = placeAny(f, 'krmivarna'); const w = hire(f, kr, 6);
  plan(f, w, 'krmivo_slepice', 50); plan(f, w, 'krmivo_kravy', 50);
  f.silo = { corn: 10, wheat: 100, carrot: 100 };
  catchUp(f, T0 + 6 * H);
  const corn = f.silo.corn || 0, ok1 = noNegative(f) && corn >= 0;
  // b) dvě ohrady se stejným krmivem (ve hře je jeden kurník, přehled to ale musí umět): zásobu nedostanou obě celou
  const g = farm(); const k1 = pen(g, 'kurnik', 3);
  g.objects.push({ id: g.nextId++, kind: 'kurnik', x: 0, y: 14, lvl: 1, animals: [{ fed: 0 }, { fed: 0 }, { fed: 0 }], queue: [] });
  g.silo.krmivo_slepice = 4;
  const s0 = penStats(g, findObject(g, k1), T0), one = 3 * 3600 / ANIMAL_CYCLE;
  return { expected: `kukuřice nikdy do mínusu; u dvou ohrad se stejným krmivem výdrž ze spotřeby obou (${2 * one}/h → 4 kusy na 2 h)`, actual: `kukuřice zbývá ${corn}, krmiva ${f.silo.krmivo_slepice || 0}+${f.silo.krmivo_kravy || 0}; ohrad ${s0.shared}, spotřeba všech ${s0.feedAll}/h, výdrž ${s0.hours} h`, ok: ok1 && s0.shared === 2 && Math.abs(s0.feedAll - 2 * one) < 1e-9 && Math.abs(s0.hours - 2) < 1e-9 };
});
scenario(5, 'Chov', 'chov nemá zaměstnance', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3); hire(f, placeAny(f, 'pekarna'), 1);
  f.silo.krmivo_slepice = 9;
  catchUp(f, T0 + 4 * H);
  const s = penStats(f, findObject(f, k), T0 + 4 * H), al = farmAlerts(f, T0 + 4 * H);
  return { expected: 'nikdo nekrmí (krmivo zůstane 9), přehled „bez chovatele“, upozornění „ohrada nemá pracovníka“', actual: `krmivo ${f.silo.krmivo_slepice}, vajec ${f.silo.vejce || 0}, warn ${s.warn.join(',')}, alert ${al.some(a => a.k === 'no_worker' && a.ids.includes(k))}`, ok: f.silo.krmivo_slepice === 9 && !f.silo.vejce && s.warn.includes('no_worker') && al.some(a => a.k === 'no_worker' && a.ids.includes(k)) };
});
scenario(6, 'Chov', 'chov dosáhl maximální kapacity', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3);
  const max = penMax(findObject(f, k)), r = applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0);
  return { expected: `ohrada úrovně 1 pojme ${max} slepice, další nákup → pen_full`, actual: `${findObject(f, k).animals.length}/${max}, nákup: ${r.error}`, ok: r.error === 'pen_full' && findObject(f, k).animals.length === max };
});
scenario(7, 'Chov', 'sklad je plný a produkci nelze uložit', () => {
  const f = farm(); const k = pen(f, 'kurnik', 3); const v = hire(f, k, 1);
  f.silo.krmivo_slepice = 3;
  catchUp(f, T0 + 60000);
  f.silo.wheat = 20; f.siloCap = siloUsed(f);   // sklad přesně plný
  const t1 = T0 + 2 * H + 5 * 60000;
  catchUp(f, t1);
  const o = findObject(f, k), s = penStats(f, o, t1), w = findVill(f, v).w, al = farmAlerts(f, t1);
  const before = s.ready;
  f.siloCap += 100;
  catchUp(f, t1 + 5 * 60000);
  return { expected: 'vejce se neuloží ani nezmizí (čekají u slepic), chovatel „full“, kritické upozornění; po rozšíření skladu se seberou', actual: `čeká ${before} vajec, chovatel ${w}, alerty ${al.filter(a => a.lvl === 0).map(a => a.k).join(',')}, po rozšíření vajec ${f.silo.vejce || 0}`, ok: before === 6 && w === 'full' && al.some(a => a.lvl === 0) && (f.silo.vejce || 0) === 6 };
});

// ---------------------------------------------------------------- zaměstnanci
function bigFarm() {
  const f = farm(30); f.siloCap = 3000;
  const ids = {};
  for (const kind of ['semenarna', 'mlyn', 'pekarna', 'krmivarna']) { ids[kind] = placeAny(f, kind); findObject(f, ids[kind]).lvl = 10; }
  ids.kurnik = pen(f, 'kurnik', 6, 10); ids.kravin = pen(f, 'kravin', 6, 10);
  ids.sklad = (f.objects.find(o => o.kind === 'sklad') || findObject(f, placeAny(f, 'sklad'))).id;
  let n = 0;
  for (let y = 0; y < 17 && n < 40; y++) for (let x = 0; x < 17 && n < 40; x++) if (fits(f, x, y, 1, 1) && applyAction(f, { type: 'buyPlot', x, y }, T0).ok) n++;
  const add = (at, lvl = 8) => hire(f, at, lvl);
  for (const k of ['semenarna', 'mlyn', 'pekarna', 'krmivarna']) for (let i = 0; i < 4; i++) add(ids[k]);
  for (let i = 0; i < 2; i++) { add(ids.kurnik); add(ids.kravin); }
  add(ids.sklad);
  while (f.vill.length < 30) { const v = { id: f.nextId++, prof: 'pole', trait: null, xp: { pole: TEAM.xpLvl[8] }, hist: [], at: 0, area: null, t: T0, n: 0 }; f.vill.push(v); applyAction(f, { type: 'assignArea', id: v.id, kind: 'pole', a: f.plots[0].id }, T0); }
  const P = (id, key, pct) => applyAction(f, { type: 'plan', w: 'b' + id, key, pct }, T0);
  P(ids.semenarna, 's_wheat', 100); P(ids.mlyn, 'mouka', 100); P(ids.pekarna, 'chleb', 100); P(ids.krmivarna, 'krmivo_slepice', 50); P(ids.krmivarna, 'krmivo_kravy', 50);
  P(ids.sklad, 'chleb', 50); P(ids.sklad, 'vejce', 50);
  applyAction(f, { type: 'plan', w: 'pole' + f.plots[0].id, key: 'wheat', pct: 60 }, T0); applyAction(f, { type: 'plan', w: 'pole' + f.plots[0].id, key: 'corn', pct: 40 }, T0);
  f.keep = { wheat: 50 };
  f.seeds = { s_wheat: 60, s_corn: 40 }; f.silo = { wheat: 400, corn: 300, carrot: 200, krmivo_slepice: 12, krmivo_kravy: 12 };
  return { f, ids };
}
scenario(8, 'Zaměstnanci', 'farma má 30 zaměstnanců (den nepřítomnosti)', () => {
  const { f } = bigFarm();
  const t = T0 + 24 * H; let req = 0, worst = 0;
  for (; req < 5000; req++) { const a = performance.now(); tick(f, t, { left: VILL_BUDGET }); worst = Math.max(worst, performance.now() - a); if (!villLag(f, t)) break; }
  const ok = f.vill.length === 30 && noNegative(f) && siloUsed(f) <= f.siloCap && (f.silo.wheat || 0) >= 0 && f.away && f.away.done;
  return { expected: '30 lidí, den se dopočítá po dávkách; zásoby nikdy záporné, sklad nepřeteče, zpráva o nepřítomnosti hotová', actual: `${req + 1} požadavků (nejhorší ${worst.toFixed(1)} ms), sklad ${siloUsed(f)}/${f.siloCap}, úkonů ${f.away.jobs}, prodáno za ${f.away.coins}`, ok };
});
scenario(9, 'Zaměstnanci', 'zaměstnanec přeřazen během výroby', () => {
  const f = farm(); const m = placeAny(f, 'mlyn'), p = placeAny(f, 'pekarna'); const v = hire(f, m, 1);
  plan(f, v, 'mouka', 100); f.silo.wheat = 30;
  tick(f, T0 + 1000);
  const j = findVill(f, v).job, took = 30 - (f.silo.wheat || 0);
  applyAction(f, { type: 'assignVill', id: v, at: p }, T0 + 2000);
  const back = f.silo.wheat || 0, q = findObject(f, m).queue.length;
  return { expected: 'pšenice vzatá do rukou se po přeřazení vrátí, nic se nevyrobí ani neztratí', actual: `úkol ${j && j.k}, vzal ${took}, po přeřazení pšenice ${back}, fronta mlýna ${q}`, ok: j && j.k === 'load' && took > 0 && back === 30 && q === 0 };
});
scenario(10, 'Zaměstnanci', 'zaměstnanec získá novou úroveň', () => {
  const f = farm(); const m = placeAny(f, 'mlyn'); const v = hire(f, m, 1);
  plan(f, v, 'mouka', 100); f.silo.wheat = 2000;
  const V = findVill(f, v), L0 = villLevel(V, 'vyroba'), w0 = workMs(V, 'load', 'vyroba');
  V.xp.vyroba = TEAM.xpLvl[2] - 1;
  catchUp(f, T0 + 2 * H);
  const L1 = villLevel(V, 'vyroba'), w1 = workMs(V, 'load', 'vyroba');
  return { expected: 'z úrovně 1 na 2 a vyšší, úkon kratší (výkon roste)', actual: `úroveň ${L0} → ${L1}, nakládání ${w0} → ${w1} ms, výkon ×${villPower(V, 'vyroba')}`, ok: L1 > L0 && w1 < w0 };
});
scenario(11, 'Zaměstnanci', 'výrobna změní procentuální plán (ne zpětně)', () => {
  const f = farm(); const m = placeAny(f, 'krmivarna'); const v = hire(f, m, 6);
  plan(f, v, 'krmivo_slepice', 100); f.silo = { wheat: 1000, corn: 1000, carrot: 1000 };
  catchUp(f, T0 + H);
  const o = findObject(f, m), used0 = JSON.stringify(o.used || {}), kr0 = f.silo.krmivo_kravy || 0;
  plan(f, v, 'krmivo_slepice', 0, T0 + H); plan(f, v, 'krmivo_kravy', 100, T0 + H);
  const usedAfter = JSON.stringify(o.used || {});
  catchUp(f, T0 + 2 * H);
  const corn = kr0 === 0 && ((f.silo.krmivo_kravy || 0) > 0 || (o.queue || []).some(q => q.r === 'krmivo_kravy'));
  return { expected: 'změna plánu nepřepíše čas výroby, který už proběhl; krmivo pro krávy se vyrábí až od změny', actual: `podíl času před změnou ${used0}, hned po změně ${usedAfter}, krmivo pro krávy před změnou ${kr0}, potom se vyrábí: ${corn}`, ok: used0 === usedAfter && corn };
});
scenario(12, 'Zaměstnanci', 'výrobna dosáhne cílové zásoby', () => {
  const f = farm(); const m = placeAny(f, 'mlyn'); findObject(f, m).lvl = 10; const v = hire(f, m, 12); hire(f, m, 12);
  f.silo.wheat = 5000;
  applyAction(f, { type: 'planTarget', w: 'b' + m, key: 'mouka', n: 40 }, T0);
  catchUp(f, T0 + 3 * H);
  const o = findObject(f, m), st = stockOf(f, o, 'mouka'), w = findVill(f, v).w, al = farmAlerts(f, T0 + 3 * H);
  return { expected: 'zásoba mouky (sklad + fronta) nepřekročí cíl 40, pracovník čeká („limit“), jen informace – ne chyba', actual: `mouka ${st}, pracovník ${w}, upozornění ${al.filter(a => a.k === 'limit').map(a => a.lvl).join(',')}`, ok: st <= 40 && st >= 30 && w === 'limit' && al.some(a => a.k === 'limit' && a.lvl === 2) };
});

// ---------------------------------------------------------------- server
function twin(build) { const a = build(), b = JSON.parse(JSON.stringify(a)); return [a, b]; }
scenario(13, 'Server', 'hráč zavře hru na 1 hodinu', () => {
  const [a, b] = twin(() => bigFarm().f);
  catchUp(a, T0 + H);                                                   // najednou
  for (let t = T0 + 60000; t <= T0 + H; t += 60000) catchUp(b, t);      // po minutách (hra otevřená)
  const sa = JSON.stringify({ silo: a.silo, seeds: a.seeds, coins: a.coins }), sb = JSON.stringify({ silo: b.silo, seeds: b.seeds, coins: b.coins });
  return { expected: 'stejný výsledek, ať se hodina spočítá najednou nebo po minutách; zpráva o nepřítomnosti jen u hodiny najednou', actual: `shoda ${sa === sb}, zpráva ${!!(a.away && a.away.done)} / ${!!b.away}`, ok: sa === sb && a.away && a.away.done && !b.away };
});
scenario(14, 'Server', 'hráč zavře hru na 24 hodin', () => {
  const { f } = bigFarm();
  const n = catchUp(f, T0 + 24 * H), a = f.away;
  const again = JSON.stringify(f.away);
  tick(f, T0 + 24 * H + 1000);   // opakované otevření hned potom
  return { expected: 'den se dopočítá po dávkách, zpráva shrne celou nepřítomnost a znovu se nezapočítá', actual: `${n} dávek, zpráva ${Math.round((a.to - a.from) / H)} h, úkonů ${a.jobs}, po dalším otevření beze změny ${JSON.stringify(f.away) === again}`, ok: a.done && Math.round((a.to - a.from) / H) === 24 && JSON.stringify(f.away) === again };
});
scenario(15, 'Server', 'server se během výroby restartuje', () => {
  const [a, b] = twin(() => bigFarm().f);
  catchUp(a, T0 + 6 * H);
  catchUp(b, T0 + 2 * H + 1234);
  const c = normalize(JSON.parse(JSON.stringify(b)));                  // uložení a nové načtení (restart)
  catchUp(c, T0 + 6 * H);
  const pick = f => JSON.stringify({ silo: f.silo, seeds: f.seeds, coins: f.coins, q: f.objects.map(o => (o.queue || []).length) });
  return { expected: 'po uložení a načtení uprostřed práce stejný výsledek jako bez přerušení', actual: `shoda ${pick(a) === pick(c)}`, ok: pick(a) === pick(c) };
});
scenario(17, 'Server', 'dvě výrobny potřebují stejnou surovinu', () => {
  const f = farm(); const m = placeAny(f, 'mlyn'), s = placeAny(f, 'semenarna');
  const v1 = hire(f, m, 6), v2 = hire(f, s, 6);
  plan(f, v1, 'mouka', 100); plan(f, v2, 's_wheat', 100);
  f.silo.wheat = 25;
  catchUp(f, T0 + 2 * H);
  // dávky: hotové ve skladu / zásobě + ve frontě + v rukou (nakládá se)
  const batches = (id, stock) => stock / (RECIPES[id].qty || 1) + [m, s].reduce((n, oid) => n + findObject(f, oid).queue.filter(q => q.r === id).reduce((a, q) => a + (q.n || 1), 0), 0)
    + f.vill.reduce((n, x) => n + (x.job && x.job.k === 'load' && x.job.x === id ? x.job.n || 1 : 0), 0);
  const bm = batches('mouka', f.silo.mouka || 0), bs = batches('s_wheat', f.seeds.s_wheat || 0);
  const used = bm * RECIPES.mouka.in.wheat + bs * RECIPES.s_wheat.in.wheat, left = f.silo.wheat || 0;
  return { expected: 'pšenice se nikdy neodečte dvakrát ani do mínusu: spotřeba obou výroben + zbytek = 25', actual: `mouka ${bm} dávek, semena ${bs} dávek → spotřeba ${used}, zbývá ${left}`, ok: noNegative(f) && left >= 0 && used + left === 25 && bm > 0 && bs > 0 };
});
scenario(18, 'Server', 'skladník prodává zboží ve třicetiminutových intervalech', () => {
  const f = farm(); const sk = (f.objects.find(o => o.kind === 'sklad') || findObject(f, placeAny(f, 'sklad'))).id; const v = hire(f, sk, 1);
  applyAction(f, { type: 'plan', w: 'b' + sk, key: 'wheat', pct: 10 }, T0);
  f.silo.wheat = 1000;
  const times = [];
  for (let t = T0; t <= T0 + 2 * H; t += 60000) { const s0 = findVill(f, v).sold || 0; catchUp(f, t); if ((findVill(f, v).sold || 0) > s0) times.push(findVill(f, v).last.t); }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  return { expected: `prodej jednou za ${TRADE_IV / 60000} min (za 2 h 4×)`, actual: `prodejů ${times.length}, rozestupy ${gaps.map(g => g / 60000).join(', ')} min`, ok: times.length === 4 && gaps.every(g => g === TRADE_IV) };
});
scenario(19, 'Server', 'skladník neprodá rezervované zboží', () => {
  const f = farm(); const sk = (f.objects.find(o => o.kind === 'sklad') || findObject(f, placeAny(f, 'sklad'))).id; hire(f, sk, 12);
  applyAction(f, { type: 'plan', w: 'b' + sk, key: 'wheat', pct: 100 }, T0);
  f.silo.wheat = 300; applyAction(f, { type: 'keep', item: 'wheat', n: 250 }, T0);
  catchUp(f, T0 + 12 * H);
  return { expected: 'prodá se jen to nad rezervou 250 – pšenice neklesne pod 250', actual: `pšenice ${f.silo.wheat}, rezerva ${keepOf(f, 'wheat')}`, ok: f.silo.wheat === 250 };
});

// ---------------------------------------------------------------- API (databáze přes náhradu D1)
const env = { DB: fakeD1() };
async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  headers['x-eko-version'] = '999';   // v38: aktuální verze aplikace
  const res = await worker.fetch(new Request('https://x' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
scenario(16, 'Server', 'dva požadavky současně aktualizují stejnou farmu', async () => {
  const r = await call('/api/register', { method: 'POST', body: { name: 'Souběh', password: 'tajne123' } });
  const token = r.data.token;
  const a = [{ type: 'buyPlot', x: 11, y: 8 }, { type: 'plant', x: 11, y: 8, crop: 'wheat' }], b = [{ type: 'buyPlot', x: 12, y: 8 }, { type: 'plant', x: 12, y: 8, crop: 'wheat' }];
  const [ra, rb] = await Promise.all([call('/api/actions', { method: 'POST', token, body: { actions: a } }), call('/api/actions', { method: 'POST', token, body: { actions: b } })]);
  const s = await call('/api/state', { token });
  const planted = s.data.farm.plots.filter(p => p.crop).length;
  return { expected: 'oba požadavky se uloží (druhý se při kolizi zopakuje), obě pole osetá, mince odečtené jen jednou za každé', actual: `stavy ${ra.status}/${rb.status}, osetých polí ${planted}, mince ${s.data.farm.coins}`, ok: ra.status === 200 && rb.status === 200 && planted === 2 && s.data.farm.coins === 48 };
});
scenario(20, 'Server', 'víc hráčů současně používá své farmy', async () => {
  const users = await Promise.all(['Ema', 'Ota', 'Iva'].map(n => call('/api/register', { method: 'POST', body: { name: n, password: 'tajne123' } })));
  const rs = await Promise.all(users.map((u, i) => call('/api/actions', { method: 'POST', token: u.data.token, body: { actions: [{ type: 'buyPlot', x: 11, y: 8 + i }] } })));
  const st = await Promise.all(users.map(u => call('/api/state', { token: u.data.token })));
  const own = st.map((s, i) => s.data.farm.plots.some(p => p.x === 11 && p.y === 8 + i) && s.data.farm.plots.length === 1);
  return { expected: 'každý hráč má jen svou změnu, nic se mezi farmami nepomíchá', actual: `uloženo ${rs.map(r => r.status).join('/')}, správně ${own.join('/')}`, ok: rs.every(r => r.status === 200) && own.every(Boolean) };
});
scenario(21, 'Server', 'nová sezóna: farma ze starší verze začne od nuly', async () => {
  const r = await call('/api/register', { method: 'POST', body: { name: 'Stary', password: 'tajne123' } });
  const token = r.data.token;
  const old = { ...newFarm(T0), v: RESET_V - 1, level: 25, coins: 99999 };
  const uid = (await env.DB.prepare('SELECT id FROM users WHERE name = ?').bind('Stary').first()).id;
  await env.DB.prepare('UPDATE farms SET state = ? WHERE user_id = ?').bind(JSON.stringify(old), uid).run();
  await env.DB.prepare('INSERT INTO market (seller, seller_name, item, qty, machine, price, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(uid, 'Stary', 'wheat', 5, null, 10, T0).run();
  await env.DB.prepare('INSERT INTO market_sales (seller, buyer_name, item, qty, machine, coins, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(uid, 'X', 'corn', 1, null, 500, T0).run();
  const other = await call('/api/register', { method: 'POST', body: { name: 'Kupec', password: 'tajne123' } });
  const seen = (await call('/api/market', { token: other.data.token })).data.offers.length;
  const s = await call('/api/state', { token });
  const left = (await env.DB.prepare('SELECT COUNT(*) AS n FROM market WHERE seller = ?').bind(uid).first()).n;
  const unpaid = (await env.DB.prepare('SELECT COUNT(*) AS n FROM market_sales WHERE seller = ? AND paid = 0').bind(uid).first()).n;
  const top = (await call('/api/leaderboard', { token: other.data.token })).data.top;
  return { expected: 'úroveň 1, startovní mince, stará nabídka na tržišti zmizí (a dřív se ani neukáže), starý prodej se nepřipíše', actual: `úroveň ${s.data.farm.level}, mince ${s.data.farm.coins}, nabídku viděl kupec ${seen}×, zbylo nabídek ${left}, nevyplacených ${unpaid}, žebříček max ${Math.max(...top.map(t => t.level))}`, ok: s.data.farm.level === 1 && s.data.farm.coins === 50 && seen === 0 && left === 0 && unpaid === 0 && isOldSeason(old) && !isOldSeason(s.data.farm) && Math.max(...top.map(t => t.level)) === 1 };
});
scenario(22, 'Hospodaření', 'příjmy a výdaje odpovídají skutečným změnám mincí', () => {
  const f = farm(); f.coins = 1000; f.led = [];
  applyAction(f, { type: 'place', kind: 'pekarna', x: 0, y: 0 }, T0);
  f.silo.wheat = 50; applyAction(f, { type: 'sell', item: 'wheat', qty: 20 }, T0 + 1000);
  const l = ledgerSum(f, T0 + 2000, 24);
  return { expected: 'výdaj = cena Pekárny, příjem = výkup pšenice, výsledek = změna mincí', actual: `příjmy ${l.inc} (${Object.keys(l.byIn)}), výdaje ${l.exp} (${Object.keys(l.byOut)}), změna mincí ${f.coins - 1000}`, ok: l.net === f.coins - 1000 && l.byOut.build === BUILDINGS.pekarna.cost && l.byIn.sell > 0 };
});

test.after(() => {
  if (!process.env.SCEN_REPORT) return;
  const rows = REPORT.sort((a, b) => a.n - b.n).map(r => `| ${r.n} | ${r.group} | ${r.name} | ${r.expected} | ${r.actual} | ${r.ok ? 'OK' : '**CHYBA**'} |`);
  writeFileSync(process.env.SCEN_REPORT, `| # | Oblast | Scénář | Očekávaný výsledek | Skutečný výsledek | Stav |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
});
