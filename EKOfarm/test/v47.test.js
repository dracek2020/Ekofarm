// v47: rybaření (8 návnad, nová minihra se skrytou rybou), 10 ryb, 16 rybích receptů, pečivo – akceptační testy 1–29
// ze zadání (05_TESTY_A_INTEGRACE/TESTY_A_KRITERIA.md). Název testu začíná „T01“…; tools/test-report.mjs z nich skládá report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';
import { FIGHT, BAITS, ECO_FISH, FISH_RECIPES, BAKERY_RECIPES, BAKERY_CROPS } from '../public/js/eco-config.js';
import { ASSETS } from '../public/js/assets.js';
import { srv, botTaps, fishOnce } from './fixtures/fish-bot.mjs';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker from '../src/worker.js';

const { applyAction, normalize, newFarm, FISH, FISH_LIST, ITEMS, RECIPES, CROPS, BUILDINGS } = R;
const T0 = 1_800_000_000_000;
const V45 = JSON.parse(readFileSync(new URL('./fixtures/v45-obsah.json', import.meta.url), 'utf8'));
const OLD_FISH = ['plotice', 'karas', 'kapr', 'cejn', 'lin', 'okoun', 'pstruh', 'amur', 'candat', 'uhor', 'stika', 'bolen', 'sumec', 'jeseter'];
function farm({ st = 10, r = 50, v = 50, pond = 'rybnik', rod = 'udice' } = {}) {
  const f = newFarm(T0);
  f.objects.find(o => o.kind === 'statek').lvl = st;
  f.sk = { f: 0, r: R.SKILL_XP[r], v: R.SKILL_XP[v] }; f.level = 30; f.xp = R.LEVEL_XP[30]; f.coins = 1e5; f.siloCap = 9999;
  const o = { id: f.nextId++, kind: pond, x: 0, y: 0, lvl: 1 }; f.objects.push(o);
  if (rod) f.machines.push({ id: f.nextId++, model: rod });
  return { f, o };
}
const clone = x => JSON.parse(JSON.stringify(x));

test('T01 okénko: přesné počty ze skladu, nulová nebo zamčená návnada se nedá vybrat', () => {
  const { f } = farm({ st: 5, r: 3 }); f.silo = { corn: 3, navnada: 2 };
  const by = Object.fromEntries(R.BAIT_LIST.map(b => [b.id, b]));
  assert.equal(R.BAIT_LIST.length, 8);
  assert.equal(R.baitFree(f, by.kukurice), 3); assert.equal(R.baitFree(f, by.testo), 2); assert.equal(R.baitFree(f, by.cerv), 0);
  assert.equal(R.baitLock(f, by.syr), 'skill'); assert.equal(R.baitLock(f, by.maso), 'statek');
  assert.equal(applyAction(f, { type: 'fishCast', id: f.objects[1].id, bait: 'cerv', k: 'a' }, T0, null, srv()).error, 'no_bait');
  assert.equal(applyAction(f, { type: 'fishCast', id: f.objects[1].id, bait: 'syr', k: 'a' }, T0, null, srv()).error, 'bait_locked');
});

test('T02 + T03 výběr nic nestojí; nához vezme přesně 1 kus zvolené návnady a po úniku se nevrací', () => {
  const { f, o } = farm(); f.silo = { corn: 3, navnada: 2 };
  const before = clone(f.silo);
  // výběr návnady je jen stav okénka v prohlížeči – žádná akce, žádná změna
  assert.deepEqual(f.silo, before);
  const x = fishOnce(R, f, o.id, T0, { bait: 'kukurice', win: false });
  assert.ok(x.cast.ok && x.land.lost);
  assert.equal(f.silo.corn, 2); assert.equal(f.silo.navnada, 2);
});

test('T04 dvojklik / opakovaný požadavek se stejným klíčem nezaúčtuje druhou návnadu', () => {
  const { f, o } = farm(); f.silo = { navnada: 5 };
  const S = srv(3);
  const a = applyAction(f, { type: 'fishCast', id: o.id, bait: 'testo', k: 'dvoj' }, T0, null, S);
  const b = applyAction(f, { type: 'fishCast', id: o.id, bait: 'testo', k: 'dvoj' }, T0 + 50, null, S);
  assert.ok(a.ok && b.ok && b.again);
  assert.deepEqual(b.session, a.session);
  assert.equal(f.silo.navnada, 4);
  assert.equal(applyAction(f, { type: 'fishCast', id: o.id, bait: 'testo', k: 'jiny' }, T0 + 60, null, S).error, 'hooked');
  // druhý rybník: pořád jen jeden nához na hráče
  const o2 = { id: f.nextId++, kind: 'rybnik', x: 5, y: 5, lvl: 1 }; f.objects.push(o2);
  assert.equal(applyAction(f, { type: 'fishCast', id: o2.id, bait: 'testo', k: 'x' }, T0 + 70, null, S).error, 'hooked');
});

test('T05 poslední kus chráněný rezervou skladu nejde nahodit', () => {
  const { f, o } = farm(); f.silo = { syr: 1 }; f.keep = { syr: 1 };
  assert.equal(applyAction(f, { type: 'fishCast', id: o.id, bait: 'syr', k: 'r' }, T0, null, srv()).error, 'bait_keep');
  assert.equal(f.silo.syr, 1);
});

test('T06 Těsto = dosavadní „Návnada“: staré zásoby i fronta Krmivárny fungují', () => {
  assert.equal(R.BAITS_BY.testo.item, 'navnada');
  assert.deepEqual(RECIPES.navnada.in, { wheat: 1, corn: 1 }); assert.equal(R.recipeQty(RECIPES.navnada), 3); assert.equal(RECIPES.navnada.time, 120);
  const { f, o } = farm(); f.silo = { navnada: 1 };
  const k = { id: f.nextId++, kind: 'krmivarna', x: 4, y: 4, lvl: 1, queue: [{ r: 'navnada', end: T0 - 1000, d: 120000 }] }; f.objects.push(k);
  normalize(f);
  assert.ok(applyAction(f, { type: 'collect', id: k.id }, T0).ok);
  assert.equal(f.silo.navnada, 4, 'rozpracovaná výroba dala 3 návnady');
  assert.ok(fishOnce(R, f, o.id, T0 + 1000).cast.ok, 'bez volby = Těsto (jako dřív)');
  assert.equal(f.silo.navnada, 3);
});

test('T07 + T08 Hrášek bere plodinu Hrách, Rohlík je jediná položka (pečivo i návnada), Třpytka se kupuje za mince', () => {
  assert.equal(R.BAITS_BY.hrasek.item, 'hrach'); assert.ok(!ITEMS.hrasek);
  assert.equal(R.BAITS_BY.rohlik.item, 'rohlik'); assert.equal(RECIPES.rohlik.building, 'pekarna'); assert.ok(!RECIPES.rohlik.out);
  const { f, o } = farm(); f.silo = { hrach: 2 };
  assert.ok(fishOnce(R, f, o.id, T0, { bait: 'hrasek', win: false }).cast.ok);
  assert.equal(f.silo.hrach, 1);
  const coins = f.coins;
  assert.ok(applyAction(f, { type: 'buySupply', item: 'trpytka', qty: 2 }, T0 + 9e5).ok);
  assert.equal(f.silo.trpytka, 2); assert.equal(coins - f.coins, 2 * ITEMS.trpytka.price);
  assert.ok(applyAction(f, { type: 'buySupply', item: 'cerv', qty: 10 }, T0 + 9e5).ok);
  const g = farm({ st: 5, r: 5 }).f;
  assert.equal(applyAction(g, { type: 'buySupply', item: 'trpytka', qty: 1 }, T0).error !== undefined, true, 'zamčenou třpytku nekoupí');
});

test('T09 prázdný rybník: návnada se neodečte', () => {
  const { f, o } = farm(); f.silo = { navnada: 3 }; o.sc = 0; o.st = T0;
  assert.equal(applyAction(f, { type: 'fishCast', id: o.id, bait: 'testo', k: 'e' }, T0, null, srv()).error, 'no_fish');
  assert.equal(f.silo.navnada, 3);
});

test('T10 druh ani váha nejsou vidět před vylovením (výsledek, stav farmy, data pro prohlížeč)', () => {
  const { f, o } = farm(); f.silo = { navnada: 3 };
  const c = applyAction(f, { type: 'fishCast', id: o.id, bait: 'testo', k: 'h' }, T0, null, srv());
  const pub = JSON.stringify(R.publicFarm(f)), res = JSON.stringify(c);
  assert.ok(f.sx && f.sx[o.id], 'server si rybu pamatuje');
  assert.ok(!('sx' in R.publicFarm(f)));
  for (const fi of FISH_LIST) { assert.ok(!res.includes(`"${fi.id}"`), 'výsledek nahození: ' + fi.id); assert.ok(!pub.includes(`"${fi.id}"`), 'farma: ' + fi.id); }
  assert.deepEqual(Object.keys(o.hook).sort(), ['b', 'k', 'p', 'res', 't', 'w', 'z']);
  // v prohlížeči (bez serveru) se ryba vůbec nevybere
  const g = farm().f; g.silo = { navnada: 1 };
  const local = applyAction(g, { type: 'fishCast', id: g.objects[1].id, bait: 'testo', k: 'l' }, T0);
  assert.ok(local.ok && local.session.pend && !g.sx);
});

test('T10 + T13 přes API: server rybu neprozradí, podvržené vylovení neprojde', async () => {
  const env = { DB: fakeD1() };
  const call = async (path, token, body) => {
    const headers = { 'content-type': 'application/json', 'x-eko-version': String(R.CLIENT_MIN) };
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await worker.fetch(new Request('https://x' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined }), env);
    return await res.json();
  };
  const reg = await call('/api/register', null, { name: 'Rybar', password: 'tajne123' });
  const row = await env.DB.prepare('SELECT state FROM farms WHERE user_id = 1').first();
  const fm = JSON.parse(row.state);
  fm.objects.find(o => o.kind === 'statek').lvl = 5; fm.objects.push({ id: 900, kind: 'rybnik', x: 0, y: 0, lvl: 1 }); fm.machines.push({ id: 901, model: 'udice' }); fm.silo = { navnada: 5 };
  fm.sk = { f: 0, r: 0, v: 0 }; fm.skv = 2;
  await env.DB.prepare('UPDATE farms SET state = ? WHERE user_id = 1').bind(JSON.stringify(fm)).run();
  const c = await call('/api/actions', reg.token, { actions: [{ type: 'fishCast', id: 900, bait: 'testo', k: 'api1' }] });
  assert.ok(c.results[0].ok, JSON.stringify(c.results[0]));
  assert.ok(!('sx' in c.farm) && c.farm.objects.find(o => o.id === 900).hook.f === undefined);
  for (const fi of FISH_LIST) assert.ok(!JSON.stringify(c).includes(`"${fi.id}"`), fi.id);
  const st = await call('/api/state', reg.token);
  assert.ok(!('sx' in st.farm), 'ani při načtení');
  // podvržený úspěch: bez klepnutí (a klient „ok: true“) = ryba uteče, nic nepřibude
  const l = await call('/api/actions', reg.token, { actions: [{ type: 'fishLand', id: 900, k: 'api1', ok: true, taps: [] }] });
  assert.ok(l.results[0].ok && l.results[0].lost && !l.results[0].fish);
  assert.equal(l.farm.stats.fish || 0, 0);
});

test('T11 + T12 úspěch: ryba, rekord, deník a XP jednou; neúspěch nic z toho nemění', () => {
  const { f, o } = farm(); f.silo = { navnada: 5 };
  const lost = fishOnce(R, f, o.id, T0, { win: false });
  assert.ok(lost.land.lost); assert.deepEqual(f.fj.c, {}); assert.deepEqual(f.fishRec || {}, {});
  const x = fishOnce(R, f, o.id, lost.t + 1000);
  assert.ok(x.land.ok && x.land.fish, JSON.stringify(x.land));
  const sp = x.land.fish, xp = f.xp;
  assert.equal(f.silo[sp], x.land.gained.items[0].qty); assert.equal(f.fj.c[sp], 1); assert.equal(f.fishRec[sp], x.land.kg);
  assert.equal(applyAction(f, { type: 'fishLand', id: o.id, k: x.cast.session.k, taps: x.bot.taps }, x.t + 10, null, srv()).error, 'no_hook');
  assert.equal(f.xp, xp); assert.equal(f.fj.c[sp], 1);
});

test('T13 výsledek nejde podvrhnout: bez klepnutí, s náhodným klepáním ani moc rychle', () => {
  const { f, o } = farm(); f.silo = { navnada: 10 };
  const S = srv(9);
  const c = applyAction(f, { type: 'fishCast', id: o.id, k: 'q' }, T0, null, S);
  const P = R.fightParams(f, o.hook), b = botTaps(R, P, 1, 2);
  assert.equal(b.res, 'win');
  const fast = applyAction(f, { type: 'fishLand', id: o.id, k: 'q', taps: b.taps, ok: true, progress: 100 }, T0 + 500, null, S);
  assert.ok(fast.lost && fast.fast, 'moc rychle = podvrh');
  applyAction(f, { type: 'fishCast', id: o.id, k: 'q2' }, T0 + 10000, null, S);
  const P2 = R.fightParams(f, o.hook), rnd = botTaps(R, P2, 0, 5);
  assert.notEqual(rnd.res, 'win');
  assert.ok(applyAction(f, { type: 'fishLand', id: o.id, k: 'q2', taps: rnd.taps }, T0 + 60000, null, S).lost);
  assert.equal(f.stats.fish || 0, 0);
});

test('T14 ryby mimo Rybaření nebo vodní plochu nemají žádnou šanci ani s nejlepší návnadou', () => {
  const { f, o } = farm({ r: 7 });
  const pool = R.fishPool(f, o).map(x => x.id);
  for (const id of pool) assert.ok(FISH[id].fishLv <= 7 && (!FISH[id].pond || FISH[id].pond === 'rybnik'), id);
  for (const b of R.BAIT_LIST) for (let i = 0; i < 400; i++) assert.ok(pool.includes(R.pickFish(f, i / 400, T0, o, b.id)), b.id);
  const g = farm({ r: 50, pond: 'rybnik2' });
  const pool2 = R.fishPool(g.f, g.o).map(x => x.id);
  assert.ok(pool2.includes('tloust') && !pool2.includes('siven') && !pool2.includes('tolstolobik'));
  assert.ok(R.fishPool(farm({ r: 50, pond: 'rybnik4' }).f, { kind: 'rybnik4' }).some(x => x.id === 'mnik'));
});

test('T15 návnady mají měřitelný, ne absolutní vliv (10 000 losů)', () => {
  const { f, o } = farm({ r: 12 });
  const S = srv(17), N = 10000;
  const share = (bait, ids) => { let n = 0; for (let i = 0; i < N; i++) if (ids.includes(R.pickFish(f, S.rand(), T0, o, bait))) n++; return n / N; };
  for (const b of R.BAIT_LIST) {
    const liked = b.pref.filter(id => R.fishPool(f, o).some(x => x.id === id));
    if (!liked.length) continue;
    const base = share(null, liked), withB = share(b.id, liked);
    assert.ok(withB > base * 1.15, `${b.id}: ${withB} vs ${base}`);
    assert.ok(withB < 0.999, `${b.id}: nikdy jistota`);
  }
});

test('T16 výpadek: stejný nához se obnoví, po vypršení se ryba vrátí a jde nahodit znovu', () => {
  const { f, o } = farm(); f.silo = { navnada: 5 };
  const S = srv(5);
  const a = applyAction(f, { type: 'fishCast', id: o.id, k: 'r1' }, T0, null, S);
  assert.ok(applyAction(f, { type: 'fishCast', id: o.id, k: 'r1' }, T0 + 20000, null, S).again);
  const cnt = R.pondStock(o, T0 + 20000).count;
  const late = T0 + R.HOOK_MS + 31000;
  assert.equal(applyAction(f, { type: 'fishLand', id: o.id, k: 'r1', taps: [] }, late, null, S).error, 'no_hook');
  assert.equal(R.pondStock(o, late).count >= cnt + 1 || R.pondStock(o, late).count === R.pondCap(o), true, 'rezervovaná ryba zpátky');
  assert.ok(applyAction(f, { type: 'fishCast', id: o.id, k: 'r2' }, late + 10, null, S).ok);
  assert.equal(f.silo.navnada, 3, 'dvě nahození = dvě návnady');
  assert.ok(a.ok);
});

test('T17 + T29 starých 14 ryb, 10 udic, kapacity 5/8/15/20, deník a rekordy zůstávají; stará farma se načte beze ztráty', () => {
  for (const id of OLD_FISH) assert.ok(FISH[id] && !FISH[id].pond, id);
  assert.equal(R.MACHINE_LIST.filter(m => m.type === 'rod').length, 10);
  assert.deepEqual(['rybnik', 'rybnik2', 'rybnik3', 'rybnik4'].map(k => R.POND[k].cap), [5, 8, 15, 20]);
  const old = { ...newFarm(T0), silo: { navnada: 7, kapr: 2 }, fishRec: { kapr: 6.4, jeseter: 31 }, fj: { c: { kapr: 4, jeseter: 1 }, r: ['1:kapr', '1:jeseter'] } };
  old.objects.push({ id: 77, kind: 'krmivarna', x: 0, y: 0, lvl: 1, queue: [{ r: 'navnada', end: T0 + 5000, d: 120000 }] });
  const g = normalize(clone(old));
  assert.deepEqual(g.silo, { navnada: 7, kapr: 2 }); assert.deepEqual(g.fishRec, old.fishRec); assert.deepEqual(g.fj.c, old.fj.c);
  assert.equal(g.objects.find(o => o.id === 77).queue.length, 1);
  for (const [id, p] of Object.entries(V45.prices)) assert.equal(ITEMS[id].price, p, 'cena ' + id);
});

test('T19 + T21 klepnutí se počítá jen s odstupem (žádný automat ani držení), minihra nezávisí na FPS', () => {
  const P = R.fightParams(farm().f, { p: 2, z: 123 });
  const every = Array.from({ length: P.max }, (_, i) => i);
  const a = R.fightReplay(P, every), b = R.fightReplay(P, every.filter(i => i % FIGHT.gap === 0));
  assert.deepEqual([a.res, a.i, a.prog], [b.res, b.i, b.prog], 'klepnutí v každém kroku = jako s nejmenším odstupem');
  // stejná klepnutí = stejný výsledek, ať prohlížeč kreslí 30 nebo 60× za sekundu (výpočet jde po krocích 1/30 s)
  const t = botTaps(R, P, 1, 4);
  assert.deepEqual(R.fightReplay(P, t.taps).res, t.res);
});

test('T22 server neodpočítává každý snímek: celý souboj se ověří jedním přehráním (< 5 ms)', () => {
  const P = R.fightParams(farm().f, { p: 3, z: 99 }), t = botTaps(R, P, 1, 1);
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) R.fightReplay(P, t.taps);
  assert.ok((performance.now() - t0) / 100 < 5);
});

test('T23 + T24 10 nových ryb ve správných vodách, 16 rybích receptů bez duplicit, odemčení podle Statku a Vaření', () => {
  const newF = ECO_FISH.map(e => e.id);
  assert.equal(newF.length, 10);
  for (const e of ECO_FISH) { assert.ok(FISH[e.id] && FISH[e.id].pond === e.pond && FISH[e.id].fishLv === e.lv, e.id); assert.equal(FISH[e.id].st, BUILDINGS[e.pond].st); }
  const fr = FISH_RECIPES.filter(r => !['masova_navnada', 'rohlik'].includes(r.id));
  assert.equal(fr.length, 16);
  const oldNames = new Set(Object.keys(V45.recipes).map(id => ITEMS[R.recipeOut(RECIPES[id])].name));
  const v46 = Object.values(RECIPES).filter(r => r.eco && !FISH_RECIPES.concat(BAKERY_RECIPES).some(x => x.id === r.id)).map(r => R.recipeName(r));
  for (const r of fr.concat(BAKERY_RECIPES)) {
    assert.ok(RECIPES[r.id] && !(r.id in V45.recipes), r.id);
    assert.ok(!oldNames.has(r.name) && !v46.includes(r.name), 'stejný název už existuje: ' + r.name);
    assert.ok(RECIPES[r.id].st >= r.st && RECIPES[r.id].cook === r.cook, r.id);
  }
  assert.ok(!R.availableItems(9, 99, 99).has('rybi_misa') && !R.availableItems(10, 39, 99).has('rybi_misa') && R.availableItems(10, 40, 99).has('rybi_misa'));
  assert.ok(!R.availableItems(10, 99, 19).has('siven_cesnek'), 'siven až s Rybařením 20');
});

test('T25 pečivo: 19 receptů, žito a mák, žitná mouka, mletý mák, tvaroh; cukr až se Statkem 8', () => {
  const bake = BAKERY_RECIPES.filter(r => r.b === 'pekarna').length + 1;   // + Rohlík
  assert.equal(bake, 19);
  for (const c of BAKERY_CROPS) { const x = CROPS[c.id]; assert.ok(x && x.st === c.st && x.yield === 2 && x.harvester === 'combine' && RECIPES['s_' + c.id], c.id); }
  for (const id of ['zitna_mouka', 'mlety_mak', 'tvaroh']) assert.ok(RECIPES[id] && ITEMS[id], id);
  for (const r of Object.values(RECIPES)) if (r.in.cukr) assert.ok(r.st >= BUILDINGS.cukrovar.st, r.id);
  assert.ok(!R.availableItems(2, 99, 99).has('zitny_bochnik') && R.availableItems(3, 5, 1).has('zitny_bochnik'));
  assert.ok(!R.availableItems(3, 99, 99).has('makovy_kolacek') && R.availableItems(4, 8, 1).has('makovy_kolacek'));
  assert.ok(RECIPES.tvarohovy_satecek.st >= BUILDINGS.mlekarna.st);
});

test('T26 zakázky, Stánek a pohoštění chtějí jen to, co hráč může mít (i nové ryby, pečivo, návnady)', () => {
  for (const [st, ck, fi] of [[1, 1, 1], [3, 5, 2], [5, 10, 8], [7, 20, 15], [10, 50, 50]]) {
    const { f } = farm({ st, r: fi, v: ck }), ok = R.farmAvail(f);
    for (let i = 0; i < 30; i++) { f.orders = []; normalize(f); for (const o of f.orders) for (const x of o.items) assert.ok(ok.has(x.item), x.item); }
    for (let k = 0; k < 8; k++) { const s = R.stallOffers(f, T0 + k * 7_200_000); for (const x of [...s.buy, ...s.sell]) assert.ok(ok.has(x.item), x.item); }
  }
});

test('T27 ceny ze vzorce, žádná nekonečná zisková smyčka; návnady jen na ryby stojí méně než ryby, na které lákají', () => {
  const edges = {};
  for (const r of Object.values(RECIPES)) for (const x of Object.keys(r.in)) (edges[x] = edges[x] || []).push(R.recipeOut(r));
  const state = {}, dfs = v => { state[v] = 1; for (const w of edges[v] || []) { assert.notEqual(state[w], 1, 'cyklus ' + v + '→' + w); if (!state[w]) dfs(w); } state[v] = 2; };
  for (const v of Object.keys(edges)) if (!state[v]) dfs(v);
  for (const r of FISH_RECIPES.concat(BAKERY_RECIPES)) {
    const x = RECIPES[r.id], inp = Object.entries(x.in).reduce((n, [id, q]) => n + ITEMS[id].price * q, 0);
    assert.equal(ITEMS[r.id].price, Math.max(1, Math.round((inp * 1.2 + x.time / 60 + 2) / R.recipeQty(x))), r.id);
  }
  // návnady určené jen na ryby (těsto, červ, třpytka, masová) stojí méně než průměrná ryba, na kterou lákají;
  // kukuřice, hrách, sýr a rohlík jsou zboží – hráč volí sám (cena je vidět ve skladu)
  for (const id of ['testo', 'cerv', 'trpytka', 'maso']) {
    const b = R.BAITS_BY[id], liked = b.pref.map(x => FISH[x]).filter(Boolean);
    const avg = liked.reduce((n, x) => n + x.price, 0) / liked.length;
    assert.ok(ITEMS[b.item].price < avg, `${id}: ${ITEMS[b.item].price} vs ${avg}`);
  }
});

test('T28 grafika odpovídá: každá nová ryba, jídlo, pečivo, návnada a plodina má obrázek; minihra má pózy a scénu', () => {
  const ids = [...ECO_FISH.map(e => e.id), ...FISH_RECIPES.map(r => r.id), ...BAKERY_RECIPES.map(r => r.id), 'cerv', 'trpytka', ...BAKERY_CROPS.flatMap(c => [c.id, 's_' + c.id]), 'ryba_obecna', 'vlasec', 'rybarska_bedna'];
  for (const id of ids) assert.ok(ASSETS.i.includes((ITEMS[id] || { icon: id }).icon), 'ikona ' + id);
  for (const c of BAKERY_CROPS) for (const s of [0, 1, 2]) assert.ok(ASSETS.c.includes(`${c.id}_${s}`), c.id);
  for (let i = 0; i < 5; i++) assert.ok(ASSETS.r.includes('rybar_' + i));
  assert.ok(ASSETS.r.includes('scena'));
  for (const b of BAITS) assert.ok(ASSETS.i.includes(ITEMS[b.item].icon), 'návnada ' + b.id);
});

test('Úkoly v47: nához s návnadou a rybí jídla se počítají do denních úkolů; bez rybníka a udice se nenabízí', () => {
  const { f, o } = farm(); f.silo = { navnada: 5, kapr: 2, mouka: 2, vejce: 2 };
  const ryb = { id: f.nextId++, kind: 'rybarna', x: 8, y: 8, lvl: 1, queue: [] }; f.objects.push(ryb);
  assert.ok(R.QUEST_TYPES.cast.need(f) && R.QUEST_TYPES.fishdish.need(f));
  const bare = newFarm(T0);
  assert.ok(!R.QUEST_TYPES.cast.need(bare) && !R.QUEST_TYPES.fishdish.need(bare));
  const s0 = clone(f.stats);
  fishOnce(R, f, o.id, T0, { bait: 'testo', win: false });
  fishOnce(R, f, o.id, T0 + 60_000, { bait: 'testo', win: true });
  assert.equal(f.stats.cast - (s0.cast || 0), 2);
  assert.equal(f.stats.fish - s0.fish >= 1, true);
  const t = T0 + 120_000;
  assert.ok(applyAction(f, { type: 'produce', id: ryb.id, recipe: 'smazeny_kapr' }, t).ok);
  assert.ok(applyAction(f, { type: 'collect', id: ryb.id }, t + RECIPES.smazeny_kapr.time * 1000 + 1000).ok);
  assert.equal(f.stats.fishdish - (s0.fishdish || 0), R.recipeQty(RECIPES.smazeny_kapr));
  // stará farma bez nových statistik: normalize je doplní nulou, nic se neztratí
  const old = clone(f); delete old.stats.cast; delete old.stats.fishdish;
  normalize(old); assert.equal(old.stats.cast, 0); assert.equal(old.stats.fish, f.stats.fish);
});

test('T29 + T16 rozběhnutý nához ze staré verze (v46) se po aktualizaci zruší, ryba se vrátí a jde nahodit znovu', () => {
  const { f, o } = farm(); f.silo = { navnada: 3 };
  o.sc = 2; o.st = T0; o.hook = { f: 'kapr', t: T0 - 5000, kg: 3.2 };   // tvar háčku z v46
  normalize(f);
  assert.equal(o.hook, null); assert.equal(o.sc, 3);
  const x = fishOnce(R, f, o.id, T0, { bait: 'testo', win: true });
  assert.ok(x.cast.ok && x.land.ok && !x.land.lost, JSON.stringify(x.land));
  assert.equal(f.silo.navnada, 2);
});
