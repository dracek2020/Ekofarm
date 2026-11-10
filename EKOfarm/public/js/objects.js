// EKOfarm – kreslení budov, ohrad se zvířaty a ozdob (izometricky).
import { BUILDINGS, ANIMALS, ITEMS, TREES, CROPS, MACHINES, objectStatus, animalState, queueState, treeState, fieldState, objSize } from './rules.js?v=7';
import { TW, TH, drawPlant } from './render.js?v=7';
import { drawIcon } from './icons.js?v=7';

// izometrický bod pro (i zlomkové) souřadnice mřížky
function iso(gx, gy) { return [(gx - gy) * TW / 2, (gx + gy) * TH / 2]; }

function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// krabice s jehlanovou střechou na obdélníku x0..x1, y0..y1 (v buňkách)
function house(ctx, x0, y0, x1, y1, wallH, roofH, wall, roof) {
  const N = iso(x0, y0), E = iso(x1, y0), S = iso(x1, y1), W = iso(x0, y1);
  const up = ([x, y], h) => [x, y - h];
  poly(ctx, [W, S, up(S, wallH), up(W, wallH)], shade(wall, 0.82));
  poly(ctx, [S, E, up(E, wallH), up(S, wallH)], wall);
  const cx = (N[0] + S[0]) / 2, cy = (N[1] + S[1]) / 2;
  const apex = [cx, cy - wallH - roofH];
  const [n, e, s, w] = [N, E, S, W].map(p => up(p, wallH));
  poly(ctx, [n, e, apex], shade(roof, 0.75));
  poly(ctx, [w, n, apex], shade(roof, 0.9));
  poly(ctx, [w, s, apex], shade(roof, 1.0));
  poly(ctx, [s, e, apex], shade(roof, 0.85));
  return { W, S, E, N, apex };
}

function bubble(ctx, x, y, icon, count, faded) {
  ctx.save();
  ctx.globalAlpha = faded ? 0.75 : 1;
  ctx.fillStyle = '#fff8e7';
  ctx.strokeStyle = '#a0763f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.moveTo(x - 5, y + 13); ctx.lineTo(x, y + 21); ctx.lineTo(x + 5, y + 13);
  ctx.fill(); ctx.stroke();
  drawIcon(ctx, icon, x, y, 21);
  if (count > 1) {
    ctx.fillStyle = '#c8452d';
    ctx.beginPath(); ctx.arc(x + 12, y - 11, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(count), x + 12, y - 10.5);
  }
  ctx.restore();
}

// ---------- výrobní budova ----------
function drawFactory(ctx, o, d, now, t) {
  const m = 0.18;
  const st = objectStatus(o, now);
  const h = house(ctx, o.x + m, o.y + m, o.x + d.w - m, o.y + d.h - m, 46, 34, d.color, '#a8483a');
  // dveře na levé stěně a okno na pravé
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const d0 = lerp(h.W, h.S, 0.4), d1 = lerp(h.W, h.S, 0.62);
  poly(ctx, [d0, d1, [d1[0], d1[1] - 26], [d0[0], d0[1] - 26]], '#5b3a1e');
  const w0 = lerp(h.S, h.E, 0.35), w1 = lerp(h.S, h.E, 0.65);
  poly(ctx, [[w0[0], w0[1] - 16], [w1[0], w1[1] - 16], [w1[0], w1[1] - 32], [w0[0], w0[1] - 32]], '#fdf3c4');
  // cedule s ikonou
  ctx.font = '18px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sg = lerp(h.W, h.S, 0.82);
  drawIcon(ctx, d.icon, sg[0], sg[1] - 30, 18);
  // komín a kouř při výrobě
  const ch = lerp(h.apex, h.E, 0.45);
  poly(ctx, [[ch[0] - 5, ch[1] + 4], [ch[0] + 5, ch[1] + 4], [ch[0] + 5, ch[1] - 14], [ch[0] - 5, ch[1] - 14]], '#7a5a48');
  if (st.busy) {
    for (let i = 0; i < 3; i++) {
      const k = ((t / 1400 + i / 3) % 1);
      ctx.fillStyle = `rgba(240,240,240,${0.7 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(ch[0] + Math.sin(k * 6 + i) * 4, ch[1] - 18 - k * 34, 4 + k * 7, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (d.id === 'mlyn') {
    // větrník mlýna – točí se, když mele
    const [bx, by] = [h.apex[0] - 6, h.apex[1] + 22];
    const rot = st.busy ? t / 500 : 0.3;
    ctx.strokeStyle = '#7a5a48'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 4; k++) {
      const a = rot + k * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * 30, by + Math.sin(a) * 30); ctx.stroke();
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
      ctx.fillStyle = 'rgba(250,245,230,0.92)'; ctx.fillRect(8, 0, 22, 7);
      ctx.restore();
    }
    ctx.fillStyle = '#5b3a1e'; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (st.done) {
    const first = queueState(o, now).find(q => q.state === 'done');
    bubble(ctx, h.apex[0], h.apex[1] - 26 + Math.sin(t / 300) * 2, ITEMS[first.r].icon, st.done);
  }
}

// ---------- ohrada se zvířaty ----------
function drawChicken(ctx, x, y, dir, t, i) {
  const bob = Math.abs(Math.sin(t / 180 + i)) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbfaf4';
  ctx.beginPath(); ctx.ellipse(x, y - 7 - bob, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * dir, y - 13 - bob, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9402b';
  ctx.beginPath(); ctx.arc(x + 5 * dir, y - 17 - bob, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2a52b';
  ctx.beginPath(); ctx.moveTo(x + 8 * dir, y - 13 - bob); ctx.lineTo(x + 11 * dir, y - 12 - bob); ctx.lineTo(x + 8 * dir, y - 11 - bob); ctx.fill();
}

function drawCow(ctx, x, y, dir, t, i) {
  const bob = Math.abs(Math.sin(t / 400 + i)) * 0.8;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d3029';
  for (const lx of [-8, -3, 4, 9]) ctx.fillRect(x + lx, y - 8, 2.5, 8);
  ctx.fillStyle = '#f7f3ec';
  ctx.beginPath(); ctx.ellipse(x, y - 13 - bob, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d3029';
  ctx.beginPath(); ctx.ellipse(x - 4, y - 15 - bob, 4, 3, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 5, y - 11 - bob, 3, 2.4, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f3ec';
  ctx.beginPath(); ctx.ellipse(x + 14 * dir, y - 17 - bob, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2b7a8';
  ctx.beginPath(); ctx.ellipse(x + 17 * dir, y - 15.5 - bob, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPen(ctx, o, d, now, t) {
  const an = ANIMALS[d.animal];
  const N = iso(o.x, o.y), E = iso(o.x + d.w, o.y), S = iso(o.x + d.w, o.y + d.h), W = iso(o.x, o.y + d.h);
  poly(ctx, [N, E, S, W], d.animal === 'krava' ? '#a9c76b' : '#c9b77c');
  // domek v zadním rohu
  const hs = d.w >= 3 ? 1.2 : 0.9;
  house(ctx, o.x + 0.1, o.y + 0.1, o.x + 0.1 + hs, o.y + 0.1 + hs, 26, 18, d.animal === 'krava' ? '#b5523b' : '#e7c27a', '#8a3b2c');
  // zvířata
  const animals = o.animals || [];
  animals.forEach((a, i) => {
    const st = animalState(a, an, now);
    const sp = st.state === 'eating' ? 1 : 0.35;
    const u = 0.55 + 0.25 * Math.sin(t / (2600 / sp) + i * 2.3);
    const v = 0.35 + 0.18 * i + 0.1 * Math.cos(t / (3100 / sp) + i * 1.7);
    const [x, y] = iso(o.x + u * d.w, o.y + Math.min(0.88, v) * d.h);
    const dir = Math.cos(t / (2600 / sp) + i * 2.3) > 0 ? 1 : -1;
    if (d.animal === 'krava') drawCow(ctx, x, y, dir, t, i); else drawChicken(ctx, x, y, dir, t, i);
    if (st.state === 'ready') {
      ctx.font = '14px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      drawIcon(ctx, ITEMS[an.product].icon, x, y - (d.animal === 'krava' ? 36 : 28), 14);
    }
  });
  // plot
  const rail = (a, b) => {
    ctx.strokeStyle = '#9b6b3c'; ctx.lineWidth = 2.5;
    for (const off of [5, 11]) { ctx.beginPath(); ctx.moveTo(a[0], a[1] - off); ctx.lineTo(b[0], b[1] - off); ctx.stroke(); }
    ctx.fillStyle = '#7d532c';
    const n = 4 * d.w;
    for (let k = 0; k <= n; k++) {
      const px = a[0] + (b[0] - a[0]) * k / n, py = a[1] + (b[1] - a[1]) * k / n;
      ctx.fillRect(px - 1.5, py - 14, 3, 14);
    }
  };
  rail(N, E); rail(N, W); rail(W, S); rail(S, E);
  const st = objectStatus(o, now);
  const top = iso(o.x + d.w / 2, o.y + d.h / 2);
  const by = top[1] - 30 * d.h / 2 - 20 + Math.sin(t / 300) * 2;
  if (st.done) bubble(ctx, top[0], by, ITEMS[an.product].icon, st.done);
  else if (st.hungry && animals.length) bubble(ctx, top[0], by, ITEMS[an.feed].icon, 0, true);
}

// ---------- sad se stromem ----------
function drawOrchard(ctx, o, d, now, t) {
  const N = iso(o.x + 0.06, o.y + 0.06), E = iso(o.x + 0.94, o.y + 0.06), S = iso(o.x + 0.94, o.y + 0.94), W = iso(o.x + 0.06, o.y + 0.94);
  poly(ctx, [N, E, S, W], '#5fa83f');
  ctx.strokeStyle = '#8e6b3c'; ctx.lineWidth = 2;
  ctx.beginPath(); [N, E, S, W].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
  const [cx, cy] = iso(o.x + 0.5, o.y + 0.5);
  ctx.fillStyle = '#7a5030';
  ctx.beginPath(); ctx.ellipse(cx, cy, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
  const st = treeState(o, now);
  if (st.state === 'empty') return;
  const tr = TREES[o.tree];
  const g = st.state === 'growing' && o.left === tr.harvests ? 0.35 + 0.65 * st.progress : 1;
  const sway = st.state === 'ready' ? Math.sin(t / 500 + o.x) * 1.2 : 0;
  // kmen
  ctx.fillStyle = st.state === 'dead' ? '#6b5440' : '#7a4e2a';
  ctx.fillRect(cx - 2.5 * g, cy - 24 * g, 5 * g, 24 * g);
  if (st.state === 'dead') {
    ctx.strokeStyle = '#6b5440'; ctx.lineWidth = 2.5;
    for (const [dx, dy] of [[-9, -34], [8, -36], [0, -40]]) { ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx + dx, cy + dy); ctx.stroke(); }
    ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
    drawIcon(ctx, 'axe', cx + 14, cy - 34, 14);
    return;
  }
  // koruna
  const r = 15 * g;
  ctx.fillStyle = '#3f8f3a'; ctx.beginPath(); ctx.arc(cx + sway, cy - 30 * g, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4ea845'; ctx.beginPath(); ctx.arc(cx - 5 * g + sway, cy - 35 * g, r * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#63bd55'; ctx.beginPath(); ctx.arc(cx - 7 * g + sway, cy - 39 * g, r * 0.3, 0, Math.PI * 2); ctx.fill();
  // ovoce: malé při růstu, plné když je zralé
  const fr = st.state === 'ready' ? 3.2 : st.progress > 0.5 ? 1.8 : 0;
  if (fr) {
    ctx.fillStyle = st.state === 'ready' ? tr.color : '#9ccc5c';
    for (const [dx, dy] of [[-8, -26], [6, -34], [9, -22], [-2, -40], [0, -24], [-10, -36]]) {
      ctx.beginPath(); ctx.arc(cx + dx * g + sway, cy + dy * g, fr, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- statek ----------
function drawMain(ctx, o, d, now, t, farm) {
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  // dvorek
  const N = iso(o.x, o.y), E = iso(o.x + 3, o.y), S = iso(o.x + 3, o.y + 3), W = iso(o.x, o.y + 3);
  poly(ctx, [N, E, S, W], '#d8c79a');
  // cestička k domu
  poly(ctx, [iso(o.x + 1.2, o.y + 2.2), iso(o.x + 1.8, o.y + 2.2), iso(o.x + 1.8, o.y + 3), iso(o.x + 1.2, o.y + 3)], '#c2ad7c');
  const h = house(ctx, o.x + 0.35, o.y + 0.3, o.x + 2.7, o.y + 2.2, 62, 48, '#f3e3c3', '#b9432f');
  // trámy (hrázděné zdi)
  ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 3;
  for (const [a, b] of [[h.W, h.S], [h.S, h.E]]) {
    for (const k of [0, 0.5, 1]) {
      const p = lerp(a, b, k);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 62); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(a[0], a[1] - 62); ctx.lineTo(b[0], b[1] - 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a[0], a[1] - 31); ctx.lineTo(b[0], b[1] - 31); ctx.stroke();
  }
  // dveře a okna
  const d0 = lerp(h.W, h.S, 0.62), d1 = lerp(h.W, h.S, 0.82);
  poly(ctx, [d0, d1, [d1[0], d1[1] - 30], [d0[0], d0[1] - 30]], '#6b3f1f');
  for (const [a, b, k] of [[h.W, h.S, 0.22], [h.S, h.E, 0.25], [h.S, h.E, 0.72]]) {
    const w0 = lerp(a, b, k - 0.09), w1 = lerp(a, b, k + 0.09);
    poly(ctx, [[w0[0], w0[1] - 38], [w1[0], w1[1] - 38], [w1[0], w1[1] - 54], [w0[0], w0[1] - 54]], '#fdf3c4');
  }
  // komín
  const ch = lerp(h.apex, h.N, 0.35);
  poly(ctx, [[ch[0] - 6, ch[1] + 6], [ch[0] + 6, ch[1] + 6], [ch[0] + 6, ch[1] - 16], [ch[0] - 6, ch[1] - 16]], '#8c6a55');
  for (let i = 0; i < 2; i++) {
    const k = ((t / 2200 + i / 2) % 1);
    ctx.fillStyle = `rgba(245,245,245,${0.5 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(ch[0] + Math.sin(k * 5) * 4, ch[1] - 20 - k * 30, 4 + k * 6, 0, Math.PI * 2); ctx.fill();
  }
  // poštovní schránka u cesty
  const mb = iso(o.x + 2.3, o.y + 2.8);
  ctx.fillStyle = '#7a4e2a'; ctx.fillRect(mb[0] - 1.5, mb[1] - 16, 3, 16);
  ctx.fillStyle = '#4f8fd6'; ctx.fillRect(mb[0] - 6, mb[1] - 24, 12, 9);
  // bublina: zakázky připravené k doručení
  const st = objectStatus(o, now, farm);
  if (st.done) bubble(ctx, h.apex[0], h.apex[1] - 22 + Math.sin(t / 300) * 2, 'truck', st.done);
}

// ---------- sklad (stodola se silem) ----------
function drawStorage(ctx, o, d, now, t) {
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  // silo vzadu
  const [sx, sy] = iso(o.x + 0.55, o.y + 0.55);
  ctx.fillStyle = '#b8c0c7'; ctx.fillRect(sx - 13, sy - 78, 26, 72);
  ctx.fillStyle = '#9aa3ab'; ctx.fillRect(sx + 3, sy - 78, 10, 72);
  ctx.fillStyle = '#c9d0d6'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 13, 6, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#7d8a96'; ctx.beginPath(); ctx.arc(sx, sy - 78, 13, Math.PI, 0); ctx.fill();
  // stodola
  const h = house(ctx, o.x + 0.75, o.y + 0.65, o.x + 1.9, o.y + 1.9, 38, 26, '#b5523b', '#6f3a2a');
  const g0 = lerp(h.W, h.S, 0.25), g1 = lerp(h.W, h.S, 0.75);
  poly(ctx, [g0, g1, [g1[0], g1[1] - 28], [g0[0], g0[1] - 28]], '#f3e3c3');
  ctx.strokeStyle = '#b5523b'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1] - 28); ctx.moveTo(g1[0], g1[1]); ctx.lineTo(g0[0], g0[1] - 28); ctx.stroke();
}

// ---------- stroje ----------
function wheel(ctx, x, y, r) {
  ctx.fillStyle = '#2f2a26'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.75, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9b77c'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.3, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
}

// stroj: dir = 1 jede doprava, -1 doleva; s = měřítko
export function drawVehicle(ctx, cx, cy, model, dir, t, s = 0.75, working = false, tool = null) {
  const m = MACHINES[model];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir * s, s);
  const bump = working ? Math.sin(t / 60) * 0.8 : 0;
  ctx.translate(0, bump);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 17, 0, 0, Math.PI * 2); ctx.fill();
  const c = m.color, dark = shade(m.color, 0.78);
  if (m.type === 'tractor') {
    wheel(ctx, 18, -4, 9);
    ctx.fillStyle = c; ctx.fillRect(-10, -30, 34, 18);            // kapota
    ctx.fillStyle = dark; ctx.fillRect(-10, -14, 34, 4);
    ctx.fillStyle = c; ctx.fillRect(-26, -46, 20, 34);           // kabina
    ctx.fillStyle = '#cfe8f5'; ctx.fillRect(-23, -43, 14, 14);
    ctx.fillStyle = '#555'; ctx.fillRect(14, -40, 4, 12);         // výfuk
    if (working) {
      for (let i = 0; i < 2; i++) {
        const k = ((t / 700 + i / 2) % 1);
        ctx.fillStyle = `rgba(90,90,90,${0.45 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(16 - k * 6, -44 - k * 18, 3 + k * 4, 0, Math.PI * 2); ctx.fill();
      }
      if (tool === 'plow') {           // pluh: radlice za traktorem
        ctx.fillStyle = '#555'; ctx.fillRect(-40, -12, 14, 3);
        ctx.fillStyle = '#8a8f96';
        for (const x of [-52, -44, -36]) { ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x + 6, -12); ctx.lineTo(x - 2, 0); ctx.closePath(); ctx.fill(); }
      } else if (tool === 'seeder') {  // secí stroj
        ctx.fillStyle = '#3f7fbf'; ctx.fillRect(-58, -24, 32, 14);
        ctx.fillStyle = '#2f63a0'; ctx.fillRect(-58, -28, 32, 5);
        ctx.fillStyle = '#555'; for (const x of [-54, -46, -38, -30]) ctx.fillRect(x, -10, 2, 8);
      } else if (tool === 'baler') {   // lis na balíky
        ctx.fillStyle = '#d9b43b'; ctx.fillRect(-62, -30, 34, 22);
        ctx.fillStyle = '#f2da7a'; ctx.fillRect(-58, -26, 14, 12);
        wheel(ctx, -50, -4, 7);
      } else {
        ctx.fillStyle = '#7a7a7a'; ctx.fillRect(-46, -14, 18, 6);    // brány
      }
    }
    wheel(ctx, -18, -8, 15);
    wheel(ctx, 22, -2, 9);
  } else {
    ctx.fillStyle = '#d9b43b'; ctx.fillRect(16, -12, 22, 10);    // žací lišta
    ctx.strokeStyle = '#8a7020'; ctx.lineWidth = 2;
    const rot = working ? t / 120 : 0;
    for (let k = 0; k < 4; k++) {
      const a = rot + k * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(27, -18); ctx.lineTo(27 + Math.cos(a) * 9, -18 + Math.sin(a) * 9); ctx.stroke();
    }
    ctx.fillStyle = c; ctx.fillRect(-26, -34, 42, 24);           // tělo
    ctx.fillStyle = dark; ctx.fillRect(-26, -14, 42, 4);
    ctx.fillStyle = c; ctx.fillRect(-6, -52, 18, 20);            // kabina
    ctx.fillStyle = '#cfe8f5'; ctx.fillRect(-3, -49, 12, 11);
    ctx.fillStyle = '#d9b43b'; ctx.fillRect(-30, -42, 8, 22);    // výsypka
    wheel(ctx, -14, -6, 12);
    wheel(ctx, 10, -4, 8);
  }
  ctx.restore();
}

// ---------- velké pole ----------
function bale(ctx, x, y) {
  ctx.fillStyle = '#d9b43b'; ctx.beginPath(); ctx.ellipse(x, y - 3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2da7a'; ctx.beginPath(); ctx.ellipse(x - 3, y - 4, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b8902a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 3, y - 4, 2, 0, Math.PI * 2); ctx.stroke();
}

function drawBigField(ctx, o, d, now, t, farm) {
  const W = o.w, H = o.h, cells = W * H;
  const N = iso(o.x, o.y), E = iso(o.x + W, o.y), S = iso(o.x + W, o.y + H), Wp = iso(o.x, o.y + H);
  const st = fieldState(o, now);
  const soil = o.soil || 'raw';
  poly(ctx, [N, E, S, Wp], '#8a6a3f');
  const m = 0.08;
  const dark = ['plowed', 'sown'].includes(soil) && st.state !== 'plowing';
  poly(ctx, [iso(o.x + m, o.y + m), iso(o.x + W - m, o.y + m), iso(o.x + W - m, o.y + H - m), iso(o.x + m, o.y + H - m)], dark ? '#6a4122' : '#8e5d33');
  ctx.strokeStyle = dark ? 'rgba(40,18,4,0.4)' : 'rgba(50,25,8,0.22)'; ctx.lineWidth = dark ? 2.4 : 1.6;
  for (let r = 1; r < H * 2; r++) {
    const a = iso(o.x + m, o.y + r / 2), b = iso(o.x + W - m, o.y + r / 2);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const order = (gx, gy) => gy * W + (gy % 2 ? W - 1 - gx : gx);
  const working = ['sowing', 'harvesting', 'plowing', 'baling'].includes(st.state);
  const done = working ? st.progress * cells : 0;
  const crop = o.crop || (st.state === 'harvesting' && o.load ? o.load.item : null);
  const strawField = st.state === 'empty' && o.straw;
  const balesOut = st.state === 'unload' && st.item === 'slama';
  for (let sum = 0; sum <= W + H - 2; sum++) {
    for (let gx = 0; gx < W; gx++) {
      const gy = sum - gx;
      if (gy < 0 || gy >= H) continue;
      const idx = order(gx, gy);
      const passed = idx < done;
      let g = -1, ready = false, stubble = false, straw = false, plowCell = false, baleCell = false;
      switch (st.state) {
        case 'sowing': g = passed ? 0.05 : -1; break;
        case 'growing': g = st.progress; break;
        case 'ready': g = 1; ready = true; break;
        case 'harvesting': if (passed) { stubble = true; straw = true; } else { g = 1; ready = true; } break;
        case 'plowing': plowCell = passed; stubble = !passed && soil !== 'raw'; break;
        case 'baling': if (passed) { stubble = true; baleCell = idx % 2 === 0; } else { stubble = true; straw = true; } break;
        case 'unload': stubble = true; baleCell = balesOut && idx % 2 === 0; straw = !balesOut && o.straw; break;
        default: stubble = soil === 'stubble'; straw = strawField;
      }
      const [cx, cy] = iso(o.x + gx + 0.5, o.y + gy + 0.5);
      if (plowCell) {
        ctx.fillStyle = 'rgba(70,35,10,0.45)';
        ctx.beginPath(); ctx.ellipse(cx, cy, TW / 2 - 6, TH / 2 - 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (baleCell) { bale(ctx, cx, cy); continue; }
      for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
        const [px, py] = iso(o.x + gx + u, o.y + gy + v);
        if (stubble) {
          ctx.strokeStyle = '#c9a53a'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px - 2, py - 3); ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py - 3); ctx.stroke();
          if (straw) { ctx.strokeStyle = '#e8c95a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 5, py + 1); ctx.lineTo(px + 5, py - 1); ctx.stroke(); }
        } else if (g >= 0 && crop) drawPlant(ctx, crop, px, py, g, ready, t);
      }
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
    const hasSeeder = farm && farm.machines.some(x => MACHINES[x.model].type === 'seeder');
    const tool = st.state === 'plowing' ? 'plow' : st.state === 'baling' ? 'baler' : st.state === 'sowing' && hasSeeder ? 'seeder' : null;
    drawVehicle(ctx, vx, vy, model, fwd ? 1 : -1, t, 0.85, true, tool);
  }
  const top = iso(o.x + W / 2, o.y + H / 2);
  const by = top[1] - 40 + Math.sin(t / 300) * 2;
  if (st.state === 'ready') bubble(ctx, top[0], by, CROPS[o.crop].icon, 0);
  else if (st.state === 'unload') bubble(ctx, top[0], by, ITEMS[st.item].icon, st.stock);
}

// ---------- ozdoby ----------
function drawDeco(ctx, o, d, now, t) {
  const [cx, cy] = iso(o.x + 0.5, o.y + 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx, cy, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
  switch (d.id) {
    case 'ker':
      for (const [dx, dy, r, c] of [[-8, -8, 10, '#3f8f3a'], [8, -8, 10, '#3f8f3a'], [0, -14, 12, '#4ea845'], [-3, -18, 6, '#63bd55']]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'kvetiny': {
      const N = iso(o.x + 0.15, o.y + 0.15), E = iso(o.x + 0.85, o.y + 0.15), S = iso(o.x + 0.85, o.y + 0.85), W = iso(o.x + 0.15, o.y + 0.85);
      poly(ctx, [N, E, S, W], '#7a5030');
      const cols = ['#e5484d', '#f5c542', '#ffffff', '#c45fd6', '#ff8a3d'];
      for (let i = 0; i < 9; i++) {
        const [x, y] = iso(o.x + 0.25 + (i % 3) * 0.25, o.y + 0.25 + Math.floor(i / 3) * 0.25);
        ctx.strokeStyle = '#4c8f37'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 7); ctx.stroke();
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.arc(x, y - 8, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'lavicka': {
      const a = iso(o.x + 0.2, o.y + 0.5), b = iso(o.x + 0.8, o.y + 0.5);
      ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3;
      for (const p of [a, b]) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 10); ctx.stroke(); }
      ctx.strokeStyle = '#a7703d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1] - 10); ctx.lineTo(b[0], b[1] - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a[0] + 3, a[1] - 20); ctx.lineTo(b[0] + 3, b[1] - 20); ctx.stroke();
      break;
    }
    case 'jablon':
      ctx.fillStyle = '#7a4e2a'; ctx.fillRect(cx - 3, cy - 22, 6, 22);
      ctx.fillStyle = '#3f8f3a'; ctx.beginPath(); ctx.arc(cx, cy - 32, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#52a862'; ctx.beginPath(); ctx.arc(cx - 5, cy - 37, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9342b';
      for (const [dx, dy] of [[-8, -28], [6, -36], [9, -24], [-2, -42], [0, -26]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 2.6, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'fontana': {
      ctx.fillStyle = '#9aa3ab'; ctx.beginPath(); ctx.ellipse(cx, cy - 4, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5fb3e6'; ctx.beginPath(); ctx.ellipse(cx, cy - 6, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8c0c7'; ctx.fillRect(cx - 3, cy - 22, 6, 16);
      for (let i = 0; i < 6; i++) {
        const k = ((t / 900 + i / 6) % 1);
        const ang = i * Math.PI / 3;
        ctx.fillStyle = `rgba(200,235,255,${1 - k})`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * k * 12, cy - 24 - Math.sin(k * Math.PI) * 10 + k * 14, 2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }
}

export function objectDepth(o) {
  const d = objSize(o);
  if (o.kind === 'velkepole') return o.x + o.y + 1;   // velké pole leží na zemi – kreslit brzy
  return o.x + o.y + (d.w + d.h) / 2;
}

export function drawObject(ctx, o, now, t, farm) {
  const d = BUILDINGS[o.kind];
  if (d.type === 'factory') drawFactory(ctx, o, d, now, t);
  else if (d.type === 'pen') drawPen(ctx, o, d, now, t);
  else if (d.type === 'main') drawMain(ctx, o, d, now, t, farm);
  else if (d.type === 'orchard') drawOrchard(ctx, o, d, now, t);
  else if (d.type === 'storage') drawStorage(ctx, o, d, now, t);
  else if (d.type === 'bigfield') drawBigField(ctx, o, d, now, t, farm);
  else drawDeco(ctx, o, d, now, t);
}

// duch při stavění/přesunu: ghost = { kind, x, y, ok }
export function drawGhost(ctx, g, now, t) {
  const d = g.kind === 'plot' ? { w: 1, h: 1 } : g.w ? { w: g.w, h: g.h } : BUILDINGS[g.kind];
  const N = iso(g.x, g.y), E = iso(g.x + d.w, g.y), S = iso(g.x + d.w, g.y + d.h), W = iso(g.x, g.y + d.h);
  poly(ctx, [N, E, S, W], g.ok ? 'rgba(120,230,110,0.45)' : 'rgba(230,80,60,0.45)');
  ctx.strokeStyle = g.ok ? '#e9ffe0' : '#ffd6cf'; ctx.lineWidth = 2;
  ctx.stroke();
  if (g.kind !== 'plot') {
    ctx.save();
    ctx.globalAlpha = 0.7;
    drawObject(ctx, { kind: g.kind, x: g.x, y: g.y, w: g.w, h: g.h, queue: [], animals: [], job: null }, now, t);
    ctx.restore();
  }
}
