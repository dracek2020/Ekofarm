// Kontrola uložených farem proti aktuálním pravidlům – nic se nesmí ztratit (v49).
//   npx wrangler d1 execute ekofarm --remote --json --command "SELECT user_id, state FROM farms" > farms.json
//   node tools/farm-check.mjs farms.json
// Pro každou farmu: 1) všechna ID (budovy, předměty, osivo, plodiny, stroje, recepty ve frontách, stromy) existují,
// 2) normalize() nic neubere (budovy a jejich úrovně, políčka, plodiny na nich, stromy, zvířata, stroje, pracovníci,
// sklad, osivo, mince, úroveň, XP, dovednosti, Městečko, pozemky, fronty výroben), 3) dopočet týmu do „teď“
// nesmaže budovy, políčka ani pracovníky, nesníží úroveň/XP a sklad nejde pod nulu. Jména hráčů se nevypisují.
import { readFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';

const src = JSON.parse(readFileSync(process.argv[2] || 'farms.json', 'utf8'));
const rows = Array.isArray(src) && src[0] && src[0].results ? src[0].results : src;   // výstup wrangleru nebo [{u, farm}]
const farms = rows.map(r => ({ u: r.u ?? r.user_id, farm: r.farm || (typeof r.state === 'string' ? JSON.parse(r.state) : r.state) }));
const now = Number(process.argv[3]) || Date.now();
const clone = x => JSON.parse(JSON.stringify(x));
const sum = o => Object.values(o || {}).reduce((n, x) => n + (Number(x) || 0), 0);

function snap(f) {
  const kinds = {}, lv = {}, q = {};
  for (const o of f.objects || []) {
    kinds[o.kind] = (kinds[o.kind] || 0) + 1;
    lv[o.id] = o.lvl || 1;
    for (const j of o.queue || []) q[j.r] = (q[j.r] || 0) + (j.n || 1);
  }
  return {
    kinds, lv, q,
    plots: (f.plots || []).length, crops: (f.plots || []).filter(p => p.crop).length,
    trees: (f.objects || []).filter(o => o.tree).length,
    animals: (f.objects || []).reduce((n, o) => n + (o.animals || []).length, 0),
    machines: (f.machines || []).length, vill: (f.vill || []).length,
    silo: { ...(f.silo || {}) }, seeds: { ...(f.seeds || {}) }, coins: f.coins, level: f.level, xp: f.xp,
    sk: { ...(f.sk || {}) }, town: { ...(f.town || {}) }, land: [...(f.land || [])].sort().join(','),
  };
}
function lost(a, b, strict) {
  const out = [];
  const dec = (name, x, y) => { if ((y || 0) < (x || 0)) out.push(`${name}: ${x} → ${y || 0}`); };
  for (const k in a.kinds) dec('budov ' + k, a.kinds[k], b.kinds[k]);
  for (const id in a.lv) if (b.lv[id] !== undefined) dec('úroveň budovy #' + id, a.lv[id], b.lv[id]); else if (strict) out.push('budova #' + id + ' zmizela');
  for (const k of ['plots', 'trees', 'animals', 'machines', 'vill', 'level']) dec(k, a[k], b[k]);
  dec('xp', a.xp, b.xp);
  for (const k in a.town) dec('Městečko ' + k, a.town[k], b.town[k]);
  if (a.land !== b.land && a.land.split(',').some(x => x && !b.land.split(',').includes(x))) out.push(`pozemky: ${a.land} → ${b.land}`);
  if (strict) {
    dec('osázená políčka', a.crops, b.crops);
    dec('mince', a.coins, b.coins);
    for (const k in a.silo) dec('sklad ' + k, a.silo[k], (b.silo[k] || 0) + (b.seeds[k] || 0));
    for (const k in a.seeds) dec('osivo ' + k, a.seeds[k], b.seeds[k]);
    // dovednosti: rozhoduje úroveň (v44 jednou přepočítala XP na nové tempo – úroveň se tím nesnižuje pod odemčené věci)
    for (const k in a.sk) dec('úroveň dovednosti ' + k, R.skillLevel({ sk: a.sk }, k), R.skillLevel({ sk: b.sk }, k));
    for (const k in a.q) dec('fronta ' + k, a.q[k], b.q[k]);
  }
  return out;
}
function unknown(f) {
  const bad = [];
  for (const o of f.objects || []) {
    if (!R.BUILDINGS[o.kind]) bad.push('budova ' + o.kind);
    for (const j of o.queue || []) if (!R.RECIPES[j.r]) bad.push('recept ' + j.r);
    if (o.tree && !R.TREES[o.tree]) bad.push('strom ' + o.tree);
  }
  for (const id in f.silo || {}) if (!R.ITEMS[id]) bad.push('předmět ' + id);
  for (const id in f.seeds || {}) if (!R.ITEMS[id]) bad.push('osivo ' + id);
  for (const p of f.plots || []) if (p.crop && !R.CROPS[p.crop]) bad.push('plodina ' + p.crop);
  for (const m of f.machines || []) if (!R.MACHINES[m.model]) bad.push('stroj ' + m.model);
  return bad;
}
let problems = 0;
const lines = [];
for (const { u, farm } of farms) {
  const before = snap(farm), unk = unknown(farm);
  const n = R.normalize(clone(farm)), afterN = snap(n);
  const lostN = lost(before, afterN, true);
  const info = farm.skv !== 2 ? [`dovednosti se při příštím přihlášení přepočítají na tempo z v44 (XP ${JSON.stringify(before.sk)} → ${JSON.stringify(afterN.sk)}, úrovně stejné)`] : [];
  const t = clone(n);
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) { R.applyAction(t, { type: 'tick' }, now, { left: R.VILL_BUDGET }); if (!R.villLag(t, now)) break; }
  const ms = Math.round(performance.now() - t0);
  const afterT = snap(t), lostT = lost(afterN, afterT, false);
  const neg = Object.entries({ ...t.silo, ...t.seeds }).filter(([, x]) => x < 0).map(([k]) => k);
  const held = Object.keys(t.hold || {});
  const issues = [...unk.map(x => 'neznámé ID: ' + x), ...lostN.map(x => 'normalize: ' + x), ...lostT.map(x => 'dopočet: ' + x), ...neg.map(x => 'záporný sklad: ' + x), ...held.map(x => 'odloženo stranou: ' + x)];
  if (issues.length) problems++;
  lines.push(`hráč #${u}: úroveň ${before.level}, budov ${(farm.objects || []).length}, políček ${before.plots}, pracovníků ${before.vill}, sklad ${sum(before.silo)} ks, osivo ${sum(before.seeds)} ks, mince ${before.coins} · dopočet ${ms} ms · ${issues.length ? 'PROBLÉM: ' + issues.join('; ') : 'OK – nic se neztratilo'}${info.length ? ' · pozn.: ' + info.join('; ') : ''}`);
}
console.log(lines.join('\n'));
console.log(`\nFarem: ${farms.length}, s problémem: ${problems} (pravidla RULES_VERSION ${R.RULES_VERSION}, CLIENT_MIN ${R.CLIENT_MIN})`);
process.exit(problems ? 1 : 0);
