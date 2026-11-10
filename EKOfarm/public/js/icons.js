// EKOfarm – vlastní ikony (SVG, kreslené pro tuto hru; žádné emoji ani cizí obrázky).
// V textu se píšou jako :klic: a funkce iconize() je nahradí obrázkem.

const S = (body, bg = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${bg}${body}</svg>`;
const leaf = (x, y, r, c = '#4fa63c') => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 2}" fill="${c}"/>`;

// generátory podobných ikon
const jar = (c, lid = '#c8452d') => S(`<rect x="7" y="9" width="18" height="20" rx="4" fill="#e9f2f5" stroke="#9fb7c9" stroke-width="1.4"/><rect x="9" y="13" width="14" height="14" rx="3" fill="${c}"/><rect x="8" y="4" width="16" height="6" rx="1.5" fill="${lid}"/><rect x="11" y="16" width="5" height="3" rx="1" fill="#fff" opacity=".45"/>`);
const bottle = c => S(`<path d="M13 3h6v6c3 2 5 4 5 8v10a2 2 0 01-2 2H10a2 2 0 01-2-2V17c0-4 2-6 5-8z" fill="#e9f2f5" stroke="#9fb7c9" stroke-width="1.2"/><path d="M8.5 16h15v11a2 2 0 01-2 2h-11a2 2 0 01-2-2z" fill="${c}"/><rect x="12" y="1.5" width="8" height="3" fill="#6f4f28"/><rect x="10" y="19" width="12" height="5" fill="#fff8e7" opacity=".8"/>`);
const cake = (top, dots) => S(`<path d="M4 18h24v8a3 3 0 01-3 3H7a3 3 0 01-3-3z" fill="#d9a05b"/><ellipse cx="16" cy="18" rx="12" ry="5" fill="${top}"/>` + [[10, 17], [16, 15], [22, 17], [13, 20], [19, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${dots}"/>`).join(''));
const bowl = (c, bits = '') => S(`<ellipse cx="16" cy="15" rx="13" ry="4" fill="${c}"/><path d="M3 15c0 8 6 13 13 13s13-5 13-13z" fill="#f3e3c3" stroke="#c9b993" stroke-width="1.2"/>${bits}`);
const sack = c => S(`<path d="M8 8c-3 6-4 14-2 18 1 3 4 4 10 4s9-1 10-4c2-4 1-12-2-18z" fill="${c}"/><path d="M9 8h14l-2-4H11z" fill="#c9a36a"/><path d="M10 8c3 2 9 2 12 0" stroke="#8a6434" stroke-width="1.6" fill="none"/>`);
const berries = (c, hi, pts = [[12, 13], [20, 13], [16, 18], [11, 21], [21, 21], [16, 25]]) => S(`<path d="M16 4v8M16 6c4-3 8-2 9 0" stroke="#4f8f37" stroke-width="2" fill="none"/>` + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="${c}"/><circle cx="${x - 1.3}" cy="${y - 1.4}" r="1.2" fill="${hi}"/>`).join(''));
const roundFruit = (c, hi, stem = '#6b4a25', leaf = '#4fa63c') => S(`<circle cx="16" cy="18" r="11" fill="${c}"/><ellipse cx="11.5" cy="14" rx="3" ry="4" fill="${hi}" opacity=".7"/><path d="M16 7V3" stroke="${stem}" stroke-width="2"/><ellipse cx="20" cy="5" rx="3.4" ry="1.7" fill="${leaf}"/>`);

export const ICONS = {
  // ---- v9: zelenina a ovoce ----
  redkvicka: S('<circle cx="16" cy="20" r="8" fill="#e0405a"/><path d="M16 28v3" stroke="#f2ede0" stroke-width="2"/><ellipse cx="13" cy="17" rx="2" ry="3" fill="#f07a8a"/>' + leaf(12, 7, 2.2) + leaf(20, 7, 2.2) + leaf(16, 5, 2.4, '#5fae3a')),
  salat: S('<circle cx="16" cy="18" r="11" fill="#6fbf4a"/><circle cx="16" cy="18" r="8" fill="#8fd45a"/><circle cx="16" cy="18" r="4.5" fill="#b7e68a"/><path d="M16 7v22M5 18h22M8 10l16 16M24 10L8 26" stroke="#5fa83f" stroke-width="1" opacity=".6"/>'),
  rajce: roundFruit('#e0402d', '#f07a6e', '#3f8a25', '#4fa63c'),
  okurka: S('<path d="M6 24C6 14 16 6 25 6c2 0 3 2 2 4-3 10-10 18-19 18-1 0-2-2-2-4z" fill="#3f8f3a"/><path d="M10 22c4-2 10-8 13-13" stroke="#7cc04f" stroke-width="2" fill="none"/>' + [[12, 18], [16, 15], [20, 11], [14, 22], [19, 17]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#d9f2b0"/>`).join('')),
  cibule: S('<path d="M16 6c-2 4-10 8-10 15 0 5 4 8 10 8s10-3 10-8c0-7-8-11-10-15z" fill="#d9a441"/><path d="M16 9c-1 6-1 14 0 19M12 13c-2 4-2 10 0 14M20 13c2 4 2 10 0 14" stroke="#b07a28" stroke-width="1" fill="none"/><path d="M16 6V2" stroke="#7cc04f" stroke-width="2"/>'),
  cesnek: S('<path d="M16 6c-3 4-11 8-11 15 0 5 5 8 11 8s11-3 11-8c0-7-8-11-11-15z" fill="#f2ede0" stroke="#d6c6a2" stroke-width="1.2"/><path d="M16 8v20M11 13c-2 4-2 10 0 14M21 13c2 4 2 10 0 14" stroke="#d6c6a2" stroke-width="1.2" fill="none"/>'),
  paprika: S('<path d="M8 12c0-3 3-4 5-3 2-1 4-1 6 0 2-1 5 0 5 3 0 8-2 17-8 17S8 20 8 12z" fill="#e8502a"/><path d="M16 9V4h3" stroke="#3f8a25" stroke-width="2.4" fill="none"/><ellipse cx="12" cy="15" rx="1.6" ry="4" fill="#f59a7a"/>'),
  zeli: S('<circle cx="16" cy="17" r="12" fill="#9ccf6a"/><circle cx="16" cy="17" r="8" fill="#c4e69a"/><path d="M16 5c-3 6-3 18 0 24M9 8c4 4 6 12 6 20M23 8c-4 4-6 12-6 20" stroke="#7cb04a" stroke-width="1.2" fill="none"/>'),
  hrach: S('<path d="M4 20C8 10 20 6 28 10c-4 10-16 14-24 10z" fill="#5fae3a"/>' + [9, 14, 19, 24].map((x, i) => `<circle cx="${x}" cy="${16 - i * 1.2}" r="2.6" fill="#a8dc6a"/>`).join('') + '<path d="M28 10c1-3 2-5 1-7" stroke="#3f8a25" stroke-width="1.6" fill="none"/>'),
  dyne: S('<ellipse cx="16" cy="19" rx="13" ry="10" fill="#f08a24"/><path d="M16 9c-3 4-3 16 0 20M10 10c-3 5-3 14 0 18M22 10c3 5 3 14 0 18" stroke="#c8661a" stroke-width="1.4" fill="none"/><rect x="14.5" y="4" width="3" height="6" rx="1" fill="#6b8a2a"/>'),
  jahody: S('<path d="M16 29C7 22 5 14 9 10c3-3 6-1 7 0 1-1 4-3 7 0 4 4 2 12-7 19z" fill="#e0283c"/>' + [[12, 14], [16, 13], [20, 14], [14, 18], [18, 18], [16, 22], [12, 19], [20, 19]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".8" ry="1.1" fill="#ffe08a"/>`).join('') + '<path d="M10 9l6 2 6-2-3-3-3 2-3-2z" fill="#4fa63c"/>'),
  meloun: S('<path d="M3 13a13 13 0 0026 0z" fill="#3f8a2e"/><path d="M5 13a11 11 0 0022 0z" fill="#f4f0d0"/><path d="M6.5 13a9.5 9.5 0 0019 0z" fill="#e8484f"/>' + [[11, 16], [16, 18], [21, 16], [14, 20], [18, 20]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.4" fill="#2f2a26"/>`).join('')),
  visne: berries('#8a1020', '#d9607a', [[11, 20], [21, 21]]),
  broskev: roundFruit('#f5a37a', '#fbd0a8', '#6b4a25', '#4fa63c'),
  orech: S('<ellipse cx="16" cy="17" rx="11" ry="12" fill="#b88a50"/><path d="M16 5v24" stroke="#8a6434" stroke-width="2"/><path d="M8 12c3 2 3 6 0 8M24 12c-3 2-3 6 0 8M11 24c2-2 3-2 5 0M16 24c2-2 3-2 5 0" stroke="#8a6434" stroke-width="1.4" fill="none"/>'),
  maliny: berries('#d6335a', '#f07a9a'),
  rybiz: berries('#c41e3a', '#f07a8a', [[16, 10], [14, 14], [18, 17], [14, 21], [18, 24], [16, 28]]),
  angrest: berries('#a8c84a', '#e2f2a8', [[12, 15], [20, 15], [16, 22]]),
  boruvky: berries('#3b4f9a', '#8a9ad8'),
  hrozny: berries('#6b2f7a', '#b07ac8', [[10, 11], [16, 11], [22, 11], [13, 16], [19, 16], [16, 21], [10, 16], [22, 16], [16, 26]]),
  // ---- v9: výrobky ----
  krmivo_prasata: sack('#d9b07a'), krmivo_ovce: sack('#a8c87a'),
  maso: S('<path d="M5 14c0-6 7-9 14-8 7 1 9 6 8 11-1 7-8 10-14 9-5-1-8-6-8-12z" fill="#d9534f"/><path d="M8 15c2-4 8-6 13-4" stroke="#f5c0b8" stroke-width="2.4" fill="none"/><circle cx="21" cy="19" r="3" fill="#f3e3c3"/>'),
  vlna: S('<circle cx="10" cy="18" r="6" fill="#f7f3ec"/><circle cx="16" cy="13" r="7" fill="#fbf8f2"/><circle cx="22" cy="18" r="6" fill="#f2ede4"/><circle cx="16" cy="21" r="6" fill="#f7f3ec"/><path d="M10 18c2-2 4-2 6 0s4 2 6 0" stroke="#d8cfbf" stroke-width="1.2" fill="none"/>'),
  tresnovy_kolac: cake('#b5122b', '#f07a8a'), muffiny: S('<path d="M8 16h16l-2 13H10z" fill="#c98a45"/><path d="M9 16h14M11 16l1 13M16 16v13M21 16l-1 13" stroke="#a8672a" stroke-width="1"/><path d="M6 16c0-6 4-10 10-10s10 4 10 10z" fill="#e3b06a"/>' + [[11, 11], [16, 9], [21, 11], [13, 14], [19, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#3b4f9a"/>`).join('')),
  orechovy_kolac: cake('#b88a50', '#6b4a25'),
  maslo: S('<path d="M4 18l8-6h16l-8 6z" fill="#fff3b0"/><path d="M4 18h16v8H4z" fill="#f5e07a"/><path d="M20 18l8-6v8l-8 6z" fill="#e8cf5a"/><rect x="2" y="26" width="28" height="3" rx="1.5" fill="#c9d0d6"/>'),
  sl_olej: bottle('#f2c22e'),
  salat_mix: bowl('#6fbf4a', '<circle cx="11" cy="13" r="2.4" fill="#e0402d"/><circle cx="20" cy="12" r="2.4" fill="#3f8f3a"/><circle cx="16" cy="14" r="2" fill="#e0405a"/>'),
  okurky: jar('#6f9a3a', '#3f8a25'), kecup: bottle('#c8302d'), lecho: jar('#e8702a'), kysane_zeli: jar('#e6e2b0', '#8a8f96'),
  kompot: jar('#b8d870'), hrachovka: bowl('#9ccf4a'), dynovka: bowl('#f08a24'), broskve_sklo: jar('#f5b07a'),
  dzus_mrkev: bottle('#f07f2a'), dzus_jablko: bottle('#f2d34a'), dzus_hruska: bottle('#d9d26a'), dzus_visne: bottle('#8a1020'),
  most: bottle('#6b2f7a'), napoj: bottle('#f06070'),
  povidla: jar('#4a2a5a'), dzem_malina: jar('#d6335a'), dzem_jahoda: jar('#e0283c'), marmelada: jar('#c41e3a', '#d9b43b'), dzem_merunka: jar('#f2a03d'),
  klobasa: S('<path d="M5 22c-2-6 4-12 11-12s11 3 11 7-3 6-8 6c-4 0-6 3-10 3-2 0-3-2-4-4z" fill="#b5523b"/><path d="M9 18c3-3 8-4 13-3" stroke="#d98a6a" stroke-width="2" fill="none"/><circle cx="27" cy="17" r="1.6" fill="#8a3b2c"/>'),
  uzene: S('<path d="M6 10c4-4 14-5 20 1 4 4 2 12-4 15-6 3-14 2-17-3-2-4-2-9 1-13z" fill="#8a3b2c"/><path d="M9 13c4-3 11-3 15 1" stroke="#c8705a" stroke-width="2.4" fill="none"/><path d="M5 22l-3 6M8 24l-1 5" stroke="#f3e3c3" stroke-width="2.4"/>'),
  klubko: S('<circle cx="16" cy="17" r="11" fill="#b48ad0"/><path d="M7 12c6 2 12 8 16 15M6 19c6-1 12 2 16 8M10 8c4 4 8 12 9 19M20 7c-1 6 2 12 7 15" stroke="#8a5fb0" stroke-width="1.6" fill="none"/><path d="M26 22c3 2 4 5 3 8" stroke="#b48ad0" stroke-width="2" fill="none"/>'),
  svetr: S('<path d="M10 5l-7 6 3 6 3-2v14h14V15l3 2 3-6-7-6c-1 3-4 4-6 4s-5-1-6-4z" fill="#c8452d"/><path d="M9 20h14M9 24h14" stroke="#f3e3c3" stroke-width="2"/>'),
  deka: S('<path d="M4 8h24v18H4z" fill="#4f8fd6"/><path d="M4 13h24M4 19h24M10 8v18M18 8v18" stroke="#f3e3c3" stroke-width="2"/><path d="M4 26l-1 3M8 26v3M12 26v3M16 26v3M20 26v3M24 26v3M28 26l1 3" stroke="#2f63a0" stroke-width="1.4"/>'),
  // ---- v9: budovy, zvířata, náčiní ----
  pig: S('<ellipse cx="15" cy="19" rx="11" ry="8" fill="#f5b0b8"/><ellipse cx="26" cy="16" rx="5" ry="5" fill="#f5b0b8"/><ellipse cx="29" cy="17" rx="2.4" ry="2" fill="#e08a96"/><path d="M23 11l1-4 3 4" fill="#e08a96"/><circle cx="26" cy="14" r="1" fill="#333"/><path d="M4 18c-2-1-2-4 0-4" stroke="#e08a96" stroke-width="1.6" fill="none"/><path d="M8 26v4M13 26v4M18 26v4M22 26v4" stroke="#e08a96" stroke-width="2.4"/>'),
  sheep: S('<circle cx="9" cy="18" r="6" fill="#f7f3ec"/><circle cx="15" cy="15" r="7" fill="#fbf8f2"/><circle cx="20" cy="19" r="6" fill="#f2ede4"/><circle cx="13" cy="21" r="5" fill="#f7f3ec"/><ellipse cx="26" cy="15" rx="4" ry="4.6" fill="#4a3f38"/><circle cx="27" cy="14" r=".9" fill="#fff"/><path d="M9 24v6M14 25v5M19 25v5M23 23v6" stroke="#4a3f38" stroke-width="2.2"/>'),
  shop: S('<rect x="4" y="13" width="24" height="15" fill="#f3e3c3"/><path d="M2 13h28l-3-7H5z" fill="#c8452d"/><path d="M6 13l2-7M12 13l1-7M18 13l-1-7M24 13l-2-7" stroke="#fff" stroke-width="2"/><rect x="6" y="17" width="10" height="7" fill="#9fd0f0"/><rect x="19" y="17" width="6" height="11" fill="#6b3f1f"/>'),
  stall: S('<path d="M3 12h26l-2-7H5z" fill="#4f8fd6"/><path d="M7 12l1-7M13 12v-7M19 12v-7M25 12l-1-7" stroke="#fff" stroke-width="2"/><path d="M5 12v16M27 12v16" stroke="#7a4e2a" stroke-width="2.4"/><rect x="4" y="19" width="24" height="5" fill="#a7703d"/><circle cx="9" cy="17" r="2.4" fill="#e0402d"/><circle cx="15" cy="17" r="2.4" fill="#f2c22e"/><circle cx="21" cy="17" r="2.4" fill="#5fae3a"/>'),
  garage: S('<path d="M2 14L16 4l14 10v15H2z" fill="#a8483a"/><path d="M8 29V17h16v12" fill="#6b3f1f"/><path d="M8 17l16 12M24 17L8 29" stroke="#f3e3c3" stroke-width="1.6"/><path d="M16 17v12" stroke="#f3e3c3" stroke-width="1.4"/>'),
  kolecko: S('<path d="M4 12h18l-3 9H8z" fill="#7d8a96"/><path d="M22 12l7-4M8 21l-4 6M19 21l3 6" stroke="#6b4a25" stroke-width="2.2"/><circle cx="14" cy="25" r="4.4" fill="#2f2a26"/><circle cx="14" cy="25" r="1.6" fill="#c9b77c"/><circle cx="9" cy="10" r="2.6" fill="#e3b52e"/><circle cx="15" cy="10" r="2.6" fill="#e0402d"/>'),
  motyka: S('<path d="M7 29L24 6" stroke="#a7703d" stroke-width="2.6"/><path d="M19 6l9-3 1 6-7 1z" fill="#8a8f96"/><path d="M4 18h9l-1 10H5z" fill="#4f8fd6"/><path d="M13 20l4-2" stroke="#4f8fd6" stroke-width="2"/>'),
  news: S('<rect x="3" y="6" width="22" height="21" rx="2" fill="#fff8e7" stroke="#a0763f" stroke-width="2"/><path d="M25 10h4v15a2 2 0 01-4 0z" fill="#e8d9b8" stroke="#a0763f" stroke-width="1.6"/><rect x="6" y="9" width="16" height="4" fill="#c8452d"/><path d="M6 16h7M6 19h7M6 22h7M15 16h7M15 19h7M15 22h7" stroke="#7a6040" stroke-width="1.4"/>'),
  helper: S('<circle cx="16" cy="8" r="5" fill="#f2c9a0"/><path d="M10 5c2-4 10-4 12 0z" fill="#3f8a25"/><path d="M8 30V18c0-3 3-5 8-5s8 2 8 5v12z" fill="#4f8fd6"/><path d="M12 13v17M20 13v17" stroke="#2f63a0" stroke-width="2"/>'),
  farmer: S('<circle cx="16" cy="9" r="5" fill="#f2c9a0"/><path d="M8 7h16l-3-4h-10z" fill="#d9b43b"/><path d="M8 30V18c0-3 3-5 8-5s8 2 8 5v12z" fill="#c8452d"/><path d="M12 14v16M20 14v16" stroke="#2f63a0" stroke-width="2.4"/>'),
  star: S('<path d="M16 3l3.8 7.8 8.6 1.2-6.2 6 1.5 8.6L16 22.6 8.3 26.6l1.5-8.6-6.2-6 8.6-1.2z" fill="#f5b82e"/>'),

  // ---- plodiny ----
  wheat: S('<path d="M16 30V10" stroke="#b8902a" stroke-width="2"/>' + [8, 13, 18, 23].map(y => `<ellipse cx="12.5" cy="${y}" rx="3" ry="4.5" fill="#f0c83f" transform="rotate(-30 12.5 ${y})"/><ellipse cx="19.5" cy="${y}" rx="3" ry="4.5" fill="#e3b52e" transform="rotate(30 19.5 ${y})"/>`).join('') + '<ellipse cx="16" cy="5" rx="2.6" ry="4" fill="#f0c83f"/>'),
  corn: S('<path d="M9 30C9 18 12 10 16 4c4 6 7 14 7 26z" fill="#5fae3a"/><ellipse cx="16" cy="15" rx="5" ry="10" fill="#f6c63d"/><path d="M13 9h6M12 13h8M12 17h8M12 21h8" stroke="#d99a1e" stroke-width="1.3"/><path d="M8 30c2-8 5-11 8-12M24 30c-2-8-5-11-8-12" stroke="#3f8a25" stroke-width="3" fill="none"/>'),
  carrot: S('<path d="M16 30L9 12h14z" fill="#f07f2a"/><path d="M12 17h4M13 22h4M14 26h3" stroke="#c45e17" stroke-width="1.4"/>' + leaf(13, 7, 2.2) + leaf(19, 7, 2.2) + leaf(16, 5, 2.4, '#5fae3a')),
  soy: S('<path d="M7 25c2-12 16-20 20-14-2 8-12 16-20 14z" fill="#9bbf4a"/><circle cx="12" cy="20" r="3" fill="#e6dc8c"/><circle cx="17" cy="16" r="3" fill="#e6dc8c"/><circle cx="22" cy="12.5" r="2.6" fill="#e6dc8c"/>'),
  potato: S('<ellipse cx="16" cy="17" rx="11" ry="8.5" fill="#c99a5b"/><ellipse cx="13" cy="14" rx="4" ry="2" fill="#dbb47a"/><circle cx="10" cy="19" r="1" fill="#8a6434"/><circle cx="19" cy="15" r="1" fill="#8a6434"/><circle cx="21" cy="21" r="1" fill="#8a6434"/>'),
  repka: S('<path d="M16 30V12" stroke="#4f8f37" stroke-width="2"/>' + [[16, 8], [11, 11], [21, 11], [13, 5], [19, 5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#f5d63a"/>`).join('') + leaf(11, 22, 2.4) + leaf(21, 20, 2.4)),
  sun: S('<path d="M16 30V18" stroke="#4f8f37" stroke-width="2.4"/>' + Array.from({ length: 12 }, (_, i) => `<ellipse cx="16" cy="4.5" rx="2.6" ry="5" fill="#f5c22e" transform="rotate(${i * 30} 16 12)"/>`).join('') + '<circle cx="16" cy="12" r="5" fill="#6b4a25"/>'),
  beet: S('<path d="M16 31c-7-4-9-9-8-14h16c1 5-1 10-8 14z" fill="#efe3c8"/><path d="M8 17h16" stroke="#d6c6a2" stroke-width="2"/>' + leaf(12, 8, 2.6) + leaf(20, 8, 2.6) + leaf(16, 6, 2.8, '#5fae3a')),
  // ---- ovoce ----
  jablko: S('<path d="M16 9c-4-3-11-1-11 7s5 13 8 13c2 0 2-1 3-1s1 1 3 1c3 0 8-5 8-13S20 6 16 9z" fill="#d9342b"/><path d="M16 9V4" stroke="#6b4a25" stroke-width="2"/>' + `<ellipse cx="20" cy="5" rx="3" ry="1.6" fill="#4fa63c"/><ellipse cx="11" cy="14" rx="2" ry="3" fill="#f07a6e"/>`),
  hruska: S('<path d="M16 6c-3 0-4 4-4 7-4 3-6 6-6 10 0 4 4 7 10 7s10-3 10-7c0-4-2-7-6-10 0-3-1-7-4-7z" fill="#c9c23a"/><path d="M16 6V2" stroke="#6b4a25" stroke-width="2"/><ellipse cx="12" cy="20" rx="2" ry="3" fill="#e2dc6a"/>'),
  svestka: S('<ellipse cx="16" cy="18" rx="9" ry="11" fill="#5b3f8f"/><path d="M16 8c1 6 1 14 0 21" stroke="#4a3075" stroke-width="1.4" fill="none"/><ellipse cx="12" cy="14" rx="2" ry="3.5" fill="#8a70bd"/><path d="M16 7V3" stroke="#6b4a25" stroke-width="2"/>'),
  tresne: S('<path d="M10 20C12 10 16 6 22 3M22 20c-1-8-1-12 0-17" stroke="#5b8a2a" stroke-width="1.6" fill="none"/><circle cx="10" cy="23" r="6" fill="#b5122b"/><circle cx="22" cy="23" r="6" fill="#c81d36"/><circle cx="8" cy="21" r="1.6" fill="#f07a8a"/>'),
  merunka: S('<circle cx="16" cy="18" r="11" fill="#f2a03d"/><path d="M16 7c-2 6-2 16 0 22" stroke="#d77f22" stroke-width="1.4" fill="none"/><ellipse cx="11" cy="14" rx="3" ry="4" fill="#f8c27a"/><ellipse cx="20" cy="6" rx="3" ry="1.6" fill="#4fa63c"/>'),
  // ---- výrobky ----
  krmivo_slepice: S('<path d="M5 14h22l-3 14H8z" fill="#6f9bd1"/><ellipse cx="16" cy="14" rx="11" ry="3" fill="#4f7bb5"/>' + [[11, 12], [15, 11], [19, 12], [13, 13], [21, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#e8c547"/>`).join('')),
  krmivo_kravy: S('<path d="M5 12h22l-2 16H7z" fill="#c79a5b"/><path d="M5 12h22M9 12l2 16M16 12v16M23 12l-2 16" stroke="#8a6434" stroke-width="1.4"/><path d="M8 12c2-5 4-6 6-3 2-4 4-4 6 0 2-3 4-2 5 3" fill="#9bbf4a"/>'),
  vejce: S('<ellipse cx="16" cy="18" rx="9" ry="11" fill="#fbf3e2"/><ellipse cx="16" cy="18" rx="9" ry="11" fill="none" stroke="#d8c39a" stroke-width="1.4"/><ellipse cx="12.5" cy="13" rx="2" ry="3" fill="#fff"/>'),
  mleko: S('<path d="M10 9h12v19a2 2 0 01-2 2h-8a2 2 0 01-2-2z" fill="#f7f7f2" stroke="#9fb7c9" stroke-width="1.4"/><path d="M11 5h10l1 4H10z" fill="#4f8fd6"/><rect x="10" y="16" width="12" height="6" fill="#cfe3f5"/>'),
  chleb: S('<path d="M4 20c0-9 6-13 12-13s12 4 12 13v4a3 3 0 01-3 3H7a3 3 0 01-3-3z" fill="#d9a05b"/><path d="M10 12l3 5M16 11l1 6M22 12l-2 5" stroke="#a8672a" stroke-width="2" stroke-linecap="round"/>'),
  kolac: S('<path d="M3 20l13-12 13 12z" fill="#f2d39a"/><path d="M3 20h26v5H3z" fill="#d9a05b"/><path d="M8 18c2-2 3-2 5 0s3 2 5 0 3-2 5 0" stroke="#c8452d" stroke-width="2.4" fill="none"/>'),
  smetana: S('<path d="M8 12h16l-2 17H10z" fill="#f2f2ea" stroke="#c9c9bd" stroke-width="1.2"/><path d="M8 12c2-4 5-5 8-3 3-2 6-1 8 3z" fill="#fffef7"/><rect x="9" y="18" width="14" height="4" fill="#9fb7c9"/>'),
  syr: S('<path d="M3 22l17-12 9 5v9H3z" fill="#f5c542"/><path d="M3 22h26" stroke="#d9a42a" stroke-width="1.4"/><circle cx="11" cy="25" r="1.8" fill="#d9a42a"/><circle cx="20" cy="18" r="2" fill="#d9a42a"/><circle cx="24" cy="25" r="1.4" fill="#d9a42a"/>'),
  mouka: S('<path d="M8 8h16l2 20H6z" fill="#efe6d2" stroke="#c9b993" stroke-width="1.4"/><path d="M10 8c2-4 10-4 12 0" fill="#e2d6b8"/><path d="M12 17h8M12 21h8" stroke="#c9b993" stroke-width="1.6"/>'),
  olej: S('<path d="M13 4h6v5c4 2 5 5 5 8v10a2 2 0 01-2 2H10a2 2 0 01-2-2V17c0-3 1-6 5-8z" fill="#e5c23a" opacity=".9"/><rect x="13" y="2" width="6" height="3" fill="#3f8a25"/><rect x="10" y="18" width="12" height="6" fill="#f7e9a8"/>'),
  cukr: S('<rect x="5" y="12" width="10" height="10" fill="#fff" stroke="#c9d0d6" stroke-width="1.4"/><rect x="17" y="12" width="10" height="10" fill="#fff" stroke="#c9d0d6" stroke-width="1.4"/><rect x="11" y="4" width="10" height="10" fill="#fff" stroke="#c9d0d6" stroke-width="1.4"/><rect x="11" y="22" width="10" height="6" fill="#e9eef2"/>'),
  buchty: S('<ellipse cx="16" cy="22" rx="13" ry="6" fill="#c98a45"/>' + [[10, 17], [16, 15], [22, 17], [13, 20], [19, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#e3b06a"/><circle cx="${x - 1}" cy="${y - 1}" r="1.2" fill="#f5d39a"/>`).join('')),
  slama: S('<ellipse cx="16" cy="22" rx="12" ry="7" fill="#d9b43b"/><rect x="4" y="10" width="24" height="12" fill="#e8c95a"/><ellipse cx="16" cy="10" rx="12" ry="7" fill="#f2da7a"/><path d="M4 15h24M4 19h24" stroke="#b8902a" stroke-width="1.6"/>'),
  // ---- budovy, zvířata, stroje ----
  house: S('<path d="M3 15L16 4l13 11z" fill="#c8452d"/><rect x="6" y="15" width="20" height="13" fill="#f3e3c3"/><rect x="14" y="19" width="5" height="9" fill="#6b3f1f"/><rect x="8" y="18" width="4" height="4" fill="#9fd0f0"/><rect x="21" y="18" width="4" height="4" fill="#9fd0f0"/>'),
  barn: S('<rect x="21" y="6" width="8" height="22" rx="4" fill="#b8c0c7"/><path d="M2 16L11 7l9 9v12H2z" fill="#b5523b"/><rect x="7" y="18" width="8" height="10" fill="#f3e3c3"/><path d="M7 18l8 10M15 18l-8 10" stroke="#b5523b" stroke-width="1.6"/>'),
  tree: S('<rect x="14" y="18" width="4" height="12" fill="#7a4e2a"/><circle cx="16" cy="13" r="10" fill="#3f8f3a"/><circle cx="12" cy="10" r="5" fill="#52a862"/><circle cx="12" cy="16" r="1.8" fill="#d9342b"/><circle cx="20" cy="11" r="1.8" fill="#d9342b"/>'),
  blossom: S('<rect x="14" y="18" width="4" height="12" fill="#7a4e2a"/><circle cx="16" cy="13" r="10" fill="#f4b6c8"/><circle cx="12" cy="10" r="5" fill="#f9d2de"/><circle cx="20" cy="15" r="2" fill="#fff"/>'),
  bush: S('<circle cx="10" cy="20" r="7" fill="#3f8f3a"/><circle cx="22" cy="20" r="7" fill="#3f8f3a"/><circle cx="16" cy="14" r="8" fill="#4ea845"/><circle cx="13" cy="11" r="3" fill="#63bd55"/>'),
  flowers: S('<rect x="3" y="22" width="26" height="7" rx="2" fill="#7a5030"/>' + [[8, '#e5484d'], [16, '#f5c542'], [24, '#c45fd6']].map(([x, c]) => `<path d="M${x} 22v-8" stroke="#4c8f37" stroke-width="2"/><circle cx="${x}" cy="12" r="4" fill="${c}"/><circle cx="${x}" cy="12" r="1.5" fill="#fff6c4"/>`).join('')),
  bench: S('<rect x="4" y="12" width="24" height="4" rx="1" fill="#a7703d"/><rect x="4" y="18" width="24" height="4" rx="1" fill="#a7703d"/><path d="M7 22v6M25 22v6" stroke="#5b3a1e" stroke-width="2.4"/>'),
  fountain: S('<ellipse cx="16" cy="24" rx="13" ry="5" fill="#9aa3ab"/><ellipse cx="16" cy="23" rx="10" ry="3" fill="#5fb3e6"/><rect x="14" y="10" width="4" height="12" fill="#b8c0c7"/><path d="M16 9c-6 0-8 6-8 10M16 9c6 0 8 6 8 10" stroke="#8fd0f5" stroke-width="2" fill="none"/>'),
  hen: S('<ellipse cx="15" cy="20" rx="10" ry="8" fill="#fbfaf4" stroke="#d8c39a" stroke-width="1"/><circle cx="23" cy="11" r="5" fill="#fbfaf4" stroke="#d8c39a" stroke-width="1"/><path d="M21 5c1-2 3-2 3 0 1-2 3-1 2 1" fill="#d9402b"/><path d="M27 11l4 1-4 2z" fill="#f2a52b"/><circle cx="24" cy="10" r="1" fill="#333"/><path d="M12 28v3M18 28v3" stroke="#f2a52b" stroke-width="1.6"/>'),
  cow: S('<ellipse cx="14" cy="18" rx="11" ry="7" fill="#f7f3ec" stroke="#c9c2b6" stroke-width="1"/><ellipse cx="11" cy="16" rx="4" ry="3" fill="#3d3029"/><ellipse cx="17" cy="21" rx="3" ry="2" fill="#3d3029"/><ellipse cx="26" cy="14" rx="5" ry="4.5" fill="#f7f3ec" stroke="#c9c2b6" stroke-width="1"/><ellipse cx="28" cy="16" rx="3" ry="2.2" fill="#f2b7a8"/><path d="M23 9l-2-3M28 9l2-3" stroke="#c9b77c" stroke-width="1.6"/><path d="M7 24v5M12 24v5M17 24v5M21 24v5" stroke="#3d3029" stroke-width="2"/>'),
  tractor: S('<rect x="12" y="12" width="15" height="8" fill="#c8452d"/><rect x="5" y="5" width="9" height="15" fill="#c8452d"/><rect x="7" y="7" width="5" height="6" fill="#cfe8f5"/><rect x="23" y="7" width="2" height="5" fill="#555"/><circle cx="9" cy="23" r="6" fill="#2f2a26"/><circle cx="9" cy="23" r="2.4" fill="#c9b77c"/><circle cx="24" cy="25" r="4" fill="#2f2a26"/><circle cx="24" cy="25" r="1.6" fill="#c9b77c"/>'),
  combine: S('<rect x="3" y="11" width="20" height="11" fill="#4f9a3a"/><rect x="11" y="4" width="8" height="8" fill="#4f9a3a"/><rect x="13" y="6" width="4" height="4" fill="#cfe8f5"/><rect x="23" y="17" width="7" height="6" fill="#d9b43b"/><path d="M26 13v-4M26 13l3-3M26 13l-3-3" stroke="#8a7020" stroke-width="1.6"/><circle cx="9" cy="24" r="5" fill="#2f2a26"/><circle cx="19" cy="25" r="3.4" fill="#2f2a26"/>'),
  pluh: S('<path d="M3 10h22" stroke="#555" stroke-width="3"/>' + [7, 14, 21].map(x => `<path d="M${x} 10c0 8 4 12 8 14" stroke="#8a8f96" stroke-width="3.4" fill="none"/>`).join('') + '<path d="M3 26c8 2 18 2 27-1" stroke="#7a5030" stroke-width="3"/>'),
  secka: S('<rect x="4" y="8" width="24" height="10" rx="2" fill="#3f7fbf"/><rect x="6" y="5" width="20" height="4" fill="#2f63a0"/>' + [8, 13, 18, 23].map(x => `<path d="M${x} 18v7" stroke="#555" stroke-width="2"/><circle cx="${x}" cy="27" r="1.4" fill="#e8c547"/>`).join('')),
  lis: S('<rect x="3" y="9" width="20" height="14" rx="2" fill="#d9b43b"/><rect x="5" y="11" width="9" height="7" fill="#f2da7a"/><path d="M23 14h6" stroke="#555" stroke-width="2.4"/><circle cx="8" cy="25" r="4" fill="#2f2a26"/><circle cx="18" cy="25" r="4" fill="#2f2a26"/>'),
  field: S('<path d="M2 18L16 10l14 8-14 8z" fill="#8e5d33"/><path d="M6 18l14-8M10 20.5l14-8M14 23l12-7" stroke="#6f4524" stroke-width="1.4"/><path d="M9 17v-5M15 14v-5M21 16v-5" stroke="#e3b52e" stroke-width="2"/>'),
  plot: S('<path d="M2 18L16 10l14 8-14 8z" fill="#8e5d33"/><path d="M8 21l14-8M12 23l12-7M5 19l14-8" stroke="#6f4524" stroke-width="1.4"/>'),
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
};

const urlCache = {};
export function iconUrl(key) {
  if (!ICONS[key]) return '';
  return urlCache[key] || (urlCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[key]));
}

export function ic(key, cls = '') {
  return ICONS[key] ? `<img class="ic${cls ? ' ' + cls : ''}" src="${iconUrl(key)}" alt="">` : '';
}

// „Mám 5 :coin:“ → text s obrázky
export function iconize(html) {
  return String(html).replace(/:([a-z_0-9]+):/g, (m, k) => (ICONS[k] ? ic(k) : m));
}

// ---------- canvas ----------
const imgCache = {};
export function iconImage(key) {
  if (!ICONS[key]) return null;
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
