// EKOfarm – grafika hry (public/img/<druh>/<jméno>.webp, seznam v assets.js).
// Druhy: b = budovy a ozdoby (plátno podle šablony), t = dlaždice země a plot, c = plodiny, s = stromy,
// z = zvířata, m = stroje, p = lidé, i = ikony předmětů.
import { ASSETS } from './assets.js?v=31';

const assetSets = {};
for (const k in ASSETS) assetSets[k] = new Set(ASSETS[k]);
export const hasAsset = (kind, name) => !!(assetSets[kind] && assetSets[kind].has(name));
// v testovací verzi (jeden soubor) jsou obrázky vložené přímo (SPRITE_DATA z build-artifact.mjs)
export function assetUrl(kind, name) {
  const p = `img/${kind}/${name}.webp`;
  return (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA[p]) || '/' + p;
}
const assetCache = {};
function assetEl(kind, name) {
  const key = kind + '/' + name;
  let im = assetCache[key];
  if (!im && typeof Image !== 'undefined') {
    im = assetCache[key] = new Image();
    // hotovo = načteno, nebo chyba. Nečeká se na im.decode() – v Safari na iPadu umí zůstat viset a hra se pak nespustila.
    im._done = new Promise(r => { im.onload = im.onerror = () => r(); });
    im.src = assetUrl(kind, name);
  }
  return im;
}
// načtený obrázek, nebo null (ještě se načítá / neexistuje)
export function asset(kind, name) {
  if (!hasAsset(kind, name)) return null;
  const im = assetEl(kind, name);
  return im && im.complete && im.naturalWidth ? im : null;
}
// načte grafiku předem; items = [[druh, jméno], …] nebo druhy ['t', 'c', …]; onProgress(hotovo, celkem)
export function preloadAssets(items, onProgress) {
  const seen = new Set();
  const list = items.flatMap(x => (Array.isArray(x) ? (hasAsset(x[0], x[1]) ? [x] : []) : (ASSETS[x] || []).map(n => [x, n])))
    .filter(([k, n]) => !seen.has(k + '/' + n) && seen.add(k + '/' + n));
  let done = 0;
  return Promise.all(list.map(([k, n]) => {
    const im = assetEl(k, n);
    return (im ? im._done : Promise.resolve()).then(() => { done++; if (onProgress) onProgress(done, list.length); });
  }));
}

// obrázek budovy: Statek a Sklad mají obrázek pro každou úroveň, ostatní jeden
const LEVELED = { statek: 10, sklad: 10 };
// v29: domky pro pracovníky – dokud nejsou vlastní obrázky, zastoupí je domky z Městečka
const STAND_IN = { chatrc: 'domek_c', chata: 'domek_b', dum: 'domek_a' };
export function spriteName(o) {
  if (LEVELED[o.kind]) return `${o.kind}_${Math.max(1, Math.min(LEVELED[o.kind], o.lvl || 1))}`;
  if (hasAsset('b', o.kind)) return o.kind;
  return STAND_IN[o.kind] && hasAsset('b', STAND_IN[o.kind]) ? STAND_IN[o.kind] : null;
}
// kde v obrázku začíná budova (0..1 od horního okraje) – pro bublinu nad střechou
export function spriteTop(im) {
  if (im._top !== undefined) return im._top;
  im._top = 0.1;
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 40;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 40);
    const a = x.getImageData(0, 0, 32, 40).data;
    for (let y = 0; y < 40; y++) { let hit = false; for (let i = 0; i < 32; i++) if (a[(y * 32 + i) * 4 + 3] > 40) { hit = true; break; } if (hit) { im._top = y / 40; break; } }
  } catch { /* nevadí */ }
  return im._top;
}
// šířka zvířete ve hře (px); obrázek je otočený doleva, doprava se zrcadlí
export const ANIMAL_W = { slepice: 24, krava: 64, prase: 48, ovce: 48 };
