// EKOfarm – ikony: malované předměty z public/img/i (assets.js), zbytek vlastní SVG (UI, nové ryby a jídla).
// V textu se píšou jako :klic: a funkce iconize() je nahradí obrázkem.
import { hasAsset, assetUrl } from './sprites.js?v=17';

const S = (body, bg = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${bg}${body}</svg>`;


export const ICONS = {
  // ---- v9: zelenina a ovoce ----
  // ---- v9: výrobky ----
  // ---- v9: budovy, zvířata, náčiní ----
  news: S('<rect x="3" y="6" width="22" height="21" rx="2" fill="#fff8e7" stroke="#a0763f" stroke-width="2"/><path d="M25 10h4v15a2 2 0 01-4 0z" fill="#e8d9b8" stroke="#a0763f" stroke-width="1.6"/><rect x="6" y="9" width="16" height="4" fill="#c8452d"/><path d="M6 16h7M6 19h7M6 22h7M15 16h7M15 19h7M15 22h7" stroke="#7a6040" stroke-width="1.4"/>'),
  star: S('<path d="M16 3l3.8 7.8 8.6 1.2-6.2 6 1.5 8.6L16 22.6 8.3 26.6l1.5-8.6-6.2-6 8.6-1.2z" fill="#f5b82e"/>'),

  // ---- plodiny ----
  // ---- ovoce ----
  // ---- výrobky ----
  // ---- budovy, zvířata, stroje ----
  field: S('<path d="M2 18L16 10l14 8-14 8z" fill="#8e5d33"/><path d="M6 18l14-8M10 20.5l14-8M14 23l12-7" stroke="#6f4524" stroke-width="1.4"/><path d="M9 17v-5M15 14v-5M21 16v-5" stroke="#e3b52e" stroke-width="2"/>'),
  // ---- rozhraní ----
  coin: S('<circle cx="16" cy="16" r="12" fill="#f5c542"/><circle cx="16" cy="16" r="9" fill="#e8b22e"/><path d="M16 9v14M12.5 12.5c0-2 7-2 7 0s-7 1.5-7 4 7 2.5 7 0" stroke="#fff3c4" stroke-width="2" fill="none"/>'),
  xp: S('<path d="M16 2l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4L16 23.6l-8.4 4.4 1.6-9.4L2.4 12l9.4-1.4z" fill="#ffc928" stroke="#e09a12" stroke-width="1.2"/>'),
  lock: S('<rect x="7" y="14" width="18" height="14" rx="3" fill="#8a7a5c"/><path d="M11 14V10a5 5 0 0110 0v4" stroke="#8a7a5c" stroke-width="3" fill="none"/><circle cx="16" cy="21" r="2" fill="#f3e3c3"/>'),
  hammer: S('<path d="M14 12l14 14-3 3-14-14z" fill="#a7703d"/><path d="M4 9l7-7 9 9-4 4-3-3-3 3z" fill="#7d8a96"/>'),
  cart: S('<path d="M2 5h5l4 15h15l3-11H9" stroke="#6f4f28" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M10 9h18l-2.6 9H12z" fill="#f2c94c"/><circle cx="13" cy="26" r="2.6" fill="#6f4f28"/><circle cx="24" cy="26" r="2.6" fill="#6f4f28"/>'),
  gear: S('<circle cx="16" cy="16" r="9" fill="#8a8f96"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="14" y="2" width="4" height="7" fill="#8a8f96" transform="rotate(${i * 45} 16 16)"/>`).join('') + '<circle cx="16" cy="16" r="4" fill="#f3e3c3"/>'),
  truck: S('<rect x="2" y="9" width="17" height="13" fill="#4f8fd6"/><path d="M19 13h6l4 5v4H19z" fill="#2f63a0"/><rect x="21" y="14" width="4" height="3" fill="#cfe8f5"/><circle cx="8" cy="24" r="3.4" fill="#2f2a26"/><circle cx="24" cy="24" r="3.4" fill="#2f2a26"/>'),
  box: S('<path d="M4 10l12-6 12 6v14l-12 6-12-6z" fill="#c9965a"/><path d="M4 10l12 6 12-6M16 16v14" stroke="#9a6c38" stroke-width="1.6" fill="none"/><path d="M10 7l12 6" stroke="#e8c595" stroke-width="2"/>'),
  axe: S('<path d="M10 6l3-3 17 17-3 3z" fill="#a7703d"/><path d="M5 4c4-2 9 0 10 4l-7 7C4 14 2 9 5 4z" fill="#8a8f96"/>'),
  gift: S('<rect x="4" y="12" width="24" height="16" fill="#c8452d"/><rect x="3" y="9" width="26" height="5" fill="#e0573f"/><rect x="14" y="9" width="4" height="19" fill="#f5c542"/><path d="M16 9c-3-6-9-5-7-1M16 9c3-6 9-5 7-1" stroke="#f5c542" stroke-width="2.4" fill="none"/>'),
  trophy: S('<path d="M9 4h14v8a7 7 0 01-14 0z" fill="#f5c542"/><path d="M9 6H4c0 5 3 7 6 7M23 6h5c0 5-3 7-6 7" stroke="#e09a12" stroke-width="2" fill="none"/><rect x="14" y="18" width="4" height="5" fill="#e09a12"/><rect x="9" y="23" width="14" height="5" rx="1" fill="#a7703d"/>'),
  clock: S('<circle cx="16" cy="16" r="12" fill="#fff8e7" stroke="#a0763f" stroke-width="2.4"/><path d="M16 9v7l5 3" stroke="#4a3218" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
  sound: S('<path d="M4 12h6l7-6v20l-7-6H4z" fill="#6f4f28"/><path d="M21 11c2 2 2 8 0 10M25 8c4 4 4 12 0 16" stroke="#6f4f28" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  mute: S('<path d="M4 12h6l7-6v20l-7-6H4z" fill="#6f4f28"/><path d="M21 12l8 8M29 12l-8 8" stroke="#c8452d" stroke-width="2.4"/>'),
  up: S('<path d="M16 6l10 12H20v8h-8v-8H6z" fill="#5fae3a"/>'),
  down: S('<path d="M16 26L6 14h6V6h8v8h6z" fill="#c8452d"/>'),
  sign: S('<rect x="14" y="14" width="4" height="16" fill="#7a4e2a"/><rect x="3" y="4" width="26" height="13" rx="2" fill="#f3e3c3" stroke="#8a5a35" stroke-width="2"/><path d="M8 10.5h16" stroke="#c8452d" stroke-width="2.4"/>'),
  user: S('<circle cx="16" cy="11" r="6" fill="#a0763f"/><path d="M4 29c0-7 5-11 12-11s12 4 12 11z" fill="#a0763f"/>'),
  // ---- v10 ----
};

// ---- v11: ryby, med, rybník, včelín, udice ----
const fishIc = (c, belly, fin, extra = '', len = 1) => S(`<path d="M${4 + (1 - len) * 6} 16c4-7 ${12 * len} -8 ${19 * len} 0-${7 * len} 8-${15 * len} 7-${19 * len} 0z" fill="${c}"/><path d="M${6 + (1 - len) * 6} 18c5 3 ${11 * len} 3 ${16 * len} -1" stroke="${belly}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M${23 - (1 - len) * 2} 16l7-6v12z" fill="${fin}"/><path d="M13 10l4-4 3 5z" fill="${fin}"/><circle cx="${8 + (1 - len) * 6}" cy="14.5" r="1.6" fill="#2f2a26"/>${extra}`);
Object.assign(ICONS, {
  // ---- v15: další ryby, jídla, počasí, chat ----
  karas: fishIc('#d9b44a', '#f5e0a0', '#b08a2a', '', 0.8),
  cejn: S('<path d="M5 16c3-8 13-10 18-1-5 9-15 8-18 1z" fill="#b0b8a0"/><path d="M8 18c4 2 10 2 14-1" stroke="#e0e6d8" stroke-width="2" fill="none"/><path d="M22 15l8-6v13z" fill="#8a9480"/><path d="M12 8l5-3 3 5z" fill="#8a9480"/><circle cx="9" cy="14" r="1.4" fill="#2f2a26"/>'),
  amur: fishIc('#8a9a6a', '#c8d0a8', '#6a7a4a', [11, 15, 19].map(x => `<path d="M${x} 12c1 1 1 3 0 4" stroke="#6a7a4a" stroke-width="1" fill="none"/>`).join('')),
  uhor: S('<path d="M3 18c4-6 8 2 12-2s8-6 13 0c-4 0-6 3-9 4s-7 4-11 2c-2-1-4-2-5-4z" fill="#5a5a3a"/><path d="M6 19c4 1 9-1 13-3" stroke="#a8a070" stroke-width="1.6" fill="none"/><circle cx="25" cy="16" r="1.2" fill="#2f2a26"/>'),
  bolen: fishIc('#a0aab8', '#e8edf3', '#7a8494', '<path d="M7 16h3" stroke="#2f2a26" stroke-width="1.6"/>', 0.95),
  jeseter: S('<path d="M2 16c6-5 16-6 22-2l6-5v14l-6-5c-6 4-16 3-22-2z" fill="#7a8a9a"/>' + [8, 12, 16, 20].map(x => `<path d="M${x} 12l1.5-2 1.5 2z" fill="#dfe6ee"/>`).join('') + '<path d="M2 16l-1 3" stroke="#5a6a7a" stroke-width="1.4"/><circle cx="6" cy="15" r="1" fill="#2f2a26"/>'),
  rybi_karbanatky: S('<ellipse cx="16" cy="22" rx="14" ry="6" fill="#f3e3c3" stroke="#c9b993"/>' + [[10, 19], [17, 21], [22, 17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.4" fill="#c98a4a"/><ellipse cx="${x - 1}" cy="${y - 1}" rx="2.4" ry="1.2" fill="#e0b070"/>`).join('')),
  amur_gril: S('<path d="M3 24h26M3 20h26" stroke="#4a4f5a" stroke-width="1.6"/><path d="M5 18c4-6 14-7 19-1-5 6-15 6-19 1z" fill="#a89a5a"/><path d="M24 17l5-3v7z" fill="#8a7a4a"/><path d="M10 15l2 5M15 14l2 6M20 15l2 5" stroke="#4a3a20" stroke-width="1.6"/>'),
  uzeny_uhor: S('<path d="M16 2v5" stroke="#7a4e2a" stroke-width="2"/><path d="M16 7c-6 2-8 6-4 9s4 7-2 9c4 2 10 1 12-3s-4-7-2-10 2-4-4-5z" fill="#8a5a2a"/><path d="M14 10c-2 2-1 4 1 5" stroke="#d9a05b" stroke-width="1.4" fill="none"/>'),
  bolen_bylinky: S('<ellipse cx="16" cy="22" rx="14" ry="6" fill="#f3e3c3" stroke="#c9b993"/><path d="M6 20c4-5 14-6 20-1-6 5-16 5-20 1z" fill="#c8d0dc"/>' + [[10, 17], [15, 16], [20, 17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1" fill="#5fae3a" transform="rotate(-30 ${x} ${y})"/>`).join('') + '<rect x="12" y="20" width="6" height="3" rx="1" fill="#f5e07a"/>'),
  kaviar: S('<ellipse cx="16" cy="24" rx="12" ry="4" fill="#9fb7c9"/><path d="M5 14h22v8a11 4 0 01-22 0z" fill="#d9e6ee" stroke="#9fb7c9"/><ellipse cx="16" cy="14" rx="11" ry="3.6" fill="#2f2a26"/>' + [[10, 14], [14, 13], [18, 14], [22, 13], [16, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#6a6a7a"/>`).join('')),
  w_sun: S('<circle cx="16" cy="16" r="7" fill="#f5c542"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="15" y="2" width="2" height="5" rx="1" fill="#f5a02e" transform="rotate(${i * 45} 16 16)"/>`).join('')),
  w_cloud: S('<circle cx="11" cy="11" r="6" fill="#f5c542"/><path d="M8 26a6 6 0 010-12 8 8 0 0115 2 5 5 0 011 10z" fill="#e9f2f5" stroke="#b8c7d0"/>'),
  w_rain: S('<path d="M8 19a6 6 0 010-12 8 8 0 0115 2 5 5 0 011 10z" fill="#b8c7d0" stroke="#8a9aa8"/>' + [[10, 23], [16, 25], [22, 23]].map(([x, y]) => `<path d="M${x} ${y}l-2 5" stroke="#4f8fd6" stroke-width="2.2" stroke-linecap="round"/>`).join('')),
  w_hot: S('<circle cx="16" cy="13" r="7" fill="#f08a24"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="15" y="0" width="2" height="4" rx="1" fill="#e0602d" transform="rotate(${i * 45} 16 13)"/>`).join('') + '<path d="M5 26c3-2 5 2 8 0s5 2 8 0 5 2 7 0" stroke="#c9a24a" stroke-width="2" fill="none"/>'),
  chat: S('<path d="M4 6h24a2 2 0 012 2v13a2 2 0 01-2 2H13l-6 5v-5H4a2 2 0 01-2-2V8a2 2 0 012-2z" fill="#4f8fd6"/><circle cx="10" cy="14.5" r="2" fill="#fff"/><circle cx="16" cy="14.5" r="2" fill="#fff"/><circle cx="22" cy="14.5" r="2" fill="#fff"/>'),
  book: S('<path d="M4 6c4-2 8-2 12 1v21c-4-3-8-3-12-1z" fill="#4f8fd6"/><path d="M28 6c-4-2-8-2-12 1v21c4-3 8-3 12-1z" fill="#3f6fb5"/><path d="M7 10c2-1 4-1 6 0M7 14c2-1 4-1 6 0M19 10c2-1 4-1 6 0M19 14c2-1 4-1 6 0" stroke="#cfe8f5" stroke-width="1.2" fill="none"/>'),
  bell: S('<path d="M16 4a2 2 0 012 2c5 1 7 5 7 10v5l3 3H4l3-3v-5c0-5 2-9 7-10a2 2 0 012-2z" fill="#f5c542"/><circle cx="16" cy="27" r="3" fill="#e09a12"/>'),
});



const urlCache = {};
export function iconUrl(key) {
  if (hasAsset('i', key)) return assetUrl('i', key);   // malovaná ikona (public/img/i)
  if (!ICONS[key]) return '';
  return urlCache[key] || (urlCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[key]));
}

export function ic(key, cls = '') {
  return ICONS[key] || hasAsset('i', key) ? `<img class="ic${cls ? ' ' + cls : ''}" src="${iconUrl(key)}" alt="" decoding="sync">` : '';
}

// „Mám 5 :coin:“ → text s obrázky
export function iconize(html) {
  return String(html).replace(/:([a-z_0-9]+):/g, (m, k) => (ICONS[k] || hasAsset('i', k) ? ic(k) : m));
}

// ---------- canvas ----------
const imgCache = {};
export function iconImage(key) {
  if (!ICONS[key] && !hasAsset('i', key)) return null;
  if (!imgCache[key]) {
    const im = new Image();
    im.src = iconUrl(key);
    imgCache[key] = im;
  }
  return imgCache[key].complete && imgCache[key].naturalWidth ? imgCache[key] : null;
}

export function drawIcon(ctx, key, x, y, size) {
  const im = iconImage(key);
  if (im) ctx.drawImage(im, x - size / 2, y - size / 2, size, size);
}

// text s :ikonami: vycentrovaný na x
export function drawIconText(ctx, text, x, y, size, stroke) {
  const parts = String(text).split(/:([a-z_0-9]+):/);
  const widths = parts.map((p, i) => (i % 2 ? size : ctx.measureText(p).width));
  let cx = x - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  parts.forEach((p, i) => {
    if (i % 2) drawIcon(ctx, p, cx + size / 2, y - size * 0.35, size);
    else if (p) {
      if (stroke) ctx.strokeText(p, cx, y);
      ctx.fillText(p, cx, y);
    }
    cx += widths[i];
  });
}
