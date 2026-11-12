// v36: stroje s výhodami, 4 rybníky, události (2× denně, 4 odpovědi, 3 h), pes, rybářský deník, týdenní soutěž, pomoc kamarádovi.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, applyAction, findObject, fits, BUILDINGS, LEVEL_XP, START_PLOTS, MACHINES, MACHINE_LIST, bestOwned, fieldState, fieldYield,
  pondCap, POND, eventNow, EVENTS_BY, fxMult, FX_MS, evCoins, weekNo, weekRoll, weekDue, weekTask, WEEK_PRIZES, helpApply, helpReward, helpUsed,
  FISH_LIST, FJ_MASTER, normalize, CROPS,
} from '../public/js/rules.js';
import { EVENTS } from '../public/js/events.js';
import { fakeD1 } from '../tools/fake-d1.mjs';
import worker from '../src/worker.js';

const T0 = 1_700_000_000_000, H = 3600_000;
function farm(level = 40) {
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
const buy = (f, model) => assert.ok(applyAction(f, { type: 'buyMachine', model }, T0).ok, model);

test('stroje: každý druh má řadu (10 traktorů, 10 kombajnů, 10 udic, po 5 secích strojů, pluhů a lisů) a lepší = rychlejší / výhodnější', () => {
  const by = t => MACHINE_LIST.filter(m => m.type === t).sort((a, b) => a.tier - b.tier);
  assert.equal(by('tractor').length, 10); assert.equal(by('combine').length, 10); assert.equal(by('rod').length, 10);
  for (const t of ['seeder', 'plow', 'baler']) assert.equal(by(t).length, 5, t);
  for (const t of ['tractor', 'combine', 'rod', 'seeder', 'plow', 'baler']) {
    const l = by(t);
    for (let i = 1; i < l.length; i++) {
      assert.ok(l[i].level > l[i - 1].level && l[i].cost > l[i - 1].cost, `${t}: úroveň a cena rostou (${l[i].id})`);
      const k = { tractor: 'speed', combine: 'speed', rod: 'rare', seeder: 'sow', plow: 'mult', baler: 'bale' }[t];
      assert.ok(l[i][k] > l[i - 1][k], `${t}: ${k} roste (${l[i].id})`);
    }
  }
  // dosavadní stroje zůstaly (hráči je mají koupené)
  for (const id of ['brazda60', 'brazda120', 'klas4', 'klas8', 'pluh', 'secka', 'lis', 'udice', 'udice2', 'kolecko', 'motyka']) assert.ok(MACHINES[id], id);
});

test('stroje: nejlepší náčiní se použije samo, osivo se šetří, pluh a lis podle řady, výhoda traktoru a kombajnu do úrody', () => {
  const f = farm(50);
  findObject(f, placeAny(f, 'stodola')).lvl = 10;
  let pole = 0;
  for (let y = 0; y < 17 && !pole; y++) for (let x = 0; x < 17 && !pole; x++) if (fits(f, x, y, 4, 4)) { const r = applyAction(f, { type: 'place', kind: 'velkepole', x, y, w: 4, h: 4 }, T0); if (r.ok) pole = r.id; }
  const o = findObject(f, pole);
  buy(f, 'brazda60'); buy(f, 'obr450'); buy(f, 'secka'); buy(f, 'secka_hvezda'); buy(f, 'pluh'); buy(f, 'pluh_velky'); buy(f, 'klas4'); buy(f, 'zklas30');
  assert.equal(bestOwned(f, 'seeder').id, 'secka_hvezda');
  const obr = f.machines.find(m => m.model === 'obr450');
  // orba nejlepším pluhem: 2× úroda a dvakrát rychleji
  const r1 = applyAction(f, { type: 'fieldPlow', id: pole, machine: obr.id }, T0);
  assert.ok(r1.ok, r1.error);
  const plowMs = o.job.end - T0;
  assert.equal(plowMs, Math.ceil(16 / 34 * 60) * 1000 / 2);
  assert.equal(o.pm, 2);
  const t1 = o.job.end + 1;
  const coins = f.coins;
  const r2 = applyAction(f, { type: 'fieldSow', id: pole, crop: 'wheat', machine: obr.id }, t1);
  assert.ok(r2.ok, r2.error);
  assert.equal(coins - f.coins, Math.ceil(16 * 0.8) * CROPS.wheat.cost, 'osivo za 13 políček místo 16 (−20 %)');
  assert.equal(o.mult, 2); assert.equal(o.ty, 20);
  const st = fieldState(o, o.readyAt + 1);
  assert.equal(st.state, 'ready');
  const kl = f.machines.find(m => m.model === 'zklas30');
  assert.ok(applyAction(f, { type: 'fieldHarvest', id: pole, machine: kl.id }, o.readyAt + 1).ok);
  // 16 políček × výnos pšenice × 2 (pluh) × (1 + 20 % traktor + 20 % kombajn)
  const exp = Math.round(16 * CROPS.wheat.yield * 2 * 1.4);
  assert.equal(o.load.qty, exp);
});

test('rybníky: 4 velikosti podle Statku (3, 5, 7, 10), kapacita 5 / 8 / 15 / 20 ryb', () => {
  assert.deepEqual(['rybnik', 'rybnik2', 'rybnik3', 'rybnik4'].map(k => [BUILDINGS[k].st, BUILDINGS[k].w, pondCap({ kind: k })]),
    [[3, 3, 5], [5, 4, 8], [7, 5, 15], [10, 6, 20]]);
  const f = farm();
  f.objects.find(o => o.kind === 'statek').lvl = 9;
  const r = applyAction(f, { type: 'place', kind: 'rybnik4', x: 0, y: 0 }, T0);
  assert.equal(r.ok, false, 'Jezero až se Statkem 10');
  f.objects.find(o => o.kind === 'statek').lvl = 10;
  assert.ok(placeAny(f, 'rybnik4'));
  assert.ok(POND.rybnik4.rare > POND.rybnik3.rare && POND.rybnik3.rare > POND.rybnik2.rare);
});

test('události: 2× denně (dopoledne a odpoledne), stejná pro server i prohlížeč, odpověď platí jednou', () => {
  const f = farm(10);
  const day0 = Math.floor((T0 + 3600000) / 86400000) * 86400000 - 3600000;   // půlnoc místního času
  const seen = new Set();
  for (let h = 0; h < 48; h += 0.5) { const e = eventNow(f, day0 + h * H); if (e) seen.add(e.slot); }
  assert.equal(seen.size, 5, 'za 2 dny 4 události (+ večerní z předchozího dne do 7 hodin ráno)');
  const morning = eventNow(f, day0 + 11.5 * H), evening = eventNow(f, day0 + 21.5 * H);
  assert.ok(morning && evening && morning.slot !== evening.slot);
  assert.equal(eventNow(f, day0 + 6.9 * H)?.slot === morning.slot, false, 'ráno před 7. hodinou ještě ne');
  const g = structuredClone(f);
  assert.deepEqual(eventNow(g, day0 + 11.5 * H), morning, 'kopie farmy = stejná událost');
  const e = EVENTS.find(x => x.id === morning.id);
  const i = e.a.findIndex(a => !a.use && !a.pay);
  const r = applyAction(f, { type: 'eventAnswer', slot: morning.slot, id: morning.id, i }, day0 + 11.5 * H);
  assert.ok(r.ok, r.error);
  assert.equal(eventNow(f, day0 + 11.6 * H), null, 'zodpovězená událost zmizí');
  assert.equal(applyAction(f, { type: 'eventAnswer', slot: morning.slot, id: morning.id, i }, day0 + 11.7 * H).error, 'no_event');
  assert.ok(eventNow(f, day0 + 21.5 * H), 'večer přijde další');
  const low = farm(2);
  assert.equal(eventNow(low, day0 + 11.5 * H), null, 'do úrovně 3 žádné události');
});

test('události: dopad na 3 hodiny – co začne během něj, to se zrychlí (a pak už zase normálně)', () => {
  const f = farm(10);
  f.fx.push({ k: 'grow', m: 0.8, u: T0 + FX_MS, e: 'test' });
  assert.equal(fxMult(f, 'grow', T0 + 1), 0.8);
  assert.ok(applyAction(f, { type: 'plant', x: START_PLOTS[0][0], y: START_PLOTS[0][1], crop: 'wheat' }, T0 + 1).ok);
  const p = f.plots.find(q => q.crop);
  const normal = p.d / 0.8;
  assert.equal(fxMult(f, 'grow', T0 + FX_MS + 1), 1, 'po 3 hodinách nic');
  assert.ok(applyAction(f, { type: 'plant', x: START_PLOTS[1][0], y: START_PLOTS[1][1], crop: 'wheat' }, T0 + FX_MS + 1).ok);
  const q = f.plots.filter(x => x.crop)[1];
  assert.ok(Math.abs(q.d - normal) <= 1 || q.d !== p.d, 'mimo dopad roste běžně (podle počasí)');
});

test('události: každá má 4 odpovědi, odpovědi s cenou a spotřebou se hlídají, ztráty a dárky, pes zmírní', () => {
  for (const e of EVENTS) {
    assert.equal(e.a.length, 4, e.id);
    for (const a of e.a) {
      const outs = a.p !== undefined ? [a.ok, a.bad] : [a];
      for (const o of outs) assert.ok(o && typeof o.r === 'string' && o.r.length > 5, `${e.id}: výsledek má text`);
    }
  }
  assert.ok(EVENTS.length >= 20);
  // liška: bez psa ztráta 4 vajec, se psem 2
  const run = dog => {
    const f = farm(10);
    const k = placeAny(f, 'kurnik');
    assert.ok(applyAction(f, { type: 'buyAnimal', animal: 'slepice' }, T0).ok);
    f.silo.vejce = 10;
    if (dog) assert.ok(applyAction(f, { type: 'buyDog' }, T0).ok);
    // najít půlden, kdy přijde liška
    for (let h = 0; h < 24 * 60; h += 1) {
      const t = T0 + h * H, ev = eventNow(f, t);
      if (ev && ev.id === 'liska') { const r = applyAction(f, { type: 'eventAnswer', slot: ev.slot, id: ev.id, i: 2 }, t); assert.ok(r.ok, r.error); return { r, f, k }; }
      if (ev) f.ev.k = ev.slot;   // jiné události přeskočit
    }
    assert.fail('liška nepřišla');
  };
  const a = run(false), b = run(true);
  assert.equal(10 - a.f.silo.vejce, 4);
  assert.equal(10 - b.f.silo.vejce, 2, 'pes: poloviční ztráta');
  assert.ok(b.r.dog);
  assert.ok(Math.abs(fxMult(a.f, 'animal', a.f.ev.last.t + 1) - 1.2) < 1e-9);
  assert.ok(Math.abs(fxMult(b.f, 'animal', b.f.ev.last.t + 1) - 1.1) < 1e-9, 'pes: poloviční zhoršení');
  assert.equal(evCoins(farm(1), 40), 40); assert.ok(evCoins(farm(20), 40) > 100);
});

test('pes: koupě od úrovně 6, jen jeden', () => {
  const f = farm(5);
  assert.equal(applyAction(f, { type: 'buyDog' }, T0).error, 'locked');
  f.level = 6;
  assert.ok(applyAction(f, { type: 'buyDog' }, T0).ok);
  assert.equal(applyAction(f, { type: 'buyDog' }, T0).error, 'owned');
  assert.ok(f.dog && f.dog.name);
});

test('rybářský deník: první úlovek a mistr druhu dají odměnu jen jednou, staré rekordy se počítají jako ulovené', () => {
  const f = farm(40);
  const id = placeAny(f, 'rybnik');
  buy(f, 'prut_zlato');
  f.silo.navnada = 100;
  let firstCoins = 0, masters = 0, catches = 0;
  for (let i = 0; i < 40 && catches < 30; i++) {
    const t = T0 + i * 3 * H;
    const c = applyAction(f, { type: 'fishCast', id }, t);
    if (!c.ok) continue;
    const r = applyAction(f, { type: 'fishLand', id, ok: true }, t + 5000);
    assert.ok(r.ok, r.error);
    catches++;
    for (const j of r.journal) { if (j.text.startsWith('Nová')) firstCoins++; if (j.text.startsWith('Mistr rybář')) masters++; }
  }
  const species = Object.keys(f.fj.c).length;
  assert.equal(firstCoins, species, 'odměna za každý nový druh právě jednou');
  assert.equal(masters, Object.values(f.fj.c).filter(n => n >= FJ_MASTER).length);
  const old = normalize({ ...newFarm(T0), fj: undefined, fishRec: { kapr: 3.2 } });
  assert.equal(old.fj.c.kapr, 1); assert.ok(old.fj.r.includes('1:kapr'));
});

test('týdenní soutěž: skóre se počítá od začátku týdne, nový týden s umístěním dá odměnu prvním třem', () => {
  const f = farm(10);
  const w = weekNo(T0);
  applyAction(f, { type: 'tick' }, T0);
  assert.equal(f.wk.w, w);
  assert.equal(f.wk.k, weekTask(w).k);
  f.stats[f.wk.k] = (f.stats[f.wk.k] || 0) + 25;
  applyAction(f, { type: 'tick' }, T0 + 1000);
  assert.equal(f.wk.s, 25);
  const next = T0 + 8 * 86400000;
  assert.ok(weekDue(f, next));
  const coins = f.coins;
  const prize = weekRoll(f, next, 2);
  assert.equal(prize.rank, 2); assert.equal(f.coins - coins, WEEK_PRIZES[1].coins);
  assert.equal(f.wk.ps, 25); assert.equal(f.wk.pw, w); assert.equal(f.wk.s, 0);
  const g = farm(10); applyAction(g, { type: 'tick' }, T0);
  const c2 = g.coins; weekRoll(g, next, null);
  assert.equal(g.coins, c2, 'bez umístění (testovací verze) bez odměny');
});

test('pomoc kamarádovi: urychlí nejdelší výrobu nebo pole, max 3× denně pro farmu, pomocník 1× denně', () => {
  const f = farm(10);
  const pk = placeAny(f, 'pekarna');
  f.silo.wheat = 50;
  const pr = applyAction(f, { type: 'produce', id: pk, recipe: 'chleb' }, T0); assert.ok(pr.ok, pr.error);
  const o = findObject(f, pk), end = o.queue[0].end;
  const r = helpApply(f, T0 + 1000, 'Ota');
  assert.ok(r.ok, r.error);
  assert.ok(o.queue[0].end < end && end - o.queue[0].end <= 3600000);
  assert.equal(f.helped[0].n, 'Ota');
  helpApply(f, T0 + 2000, 'Ema'); helpApply(f, T0 + 3000, 'Iva');
  assert.equal(helpApply(f, T0 + 4000, 'Jan').error, 'help_full');
  const me = farm(10);
  assert.equal(helpUsed(me, T0), false);
  helpReward(me, T0, 'Ota', r.text);
  assert.equal(helpUsed(me, T0), true);
  assert.equal(helpUsed(me, T0 + 86400000), false, 'zítra zase');
});

// ---------------------------------------------------------------- server
const env = { DB: fakeD1() };
async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://x' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
test('server: pomoc kamarádovi přes /api/help a týdenní žebříček /api/weekly', async () => {
  const a = (await call('/api/register', { method: 'POST', body: { name: 'Pomocnik36', password: 'tajne123' } })).data.token;
  const b = (await call('/api/register', { method: 'POST', body: { name: 'Kamarad36', password: 'tajne123' } })).data.token;
  // kamarád zaseje pole (a tím má co urychlit)
  const plots = [[11, 8], [12, 8], [13, 8]];
  const acts = plots.flatMap(([x, y]) => [{ type: 'buyPlot', x, y }, { type: 'plant', x, y, crop: 'wheat' }]);
  assert.equal((await call('/api/actions', { method: 'POST', token: b, body: { actions: acts } })).status, 200);
  const self = await call('/api/help', { method: 'POST', token: a, body: { name: 'Pomocnik36' } });
  assert.equal(self.data.error, 'help_self');
  const r = await call('/api/help', { method: 'POST', token: a, body: { name: 'Kamarad36' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.text.includes('polí'));
  const again = await call('/api/help', { method: 'POST', token: a, body: { name: 'Kamarad36' } });
  assert.equal(again.data.error, 'help_used');
  const s = await call('/api/state', { token: b });
  assert.equal(s.data.farm.helped[0].n, 'Pomocnik36');
  const w = await call('/api/weekly', { token: b });
  assert.equal(w.status, 200);
  assert.ok(w.data.task && w.data.task.name);
});
