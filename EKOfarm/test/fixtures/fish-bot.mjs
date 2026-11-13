// Pomocník testů a simulace rybaření (v47): serverový kontext s vlastním generátorem a „hráč“, který klepe podle polohy
// šipky a zelené zóny. skill 1 = pozorný hráč, 0,5 = méně přesný, 0 = klepe náhodně. Výsledek = čísla kroků s klepnutím.
import { FIGHT } from '../../public/js/eco-config.js';
export function srv(seed = 7) {
  let s = seed >>> 0 || 1;
  return { rand: () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; } };
}
export function botTaps(R, P, skill = 1, seed = 3) {
  const st = R.fightNew(), taps = [];
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
  const react = Math.round(FIGHT.hz * (0.05 + 0.25 * (1 - skill)));   // zpoždění reakce (kroky)
  const minGap = Math.max(FIGHT.gap, Math.round(FIGHT.hz / (4 + 6 * skill)));   // člověk klepne nejvýš 4–10× za sekundu
  while (!st.res) {
    const look = Math.max(0, st.i - react);
    const target = R.zoneAt(P, look + 6);
    const guess = st.x + (st.v - FIGHT.drift) * 0.2 + (rnd() - 0.5) * 0.2 * (1 - skill);
    const tap = skill <= 0 ? rnd() < 0.08 : guess < target - P.width * 0.15 && rnd() < 0.55 + 0.45 * skill;
    if (tap && st.i - st.last >= minGap) taps.push(st.i);
    R.fightStep(st, P, tap && st.i - st.last >= minGap);
  }
  return { taps, res: st.res, steps: st.i };
}
// jeden celý nához jako na serveru: nahodit, „zahrát“ minihru, vylovit v čase, kdy by to stihl skutečný hráč
export function fishOnce(R, f, id, t, { win = true, bait, skill = 1, S = srv(t % 100000 + 1), k = 'k' + t } = {}) {
  const c = R.applyAction(f, { type: 'fishCast', id, k, bait }, t, null, S);
  if (!c.ok) return { cast: c };
  const o = R.findObject(f, id), P = R.fightParams(f, o.hook);
  const b = win ? botTaps(R, P, skill, t % 9973 + 1) : { taps: [], steps: P.max };
  const t2 = t + Math.max(0, R.fightMinMs(o.hook, b.steps)) + FIGHT.slack + 50;
  const land = R.applyAction(f, { type: 'fishLand', id, k, taps: b.taps }, t2, null, S);
  return { cast: c, land, t: t2, bot: b };
}
