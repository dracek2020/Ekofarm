// EKOfarm – obrázky budov (vlastní grafika hráče, public/img/b/*.webp).
// Když obrázek chybí nebo se ještě nenačetl, budova se kreslí kódem jako dřív.
const LEVELED = { statek: 10, sklad: 10 };   // jiný obrázek pro každou úroveň budovy
// ohrady se kreslí kódem i s chodícími zvířaty (jako do v11); obrázek prázdného výběhu jde přidat později:
// dát 'kurnik' apod. sem a PENS_EMPTY = true
const SINGLE = ['semenarna', 'krmivarna', 'pekarna', 'mlyn', 'konzervarna', 'skolka',
  'dzusarna', 'mlekarna', 'olejna', 'marmeladarna', 'cukrovar', 'uzenarstvi', 'textilka'];
// zvířata: obrázek otočený doleva dolů, nohy na spodním okraji uprostřed; doprava se zrcadlí.
// w = šířka ve hře (px), obrázek je ve 2× rozlišení
// true = obrázky ohrad jsou prázdné výběhy a zvířata kreslí hra; teď mají ohrady zvířata namalovaná v obrázku
export const PENS_EMPTY = true;
export const ANIMAL_SPRITES = { slepice: { w: 32, h: 32 }, krava: { w: 72, h: 60 }, prase: { w: 56, h: 48 }, ovce: { w: 56, h: 48 } };
export const SPRITE_FILES = [
  ...Object.keys(ANIMAL_SPRITES).map(k => `img/b/zvire_${k}.webp`),
  ...Object.entries(LEVELED).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => `img/b/${k}_${i + 1}.webp`)),
  ...SINGLE.map(k => `img/b/${k}.webp`),
];
const spriteCache = {};
function spriteSrc(p) {
  // v testovací verzi (jeden soubor) jsou obrázky vložené přímo (SPRITE_DATA z build-artifact.mjs)
  return (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA[p]) || '/' + p;
}
export function spriteName(o) {
  if (LEVELED[o.kind]) return `${o.kind}_${Math.max(1, Math.min(LEVELED[o.kind], o.lvl || 1))}`;
  return SINGLE.includes(o.kind) ? o.kind : null;
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
function loadSprite(name) {
  if (typeof Image === 'undefined') return null;
  let im = spriteCache[name];
  if (!im) { im = spriteCache[name] = new Image(); im.src = spriteSrc(`img/b/${name}.webp`); }
  return im.complete && im.naturalWidth ? im : null;
}
export const animalImage = animal => (ANIMAL_SPRITES[animal] ? loadSprite('zvire_' + animal) : null);
export function spriteImage(o) {
  const name = spriteName(o);
  return name ? loadSprite(name) : null;
}
