// v48: správa budov – ruční výroba (Vyrobit sám) souběžně s automatickou výrobou týmu, plán s verzí (planSave).
// Akceptační testy ze zadání (05_TESTY/AKCEPTACNI_TESTY.md) – název začíná „U01“…; tools/test-report-v48.mjs z nich skládá report.
// Recepty a čísla se berou z pravidel hry (chléb = 3× pšenice, 5 min, 3 XP), nic z obrázkové reference.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as R from '../public/js/rules.js';
import { TEAM } from '../public/js/team-config.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker from '../src/worker.js';

const { applyAction, newFarm, findObject, RECIPES, BUILDINGS, ITEMS, fits, queueSize, manualJobs, teamJobs, stockOf, villLag } = R;
const T0 = 1_800_000_000_000, MIN = 60_000;
const act = (f, a, t) => applyAction(f, a, t);
function farm(cook = 50) {
  const f = newFarm(T0);
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  f.level = 40; f.xp = R.LEVEL_XP[40]; f.coins = 1e6; f.siloCap = 5000;
  f.sk = { f: 0, r: 0, v: R.SKILL_XP[cook] };
  return f;
}
function place(f, kind) {
  const b = BUILDINGS[kind];
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (fits(f, x, y, b.w, b.h)) { const r = act(f, { type: 'place', kind, x, y }, T0); assert.ok(r.ok, kind + ' ' + r.error); return findObject(f, r.id); }
  throw new Error('není místo');
}
function hire(f, o, lvl = 6) {
  const v = { id: f.nextId++, prof: 'vyroba', trait: null, xp: { vyroba: TEAM.xpLvl[lvl] }, hist: [], at: 0, area: null, t: T0, n: 0 };
  f.vill.push(v);
  assert.ok(act(f, { type: 'assignVill', id: v.id, at: o.id }, T0).ok);
  return v;
}
const save = (f, o, plan, target = [], t = T0, auto = false) => act(f, { type: 'planSave', id: o.id, pv: o.pv || 0, plan, target, auto }, t);
const tick = (f, t) => { for (let i = 0; i < 4000; i++) { act(f, { type: 'tick' }, t); if (!villLag(f, t)) return; } throw new Error('nedohnáno'); };
const clone = x => JSON.parse(JSON.stringify(x));
const noNeg = f => Object.values(f.silo).every(n => n >= 0);
const madeBy = (o, id) => ((o.log || []).reduce((n, [, m]) => n + (m[id] || 0), 0));

test('U01 + U20 Pekárna bez pracovníka: Vyrobit sám zařadí chléb, doběhne, hráč ho vyzvedne; automatika pozastavená', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 9;
  assert.equal(R.wpWorkers(f, { o, g: null, type: 'factory' }).length, 0);
  const r = act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 1, k: 'a1' }, T0);
  assert.ok(r.ok, r.error); assert.equal(f.silo.wheat, 6);
  assert.equal(manualJobs(o).length, 1);
  assert.equal(act(f, { type: 'collect', id: o.id }, T0 + 60_000).error, 'not_ready');
  const xp0 = f.xp, c = act(f, { type: 'collect', id: o.id }, T0 + 5 * MIN + 1000);
  assert.ok(c.ok); assert.equal(f.silo.chleb, 1); assert.equal(f.xp - xp0, RECIPES.chleb.xp);
});

test('U02 + U04 s Řemeslníkem a plánem 60/40 (i 100 %) jde Vyrobit sám – stejný i jiný recept, procenta se nemění', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 400; f.silo.vejce = 100;
  hire(f, o);
  assert.ok(save(f, o, { chleb: 60, kolac: 40 }).ok);
  tick(f, T0 + 10 * MIN);
  assert.ok(teamJobs(o).length >= 1, 'tým vyrábí');
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'b1' }, T0 + 10 * MIN).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'kolac', k: 'b2' }, T0 + 10 * MIN).ok);
  assert.deepEqual(o.plan, { chleb: 60, kolac: 40 });
  assert.ok(save(f, o, { chleb: 100 }, [], T0 + 10 * MIN).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'b3' }, T0 + 10 * MIN).ok);
  assert.deepEqual(o.plan, { chleb: 100 });
  assert.equal(manualJobs(o).length, 3);
});

test('U03 ruční fronta má skutečně queueSize míst (3 na úrovni 1); čtvrtá dávka nejde, tým dál vyrábí do svých míst', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 600;
  hire(f, o); assert.ok(save(f, o, { chleb: 100 }).ok);
  assert.equal(queueSize(o), 3);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 3, k: 'c1' }, T0).ok);
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'c2' }, T0).error, 'queue_full');
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 4, k: 'c3' }, T0).error, 'bad_action');   // víc dávek, než má fronta míst
  const before = madeBy(o, 'chleb');
  tick(f, T0 + 120 * MIN);
  assert.ok(madeBy(o, 'chleb') > before, 'tým vyráběl, i když je ruční fronta plná');
  assert.ok(teamJobs(o).length <= queueSize(o));
});

test('U05 ruční chléb spotřebuje přesně suroviny z receptu ve hře (3× pšenice), ne mouku z obrázku', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 6; f.silo.mouka = 5;
  assert.deepEqual(RECIPES.chleb.in, { wheat: 3 });
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 2 }, T0).ok);
  assert.equal(f.silo.wheat || 0, 0); assert.equal(f.silo.mouka, 5);
});

test('U06 cílová zásoba 100 chlebů počítá i ruční dávky ve frontě – tým nevyrobí přes cíl, ruční dávky zůstanou', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 2000; f.silo.chleb = 95;
  hire(f, o, 12); assert.ok(save(f, o, {}, [['chleb', 100]]).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 3, k: 'd1' }, T0).ok);   // 95 + 3 ručně = 98
  tick(f, T0 + 300 * MIN);
  assert.equal(stockOf(f, o, 'chleb'), 100, 'sklad + fronta = přesně cíl');
  assert.equal(madeBy(o, 'chleb'), 2, 'tým dopekl jen 2 (95 ve skladu + 3 ruční ve frontě)');
  assert.equal(manualJobs(o).length, 3, 'ruční dávky čekají na hráče');
  act(f, { type: 'collect', id: o.id }, T0 + 300 * MIN);
  assert.equal(manualJobs(o).length, 0);
});

test('U07 odebrání pracovníka během ruční fronty: ruční dávky běží dál, automatika je bez pracovníka', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 300;
  const v = hire(f, o); assert.ok(save(f, o, { chleb: 100 }).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 2, k: 'e1' }, T0).ok);
  const ends = manualJobs(o).map(q => q.end);
  assert.ok(act(f, { type: 'villFree', id: v.id }, T0 + MIN).ok || act(f, { type: 'assignVill', id: v.id, at: 0 }, T0 + MIN).ok);
  assert.equal(R.wpWorkers(f, { o, g: null, type: 'factory' }).length, 0);
  assert.deepEqual(manualJobs(o).map(q => q.end), ends);
  tick(f, T0 + 60 * MIN);
  assert.ok(act(f, { type: 'collect', id: o.id }, T0 + 60 * MIN).ok);
  assert.ok(f.silo.chleb >= 2);
});

test('U08 + U13 změna plánu nesmaže hotové ruční zboží; druhé zařízení se starou verzí plánu nic nepřepíše', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 300;
  hire(f, o);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'f1' }, T0).ok);
  const pv = o.pv || 0;
  assert.ok(save(f, o, { chleb: 50 }, [], T0 + 6 * MIN).ok);                 // zařízení A
  const b = act(f, { type: 'planSave', id: o.id, pv, plan: { kolac: 100 }, target: [], auto: false }, T0 + 6 * MIN);   // zařízení B se starou verzí
  assert.equal(b.error, 'plan_conflict');
  assert.deepEqual(o.plan, { chleb: 50 });
  assert.equal(manualJobs(o).filter(q => q.end <= T0 + 6 * MIN).length, 1, 'hotový ruční chléb pořád čeká');
  const c = act(f, { type: 'collect', id: o.id }, T0 + 6 * MIN);
  assert.ok(c.ok && c.gained.items.some(x => x.item === 'chleb'));
});

test('U09 opakované vyzvednutí i opakované zařazení (stejný klíč) se započte právě jednou', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 30;
  const a = { type: 'produce', id: o.id, recipe: 'chleb', n: 2, k: 'retry1' };
  assert.ok(act(f, a, T0).ok);
  const again = act(f, clone(a), T0 + 500);
  assert.ok(again.ok && again.again);
  assert.equal(f.silo.wheat, 24); assert.equal(manualJobs(o).length, 2);
  const t = T0 + 20 * MIN, xp0 = f.xp;
  assert.ok(act(f, { type: 'collect', id: o.id }, t).ok);
  assert.equal(act(f, { type: 'collect', id: o.id }, t + 100).error, 'not_ready');
  assert.equal(f.silo.chleb, 2); assert.equal(f.xp - xp0, 2 * RECIPES.chleb.xp);
});

test('U10 + U15 jediná zásoba: tým a hráč nespotřebují stejné suroviny, sklad nikdy pod nulou; ruční vstupy jsou hned ze skladu pryč', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 3;
  hire(f, o); assert.ok(save(f, o, { chleb: 100 }).ok);
  tick(f, T0 + 2000);   // tým si vezme suroviny na dávku
  const manual = act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'g1' }, T0 + 2000);
  const left = f.silo.wheat || 0, teamJob = f.vill[0].job && f.vill[0].job.k === 'load';
  assert.equal(left, 0);
  assert.ok(teamJob !== manual.ok, 'uspěl právě jeden (tým si suroviny vzal dřív)');
  if (!manual.ok) assert.equal(manual.error, 'no_inputs');
  assert.ok(noNeg(f));
  // ruční dávka bere suroviny hned → skladník je nemůže prodat
  const f2 = farm(), o2 = place(f2, 'pekarna'); f2.silo.wheat = 3;
  assert.ok(act(f2, { type: 'produce', id: o2.id, recipe: 'chleb' }, T0).ok);
  assert.equal(f2.silo.wheat || 0, 0);
});

test('U11 tým jede hodinu offline; hráč se vrátí a vyzvedne své ruční výrobky – bez opakované výroby a XP', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 900;
  hire(f, o); assert.ok(save(f, o, { chleb: 100 }).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 3, k: 'h1' }, T0).ok);
  const t = T0 + 60 * MIN;
  tick(f, t);
  assert.equal(manualJobs(o).length, 3, 'tým ruční dávky neodnesl');
  const bread0 = f.silo.chleb || 0, xp0 = f.xp;
  const c = act(f, { type: 'collect', id: o.id }, t);
  assert.ok(c.ok);
  assert.equal(manualJobs(o).length, 0);
  assert.ok((f.silo.chleb || 0) - bread0 >= 3);
  const xpGot = f.xp - xp0;
  tick(f, t + 1000); act(f, { type: 'tick' }, t + 2000);
  assert.equal(act(f, { type: 'collect', id: o.id }, t + 2000).ok && manualJobs(o).length > 0, false);
  assert.ok(xpGot >= 3 * RECIPES.chleb.xp, 'plné XP za ruční chleby');
});

test('U12 XP: ruční dávka = plné XP Vaření hráče; dávka týmu = hráči jen čtvrtina (TEAM.playerXp), pracovníkovi profesní XP; nic dvakrát', () => {
  assert.equal(TEAM.playerXp, 0.25);
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 30;
  const xp0 = f.xp, cook0 = f.sk.v;
  act(f, { type: 'produce', id: o.id, recipe: 'chleb' }, T0);
  act(f, { type: 'collect', id: o.id }, T0 + 6 * MIN);
  assert.equal(f.xp - xp0, RECIPES.chleb.xp);
  const cookManual = f.sk.v - cook0;
  assert.ok(cookManual > 0, 'Vaření roste z ruční výroby');
  // tým: stejná dávka chleba dá hráči čtvrtinu
  const g = farm(), p = place(g, 'pekarna'); g.silo.wheat = 3;
  const v = hire(g, p, 1); assert.ok(save(g, p, { chleb: 100 }).ok);
  const gx0 = g.xp, vx0 = v.xp.vyroba, gc0 = g.xpc || 0;
  tick(g, T0 + 30 * MIN);
  const n = g.silo.chleb || 0;
  assert.ok(n >= 1, 'tým upekl');
  const playerGain = (g.xp - gx0) + ((g.xpc || 0) - gc0);
  assert.ok(Math.abs(playerGain - n / R.recipeQty(RECIPES.chleb) * RECIPES.chleb.xp * TEAM.playerXp) < 1e-6, `hráč dostal ${playerGain}`);
  assert.ok(v.xp.vyroba > vx0, 'pracovník dostal profesní XP');
});

test('U14 plný sklad: hotové ruční zboží zůstane ve výrobně, tým respektuje kapacitu (nic se neztratí)', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 3;
  hire(f, o); assert.ok(save(f, o, { chleb: 100 }).ok);
  assert.ok(act(f, { type: 'produce', id: o.id, recipe: 'chleb', k: 'i1' }, T0).ok);
  f.silo.corn = R.siloFree(f);   // sklad úplně plný
  tick(f, T0 + 30 * MIN);
  const r = act(f, { type: 'collect', id: o.id }, T0 + 30 * MIN);
  assert.equal(r.error, 'silo_full');
  assert.equal(manualJobs(o).length, 1, 'ruční chléb čeká ve výrobně');
  assert.ok(R.siloUsed(f) <= f.siloCap);
  f.siloCap += 50;
  assert.ok(act(f, { type: 'collect', id: o.id }, T0 + 31 * MIN).ok);
});

test('U17 uložení plánu: součet ≤ 100 %, kroky po 5 %, platí po uložení (i po načtení farmy znovu)', () => {
  const f = farm(), o = place(f, 'pekarna');
  assert.equal(save(f, o, { chleb: 70, kolac: 40 }).error, 'plan_over');
  assert.equal(save(f, o, { chleb: 33 }).error, 'bad_action');
  const r = save(f, o, { chleb: 60, kolac: 40 }, [['chleb', 20]], T0, true);
  assert.ok(r.ok); assert.equal(r.pv, 1);
  const g = R.normalize(clone(f)), og = findObject(g, o.id);
  assert.deepEqual(og.plan, { chleb: 60, kolac: 40 }); assert.deepEqual(og.target, [['chleb', 20]]); assert.equal(og.auto, true); assert.equal(og.pv, 1);
});

test('U18 + U29 zamčené recepty ani nesmysly nejdou přes API (produce i planSave)', () => {
  const f = farm(1), o = place(f, 'pekarna'); f.silo.wheat = 30; f.silo.vejce = 30;
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'kolac' }, T0).error, 'locked');   // Vaření 4
  assert.equal(save(f, o, { kolac: 50 }).error, 'locked');
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'syr' }, T0).error, 'bad_action');   // jiná výrobna
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 0 }, T0).error, 'bad_action');
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'chleb', n: 1.5 }, T0).error, 'bad_action');
  assert.equal(act(f, { type: 'produce', id: 999999, recipe: 'chleb' }, T0).error, 'no_object');
  assert.equal(act(f, { type: 'planSave', id: o.id, pv: 0, plan: [], target: [] }, T0).error, 'bad_action');
  assert.equal(act(f, { type: 'planSave', id: o.id, pv: 0, plan: {}, target: [['chleb', 0]] }, T0).error, 'bad_action');
  assert.equal(act(f, { type: 'planSave', id: o.id, pv: 7, plan: {}, target: [] }, T0).error, 'plan_conflict');
  assert.ok(noNeg(f)); assert.equal(f.silo.wheat, 30);
});

test('U23 počet míst pro pracovníky je ze skutečné úrovně budovy (Pekárna úroveň 1 = 1, ne 2/3 z obrázku)', () => {
  const f = farm(), o = place(f, 'pekarna');
  assert.equal(R.wpCap({ o, g: null, type: 'factory' }), 1);
  o.lvl = 4; assert.equal(R.wpCap({ o, g: null, type: 'factory' }), 2);
  o.lvl = 10; assert.equal(R.wpCap({ o, g: null, type: 'factory' }), 4);
});

test('U24 ohrada a pole: ruční krmení a sklizeň jdou i s Chovatelem/Pěstitelem a nezapočtou se dvakrát', () => {
  const f = farm(), k = place(f, 'kurnik');
  for (let i = 0; i < 2; i++) assert.ok(act(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
  const v = { id: f.nextId++, prof: 'chov', trait: null, xp: { chov: TEAM.xpLvl[3] }, hist: [], at: 0, area: null, t: T0, n: 0 };
  f.vill.push(v); assert.ok(act(f, { type: 'assignVill', id: v.id, at: k.id }, T0).ok);
  f.silo.krmivo_slepice = 1;
  const fed = act(f, { type: 'feed', id: k.id }, T0);   // hráč sám
  assert.ok(fed.ok); assert.equal(f.silo.krmivo_slepice || 0, 0);
  tick(f, T0 + 10 * MIN);
  assert.ok(noNeg(f));
  const eggs0 = f.silo.vejce || 0, t = T0 + 4 * 3600_000;
  tick(f, t);
  const c = act(f, { type: 'collect', id: k.id }, t);
  const total = (f.silo.vejce || 0) - eggs0;
  assert.ok(total <= R.ANIMALS.slepice.per * 2 * 3, `vajec ${total} – nic navíc`);   // ruční i chovatel dohromady jen to, co zvířata dala
  assert.ok(c.ok || c.error === 'not_ready');
});

test('U25 rybník dál otevírá vlastní rybaření (akce fishCast), ne okno výrobny', () => {
  const f = farm(), o = place(f, 'rybnik');
  assert.equal(BUILDINGS[o.kind].type, 'pond');
  assert.equal(R.villJobType(o.kind), null);
  assert.equal(act(f, { type: 'produce', id: o.id, recipe: 'chleb' }, T0).error, 'no_object');
  const main = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /d\.type === 'factory' && BUI_V2/);
  assert.match(main, /d\.type === 'pond' \? pondHtml/);
});

test('U26 stará uložená farma (fronta z v47 s dávkami týmu i ruční) se načte beze ztráty a dá se vybrat', () => {
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 50;
  const v = hire(f, o);
  // fronta ve tvaru z v47: dávka týmu (t: 1, n kusů) a ruční dávka za ní
  o.queue = [{ r: 'chleb', end: T0 + 5 * MIN, d: 5 * MIN, n: 2, t: 1 }, { r: 'chleb', end: T0 + 10 * MIN, d: 5 * MIN }];
  const g = R.normalize(clone(f)), og = findObject(g, o.id);
  assert.equal(og.queue.length, 2); assert.equal(g.vill.length, 1); assert.equal(g.silo.wheat, 50);
  tick(g, T0 + 11 * MIN);
  assert.equal(manualJobs(og).length, 1, 'ruční čeká na hráče');
  assert.ok(act(g, { type: 'collect', id: og.id }, T0 + 11 * MIN).ok);
  assert.ok((g.silo.chleb || 0) >= 3);
  void v;
});

test('U27 výkon: 30 pracovníků, den nepřítomnosti – dopočet stejně rychle (souběh ručních a týmových dávek)', () => {
  const f = farm(), kinds = ['pekarna', 'mlyn', 'krmivarna', 'mlekarna', 'konzervarna'];
  f.silo.wheat = 20000; f.silo.corn = 20000; f.silo.mleko = 5000; f.siloCap = 100000;
  const objs = kinds.map(k => { const o = place(f, k); o.lvl = 10; return o; });
  let n = 0;
  for (const o of objs) {
    const r = R.recipesFor ? Object.values(RECIPES).find(x => x.building === o.kind && R.recipeOk(f, x) && Object.keys(x.in).every(i => f.silo[i] > 0)) : null;
    for (let i = 0; i < 4 && n < 30; i++, n++) hire(f, o, 8);
    if (r) { assert.ok(save(f, o, { [r.id]: 100 }).ok); act(f, { type: 'produce', id: o.id, recipe: r.id, n: 2 }, T0); }
  }
  while (n < 30) { const v = { id: f.nextId++, prof: 'vyroba', trait: null, xp: { vyroba: TEAM.xpLvl[4] }, hist: [], at: 0, area: null, t: T0, n: 0 }; f.vill.push(v); n++; }
  const t0 = performance.now();
  let req = 0;
  for (; req < 5000; req++) { act(f, { type: 'tick' }, T0 + 24 * 3600_000, { left: R.VILL_BUDGET }); if (!villLag(f, T0 + 24 * 3600_000)) break; }
  const ms = performance.now() - t0;
  assert.ok(ms < 20_000, `dopočet trval ${ms} ms`);
  assert.ok(noNeg(f));
  console.log(`# U27 30 pracovníků, 24 h: ${req + 1} požadavků, ${Math.round(ms)} ms`);
});

test('U28 + U29 přes API: ruční výroba a vyzvednutí přes Worker, opakovaný požadavek se nezdvojí, cizí farma je nedotčená', async () => {
  const env = { DB: fakeD1() };
  const call = async (path, token, body) => {
    const headers = { 'content-type': 'application/json', 'x-eko-version': String(R.CLIENT_MIN) };
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await worker.fetch(new Request('https://x' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }), env);
    return await res.json();
  };
  const A = await call('/api/register', null, { name: 'Pekar', password: 'tajne123' });
  const B = await call('/api/register', null, { name: 'Soused', password: 'tajne456' });
  const row = await env.DB.prepare('SELECT state FROM farms WHERE user_id = 1').first();
  const fm = JSON.parse(row.state);
  fm.objects.find(o => o.kind === 'statek').lvl = 5; fm.objects.push({ id: 900, kind: 'pekarna', x: 0, y: 0, lvl: 1, queue: [] }); fm.silo = { wheat: 9 };
  await env.DB.prepare('UPDATE farms SET state = ? WHERE user_id = 1').bind(JSON.stringify(fm)).run();
  const enq = { type: 'produce', id: 900, recipe: 'chleb', n: 2, k: 'api48' };
  const r1 = await call('/api/actions', A.token, { actions: [enq] });
  assert.ok(r1.results[0].ok, JSON.stringify(r1.results[0]));
  const r2 = await call('/api/actions', A.token, { actions: [enq] });   // síť zopakovala stejný požadavek
  assert.ok(r2.results[0].ok && r2.results[0].again);
  assert.equal(r2.farm.silo.wheat, 3); assert.equal(r2.farm.objects.find(o => o.id === 900).queue.length, 2);
  // podvržené vyzvednutí hned (server rozhoduje o čase) nic nedá
  const early = await call('/api/actions', A.token, { actions: [{ type: 'collect', id: 900 }] });
  assert.equal(early.results[0].ok, false);
  // soused nemůže sáhnout na pekárnu ani sklad hráče A (akce se vždy týká jen vlastní farmy)
  const bx = await call('/api/actions', B.token, { actions: [{ type: 'produce', id: 900, recipe: 'chleb', k: 'cizi' }, { type: 'collect', id: 900 }] });
  assert.ok(bx.results.every(x => !x.ok));
  const sa = await call('/api/state', A.token);
  assert.equal(sa.farm.silo.wheat, 3); assert.equal(sa.farm.objects.find(o => o.id === 900).queue.length, 2);
  // nepovolené hodnoty
  const bad = await call('/api/actions', A.token, { actions: [{ type: 'produce', id: 900, recipe: 'chleb', n: 99 }, { type: 'produce', id: 900, recipe: 'nic' }, { type: 'planSave', id: 900, pv: 3, plan: {}, target: [] }] });
  assert.deepEqual(bad.results.map(x => x.error), ['bad_action', 'bad_action', 'plan_conflict']);
});

test('U30 vypnutý přepínač building_ui_v2 vrací původní chování (jedna společná fronta, tým odnáší i ruční)', () => {
  const out = spawnSync(process.execPath, [new URL('./fixtures/flags-off.mjs', import.meta.url).pathname, 'v48'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  const r = JSON.parse(out.stdout);
  assert.equal(r.flag, false);
  assert.equal(r.fourth, 'queue_full', 'bez přepínače sdílí hráč a tým jednu frontu');
  assert.equal(r.manualLeft, 0, 'bez přepínače odnese tým i ruční dávky');
  assert.equal(r.planSave, 'bad_action');
});

test('U31 smoketest všech výroben: ruční dávka i s pracovníkem, dokončení, vyzvednutí', () => {
  const kinds = [...new Set(Object.values(RECIPES).map(r => r.building))].filter(k => BUILDINGS[k] && BUILDINGS[k].type === 'factory');
  assert.ok(kinds.length >= 15, 'výroben ' + kinds.length);
  for (const kind of kinds) {
    const f = farm(), o = place(f, kind);
    const r = Object.values(RECIPES).find(x => x.building === kind && R.recipeOk(f, x));
    assert.ok(r, 'recept v ' + kind);
    for (const [id, n] of Object.entries(r.in)) f.silo[id] = n * 4;
    f.seeds = {}; for (let i = 0; i < 6; i++) f.plots.push({ id: f.nextId++, x: i, y: 16 });   // Semenárna: osivo jde do zásob Statku (3 na políčko)
    hire(f, o);
    const p = act(f, { type: 'produce', id: o.id, recipe: r.id, k: 'sm' + kind }, T0);
    assert.ok(p.ok, kind + ' ' + p.error);
    const t = T0 + r.time * 1000 * 3 + 5000;
    tick(f, t);
    assert.equal(manualJobs(o).length, 1, kind + ': ruční dávka čeká na hráče');
    const c = act(f, { type: 'collect', id: o.id }, t);
    assert.ok(c.ok, kind + ' ' + c.error);
    assert.ok(noNeg(f), kind);
  }
});

test('U32 žádná nová měna, žádná změna cen ani receptů proti v47', () => {
  const snap = JSON.parse(readFileSync(new URL('./fixtures/v47-ceny.json', import.meta.url), 'utf8'));
  for (const [id, p] of Object.entries(snap.prices)) assert.equal(ITEMS[id] && ITEMS[id].price, p, 'cena ' + id);
  for (const [id, x] of Object.entries(snap.recipes)) {
    const r = RECIPES[id];
    assert.ok(r, 'recept ' + id);
    assert.deepEqual({ b: r.building, in: r.in, t: r.time, st: r.st, cook: r.cook, q: R.recipeQty(r), xp: r.xp }, x, id);
  }
  assert.equal(Object.keys(snap.prices).length, R.ITEM_LIST.length, 'žádný nový předmět');
  const f = newFarm(T0);
  assert.ok(!('gems' in f) && !('diamonds' in f) && !('dia' in f));
});

test('U19 + U20 + U21 okno výrobny ukazuje skutečné stavy: bez pracovníka (Vyrobit sám aktivní), pod rezervou, cíl splněn, plný sklad, žádné diamanty', async () => {
  const P = await import('../public/js/panels.js');
  const f = farm(), o = place(f, 'pekarna'); f.silo.wheat = 30;
  const pdOf = () => ({ id: o.id, pv: o.pv || 0, plan: { ...(o.plan || {}) }, target: (o.target || []).map(x => [...x]), auto: !!o.auto, dirty: false });
  // bez pracovníka
  let h = P.factoryHtml2(f, o, T0, { tab: 'plan', mode: 'auto' }, pdOf());
  assert.match(h, /Bez pracovníka – plán je pozastaven/);
  h = P.factoryHtml2(f, o, T0, { tab: 'prehled' }, pdOf());
  assert.match(h, /data-act="bvGo" data-v="manual"/);
  h = P.factoryHtml2(f, o, T0, { tab: 'plan', mode: 'manual', sel: 'chleb' }, pdOf());
  assert.match(h, /data-act="bvEnq" data-v="chleb\|1"/, 'Zařadit do výroby je aktivní i bez pracovníka');
  assert.match(h, /3× Pšenice/, 'skutečné suroviny chleba');
  // s pracovníkem: pšenice pod rezervou, cíl splněn, plný sklad
  hire(f, o); assert.ok(save(f, o, { chleb: 100 }, [['kolac', 1]]).ok);
  f.keep = { wheat: 40 }; f.silo.kolac = 5;
  f.silo.corn = R.siloFree(f);
  h = P.factoryHtml2(f, o, T0, { tab: 'prehled' }, pdOf());
  assert.match(h, /Pšenice je pod rezervou \(30\/40\)/);
  assert.match(h, /Cílová zásoba Koláč \(1 ks\) je splněná/);
  assert.match(h, /Sklad je plný/);
  h = P.factoryHtml2(f, o, T0, { tab: 'suroviny' }, pdOf());
  assert.match(h, /ve skladu <b>30<\/b> · rezerva 40 · pro tým <b>0<\/b>/);
  for (const tab of ['prehled', 'tym', 'plan', 'suroviny']) assert.doesNotMatch(P.factoryHtml2(f, o, T0, { tab }, pdOf()), /diamant|drahokam|gem/i);
  // stav řádku v plánu: čeká na vstupy (pšenice je celá v rezervě)
  h = P.factoryHtml2(f, o, T0, { tab: 'plan', mode: 'auto' }, pdOf());
  assert.match(h, /Čeká na vstupy/);
});
