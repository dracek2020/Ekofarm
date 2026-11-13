// EKOfarm – kreslení budov, ohrad, sadu, velkého pole, strojů a lidí z obrázků (public/img).
import { BUILDINGS, ANIMALS, ITEMS, TREES, CROPS, MACHINES, UPGRADABLE, objectStatus, animalState, queueState, treeState, fieldState, objSize, objLevel, pondStock, bestOwned } from './rules.js?v=46';
import { TW, TH } from './render.js?v=46';
import { drawIcon } from './icons.js?v=46';
import { asset, spriteName, spriteTop, ANIMAL_W } from './sprites.js?v=46';

// izometrický bod pro (i zlomkové) souřadnice mřížky
function iso(gx, gy) { return [(gx - gy) * TW / 2, (gx + gy) * TH / 2]; }

function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function bubble(ctx, x, y, icon, count, faded) {
  ctx.save();
  ctx.globalAlpha = faded ? 0.75 : 1;
  ctx.fillStyle = '#fff8e7';
  ctx.strokeStyle = '#a0763f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.moveTo(x - 5, y + 13); ctx.lineTo(x, y + 21); ctx.lineTo(x + 5, y + 13);
  ctx.fill(); ctx.stroke();
  drawIcon(ctx, icon, x, y, 22);
  if (count > 1) {
    ctx.fillStyle = '#c8452d';
    ctx.beginPath(); ctx.arc(x + 12, y - 11, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(count), x + 12, y - 10.5);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// cedulka s úrovní budovy
function levelPlate(ctx, o, d) {
  const L = objLevel(o);
  if (L < 2) return;
  const sz = objSize(o);
  const [x, y] = iso(o.x + sz.w, o.y + sz.h / 2);
  ctx.fillStyle = '#4f8fd6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x - 6, y - 10, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(L), x - 6, y - 9.5);
  ctx.textBaseline = 'alphabetic';
}

export function objectDepth(o) {
  const d = objSize(o);
  if (o.kind === 'velkepole' || BUILDINGS[o.kind].type === 'pond') return o.x + o.y + 1;   // leží na zemi – kreslit brzy (v36: všechny rybníky)
  return o.x + o.y + (d.w + d.h) / 2;
}

// místo obrázku, který se ještě nenačetl
function placeholder(ctx, o) {
  const sz = objSize(o);
  poly(ctx, [iso(o.x, o.y), iso(o.x + sz.w, o.y), iso(o.x + sz.w, o.y + sz.h), iso(o.x, o.y + sz.h)], 'rgba(120,90,50,0.25)');
}

// plátno budovy podle šablony: široké jako základna, vysoké 1,25× šířky, přední roh 12 px nad spodkem
function spriteBox(o) {
  const sz = objSize(o);
  const W = iso(o.x, o.y + sz.h), E = iso(o.x + sz.w, o.y), S = iso(o.x + sz.w, o.y + sz.h);
  const w = E[0] - W[0], h = w * 1.25;
  return { x: W[0], top: S[1] + 12 - h, w, h, cx: (W[0] + E[0]) / 2 };
}

// ---------- stroje a lidé ----------
// stroj z obrázku; dir 1 = jede doprava dolů, −1 = doleva dolů; s = velikost
export function drawVehicle(ctx, x, y, model, dir, t, s = 1, working = false, tool = null) {
  const side = dir > 0 ? 'r' : 'l';
  const bump = working ? Math.sin(t / 60) * 0.8 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
  const tim = tool && asset('m', `${tool}_${side}`);   // v36: tool = model náčiní (nejlepší, které hráč má)
  if (tim) {   // nářadí je za traktorem
    const w = tim.naturalWidth / 2 * s, h = tim.naturalHeight / 2 * s;
    ctx.drawImage(tim, x - dir * 34 * s - w / 2, y - 10 * s - h + bump, w, h);
  }
  const im = asset('m', `${model}_${side}`);
  if (!im) return;
  const w = im.naturalWidth / 2 * s, h = im.naturalHeight / 2 * s;
  ctx.drawImage(im, x - w / 2, y - h + 4 * s + bump, w, h);
}

// farmář nebo pomocník (who = 'farmar' | 'pomocnik')
export function drawPerson(ctx, x, y, who, dir, t, walking, work) {
  const im = asset('p', `${who}_${dir > 0 ? 'r' : 'l'}`);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (!im) return;
  const hop = walking ? Math.abs(Math.sin(t / 110)) * 2 : 0;
  const squat = work ? Math.abs(Math.sin(t / 120)) * 2 : 0;
  const w = im.naturalWidth / 2, h = im.naturalHeight / 2 - squat;
  ctx.drawImage(im, x - w / 2, y - h - hop + 1, w, h);
}

// ---------- ohrady: zvířata chodí po výběhu před přístřeškem (ten je na obrázku vzadu) ----------
function drawPenAnimals(ctx, o, d, now, t) {
  const an = ANIMALS[d.animal];
  const img = asset('z', d.animal);
  if (!img) return;
  const w = ANIMAL_W[d.animal], h = w * img.naturalHeight / img.naturalWidth;
  const list = (o.animals || []).map((a, i) => {
    const st = animalState(a, an, now);
    st.active = st.state !== 'hungry' && st.made < an.per;   // v34: v cyklu krmení pracuje, i když už má něco hotové
    const sp = st.active ? 1 : 0.35;
    const ph = t / (2600 / sp) + i * 2.3;
    const u = 0.46 + 0.22 * Math.sin(ph);                                               // dost daleko od předního plotu
    const v = 0.52 + 0.05 * (i % 4) + 0.03 * Math.cos(t / (3100 / sp) + i * 1.7);
    const [x, y] = iso(o.x + u * d.w, o.y + v * d.h);
    return { x, y, st, i, right: Math.cos(ph) > 0 };
  }).sort((a, b) => a.y - b.y);   // vzadu první
  for (const { x, y, st, i, right } of list) {
    const bob = st.active ? Math.abs(Math.sin(t / 160 + i)) * 1.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.38, w * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y - bob); if (right) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    if (st.state === 'ready') drawIcon(ctx, ITEMS[an.product].icon, x, y - h - 8, 16);
  }
}

// ---------- včely kolem včelína ----------
function drawBees(ctx, b, t) {
  for (let i = 0; i < 6; i++) {
    const a = t / (600 + i * 90) + i * 1.7;
    const bx = b.cx + Math.cos(a) * (18 + i * 4), by = b.top + b.h * 0.55 + Math.sin(a * 1.3) * (8 + i);
    ctx.fillStyle = '#f5c542'; ctx.beginPath(); ctx.ellipse(bx, by, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f2a26'; ctx.fillRect(bx - 0.5, by - 1.8, 1, 3.6);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(bx, by - 2.4, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- sad: strom nebo keř na políčku ----------
function drawOrchard(ctx, o, now, t) {
  const [cx, cy] = iso(o.x + 0.5, o.y + 0.5);
  ctx.fillStyle = 'rgba(110,70,35,0.55)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
  const st = treeState(o, now);
  if (st.state === 'empty') return;
  const tr = TREES[o.tree];
  const img = asset('s', `${tr.id}_${st.state === 'dead' ? 'dead' : st.state === 'ready' ? 'ready' : 'grow'}`);
  const g = st.state === 'growing' && o.left === tr.harvests ? 0.5 + 0.5 * st.progress : 1;
  if (img) {   // v32: plátno 192×256, pata kmene na středu políčka 105 px pod horním okrajem
    const w = 96 * g, h = w * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, cx - w / 2, cy - 105 * g, w, h);
  }
  if (st.state === 'dead') bubble(ctx, cx, cy - 58 + Math.sin(t / 300) * 2, 'axe', 0);   // uschlý strom: pokácet
}

// ---------- velké pole ----------
function bale(ctx, x, y) {
  ctx.fillStyle = '#d9b43b'; ctx.beginPath(); ctx.ellipse(x, y - 3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2da7a'; ctx.beginPath(); ctx.ellipse(x - 3, y - 4, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b8902a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 3, y - 4, 2, 0, Math.PI * 2); ctx.stroke();
}
// plodina na jednom políčku (malé pole i velké pole); stage 0 klíček, 1 roste, 2 zralé
// v36: každá rostlina je zvlášť (obrázek jedné rostliny s hrudkou hlíny) a sází se do řádků uvnitř záhonu –
// 3×3 rostliny, velké plodiny (dýně, meloun, zelí) 2×2. Záhon se složí jednou do zásobního plátna
// (4 varianty s malým posunem, velikostí a zrcadlením, aby pole nevypadala stejně) a pak se jen kopíruje.
const CROP_GRID = { dyne: 2, meloun: 2, zeli: 2 };
const CROP_FOOT = 0.06;   // spodek hrudky je o kousek pod místem, kde rostlina „stojí“
const cropCache = new Map();
function cropPatch(crop, stage, variant) {
  const key = crop + '|' + stage + '|' + variant;
  const hit = cropCache.get(key);
  if (hit) return hit;
  const im = asset('c', `${crop}_${stage}`);
  if (!im || typeof document === 'undefined') return null;
  const n = CROP_GRID[crop] || 3, K = 2;
  const pw = TW * (n === 2 ? 0.58 : 0.44), ph = pw * im.naturalHeight / im.naturalWidth;
  const W = TW + pw, H = TH + ph + 6, ox = W / 2, oy = ph + TH / 2;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * K); c.height = Math.ceil(H * K);
  const g = c.getContext('2d');
  if (!g) return null;
  g.scale(K, K);
  let sd = (variant + 1) * 9301 + crop.length * 49297 + stage * 233;
  const rand = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const pts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push([(i + 0.5) / n + (rand() - 0.5) * 0.08, (j + 0.5) / n + (rand() - 0.5) * 0.08, rand()]);
  pts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);   // odzadu dopředu
  for (const [u, v, r] of pts) {
    const x = ox + (u - v) * TW / 2, y = oy + (u + v - 1) * TH / 2;
    const k = 0.88 + r * 0.24, w = pw * k, h = ph * k;
    g.fillStyle = 'rgba(45,28,12,0.22)';
    g.beginPath(); g.ellipse(x, y + 1, w * 0.3, w * 0.11, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(x, y);
    if (r > 0.5) g.scale(-1, 1);
    g.drawImage(im, -w / 2, -h * (1 - CROP_FOOT), w, h);
    g.restore();
  }
  c._ox = ox; c._oy = oy; c._W = W; c._H = H;
  cropCache.set(key, c);
  return c;
}
export function drawCropImg(ctx, crop, cx, cy, stage, t) {
  const c = cropPatch(crop, stage, Math.abs(Math.round(cx / 48) * 7 + Math.round(cy / 24) * 3) % 4);
  if (!c) return;
  ctx.drawImage(c, cx - c._ox, cy - c._oy, c._W, c._H);
}
export const cropStage = (progress, ready) => (ready ? 2 : progress < 0.25 ? 0 : 1);

function drawBigField(ctx, o, d, now, t, farm) {
  const W = o.w, H = o.h, cells = W * H;
  const st = fieldState(o, now);
  const soil = o.soil || 'raw';
  poly(ctx, [iso(o.x, o.y), iso(o.x + W, o.y), iso(o.x + W, o.y + H), iso(o.x, o.y + H)], '#8a6a3f');
  const order = (gx, gy) => gy * W + (gy % 2 ? W - 1 - gx : gx);
  const working = ['sowing', 'harvesting', 'plowing', 'baling'].includes(st.state);
  const done = working ? st.progress * cells : 0;
  const crop = o.crop || (st.state === 'harvesting' && o.load ? o.load.item : null);
  const balesOut = st.state === 'unload' && st.item === 'slama';
  const tPlowed = asset('t', 'pole'), tSown = asset('t', 'pole_osete');
  for (let sum = 0; sum <= W + H - 2; sum++) {
    for (let gx = 0; gx < W; gx++) {
      const gy = sum - gx;
      if (gy < 0 || gy >= H) continue;
      const idx = order(gx, gy);
      const passed = idx < done;
      let stage = -1, stubble = false, straw = false, baleCell = false, dark = soil === 'plowed' || soil === 'sown';
      switch (st.state) {
        case 'sowing': stage = passed ? 0 : -1; break;
        case 'growing': stage = cropStage(st.progress, false); break;
        case 'ready': stage = 2; break;
        case 'harvesting': if (passed) { stubble = true; straw = true; dark = false; } else stage = 2; break;
        case 'plowing': dark = passed; stubble = !passed && soil !== 'raw'; break;
        case 'baling': stubble = true; dark = false; if (passed) baleCell = idx % 2 === 0; else straw = true; break;
        case 'unload': stubble = true; dark = false; baleCell = balesOut && idx % 2 === 0; straw = !balesOut && o.straw; break;
        default: stubble = soil === 'stubble'; straw = st.state === 'empty' && o.straw;
      }
      const [cx, cy] = iso(o.x + gx + 0.5, o.y + gy + 0.5);
      const tile = stage >= 0 ? tSown : dark ? tPlowed : null;
      if (tile) ctx.drawImage(tile, cx - TW / 2, cy - TH / 2, TW, TW * tile.naturalHeight / tile.naturalWidth);
      if (baleCell) { bale(ctx, cx, cy); continue; }
      if (stubble) {
        ctx.strokeStyle = '#c9a53a'; ctx.lineWidth = 1.4; ctx.beginPath();
        for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
          const [px, py] = iso(o.x + gx + u, o.y + gy + v);
          ctx.moveTo(px - 2, py); ctx.lineTo(px - 2, py - 3); ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py - 3);
          if (straw) { ctx.moveTo(px - 5, py + 1); ctx.lineTo(px + 5, py - 1); }
        }
        ctx.stroke();
      } else if (stage >= 0 && crop) drawCropImg(ctx, crop, cx, cy, stage, t);
    }
  }
  if (o.job && working) {
    const pos = Math.min(cells - 0.001, done);
    const i = Math.floor(pos), frac = pos - i;
    const row = Math.floor(i / W), along = i % W;
    const fwd = row % 2 === 0;
    const gx = fwd ? along + frac : W - along - frac;
    const [vx, vy] = iso(o.x + gx, o.y + row + 0.5);
    for (let k = 0; k < 4; k++) {
      const a = ((t / 500 + k / 4) % 1);
      ctx.fillStyle = `rgba(170,140,90,${0.35 * (1 - a)})`;
      ctx.beginPath(); ctx.arc(vx - (fwd ? 1 : -1) * (14 + a * 26), vy - 4 - a * 10 + (fwd ? -a * 8 : a * 8), 4 + a * 7, 0, Math.PI * 2); ctx.fill();
    }
    const mm = farm && farm.machines.find(x => x.id === o.job.m);
    const model = mm ? mm.model : st.state === 'harvesting' ? 'klas4' : 'brazda60';
    const ttype = st.state === 'plowing' ? 'plow' : st.state === 'baling' ? 'baler' : st.state === 'sowing' ? 'seeder' : null;
    const tm = farm && ttype && bestOwned(farm, ttype);
    const tool = tm ? tm.id : ttype && ttype !== 'seeder' ? { plow: 'pluh', baler: 'lis' }[ttype] : null;
    drawVehicle(ctx, vx, vy, model, fwd ? 1 : -1, t, 0.85, true, tool);
  }
  const top = iso(o.x + W / 2, o.y + H / 2);
  const by = top[1] - 40 + Math.sin(t / 300) * 2;
  if (st.state === 'ready') bubble(ctx, top[0], by, CROPS[o.crop].icon, 0);
  else if (st.state === 'unload') bubble(ctx, top[0], by, ITEMS[st.item].icon, st.stock);
}

// ozdobný domek v městečku (variant 0–2)
export function drawTownHouse(ctx, gx, gy, variant) {
  const im = asset('b', 'domek_' + 'abc'[variant % 3]);
  if (!im) return;
  const b = spriteBox({ kind: 'sklad', x: gx, y: gy, w: 2, h: 2 });
  ctx.drawImage(im, b.x, b.top, b.w, b.h);
}

// ---------- budovy ----------
// v29: nástěnka v Městečku (v32 vlastní obrázek, dokud se nenačte, cedule); bublina, když čekají uchazeči
function drawBoard(ctx, o, now, t, farm) {
  const [x, y] = iso(o.x + 0.5, o.y + 0.5);
  const im = asset('b', 'nastenka'), ced = asset('t', 'cedule');
  if (im) { const b = spriteBox(o); ctx.drawImage(im, b.x, b.top, b.w, b.h); }
  else if (ced) { const w = 80, h = w * ced.naturalHeight / ced.naturalWidth; ctx.drawImage(ced, x - w / 2, y + 14 - h, w, h); }
  else placeholder(ctx, o);
  const ads = (farm && farm.board && farm.board.ads) || [];
  const ready = ads.filter(a => a.ready <= now).length;
  if (ready) bubble(ctx, x, y - 78 + Math.sin(t / 300) * 2, 'helper', ready);
  else if (ads.length) bubble(ctx, x, y - 78, 'clock', 0, true);
}
export function drawObject(ctx, o, now, t, farm) {
  const d = BUILDINGS[o.kind];
  if (d.type === 'bigfield') { drawBigField(ctx, o, d, now, t, farm); return; }
  if (d.type === 'orchard') { drawOrchard(ctx, o, now, t); return; }
  if (d.type === 'board') { drawBoard(ctx, o, now, t, farm); return; }
  const name = spriteName(o);
  const im = name && asset('b', name);
  if (!im) { placeholder(ctx, o); return; }
  const b = spriteBox(o);
  if (o.r) {   // v43: otočená budova = obrázek zrcadlený kolem středu
    ctx.save(); ctx.translate(b.cx * 2, 0); ctx.scale(-1, 1);
    ctx.drawImage(im, b.x, b.top, b.w, b.h);
    ctx.restore();
  } else ctx.drawImage(im, b.x, b.top, b.w, b.h);
  const st = objectStatus(o, now, farm);
  const by = b.top + b.h * spriteTop(im) + 6 + Math.sin(t / 300) * 2;
  if (d.type === 'factory' && st.done) {
    const first = queueState(o, now).find(q => q.state === 'done');
    bubble(ctx, b.cx, by, ITEMS[first.r].icon, st.done);
  } else if (d.type === 'pen') {
    drawPenAnimals(ctx, o, d, now, t);
    const an = ANIMALS[d.animal];
    if (st.done) bubble(ctx, b.cx, by, ITEMS[an.product].icon, st.done);
    else if (st.hungry && (o.animals || []).length) bubble(ctx, b.cx, by, ITEMS[an.feed].icon, 0, true);
  } else if (d.type === 'main' && st.done) bubble(ctx, b.cx, by, 'truck', st.done);
  else if (d.type === 'hive') { drawBees(ctx, b, t); if (st.done) bubble(ctx, b.cx, by, 'plast', st.done); }
  else if (d.type === 'pond' && o.sc !== undefined) {
    const s = pondStock(o, now);
    if (s.count) bubble(ctx, b.cx, by + 20, 'kapr', s.count, s.count < s.cap);
  }
  if (UPGRADABLE.includes(d.type)) levelPlate(ctx, o, d);
}

// duch při stavění/přesunu: ghost = { kind, x, y, w, h, ok }
export function drawGhost(ctx, g, now, t) {
  const d = g.kind === 'plot' ? { w: 1, h: 1 } : g.w ? { w: g.w, h: g.h } : BUILDINGS[g.kind];
  const N = iso(g.x, g.y), E = iso(g.x + d.w, g.y), S = iso(g.x + d.w, g.y + d.h), W = iso(g.x, g.y + d.h);
  poly(ctx, [N, E, S, W], g.ok ? 'rgba(120,230,110,0.45)' : 'rgba(230,80,60,0.45)');
  ctx.strokeStyle = g.ok ? '#e9ffe0' : '#ffd6cf'; ctx.lineWidth = 2;
  ctx.stroke();
  if (g.kind !== 'plot') {
    ctx.save();
    ctx.globalAlpha = 0.7;
    drawObject(ctx, { kind: g.kind, x: g.x, y: g.y, w: g.w, h: g.h, r: g.r, queue: [], animals: [], job: null }, now, t);
    ctx.restore();
  }
}
