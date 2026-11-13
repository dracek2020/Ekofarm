// Pomocník testů v46: načte pravidla se VŠEMI skupinami rozšíření vypnutými (jako by v46 neexistovala)
// a podle režimu z argumentu vrátí na stdout JSON:
//   snapshot          → obsah (recepty, ceny, plodiny, budovy) ve stejném tvaru jako fixtures/v45-obsah.json
//   farm <ms>         → přečte farmu ze stdin, normalize + běžné akce (sebrat, prodat) v čase <ms>, vrátí farmu
import { readFileSync } from 'node:fs';
globalThis.EKO_FLAGS = { eco_recipes: false, eco_planner: false, eco_byproducts: false, eco_straw: false, eco_crops: false, eco_mastery: false };
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
}
