// EKOfarm – hlavní herní smyčka, ovládání a UI.
import {
  CROP_LIST, CROPS, ITEMS, BUILDINGS, ANIMALS, GRID_W, GRID_H, ERRORS,
  applyAction, normalize, plotState, findPlot, findObject, objectAt, objectStatus, fits,
  siloUsed, levelProgress, maxPlots, plotPrice, have,
  TREES, TREE_LIST, FREE_PLOTS, treeState, maxOrchards, orchardPrice, countKind,
  MACHINES, MACHINE_LIST, sellPrice, freeMachine, fieldState, objSize, FIELD_MIN, FIELD_MAX, FIELD_CELL_PRICE, maxBigFields,
} from './rules.js?v=7';
import { drawScene, screenToCell, cellCenter, fmtTime } from './render.js?v=7';
import { createBackend, ApiError } from './api.js?v=7';
import { iconize, ic } from './icons.js?v=7';
import { sfx, soundOn, setSound } from './sfx.js?v=7';
import { tasksHtml, canClaimDaily, claimableAch, shopHtml, buildHtml, statekHtml, orchardHtml, dealerHtml, bigfieldHtml, factoryHtml, penHtml, decoHtml, siloHtml, siloTitle } from './panels.js?v=7';

const $ = id => document.getElementById(id);
const APP_VERSION = 7;


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
};
const now = () => Date.now() + game.offset;
window.__eko = game; // pro testy a ladění

// ---------- canvas ----------
const canvas = $('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
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
  c.zoom = Math.max(0.4, Math.min(2.4, c.zoom));
  const [lx] = cellCenter(0, GRID_H), [rx] = cellCenter(GRID_W, 0);
  const [, ty] = cellCenter(0, 0), [, by] = cellCenter(GRID_W, GRID_H);
  c.x = Math.max(lx, Math.min(rx, c.x));
  c.y = Math.max(ty - 60, Math.min(by, c.y));
}

const sizeOf = kind => (kind === 'plot' ? { w: 1, h: 1 } : BUILDINGS[kind]);
const placeSize = () => ({ w: game.place.w, h: game.place.h });

function ghostView() {
  const p = game.place;
  if (!p) return null;
  const s = placeSize();
  return { kind: p.kind, x: p.x, y: p.y, w: s.w, h: s.h, moveId: p.moveId, ok: fits(game.farm, p.x, p.y, s.w, s.h, p.moveId || 0) };
}

function frame(t) {
  if (game.farm) {
    const d = new Date();
    game.hour = game.dayNight === false ? undefined : d.getHours() + d.getMinutes() / 60;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (game.bubble && t > game.bubble.until) game.bubble = null;
    game.floats = game.floats.filter(f => t - f.t0 < 1300);
    drawScene(ctx, {
      farm: game.farm, now: now(), t, cam: game.cam, W, H,
      ghost: ghostView(), hoverCell: game.hover, bubble: game.bubble, floats: game.floats, hour: game.hour,
    });
  }
  requestAnimationFrame(frame);
}

// ---------- akce ----------
const SFX_OF = {
  harvest: 'harvest', harvestTree: 'harvest', harvestAll: 'harvest', collect: 'harvest', fieldUnload: 'harvest', feed: 'plant',
  plant: 'plant', sowAll: 'plant', plantTree: 'plant', clearTree: 'build',
  sell: 'coin', deliver: 'coin', claimDaily: 'coin', claimAch: 'coin', upgradeSilo: 'coin',
  place: 'build', buyPlot: 'build', move: 'build', buyAnimal: 'build',
  fieldSow: 'engine', fieldHarvest: 'engine', fieldPlow: 'engine', fieldBale: 'engine', buyMachine: 'engine',
};
function act(a, silent) {
  const r = applyAction(game.farm, a, now());
  if (!r.ok) { if (!silent) { toast(ERRORS[r.error] || 'To teď nejde.'); sfx('error'); } return r; }
  sfx(r.gained && r.gained.levelUp ? 'level' : SFX_OF[a.type] || 'tap');
  game.queue.push(a);
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
    if (g.levelUp) {
      const unlocked = [...CROP_LIST, ...Object.values(BUILDINGS), ...Object.values(ANIMALS), ...TREE_LIST, ...MACHINE_LIST].filter(c => c.level === g.levelUp).map(c => c.name);
      toast(`:trophy: Úroveň ${g.levelUp}!` + (unlocked.length ? `<br><small>Nově: ${unlocked.join(', ')}</small>` : '<br><small>Můžeš koupit další pole.</small>'), 'lvlup', 3000);
    }
  }
  if (a.type === 'plant') floatAt(a.x, a.y, `−${CROPS[a.crop].cost} :coin:`);
  updateHud();
}

let flushTimer = null;
function scheduleFlush(delay = 350) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, delay);
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
  for (const a of game.queue) applyAction(game.farm, a, now());
  updateHud();
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
  game.place.x = Math.max(0, Math.min(GRID_W - s.w, x));
  game.place.y = Math.max(0, Math.min(GRID_H - s.h, y));
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
  if (game.place) {
    if (inGhost(cell)) { gesture.mode = 'ghost'; gesture.off = [cell[0] - game.place.x, cell[1] - game.place.y]; }
    return;
  }
  const plot = findPlot(game.farm, cell[0], cell[1]);
  const st = plot && plotState(plot, now());
  const tree = readyTreeAt(cell);
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
  if (gesture.mode === 'pending' && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 9) gesture.mode = 'pan';
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

function startPinch() {
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
  const c = game.cam;
  const wx = (sx - W / 2) / c.zoom + c.x, wy = (sy - H / 2) / c.zoom + c.y;
  c.zoom = Math.max(0.4, Math.min(2.4, c.zoom * factor));
  c.x = wx - (sx - W / 2) / c.zoom;
  c.y = wy - (sy - H / 2) / c.zoom;
  clampCam();
}
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

function onTap([gx, gy]) {
  if (game.place) {
    const s = placeSize();
    setGhost(gx - Math.floor((s.w - 1) / 2), gy - Math.floor((s.h - 1) / 2));
    return;
  }
  const o = objectAt(game.farm, gx, gy);
  if (o) { tapObject(o); return; }
  const plot = findPlot(game.farm, gx, gy);
  if (!plot) { setSow(null); return; }
  const st = plotState(plot, now());
  if (st.state === 'empty') openPicker(plot);
  else if (st.state === 'growing') game.bubble = { gx, gy, until: performance.now() + 2500 };
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
  if (d.type === 'bigfield') {
    if (fieldState(o, now()).state === 'unload') {
      const r = act({ type: 'fieldUnload', id: o.id });
      if (r.ok && r.rest) toast(`${ERRORS.silo_full}<br><small>Na poli zbývá ${r.rest} kusů.</small>`);
    } else openPanel({ kind: 'obj', id: o.id });
    return;
  }
  if (d.type === 'main') { openPanel({ kind: 'obj', id: o.id }); return; }
  const st = objectStatus(o, now());
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
  for (let y = 0; y <= GRID_H - s.h; y++) for (let x = 0; x <= GRID_W - s.w; x++) {
    if (!fits(game.farm, x, y, s.w, s.h, moveId)) continue;
    const dd = (x - cx) ** 2 + (y - cy) ** 2;
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  return best;
}

function startPlace(kind, moveId) {
  closeSheets();
  setSow(null);
  let pos;
  const size = moveId ? objSize(findObject(game.farm, moveId)) : kind === 'velkepole' ? { w: 4, h: 4 } : sizeOf(kind);
  if (moveId) { const o = findObject(game.farm, moveId); pos = [o.x, o.y]; }
  else {
    const [cx, cy] = screenToCell(W / 2, H / 2, game.cam, W, H);
    pos = nearestFree(size, cx, cy) || [cx, cy];
  }
  game.place = { kind, moveId, x: 0, y: 0, w: size.w, h: size.h };
  setGhost(pos[0], pos[1]);
  updateBanner();
}

function confirmPlace() {
  const p = game.place;
  if (!p) return;
  if (p.kind === 'plot') {
    const r = act({ type: 'buyPlot', x: p.x, y: p.y });
    if (!r.ok) return;
    floatAt(p.x, p.y, 'Nové pole!');
    if (game.farm.plots.length >= maxPlots(game.farm.level)) { cancelPlace(); return; }
    const next = nearestFree({ w: 1, h: 1 }, p.x + 1, p.y);
    if (next) setGhost(next[0], next[1]);
    updateBanner();
    return;
  }
  const r = p.moveId
    ? act({ type: 'move', id: p.moveId, x: p.x, y: p.y })
    : act(p.kind === 'velkepole' ? { type: 'place', kind: p.kind, x: p.x, y: p.y, w: p.w, h: p.h } : { type: 'place', kind: p.kind, x: p.x, y: p.y });
  if (!r.ok) return;
  if (!p.moveId && p.kind === 'sad' && countKind(game.farm, 'sad') < maxOrchards(game.farm.level) && game.farm.coins >= orchardPrice(game.farm)) {
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
function updateHud() {
  const f = game.farm;
  $('coins').textContent = f.coins;
  $('lvlNum').textContent = f.level;
  const lp = levelProgress(f);
  $('xpFill').style.width = Math.min(100, 100 * lp.cur / lp.need) + '%';
  $('silo').textContent = `${siloUsed(f)}/${f.siloCap}`;
  $('tasksDot').hidden = !(canClaimDaily(f, now()) || claimableAch(f));
  if (game.panel) renderPanel();
  if (!$('picker').hidden && game.pickPlot) renderPicker();
  updateBanner();
}

let toastTimer = null;
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

// obecný panel (obchod, budova, sklad)
function openPanel(p) {
  closeSheets();
  game.panel = p;
  renderPanel();
  $('panel').hidden = false;
  $('panel').scrollTop = 0;
}
function renderPanel() {
  const p = game.panel, f = game.farm;
  if (!p || !f) return;
  let title = '', body = '';
  if (p.kind === 'shop') { title = ':cart: Obchod'; body = shopHtml(f, p.tab); }
  else if (p.kind === 'build') { title = ':hammer: Stavět'; body = buildHtml(f); }
  else if (p.kind === 'dealer') { title = ':tractor: Prodejna strojů'; body = dealerHtml(f, now()); }
  else if (p.kind === 'silo') { title = ':barn: ' + siloTitle(f); body = siloHtml(f, now()); }
  else if (p.kind === 'tasks') { title = ':trophy: Úkoly a odměny'; body = tasksHtml(f, now(), p.tab, game.board); }
  else {
    const o = findObject(f, p.id);
    if (!o) { closeSheets(); return; }
    const d = BUILDINGS[o.kind];
    title = `:${d.icon}: ${d.name}`;
    body = d.type === 'factory' ? factoryHtml(f, o, now())
      : d.type === 'pen' ? penHtml(f, o, now())
      : d.type === 'main' ? statekHtml(f, game.name, now())
      : d.type === 'orchard' ? orchardHtml(f, o, now())
      : d.type === 'bigfield' ? bigfieldHtml(f, o, now())
      : decoHtml(f, o);
  }
  $('panelTitle').innerHTML = iconize(title);
  $('panelBody').innerHTML = iconize(body);
}
// živé odpočty – ale ne ve chvíli, kdy hráč zrovna klepe
let panelTouch = 0;
$('panel').addEventListener('pointerdown', () => { panelTouch = performance.now(); });
setInterval(() => {
  if (game.panel && ['obj', 'dealer', 'silo'].includes(game.panel.kind) && performance.now() - panelTouch > 700) renderPanel();
}, 1000);

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
      if (f.level < d.level) return toast(ERRORS.locked);
      if (v === 'sad' && countKind(f, 'sad') >= maxOrchards(f.level)) return toast(ERRORS.max_orchards);
      if (v === 'sad' && f.coins < orchardPrice(f)) return toast(ERRORS.no_coins);
      if (d.max && f.objects.filter(o => o.kind === v).length >= d.max) return toast(ERRORS.max_count);
      if (f.coins < d.cost) return toast(ERRORS.no_coins);
      startPlace(v);
      break;
    }
    case 'buyPlot':
      if (f.plots.length >= maxPlots(f.level)) return toast(ERRORS.max_plots);
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
      if (r.ok) { const o = findObject(f, game.panel.id); floatAt(o.x, o.y, `−${TREES[v].cost} :coin:`); closeSheets(); }
      break;
    }
    case 'clearTree': act({ type: 'clearTree', id: Number(v) }); break;
    case 'ttab': game.panel.tab = v; if (v === 'zebricek') loadBoard(); renderPanel(); break;
    case 'claimDaily': {
      const r = act({ type: 'claimDaily' });
      if (r.ok) toast(`:gift: Den ${r.streak}: +${r.coins} :coin:`, 'lvlup', 2200);
      break;
    }
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
      if (r.ok) toast(`:${MACHINES[v].icon}: ${MACHINES[v].name} je v garáži!`);
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
  closeSheets();
  game.pickPlot = plot;
  renderPicker();
  $('picker').hidden = false;
}
function renderPicker() {
  const f = game.farm;
  $('cropList').innerHTML = iconize(CROP_LIST.map(c => {
    const locked = f.level < c.level;
    return `<button class="crop${locked ? ' locked' : ''}" data-crop="${c.id}">
      <div class="ico">:${c.icon}:</div>
      <div class="nm">${c.name}</div>
      <div class="meta">${locked ? `:lock: úroveň ${c.level}` : `${c.cost} :coin: · :clock: ${fmtTime(c.time)}`}</div>
      <div class="meta">${locked ? '&nbsp;' : `sklizeň ${c.yield}× · ${c.price} :coin:/ks`}</div>
    </button>`;
  }).join(''));
}
$('cropList').addEventListener('click', e => {
  const b = e.target.closest('[data-crop]');
  if (!b || !game.pickPlot) return;
  const c = CROPS[b.dataset.crop];
  if (game.farm.level < c.level) { toast(ERRORS.locked); return; }
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
    if (p.kind === 'plot') text = f.plots.length < FREE_PLOTS
      ? `:plot: Pole zdarma ${f.plots.length + 1}/${FREE_PLOTS} – posuň, kam chceš, a potvrď`
      : `:plot: Nové pole za ${plotPrice(f)} :coin: (${f.plots.length}/${maxPlots(f.level)}) – posuň a potvrď`;
    else if (p.kind === 'sad' && !p.moveId) text = `:tree: Sad za ${orchardPrice(f)} :coin: (${countKind(f, 'sad')}/${maxOrchards(f.level)}) – posuň a potvrď`;
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
function loadBoard() {
  game.board = null;
  game.backend.leaderboard().then(b => { game.board = b; if (game.panel && game.panel.kind === 'tasks') renderPanel(); })
    .catch(() => { game.board = { top: [], me: null }; renderPanel(); });
}
$('tasksBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'tasks') { closeSheets(); return; }
  openPanel({ kind: 'tasks', tab: 'odmeny' });
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
$('dealerBtn').addEventListener('click', () => {
  cancelPlace();
  if (game.panel && game.panel.kind === 'dealer') { closeSheets(); return; }
  openPanel({ kind: 'dealer' });
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
  $('menuPanel').hidden = false;
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
  $('login').hidden = true;
  $('loading').hidden = true;
  $('hud').hidden = false;
  centerCamera();
  clampCam();
  setSow(null);
  if (res.created && res.google) toast(`Vítej na farmě, ${res.name}! :wheat:`, '', 2500);
  startIntro();
}

// úvod nové farmy: nejdřív sklad, pak 6 polí zdarma
function startIntro() {
  const f = game.farm;
  if (game.place) return;
  if (f.pending.includes('sklad')) {
    startPlace('sklad');
    toast(':barn: Dostal jsi sklad zdarma.<br><small>Posuň ho, kam chceš, a potvrď ✓</small>', '', 3500);
  } else if (f.plots.length < FREE_PLOTS) {
    startPlace('plot');
    toast(`:plot: Postav si ${FREE_PLOTS - f.plots.length} polí zdarma.<br><small>Každé posuň, kam chceš, a potvrď ✓</small>`, '', 3500);
  } else if (canClaimDaily(f, now())) {
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

(async function boot() {
  initGoogle();
  try {
    const res = await game.backend.start();
    if (res) enterGame(res); else showLogin();
  } catch (e) {
    $('loading').textContent = e.message + ' Obnov stránku.';
  }
  requestAnimationFrame(frame);
})();
