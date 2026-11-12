// EKOfarm – hlavní herní smyčka, ovládání a UI.
import {
  CROP_LIST, CROPS, ITEMS, BUILDINGS, ANIMALS, RECIPES, GRID_W, GRID_H, ERRORS, WORLD, landOwned, parcelAt, getParcel, LAND_PARCELS,
  applyAction, normalize, plotState, findPlot, findObject, objectAt, objectStatus, fits,
  siloUsed, levelProgress, maxPlots, plotPrice, have,
  TREES, TREE_LIST, FREE_PLOTS, treeState, maxOrchards, orchardPrice, countKind,
  MACHINES, MACHINE_LIST, CROP_CATS, runHelper, runVillagers, villName, findVill, wpGet, wpPlan, planKindW, planTotal, keepOf, villLag, VILL_BUDGET, helperActive, stallOffers, stallLeft, sellPrice, freeMachine, fieldState, objSize, FIELD_MIN, FIELD_MAX, FIELD_CELL_PRICE, maxBigFields,
  TOWN, TOWN_HOUSES, townAt, townObject, statekLevel, marketMaxPrice, marketBase, FISH, TUTORIAL_DONE, weatherAt, nextWeather, fmtKg, fishSize, farmAlerts,
  bestOwned, eventNow, EVENTS_BY, fxActive, helpUsed, DOG, stOk, EV_LEVEL, SKILLS, skillLevel,
} from './rules.js?v=38';
import { preloadAssets, spriteName } from './sprites.js?v=38';
import { drawScene, screenToCell, cellCenter, fmtTime, groundInfo } from './render.js?v=38';
import { createBackend, ApiError, APP_VERSION } from './api.js?v=38';
import { iconize, ic } from './icons.js?v=38';
import { NEWS } from './news.js?v=38';
import { sfx, soundOn, setSound } from './sfx.js?v=38';
import { TEAM } from './team-config.js?v=38';
import { plotHtml, skillsHtml, skillUnlocks, eventHtml, weeklyHtml, pondHtml, hiveHtml, helpHtml, teamHtml, boardHtml, houseHtml, bedsText, GUIDE, guideStep, centerHtml, marketHtml, claimableQuests, garageHtml, stallHtml, newsHtml, landHtml, tasksHtml, canClaimDaily, claimableAch, shopHtml, buildHtml, statekHtml, orchardHtml, dealerHtml, bigfieldHtml, factoryHtml, penHtml, decoHtml, siloHtml, siloTitle, bImg, wikiHtml, itemHtml } from './panels.js?v=38';

const $ = id => document.getElementById(id);


const game = {
  backend: createBackend(),
  name: '',
  farm: null,
  offset: 0,          // serverový čas − lokální čas
  queue: [],          // akce čekající na odeslání
  inflight: null,     // akce právě na cestě
  cam: { x: 0, y: 0, zoom: 1 },
  place: null,        // { kind: 'plot' | id budovy, moveId?, x, y }
  sowCrop: null,
  panel: null,        // { kind: 'shop', tab } | { kind: 'obj', id } | { kind: 'silo' }
  lastTab: 'zvirata',
  google: false,      // je farma propojená s Google účtem
  bubble: null,
  floats: [],
  hover: null,
  visit: null,       // návštěva cizí farmy { name, farm, back }
  market: null,      // data tržiště ze serveru
  mform: {},         // rozpracovaná nabídka na tržiště
};
const now = () => Date.now() + game.offset;
window.__eko = game; // pro testy a ladění
window.__ekoPanel = p => openPanel(p);   // v36: pro testy – otevře okno (např. { kind: 'town', t: 'prodejna', tab: 'udice' })
game.ground = groundInfo;

// ---------- canvas ----------
const canvas = $('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);   // víc než 2× na telefonu není vidět, jen to zpomaluje
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize);
resize();

function centerCamera() {
  const [x, y] = cellCenter(9, 8);
  game.cam.x = x; game.cam.y = y;
  game.cam.zoom = W < 700 ? 1.2 : 1.3;
}

function clampCam() {
  const c = game.cam;
  if (!(c.zoom > 0) || !isFinite(c.x) || !isFinite(c.y)) { const [x, y] = cellCenter(9, 8); c.x = x; c.y = y; c.zoom = 1; }   // nesmyslná kamera → zpět na farmu
  c.zoom = Math.max(0.4, Math.min(2.4, c.zoom));
  const [lx] = cellCenter(WORLD.x0, TOWN.y1 - 6), [rx] = cellCenter(TOWN.x1 - 6, WORLD.y0);
  const [, ty] = cellCenter(WORLD.x0, WORLD.y0), [, by] = cellCenter(TOWN.x1, TOWN.y1);
  c.x = Math.max(lx, Math.min(rx, c.x));
  c.y = Math.max(ty - 60, Math.min(by, c.y));
}

const sizeOf = kind => (kind === 'plot' ? { w: 1, h: 1 } : BUILDINGS[kind]);
const placeSize = () => ({ w: game.place.w, h: game.place.h });

function ghostView() {
  const p = game.place;
  if (!p) return null;
  const s = placeSize();
  const same = p.movePlot && p.movePlot[0] === p.x && p.movePlot[1] === p.y;
  return { kind: p.kind, x: p.x, y: p.y, w: s.w, h: s.h, moveId: p.moveId, movePlot: p.movePlot, ok: same || fits(game.farm, p.x, p.y, s.w, s.h, p.moveId || 0) };
}

// když telefon nestíhá, kreslí se 30× za sekundu místo 60× (šetří baterii)
const perf = game.perf = { avg: 16, slow: false, last: 0 };
function frame(t) {
  requestAnimationFrame(frame);
  const gap = t - perf.last;
  if (gap < (perf.slow ? 30 : 14)) return;   // nejvýš 60 snímků/s i na 120Hz displejích
  perf.last = t;
  if (game.farm && !document.hidden) {
    const t0 = performance.now();
    const d = new Date();
    game.hour = game.dayNight === false ? undefined : d.getHours() + d.getMinutes() / 60;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (game.bubble && t > game.bubble.until) game.bubble = null;
    game.floats = game.floats.filter(f => t - f.t0 < 1300);
    const dt = Math.min(0.1, (t - (game.lastT || t)) / 1000);
    game.lastT = t;
    const people = game.visit ? [] : [stepWalker(game.farmer, dt, t, 'farmar')];
    if (!game.visit && helperActive(game.farm, now())) people.push(stepWalker(game.helperW, dt, t, 'pomocnik'));
    if (!game.visit && game.farm.dog) people.push(stepDog(dt, t));   // v36: pes chodí s farmářem
    try {
      drawScene(ctx, {
        farm: game.visit ? game.visit.farm : game.farm, now: now(), t, cam: game.cam, W, H, dpr: DPR,
        ghost: game.visit ? null : ghostView(), hoverCell: game.hover, bubble: game.bubble, floats: game.floats, hour: game.hour, people, weather: weatherAt(now()).id, debug: game.debug,
      });
    } catch (e) {                               // chyba v kreslení nesmí hru zastavit; ukáže se dole, ať jde poslat
      for (let i = 0; i < 24; i++) ctx.restore();
      if (!perf.err && window.showError) window.showError('kreslení: ' + (e && e.message));
      perf.err = (perf.err || 0) + 1;
    }
    perf.avg = perf.avg * 0.95 + (performance.now() - t0) * 0.05;
    if (!perf.slow && perf.avg > 14) perf.slow = true;
    else if (perf.slow && perf.avg < 6) perf.slow = false;
  }
}

// ---------- farmář a pomocník (chodí tam, kde se pracuje) ----------
function homeSpot() {
  const st = game.farm && game.farm.objects.find(o => o.kind === 'statek');
  return st ? [st.x + 1.5, st.y + 3.3] : [8, 10];
}
game.farmer = { pos: null, targets: [], work: 0 };
game.helperW = { pos: null, targets: [], work: 0, off: [0.6, 0.4] };
function sendWalker(w, gx, gy) {
  w.targets.push([gx + 0.5, gy + 0.5]);
  if (w.targets.length > 6) w.targets.splice(0, w.targets.length - 6);
}
function stepWalker(w, dt, t, who) {
  if (!w.pos) { const [hx, hy] = homeSpot(); w.pos = [hx + (w.off ? w.off[0] : 0), hy + (w.off ? w.off[1] : 0)]; }
  let walking = false;
  if (t < w.work) { /* pracuje na místě */ }
  else if (w.targets.length) {
    const [tx, ty] = w.targets[0];
    const dx = tx - w.pos[0], dy = ty - w.pos[1], dist = Math.hypot(dx, dy);
    const sp = 5 * dt;
    if (dist <= sp) { w.pos = [tx, ty]; w.targets.shift(); w.work = t + 450; }
    else { w.pos = [w.pos[0] + dx / dist * sp, w.pos[1] + dy / dist * sp]; walking = true; w.dir = dx - dy >= 0 ? 1 : -1; }
  } else if (t > w.work + 6000) {                     // po chvíli nečinnosti se vrátí ke statku
    const [hx, hy] = homeSpot();
    if (Math.hypot(hx - w.pos[0], hy - w.pos[1]) > 0.3) w.targets.push([hx + (w.off ? w.off[0] : 0), hy + (w.off ? w.off[1] : 0)]);
    w.work = t;
  }
  return { gx: w.pos[0], gy: w.pos[1], who, dir: w.dir || -1, walking, work: t < w.work };
}
// v36: pes – drží se u farmáře, občas si odběhne očichat okolí
game.dogW = { pos: null, tgt: null, next: 0, dir: -1 };
function stepDog(dt, t) {
  const d = game.dogW, fp = game.farmer.pos || homeSpot();
  if (!d.pos) d.pos = [fp[0] + 0.7, fp[1] + 0.3];
  if (!d.tgt || t > d.next) {
    const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 0.9;
    d.tgt = [fp[0] + Math.cos(a) * r, fp[1] + Math.sin(a) * r]; d.next = t + 2500 + Math.random() * 5000;
  }
  if (Math.hypot(fp[0] - d.pos[0], fp[1] - d.pos[1]) > 2) d.tgt = [fp[0] + 0.6, fp[1] + 0.4];
  const dx = d.tgt[0] - d.pos[0], dy = d.tgt[1] - d.pos[1], dist = Math.hypot(dx, dy), sp = 6 * dt;
  let walking = false;
  if (dist > 0.05) { const k = Math.min(1, sp / dist); d.pos = [d.pos[0] + dx * k, d.pos[1] + dy * k]; walking = true; d.dir = dx - dy >= 0 ? 1 : -1; }
  return { gx: d.pos[0], gy: d.pos[1], who: 'pes', dir: d.dir, walking, work: false };
}
// práce pomocníka a vesničanů se dopočítává průběžně
setInterval(() => {
  if (!game.farm || game.visit) return;
  let changed = false;
  if (game.farm.helper) {
    const touched = runHelper(game.farm, now());
    if (touched.length) { for (const [x, y] of touched.slice(-4)) sendWalker(game.helperW, x, y); changed = true; }
  }
  if (villStep()) changed = true;
  if (changed) updateHud(panelBusy());
}, 1000);
// jeden krok práce vesničanů v prohlížeči; vrací true, když se na farmě něco změnilo
function villStep() {
  const f = game.farm;
  if (!f || game.visit || !f.vill || !f.vill.length) { $('catchUp').hidden = true; return false; }
  const r = runVillagers(f, now(), game.lim);
  villShow();
  if (r.behind) villTick();            // dlouhá nepřítomnost: dohání se po dávkách spolu se serverem
  updateCatchUp();
  return r.n > 0;
}
// Kolik úkonů vesničanů smí prohlížeč dopočítat sám, než se srovná se serverem (ten má na jeden požadavek stejný rozpočet).
// did = co vesničané právě dokončili (čísla nad políčky, zpráva o trhu)
game.lim = { left: VILL_BUDGET, did: [] };
function villShow() { for (const d of game.lim.did.splice(0, 40)) villDid(d); }
// požádá server o další dávku práce vesničanů (jen když se nic jiného neposílá)
function villTick() {
  if (game.queue.length || game.inflight) return;
  game.queue.push({ type: 'tick' });
  scheduleFlush(30);
}
// co vesničan právě dokončil: číslo nad políčkem / budovou, u obchodníka zpráva o trhu
function villDid(d) {
  const f = game.farm;
  if (d.k === 'trade') {
    const v = findVill(f, d.v);
    toast(`:market: ${v ? villName(v) : 'Obchodník'} prodal na trhu ${v && v.last ? v.last.n : ''} ks: +${d.coins} :coin:`, 'lvlup', 3000);
    sfx('coin');
    return;
  }
  if (!d.g || !d.g.items) return;
  const c = typeof d.key === 'string' ? f.plots.find(p => p.id === d.id) || findObject(f, d.id) : findObject(f, d.key);
  if (!c) return;
  const sz = c.kind ? objSize(c) : { w: 1, h: 1 };
  floatAt(c.x + (sz.w - 1) / 2, c.y + (sz.h - 1) / 2, d.g.items.map(i => `+${i.qty}:${ITEMS[i.item].icon}:`).join(' '));
}
// proužek „vesničané dohánějí práci“ – po návratu do hry, dokud není dopočítaná nepřítomnost
function updateCatchUp() {
  const lag = game.farm && !game.visit ? villLag(game.farm, now()) : 0, el = $('catchUp');
  el.hidden = lag < 90_000 || !$('banner').hidden || !$('tut').hidden;
  if (!el.hidden) el.innerHTML = iconize(`:helper: Vesničané dohánějí práci – zbývá ${fmtTime(Math.ceil(lag / 1000))}`);
}

// ---------- akce ----------
const SFX_OF = {
  upgrade: 'level', sellMachine: 'coin', stallBuy: 'coin', stallSell: 'coin', hire: 'build',
  harvest: 'harvest', harvestTree: 'harvest', harvestAll: 'harvest', collect: 'harvest', fieldUnload: 'harvest', feed: 'plant',
  plant: 'plant', sowAll: 'plant', plantTree: 'plant', clearTree: 'build', move: 'build', movePlot: 'build',
  sell: 'coin', deliver: 'coin', claimDaily: 'coin', claimAch: 'coin', upgradeSilo: 'coin',
  place: 'build', buyPlot: 'build', buyLand: 'level', move: 'build', buyAnimal: 'build',
  fieldSow: 'engine', fieldHarvest: 'engine', fieldPlow: 'engine', fieldBale: 'engine', buyMachine: 'engine',
  fishCast: 'plant', fishLand: 'harvest', claimQuest: 'coin', tutorial: 'tap',
};
function act(a, silent) {
  const r = applyAction(game.farm, a, now(), game.lim);
  villShow();
  if (!r.ok) { if (!silent) { toast(ERRORS[r.error] || 'To teď nejde.'); sfx('error'); } return r; }
  sfx(r.gained && r.gained.levelUp ? 'level' : SFX_OF[a.type] || 'tap');
  game.queue.push(a);
  if (a.x !== undefined && a.y !== undefined && ['harvest', 'plant', 'buyPlot'].includes(a.type)) sendWalker(game.farmer, a.x, a.y);
  else if (a.id && ['fishCast', 'collect', 'feed', 'produce', 'harvestTree', 'plantTree', 'clearTree', 'fieldUnload', 'upgrade'].includes(a.type)) {
    const o = findObject(game.farm, a.id);
    if (o) { const d = objSize(o); sendWalker(game.farmer, o.x + Math.floor(d.w / 2), o.y + d.h); }
  }
  afterChange(a, r);
  scheduleFlush();
  return r;
}

function floatAt(x, y, text) { game.floats.push({ gx: x, gy: y, text, t0: performance.now() }); }

function afterChange(a, r) {
  const g = r.gained;
  if (g) {
    let at = [a.x, a.y];
    if (a.id || r.id) {
      const o = findObject(game.farm, a.id || r.id);
      if (o) { const d = objSize(o); at = [o.x + (d.w - 1) / 2, o.y + (d.h - 1) / 2]; }
    }
    const parts = g.items.map(i => `+${i.qty}:${ITEMS[i.item].icon}:`);
    if (g.xp) parts.push(`+${g.xp}:xp:`);
    if (parts.length) floatAt(at[0], at[1], parts.join(' '));
  }
  if (a.type === 'plant') floatAt(a.x, a.y, r.seed ? `−1 :s_${a.crop}:` : `−${CROPS[a.crop].cost} :coin:`);
  updateHud();
}

let flushTimer = null;
function scheduleFlush(delay = 350) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, delay);
}

// v38: server chce novější verzi hry → jednou se stránka sama znovu načte (bez mezipaměti); když to nepomůže, ukáže se hláška
function reloadApp() {
  let last = 0;
  try { last = Number(sessionStorage.getItem('ekofarm_reload')) || 0; sessionStorage.setItem('ekofarm_reload', String(Date.now())); } catch { /* nevadí */ }
  if (Date.now() - last < 60_000) { toast('Je tu nová verze hry. Zavři ji úplně a otevři znovu.', '', 6000); return false; }
  location.replace(location.pathname + '?u=' + Date.now());
  return true;
}
async function flush() {
  if (game.inflight || !game.queue.length) return;
  game.inflight = game.queue.splice(0, 50);
  try {
    const res = await game.backend.send(game.inflight);
    game.inflight = null;
    applyServer(res);
    const bad = res.results.find(r => !r.ok);
    if (bad) toast(ERRORS[bad.error] || 'Něco se nepovedlo, farma se srovnala se serverem.');
  } catch (e) {
    const sent = game.inflight; game.inflight = null;
    if (e instanceof ApiError && e.status === 401) { showLogin(); return; }
    if (e instanceof ApiError && e.code === 'old_client') { game.queue = sent.concat(game.queue); reloadApp(); return; }
    if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409) { toast(e.message); await refresh(); return; }
    game.queue = sent.concat(game.queue);
    toast(e.message + ' Zkouším znovu…');
    scheduleFlush(3000);
    return;
  }
  if (game.queue.length) scheduleFlush(50);
}

// stav ze serveru + znovu použít akce, které se ještě neodeslaly
function applyServer(res) {
  game.offset = res.now - Date.now();
  game.farm = normalize(res.farm);
  game.lim = { left: VILL_BUDGET, did: [] };
  for (const a of game.queue) applyAction(game.farm, a, now(), game.lim);
  if (villLag(game.farm, now()) > 3000) villStep();   // ještě se dohání nepřítomnost → hned další dávka, nečekat na vteřinový krok
  updateHud();
  if (res.sales && res.sales.length) {
    const sum = res.sales.reduce((n, s) => n + s.coins, 0);
    const names = [...new Set(res.sales.map(s => s.buyer_name))].join(', ');
    toast(`:market: Na tržišti se prodalo ${res.sales.length}× zboží: +${sum} :coin:<br><small>koupil: ${names}</small>`, 'lvlup', 3500);
    sfx('coin');
    if (game.panel && game.panel.kind === 'town' && game.panel.t === 'trziste') loadMarket();
  }
}

// počká, až se odešlou všechny akce (před obchodem na tržišti)
async function flushAll() {
  clearTimeout(flushTimer); flushTimer = null;
  for (let i = 0; i < 20 && (game.queue.length || game.inflight); i++) {
    if (game.inflight) await new Promise(r => setTimeout(r, 150)); else await flush();
  }
}

async function refresh() {
  try {
    const res = await game.backend.start();
    if (res && !game.inflight && !game.queue.length) applyServer(res);
  } catch { /* zkusíme příště */ }
}

// ---------- ovládání ----------
const pointers = new Map();
let gesture = null;

function inGhost(cell) {
  const p = game.place;
  if (!p) return false;
  const s = placeSize();
  return cell[0] >= p.x && cell[0] < p.x + s.w && cell[1] >= p.y && cell[1] < p.y + s.h;
}

function setGhost(x, y) {
  const s = placeSize();
  game.place.x = Math.max(WORLD.x0, Math.min(WORLD.x1 - s.w, x));
  game.place.y = Math.max(WORLD.y0, Math.min(WORLD.y1 - s.h, y));
}

canvas.addEventListener('pointerdown', e => {
  if (!game.farm) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  closeSheets();
  if (pointers.size === 2) { startPinch(); return; }
  if (pointers.size > 2) return;
  const cell = screenToCell(e.clientX, e.clientY, game.cam, W, H);
  gesture = { mode: 'pending', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, cell, last: cell.join() };
  if (game.visit) return;
  if (game.place) {
    if (inGhost(cell)) { gesture.mode = 'ghost'; gesture.off = [cell[0] - game.place.x, cell[1] - game.place.y]; }
    return;
  }
  const plot = findPlot(game.farm, cell[0], cell[1]);
  const st = plot && plotState(plot, now());
  const tree = readyTreeAt(cell);
  // podržení prstu na budově nebo poli = přesun (táhnutím rovnou posouvá)
  if ((plot || objectAt(game.farm, cell[0], cell[1])) && !(st && st.state === 'ready') && !tree && !(game.sowCrop && st && st.state === 'empty')) {
    gesture.hold = setTimeout(() => holdMove(cell), 450);
  }
  if (st && st.state === 'ready') {
    gesture.mode = 'harvest';
    act({ type: 'harvest', x: cell[0], y: cell[1] });
    game.hover = cell;
  } else if (tree) {
    gesture.mode = 'harvest';
    act({ type: 'harvestTree', id: tree.id });
    game.hover = cell;
  } else if (game.sowCrop && st && st.state === 'empty') {
    gesture.mode = 'sow';
    act({ type: 'plant', x: cell[0], y: cell[1], crop: game.sowCrop });
    game.hover = cell;
  }
});

canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (gesture && gesture.mode === 'pinch') { movePinch(); return; }
  if (!gesture) return;
  if (gesture.mode === 'pending' && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 9) { gesture.mode = 'pan'; clearTimeout(gesture.hold); }
  if (gesture.mode === 'pan') {
    game.cam.x -= (e.clientX - gesture.lx) / game.cam.zoom;
    game.cam.y -= (e.clientY - gesture.ly) / game.cam.zoom;
    clampCam();
  } else if (gesture.mode === 'ghost') {
    const cell = screenToCell(e.clientX, e.clientY, game.cam, W, H);
    setGhost(cell[0] - gesture.off[0], cell[1] - gesture.off[1]);
  } else if (gesture.mode === 'harvest' || gesture.mode === 'sow') {
    const cell = screenToCell(e.clientX, e.clientY, game.cam, W, H);
    const key = cell.join();
    if (key !== gesture.last) {
      gesture.last = key;
      game.hover = cell;
      const plot = findPlot(game.farm, cell[0], cell[1]);
      const st = plot && plotState(plot, now());
      if (gesture.mode === 'harvest' && st && st.state === 'ready') {
        const r = act({ type: 'harvest', x: cell[0], y: cell[1] }, true);
        if (!r.ok && r.error === 'silo_full') toast(ERRORS.silo_full);
      }
      const tree = gesture.mode === 'harvest' && readyTreeAt(cell);
      if (tree) {
        const r = act({ type: 'harvestTree', id: tree.id }, true);
        if (!r.ok && r.error === 'silo_full') toast(ERRORS.silo_full);
      }
      if (gesture.mode === 'sow' && st && st.state === 'empty') {
        const r = act({ type: 'plant', x: cell[0], y: cell[1], crop: game.sowCrop }, true);
        if (!r.ok && r.error === 'no_coins') toast(ERRORS.no_coins);
      }
    }
  }
  gesture.lx = e.clientX; gesture.ly = e.clientY;
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture) clearTimeout(gesture.hold);
  if (gesture && gesture.mode === 'pinch') {
    if (pointers.size < 2) gesture = null;
    return;
  }
  if (gesture && gesture.mode === 'pending' && e.type === 'pointerup') onTap(gesture.cell);
  gesture = null;
  game.hover = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// podržení prstu: zvednout budovu nebo pole a táhnout (potvrzení ✓ v liště dole)
function holdMove(cell) {
  if (!gesture || gesture.mode !== 'pending' || game.place || game.visit || !game.farm) return;
  const o = objectAt(game.farm, cell[0], cell[1]);
  const plot = !o && findPlot(game.farm, cell[0], cell[1]);
  if (!o && !plot) return;
  if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* nevadí */ }
  if (o) startPlace(o.kind, o.id); else startPlace('plot', 0, [plot.x, plot.y]);
  gesture.mode = 'ghost';
  gesture.off = [cell[0] - game.place.x, cell[1] - game.place.y];
  sfx('tap');
}
function startPinch() {
  if (gesture) clearTimeout(gesture.hold);
  const [a, b] = [...pointers.values()];
  gesture = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  game.hover = null;
}
function movePinch() {
  const [a, b] = [...pointers.values()];
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  zoomAt(gesture.mx, gesture.my, d / gesture.d);
  game.cam.x -= (mx - gesture.mx) / game.cam.zoom;
  game.cam.y -= (my - gesture.my) / game.cam.zoom;
  clampCam();
  gesture.d = d; gesture.mx = mx; gesture.my = my;
}
function zoomAt(sx, sy, factor) {
  if (!(factor > 0) || !isFinite(factor)) return;
  const c = game.cam;
  const wx = (sx - W / 2) / c.zoom + c.x, wy = (sy - H / 2) / c.zoom + c.y;
  c.zoom = Math.max(0.4, Math.min(2.4, c.zoom * factor));
  c.x = wx - (sx - W / 2) / c.zoom;
  c.y = wy - (sy - H / 2) / c.zoom;
  clampCam();
}
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

function onTap([gx, gy]) {
  if (game.visit) return;
  const tb = townAt(gx, gy);
  if (tb && !game.place) { setSow(null); openPanel({ kind: 'town', t: tb.kind, tab: 'koupit' }); if (tb.kind === 'trziste') loadMarket(); return; }
  // v29: klepnutí na domek v Městečku, odkud se někdo ozval → nástěnka
  const hi = TOWN_HOUSES.findIndex(h => gx >= h[0] && gx < h[0] + 2 && gy >= h[1] && gy < h[1] + 2);
  if (hi >= 0 && !game.place && game.farm.board.ads.some(ad => ad.self && ad.house === hi)) { openPanel({ kind: 'town', t: 'nastenka' }); return; }
  if (game.place) {
    const s = placeSize();
    setGhost(gx - Math.floor((s.w - 1) / 2), gy - Math.floor((s.h - 1) / 2));
    return;
  }
  const o = objectAt(game.farm, gx, gy);
  if (o) { tapObject(o); return; }
  if (!landOwned(game.farm, gx, gy)) {
    const p = parcelAt(gx, gy);
    setSow(null);
    if (p) openPanel({ kind: 'land', sel: p.id });
    return;
  }
  const plot = findPlot(game.farm, gx, gy);
  if (!plot) { setSow(null); return; }
  const st = plotState(plot, now());
  if (st.state === 'empty') openPicker(plot);
  else if (st.state === 'growing') {
    if (game.bubble && game.bubble.gx === gx && game.bubble.gy === gy && performance.now() < game.bubble.until) { game.bubble = null; openPanel({ kind: 'plot', x: gx, y: gy }); }   // v38: druhé klepnutí
    else game.bubble = { gx, gy, until: performance.now() + 2500 };
  }
}

function readyTreeAt([gx, gy]) {
  const o = objectAt(game.farm, gx, gy);
  return o && o.kind === 'sad' && treeState(o, now()).state === 'ready' ? o : null;
}

// klepnutí na budovu: vybrat hotové / nakrmit, jinak otevřít panel
function tapObject(o) {
  setSow(null);
  const d = BUILDINGS[o.kind];
  if (d.type === 'orchard') {
    const st = treeState(o, now()).state;
    if (st === 'dead') { if (act({ type: 'clearTree', id: o.id }).ok) floatAt(o.x, o.y, ':axe: vykopáno'); return; }
    if (st === 'growing') { openPanel({ kind: 'obj', id: o.id }); return; }
    if (st === 'empty') { openPanel({ kind: 'obj', id: o.id }); return; }
  }
  if (d.type === 'storage') { openPanel({ kind: 'silo' }); return; }
  if (d.type === 'pond') { openPanel({ kind: 'obj', id: o.id }); return; }
  if (d.type === 'bigfield') {
    if (fieldState(o, now()).state === 'unload') {
      const r = act({ type: 'fieldUnload', id: o.id });
      if (r.ok && r.rest) toast(`${ERRORS.silo_full}<br><small>Na poli zbývá ${r.rest} kusů.</small>`);
    } else openPanel({ kind: 'obj', id: o.id });
    return;
  }
  if (d.type === 'main') { openPanel({ kind: 'obj', id: o.id, tab: 'zakazky' }); return; }
  if (['garage', 'dealer', 'stall'].includes(d.type)) { openPanel({ kind: 'obj', id: o.id }); return; }
  const st = objectStatus(o, now(), game.farm);
  let did = false;
  if (st.done) did = act({ type: 'collect', id: o.id }).ok;
  if (d.type === 'pen') {
    const an = ANIMALS[d.animal];
    const after = objectStatus(o, now());
    if (after.hungry && have(game.farm, an.feed) > 0) {
      const r = act({ type: 'feed', id: o.id }, true);
      if (r.ok) { floatAt(o.x + (d.w - 1) / 2, o.y + (d.h - 1) / 2, `−${r.fed}:${ITEMS[an.feed].icon}:`); did = true; }
    }
  }
  if (!did) openPanel({ kind: 'obj', id: o.id });
}

// ---------- stavění a přesun ----------
function nearestFree(s, cx, cy, moveId = 0) {
  let best = null, bd = Infinity;
  for (let y = WORLD.y0; y <= WORLD.y1 - s.h; y++) for (let x = WORLD.x0; x <= WORLD.x1 - s.w; x++) {
    if (!fits(game.farm, x, y, s.w, s.h, moveId)) continue;
    const dd = (x - cx) ** 2 + (y - cy) ** 2;
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  return best;
}

function startPlace(kind, moveId, movePlot) {
  closeSheets();
  setSow(null);
  let pos;
  const size = moveId ? objSize(findObject(game.farm, moveId)) : kind === 'velkepole' ? { w: 4, h: 4 } : sizeOf(kind);
  if (moveId) { const o = findObject(game.farm, moveId); pos = [o.x, o.y]; }
  else if (movePlot) pos = movePlot;
  else {
    const [cx, cy] = screenToCell(W / 2, H / 2, game.cam, W, H);
    pos = nearestFree(size, cx, cy) || [cx, cy];
  }
  game.place = { kind, moveId, movePlot, x: 0, y: 0, w: size.w, h: size.h };
  setGhost(pos[0], pos[1]);
  updateBanner();
}

function confirmPlace() {
  const p = game.place;
  if (!p) return;
  if (p.movePlot) {   // přesun malého pole
    const [x, y] = p.movePlot;
    if ((x !== p.x || y !== p.y) && !act({ type: 'movePlot', x, y, tx: p.x, ty: p.y }).ok) return;
    cancelPlace();
    return;
  }
  if (p.kind === 'plot') {
    const r = act({ type: 'buyPlot', x: p.x, y: p.y });
    if (!r.ok) return;
    floatAt(p.x, p.y, 'Nové pole!');
    if (game.farm.plots.length >= maxPlots(game.farm) || game.farm.plots.length === FREE_PLOTS) { cancelPlace(); startIntro(); return; }
    const next = nearestFree({ w: 1, h: 1 }, p.x + 1, p.y);
    if (next) setGhost(next[0], next[1]);
    updateBanner();
    return;
  }
  const r = p.moveId
    ? act({ type: 'move', id: p.moveId, x: p.x, y: p.y })
    : act(p.kind === 'velkepole' ? { type: 'place', kind: p.kind, x: p.x, y: p.y, w: p.w, h: p.h } : { type: 'place', kind: p.kind, x: p.x, y: p.y });
  if (!r.ok) return;
  if (!p.moveId && p.kind === 'sad' && countKind(game.farm, 'sad') < maxOrchards(game.farm) && game.farm.coins >= orchardPrice(game.farm)) {
    const next = nearestFree({ w: 1, h: 1 }, p.x + 1, p.y);
    if (next) { setGhost(next[0], next[1]); updateBanner(); return; }
  }
  if (!p.moveId) toast(`:${BUILDINGS[p.kind].icon}: ${BUILDINGS[p.kind].name} postaveno!`);
  cancelPlace();
  startIntro();
}

function cancelPlace() {
  game.place = null;
  updateBanner();
}

// ---------- UI ----------
const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');   // 12 345 (tenká mezera)
// otevřené okno → ztmavit mapu a schovat tlačítka na mapě (CSS body.sheet-open)
const SHEETS = [...document.querySelectorAll('.sheet')];
// spodní lišta: zeleně tlačítko otevřeného okna (bez okna Stavět jako hlavní akce)
const NAV = { build: 'buildBtn', shop: 'shopBtn', tasks: 'tasksBtn', silo: 'siloBtn2' };
function syncSheets() {
  const open = SHEETS.some(s => !s.hidden);
  document.body.classList.toggle('sheet-open', open);
  const on = !$('menuPanel').hidden ? 'menuBtn' : !$('panel').hidden && game.panel ? NAV[game.panel.kind] : open ? null : 'buildBtn';
  for (const id of ['buildBtn', 'shopBtn', 'tasksBtn', 'siloBtn2', 'menuBtn']) $(id).classList.toggle('on', id === on);
}
new MutationObserver(syncSheets).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
// okno nové úrovně: hvězda s číslem, paprsky, konfety a co se odemklo
// v38: úroveň hráče odemyká pozemky, psa, události a zásluhy Statku; stroje dovednosti (farmaření, rybaření), plodiny, stromy, zvířata a výrobky Statek
function showLevelUp(L, from) {
  const items = [];
  for (let l = from + 1; l <= L; l++) {
    if (l === EV_LEVEL) items.push(['bell', 'Události', '2× denně']);
    if (l === DOG.level) items.push(['pes', 'Farmářský pes', 'Obchod → Zvířata']);
    for (let k = 2; k <= 10; k++) if (TEAM.statek[k] && TEAM.statek[k].player === l) items.push(['house', `Statek ${k}`, 'můžeš vylepšit (zásluhy)']);
  }
  luShow(L, 'Nová úroveň!', 'ÚROVEŇ', items, items.length ? 'Nově můžeš:' : 'Plodiny, výrobky a budovy odemyká vylepšený :house: Statek, stroje a recepty tvoje dovednosti (klepni na úroveň).');
}
// v37: vylepšený Statek – co nového odemkl (budovy, plodiny, stromy, zvířata, ryby, výrobky)
function showStatekUp(L) {
  const items = [];
  for (const b of Object.values(BUILDINGS)) if (b.st === L && !b.town) items.push([b.icon, b.name, 'budova']);
  for (const c of CROP_LIST) if (c.st === L) items.push([c.icon, c.name, 'plodina']);
  for (const t of TREE_LIST) if (t.st === L) items.push([ITEMS[t.fruit].icon, t.name, 'strom']);
  for (const a of Object.values(ANIMALS)) if (a.st === L) items.push([a.icon, a.name, 'zvíře']);
  for (const fi of Object.values(FISH)) if (fi.st === L) items.push([fi.icon, fi.name, fi.fishLv > skillLevel(game.farm, 'r') ? `ryba · rybaření ${fi.fishLv}` : 'ryba']);
  for (const r of Object.values(RECIPES)) if (r.st === L && !r.id.startsWith('s_') && !r.id.startsWith('z_')) items.push([ITEMS[r.id].icon, ITEMS[r.id].name, r.cook > skillLevel(game.farm, 'v') ? `výrobek · vaření ${r.cook}` : 'výrobek']);
  luShow(L, 'Statek vylepšen!', 'STATEK', items, items.length ? 'Nově můžeš:' : '');
}
function luShow(L, title, label, items, sub) {
  $('luNum').textContent = L;
  $('luTitle').textContent = title;
  $('luLabel').textContent = label;
  $('luSub').innerHTML = iconize(sub);
  $('luList').innerHTML = iconize(items.slice(0, 12).map(([ic, n, k]) => `<div><span>:${ic}:</span><b>${n}</b><small>${k}</small></div>`).join('')
    + (items.length > 12 ? `<div class="more">+ dalších ${items.length - 12}</div>` : ''));
  const colors = ['#f5b82e', '#5fae34', '#3f87d9', '#d9472f', '#ffe27a', '#ff8fb1'];
  $('luConf').innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${colors[i % 6]};animation-delay:${(i % 7) * 0.12}s;animation-duration:${1.6 + (i % 5) * 0.25}s"></i>`).join('');
  $('lvlUp').hidden = false;
  sfx('level');
}
$('luOk').addEventListener('click', () => { $('lvlUp').hidden = true; });
$('lvlUp').addEventListener('click', e => { if (e.target.id === 'lvlUp') $('lvlUp').hidden = true; });
$('lvl').addEventListener('click', () => { cancelPlace(); openPanel({ kind: 'skills' }); });   // v38: úrovně a dovednosti
function updateHud(keepPanel) {
  const f = game.farm;
  // okno nové úrovně: i za úrovně, které mezitím vydělali vesničané; během dohánění nepřítomnosti počká a ukáže se jednou na konci
  if (game.lastLvl === undefined || game.lastLvlFarm !== f.created) { game.lastLvl = f.level; game.lastLvlFarm = f.created; }
  else if (f.level < game.lastLvl) game.lastLvl = f.level;
  else if (f.level > game.lastLvl && villLag(f, now()) < 60_000) { const from = game.lastLvl; game.lastLvl = f.level; showLevelUp(f.level, from); }
  // v38: dovednosti (farmaření, rybaření, vaření) – hláška s tím, co nová úroveň odemkla
  const sk = Object.fromEntries(Object.keys(SKILLS).map(k => [k, skillLevel(f, k)]));
  if (!game.lastSk || game.lastSkFarm !== f.created) { game.lastSk = sk; game.lastSkFarm = f.created; }
  else if (villLag(f, now()) < 60_000) for (const k in sk) {
    if (sk[k] > game.lastSk[k]) {
      const got = skillUnlocks(f, k).filter(x => x[0] > game.lastSk[k] && x[0] <= sk[k]);
      const msg = `:${SKILLS[k].icon}: <b>${SKILLS[k].name} ${sk[k]}!</b>${got.length ? '<br>Nově: ' + got.slice(0, 3).map(([, ic, n]) => `:${ic}: ${n}`).join(', ') : ''}`;
      setTimeout(() => { toast(msg, 'lvlup', 3500); sfx('level'); }, 700);   // až po hlášce akce (sklizeň apod.)
    }
    game.lastSk[k] = sk[k];
  }
  $('coins').textContent = fmtNum(f.coins);
  $('coins').classList.toggle('long', $('coins').textContent.length > 6);
  $('lvlNum').textContent = f.level;
  const lp = levelProgress(f);
  $('xpFill').style.width = Math.min(100, 100 * lp.cur / lp.need) + '%';
  $('silo').textContent = `${siloUsed(f)}/${f.siloCap}`;
  $('silo').classList.toggle('long', $('silo').textContent.length > 6);
  $('tasksDot').hidden = !(canClaimDaily(f, now()) || claimableAch(f) || claimableQuests(f, now()));
  if (game.panel && !keepPanel) renderPanel();   // keepPanel: hráč zrovna klepe do okna – nepřekreslovat mu ho pod prstem
  if (!$('picker').hidden && game.pickPlot) renderPicker();
  updateBanner();
  updateTutorial();
}

// ---------- průvodce pro nové hráče ----------
function updateTutorial() {
  const f = game.farm, el = $('tut');
  if (!f || !el) return;
  // v34: postupný průvodce – krok podle toho, co je odemčené (GUIDE v panels.js), hotové kroky ve farm.tg
  const introDone = !f.pending.includes('sklad') && f.plots.length >= FREE_PLOTS;
  const step = introDone ? guideStep(f) : null;
  if (step && !step.info && step.done(f)) { act({ type: 'guide', id: step.id }, true); return; }
  const show = !!step && !game.place && !game.sowCrop && !game.visit && !game.fishing && !game.tutHidden;
  el.hidden = !show;
  game.tutStep = show ? step.id : null;
  if (!show) return;
  const k = `${step.id}|${(f.tg || []).length}`;
  if (el.dataset.k !== k) { el.dataset.k = k; $('tutText').innerHTML = iconize(`<small>Průvodce · krok ${(f.tg || []).length + 1} z ${GUIDE.length}</small><br>${step.text}`); }
  $('tutNext').hidden = !step.info;
}
$('tutNext').addEventListener('click', () => { const s = guideStep(game.farm); if (s) act({ type: 'guide', id: s.id }); });
$('tutClose').addEventListener('click', () => { $('tut').hidden = true; game.tutHidden = true; });
$('tutSkip').addEventListener('click', () => { act({ type: 'tutorial', n: TUTORIAL_DONE }); toast('Průvodce kdykoli spustíš v Menu → Jak hrát.'); });

// ---------- rybaření: zabere → klepni → drž rybu v zelené čárce ----------
function startFishing(id) {
  const r = act({ type: 'fishCast', id });
  if (!r.ok) return;
  if (r.bait) toast(':navnada: Návnada zůstala na háčku – lepší udice ji ušetřila.');
  closeSheets();
  const rod = bestOwned(game.farm, 'rod');   // v36: lepší udice = širší zelená čárka
  const t = performance.now();
  const fsh = FISH[r.fish];
  const ratio = Math.max(0, Math.min(1, ((r.kg || fsh.kg[0]) - fsh.kg[0]) / (fsh.kg[1] - fsh.kg[0])));
  game.fishing = { id, fish: fsh, kg: r.kg, diff: Math.min(1, fsh.diff + 0.2 * ratio), phase: 'wait', bite: t + 1500 + Math.random() * 2500, zone: 0.2, v: 0, fy: 0.3, ft: 0.5, fnext: 0, prog: 0.3, hold: false, size: Math.min(0.42, 0.26 * ((rod && rod.hold) || 1)), last: t };
  $('fgResult').hidden = true;
  $('fgPlay').hidden = false;
  $('fishGame').hidden = false;
  $('fgTitle').textContent = 'Čekej, až ryba zabere…';
  $('fgHint').textContent = 'Splávek se houpe na vodě.';
  $('fgBob').className = 'fg-bob';
  requestAnimationFrame(fishTick);
}
function fishEnd(ok) {
  const g = game.fishing;
  if (!g || g.phase === 'end') return;
  g.phase = 'end';
  const r = act({ type: 'fishLand', id: g.id, ok }, true);
  $('fgPlay').hidden = true;
  $('fgResult').hidden = false;
  const caught = ok && r.ok && !r.lost;
  if (!caught) sfx('error');
  $('fgTitle').textContent = caught ? 'Úlovek!' : ok && r.error === 'silo_full' ? 'Plný sklad' : 'Ryba utekla';
  const o = findObject(game.farm, g.id);
  const left = o ? Math.max(0, game.farm.silo.navnada || 0) : 0;
  $('fgResultText').innerHTML = iconize(caught
    ? `<div class="fg-big">:${g.fish.icon}:</div><b>Ulovil jsi: ${g.fish.name} – ${fmtKg(r.kg)}!</b>${r.record ? '<div class="fg-rec">:trophy: Nový rekord!</div>' : ''}
       <br><small>${r.size === 'běžná' ? '' : `${r.size === 'obří' ? 'Obří' : 'Velká'} ryba: `}+${r.gained.items[0].qty} do skladu · ${g.fish.price} :coin: za kus · +${r.gained.xp} :xp:</small>
       ${(r.journal || []).map(j => `<div class="fg-rec">:denik_ryb: ${j.text} +${j.coins} :coin:</div>`).join('')}`
    : ok && r.error === 'silo_full' ? `<div class="fg-big">:${g.fish.icon}:</div><b>Sklad je plný!</b><br><small>Uvolni místo, ryba zatím čeká na háčku.</small>`
    : `<div class="fg-big">:${g.fish.icon}:</div><b>${g.fish.name} (${fmtKg(g.kg || g.fish.kg[0])}) utekl${g.fish.fem ? 'a' : ''}…</b><br><small>Příště drž čárku u ryby.</small>`);
  $('fgAgain').textContent = `Rybařit znovu (návnada ${left})`;
}
function fishTick(t) {
  const g = game.fishing;
  if (!g || g.phase === 'end') return;
  const dt = Math.min(0.05, (t - g.last) / 1000);
  g.last = t;
  if (g.phase === 'wait') {
    if (t >= g.bite) {
      g.phase = 'bite'; g.biteEnd = t + (g.size > 0.3 ? 1500 : 1100);
      $('fgTitle').textContent = 'Zabírá! Klepni!';
      $('fgBob').className = 'fg-bob bite';
      sfx('tap');
      if (navigator.vibrate) navigator.vibrate(120);
    }
  } else if (g.phase === 'bite') {
    if (t > g.biteEnd) { $('fgTitle').textContent = 'Pozdě – ryba se pustila.'; fishEnd(false); return; }
  } else if (g.phase === 'fight') {
    const d = g.diff;
    // čárka: držíš = stoupá, pustíš = klesá
    g.v += (g.hold ? 2.6 : -2.2) * dt;
    g.v = Math.max(-1.2, Math.min(1.2, g.v));
    g.zone += g.v * dt;
    if (g.zone < 0) { g.zone = 0; g.v = Math.max(0, g.v) * 0.3; }
    if (g.zone > 1 - g.size) { g.zone = 1 - g.size; g.v = Math.min(0, g.v) * 0.3; }
    // ryba uhýbá k náhodnému cíli; těžší ryba rychleji a častěji
    if (t > g.fnext) { g.ft = 0.05 + Math.random() * 0.9; g.fnext = t + (1400 - d * 900) * (0.5 + Math.random()); }
    const sp = (0.18 + d * 0.9) * dt;
    g.fy += Math.max(-sp, Math.min(sp, g.ft - g.fy));
    const inside = g.fy >= g.zone && g.fy <= g.zone + g.size;
    g.prog += (inside ? 0.3 : -(0.16 + d * 0.16)) * dt;
    $('fgZone').style.bottom = (g.zone * 100) + '%';
    $('fgZone').style.height = (g.size * 100) + '%';
    $('fgZone').className = 'fg-zone' + (inside ? ' on' : '');
    $('fgFish').style.bottom = `calc(${g.fy * 100}% - 14px)`;
    $('fgProg').style.height = (Math.max(0, Math.min(1, g.prog)) * 100) + '%';
    if (g.prog >= 1) { fishEnd(true); return; }
    if (g.prog <= 0) { fishEnd(false); return; }
  }
  requestAnimationFrame(fishTick);
}
function fishDown(e) {
  const g = game.fishing;
  if (!g || e.target.closest('button')) return;
  e.preventDefault();
  if (g.phase === 'wait') { $('fgTitle').textContent = 'Ještě ne… počkej, až zabere.'; return; }
  if (g.phase === 'bite') {
    g.phase = 'fight';
    $('fgTitle').textContent = `Na háčku: ${g.fish.name}${fishSize(g.fish, g.kg || 0).qty > 1 ? ' – velký kus!' : '!'}`;
    $('fgHint').textContent = 'Drž prst = čárka stoupá, pusť = klesá. Udrž rybu v zelené.';
    $('fgBob').className = 'fg-bob hide';
    $('fgFish').innerHTML = ic(g.fish.icon);
  }
  g.hold = true;
}
$('fishGame').addEventListener('pointerdown', fishDown);
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('fishGame').addEventListener(ev, () => { if (game.fishing) game.fishing.hold = false; });
function closeFishing() { game.fishing = null; $('fishGame').hidden = true; updateHud(); }
$('fgQuit').addEventListener('click', () => { fishEnd(false); });
$('fgClose').addEventListener('click', () => { if (game.fishing && game.fishing.phase !== 'end') fishEnd(false); closeFishing(); });
$('fgDone').addEventListener('click', closeFishing);
$('fgAgain').addEventListener('click', () => { const id = game.fishing && game.fishing.id; closeFishing(); if (id) startFishing(id); });

// ---------- upozornění do telefonu (Web Push) ----------
let swReg = null;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function pushSub() { return swReg ? swReg.pushManager.getSubscription() : null; }
async function pushLabel() {
  const b = $('pushBtn');
  if (game.backend.mode !== 'online') { b.hidden = true; return; }
  b.hidden = false;
  const on = !!(await pushSub().catch(() => null)) && Notification.permission === 'granted';
  b.innerHTML = iconize(on ? ':bell: Upozornění: zapnutá (vypnout)' : ':bell: Zapnout upozornění do telefonu');
  b.dataset.on = on ? '1' : '';
}
function b64uToBytes(s) { return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0)); }
$('pushBtn').addEventListener('click', async () => {
  try {
    if ($('pushBtn').dataset.on) {
      const s = await pushSub();
      if (s) { await game.backend.pushUnsubscribe(s.endpoint).catch(() => {}); await s.unsubscribe(); }
      toast('Upozornění jsou vypnutá.');
      return pushLabel();
    }
    if (!pushSupported() || !swReg) {
      return toast(isIos() && !standalone() ? 'Na iPhonu nejdřív v Safari: Sdílet → <b>Přidat na plochu</b>, otevři hru z plochy a zapni upozornění tam.' : 'Tenhle prohlížeč upozornění neumí.', '', 4500);
    }
    const cfg = await game.backend.config();
    if (!cfg.vapidPublic) return toast('Upozornění zatím nejsou na serveru nastavená.');
    if (await Notification.requestPermission() !== 'granted') return toast('Upozornění jsi nepovolil. Změníš to v nastavení prohlížeče.', '', 3500);
    const s = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(cfg.vapidPublic) });
    await game.backend.pushSubscribe(s.toJSON());
    toast(':bell: Hotovo! Dám ti vědět, když bude něco hotové.', 'lvlup', 2800);
  } catch (e) { toast(e.message || 'Upozornění se nepovedlo zapnout.'); }
  pushLabel();
});
$('helpBtn').addEventListener('click', () => { closeSheets(); openPanel({ kind: 'help', tab: 'zaklady' }); });

let toastTimer = null;
$('toast').addEventListener('click', () => { $('toast').className = ''; });
// Esc (klávesnice) zavře, co je otevřené
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (game.fishing) { if (game.fishing.phase === 'end') closeFishing(); else fishEnd(false); return; }
  if (game.visit) { $('visitBack').click(); return; }
  closeSheets(); cancelPlace(); setSow(null);
});
function toast(html, cls = '', ms = 1800) {
  const el = $('toast');
  el.innerHTML = iconize(html);
  el.className = 'show ' + cls;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = cls; }, ms);
}

function closeSheets() {
  for (const id of ['picker', 'panel', 'menuPanel']) $(id).hidden = true;
  game.panel = null;
}
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
  $(b.dataset.close).hidden = true;
  if (b.dataset.close === 'panel') game.panel = null;
}));

// tlačítko Zpět na Androidu / gesto zpět: zavře otevřené okno místo opuštění hry
function backGuard() {
  if (!(history.state && history.state.eko)) { try { history.pushState({ eko: 1 }, ''); } catch { /* nevadí */ } }
}
window.addEventListener('popstate', () => {
  const open = game.fishing || game.visit || game.panel || !$('picker').hidden || !$('menuPanel').hidden || game.place;
  if (game.fishing) { if (game.fishing.phase !== 'end') fishEnd(false); closeFishing(); }
  else if (game.visit) $('visitBack').click();
  else { closeSheets(); cancelPlace(); setSow(null); }
  if (open && game.farm) backGuard();   // další Zpět zase jen zavře okno
});
// iPhone: zabránit přiblížení celé stránky dvěma prsty (přibližuje se jen mapa)
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });

// obecný panel (obchod, budova, sklad)
function openPanel(p) {
  backGuard();
  closeSheets();
  game.panel = p;
  renderPanel();
  $('panel').hidden = false;
  $('panel').scrollTop = 0;
}
function renderPanel() {
  const p = game.panel, f = game.farm;
  if (!p || !f) return;
  if (game.sliding) { game.panelDirty = true; return; }   // hráč táhne posuvník – překreslí se po puštění
  if (p.kind === 'chat') { renderChat(); return; }
  let title = '', body = '', img = null;
  if (p.kind === 'shop') { title = ':cart: Obchod'; body = shopHtml(f, p.tab); }
  else if (p.kind === 'build') { title = ':hammer: Stavět'; body = buildHtml(f, p.tab); }
  else if (p.kind === 'news') { title = ':news: Novinky'; body = newsHtml(); }
  else if (p.kind === 'wiki') { title = ':book: Deník farmáře'; body = wikiHtml(f, p.tab); }
  else if (p.kind === 'team') { title = ':helper: Farmářský tým'; body = teamHtml(f, now(), p.f || 'all', p.sel || 0, !!p.ask); }
  else if (p.kind === 'center') { title = ':house: Řídicí centrum'; body = centerHtml(f, now(), p.tab || 'prehled'); }
  else if (p.kind === 'item') { title = `:${ITEMS[p.id].icon}: ${ITEMS[p.id].name}`; body = itemHtml(f, p.id, !!p.back); }
  else if (p.kind === 'silo') { title = ':barn: ' + siloTitle(f); body = siloHtml(f, now(), !!p.keepAdd); }
  else if (p.kind === 'land') { title = ':sign: Pozemky'; body = landHtml(f, p.sel); }
  else if (p.kind === 'help') { title = ':book: Jak hrát'; body = helpHtml(f, p.tab); }
  else if (p.kind === 'tasks') { title = ':trophy: Úkoly a odměny'; body = tasksHtml(f, now(), p.tab, game.board, game.weekly); }
  else if (p.kind === 'skills') { title = ':star: Dovednosti'; body = skillsHtml(f); }
  else if (p.kind === 'plot') { const pl = findPlot(f, p.x, p.y); if (!pl) { closeSheets(); return; } title = ':plot: Pole'; body = plotHtml(f, pl, now(), !!p.ask); }
  else if (p.kind === 'event') { const e = (p.res && EVENTS_BY[p.res.id]) || null; title = ':bell: ' + (e ? 'Jak to dopadlo' : 'Událost'); body = eventHtml(f, now(), p.res); }
  else if (p.kind === 'town') {
    const o = townObject(f, p.t);
    title = `:${BUILDINGS[p.t].icon}: ${BUILDINGS[p.t].name}`;
    img = bImg(p.t);
    body = p.t === 'prodejna' ? dealerHtml(f, now(), o, p.tab) : p.t === 'stanek' ? stallHtml(f, o, now(), p.tab) : p.t === 'nastenka' ? boardHtml(f, now(), game.adProf)
      : marketHtml(f, game.market, p.tab, game.mform, now());
  }
  else {
    const o = findObject(f, p.id);
    if (!o) { closeSheets(); return; }
    const d = BUILDINGS[o.kind];
    title = `:${d.icon}: ${d.name}`;
    img = bImg(o.kind);
    body = d.type === 'factory' ? factoryHtml(f, o, now())
      : d.type === 'pen' ? penHtml(f, o, now())
      : d.type === 'main' ? statekHtml(f, game.name, now(), p.tab, o)
      : d.type === 'garage' ? garageHtml(f, o, now())
      : d.type === 'dealer' ? dealerHtml(f, now(), o, p.tab)
      : d.type === 'stall' ? stallHtml(f, o, now())
      : d.type === 'orchard' ? orchardHtml(f, o, now(), p.ask)
      : d.type === 'bigfield' ? bigfieldHtml(f, o, now(), !!p.ask)
      : d.type === 'pond' ? pondHtml(f, o, now())
      : d.type === 'hive' ? hiveHtml(f, o, now())
      : d.type === 'house' ? houseHtml(f, o)
      : decoHtml(f, o);
  }
  setTitle(title, img);
  $('panelBody').innerHTML = iconize(body);
}
// hlavička okna: kulatý medailon s ikonou (u budov obrázek budovy) a velký název
function setTitle(title, img) {
  const m = /^:([a-z0-9_]+):\s*(.*)$/.exec(title) || [null, null, title];
  const key = `${img}|${title}`;
  if ($('panelTitle').dataset.k === key) return;   // panel se překresluje každou sekundu – hlavičku jen při změně
  $('panelTitle').dataset.k = key;
  const medal = img ? `<span class="medal pic"><img src="${img}" alt=""></span>` : m[1] ? `<span class="medal">${ic(m[1])}</span>` : '';
  $('panelTitle').innerHTML = medal + `<span class="ttl">${iconize(m[2])}</span>`;
}
// živé odpočty – ale ne ve chvíli, kdy hráč zrovna klepe
let panelTouch = 0;
$('panel').addEventListener('pointerdown', () => { panelTouch = performance.now(); });
setInterval(() => {
  if (game.panel && ['obj', 'silo', 'town', 'team', 'center', 'event', 'plot'].includes(game.panel.kind) && !panelBusy()) renderPanel();
}, 1000);

// krok pro počty kusů: po 5 do 20, po 10 do 100, po 50 do 500, pak po 100
const stepN = (n, d) => { const sc = x => (x < 20 ? 5 : x < 100 ? 10 : x < 500 ? 50 : 100); return d > 0 ? n + sc(n) : n - sc(n - 1); };
// posuvník procent v plánu: během tažení se panel nepřekresluje, změna se pošle až po puštění
const panelBusy = () => game.sliding || performance.now() - panelTouch < 700;
$('panelBody').addEventListener('pointerdown', e => { if (e.target.closest('.pslide')) { game.sliding = true; game.panelDirty = false; } });
const slideEnd = () => {
  if (!game.sliding) return;
  game.sliding = false; panelTouch = performance.now();
  if (game.panelDirty) setTimeout(() => { if (!game.sliding && game.panelDirty) { game.panelDirty = false; renderPanel(); } }, 50);   // po „change“
};
document.addEventListener('pointerup', slideEnd);
document.addEventListener('pointercancel', slideEnd);
const slideVal = s => Math.max(5, Math.min(Number(s.dataset.max), Math.round(Number(s.value) / 5) * 5));
$('panelBody').addEventListener('input', e => {
  const s = e.target.closest('.pslide');
  if (!s) return;
  panelTouch = performance.now();
  const val = slideVal(s);
  if (String(val) !== s.value) s.value = val;
  const pv = s.closest('.prow') && s.closest('.prow').querySelector('.pv');
  if (pv) pv.textContent = val;
});
$('panelBody').addEventListener('change', e => {
  const s = e.target.closest('.pslide');
  if (!s) return;
  game.sliding = false; game.panelDirty = false;
  const w = s.dataset.w, key = s.dataset.key, wp = wpGet(game.farm, w), cur = wp && wpPlan(wp)[key], pct = slideVal(s);
  if (wp && pct !== cur) act({ type: 'plan', w, key, pct }); else renderPanel();
});
$('panelBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const v = b.dataset.v;
  const f = game.farm;
  switch (b.dataset.act) {
    case 'tab': game.panel.tab = game.lastTab = v; renderPanel(); break;
    case 'buy': {
      const d = BUILDINGS[v];
      if (f.pending.includes(v)) { startPlace(v); break; }
      if (d.st > statekLevel(f)) return toast(ERRORS.statek_low);
      if (v === 'sad' && countKind(f, 'sad') >= maxOrchards(f)) return toast(ERRORS.max_orchards);
      if (v === 'sad' && f.coins < orchardPrice(f)) return toast(ERRORS.no_coins);
      if (d.max && f.objects.filter(o => o.kind === v).length >= d.max) return toast(ERRORS.max_count);
      if (f.coins < d.cost) return toast(ERRORS.no_coins);
      startPlace(v);
      break;
    }
    case 'buyPlot':
      if (f.plots.length >= maxPlots(f)) return toast(ERRORS.max_plots);
      startPlace('plot');
      break;
    case 'buyAnimal': {
      const r = act({ type: 'buyAnimal', animal: v });
      if (r.ok) toast(`:${ANIMALS[v].icon}: ${ANIMALS[v].name} je v ohradě!`);
      break;
    }
    case 'upgradeSilo':
      if (act({ type: 'upgradeSilo' }).ok) toast(`:barn: Sklad má teď ${f.siloCap} míst`);
      break;
    case 'produce': act({ type: 'produce', id: game.panel.id, recipe: v }); break;
    case 'plantTree': {
      const r = act({ type: 'plantTree', id: game.panel.id, tree: v });
      if (r.ok) { const o = findObject(f, game.panel.id); floatAt(o.x, o.y, r.sapling ? `−1 :z_${v}:` : `−${TREES[v].cost} :coin:`); closeSheets(); }
      break;
    }
    case 'clearAsk': game.panel.ask = true; renderPanel(); break;
    case 'clearNo': game.panel.ask = false; renderPanel(); break;
    case 'clearTree': {   // vykopat strom; panel pak rovnou nabídne nový
      const id = Number(v), r = act({ type: 'clearTree', id, force: true });
      game.panel.ask = false;
      if (r.ok) {
        const o = findObject(f, id), b = r.back;
        floatAt(o.x, o.y, b && b.item ? `+1 :${b.item}:` : b && b.coins ? `+${b.coins} :coin:` : ':axe: vykopáno');
        if (b) toast(b.item ? 'Sazenice je zpátky ve skladu. Vyber nový strom.' : 'Mince za sazenici máš zpátky. Vyber nový strom.');
      }
      renderPanel();
      break;
    }
    case 'ttab': game.panel.tab = v; if (v === 'zebricek') loadBoard(); if (v === 'soutez') loadWeekly(); renderPanel(); break;
    case 'dtab': game.panel.tab = v; renderPanel(); $('panel').scrollTop = 0; break;
    case 'closePanel': closeSheets(); break;
    case 'clearPlotAsk': game.panel.ask = true; renderPanel(); break;
    case 'clearPlot': {   // v38: zrušit výsev
      const [x, y] = v.split('|').map(Number);
      if (act({ type: 'clearPlot', x, y }).ok) { toast(':plot: Výsev zrušen – pole je volné.'); closeSheets(); }
      break;
    }
    case 'fieldClearAsk': game.panel.ask = true; renderPanel(); break;
    case 'fieldClearNo': game.panel.ask = false; renderPanel(); break;
    case 'fieldClear': if (act({ type: 'fieldClear', id: Number(v) }).ok) { game.panel.ask = false; toast(':plot: Osetí zrušeno – pole je volné.'); renderPanel(); } break;
    case 'evAnswer': {   // v36: odpověď na událost
      const [slot, id, i] = v.split('|');
      const r = act({ type: 'eventAnswer', slot: Number(slot), id, i: Number(i) });
      if (r.ok) { game.panel.res = r; renderPanel(); $('panel').scrollTop = 0; if (r.coins > 0 || r.gift.length) sfx('coin'); }
      else if (r.error === 'no_event') closeSheets();
      break;
    }
    case 'buyDog': {
      const r = act({ type: 'buyDog' });
      if (r.ok) toast(`:pes: ${DOG.name} je doma! Bude chodit s tebou a hlídat farmu.`, 'lvlup', 2600);
      break;
    }
    case 'stab': game.panel.tab = v; renderPanel(); break;
    case 'btab': game.panel.tab = v; renderPanel(); $('panel').scrollTop = 0; break;
    case 'upgrade': {
      const r = act(b.dataset.town ? { type: 'upgrade', town: v } : { type: 'upgrade', id: Number(v) });
      const ob = !b.dataset.town && findObject(f, Number(v));
      if (r.ok && ob && ob.kind === 'statek') { closeSheets(); showStatekUp(r.level); }   // v37: co nový Statek odemkl
      else if (r.ok) toast(`:star: Vylepšeno na úroveň ${r.level}!`, 'lvlup', 2200);
      break;
    }
    case 'sellMachine': {
      const r = act({ type: 'sellMachine', id: Number(v) });
      if (r.ok) toast(`Prodáno za ${r.refund} :coin:`);
      break;
    }
    case 'stallBuy': {
      const r = act({ type: 'stallBuy', i: Number(v), qty: 1 });
      if (r.ok) toast(`−${r.total} :coin:`);
      break;
    }
    case 'stallSell': {
      const off = stallOffers(f, now()).sell[Number(v)];
      const left = stallLeft(f, now(), 's', Number(v), off.qty);
      const qty = b.dataset.q === 'all' ? Math.min(left, have(f, off.item)) : 1;
      if (qty > 0) { const r = act({ type: 'stallSell', i: Number(v), qty }); if (r.ok) toast(`+${r.total} :coin:`); }
      break;
    }
    case 'hire': {
      const crop = game.helperPick || (f.helper && f.helper.crop) || game.sowCrop || 'wheat';
      const r = act({ type: 'hire', plan: Number(v), crop });
      if (r.ok) toast(':helper: Pomocník jde do práce!', 'lvlup', 2000);
      break;
    }
    case 'helperCrop':
      if (!f.helper) { toast('Nejdřív pomocníka najmi – plodinu si zapamatuje.'); game.helperPick = v; }
      else act({ type: 'helperSet', crop: v });
      renderPanel();
      break;
    case 'helperTractor': act({ type: 'helperSet', tractor: v === '1' }); break;
    // ---- vesničané ----
    // ---- Farmářský tým, nástěnka, domky ----
    case 'openTeam': openPanel({ kind: 'team', f: 'all' }); break;
    case 'openSilo': openPanel({ kind: 'silo' }); break;
    case 'awayOk': act({ type: 'awaySeen' }, true); renderPanel(); break;
    case 'teamFilter': game.panel.f = v; game.panel.sel = 0; renderPanel(); break;
    case 'teamSel': if (game.panel.kind !== 'team') openPanel({ kind: 'team', f: 'all', sel: Number(v) }); else { game.panel.sel = Number(v); game.panel.ask = false; renderPanel(); $('panel').scrollTop = 0; } break;
    case 'teamBack': game.panel.sel = 0; game.panel.ask = false; renderPanel(); break;
    case 'fireAsk': game.panel.ask = true; renderPanel(); break;
    case 'fireVill': { const vv = findVill(f, Number(v)); if (act({ type: 'fireVill', id: Number(v) }).ok) { toast(`:helper: ${vv ? villName(vv) : 'Pracovník'} odešel. Lůžko je volné.`); game.panel.sel = 0; game.panel.ask = false; renderPanel(); } break; }
    case 'teamMove': {   // id|a|druh|pole|vyměnit s, id|b|budova|vyměnit s, id|0 = odvolat
      const [id, k, a1, a2, a3] = v.split('|');
      const sw = Number(k === 'a' ? a3 : a2) || 0, other = sw && findVill(f, sw);
      const r = k === 'a' ? act({ type: 'assignArea', id: Number(id), kind: a1, a: Number(a2), swap: sw || undefined })
        : k === 'b' ? act({ type: 'assignVill', id: Number(id), at: Number(a1), swap: sw || undefined })
        : (findVill(f, Number(id)) || {}).area ? act({ type: 'assignArea', id: Number(id), a: 0 }) : act({ type: 'assignVill', id: Number(id), at: 0 });
      if (r.ok && k) toast(`:helper: ${villName(findVill(f, Number(id)))} jde na nové místo${other ? ` · ${villName(other)} ${other.at || other.area ? 'jde za něj' : 'je volný'}` : ''}`);
      break;
    }
    case 'openBoard': openPanel({ kind: 'town', t: 'nastenka' }); break;
    case 'openBuildFarm': openPanel({ kind: 'build', tab: 'farma' }); break;
    case 'adProf': game.adProf = v; renderPanel(); break;
    case 'postAd': {
      const [prof, opt] = v.split('|');
      const r = act({ type: 'postAd', prof, opt: Number(opt) });
      if (r.ok) toast(`:sign: Inzerát visí. Uchazeči přijdou za ${fmtTime(Math.ceil((r.ready - now()) / 1000))}.`, '', 2600);
      break;
    }
    case 'hireCand': {
      const [ad, i] = v.split('|').map(Number);
      const r = act({ type: 'hireCand', ad, i });
      if (r.ok) toast(`:helper: ${villName(findVill(f, r.id))} je v týmu! Práci zadáš v okně Tým.`, 'lvlup', 2600);
      break;
    }
    case 'dropAd': act({ type: 'dropAd', ad: Number(v) }); break;
    case 'rebuildHouse': { const r = act({ type: 'rebuildHouse', id: Number(v) }); if (r.ok) toast(`:house: Přestavěno na ${BUILDINGS[r.kind].name} · ${bedsText(BUILDINGS[r.kind].beds)}`); break; }
    case 'villAssign': { const [id, at, sw] = v.split('|').map(Number); if (act({ type: 'assignVill', id, at, swap: sw || undefined }).ok) toast(`:helper: ${villName(findVill(f, id))} tu teď pracuje`); break; }
    case 'villFree': act({ type: 'assignVill', id: Number(v), at: 0 }); break;
    // plán pracoviště (w = 'b12' budova / 'pole101' oblast): procenta, cílové zásoby, přerozdělení, znovu sázet; rezervy skladu
    case 'planAdd': {
      const [w, key] = v.split('|'), wp = wpGet(f, w);
      if (!wp) break;
      const plan = wpPlan(wp), rest = 100 - planTotal(plan);
      if (planKindW(wp) === 'item') { act({ type: 'plan', w, key, pct: 50 }); break; }
      if (rest >= 5) { act({ type: 'plan', w, key, pct: rest }); break; }
      // všechno je rozdělené: nový řádek dostane polovinu z největšího
      const big = Object.keys(plan).sort((a, b) => plan[b] - plan[a])[0];
      const take = big ? Math.floor(plan[big] / 10) * 5 : 0;
      if (take < 5) { toast(ERRORS.plan_over); break; }
      if (act({ type: 'plan', w, key: big, pct: plan[big] - take }).ok) act({ type: 'plan', w, key, pct: take });
      break;
    }
    case 'planPct': {
      const [w, key, d] = v.split('|'), wp = wpGet(f, w), plan = wp && wpPlan(wp), cur = plan && plan[key];
      if (!cur) break;
      const max = planKindW(wp) === 'item' ? 100 : 100 - (planTotal(plan) - cur);
      const next = Math.max(5, Math.min(max, cur + 5 * Math.sign(Number(d))));
      if (next !== cur) act({ type: 'plan', w, key, pct: next }); else if (Number(d) > 0) toast(ERRORS.plan_over);
      break;
    }
    case 'planDel': { const [w, key] = v.split('|'); act({ type: 'plan', w, key, pct: 0 }); break; }
    case 'planAuto': { const wp = wpGet(f, v); if (wp && wp.o) act({ type: 'planAuto', w: v, on: !wp.o.auto }); break; }
    case 'planReplant': { const wp = wpGet(f, v); if (wp && wp.set) act({ type: 'planReplant', w: v, on: wp.set.replant === false }); break; }
    case 'tgtAdd': { const [w, key] = v.split('|'); act({ type: 'planTarget', w, key, n: 10 }); break; }
    case 'tgtDel': { const [w, key] = v.split('|'); act({ type: 'planTarget', w, key, n: 0 }); break; }
    case 'tgtUp': { const [w, key, d] = v.split('|'); act({ type: 'planOrder', w, key, d: Number(d) }); break; }
    case 'tgtN': {
      const [w, key, d] = v.split('|'), wp = wpGet(f, w), row = wp && wp.o && (wp.o.target || []).find(x => x[0] === key);
      if (!row) break;
      act({ type: 'planTarget', w, key, n: Math.max(1, Math.min(9999, stepN(row[1], Number(d)))) });
      break;
    }
    case 'keepN': {
      const [item, d] = v.split('|'), cur = keepOf(f, item);
      act({ type: 'keep', item, n: Number(d) ? Math.max(0, Math.min(99999, stepN(cur, Number(d)))) : 0 });
      break;
    }
    case 'keepAdd': act({ type: 'keep', item: v, n: 10 }); break;
    case 'keepOpen': game.panel.keepAdd = !game.panel.keepAdd; renderPanel(); break;
    case 'openVill': openPanel({ kind: 'team', f: 'all' }); break;
    // ---- deník farmáře ----
    case 'itemInfo': if (ITEMS[v]) { const back = game.panel && { ...game.panel }; openPanel({ kind: 'item', id: v, back }); } break;
    case 'itemBack': if (game.panel && game.panel.back) openPanel(game.panel.back); break;
    case 'openWiki': openPanel({ kind: 'wiki', tab: game.wikiTab }); break;
    case 'wtab': game.panel.tab = game.wikiTab = v; renderPanel(); $('panel').scrollTop = 0; break;
    // ---- farmáři ve Statku, zásoby ----
    case 'areaAssign': { const [id, kind, a] = v.split('|'); const r = act({ type: 'assignArea', id: Number(id), kind, a: Number(a) }); if (r.ok) toast(`:farmer: ${villName(findVill(f, Number(id)))} pracuje v oblasti ${r.n}`); break; }
    case 'areaFree': act({ type: 'assignArea', id: Number(v), a: 0 }); break;
    case 'buySupply': { const [item, q] = v.split('|'); const r = act({ type: 'buySupply', item, qty: Number(q) }); if (r.ok) toast(`+${q}× :${ITEMS[item].icon}: · −${r.cost} :coin:`); break; }
    case 'openStall': openPanel({ kind: 'town', t: 'stanek', tab: 'zasoby' }); break;
    case 'openObj': { const o = findObject(f, Number(v)); if (o) openPanel({ kind: 'obj', id: o.id }); break; }
    case 'openLand': openPanel({ kind: 'land', sel: (LAND_PARCELS.find(p => !f.land.includes(p.id)) || {}).id }); break;
    case 'selLand': game.panel.sel = v; renderPanel(); break;
    case 'buyLand': {
      const r = act({ type: 'buyLand', id: v });
      if (r.ok) {
        const p = getParcel(v);
        closeSheets();
        const [cx, cy] = cellCenter(p.x + p.w / 2, p.y + p.h / 2);
        game.cam.x = cx; game.cam.y = cy; game.cam.zoom = Math.min(game.cam.zoom, 0.8); clampCam();
        toast(`:sign: ${p.name} je tvoje! Můžeš tu stavět.`, 'lvlup', 2600);
      }
      break;
    }
    case 'claimDaily': {
      const r = act({ type: 'claimDaily' });
      if (r.ok) toast(`:gift: Den ${r.streak}: +${r.coins} :coin:`, 'lvlup', 2200);
      break;
    }
    case 'claimQuest': {
      const r = act({ type: 'claimQuest', i: v === 'bonus' ? 'bonus' : Number(v) });
      if (r.ok) toast(`:star: ${v === 'bonus' ? 'Všechny denní úkoly splněny!' : 'Úkol splněn!'} +${r.coins} :coin:`, 'lvlup', 2200);
      break;
    }
    case 'visit': startVisit(v); break;
    case 'fish': startFishing(Number(v)); break;
    case 'htab': game.panel.tab = v; renderPanel(); $('panel').scrollTop = 0; break;
    case 'tutRestart': act({ type: 'tutorial', n: 0, reset: true }); closeSheets(); toast(':farmer: Průvodce začíná znovu.'); break;
    case 'mtab': game.panel.tab = v; if (v !== 'prodat' || !game.market) loadMarket(); renderPanel(); break;
    case 'marketReload': loadMarket(); break;
    case 'mPick': {
      const [k, id] = v.split(':');
      game.mform = k === 'i' ? { item: id, qty: Math.min(have(f, id), 10) } : { machine: Number(id) };
      renderPanel();
      break;
    }
    case 'mQty': {
      const m = game.mform;
      const max = have(f, m.item);
      const old = Math.max(1, Math.min(max, m.qty || 1));
      m.qty = Math.max(1, Math.min(max, old + Number(v)));
      if (m.price) m.price = Math.round(m.price * m.qty / old);   // cena za kus zůstane
      renderPanel();
      break;
    }
    case 'mPrice': {
      const m = game.mform;
      const l = m.machine ? { machine: f.machines.find(x => x.id === m.machine).model } : { item: m.item, qty: Math.max(1, Math.min(have(f, m.item), m.qty || 1)) };
      m.price = Math.max(1, Math.min(marketMaxPrice(l), (m.price || marketBase(l)) + Number(v)));
      renderPanel();
      break;
    }
    case 'marketList': {
      const m = game.mform;
      let body;
      if (m.machine) {
        const l = { machine: f.machines.find(x => x.id === m.machine).model };
        body = { machine: m.machine, price: Math.max(1, Math.min(marketMaxPrice(l), m.price || marketBase(l))) };
      } else {
        const qty = Math.max(1, Math.min(have(f, m.item), m.qty || 1));
        const l = { item: m.item, qty };
        body = { item: m.item, qty, price: Math.max(1, Math.min(marketMaxPrice(l), m.price || marketBase(l))) };
      }
      marketCall('list', body, ':market: Vystaveno na tržišti!', 'moje');
      break;
    }
    case 'marketBuy': marketCall('buy', { id: Number(v) }, ':market: Koupeno!'); break;
    case 'marketCancel': marketCall('cancel', { id: Number(v) }, 'Nabídka stažena, zboží je zpátky ve skladu.'); break;
    case 'claimAch': {
      const r = act({ type: 'claimAch', id: v });
      if (r.ok) toast(`:trophy: Úkol splněn: +${r.coins} :coin:`, 'lvlup', 2200);
      break;
    }
    case 'fieldPlow':
    case 'fieldBale':
      if (act({ type: b.dataset.act, id: game.panel.id, machine: Number(v) }).ok) closeSheets();
      break;
    case 'buyMachine': {
      const r = act({ type: 'buyMachine', model: v });
      const vt = MACHINES[v].type;
      if (r.ok) toast(`:${MACHINES[v].icon}: ${MACHINES[v].name} ${vt === 'tractor' || vt === 'combine' ? 'je ve stodole!' : 'je tvoje!'}`);
      break;
    }
    case 'fieldSow': {
      const m = freeMachine(f, 'tractor', now());
      if (!m) return toast(ERRORS.no_machine);
      if (act({ type: 'fieldSow', id: game.panel.id, crop: v, machine: m.id }).ok) { toast(`:tractor: ${MACHINES[m.model].name} vyjel sít`); closeSheets(); }
      break;
    }
    case 'fieldHarvest':
      if (act({ type: 'fieldHarvest', id: game.panel.id, machine: Number(v) }).ok) closeSheets();
      break;
    case 'fieldUnload': {
      const r = act({ type: 'fieldUnload', id: Number(v) });
      if (r.ok && r.rest) toast(`${ERRORS.silo_full}<br><small>Na poli zbývá ${r.rest} kusů.</small>`);
      break;
    }
    case 'deliver': {
      const r = act({ type: 'deliver', slot: Number(v) });
      if (r.ok) toast(`:truck: Zakázka doručena: +${r.coins} :coin:`);
      break;
    }
    case 'discard': act({ type: 'discard', slot: Number(v) }); break;
    case 'sowAll': {
      const r = act({ type: 'sowAll', crop: v });
      if (r.ok) { toast(`:tractor: Zaseto ${r.count} polí: ${CROPS[v].name}`); closeSheets(); }
      break;
    }
    case 'harvestAll': {
      const r = act({ type: 'harvestAll' });
      if (r.ok) { closeSheets(); if (r.partial) toast(ERRORS.silo_full); }
      break;
    }
    case 'collect': act({ type: 'collect', id: Number(v) }); break;
    case 'feed': act({ type: 'feed', id: Number(v) }); break;
    case 'move': {
      const o = findObject(f, Number(v));
      if (o) startPlace(o.kind, o.id);
      break;
    }
    case 'sell': {
      const qty = b.dataset.q === 'all' ? have(f, v) : 1;
      const price = sellPrice(v, now());
      if (qty > 0 && act({ type: 'sell', item: v, qty }).ok) toast(`+${qty * price} :coin:`);
      break;
    }
  }
});

function openPicker(plot) {
  backGuard();
  closeSheets();
  game.pickPlot = plot;
  renderPicker();
  $('picker').hidden = false;
}
function renderPicker() {
  const f = game.farm;
  const groups = Object.entries(CROP_CATS).map(([cat, title]) => [title, CROP_LIST.filter(c => c.cat === cat)]);
  $('cropList').innerHTML = iconize(groups.map(([title, list]) => `<div class="cat">${title}</div>` + list.map(c => {
    const locked = !stOk(f, c);   // v37: plodiny odemyká Statek
    const seeds = have(f, 's_' + c.id);
    return `<button class="crop${locked ? ' locked' : ''}" data-crop="${c.id}">
      <div class="ico">:${c.icon}:</div>
      <div class="nm">${c.name}</div>
      <div class="meta">${locked ? `:lock: Statek ${c.st}` : `${seeds ? `:s_${c.id}: ${seeds}` : `${c.cost} :coin:`} · :clock: ${fmtTime(c.time)}`}</div>
      <div class="meta">${locked ? '&nbsp;' : `sklizeň ${c.yield}× · ${c.price} :coin:/ks`}</div>
    </button>`;
  }).join('')).join(''));
}
$('cropList').addEventListener('click', e => {
  const b = e.target.closest('[data-crop]');
  if (!b || !game.pickPlot) return;
  const c = CROPS[b.dataset.crop];
  if (!stOk(game.farm, c)) { toast(ERRORS.locked); return; }
  const p = game.pickPlot;
  const r = act({ type: 'plant', x: p.x, y: p.y, crop: c.id });
  $('picker').hidden = true;
  game.pickPlot = null;
  if (r.ok) setSow(c.id);
});

function setSow(id) {
  game.sowCrop = id;
  updateBanner();
}

function updateBanner() {
  const f = game.farm;
  if (!f) return;
  let text = '', ok = false;
  const p = game.place;
  if (p) {
    ok = true;
    if (p.movePlot) text = '↔ Pole: posuň prstem a potvrď';
    else if (p.kind === 'plot') text = f.plots.length < FREE_PLOTS
      ? `:plot: Pole zdarma ${f.plots.length + 1}/${FREE_PLOTS} – posuň, kam chceš, a potvrď`
      : `:plot: Nové pole za ${plotPrice(f)} :coin: (${f.plots.length}/${maxPlots(f)}) – posuň a potvrď`;
    else if (p.kind === 'sad' && !p.moveId) text = `:tree: Sad za ${orchardPrice(f)} :coin: (${countKind(f, 'sad')}/${maxOrchards(f)}) – posuň a potvrď`;
    else if (p.kind === 'velkepole' && !p.moveId) text = `:field: Velké pole ${p.w}×${p.h} = ${p.w * p.h * FIELD_CELL_PRICE} :coin:`;
    else if (p.moveId) text = `↔ ${BUILDINGS[p.kind].name}: posuň prstem a potvrď`;
    else if (f.pending.includes(p.kind)) text = `:${BUILDINGS[p.kind].icon}: ${BUILDINGS[p.kind].name} zdarma – posuň, kam chceš, a potvrď`;
    else text = `:${BUILDINGS[p.kind].icon}: ${BUILDINGS[p.kind].name} za ${BUILDINGS[p.kind].cost} :coin: – posuň a potvrď`;
  } else if (game.sowCrop) {
    text = `:${CROPS[game.sowCrop].icon}: Setí: ${CROPS[game.sowCrop].name} – táhni prstem přes prázdná pole`;
  }
  $('bannerText').innerHTML = iconize(text);
  $('bannerSize').hidden = !(p && p.kind === 'velkepole' && !p.moveId);
  $('bannerOk').hidden = !ok;
  $('banner').hidden = !text;
}
$('bannerOk').addEventListener('click', confirmPlace);
$('bannerSize').addEventListener('click', e => {
  const b = e.target.closest('[data-size]');
  if (!b || !game.place) return;
  const [dim, d] = b.dataset.size.split(':');
  game.place[dim] = Math.max(FIELD_MIN, Math.min(FIELD_MAX, game.place[dim] + Number(d)));
  setGhost(game.place.x, game.place.y);
  updateBanner();
});
// ---------- tržiště hráčů ----------
function loadMarket() {
  game.backend.market().then(d => { game.market = d; if (game.panel && game.panel.kind === 'town') renderPanel(); })
    .catch(e => { game.market = { error: e.message }; if (game.panel && game.panel.kind === 'town') renderPanel(); });
}
async function marketCall(kind, body, okText, tab) {
  if (game.marketBusy) return;
  game.marketBusy = true;
  try {
    await flushAll();
    const res = await game.backend.marketPost(kind, body);
    applyServer(res);
    toast(okText);
    sfx('coin');
    if (kind === 'list') game.mform = {};
    if (tab && game.panel) game.panel.tab = tab;
  } catch (e) {
    toast(e.message);
    sfx('error');
  } finally {
    game.marketBusy = false;
    loadMarket();
  }
}

// ---------- návštěva cizí farmy ----------
async function startVisit(name) {
  try {
    const res = await game.backend.visit(name);
    closeSheets(); cancelPlace(); setSow(null);
    game.visit = { name: res.name, farm: normalize(res.farm), back: { ...game.cam } };
    $('visitText').innerHTML = iconize(`:house: Farma <b>${res.name.replace(/</g, '&lt;')}</b> · úroveň ${game.visit.farm.level}`);
    document.body.classList.add('visiting');
    $('visitBar').hidden = false;
    visitHelpLabel();
    centerCamera(); clampCam();
  } catch (e) { toast(e.message); }
}
$('visitHelp').addEventListener('click', async () => {   // v36: pomoc kamarádovi (1× denně)
  if (!game.visit) return;
  if (!game.backend.help) return toast('Pomoc kamarádům funguje jen v online hře.');
  if (helpUsed(game.farm, now())) return toast(ERRORS.help_used);
  $('visitHelp').disabled = true;
  try {
    await flushAll();
    const res = await game.backend.help(game.visit.name);
    applyServer({ farm: res.farm || game.farm, now: res.now || Date.now() + game.offset });
    toast(`:gift: Pomohl jsi: ${res.text}${res.coins ? `<br>+${res.coins} :coin: +${res.xp} :xp:` : ''}`, 'lvlup', 3000);
    sfx('coin');
    const v = await game.backend.visit(game.visit.name).catch(() => null);
    if (v && game.visit) game.visit.farm = normalize(v.farm);
  } catch (e) { toast(e.message || 'Nepovedlo se.'); }
  visitHelpLabel();
});
function visitHelpLabel() {
  const used = game.farm && helpUsed(game.farm, now());
  $('visitHelp').disabled = !!used;
  $('visitHelp').innerHTML = iconize(used ? ':gift: Dnes už jsi pomohl' : ':gift: Pomoct (1× denně)');
}
$('visitBack').addEventListener('click', () => {
  if (!game.visit) return;
  game.cam = game.visit.back;
  game.visit = null;
  document.body.classList.remove('visiting');
  $('visitBar').hidden = true;
  openPanel({ kind: 'tasks', tab: 'zebricek' });
  if (!game.board) loadBoard();
});
$('townBtn').addEventListener('click', () => {
  cancelPlace(); closeSheets();
  const [tx, ty] = cellCenter(30, 30);
  const inTown = Math.hypot(game.cam.x - tx, game.cam.y - ty) < 500;
  if (inTown) centerCamera();
  else { game.cam.x = tx; game.cam.y = ty - 40; game.cam.zoom = W < 700 ? 0.6 : 0.9; }
  clampCam();
  $('townBtn').innerHTML = iconize(inTown ? ':shop: <b>Městečko</b>' : ':house: <b>Farma</b>');
});

// v36: žebříček týdenní soutěže (v testovací verzi jen vlastní skóre)
function loadWeekly() {
  if (!game.backend.weekly) { game.weekly = null; return; }
  game.backend.weekly().then(d => { game.weekly = d; if (game.panel && game.panel.kind === 'tasks') renderPanel(); })
    .catch(() => { game.weekly = null; renderPanel(); });
}
function loadBoard() {
  game.board = null;
  game.backend.leaderboard().then(b => { game.board = b; if (game.panel && game.panel.kind === 'tasks') renderPanel(); })
    .catch(() => { game.board = { top: [], me: null }; renderPanel(); });
}
$('tasksBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'tasks') { closeSheets(); return; }
  openPanel({ kind: 'tasks', tab: 'denni' });
});
function menuLabels() {
  $('soundBtn').innerHTML = iconize(soundOn() ? ':sound: Zvuk: zapnutý' : ':mute: Zvuk: vypnutý');
  $('dayBtn').innerHTML = iconize(game.dayNight === false ? ':clock: Den a noc: vypnuto' : ':clock: Den a noc podle hodin: zapnuto');
}
try { game.dayNight = localStorage.getItem('ekofarm_daynight') !== 'off'; } catch { game.dayNight = true; }
$('soundBtn').addEventListener('click', () => { setSound(!soundOn()); sfx('tap'); menuLabels(); });
$('dayBtn').addEventListener('click', () => {
  game.dayNight = game.dayNight === false;
  try { localStorage.setItem('ekofarm_daynight', game.dayNight ? 'on' : 'off'); } catch { /* nevadí */ }
  menuLabels();
});
document.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic); });
function newsSeen() { try { return Number(localStorage.getItem('ekofarm_news') || 0); } catch { return 0; } }
$('newsDot').hidden = newsSeen() >= NEWS[0].v;

// ---------- počasí ----------
function updateWeather() {
  const w = weatherAt(now());
  $('weatherBtn').innerHTML = iconize(`:${w.icon}: <b>${w.name}</b>`);
}
setInterval(updateWeather, 30000);
$('weatherBtn').addEventListener('click', () => {
  const w = weatherAt(now());
  const left = Math.ceil((nextWeather(now()) - now()) / 1000);
  toast(`:${w.icon}: <b>${w.name}</b><br><small>${w.text}<br>Počasí se změní za ${fmtTime(left)}.</small>`, '', 4000);
});

// ---------- chat pro všechny hráče ----------
const chat = { msgs: [], last: 0, seen: 0, timer: null };
try { chat.seen = Number(localStorage.getItem('ekofarm_chat_seen') || 0); } catch { /* nevadí */ }
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function chatPoll() {
  if (!game.farm || game.backend.mode !== 'online') return;
  try {
    const r = await game.backend.chatGet(chat.last);
    if (r.msgs.length) {
      chat.msgs = chat.msgs.concat(r.msgs).slice(-100);
      chat.last = r.msgs[r.msgs.length - 1].id;
      if (game.panel && game.panel.kind === 'chat') renderChat();
    }
  } catch { /* zkusíme příště */ }
  chatDot();
}
function chatDot() {
  const open = game.panel && game.panel.kind === 'chat';
  if (open && chat.last > chat.seen) { chat.seen = chat.last; try { localStorage.setItem('ekofarm_chat_seen', String(chat.seen)); } catch { /* nevadí */ } }
  $('chatDot').hidden = open || !chat.msgs.some(m => m.id > chat.seen && m.name !== game.name);
}
function renderChat() {
  const body = $('panelBody');
  if (!$('chatList')) {
    setTitle(':chat: Chat všech farmářů');
    body.innerHTML = game.backend.mode !== 'online'
      ? '<div class="empty">Chat funguje jen v online hře.</div>'
      : '<div id="chatList" class="chat-list"></div><form id="chatForm" class="chat-form"><input id="chatInput" maxlength="200" autocomplete="off" placeholder="Napiš zprávu…"><button class="btn sm" type="submit">Poslat</button></form><p class="muted">Buď na ostatní hodný. Zprávy se po 7 dnech mažou.</p>';
    if (!$('chatForm')) return;
    $('chatForm').addEventListener('submit', async e => {
      e.preventDefault();
      const text = $('chatInput').value.trim();
      if (!text) return;
      try { await game.backend.chatSend(text); $('chatInput').value = ''; chatPoll(); } catch (err) { toast(err.message); }
    });
  }
  const list = $('chatList');
  if (!list) return;
  const atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  list.innerHTML = chat.msgs.length ? chat.msgs.map(m => {
    const mine = m.name === game.name;
    const time = new Date(m.t).toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg${mine ? ' mine' : ''}"><div class="chat-head">${mine ? 'Ty' : `<button class="chat-name" data-act="visit" data-v="${escHtml(m.name)}">${escHtml(m.name)}</button>`} <small>${time}</small></div><div>${escHtml(m.text)}</div></div>`;
  }).join('') : '<div class="empty">Zatím tu nikdo nic nenapsal. Pozdrav ostatní!</div>';
  if (atEnd || !list.dataset.init) { list.scrollTop = list.scrollHeight; list.dataset.init = '1'; }
  chatDot();
}
$('chatBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'chat') { closeSheets(); return; }
  openPanel({ kind: 'chat' });
  chatPoll();
});
setInterval(() => { if (game.panel && game.panel.kind === 'chat') chatPoll(); }, 4000);
setInterval(() => { if (!game.panel || game.panel.kind !== 'chat') chatPoll(); }, 20000);
$('newsBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'news') { closeSheets(); return; }
  openPanel({ kind: 'news' });
  try { localStorage.setItem('ekofarm_news', String(NEWS[0].v)); } catch { /* nevadí */ }
  $('newsDot').hidden = true;
});
$('bannerClose').addEventListener('click', () => { cancelPlace(); setSow(null); });

$('buildBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'build') { closeSheets(); return; }
  openPanel({ kind: 'build' });
});
$('shopBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'shop') { closeSheets(); return; }
  openPanel({ kind: 'shop', tab: game.lastTab });
});
const openSilo = () => { cancelPlace(); openPanel({ kind: 'silo' }); };
$('siloBtn').addEventListener('click', openSilo);
$('centerBtn').addEventListener('click', () => { cancelPlace(); openPanel({ kind: 'center', tab: 'prehled' }); });
// v34: tečka u Centra = kritické upozornění; zpráva o nepřítomnosti se po dohnání práce týmu ukáže jednou sama
setInterval(() => {
  const f = game.farm;
  if (!f || game.visit) return;
  $('centerDot').hidden = !farmAlerts(f, now()).some(a => a.lvl === 0);
  const a = f.away;
  if (a && a.done && !a.seen && !game.panel && !game.place && !game.fishing && game.awayShown !== a.from && villLag(f, now()) < 60_000) {
    game.awayShown = a.from;
    openPanel({ kind: 'center', tab: 'prehled' });
  }
  v36Check(f);
}, 3000);
// v36: událost (tlačítko vlevo, sama se otevře jednou za půlden), dočasné změny, pomoc od kamarádů, odměna ze soutěže
function v36Check(f) {
  const t = now(), ev = eventNow(f, t), fx = fxActive(f, t);
  $('eventBtn').hidden = !ev && !fx.length;
  $('eventDot').hidden = !ev;
  if (ev && !game.panel && !game.place && !game.fishing && !game.sowCrop && lsGetN('ekofarm_ev') !== ev.slot) {
    lsSetN('ekofarm_ev', ev.slot);
    openPanel({ kind: 'event' });
    sfx('level');
    return;
  }
  const seen = f.hs || 0, news = (f.helped || []).filter(h => h.t > seen);
  if (news.length && !game.place && !game.fishing) {
    toast(news.map(h => `:gift: <b>${h.n.replace(/</g, '&lt;')}</b> ti pomohl: ${h.w}`).join('<br>') + `<br><small>+${news.length * 10} :xp: a pár mincí</small>`, 'lvlup', 4000);
    act({ type: 'helpSeen' }, true);
  }
  if (f.wk && f.wk.prize && !game.place && !game.fishing) {
    const p = f.wk.prize;
    toast(`:trophy: Týdenní soutěž: <b>${p.rank}. místo!</b><br>+${p.coins} :coin: +${p.xp} :xp:`, 'lvlup', 5000);
    sfx('level');
    act({ type: 'weekSeen' }, true);
  }
}
const lsGetN = k => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const lsSetN = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* nevadí */ } };
$('eventBtn').addEventListener('click', () => { cancelPlace(); openPanel({ kind: 'event' }); });
$('coinBtn').addEventListener('click', openSilo);
$('wikiBtn').addEventListener('click', () => { cancelPlace(); openPanel({ kind: 'wiki', tab: game.wikiTab }); });
$('teamBtn').addEventListener('click', () => { cancelPlace(); openPanel({ kind: 'team', f: 'all' }); });   // mince se vydělávají prodejem ve skladu
$('siloBtn2').addEventListener('click', openSilo);

$('menuBtn').addEventListener('click', () => {
  closeSheets();
  $('menuName').textContent = game.name;
  $('menuMode').textContent = game.backend.mode === 'local'
    ? 'Testovací verze – farma se ukládá jen v tomhle prohlížeči. „Odhlásit“ farmu smaže a začneš znovu.'
    : 'Farma se ukládá na server, můžeš hrát z více zařízení.' + (game.google ? ' Přihlašuješ se přes Google.' : '');
  $('gLinkWrap').hidden = !(googleReady && !game.google);
  if (googleReady && !game.google) renderGoogleButton('gLinkBtn', 'signin');
  menuLabels();
  pushLabel();
  $('menuPanel').hidden = false;
  backGuard();
});
$('logoutBtn').addEventListener('click', async () => {
  await game.backend.logout();
  closeSheets();
  game.farm = null;
  game.queue = [];
  if (game.backend.mode === 'local') location.reload(); else showLogin();
});

// ---------- přihlášení ----------
function showLogin() {
  $('loading').hidden = true;
  $('hud').hidden = true;
  $('login').hidden = false;
}
async function doAuth(kind) {
  const name = $('lName').value.trim(), pass = $('lPass').value;
  $('lErr').textContent = '';
  try {
    const res = await (kind === 'login' ? game.backend.login(name, pass) : game.backend.register(name, pass));
    enterGame(res);
  } catch (e) {
    $('lErr').textContent = e.message;
  }
}
$('loginBtn').addEventListener('click', () => doAuth('login'));
$('regBtn').addEventListener('click', () => doAuth('register'));
$('lPass').addEventListener('keydown', e => { if (e.key === 'Enter') doAuth('login'); });

function enterGame(res) {
  game.name = res.name;
  game.google = !!res.google;
  applyServer(res);
  farmAssets(game.farm);
  $('login').hidden = true;
  $('loading').hidden = true;
  $('hud').hidden = false;
  centerCamera();
  clampCam();
  setSow(null);
  updateWeather();
  chatPoll();
  if (res.created && res.google) toast(`Vítej na farmě, ${res.name}! :wheat:`, '', 2500);
  startIntro();
}

// úvod nové farmy: nejdřív sklad, pak 6 polí zdarma
function startIntro() {
  const f = game.farm;
  if (game.place) return;
  if (f.pending.includes('sklad')) {
    startPlace('sklad');   // co dělat, říká lišta nahoře
  } else if (f.plots.length < FREE_PLOTS) {
    startPlace('plot');
  } else if (canClaimDaily(f, now()) && !game.dailyHinted) {   // připomenout jen jednou za spuštění hry
    game.dailyHinted = true;
    toast(':gift: Denní odměna čeká v <b>Úkolech</b>!', '', 2800);
  }
}

// ---------- přihlášení přes Google ----------
let googleReady = false;
let googleClientId = null;

function renderGoogleButton(elId, text) {
  const el = $(elId);
  el.innerHTML = '';
  window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text, locale: 'cs', width: 260 });
}

async function onGoogle(resp) {
  const linking = !!game.farm;
  try {
    const res = await game.backend.google(resp.credential, linking ? 'link' : 'login');
    if (linking) {
      game.google = true;
      $('gLinkWrap').hidden = true;
      toast('✓ Farma je propojená s Googlem');
    } else enterGame(res);
  } catch (e) {
    if (linking) toast(e.message); else $('lErr').textContent = e.message;
  }
}

async function initGoogle() {
  if (game.backend.mode !== 'online') return;
  const cfg = await game.backend.config();
  if (!cfg.googleClientId) return;
  googleClientId = cfg.googleClientId;
  await new Promise(resolve => {
    const sc = document.createElement('script');
    sc.src = 'https://accounts.google.com/gsi/client';
    sc.async = true;
    sc.onload = resolve;
    sc.onerror = resolve;
    document.head.appendChild(sc);
  });
  if (!window.google || !window.google.accounts) return;
  window.google.accounts.id.initialize({ client_id: googleClientId, callback: onGoogle, ux_mode: 'popup' });
  googleReady = true;
  $('gWrap').hidden = false;
  renderGoogleButton('gBtn', 'continue_with');
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && game.farm) refresh(); });

// Grafika se načítá hned při startu. Na spuštění hry se čeká jen na to, co je vidět hned (země, lidé, zvířata, les
// a co má hráč na farmě), nejdéle 6 s – pak se hra spustí tak jako tak a zbytek se dokreslí, až dorazí.
// Ostatní plodiny, stromy a stroje se načítají na pozadí; budovy až když je hráč postaví (šetří paměť telefonu).
const loadingText = (n, total) => { if (!$('loading').hidden) $('loading').textContent = `Načítám farmu… ${Math.round(n / total * 100)} %`; };
const farmAssetList = farm => {
  const out = [...['t', 'p', 'z'], ...['les_a', 'les_b', 'les_c'].map(n => ['s', n]), ...['prodejna', 'stanek', 'trziste', 'domek_a', 'domek_b', 'domek_c'].map(n => ['b', n])];
  const crop = c => { for (let i = 0; i < 3; i++) out.push(['c', `${c}_${i}`]); };
  for (const p of farm.plots) if (p.crop) crop(p.crop);
  for (const o of farm.objects) {
    out.push(['b', spriteName(o)]);
    if (o.tree) for (const s of ['grow', 'ready', 'dead']) out.push(['s', `${o.tree}_${s}`]);
    if (o.kind === 'velkepole' && (o.crop || o.load)) crop(o.crop || o.load.item);
  }
  return out;
};
const farmAssets = (farm, onProgress) => preloadAssets(farmAssetList(farm), onProgress);
preloadAssets(['t', 'p', 'z', 'c', 's', 'm']);   // na pozadí, nic na to nečeká
(async function boot() {
  initGoogle();
  if (game.backend.mode === 'online' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(r => { swReg = r; }).catch(() => {});
  }
  try {
    const res = await game.backend.start();
    clearTimeout(window.__ekoFatal);   // server odpověděl – hlášku „hra se nenačetla“ už není proč ukazovat
    if (!res) showLogin();
    else {
      await Promise.race([farmAssets(normalize(res.farm), loadingText), new Promise(r => setTimeout(r, 6000))]);
      enterGame(res);
    }
  } catch (e) {
    clearTimeout(window.__ekoFatal);
    if (e.code === 'old_client' && reloadApp()) return;
    $('loading').textContent = e.message + ' Obnov stránku.';
  }
  requestAnimationFrame(frame);
})();
