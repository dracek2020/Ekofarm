// Pomocník testů v46: načte pravidla se VŠEMI skupinami rozšíření vypnutými (jako by v46 neexistovala)
// a podle režimu z argumentu vrátí na stdout JSON:
//   snapshot          → obsah (recepty, ceny, plodiny, budovy) ve stejném tvaru jako fixtures/v45-obsah.json
//   farm <ms>         → přečte farmu ze stdin, normalize + běžné akce (sebrat, prodat) v čase <ms>, vrátí farmu
import { readFileSync } from 'node:fs';
globalThis.EKO_FLAGS = new Proxy({}, { has: () => true, get: () => false });   // všechny skupiny (i budoucí) vypnuté
const R = await import('../../public/js/rules.js');
const mode = process.argv[2];
if (mode === 'snapshot') {
  const snap = { recipes: {}, prices: {}, crops: {}, buildings: {} };
  for (const r of Object.values(R.RECIPES)) snap.recipes[r.id] = { b: r.building, in: r.in, t: r.time, st: r.st, cook: r.cook, q: R.recipeQty(r), xp: r.xp };
  for (const it of R.ITEM_LIST) snap.prices[it.id] = it.price;
  for (const c of R.CROP_LIST) snap.crops[c.id] = { st: c.st, time: c.time, price: c.price, cost: c.cost };
  for (const b of R.BUILDING_LIST) snap.buildings[b.id] = { st: b.st, cost: b.cost };
  process.stdout.write(JSON.stringify(snap));
} else if (mode === 'farm') {
  const now = Number(process.argv[3]);
  const f = R.normalize(JSON.parse(readFileSync(0, 'utf8')));
  const res = [];
  for (const o of f.objects) if (R.BUILDINGS[o.kind].type === 'factory') res.push(R.applyAction(f, { type: 'collect', id: o.id }, now).error || 'ok');
  res.push(R.applyAction(f, { type: 'sell', item: 'wheat', qty: 1 }, now).error || 'ok');
  for (const id of Object.keys(f.silo)) if (!R.ITEMS[id]) res.push('neznámé ' + id);
  const { ECO_FLAGS } = await import('../../public/js/eco-config.js');
  process.stdout.write(JSON.stringify({ farm: f, res, flags: ECO_FLAGS }));
} else if (mode === 'v48') {
  // v48 vypnuté: tým a hráč sdílí jednu frontu výrobny a tým odnáší i ruční dávky (jako do v47); planSave neexistuje
  const { TEAM } = await import('../../public/js/team-config.js');
  const T0 = 1_800_000_000_000, f = R.newFarm(T0);
  f.objects.find(o => o.kind === 'statek').lvl = 10; f.level = 40; f.coins = 1e6; f.siloCap = 5000; f.silo.wheat = 300;
  let o = null;
  for (let y = 0; y < 17 && !o; y++) for (let x = 0; x < 17 && !o; x++) if (R.fits(f, x, y, 3, 3)) { const r = R.applyAction(f, { type: 'place', kind: 'pekarna', x, y }, T0); if (r.ok) o = R.findObject(f, r.id); }
  const v = { id: f.nextId++, prof: 'vyroba', trait: null, xp: { vyroba: TEAM.xpLvl[6] }, hist: [], at: 0, area: null, t: T0, n: 0 };
  f.vill.push(v); R.applyAction(f, { type: 'assignVill', id: v.id, at: o.id }, T0);
  const planSave = R.applyAction(f, { type: 'planSave', id: o.id, pv: 0, plan: { chleb: 100 }, target: [] }, T0).error || 'ok';
  R.applyAction(f, { type: 'plan', w: 'b' + o.id, key: 'chleb', pct: 100 }, T0);
  R.applyAction(f, { type: 'produce', id: o.id, recipe: 'chleb' }, T0);
  for (let i = 0; i < 50; i++) R.applyAction(f, { type: 'tick' }, T0 + 2000);
  const fourth = (() => { for (let i = 0; i < 3; i++) { const r = R.applyAction(f, { type: 'produce', id: o.id, recipe: 'chleb' }, T0 + 2000); if (!r.ok) return r.error; } return 'ok'; })();
  for (let i = 0; i < 400; i++) R.applyAction(f, { type: 'tick' }, T0 + 3 * 3600_000);
  const manualLeft = o.queue.filter(q => !q.t && q.end <= T0 + 3 * 3600_000).length;
  process.stdout.write(JSON.stringify({ flag: ECO_FLAGS_V48(), fourth, manualLeft, planSave }));
}
function ECO_FLAGS_V48() { return !!R.BUI_V2; }
