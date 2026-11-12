// v39/v40: hlavní příběh v kapitolách (volby si hra pamatuje, kapitolu odemyká Statek), denní série se vzácnými ozdobami,
// suroviny na vylepšení budov jen z toho, co Statek odemkl.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, applyAction, eventNow, LEVEL_XP, START_PLOTS, BUILDINGS, STORY_BY, EVENTS_BY, storyCond, storyText, answerShown,
  chapterReward, dailyReward, DAILY_DECO, fits, upgradeCost, RECIPES, ITEMS, CROPS, ANIMAL_LIST, TREE_LIST, stOk, EV_LEVEL,
} from '../public/js/rules.js';
import { STORY, CHAPTERS, STORY_PEOPLE } from '../public/js/story.js';

const T0 = 1_700_000_000_000, H = 3600_000, DAY = 24 * H;
const day0 = Math.floor((T0 + H) / DAY) * DAY - H;   // půlnoc místního času
const evening = d => day0 + d * DAY + 22 * H;          // ve 22 h už čeká odpolední událost
function farm(level = 3, st = 1) {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.level = level; f.xp = LEVEL_XP[level]; f.coins = 1e5; f.ev = { k: 0, h: [] };
  f.objects.find(o => o.kind === 'statek').lvl = st;
  return f;
}
const free = (f, e) => e.a.findIndex(a => !a.pay && !a.use && answerShown(f, e, a) && !a.need);
function play(f, d, i, at = evening(d)) {
  const ev = eventNow(f, at);
  assert.ok(ev && STORY_BY[ev.id], `den ${d}: čeká díl příběhu`);
  const e = STORY_BY[ev.id];
  const r = applyAction(f, { type: 'eventAnswer', slot: ev.slot, id: ev.id, i: i ?? free(f, e) }, at);
  assert.ok(r.ok, r.error);
  return r;
}

test('příběh: 5 kapitol po 4 dílech, každý díl má odpovědi bez podmínek a výsledek s textem', () => {
  assert.equal(CHAPTERS.length, 5);
  assert.equal(STORY.length, 20);
  const set = new Set();
  for (const ch of CHAPTERS) {
    const eps = STORY.filter(e => e.ch === ch.n);
    assert.equal(eps.length, 4, `kapitola ${ch.n}`);
    assert.ok(eps[3].end && !eps.slice(0, 3).some(e => e.end), `kapitola ${ch.n}: konec je 4. díl`);
    const b = BUILDINGS[ch.deco];
    assert.ok(b && b.type === 'deco' && b.gift, `kapitola ${ch.n}: ozdoba ${ch.deco}`);
    assert.equal(ch.st, ch.n, `kapitola ${ch.n} se odemkne se Statkem ${ch.n}`);
  }
  for (const e of STORY) {
    assert.ok(e.title && e.text.length > 40, e.id);
    assert.ok(e.a.length >= 3 && e.a.length <= 5, e.id);
    assert.ok(e.a.filter(a => !a.if && !a.need && !a.pay && !a.use).length >= 2, `${e.id}: aspoň 2 odpovědi pro každého`);
    for (const a of e.a) {
      const outs = a.p !== undefined ? [a.ok, a.bad] : [a];
      for (const o of outs) assert.ok(o && typeof o.r === 'string' && o.r.length > 10, `${e.id}: ${a.t}`);
      for (const x of [a, ...outs]) for (const k of Object.keys(x.rel || {}).concat(Object.keys(x.need || {}))) assert.ok(STORY_PEOPLE[k], `${e.id}: postava ${k}`);
      // příznak v podmínce musí jít nastavit v některém dřívějším dílu
      for (const fl of [a.if, a.not].filter(Boolean)) assert.ok(set.has(fl), `${e.id}: příznak ${fl} se nastavuje dřív`);
    }
    for (const m of e.more || []) for (const fl of [m.if, m.not].filter(Boolean)) assert.ok(set.has(fl), `${e.id}: příznak ${fl} se nastavuje dřív`);
    for (const a of e.a) { if (a.set) set.add(a.set); for (const o of [a.ok, a.bad]) if (o && o.set) set.add(o.set); }
  }
  for (const id of Object.keys(STORY_BY)) assert.ok(!EVENTS_BY[id], `${id} se nekříží s událostmi`);
});

test('příběh: nejvýš jeden díl za den místo události, kapitolu otevře Statek, začíná se od 1. kapitoly', () => {
  const f = farm(3, 1);
  const morning = day0 + 11.5 * H;
  assert.equal(eventNow(f, morning).id, 'k1a');
  play(f, 0, undefined, morning);
  // stejný den odpoledne: obyčejná událost
  const next = eventNow(f, evening(0));
  assert.ok(!next || !STORY_BY[next.id], 'druhý díl až zítra');
  assert.equal(eventNow(f, evening(1)).id, 'k1b');
  // díl počká, i když ho hráč den nehraje
  assert.equal(eventNow(f, evening(3)).id, 'k1b');
  play(f, 3); play(f, 4);
  const r = play(f, 5);
  assert.ok(r.chapter, 'konec 1. kapitoly');
  // kapitola 2 až se Statkem 2 – úroveň hráče nepomůže
  f.level = 30; f.xp = LEVEL_XP[30];
  const ev = eventNow(f, evening(6));
  assert.ok(ev && !STORY_BY[ev.id], 'na Statku 1 další kapitola nezačne');
  f.objects.find(o => o.kind === 'statek').lvl = 2;
  assert.equal(eventNow(f, evening(7)).id, 'k2a');
  // stejná farma = stejný díl na serveru i v prohlížeči
  assert.deepEqual(eventNow(structuredClone(f), evening(7)), eventNow(f, evening(7)));
  // hráč s vyšším Statkem začne taky od 1. kapitoly a nic nepřeskočí
  const g = farm(20, 6);
  assert.equal(eventNow(g, evening(0)).id, 'k1a');
  // příběh jde hned od začátku, náhodné události až od úrovně EV_LEVEL
  const h = farm(1, 1), am = day0 + 11.5 * H;
  assert.equal(eventNow(h, am).id, 'k1a');
  play(h, 0, undefined, am);
  assert.equal(eventNow(h, evening(0)), null, 'pod úrovní 3 žádná náhodná událost');
  assert.ok(EV_LEVEL > 1);
});

test('příběh: volby se pamatují – příznaky, vztahy, podmíněné odpovědi a věty', () => {
  const f = farm(3);
  const k1c = STORY_BY.k1c, deda = k1c.a.findIndex(a => a.if === 'matous'), hed = k1c.a.findIndex(a => a.need && a.need.hedvika);
  play(f, 0, STORY_BY.k1a.a.findIndex(a => a.set === 'kronika'));   // čte kroniku
  assert.ok(f.story.f.includes('kronika'));
  assert.ok(!answerShown(f, k1c, k1c.a[deda]), 'děda jen s příznakem matous');
  const r = play(f, 1, STORY_BY.k1b.a.findIndex(a => a.rel && a.rel.hedvika > 0 && !a.use));
  assert.deepEqual(r.rel, { hedvika: 1 });
  assert.equal(f.story.r.hedvika, 1);
  assert.ok(answerShown(f, k1c, k1c.a[hed]), 'Hedvika pomůže, když jsi jí pomohl');
  assert.ok(storyText(f, k1c).includes('V kronice stálo'), 'věta podle přečtené kroniky');
  const ev = eventNow(f, evening(2));
  assert.equal(applyAction(f, { type: 'eventAnswer', slot: ev.slot, id: ev.id, i: deda }, evening(2)).error, 'locked');
  assert.ok(applyAction(f, { type: 'eventAnswer', slot: ev.slot, id: ev.id, i: hed }, evening(2)).ok);
  assert.equal(f.story.r.hedvika, 2);
  assert.deepEqual(f.story.log.map(x => x[0]), ['k1a', 'k1b', 'k1c']);
  assert.ok(storyCond(f, { need: { hedvika: 2 } }) && !storyCond(f, { need: { hedvika: 3 } }));
});

test('příběh: konec kapitoly dá mince (+ bonus za přátelství), XP a vzácnou ozdobu zdarma', () => {
  const f = farm(3);
  f.story.r = { hedvika: 3, obec: 1, krystof: -2 };   // 4 body přátelství = +20 %
  const rw = chapterReward(f, CHAPTERS[0]);
  assert.equal(rw.bonus, 20);
  assert.equal(rw.coins, 180);
  for (let d = 0; d < 3; d++) play(f, d);
  const coins = f.coins;
  const r = play(f, 3);
  assert.equal(r.chapter.n, 1);
  assert.ok(f.coins >= coins + r.chapter.coins);
  assert.ok(f.pending.includes('studna'), 'Dědova studna čeká ve Stavět zdarma');
  // ozdobu nejde koupit, jen postavit zdarma (jednou)
  const g = farm(3); g.objects.find(o => o.kind === 'statek').lvl = 10;
  assert.equal(applyAction(g, { type: 'place', kind: 'studna', x: 0, y: 0 }, T0).error, 'statek_low');
  let x = 0; while (!fits(f, x, 0, 1, 1)) x++;
  const c2 = f.coins;
  assert.ok(applyAction(f, { type: 'place', kind: 'studna', x, y: 0 }, T0).ok);
  assert.equal(f.coins, c2);
  assert.ok(!f.pending.includes('studna'));
});

test('denní série: dny po sobě, vynechaný den = od 1, odměna roste, 7. den dvojnásobek, milníky dají ozdobu', () => {
  assert.deepEqual(dailyReward(1), { coins: 20, xp: 0, deco: null });
  assert.equal(dailyReward(7).coins, 100);
  assert.equal(dailyReward(7).deco, 'strasak');
  assert.ok(dailyReward(40).coins === 200 && dailyReward(42).coins === 400, 'strop 200, týden 400');
  for (const [n, id] of Object.entries(DAILY_DECO)) { assert.ok(BUILDINGS[id] && BUILDINGS[id].gift, id); assert.equal(dailyReward(+n).deco, id); }
  const f = farm(3);
  const t0 = Date.UTC(2026, 10, 10, 12);
  let r;
  for (let d = 0; d < 7; d++) r = applyAction(f, { type: 'claimDaily' }, t0 + d * DAY);
  assert.equal(r.streak, 7);
  assert.equal(r.deco, 'strasak');
  assert.ok(f.pending.includes('strasak'));
  r = applyAction(f, { type: 'claimDaily' }, t0 + 9 * DAY);
  assert.equal(r.streak, 1, 'vynechaný den = znovu od 1');
  for (let d = 10; d < 16; d++) r = applyAction(f, { type: 'claimDaily' }, t0 + d * DAY);
  assert.equal(r.streak, 7);
  assert.equal(r.deco, null, 'stejnou ozdobu podruhé nedostane');
  f.daily.streak = 13;
  r = applyAction(f, { type: 'claimDaily' }, t0 + 16 * DAY);
  assert.equal(r.streak, 14); assert.equal(r.deco, 'vozik');
  assert.equal(applyAction(f, { type: 'claimDaily' }, t0 + 16 * DAY + H).error, 'claimed');
});

test('vylepšení budov chce jen suroviny, které Statek už odemkl (žádné krmivo pro krávy bez Kravína)', () => {
  const f = farm(30, 1);
  f.sk = { f: 0, r: 0, v: 0 };
  for (let L = 1; L < 10; L++) {
    const st = f.objects.find(o => o.kind === 'statek'); st.lvl = L;
    for (const kind of ['statek', 'sklad', 'pekarna', 'krmivarna', 'mlyn', 'kurnik', 'stodola', 'prodejna']) {
      const o = kind === 'statek' ? st : { id: 999, kind, lvl: L };
      const c = upgradeCost(o, f);
      if (!c) continue;
      for (const x of c.items) {
        const it = CROPS[x.item] || RECIPES[x.item] || ANIMAL_LIST.find(a => a.product === x.item) || TREE_LIST.find(t => t.fruit === x.item);
        assert.ok(it && it.st <= L, `${kind} ${L}→${L + 1}: ${x.item} (Statek ${it && it.st})`);
        if (RECIPES[x.item]) assert.equal(RECIPES[x.item].cook, 1, `${kind}: ${x.item} jen ze základního receptu`);
      }
      assert.deepEqual(upgradeCost(o, f), c, 'cena je pořád stejná');
    }
  }
  // Krmivárna 2 → 3 nechce krmivo pro krávy (Kravín až od Statku 4)
  f.objects.find(o => o.kind === 'statek').lvl = 3;
  for (let L = 1; L <= 3; L++) assert.ok(!upgradeCost({ id: 1, kind: 'krmivarna', lvl: L }, f).items.some(x => x.item === 'krmivo_kravy'));
  assert.ok(ITEMS.krmivo_kravy && RECIPES.krmivo_kravy.st >= 4);
});
