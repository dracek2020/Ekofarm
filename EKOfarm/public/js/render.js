// EKOfarm – izometrické vykreslování farmy na canvas.
import { GRID_W, GRID_H, CROPS, plotState } from './rules.js';
import { drawObject, drawGhost, objectDepth } from './objects.js';

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

export function inFarm(gx, gy) {
  return gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
}

// pevné rozmístění stromů kolem farmy (deterministické)
const BG_TREES = (() => {
  const out = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let gy = -6; gy < GRID_H + 5; gy++) {
    for (let gx = -6; gx < GRID_W + 5; gx++) {
      if (inFarm(gx, gy)) continue;
      const dist = Math.max(-gx, -gy, gx - GRID_W + 1, gy - GRID_H + 1);
      if (dist >= 2 && rnd() < 0.35) out.push({ gx, gy, s: 0.8 + rnd() * 0.5, h: rnd() });
    }
  }
  out.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
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

function drawTree(ctx, t) {
  const [x, y] = cellCenter(t.gx, t.gy);
  const s = t.s;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y, 22 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a4e2a';
  ctx.fillRect(x - 3 * s, y - 22 * s, 6 * s, 22 * s);
  const g = t.h < 0.5 ? ['#3f8f3a', '#4ea845', '#63bd55'] : ['#2f7a3c', '#3d9150', '#52a862'];
  ctx.fillStyle = g[0]; ctx.beginPath(); ctx.arc(x, y - 34 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g[1]; ctx.beginPath(); ctx.arc(x - 6 * s, y - 40 * s, 14 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g[2]; ctx.beginPath(); ctx.arc(x - 9 * s, y - 45 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
}

function drawFence(ctx) {
  const corner = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2];
  const pts = [corner(0, 0), corner(GRID_W, 0), corner(GRID_W, GRID_H), corner(0, GRID_H)];
  ctx.strokeStyle = '#9b6b3c';
  ctx.lineWidth = 3;
  for (const off of [6, 12]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - off) : ctx.moveTo(x, y - off)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = '#7d532c';
  const post = (gx, gy) => { const [x, y] = corner(gx, gy); ctx.fillRect(x - 2, y - 16, 4, 16); };
  for (let i = 0; i <= GRID_W; i++) { post(i, 0); post(i, GRID_H); }
  for (let j = 1; j < GRID_H; j++) { post(0, j); post(GRID_W, j); }
}

function drawPlot(ctx, gx, gy, planted) {
  const [x, y] = cellCenter(gx, gy);
  const w = TW - 8, h = TH - 4, d = 5;
  // boky
  ctx.fillStyle = '#5c3a1c';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y + h / 2); ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + d); ctx.lineTo(x, y + h / 2 + d); ctx.lineTo(x - w / 2, y + d);
  ctx.closePath(); ctx.fill();
  diamond(ctx, x, y, w, h);
  ctx.fillStyle = planted ? '#6f4524' : '#8e5d33';
  ctx.fill();
  // brázdy
  ctx.strokeStyle = planted ? 'rgba(40,20,5,0.35)' : 'rgba(60,30,10,0.3)';
  ctx.lineWidth = 2;
  for (let k = 1; k <= 3; k++) {
    const u = k / 4;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + u * w / 2, y - u * h / 2 + 2);
    ctx.lineTo(x + u * w / 2, y + h / 2 - u * h / 2 - 2);
    ctx.stroke();
  }
}

function drawPlant(ctx, crop, px, py, g, ready, t) {
  const sway = ready ? Math.sin(t / 400 + px * 0.13) * 1.6 : 0;
  if (g < 0.2) {
    ctx.fillStyle = '#7cc04f';
    ctx.beginPath(); ctx.ellipse(px - 2, py - 3, 2.5, 1.5, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 2, py - 3, 2.5, 1.5, 0.6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const s = Math.min(1, 0.35 + g * 0.65);
  switch (crop) {
    case 'wheat': {
      const h = 18 * s;
      ctx.strokeStyle = ready ? '#c9a53a' : '#79b84a';
      ctx.lineWidth = 1.6;
      for (const dx of [-3, 0, 3]) {
        ctx.beginPath(); ctx.moveTo(px + dx, py); ctx.lineTo(px + dx * 1.3 + sway, py - h); ctx.stroke();
        ctx.fillStyle = ready ? '#f0cf55' : '#9ccc5c';
        ctx.beginPath(); ctx.ellipse(px + dx * 1.3 + sway, py - h - 3, 1.8, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'corn': {
      const h = 26 * s;
      ctx.strokeStyle = '#4f9a3a'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sway, py - h); ctx.stroke();
      ctx.strokeStyle = '#66b04a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(px, py - h * 0.4); ctx.quadraticCurveTo(px - 8, py - h * 0.6, px - 10, py - h * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py - h * 0.6); ctx.quadraticCurveTo(px + 8, py - h * 0.8, px + 10, py - h * 0.55); ctx.stroke();
      if (ready) {
        ctx.fillStyle = '#f6c63d';
        ctx.beginPath(); ctx.ellipse(px + 3 + sway, py - h * 0.55, 2.6, 5.5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'carrot': {
      const h = 12 * s;
      if (ready) {
        ctx.fillStyle = '#f07f2a';
        ctx.beginPath(); ctx.ellipse(px, py - 1, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#4fa63c';
      for (const a of [-0.5, 0, 0.5]) {
        ctx.beginPath(); ctx.ellipse(px + Math.sin(a) * 4 + sway, py - h / 2 - 1, 1.8, h / 2, a, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'soy': {
      const r = 7 * s;
      ctx.fillStyle = '#4c8f37';
      ctx.beginPath(); ctx.arc(px + sway, py - r, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#69ab4b';
      ctx.beginPath(); ctx.arc(px - 2 + sway, py - r - 2, r * 0.6, 0, Math.PI * 2); ctx.fill();
      if (ready) {
        ctx.fillStyle = '#d9d27a';
        for (const [dx, dy] of [[-3, -4], [3, -7], [1, -2]]) {
          ctx.beginPath(); ctx.ellipse(px + dx + sway, py + dy - r * 0.4, 1.4, 3, 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
  }
}

function drawCrops(ctx, plot, st, t) {
  const [cx, cy] = cellCenter(plot.x, plot.y);
  const top = cy - TH / 2;
  const pts = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push([i, j]);
  pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [i, j] of pts) {
    const u = (i + 0.5) / 3, v = (j + 0.5) / 3;
    const px = cx + (u - v) * (TW - 16) / 2;
    const py = top + 2 + (u + v) * (TH - 6) / 2;
    drawPlant(ctx, plot.crop, px, py, st.progress, st.state === 'ready', t);
  }
  if (st.state === 'ready') {
    const a = 0.5 + 0.5 * Math.sin(t / 250);
    ctx.fillStyle = `rgba(255,255,220,${0.4 + a * 0.5})`;
    ctx.beginPath(); ctx.arc(cx + 14, cy - 24 - a * 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

// view = { farm, now, t, cam, W, H, ghost, hoverCell, bubble, floats }
export function drawScene(ctx, view) {
  const { farm, cam, W, H, t } = view;
  ctx.fillStyle = '#5b9e3e';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // tráva farmy
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const [x, y] = cellCenter(gx, gy);
      diamond(ctx, x, y, TW + 1, TH + 1);
      ctx.fillStyle = (gx + gy) % 2 ? '#7cc251' : '#78bd4d';
      ctx.fill();
    }
  }
  drawFence(ctx);
  for (const tr of BG_TREES) drawTree(ctx, tr);

  // pole v pořadí hloubky
  // pole a budovy v pořadí hloubky
  const ghost = view.ghost;
  const items = farm.plots.map(p => ({ d: p.x + p.y + 1, p }));
  for (const o of farm.objects) if (!ghost || ghost.moveId !== o.id) items.push({ d: objectDepth(o), o });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    if (it.p) {
      const p = it.p;
      drawPlot(ctx, p.x, p.y, !!p.crop);
      if (p.crop) drawCrops(ctx, p, plotState(p, view.now), t);
    } else drawObject(ctx, it.o, view.now, t, farm);
  }
  if (ghost) drawGhost(ctx, ghost, view.now, t);

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
    ctx.strokeText(f.text, sx, sy - 30 - age * 40);
    ctx.fillStyle = '#fff';
    ctx.fillText(f.text, sx, sy - 30 - age * 40);
    ctx.globalAlpha = 1;
  }
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
