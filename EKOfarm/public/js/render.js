// EKOfarm – izometrické vykreslování farmy na canvas (dlaždice, pole, plodiny a stromy z obrázků).
import { GRID_W, GRID_H, CROPS, plotState, objSize, WORLD, LAND_PARCELS, landOwned, landReachable, landPrice, landLevel, TOWN, TOWN_BUILDINGS, TOWN_HOUSES, isRoad, isPlaza, townAt, townObject, villAt, workAreas, areaOf, isFarmer } from './rules.js?v=31';
import { drawObject, drawGhost, objectDepth, drawPerson, drawTownHouse, drawCropImg, cropStage, bubble } from './objects.js?v=31';
import { drawIconText, drawIcon } from './icons.js?v=31';
import { asset } from './sprites.js?v=31';

export const TW = 96;   // šířka dlaždice
export const TH = 48;   // výška dlaždice

// střed dlaždice v izometrických souřadnicích
export function cellCenter(gx, gy) {
  return [(gx - gy) * TW / 2, (gx + gy + 1) * TH / 2];
}

export function screenToCell(sx, sy, cam, W, H) {
  const ix = (sx - W / 2) / cam.zoom + cam.x;
  const iy = (sy - H / 2) / cam.zoom + cam.y;
  const a = ix / (TW / 2), b = iy / (TH / 2);
  return [Math.floor((b + a) / 2), Math.floor((b - a) / 2)];
}

export function cellToScreen(gx, gy, cam, W, H) {
  const [ix, iy] = cellCenter(gx, gy);
  return [(ix - cam.x) * cam.zoom + W / 2, (iy - cam.y) * cam.zoom + H / 2];
}

// stromy kolem farmy a v divočině nekoupených pozemků (deterministické); na koupené zemi se nekreslí
const BG_TREES = (() => {
  const out = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // u cesty, na náměstí, na budovách městečka a těsně před nimi stromy nerostou (zakrývaly by je)
  const nearTown = (x, y) => (x >= GRID_W - 1 && y >= GRID_H - 1 && Math.abs(x - y) <= 2) || isPlaza(x - 1, y - 1) || isPlaza(x + 1, y + 1)
    || TOWN_BUILDINGS.some(b => x >= b.x - 1 && y >= b.y - 1 && x < b.x + 6 && y < b.y + 6)
    || TOWN_HOUSES.some(h => x >= h[0] - 1 && y >= h[1] - 1 && x < h[0] + 4 && y < h[1] + 4);
  for (let gy = WORLD.y0 - 6; gy < TOWN.y1 + 4; gy++) {
    for (let gx = WORLD.x0 - 6; gx < TOWN.x1 + 4; gx++) {
      if (gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H) continue;
      const inWorld = gx >= WORLD.x0 && gy >= WORLD.y0 && gx < WORLD.x1 && gy < WORLD.y1;
      const inTown = gx >= TOWN.x0 && gy >= TOWN.y0;
      const r = rnd(), s = 0.8 + rnd() * 0.5, h = rnd();
      if (nearTown(gx, gy)) continue;
      if (r < (inTown ? 0.07 : inWorld ? 0.16 : 0.35)) out.push({ gx, gy, s, h });
    }
  }
  return out;
})();

function diamond(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

// dlaždice země (obrázek); dokud se nenačte, jen barevný kosočtverec
const BASE = '#62a240';
const TILE_NAMES = ['trava_a', 'trava_b', 'louka_a', 'louka_b', 'cesta_a', 'cesta_b', 'dlazba', 'plot_se', 'plot_ne'];
const hash2 = (gx, gy) => ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
function tile(ctx, name, gx, gy, color) {
  const [x, y] = cellCenter(gx, gy);
  const im = asset('t', name);
  if (im) ctx.drawImage(im, x - TW / 2 - 1, y - TH / 2 - 0.5, TW + 2, (TW + 2) * im.naturalHeight / im.naturalWidth);
  else { diamond(ctx, x, y, TW + 1, TH + 1); ctx.fillStyle = color; ctx.fill(); }
}
function groundTile(farm, gx, gy) {
  const inWorld = gx >= WORLD.x0 && gy >= WORLD.y0 && gx < WORLD.x1 && gy < WORLD.y1;
  const road = isRoad(gx, gy) || (gx >= TOWN.x1 - 1 && gy >= TOWN.y1 - 1 && Math.abs(gx - gy) <= 1);
  const v = hash2(gx, gy) % 3 === 0 ? 'b' : 'a';
  if (isPlaza(gx, gy) || townAt(gx, gy)) return ['dlazba', '#cdb892'];
  if (road) return ['cesta_' + v, '#b48a58'];
  if (inWorld) return landOwned(farm, gx, gy) ? ['trava_' + v, '#7cc251'] : ['louka_' + v, '#62a240'];
  if (gx >= TOWN.x0 && gy >= TOWN.y0 && gx < TOWN.x1 + 3 && gy < TOWN.y1 + 3) return ['trava_' + v, '#6aae45'];
  return ['louka_' + v, BASE];   // louka i za okrajem mapy
}

// les kolem farmy
function drawTree(ctx, t) {
  const im = asset('s', 'les_' + 'abc'[Math.floor(t.h * 3)]);
  if (!im) return;
  const [x, y] = cellCenter(t.gx, t.gy);
  const w = 96 * t.s, h = 120 * t.s;
  ctx.drawImage(im, x - w / 2, y + 8 - 91 * t.s, w, h);
}

// plot kolem vlastní země – jen na hranách, kde vlastní políčko sousedí s cizím
function drawFence(ctx, farm, vis) {
  const corner = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2];
  const se = asset('t', 'plot_se'), ne = asset('t', 'plot_ne');
  const seg = (a, b, im) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (!im) { ctx.strokeStyle = '#9b6b3c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1] - 8); ctx.lineTo(b[0], b[1] - 8); ctx.stroke(); return; }
    const w = TW / 2 + 8, h = w * im.naturalHeight / im.naturalWidth;
    ctx.drawImage(im, mx - w / 2, my + TH / 4 + 3 - h, w, h);
  };
  eachCell({ d0: vis.d0 - 1, d1: vis.d1 + 1, s0: vis.s0, s1: vis.s1 + 3 }, (gx, gy) => {
    if (gx < WORLD.x0 || gy < WORLD.y0 || gx >= WORLD.x1 || gy >= WORLD.y1 || !landOwned(farm, gx, gy)) return;
    if (!landOwned(farm, gx, gy - 1)) seg(corner(gx, gy), corner(gx + 1, gy), se);
    if (!landOwned(farm, gx - 1, gy)) seg(corner(gx, gy), corner(gx, gy + 1), ne);
    if (!landOwned(farm, gx + 1, gy)) seg(corner(gx + 1, gy), corner(gx + 1, gy + 1), ne);
    if (!landOwned(farm, gx, gy + 1)) seg(corner(gx, gy + 1), corner(gx + 1, gy + 1), se);
  });
}

const TOWN_NAMES = { prodejna: 'Prodejna strojů', stanek: 'Stánek', trziste: 'Tržiště' , nastenka: 'Nástěnka' };
function townLabel(ctx, o) {
  const tb = TOWN_BUILDINGS.find(b => b.kind === o.kind) || {};
  const [x, y] = cellCenter(o.x + ((tb.w || 3) - 1) / 2, o.y + ((tb.h || 3) - 1) / 2);
  ctx.font = '800 15px system-ui, sans-serif';
  const text = TOWN_NAMES[o.kind] || '';
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = 'rgba(74,50,24,0.85)';
  roundRect(ctx, x - w / 2, y + 30, w, 24, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 47);
}

// cedule „Na prodej“ uprostřed nekoupeného pozemku
function drawSaleSign(ctx, farm, p) {
  const [x, y] = cellCenter(p.x + p.w / 2 - 0.5, p.y + p.h / 2 - 0.5);
  const im = asset('t', 'cedule');
  if (im) ctx.drawImage(im, x - 48, y + 4 - 96 * im.naturalHeight / im.naturalWidth, 96, 96 * im.naturalHeight / im.naturalWidth);
  ctx.fillStyle = '#4a3218'; ctx.textAlign = 'center';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.fillText('NA PRODEJ', x, y - 66);
  ctx.font = '700 13px system-ui, sans-serif';
  if (farm.level < landLevel(farm)) {
    drawIcon(ctx, 'lock', x - 30, y - 52, 14);
    ctx.fillText(`úroveň ${landLevel(farm)}`, x + 6, y - 48);
  } else drawIconText(ctx, `${landPrice(farm)} :coin:`, x, y - 48, 15);
}

// malé pole: záhon a plodina z obrázku
function drawPlot(ctx, p, now, t) {
  const [x, y] = cellCenter(p.x, p.y);
  const im = asset('t', 'pole');
  if (im) ctx.drawImage(im, x - TW / 2 + 3, y - TH / 2 + 1.5, TW - 6, (TW - 6) * im.naturalHeight / im.naturalWidth);
  else { diamond(ctx, x, y, TW - 8, TH - 4); ctx.fillStyle = '#8e5d33'; ctx.fill(); }
  if (!p.crop) return;
  const st = plotState(p, now);
  drawCropImg(ctx, p.crop, x, y, cropStage(st.progress, st.state === 'ready'), t);
  if (st.state === 'ready') {
    const a = 0.5 + 0.5 * Math.sin(t / 250);
    ctx.fillStyle = `rgba(255,255,220,${0.4 + a * 0.5})`;
    ctx.beginPath(); ctx.arc(x + 16, y - 30 - a * 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

// Které buňky jsou vidět ve výřezu světa (x0, y0, x1, y1 v izometrických pixelech). Počítá se v úhlopříčných
// souřadnicích d = gx − gy (zleva doprava) a s = gx + gy (shora dolů) – tak se neprochází nic, co je mimo obrazovku.
function visibleCells(x0, y0, x1, y1) {
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));   // mapa je malá – meze chrání před nekonečnou smyčkou při nesmyslné kameře
  return { d0: lim(Math.floor(x0 / (TW / 2)) - 1, -400, 400), d1: lim(Math.ceil(x1 / (TW / 2)) + 1, -400, 400),
    s0: lim(Math.floor(y0 / (TH / 2)) - 3, -400, 400), s1: lim(Math.ceil(y1 / (TH / 2)) + 1, -400, 400) };
}
function eachCell(vis, fn) {   // odzadu dopředu
  for (let s = vis.s0; s <= vis.s1; s++) {
    for (let d = vis.d0 + ((s + vis.d0) & 1); d <= vis.d1; d += 2) fn((s + d) / 2, (s - d) / 2);
  }
}

// ---------- země: tráva, louka, cesta, náměstí a plot ----------
function drawGroundTiles(ctx, farm, vis) {
  eachCell(vis, (gx, gy) => { const g = groundTile(farm, gx, gy); tile(ctx, g[0], gx, gy, g[1]); });
  drawFence(ctx, farm, vis);
}
// Země se nemění, proto se nakreslí jednou do zásobního plátna (o kus většího než obrazovka) a při posouvání
// mapy se z něj jen kopíruje. Když se vyjede z okraje, zásoba se posune a dokreslí se jen nový pruh;
// celá znovu se kreslí při změně přiblížení nebo když přibude pozemek.
// Pojistka: kdyby to prohlížeč nezvládl (chyba, nebo se do zásoby nic nenakreslí), zásoba se vypne
// a země se kreslí přímo jako dřív – hra kvůli tomu nesmí zůstat stát.
const ground = { c: null, key: '', x0: 0, y0: 0, x1: 0, y1: 0, zoom: 0, off: false };
const GROUND_MAX = 9e6;   // nejvýš tolik pixelů zásobního plátna (paměť telefonu)
export const groundInfo = () => ({ zasoba: !ground.off && !!ground.c, vypnuto: ground.off, proc: ground.err || '' });   // pro ladění: window.__eko.ground()
function groundDirect(ctx, farm, left, top, vw, vh) {
  ctx.fillStyle = BASE; ctx.fillRect(left, top, vw, vh);
  drawGroundTiles(ctx, farm, visibleCells(left, top, left + vw, top + vh));
}
function groundCached(ctx, farm, left, top, vw, vh, k, cw, ch, margin) {
  const key = `${k}|${farm.land}|${TILE_NAMES.filter(n => asset('t', n)).length}`;
  const stale = ground.key !== key;
  if (stale || left < ground.x0 || top < ground.y0 || left + vw > ground.x1 || top + vh > ground.y1) {
    if (!ground.c) ground.c = document.createElement('canvas');
    const c = ground.c;
    const fresh = c.width !== cw || c.height !== ch;
    if (fresh) { c.width = cw; c.height = ch; }
    const g = c.getContext('2d', { alpha: false });
    if (!g) throw new Error('zásobní plátno nemá kontext');
    const paint = (px, py, pw, ph) => {            // dokreslí obdélník zásoby (v pixelech displeje)
      const wx = ground.x0 + px / k, wy = ground.y0 + py / k;
      g.save();
      try {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.beginPath(); g.rect(px, py, pw, ph); g.clip();
        g.setTransform(k, 0, 0, k, -ground.x0 * k, -ground.y0 * k);
        g.fillStyle = BASE; g.fillRect(wx, wy, pw / k, ph / k);
        drawGroundTiles(g, farm, visibleCells(wx, wy, wx + pw / k, wy + ph / k));
      } finally { g.restore(); }
    };
    // nový výřez kolem obrazovky; proti starému posunutý o celé pixely displeje, aby šla stará část jen přesunout
    const sx = Math.round((left - vw * margin - ground.x0) * k), sy = Math.round((top - vh * margin - ground.y0) * k);
    ground.key = '';                               // kdyby kreslení spadlo, příště se začne znovu
    if (!stale && !fresh && Math.abs(sx) < cw && Math.abs(sy) < ch) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(c, -sx, -sy);
      ground.x0 += sx / k; ground.y0 += sy / k;
      if (sx) paint(sx > 0 ? cw - sx : 0, 0, Math.abs(sx), ch);
      if (sy) paint(0, sy > 0 ? ch - sy : 0, cw, Math.abs(sy));
    } else {
      ground.x0 = left - vw * margin; ground.y0 = top - vh * margin;
      paint(0, 0, cw, ch);
      if (fresh) {                                 // nové plátno: opravdu se do něj kreslí? (při nedostatku paměti zůstane prázdné)
        const px = g.getImageData(cw >> 1, ch >> 1, 1, 1).data;
        if (px[0] + px[1] + px[2] === 0) throw new Error('zásobní plátno je prázdné');
      }
    }
    ground.x1 = ground.x0 + cw / k; ground.y1 = ground.y0 + ch / k;
    ground.key = key;
  }
  ctx.save();
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);   // kopie přesně po pixelech displeje (ostrá a rychlá)
    ctx.drawImage(ground.c, -Math.round((left - ground.x0) * k), -Math.round((top - ground.y0) * k));
  } finally { ctx.restore(); }
}
function drawGround(ctx, farm, cam, W, H, dpr) {
  const vw = W / cam.zoom, vh = H / cam.zoom, left = cam.x - vw / 2, top = cam.y - vh / 2;
  const k = cam.zoom * dpr;                                 // pixelů displeje na 1 px světa
  const margin = Math.min(0.25, (Math.sqrt(GROUND_MAX / (W * H * dpr * dpr)) - 1) / 2);
  const cw = Math.ceil(W * dpr * (1 + 2 * margin)), ch = Math.ceil(H * dpr * (1 + 2 * margin));
  const zooming = cam.zoom !== ground.zoom;                 // při přibližování prsty rovnou na obrazovku
  ground.zoom = cam.zoom;
  if (!ground.off && !zooming && margin >= 0.05 && cw > 0 && ch > 0 && typeof document !== 'undefined') {
    try { groundCached(ctx, farm, left, top, vw, vh, k, cw, ch, margin); return; }
    catch (e) { ground.off = true; ground.c = null; ground.err = String(e && e.message); }
  }
  groundDirect(ctx, farm, left, top, vw, vh);
}

// vesničan má problém (nemá plán, došla semena, plný sklad…) – žlutý vykřičník nad hlavou
const VILL_WARN = new Set(['plan', 'seeds', 'inputs', 'feed', 'full', 'empty']);
function drawVillMark(ctx, x, y, v, now) {
  const j = v.job;
  if (j && j.e > j.s) {          // kolečko s průběhem úkonu
    const pr = Math.max(0, Math.min(1, (now - j.s) / (j.e - j.s)));
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x, y - 44, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#4f9d2b'; ctx.beginPath(); ctx.arc(x, y - 44, 7, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (VILL_WARN.has(v.w)) {
    ctx.fillStyle = '#ffd75a'; ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - 44, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3816'; ctx.font = '900 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y - 43.5);
    ctx.textBaseline = 'alphabetic';
  }
}
// kde farmář právě stojí (plynule přechází k políčku, na kterém pracuje)
const villPos = new Map();
// pracovní oblasti s farmářem: číslo oblasti nad horním políčkem, farmář chodí po oblasti za prací
function drawAreas(ctx, farm, view, t, seen) {
  const areas = workAreas(farm);
  for (const v of farm.vill) {
    const g = isFarmer(v) && areaOf(areas, v);
    if (!g) continue;
    let top = g.cells[0], front = g.cells[0];
    for (const c of g.cells) { if (c.x + c.y < top.x + top.y) top = c; if (c.x + c.y > front.x + front.y) front = c; }
    if (!seen(top.x, top.y) && !seen(front.x, front.y)) continue;
    // cíl: políčko, na kterém pracuje; jinak odpočívá u předního rohu oblasti
    let tx = front.x + 0.9, ty = front.y + 1.05, atWork = false;
    // sloučený úkon (v31): přechází z políčka na políčko podle toho, jak práce postupuje
    const j = v.job, cid = j && (j.ids ? j.ids[Math.min(j.ids.length - 1, Math.max(0, Math.floor((view.now - j.s) / Math.max(1, j.e - j.s) * j.ids.length)))] : j.id);
    if (j) for (const c of g.cells) if (c.id === cid) { tx = c.x + 0.62; ty = c.y + 0.86; atWork = true; break; }
    let p = villPos.get(v.id);
    if (!p || p.farm !== farm.created || Math.hypot(p.x - tx, p.y - ty) > 14) { p = { x: tx, y: ty, t, farm: farm.created, dir: -1 }; villPos.set(v.id, p); }
    const dt = Math.min(0.1, Math.max(0, (t - p.t) / 1000)); p.t = t;
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), stepLen = 3.2 * dt;
    const walking = dist > 0.04;
    if (walking) { const k = Math.min(1, stepLen / dist); p.x += dx * k; p.y += dy * k; if (Math.abs(dx - dy) > 0.02) p.dir = dx - dy > 0 ? 1 : -1; }
    const px = (p.x - p.y) * TW / 2, py = (p.x + p.y) * TH / 2;
    drawPerson(ctx, px, py, 'farmar', p.dir, t, walking, atWork && !walking);
    if (!walking) drawVillMark(ctx, px, py, v, view.now);
    const [x, y] = cellCenter(top.x, top.y);
    ctx.fillStyle = g.kind === 'pole' ? '#5fae34' : '#c8862e'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 30, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(g.n), x, y - 29.5); ctx.textBaseline = 'alphabetic';
  }
}

// view = { farm, now, t, cam, W, H, dpr, ghost, hoverCell, bubble, floats, hour, people, weather }
export function drawScene(ctx, view) {
  const { farm, cam, W, H, t } = view;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, farm, cam, W, H, view.dpr || 1);

  // co je na obrazovce: políčko (gx, gy) s půdorysem w × h; rezerva nahoru na vysoké budovy pod spodním okrajem
  const vis = visibleCells(cam.x - W / 2 / cam.zoom, cam.y - H / 2 / cam.zoom, cam.x + W / 2 / cam.zoom, cam.y + H / 2 / cam.zoom);
  const seen = (gx, gy, w = 1, h = 1) => {
    const d = gx - gy, s = gx + gy;
    return d + w >= vis.d0 && d - h <= vis.d1 && s + w + h >= vis.s0 && s - 10 <= vis.s1;
  };

  // pole, budovy, stromy a lidé v pořadí hloubky
  const ghost = view.ghost;
  const items = [];
  const mp = ghost && ghost.movePlot;   // přesouvané pole se kreslí jen na novém místě
  for (const p of farm.plots) if (seen(p.x, p.y) && !(mp && mp[0] === p.x && mp[1] === p.y)) items.push({ d: p.x + p.y + 1, p });
  for (const o of farm.objects) {
    if (ghost && ghost.moveId === o.id) continue;
    const sz = objSize(o);
    if (seen(o.x, o.y, sz.w, sz.h)) items.push({ d: objectDepth(o), o });
  }
  for (const tr of BG_TREES) if (seen(tr.gx, tr.gy) && !landOwned(farm, tr.gx, tr.gy)) items.push({ d: tr.gx + tr.gy + 1, tree: tr });
  for (const pp of view.people || []) items.push({ d: pp.gx + pp.gy + 0.05, person: pp });
  for (const b of TOWN_BUILDINGS) if (seen(b.x, b.y, b.w || 3, b.h || 3)) { const o = townObject(farm, b.kind); items.push({ d: objectDepth(o), o }); }
  TOWN_HOUSES.forEach((h, i) => { if (seen(h[0], h[1], 2, 2)) items.push({ d: h[0] + h[1] + 2, house: h, v: i }); });
  for (const p of LAND_PARCELS) {
    if (!farm.land.includes(p.id) && landReachable(farm, p)) items.push({ d: p.x + p.y + (p.w + p.h) / 2 + 0.5, sign: p });
  }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    if (it.p) drawPlot(ctx, it.p, view.now, t);
    else if (it.tree) drawTree(ctx, it.tree);
    else if (it.person) {
      const pp = it.person;
      drawPerson(ctx, (pp.gx - pp.gy) * TW / 2, (pp.gx + pp.gy) * TH / 2, pp.who, pp.dir, t, pp.walking, pp.work);
    } else if (it.sign) drawSaleSign(ctx, farm, it.sign);
    else if (it.house) {
      drawTownHouse(ctx, it.house[0], it.house[1], it.v);
      // v29: z tohohle domku se někdo ozval, že chce pracovat na farmě
      if (farm.board && farm.board.ads.some(ad => ad.self && ad.house === it.v && ad.ready <= view.now)) {
        const [x, y] = cellCenter(it.house[0] + 0.5, it.house[1] + 0.5);
        bubble(ctx, x, y - 120 + Math.sin(t / 300) * 2, 'helper', 1);
      }
    }
    else {
      drawObject(ctx, it.o, view.now, t, farm);
      // pracovníci stojí podél předního okraje budovy (v31: může jich být víc); při práci se hýbou a mají nad hlavou průběh
      const crew = !it.o.town && farm.vill && villAt(farm, it.o.id) ? farm.vill.filter(x => x.at === it.o.id) : null;
      if (crew) {
        const sz = objSize(it.o);
        crew.slice(0, 4).forEach((vg, i) => {
          const gx = it.o.x + 0.35 + i * Math.min(0.55, (sz.w - 0.5) / Math.max(1, crew.length - 1)), gy = it.o.y + sz.h + 0.1;
          const px = (gx - gy) * TW / 2, py = (gx + gy) * TH / 2;
          drawPerson(ctx, px, py, 'pomocnik', 1, t, false, !!vg.job);
          drawVillMark(ctx, px, py, vg, view.now);
        });
      }
    }
  }
  for (const it of items) if (it.o && it.o.town) townLabel(ctx, it.o);   // popisky městečka až navrch (domky je nezakryjí)
  if (farm.vill && farm.vill.some(isFarmer)) drawAreas(ctx, farm, view, t, seen);
  if (ghost) drawGhost(ctx, ghost, view.now, t);
  if (mp) {
    const p = farm.plots.find(q => q.x === mp[0] && q.y === mp[1]);
    if (p) { ctx.globalAlpha = 0.8; drawPlot(ctx, { ...p, x: ghost.x, y: ghost.y }, view.now, t); ctx.globalAlpha = 1; }
  }
  if (view.debug) {   // ladění grafiky: obrysy políček, která budovy zabírají (window.__eko.debug = true)
    ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 1.5;
    for (const it of items) {
      if (!it.o && !it.house) continue;
      const o = it.o || { x: it.house[0], y: it.house[1] }, sz = it.o ? objSize(it.o) : { w: 2, h: 2 };
      const c = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2];
      ctx.beginPath();
      [c(o.x, o.y), c(o.x + sz.w, o.y), c(o.x + sz.w, o.y + sz.h), c(o.x, o.y + sz.h)].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.stroke();
    }
  }

  if (view.hoverCell) {
    const [gx, gy] = view.hoverCell;
    const [x, y] = cellCenter(gx, gy);
    diamond(ctx, x, y, TW - 6, TH - 3);
    ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();

  // bublina s informací o poli (v obrazovkových souřadnicích)
  if (view.bubble) {
    const b = view.bubble;
    const p = farm.plots.find(q => q.x === b.gx && q.y === b.gy);
    const st = p && plotState(p, view.now);
    if (st && st.state === 'growing') {
      const [sx, sy] = cellToScreen(b.gx, b.gy, cam, W, H);
      const c = CROPS[p.crop];
      const bw = 150, bh = 52, bx = sx - bw / 2, by = sy - 40 * cam.zoom - bh;
      ctx.fillStyle = 'rgba(255,250,235,0.96)';
      roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
      ctx.strokeStyle = '#a0763f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#4a3218';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${c.name} · ${fmtTime(st.left)}`, sx, by + 21);
      ctx.fillStyle = '#e4d6b8'; roundRect(ctx, bx + 14, by + 32, bw - 28, 9, 4.5); ctx.fill();
      ctx.fillStyle = '#6fbf3f'; roundRect(ctx, bx + 14, by + 32, (bw - 28) * st.progress, 9, 4.5); ctx.fill();
    }
  }

  // plovoucí texty (+2 🌾 apod.)
  for (const f of view.floats) {
    const age = (t - f.t0) / 1300;
    if (age >= 1) continue;
    const [sx, sy] = cellToScreen(f.gx, f.gy, cam, W, H);
    ctx.globalAlpha = 1 - age * age;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,35,10,0.8)';
    ctx.fillStyle = '#fff';
    drawIconText(ctx, f.text, sx, sy - 30 - age * 40, 20, true);
    ctx.globalAlpha = 1;
  }

  // den a noc podle hodin v zařízení
  const tint = skyTint(view.hour);
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
  drawWeather(ctx, view.weather, W, H, t);
}

// počasí přes celou obrazovku: déšť = kapky a šedivý nádech, horko = teplý nádech
function drawWeather(ctx, w, W, H, t) {
  if (w === 'dest') {
    ctx.fillStyle = 'rgba(60,80,110,0.16)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(210,225,245,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    const n = Math.round(W * H / 9000);
    for (let i = 0; i < n; i++) {
      const sx = (i * 97.13) % W, sp = 0.5 + ((i * 37) % 10) / 20;
      const y = ((t * sp + i * 131) % (H + 40)) - 20, x = (sx - y * 0.25 + W) % W;
      ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14);
    }
    ctx.stroke();
  } else if (w === 'horko') {
    ctx.fillStyle = 'rgba(255,170,60,0.10)'; ctx.fillRect(0, 0, W, H);
  } else if (w === 'polojasno') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 3; i++) {
      const x = ((t / 60 + i * W / 3) % (W + 300)) - 150, y = 90 + i * H / 4;
      ctx.beginPath(); ctx.ellipse(x, y, 140, 50, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// barevný nádech podle denní doby (h = hodina s desetinami)
export function skyTint(h) {
  if (h === undefined) return null;
  const night = 'rgba(20,30,90,', dusk = 'rgba(255,120,40,';
  if (h >= 22 || h < 5) return night + '0.38)';
  if (h >= 5 && h < 7) { const k = (h - 5) / 2; return k < 0.5 ? night + (0.38 * (1 - k * 2)).toFixed(2) + ')' : dusk + (0.12 * (1 - k)).toFixed(2) + ')'; }
  if (h >= 19 && h < 20.5) return dusk + (0.16 * (h - 19) / 1.5).toFixed(2) + ')';
  if (h >= 20.5 && h < 22) return night + (0.38 * (h - 20.5) / 1.5).toFixed(2) + ')';
  return null;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, Math.max(0, w) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fmtTime(sec) {
  if (sec < 60) return `${sec} s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${h} h ${String(m).padStart(2, '0')} min`;
}
