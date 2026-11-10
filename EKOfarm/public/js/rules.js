// EKOfarm – herní pravidla. Sdílí je server (Worker) i prohlížeč.
// Čisté funkce bez DOM a bez přístupu k síti. Čas se vždy předává zvenku (ms).

export const RULES_VERSION = 15;
export const GRID_W = 17;
export const GRID_H = 17;
export const MAIN_POS = [7, 7];   // Statek 3×3 přesně uprostřed mřížky 17×17

// ---------- pozemky ----------
// základ farmy je 0..16 × 0..16; kolem něj se dá dokoupit 8 pozemků (svět −8..24)
export const WORLD = { x0: -8, y0: -8, x1: 25, y1: 25 };
export const LAND_PARCELS = [
  { id: 'n',  name: 'Louka u lesa',     x: 0,   y: -8, w: 17, h: 8 },
  { id: 'e',  name: 'Pole u cesty',     x: 17,  y: 0,  w: 8,  h: 17 },
  { id: 's',  name: 'Údolí u potoka',   x: 0,   y: 17, w: 17, h: 8 },
  { id: 'w',  name: 'Slunná stráň',     x: -8,  y: 0,  w: 8,  h: 17 },
  { id: 'ne', name: 'Horní pastviny',   x: 17,  y: -8, w: 8,  h: 8, needs: ['n', 'e'] },
  { id: 'se', name: 'Dolní pastviny',   x: 17,  y: 17, w: 8,  h: 8, needs: ['s', 'e'] },
  { id: 'sw', name: 'Rybníková louka',  x: -8,  y: 17, w: 8,  h: 8, needs: ['s', 'w'] },
  { id: 'nw', name: 'Lesní mýtina',     x: -8,  y: -8, w: 8,  h: 8, needs: ['n', 'w'] },
];
// cena a potřebná úroveň podle toho, kolikátý pozemek kupuješ
export const LAND_PRICES = [1500, 3000, 5000, 8000, 12000, 16000, 20000, 25000];
export const LAND_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
export const getParcel = id => LAND_PARCELS.find(p => p.id === id) || null;
export function parcelAt(x, y) {
  return LAND_PARCELS.find(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || null;
}
export function landOwned(farm, x, y) {
  if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) return true;
  const p = parcelAt(x, y);
  return !!p && farm.land.includes(p.id);
}
// lze pozemek koupit (sousedí s farmou)? rohový potřebuje aspoň jeden sousední boční
export const landReachable = (farm, p) => !p.needs || p.needs.some(id => farm.land.includes(id));
export const landPrice = farm => LAND_PRICES[Math.min(farm.land.length, LAND_PRICES.length - 1)];
export const landLevel = farm => LAND_LEVELS[Math.min(farm.land.length, LAND_LEVELS.length - 1)];

// ---------- prašná cesta a městečko ----------
// cesta vede od spodního rohu farmy šikmo dolů přes městečko až na kraj mapy; na cestě se nestaví ani se nekupuje
export const TOWN = { x0: 20, y0: 20, x1: 41, y1: 41 };
export const PLAZA = { x0: 28, y0: 28, x1: 32, y1: 32 };   // náměstí (dlážděné)
export const isPlaza = (x, y) => x >= PLAZA.x0 && x < PLAZA.x1 && y >= PLAZA.y0 && y < PLAZA.y1;
export const isRoad = (x, y) => x >= GRID_W && y >= GRID_H && x < TOWN.x1 && y < TOWN.y1 && (Math.abs(x - y) <= 1 || isPlaza(x, y));
// budovy městečka mají pevné místo (nejsou na farmě, nejdou přesunout)
export const TOWN_BUILDINGS = [
  { kind: 'stanek', x: 29, y: 25 },
  { kind: 'prodejna', x: 33, y: 29 },
  { kind: 'trziste', x: 29, y: 33 },
];
// domky jen pro ozdobu [x, y] – stojí tak, aby nezakrývaly Stánek, Prodejnu ani Tržiště
export const TOWN_HOUSES = [
  [22, 25], [25, 22],     // u vjezdu do městečka
  [25, 28],               // za Tržištěm
  [34, 25], [25, 34],     // po stranách
  [38, 29], [29, 38],
  [38, 35], [35, 38],     // dole u cesty
];
export const TOWN_KINDS = TOWN_BUILDINGS.map(b => b.kind);
export function townAt(x, y) {
  return TOWN_BUILDINGS.find(b => x >= b.x && x < b.x + 3 && y >= b.y && y < b.y + 3) || null;
}
// budova městečka jako objekt (pro kreslení, panel a vylepšení)
export function townObject(farm, kind) {
  const b = TOWN_BUILDINGS.find(t => t.kind === kind);
  return { id: kind, kind, x: b.x, y: b.y, lvl: (farm.town && farm.town[kind]) || 1, town: true };
}
export const START_COINS = 50;
export const SILO_START = 50;
export const SILO_STEP = 25;
export const QUEUE_SIZE = 3;
export const FREE_PLOTS = 6;        // prvních 6 polí je zdarma
export const PLOTS_PER_LEVEL = 6;   // s každou úrovní statku 6 dalších polí
export const ORDER_SLOTS = 6;
export const FIELD_CELL_PRICE = 8;  // cena jednoho políčka velkého pole
export const FIELD_MIN = 3;
export const FIELD_MAX = 6;
export const ORDER_WAIT = 3 * 60;   // s – nová zakázka po zrušení
export const START_PLOTS = [
  [11, 8], [12, 8], [13, 8],
  [11, 9], [12, 9], [13, 9],
];

// ---------- data ----------
// time = sekundy
// harvester = čím se plodina sklízí na velkém poli (combine = kombajn, tractor = traktor se sklízečem)
const crop = (id, name, cat, level, cost, time, price, xp, harvester) =>
  ({ id, name, cat, level, cost, time, yield: 2, xp, price, icon: id, harvester });
export const CROPS = {
  // obilí a technické plodiny
  wheat:     crop('wheat',     'Pšenice',      'obili',    1, 1,  60,   3,  1, 'combine'),
  corn:      crop('corn',      'Kukuřice',     'obili',    2, 3,  300,  8,  2, 'combine'),
  soy:       crop('soy',       'Sója',         'obili',    5, 8,  1200, 18, 4, 'combine'),
  repka:     crop('repka',     'Řepka',        'obili',    6, 10, 1500, 22, 5, 'combine'),
  sun:       crop('sun',       'Slunečnice',   'obili',    7, 12, 1800, 26, 5, 'combine'),
  hrach:     crop('hrach',     'Hrách',        'zelenina', 9, 9,  1500, 21, 5, 'combine'),
  // zelenina
  redkvicka: crop('redkvicka', 'Ředkvička',    'zelenina', 1, 2,  120,  4,  1, 'tractor'),
  salat:     crop('salat',     'Salát',        'zelenina', 2, 2,  180,  5,  1, 'tractor'),
  carrot:    crop('carrot',    'Mrkev',        'zelenina', 3, 5,  600,  12, 3, 'tractor'),
  rajce:     crop('rajce',     'Rajče',        'zelenina', 3, 4,  480,  9,  2, 'tractor'),
  potato:    crop('potato',    'Brambory',     'zelenina', 4, 6,  900,  15, 3, 'tractor'),
  okurka:    crop('okurka',    'Okurka',       'zelenina', 4, 4,  540,  10, 2, 'tractor'),
  cibule:    crop('cibule',    'Cibule',       'zelenina', 5, 5,  720,  11, 3, 'tractor'),
  cesnek:    crop('cesnek',    'Česnek',       'zelenina', 6, 6,  900,  14, 3, 'tractor'),
  paprika:   crop('paprika',   'Paprika',      'zelenina', 7, 7,  1080, 16, 4, 'tractor'),
  beet:      crop('beet',      'Cukrová řepa', 'zelenina', 8, 14, 2400, 30, 6, 'tractor'),
  zeli:      crop('zeli',      'Zelí',         'zelenina', 8, 8,  1500, 20, 5, 'tractor'),
  dyne:      crop('dyne',      'Dýně',         'zelenina', 10, 12, 2400, 30, 6, 'tractor'),
  // ovoce z pole
  jahody:    crop('jahody',    'Jahody',       'ovoce',    4, 6,  900,  15, 3, 'tractor'),
  meloun:    crop('meloun',    'Meloun',       'ovoce',    9, 14, 2700, 34, 6, 'tractor'),
};
export const CROP_LIST = Object.values(CROPS).sort((a, b) => a.level - b.level || a.cost - b.cost);
export const CROP_CATS = { obili: 'Obilí a olejniny', zelenina: 'Zelenina', ovoce: 'Ovoce' };

// ovoce ze sadu (stromy a keře)
const fruit = (id, name, price, color) => ({ id, name, price, icon: id, color });
export const FRUITS = {
  jablko:  fruit('jablko',  'Jablko',  10, '#d9342b'),
  hruska:  fruit('hruska',  'Hruška',  14, '#c9c23a'),
  svestka: fruit('svestka', 'Švestka', 12, '#5b3f8f'),
  tresne:  fruit('tresne',  'Třešně',  18, '#b5122b'),
  merunka: fruit('merunka', 'Meruňka', 20, '#f2a03d'),
  visne:   fruit('visne',   'Višně',   16, '#8a1020'),
  broskev: fruit('broskev', 'Broskev', 24, '#f5a37a'),
  orech:   fruit('orech',   'Ořechy',  22, '#9a6c38'),
  maliny:  fruit('maliny',  'Maliny',  8,  '#d6335a'),
  rybiz:   fruit('rybiz',   'Rybíz',   9,  '#c41e3a'),
  angrest: fruit('angrest', 'Angrešt', 10, '#a8c84a'),
  boruvky: fruit('boruvky', 'Borůvky', 9,  '#3b4f9a'),
  hrozny:  fruit('hrozny',  'Hrozny',  16, '#6b2f7a'),
};

// ryby z rybníka: diff = jak těžko se chytá (0..1), w = jak často zabere
// kg = rozpětí váhy [min, max]; fem = ženský rod (pro text „utekla“)
const fish = (id, name, level, price, diff, w, color, kg, fem = false) => ({ id, name, level, price, diff, w, color, kg, fem, icon: id, xp: 1 + Math.round(price / 8) });
export const FISH = {
  plotice: fish('plotice', 'Plotice', 3, 8, 0.15, 30, '#b9c7d6', [0.1, 0.6], true),
  karas:   fish('karas',   'Karas',   3, 7, 0.1, 28, '#d9b44a', [0.2, 1.5]),
  kapr:    fish('kapr',    'Kapr',    4, 14, 0.3, 25, '#c9a24a', [1, 12]),
  cejn:    fish('cejn',    'Cejn',    5, 12, 0.3, 20, '#b0b8a0', [0.5, 4]),
  lin:     fish('lin',     'Lín',     5, 16, 0.35, 18, '#7a8a3a', [0.5, 4]),
  okoun:   fish('okoun',   'Okoun',   6, 18, 0.45, 15, '#8fae4a', [0.2, 2]),
  pstruh:  fish('pstruh',  'Pstruh',  8, 24, 0.55, 12, '#c98a9a', [0.5, 5]),
  amur:    fish('amur',    'Amur',    9, 28, 0.6, 10, '#8a9a6a', [2, 25]),
  candat:  fish('candat',  'Candát',  10, 30, 0.65, 9, '#9aa8a0', [1, 10]),
  uhor:    fish('uhor',    'Úhoř',    11, 34, 0.7, 8, '#5a5a3a', [0.5, 4]),
  stika:   fish('stika',   'Štika',   12, 36, 0.75, 7, '#6f8a4a', [1, 15], true),
  bolen:   fish('bolen',   'Bolen',   13, 40, 0.8, 6, '#a0aab8', [1, 8]),
  sumec:   fish('sumec',   'Sumec',   15, 50, 0.9, 4, '#4a4f5a', [5, 80]),
  jeseter: fish('jeseter', 'Jeseter', 18, 70, 0.95, 3, '#7a8a9a', [5, 60]),
};
// velikost úlovku: podíl v rozpětí váhy → kolik kusů do skladu
export const FISH_SIZES = [{ min: 0.9, name: 'obří', qty: 3 }, { min: 0.65, name: 'velká', qty: 2 }, { min: 0, name: 'běžná', qty: 1 }];
export const fishSize = (f, kg) => FISH_SIZES.find(s => (kg - f.kg[0]) / (f.kg[1] - f.kg[0]) >= s.min - 1e-9);
export const fmtKg = kg => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${(Math.round(kg * 10) / 10).toString().replace('.', ',')} kg`);
export const FISH_LIST = Object.values(FISH);

// stromy a keře do sadu: cost = sazenice, first = první úroda (s), regrow = další úroda (s), harvests = kolikrát plodí
const tree = (id, name, kind, fruitId, level, cost, first, regrow, yld, harvests, xp) =>
  ({ id, name, kind, fruit: fruitId, level, cost, first, regrow, yield: yld, harvests, xp, color: FRUITS[fruitId].color });
export const TREES = {
  maliny:  tree('maliny',  'Malinový keř',  'bush', 'maliny',  4, 30,  1200, 900,  3, 5, 2),
  rybiz:   tree('rybiz',   'Rybíz',         'bush', 'rybiz',   5, 35,  1500, 1080, 3, 5, 2),
  angrest: tree('angrest', 'Angrešt',       'bush', 'angrest', 6, 40,  1800, 1200, 3, 5, 3),
  boruvky: tree('boruvky', 'Borůvčí',       'bush', 'boruvky', 7, 50,  2100, 1500, 4, 5, 3),
  reva:    tree('reva',    'Vinná réva',    'bush', 'hrozny',  9, 90,  3600, 2700, 4, 6, 5),
  jablon:  tree('jablon',  'Jabloň',        'tree', 'jablko',  3, 40,  1800, 1200, 3, 4, 3),
  hrusen:  tree('hrusen',  'Hrušeň',        'tree', 'hruska',  4, 60,  2700, 1800, 3, 4, 4),
  svestka: tree('svestka', 'Švestka',       'tree', 'svestka', 5, 80,  3600, 2400, 4, 4, 5),
  tresen:  tree('tresen',  'Třešeň',        'tree', 'tresne',  6, 120, 5400, 3600, 4, 4, 6),
  visen:   tree('visen',   'Višeň',         'tree', 'visne',   7, 100, 4500, 3000, 4, 4, 6),
  merunka: tree('merunka', 'Meruňka',       'tree', 'merunka', 8, 160, 7200, 5400, 4, 5, 8),
  broskev: tree('broskev', 'Broskvoň',      'tree', 'broskev', 10, 200, 9000, 6000, 4, 5, 9),
  orech:   tree('orech',   'Ořešák',        'tree', 'orech',   11, 240, 10800, 7200, 5, 5, 10),
};
export const TREE_LIST = Object.values(TREES).sort((a, b) => a.level - b.level || a.cost - b.cost);

// výrobky: cena se dopočítá z receptu (suroviny × 1,2 + čas), aby byla ekonomika vyvážená
const P = (id, name) => ({ id, name, icon: id, price: 0 });
export const PRODUCTS = {
  krmivo_slepice: P('krmivo_slepice', 'Krmivo pro slepice'),
  krmivo_kravy:   P('krmivo_kravy', 'Krmivo pro krávy'),
  krmivo_prasata: P('krmivo_prasata', 'Krmivo pro prasata'),
  krmivo_ovce:    P('krmivo_ovce', 'Krmivo pro ovce'),
  vejce: P('vejce', 'Vejce'), mleko: P('mleko', 'Mléko'), maso: P('maso', 'Maso'), vlna: P('vlna', 'Vlna'),
  chleb: P('chleb', 'Chléb'), kolac: P('kolac', 'Koláč'), tresnovy_kolac: P('tresnovy_kolac', 'Třešňový koláč'),
  muffiny: P('muffiny', 'Borůvkové muffiny'), buchty: P('buchty', 'Buchty'), orechovy_kolac: P('orechovy_kolac', 'Ořechový koláč'),
  mouka: P('mouka', 'Mouka'),
  smetana: P('smetana', 'Smetana'), syr: P('syr', 'Sýr'), maslo: P('maslo', 'Máslo'),
  olej: P('olej', 'Řepkový olej'), sl_olej: P('sl_olej', 'Slunečnicový olej'),
  cukr: P('cukr', 'Cukr'),
  salat_mix: P('salat_mix', 'Zeleninový salát'), okurky: P('okurky', 'Kyselé okurky'), kecup: P('kecup', 'Kečup'),
  lecho: P('lecho', 'Lečo'), kysane_zeli: P('kysane_zeli', 'Kysané zelí'), kompot: P('kompot', 'Angreštový kompot'),
  hrachovka: P('hrachovka', 'Hrachová polévka'), dynovka: P('dynovka', 'Dýňová polévka'), broskve_sklo: P('broskve_sklo', 'Broskvový kompot'),
  dzus_mrkev: P('dzus_mrkev', 'Mrkvová šťáva'), dzus_jablko: P('dzus_jablko', 'Jablečný džus'), dzus_hruska: P('dzus_hruska', 'Hruškový džus'),
  dzus_visne: P('dzus_visne', 'Višňový džus'), most: P('most', 'Hroznový mošt'), napoj: P('napoj', 'Melounový nápoj'),
  povidla: P('povidla', 'Švestková povidla'), dzem_malina: P('dzem_malina', 'Malinový džem'), dzem_jahoda: P('dzem_jahoda', 'Jahodový džem'),
  marmelada: P('marmelada', 'Rybízová marmeláda'), dzem_merunka: P('dzem_merunka', 'Meruňkový džem'),
  klobasa: P('klobasa', 'Klobása'), uzene: P('uzene', 'Uzené maso'),
  klubko: P('klubko', 'Klubko vlny'), svetr: P('svetr', 'Svetr'), deka: P('deka', 'Vlněná deka'),
  slama: { id: 'slama', name: 'Sláma', icon: 'slama', price: 6 },
  seminkovy_chleb: P('seminkovy_chleb', 'Chléb se semínky'), prazena_seminka: P('prazena_seminka', 'Pražená semínka'),
  dynovy_olej: P('dynovy_olej', 'Dýňový olej'),
  // v11: rybník a včelín
  navnada: P('navnada', 'Návnada'),
  plast: { id: 'plast', name: 'Plástev medu', icon: 'plast', price: 12 },
  med: P('med', 'Med'), svicka: P('svicka', 'Svíčka z vosku'), medovnik: P('medovnik', 'Medovník'), pernik: P('pernik', 'Perník'),
  rybi_polevka: P('rybi_polevka', 'Rybí polévka'), smazeny_kapr: P('smazeny_kapr', 'Smažený kapr'), peceny_lin: P('peceny_lin', 'Pečený lín'),
  rybi_prsty: P('rybi_prsty', 'Rybí prsty'), uzeny_pstruh: P('uzeny_pstruh', 'Uzený pstruh'), candat_maslo: P('candat_maslo', 'Candát na másle'),
  stika_cibule: P('stika_cibule', 'Štika na cibulce'), sumcovy_gulas: P('sumcovy_gulas', 'Sumcový guláš'),
  rybi_karbanatky: P('rybi_karbanatky', 'Rybí karbanátky'), amur_gril: P('amur_gril', 'Amur na grilu'), uzeny_uhor: P('uzeny_uhor', 'Uzený úhoř'),
  bolen_bylinky: P('bolen_bylinky', 'Bolen na bylinkách'), kaviar: P('kaviar', 'Kaviár'),
};

// semena (Semenárna: 2 plodiny → 3 balíčky) a sazenice (Školka: 3 plody → 1 sazenice)
// zasazení bere nejdřív semena ze skladu, teprve potom platíš mincemi
export const SEEDS = {};
for (const c of Object.values(CROPS)) SEEDS['s_' + c.id] = { id: 's_' + c.id, name: 'Semena ' + c.name.toLowerCase(), icon: 's_' + c.id, price: c.cost, seed: c.id };
export const SAPLINGS = {};
for (const t of Object.values(TREES)) SAPLINGS['z_' + t.id] = { id: 'z_' + t.id, name: 'Sazenice: ' + t.name, icon: 'z_' + t.id, price: t.cost, sapling: t.id };


// výrobek = id receptu, vždy 1 kus; level = úroveň hráče
const R = (id, building, level, inp, time, xp) => ({ id, building, level, in: inp, time, xp });
export const RECIPES = {
  krmivo_slepice: R('krmivo_slepice', 'krmivarna', 2, { wheat: 2, corn: 1 }, 120, 1),
  krmivo_kravy:   R('krmivo_kravy',   'krmivarna', 4, { corn: 2, carrot: 1 }, 300, 2),
  krmivo_prasata: R('krmivo_prasata', 'krmivarna', 7, { potato: 2, corn: 1, salat: 1 }, 300, 3),
  krmivo_ovce:    R('krmivo_ovce',    'krmivarna', 9, { wheat: 2, zeli: 1, soy: 1 }, 360, 3),
  chleb:          R('chleb',          'pekarna', 2, { wheat: 3 }, 300, 3),
  kolac:          R('kolac',          'pekarna', 4, { wheat: 2, vejce: 2 }, 900, 6),
  tresnovy_kolac: R('tresnovy_kolac', 'pekarna', 7, { mouka: 2, tresne: 2, vejce: 1 }, 1200, 8),
  muffiny:        R('muffiny',        'pekarna', 8, { mouka: 1, boruvky: 2, vejce: 1 }, 900, 7),
  buchty:         R('buchty',         'pekarna', 9, { mouka: 2, cukr: 1, vejce: 1 }, 900, 7),
  orechovy_kolac: R('orechovy_kolac', 'pekarna', 12, { mouka: 2, orech: 2, cukr: 1 }, 1500, 10),
  mouka:          R('mouka',          'mlyn', 4, { wheat: 3 }, 240, 2),
  smetana:        R('smetana',        'mlekarna', 6, { mleko: 1 }, 600, 3),
  syr:            R('syr',            'mlekarna', 7, { mleko: 2 }, 1200, 6),
  maslo:          R('maslo',          'mlekarna', 8, { smetana: 2 }, 900, 6),
  olej:           R('olej',           'olejna', 6, { repka: 2 }, 600, 4),
  sl_olej:        R('sl_olej',        'olejna', 7, { sun: 3 }, 720, 5),
  cukr:           R('cukr',           'cukrovar', 8, { beet: 2 }, 600, 4),
  salat_mix:      R('salat_mix',      'konzervarna', 5, { salat: 2, rajce: 1, okurka: 1, redkvicka: 1 }, 300, 4),
  okurky:         R('okurky',         'konzervarna', 6, { okurka: 3, cesnek: 1 }, 900, 5),
  kecup:          R('kecup',          'konzervarna', 6, { rajce: 4, cibule: 1 }, 900, 5),
  lecho:          R('lecho',          'konzervarna', 7, { paprika: 2, rajce: 2, cibule: 1 }, 1200, 6),
  kysane_zeli:    R('kysane_zeli',    'konzervarna', 8, { zeli: 2, cibule: 1 }, 1200, 6),
  kompot:         R('kompot',         'konzervarna', 8, { angrest: 3, cukr: 1 }, 900, 6),
  hrachovka:      R('hrachovka',      'konzervarna', 9, { hrach: 2, potato: 1, cibule: 1 }, 1200, 7),
  dynovka:        R('dynovka',        'konzervarna', 10, { dyne: 1, cibule: 1, smetana: 1 }, 1200, 8),
  broskve_sklo:   R('broskve_sklo',   'konzervarna', 10, { broskev: 3, cukr: 1 }, 1200, 8),
  dzus_mrkev:     R('dzus_mrkev',     'dzusarna', 5, { carrot: 3 }, 480, 3),
  dzus_jablko:    R('dzus_jablko',    'dzusarna', 5, { jablko: 4 }, 600, 4),
  dzus_hruska:    R('dzus_hruska',    'dzusarna', 5, { hruska: 3 }, 600, 4),
  dzus_visne:     R('dzus_visne',     'dzusarna', 7, { visne: 3 }, 720, 5),
  most:           R('most',           'dzusarna', 9, { hrozny: 3 }, 900, 6),
  napoj:          R('napoj',          'dzusarna', 10, { meloun: 1, cukr: 1 }, 600, 6),
  povidla:        R('povidla',        'marmeladarna', 6, { svestka: 4 }, 900, 5),
  dzem_malina:    R('dzem_malina',    'marmeladarna', 8, { maliny: 3, cukr: 1 }, 900, 6),
  dzem_jahoda:    R('dzem_jahoda',    'marmeladarna', 8, { jahody: 3, cukr: 1 }, 900, 6),
  marmelada:      R('marmelada',      'marmeladarna', 8, { rybiz: 3, cukr: 1 }, 900, 6),
  dzem_merunka:   R('dzem_merunka',   'marmeladarna', 9, { merunka: 3, cukr: 1 }, 900, 7),
  klobasa:        R('klobasa',        'uzenarstvi', 8, { maso: 2, cesnek: 1 }, 1200, 7),
  uzene:          R('uzene',          'uzenarstvi', 9, { maso: 2 }, 1500, 7),
  klubko:         R('klubko',         'textilka', 10, { vlna: 2 }, 900, 7),
  svetr:          R('svetr',          'textilka', 11, { klubko: 2 }, 1800, 10),
  deka:           R('deka',           'textilka', 12, { klubko: 3 }, 2400, 12),
  seminkovy_chleb: R('seminkovy_chleb', 'pekarna', 7, { mouka: 2, s_sun: 2 }, 900, 7),
  prazena_seminka: R('prazena_seminka', 'mlyn', 7, { s_sun: 4 }, 480, 4),
  dynovy_olej:    R('dynovy_olej',    'olejna', 10, { s_dyne: 4 }, 900, 7),
  navnada:        { ...R('navnada', 'krmivarna', 3, { wheat: 1, corn: 1 }, 120, 1), qty: 3 },
  med:            R('med',            'medarna', 5, { plast: 2 }, 300, 3),
  svicka:         R('svicka',         'medarna', 6, { plast: 3 }, 600, 4),
  medovnik:       R('medovnik',       'pekarna', 7, { mouka: 2, med: 1, vejce: 2 }, 1500, 9),
  pernik:         R('pernik',         'pekarna', 6, { mouka: 1, med: 1 }, 600, 5),
  rybi_polevka:   R('rybi_polevka',   'rybarna', 4, { plotice: 2, cibule: 1, potato: 1 }, 900, 5),
  smazeny_kapr:   R('smazeny_kapr',   'rybarna', 5, { kapr: 1, mouka: 1, vejce: 1 }, 900, 5),
  peceny_lin:     R('peceny_lin',     'rybarna', 6, { lin: 2, cesnek: 1 }, 1200, 6),
  rybi_prsty:     R('rybi_prsty',     'rybarna', 7, { okoun: 2, mouka: 1 }, 900, 6),
  uzeny_pstruh:   R('uzeny_pstruh',   'uzenarstvi', 8, { pstruh: 2 }, 1500, 8),
  candat_maslo:   R('candat_maslo',   'rybarna', 10, { candat: 1, maslo: 1 }, 1200, 8),
  stika_cibule:   R('stika_cibule',   'rybarna', 12, { stika: 1, cibule: 2 }, 1200, 9),
  sumcovy_gulas:  R('sumcovy_gulas',  'rybarna', 15, { sumec: 1, paprika: 2, cibule: 1 }, 1800, 12),
  rybi_karbanatky: R('rybi_karbanatky', 'rybarna', 5, { karas: 2, cejn: 1, mouka: 1 }, 900, 5),
  amur_gril:      R('amur_gril',      'rybarna', 9, { amur: 1, cesnek: 1, paprika: 1 }, 1200, 8),
  uzeny_uhor:     R('uzeny_uhor',     'uzenarstvi', 11, { uhor: 2 }, 1500, 9),
  bolen_bylinky:  R('bolen_bylinky',  'rybarna', 13, { bolen: 1, maslo: 1, cibule: 1 }, 1200, 10),
  kaviar:         R('kaviar',         'rybarna', 18, { jeseter: 1 }, 1800, 14),
};
// qty = kolik kusů recept vyrobí (semena 3, jinak 1)
for (const c of CROP_LIST) RECIPES['s_' + c.id] = { ...R('s_' + c.id, 'semenarna', c.level, { [c.id]: 2 }, 60 + Math.round(c.time / 12), 1), qty: 3 };
for (const t of TREE_LIST) RECIPES['z_' + t.id] = { ...R('z_' + t.id, 'skolka', t.level, { [t.fruit]: 3 }, 300 + Math.round(t.first / 6), 2), qty: 1 };
export const recipeQty = r => r.qty || 1;

// zvířata: max = kolik se jich vejde do ohrady (úroveň ohrady přidává další)
export const ANIMALS = {
  slepice: { id: 'slepice', name: 'Slepice', acc: 'slepici', home: 'kurnik',   level: 3, cost: 20,  feed: 'krmivo_slepice', product: 'vejce', time: 600,  xp: 2, max: 3, icon: 'hen' },
  krava:   { id: 'krava',   name: 'Kráva',   acc: 'krávu',   home: 'kravin',   level: 5, cost: 60,  feed: 'krmivo_kravy',   product: 'mleko', time: 1800, xp: 4, max: 3, icon: 'cow' },
  prase:   { id: 'prase',   name: 'Prase',   acc: 'prase',   home: 'prasecak', level: 7, cost: 90,  feed: 'krmivo_prasata', product: 'maso',  time: 2400, xp: 5, max: 3, icon: 'pig' },
  ovce:    { id: 'ovce',    name: 'Ovce',    acc: 'ovci',    home: 'ovcin',    level: 9, cost: 120, feed: 'krmivo_ovce',    product: 'vlna',  time: 3000, xp: 6, max: 3, icon: 'sheep' },
};
export const ANIMAL_LIST = Object.values(ANIMALS);

// ceny výrobků a živočišných produktů dopočítat z receptů
{
  const base = id => (CROPS[id] || FRUITS[id] || PRODUCTS[id] || SEEDS[id] || FISH[id]).price;
  let left = Object.values(RECIPES).filter(r => PRODUCTS[r.id]);
  for (let pass = 0; left.length && pass < 20; pass++) {
    left = left.filter(r => {
      if (Object.keys(r.in).some(id => !base(id))) return true;
      const inputs = Object.entries(r.in).reduce((n, [id, q]) => n + base(id) * q, 0);
      PRODUCTS[r.id].price = Math.max(1, Math.round((inputs * 1.2 + r.time / 60 + 2) / recipeQty(r)));
      return false;
    });
    for (const a of ANIMAL_LIST) {
      if (!PRODUCTS[a.product].price && PRODUCTS[a.feed].price) {
        PRODUCTS[a.product].price = Math.round(PRODUCTS[a.feed].price * 1.3 + a.time / 60 * 0.5 + 3);
      }
    }
  }
}

export const ITEMS = { ...CROPS, ...PRODUCTS, ...FRUITS, ...SEEDS, ...SAPLINGS, ...FISH };
export const ITEM_LIST = Object.values(ITEMS);

// type: main, storage, garage (stodola), dealer (prodejna strojů), stall (stánek), market (tržiště), factory, pen, orchard, bigfield, deco
// st = úroveň statku, která budovu odemkne (úroveň hráče na stavění nemá vliv); max 0 = bez omezení
const B = (id, name, type, st, cost, w, h, xp, max, icon, extra = {}) => ({ id, name, type, level: 1, st, cost, w, h, xp, max, icon, ...extra });
export const BUILDINGS = {
  statek:       B('statek', 'Statek', 'main', 0, 0, 3, 3, 0, 1, 'house'),
  sklad:        B('sklad', 'Sklad', 'storage', 0, 0, 2, 2, 0, 1, 'barn'),
  prodejna:     B('prodejna', 'Prodejna strojů', 'dealer', 0, 0, 3, 3, 0, 1, 'shop', { town: true }),
  stanek:       B('stanek', 'Stánek', 'stall', 0, 0, 3, 3, 0, 1, 'stall', { town: true }),
  trziste:      B('trziste', 'Tržiště hráčů', 'market', 0, 0, 3, 3, 0, 1, 'market', { town: true }),
  // statek 1
  semenarna:    B('semenarna', 'Semenárna', 'factory', 1, 30, 2, 2, 3, 1, 's_wheat'),
  krmivarna:    B('krmivarna', 'Krmivárna', 'factory', 1, 40, 2, 2, 4, 1, 'krmivo_slepice'),
  pekarna:      B('pekarna', 'Pekárna', 'factory', 1, 60, 2, 2, 5, 1, 'chleb'),
  kurnik:       B('kurnik', 'Kurník', 'pen', 1, 50, 2, 2, 5, 1, 'hen', { animal: 'slepice' }),
  sad:          B('sad', 'Sad', 'orchard', 1, 0, 1, 1, 1, 0, 'tree', { info: 'Políčko pro ovocný strom nebo keř.' }),
  ker:          B('ker', 'Keř', 'deco', 1, 10, 1, 1, 1, 0, 'bush'),
  kvetiny:      B('kvetiny', 'Záhon květin', 'deco', 1, 15, 1, 1, 1, 0, 'flowers'),
  // statek 2
  mlyn:         B('mlyn', 'Mlýn', 'factory', 2, 120, 2, 2, 6, 1, 'mouka'),
  kravin:       B('kravin', 'Kravín', 'pen', 2, 150, 3, 3, 8, 1, 'cow', { animal: 'krava' }),
  konzervarna:  B('konzervarna', 'Konzervárna', 'factory', 2, 180, 2, 2, 8, 1, 'okurky'),
  skolka:       B('skolka', 'Školka stromků', 'factory', 2, 120, 2, 2, 5, 1, 'z_jablon'),
  lavicka:      B('lavicka', 'Lavička', 'deco', 2, 30, 1, 1, 2, 0, 'bench'),
  // statek 3
  stodola:      B('stodola', 'Stodola na stroje', 'garage', 3, 300, 3, 2, 10, 1, 'garage'),
  velkepole:    B('velkepole', 'Velké pole', 'bigfield', 3, 0, 4, 4, 5, 0, 'field', { info: 'Pole, na kterém pracují stroje. Velikost si zvolíš.' }),
  dzusarna:     B('dzusarna', 'Džusárna', 'factory', 3, 200, 2, 2, 8, 1, 'dzus_jablko'),
  jablon:       B('jablon', 'Kvetoucí strom', 'deco', 3, 40, 1, 1, 2, 0, 'blossom'),
  // statek 4
  mlekarna:     B('mlekarna', 'Mlékárna', 'factory', 4, 200, 2, 2, 10, 1, 'syr'),
  olejna:       B('olejna', 'Olejna', 'factory', 4, 250, 2, 2, 8, 1, 'olej'),
  marmeladarna: B('marmeladarna', 'Marmeládárna', 'factory', 4, 260, 2, 2, 9, 1, 'dzem_jahoda'),
  fontana:      B('fontana', 'Fontána', 'deco', 4, 150, 1, 1, 5, 0, 'fountain'),
  // v11: rybník, rybárna, včelín, medárna
  rybnik:       B('rybnik', 'Rybník', 'pond', 2, 200, 3, 3, 8, 2, 'pond', { info: 'Rybaření: potřebuješ udici a návnadu.' }),
  rybarna:      B('rybarna', 'Rybárna', 'factory', 3, 300, 2, 2, 9, 1, 'rybi_polevka'),
  vcelin:       B('vcelin', 'Včelín', 'hive', 3, 250, 2, 2, 8, 2, 'hive', { info: 'Včely dělají plástve medu a sadům v okolí přidají úrodu.' }),
  medarna:      B('medarna', 'Medárna', 'factory', 3, 280, 2, 2, 9, 1, 'med'),
  // statek 5
  prasecak:     B('prasecak', 'Prasečák', 'pen', 5, 260, 3, 3, 9, 1, 'pig', { animal: 'prase' }),
  cukrovar:     B('cukrovar', 'Cukrovar', 'factory', 5, 400, 2, 2, 10, 1, 'cukr'),
  // statek 6
  uzenarstvi:   B('uzenarstvi', 'Uzenářství', 'factory', 6, 420, 2, 2, 10, 1, 'klobasa'),
  // statek 7
  ovcin:        B('ovcin', 'Ovčín', 'pen', 7, 450, 3, 3, 10, 1, 'sheep', { animal: 'ovce' }),
  textilka:     B('textilka', 'Textilka', 'factory', 7, 600, 2, 2, 12, 1, 'klubko'),
};
export const BUILDING_LIST = Object.values(BUILDINGS);

// stroje a náčiní z prodejny; speed = políček za minutu; vozidla (tractor, combine) potřebují místo ve stodole
export const MACHINES = {
  brazda60:  { id: 'brazda60',  name: 'Traktor Brázda 60',  type: 'tractor', level: 5,  cost: 250,  speed: 6,  icon: 'tractor', info: 'Seje a orá na velkém poli, sklízí zeleninu. Zaseje i všechna malá pole.' },
  klas4:     { id: 'klas4',     name: 'Kombajn Klas 4',     type: 'combine', level: 6,  cost: 600,  speed: 6,  icon: 'combine', info: 'Sklízí obilí, olejniny a hrách. Sklidí i všechna malá pole.' },
  brazda120: { id: 'brazda120', name: 'Traktor Brázda 120', type: 'tractor', level: 9,  cost: 900,  speed: 12, icon: 'tractor', info: 'Dvakrát rychlejší traktor.' },
  klas8:     { id: 'klas8',     name: 'Kombajn Klas 8',     type: 'combine', level: 11, cost: 1800, speed: 12, icon: 'combine', info: 'Dvakrát rychlejší kombajn.' },
  pluh:      { id: 'pluh',      name: 'Pluh',               type: 'plow',    level: 6,  cost: 300,  speed: 0,  icon: 'pluh',  info: 'Zorané velké pole dá o 50 % větší úrodu. Táhne ho traktor.' },
  secka:     { id: 'secka',     name: 'Secí stroj',         type: 'seeder',  level: 7,  cost: 500,  speed: 0,  icon: 'secka', info: 'Traktor s ním seje dvakrát rychleji.' },
  lis:       { id: 'lis',       name: 'Lis na balíky',      type: 'baler',   level: 8,  cost: 700,  speed: 0,  icon: 'lis',   info: 'Po sklizni obilí slisuje slámu do balíků. Táhne ho traktor.' },
  udice:     { id: 'udice',     name: 'Udice',              type: 'rod',     level: 3,  cost: 80,   speed: 0,  icon: 'udice', info: 'Na rybaření v rybníku. Návnadu vyrobíš v Krmivárně.' },
  udice2:    { id: 'udice2',    name: 'Karbonová udice',    type: 'rod',     level: 10, cost: 700,  speed: 0,  icon: 'udice2', info: 'Ryba se drží snáz a častěji zabere vzácná.' },
  kolecko:   { id: 'kolecko',   name: 'Kolečko',            type: 'helper',  level: 3,  cost: 150,  speed: 0,  icon: 'kolecko', info: 'Pomocník s ním obslouží o 2 políčka víc najednou.' },
  motyka:    { id: 'motyka',    name: 'Motyka a konev',     type: 'helper',  level: 4,  cost: 250,  speed: 0,  icon: 'motyka', info: 'Pomocník pracuje dvakrát častěji.' },
};
export const MACHINE_LIST = Object.values(MACHINES);

// ---------- denní úkoly (8 každý den, stejné na serveru i v prohlížeči) ----------
export const QUEST_COUNT = 8;
const hasAnimals = f => f.objects.some(o => o.animals && o.animals.length);
export const QUEST_TYPES = {
  harvest: { text: 'Sklidit plodin', icon: 'wheat', base: 20, per: 3, pay: 1.5 },
  plant:   { text: 'Zasadit políček', icon: 'plot', base: 12, per: 2, pay: 1.8 },
  sold:    { text: 'Vydělat mincí prodejem', icon: 'coin', base: 50, per: 12, pay: 0.3 },
  orders:  { text: 'Doručit zakázek', icon: 'truck', base: 2, per: 0.15, pay: 25 },
  produce: { text: 'Vyrobit výrobků', icon: 'chleb', base: 4, per: 0.5, pay: 9, need: f => f.objects.some(o => BUILDINGS[o.kind].type === 'factory') },
  animal:  { text: 'Sebrat od zvířat', icon: 'vejce', base: 4, per: 0.4, pay: 9, need: hasAnimals },
  feed:    { text: 'Nakrmit zvířat', icon: 'krmivo_slepice', base: 4, per: 0.4, pay: 6, need: hasAnimals },
  fruit:   { text: 'Sklidit ovoce', icon: 'jablko', base: 6, per: 0.5, pay: 5, need: f => f.objects.some(o => o.kind === 'sad' && o.tree) },
  fish:    { text: 'Ulovit ryb', icon: 'kapr', base: 3, per: 0.2, pay: 12, need: f => f.objects.some(o => o.kind === 'rybnik') && f.machines.some(m => MACHINES[m.model].type === 'rod') },
  jobs:    { text: 'Práce strojů na velkém poli', icon: 'tractor', base: 2, per: 0.1, pay: 20, need: f => f.objects.some(o => o.kind === 'velkepole') && f.machines.some(m => MACHINES[m.model].type === 'tractor') },
};
export const questBonus = farm => ({ coins: 100 + 10 * farm.level, xp: 10 + farm.level });
function genQuests(farm, day) {
  const r = seeded(`${farm.created}:${day}:q`);
  const pool = Object.keys(QUEST_TYPES).filter(k => !QUEST_TYPES[k].need || QUEST_TYPES[k].need(farm));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const L = Math.min(farm.level, 60);
  const list = [];
  for (let i = 0; i < QUEST_COUNT; i++) {
    const k = pool[i % pool.length], q = QUEST_TYPES[k];
    const mult = 1 + Math.floor(i / pool.length) * 0.8;
    const n = Math.max(1, Math.round((q.base + q.per * L) * mult * (0.85 + r() * 0.3)));
    list.push({ t: k, n, coins: Math.round(n * q.pay * (1 + L * 0.04)) + 5, xp: 2 + Math.floor(L / 3), done: false });
  }
  return list;
}
// úkoly pro dnešek; fresh = nový den (farma se nemění, jen se vrátí, jak by vypadaly)
export function dailyQuests(farm, now) {
  const day = dayKey(now);
  if (farm.quests && farm.quests.day === day) return farm.quests;
  return { day, base: { ...farm.stats }, list: genQuests(farm, day), bonus: false };
}
function ensureQuests(farm, now) {
  if (!farm.quests || farm.quests.day !== dayKey(now)) farm.quests = dailyQuests(farm, now);
  return farm.quests;
}
export const questProgress = (farm, qs, q) => Math.max(0, (farm.stats[q.t] || 0) - (qs.base[q.t] || 0));

// ---------- tržiště hráčů (pravidla; obchod mezi farmami řeší server) ----------
export const MARKET_SLOTS = 8;      // kolik nabídek může mít hráč najednou
export const MARKET_MAX = 3;        // nejvýš 3× skutečná cena
export const marketBase = l => (l.machine ? MACHINES[l.machine].cost : ITEMS[l.item].price * l.qty);
export const marketMaxPrice = l => Math.max(1, Math.round(marketBase(l) * MARKET_MAX));
// vyjme zboží nebo stroj z farmy prodávajícího; vrací { ok, listing: { item, qty } | { machine } }
export function marketTake(farm, a, now) {
  normalize(farm);
  if (!isInt(a.price) || a.price < 1) return fail('bad_price');
  let listing;
  if (a.machine !== undefined) {
    const m = findMachine(farm, a.machine);
    if (!m) return fail('no_machine');
    if (machineJob(farm, m.id, now)) return fail('machine_busy');
    if (farm.helper && farm.helper.tractor && MACHINES[m.model].type === 'tractor' && farm.machines.filter(x => MACHINES[x.model].type === 'tractor').length === 1) farm.helper.tractor = false;
    listing = { machine: m.model };
    if (a.price > marketMaxPrice(listing)) return fail('bad_price');
    farm.machines = farm.machines.filter(x => x.id !== m.id);
  } else {
    const it = getItem(a.item);
    if (!it || !isInt(a.qty) || a.qty < 1 || a.qty > 999) return fail('bad_action');
    if (have(farm, it.id) < a.qty) return fail('not_enough');
    listing = { item: it.id, qty: a.qty };
    if (a.price > marketMaxPrice(listing)) return fail('bad_price');
    takeItem(farm, it.id, a.qty);
  }
  return { ok: true, listing: { ...listing, price: a.price } };
}
// vloží zboží z nabídky do farmy (koupě nebo vrácení); pay = kolik zaplatí
export function marketGive(farm, l, pay) {
  normalize(farm);
  if (farm.coins < pay) return fail('no_coins');
  if (l.machine) {
    if (!own(MACHINES, l.machine)) return fail('bad_action');
    if (farm.machines.some(x => x.model === l.machine)) return fail('owned');
    if (isVehicle(l.machine) && vehicleCount(farm) >= garageSlots(farm)) return fail(countKind(farm, 'stodola') ? 'garage_full' : 'no_garage');
    farm.machines.push({ id: farm.nextId++, model: l.machine });
  } else {
    if (!getItem(l.item)) return fail('bad_action');
    if (siloFree(farm) < l.qty) return fail('silo_full');
    farm.silo[l.item] = (farm.silo[l.item] || 0) + l.qty;
  }
  farm.coins -= pay;
  return { ok: true };
}
// prodávajícímu přijdou peníze za prodané nabídky
export function marketPayout(farm, coins) {
  farm.coins += coins;
  addStat(farm, 'sold', coins);
}

// ---------- odměny a úkoly ----------
export const DAILY = [
  { coins: 20 }, { coins: 30 }, { coins: 40 }, { coins: 60 }, { coins: 80 }, { coins: 100 }, { coins: 200, xp: 10 },
];
export const ACHIEVEMENTS = [
  { id: 'harvest', name: 'Sklízeč',        stat: 'harvest', tiers: [50, 500, 5000],   coins: [50, 250, 1000], icon: 'wheat',  text: 'Sklidit plodin' },
  { id: 'produce', name: 'Výrobce',        stat: 'produce', tiers: [20, 200, 2000],   coins: [60, 300, 1200], icon: 'chleb',  text: 'Vyrobit výrobků' },
  { id: 'animal',  name: 'Chovatel',       stat: 'animal',  tiers: [20, 200, 2000],   coins: [60, 300, 1200], icon: 'vejce',  text: 'Sebrat vajec a mléka' },
  { id: 'fruit',   name: 'Sadař',          stat: 'fruit',   tiers: [30, 300, 3000],   coins: [60, 300, 1200], icon: 'jablko', text: 'Sklidit ovoce' },
  { id: 'orders',  name: 'Dodavatel',      stat: 'orders',  tiers: [10, 100, 500],    coins: [80, 400, 1500], icon: 'truck',  text: 'Doručit zakázek' },
  { id: 'sold',    name: 'Obchodník',      stat: 'sold',    tiers: [500, 5000, 50000], coins: [50, 300, 1500], icon: 'coin',  text: 'Vydělat mincí výkupem' },
  { id: 'fish',    name: 'Rybář',          stat: 'fish',    tiers: [10, 100, 1000],   coins: [60, 300, 1200], icon: 'kapr',   text: 'Ulovit ryb' },
  { id: 'jobs',    name: 'Strojník',       stat: 'jobs',    tiers: [5, 50, 300],      coins: [80, 400, 1500], icon: 'tractor', text: 'Prací strojů na velkém poli' },
];
const STAT_KEYS = ['harvest', 'produce', 'animal', 'fruit', 'orders', 'sold', 'jobs', 'plant', 'feed', 'fish'];

// výkupní cena se mění každé 4 hodiny (0,7× až 1,4×), stejně na serveru i v prohlížeči
export const MARKET_PERIOD = 4 * 3600 * 1000;
export function marketMult(id, now) {
  const period = Math.floor(now / MARKET_PERIOD);
  let h = 2166136261;
  for (const ch of id + ':' + period) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return Math.round((0.7 + (h % 1000) / 1000 * 0.7) * 100) / 100;
}
// výkupna ve skladu platí polovinu ceny (× tržní výkyv); lépe platí stánek a nejlépe zakázky
export const sellPrice = (id, now) => Math.max(1, Math.round(ITEMS[id].price * 0.5 * marketMult(id, now)));
export const nextMarketChange = now => (Math.floor(now / MARKET_PERIOD) + 1) * MARKET_PERIOD;

// ---------- počasí (stejné pro všechny hráče, mění se každé 2 hodiny) ----------
export const WEATHER_PERIOD = 2 * 3600 * 1000;
export const WEATHER = {
  jasno:     { id: 'jasno',     name: 'Jasno',         icon: 'w_sun',   w: 40, grow: 1,    fish: 1,   text: 'Pěkný den, všechno roste normálně.' },
  polojasno: { id: 'polojasno', name: 'Polojasno',     icon: 'w_cloud', w: 25, grow: 1,    fish: 1.2, text: 'Ryby berou o něco lépe.' },
  dest:      { id: 'dest',      name: 'Déšť',          icon: 'w_rain',  w: 22, grow: 0.8,  fish: 1.8, text: 'Co zasadíš v dešti, roste o 20 % rychleji. Ryby berou a častěji zabere velká.' },
  horko:     { id: 'horko',     name: 'Horko a sucho', icon: 'w_hot',   w: 13, grow: 1.15, fish: 0.7, text: 'Co zasadíš v horku, roste o 15 % pomaleji. Ryby moc neberou.' },
};
export function weatherAt(now) {
  const p = Math.floor(now / WEATHER_PERIOD);
  let x = (hashStr('pocasi:' + p) % 1000) / 1000 * 100;
  for (const w of Object.values(WEATHER)) { x -= w.w; if (x < 0) return w; }
  return WEATHER.jasno;
}
export const nextWeather = now => (Math.floor(now / WEATHER_PERIOD) + 1) * WEATHER_PERIOD;
// jak dlouho poroste plodina zasazená v čase now (ms)
export const growMs = (c, now) => Math.round(c.time * 1000 * weatherAt(now).grow);

// den pro denní odměnu (středoevropský čas, zjednodušeně UTC+1)
export const dayKey = now => new Date(now + 3600000).toISOString().slice(0, 10);
export const MACHINE_TYPE_NAME = { rod: 'udice', tractor: 'traktor', combine: 'kombajn', plow: 'pluh', seeder: 'secí stroj', baler: 'lis', helper: 'náčiní' };
export const isVehicle = model => ['tractor', 'combine'].includes(MACHINES[model].type);

// celkové XP potřebné pro dosažení úrovně (index = úroveň)
// úroveň hráče roste pořád (do 200); s budovami nesouvisí – ty odemyká Statek
export const LEVEL_XP = (() => {
  const a = [0, 0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 760, 920, 1100, 1300, 1550, 1800, 2100];
  for (let l = 21; l <= 200; l++) a.push(a[l - 1] + 300 + 20 * (l - 20));
  return a;
})();
export const MAX_LEVEL = LEVEL_XP.length - 1;

function own(table, id) {
  return typeof id === 'string' && Object.hasOwn(table, id) ? table[id] : null;
}
export const getCrop = id => own(CROPS, id);
export const getItem = id => own(ITEMS, id);
export const getBuilding = id => own(BUILDINGS, id);
export const getRecipe = id => own(RECIPES, id);
const isInt = v => Number.isInteger(v);

// ---------- stav ----------
export function newFarm(now) {
  return normalize({
    v: RULES_VERSION,
    coins: START_COINS,
    xp: 0,
    level: 1,
    silo: {},
    siloCap: SILO_START,
    plots: [],            // 6 polí si hráč postaví sám, zdarma
    objects: [{ id: 1, kind: 'statek', x: MAIN_POS[0], y: MAIN_POS[1] }],
    machines: [],         // stroje v garáži: { id, model }
    nextId: 2,
    pending: ['sklad'],   // budovy zdarma, které hráč ještě neumístil
    created: now,
    seed: (now % 2147483646) + 1,
  });
}

// doplní chybějící části u starších farem
export function normalize(farm) {
  if (!Array.isArray(farm.objects)) farm.objects = [];
  if (!farm.nextId) farm.nextId = 1;
  if (!farm.siloCap) farm.siloCap = SILO_START;
  if (!Array.isArray(farm.pending)) farm.pending = [];
  if (!Array.isArray(farm.machines)) farm.machines = [];
  if (!Array.isArray(farm.land)) farm.land = [];
  if (!farm.stats) farm.stats = {};
  for (const k of STAT_KEYS) if (!farm.stats[k]) farm.stats[k] = 0;
  if (!farm.ach) farm.ach = {};
  if (!farm.daily) farm.daily = { day: '', streak: 0 };
  // v3/v4: traktor a kombajn stály na mapě – převést do garáže
  const OLD = { traktor: 'brazda60', kombajn: 'klas4' };
  for (const o of farm.objects.filter(o => OLD[o.kind])) {
    if (!farm.machines.some(m => m.model === OLD[o.kind])) farm.machines.push({ id: o.id, model: OLD[o.kind] });
  }
  farm.objects = farm.objects.filter(o => !OLD[o.kind]);
  if (!farm.objects.some(o => o.kind === 'statek')) {
    // starší farma: statek doprostřed, nebo na nejbližší volné místo
    let pos = fits(farm, MAIN_POS[0], MAIN_POS[1], 3, 3) ? MAIN_POS : null;
    for (let r = 1; !pos && r < GRID_W; r++) {
      for (let y = MAIN_POS[1] - r; !pos && y <= MAIN_POS[1] + r; y++) {
        for (let x = MAIN_POS[0] - r; !pos && x <= MAIN_POS[0] + r; x++) if (fits(farm, x, y, 3, 3)) pos = [x, y];
      }
    }
    if (pos) farm.objects.unshift({ id: farm.nextId++, kind: 'statek', x: pos[0], y: pos[1] });
  }
  if (!farm.objects.some(o => o.kind === 'sklad') && !farm.pending.includes('sklad')) farm.pending.push('sklad');
  for (const o of farm.objects) if (!o.lvl && UP_BASE[BUILDINGS[o.kind].type]) o.lvl = 1;
  // v10: prodejna strojů a stánek se přestěhovaly do městečka (úroveň zůstává)
  if (!farm.town) farm.town = {};
  for (const k of TOWN_KINDS) {
    const o = farm.objects.find(x => x.kind === k);
    farm.town[k] = Math.max(farm.town[k] || 1, o ? objLevel(o) : 1);
  }
  farm.objects = farm.objects.filter(o => !TOWN_KINDS.includes(o.kind));
  if (farm.machines.some(m => isVehicle(m.model)) && !farm.objects.some(o => o.kind === 'stodola') && !farm.pending.includes('stodola')) farm.pending.push('stodola');
  if (farm.helper === undefined) farm.helper = null;
  if (farm.tut === undefined) farm.tut = farm.level >= 2 || farm.plots.length > FREE_PLOTS ? TUTORIAL_DONE : 0;
  if (!farm.seed) farm.seed = ((farm.created || 1) % 2147483646) + 1;
  if (!Array.isArray(farm.orders)) farm.orders = [];
  while (farm.orders.length < ORDER_SLOTS) farm.orders.push(genOrder(farm, 0));
  farm.v = RULES_VERSION;
  return farm;
}

export function levelForXp(xp) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= LEVEL_XP[l + 1]) l++;
  return l;
}

// { cur, need } – kolik XP v rámci aktuální úrovně
export function levelProgress(farm) {
  if (farm.level >= MAX_LEVEL) return { cur: 1, need: 1 };
  const base = LEVEL_XP[farm.level];
  return { cur: farm.xp - base, need: LEVEL_XP[farm.level + 1] - base };
}

function addXp(farm, n) {
  const before = farm.level;
  farm.xp += n;
  farm.level = levelForXp(farm.xp);
  return farm.level > before ? farm.level : 0;
}

export function siloUsed(farm) {
  let n = 0;
  for (const k in farm.silo) n += farm.silo[k];
  return n;
}
export const siloFree = farm => farm.siloCap - siloUsed(farm);
export const siloUpgradePrice = farm => 80 * ((farm.siloCap - SILO_START) / SILO_STEP + 1);

const ANIMAL_PRODUCTS = new Set(['vejce', 'mleko', 'maso', 'vlna', 'plast']);
function statOf(id) {
  if (FISH[id]) return 'fish';
  if (CROPS[id] || id === 'slama') return 'harvest';
  if (FRUITS[id]) return 'fruit';
  if (ANIMAL_PRODUCTS.has(id)) return 'animal';
  return 'produce';
}
function addStat(farm, key, n) { farm.stats[key] = (farm.stats[key] || 0) + n; }
function addItem(farm, id, n) {
  farm.silo[id] = (farm.silo[id] || 0) + n;
  addStat(farm, statOf(id), n);
}
function takeItem(farm, id, n) {
  farm.silo[id] -= n;
  if (!farm.silo[id]) delete farm.silo[id];
}
export const have = (farm, id) => farm.silo[id] || 0;
// zaplatí osivo na n políček: nejdřív semena ze skladu, zbytek mincemi; null = nemá na to
function payCrop(farm, c, n) {
  const seeds = Math.min(n, have(farm, 's_' + c.id));
  const coins = (n - seeds) * c.cost;
  if (farm.coins < coins) return null;
  if (seeds) takeItem(farm, 's_' + c.id, seeds);
  farm.coins -= coins;
  return { seeds, coins };
}
export function hasInputs(farm, recipe) {
  return Object.entries(recipe.in).every(([id, n]) => have(farm, id) >= n);
}

export function maxPlots(farm) {
  return FREE_PLOTS + PLOTS_PER_LEVEL * statekLevel(farm);
}

export function plotPrice(farm) {
  const n = farm.plots.length;
  return n < FREE_PLOTS ? 0 : 15 + 5 * (n - FREE_PLOTS);
}

export function maxOrchards(farm) {
  return 2 * statekLevel(farm);
}
export function orchardPrice(farm) {
  return 30 + 20 * countKind(farm, 'sad');
}

// stav stromu v sadu: 'empty' | 'growing' | 'ready' | 'dead'
// co se vrátí při vykopání živého stromu: jen dokud ještě nedal žádnou úrodu (sazenice do skladu, nebo zaplacené mince)
export function treeRefund(o) {
  const t = o.tree && TREES[o.tree];
  if (!t || o.dead || o.left !== t.harvests) return null;
  if (o.paid === 'sap') return { item: 'z_' + t.id };
  if (typeof o.paid === 'number' && o.paid > 0) return { coins: o.paid };
  return null;
}
export function treeState(obj, now) {
  if (!obj.tree) return { state: 'empty', progress: 0, left: 0 };
  if (obj.dead) return { state: 'dead', progress: 1, left: 0 };
  const t = TREES[obj.tree];
  if (now >= obj.readyAt) return { state: 'ready', progress: 1, left: 0 };
  const total = (obj.left === t.harvests ? t.first : t.regrow) * 1000;
  return { state: 'growing', progress: Math.max(0, 1 - (obj.readyAt - now) / total), left: Math.ceil((obj.readyAt - now) / 1000) };
}

// ---------- stroje a velké pole ----------
export const maxBigFields = farm => { const st = statekLevel(farm); return st < 3 ? 0 : 1 + Math.floor((st - 3) / 2); };
export const hasMachine = (farm, type) => farm.machines.some(m => MACHINES[m.model].type === type);
export const findMachine = (farm, id) => farm.machines.find(m => m.id === id) || null;
export function machineJob(farm, id, now) {
  return farm.objects.find(o => o.job && o.job.m === id && now < o.job.end) || null;
}
// nejrychlejší volný stroj daného typu
export function freeMachine(farm, type, now) {
  return farm.machines
    .filter(m => MACHINES[m.model].type === type && !machineJob(farm, m.id, now))
    .sort((a, b) => MACHINES[b.model].speed - MACHINES[a.model].speed)[0] || null;
}
export const jobSeconds = (cells, model) => Math.ceil(cells / MACHINES[model].speed * 60);

// stav velkého pole: empty | sowing | growing | ready | harvesting | unload
export function fieldState(o, now) {
  const j = o.job;
  if (j && now < j.end) {
    const map = { sow: 'sowing', harvest: 'harvesting', plow: 'plowing', bale: 'baling' };
    return { state: map[j.type], progress: (now - j.start) / (j.end - j.start), left: Math.ceil((j.end - now) / 1000) };
  }
  if (o.load && o.load.qty > 0) return { state: 'unload', progress: 1, left: 0, stock: o.load.qty, item: o.load.item };
  if (o.crop) {
    if (now >= o.readyAt) return { state: 'ready', progress: 1, left: 0 };
    const total = o.readyAt - j.end;
    return { state: 'growing', progress: Math.max(0, (now - j.end) / total), left: Math.ceil((o.readyAt - now) / 1000) };
  }
  return { state: 'empty', progress: 0, left: 0, soil: o.soil || 'raw', straw: !!o.straw };
}
export const hasTool = (farm, type) => farm.machines.some(m => MACHINES[m.model].type === type);
export function fieldYield(o) {
  return Math.round(o.w * o.h * CROPS[o.crop].yield * (o.mult || 1));
}

// ---------- úrovně budov ----------
export const MAX_BLD_LEVEL = 10;
const UP_BASE = { main: 300, storage: 120, garage: 180, dealer: 160, stall: 140, factory: 110, pen: 110, pond: 130, hive: 140 };
export const UPGRADABLE = Object.keys(UP_BASE);
export const objLevel = o => o.lvl || 1;
export function statekLevel(farm) {
  const st = farm.objects.find(o => o.kind === 'statek');
  return st ? objLevel(st) : 1;
}
export const speedMult = o => 1 - 0.05 * (objLevel(o) - 1);          // −5 % času za úroveň
export const queueSize = o => QUEUE_SIZE + Math.floor((objLevel(o) - 1) / 3);
export const penMax = o => ANIMALS[BUILDINGS[o.kind].animal].max + Math.floor((objLevel(o) - 1) / 3);
export const garageSlots = farm => farm.objects.filter(o => o.kind === 'stodola').reduce((n, o) => n + 1 + objLevel(o), 0);
export const vehicleCount = farm => farm.machines.filter(m => isVehicle(m.model)).length;
export const townLevel = (farm, kind) => (farm.town && farm.town[kind]) || 1;
export const dealerDiscount = farm => 0.03 * (townLevel(farm, 'prodejna') - 1);
export const machinePrice = (farm, id) => Math.round(MACHINES[id].cost * (1 - dealerDiscount(farm)));
export const orderBonus = farm => 1 + 0.03 * (statekLevel(farm) - 1);

function hashStr(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function seeded(str) {
  let x = hashStr(str) % 2147483646 + 1;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

// ---------- zásoba, která přibývá s časem (ryby v rybníku, plástve ve včelíně) ----------
// o.sc = kolik bylo v čase o.st; každých iv ms přibude 1, nejvýš cap
export function stockState(o, now, cap, iv) {
  const el = Math.max(0, now - (o.st || 0));
  const count = Math.min(cap, (o.sc || 0) + Math.floor(el / iv));
  return { count, cap, next: count >= cap ? 0 : iv - (el % iv) };
}
function takeStock(o, now, cap, iv, n) {
  const s = stockState(o, now, cap, iv);
  o.st = s.count >= cap ? now : now - (iv - s.next);
  o.sc = s.count - n;
}
const near = (a, b, r) => {
  const sa = objSize(a), sb = objSize(b);
  return a.x - r < b.x + sb.w && b.x < a.x + sa.w + r && a.y - r < b.y + sb.h && b.y < a.y + sa.h + r;
};
export const POND_IV = 10 * 60000;
export const HIVE_IV = 20 * 60000;
export const pondCap = o => 4 + objLevel(o);
export const pondIv = o => Math.round(POND_IV * speedMult(o));
export const pondStock = (o, now) => stockState(o, now, pondCap(o), pondIv(o));
export const hiveCap = o => 3 + Math.floor(objLevel(o) / 2);
// květiny, kvetoucí stromy a sady do 4 políček zrychlí včely o čtvrtinu
export const hiveFlowers = (farm, o) => farm.objects.some(x => (x.kind === 'kvetiny' || x.kind === 'jablon' || (x.kind === 'sad' && x.tree && !x.dead)) && near(o, x, 4));
export const hiveIv = (farm, o) => Math.round(HIVE_IV * speedMult(o) * (hiveFlowers(farm, o) ? 0.75 : 1));
export const hiveStock = (farm, o, now) => stockState(o, now, hiveCap(o), hiveIv(farm, o));
// sad blízko včelína dá o 1 plod víc
export const beeBonus = (farm, o) => (farm.objects.some(x => x.kind === 'vcelin' && near(o, x, 4)) ? 1 : 0);

// která ryba zabere (podle úrovně, s lepší udicí častěji vzácná)
export function pickFish(farm, roll, now = 0) {
  const good = farm.machines.some(m => m.model === 'udice2');
  const wf = weatherAt(now).fish;
  const list = FISH_LIST.filter(f => f.level <= farm.level);
  const w = f => f.w * (good && f.diff >= 0.5 ? 1.8 : 1) * (f.diff >= 0.5 ? wf : 1);
  let x = roll * list.reduce((n, f) => n + w(f), 0);
  for (const f of list) { x -= w(f); if (x < 0) return f.id; }
  return list[list.length - 1].id;
}
export const HOOK_MS = 120000;   // ryba na háčku vydrží 2 minuty

// ---------- průvodce a upozornění ----------
// co se na farmě stalo hotovým mezi časy from a to (pro upozornění v telefonu)
export function readyEvents(farm, from, to) {
  const inR = t => t > from && t <= to;
  const ev = [];
  const crops = farm.plots.filter(p => p.crop && inR(p.planted + (p.d || CROPS[p.crop].time * 1000))).length;
  if (crops) ev.push({ k: 'crop', text: `Úroda je zralá na ${crops} ${crops === 1 ? 'poli' : 'polích'}` });
  for (const o of farm.objects) {
    const d = BUILDINGS[o.kind];
    if (d.type === 'factory' && (o.queue || []).some(q => inR(q.end))) ev.push({ k: 'factory', text: `${d.name}: výrobek je hotový` });
    if (d.type === 'pen' && (o.animals || []).some(x => x.fed && inR(x.fed + (x.dur || ANIMALS[d.animal].time * 1000)))) ev.push({ k: 'pen', text: `${d.name}: zvířata mají hotovo` });
    if (d.type === 'orchard' && o.tree && !o.dead && inR(o.readyAt)) ev.push({ k: 'tree', text: `${TREES[o.tree].name}: ovoce je zralé` });
    if (d.type === 'bigfield' && o.crop && inR(o.readyAt)) ev.push({ k: 'field', text: `Velké pole: ${CROPS[o.crop].name} je zralá` });
    if (d.type === 'hive') { const s = hiveStock(farm, o, to); if (s.count >= s.cap && hiveStock(farm, o, from).count < s.cap) ev.push({ k: 'hive', text: 'Včelín je plný medu' }); }
  }
  if (farm.helper && inR(farm.helper.until)) ev.push({ k: 'helper', text: 'Pomocník skončil práci' });
  const seen = new Set();
  return ev.filter(e => (e.k === 'factory' || e.k === 'pen' ? true : !seen.has(e.k) && seen.add(e.k)));
}
export const TUTORIAL_DONE = 99;

// cena vylepšení budovy na další úroveň (stejná na serveru i v prohlížeči)
export function upgradeCost(o) {
  const d = BUILDINGS[o.kind];
  if (!UP_BASE[d.type]) return null;
  const L = objLevel(o);
  if (L >= MAX_BLD_LEVEL) return null;
  const coins = Math.round(UP_BASE[d.type] * Math.pow(L, 1.5));
  const tier = Math.min(MAX_LEVEL, 1 + Math.round(L * 1.6));
  const pool = orderableItems(tier, L).filter(id => ITEMS[id].price <= coins);
  const r = seeded(o.kind + ':' + L);
  const k = Math.min(pool.length, L < 4 ? 2 : 3);
  const items = [];
  const left = [...pool];
  for (let i = 0; i < k; i++) {
    const id = left.splice(Math.floor(r() * left.length), 1)[0];
    items.push({ item: id, qty: Math.max(2, Math.min(40, Math.round(coins * 0.5 / k / ITEMS[id].price))) });
  }
  return { level: L + 1, coins, items };
}

// co přinese další úroveň (text pro panel)
export function upgradeEffect(o) {
  const d = BUILDINGS[o.kind], L = objLevel(o) + 1;
  switch (d.type) {
    case 'main': {
      const nb = BUILDING_LIST.filter(b => b.st === L).map(b => b.name);
      const f = { objects: [{ kind: 'statek', lvl: L }] };
      return (nb.length ? `odemkne ${nb.join(', ')}; ` : '') + `až ${maxPlots(f)} polí, ${maxOrchards(f)} sadů, ${maxBigFields(f)}× velké pole, zakázky +${3 * (L - 1)} % mincí`;
    }
    case 'storage': return 'sklad +40 míst';
    case 'pond': return `až ${4 + L} ryb v rybníku, doplňuje se o ${5 * (L - 1)} % rychleji`;
    case 'hive': return `až ${3 + Math.floor(L / 2)} pláství, včely o ${5 * (L - 1)} % rychlejší`;
    case 'garage': return `místo pro ${1 + L} strojů`;
    case 'dealer': return `stroje o ${3 * (L - 1)} % levněji`;
    case 'stall': return 'víc nabídek a lepší ceny';
    case 'factory': return `výroba o ${5 * (L - 1)} % rychlejší${(L - 1) % 3 === 0 ? ', +1 místo ve frontě' : ''}`;
    case 'pen': return `zvířata o ${5 * (L - 1)} % rychlejší${(L - 1) % 3 === 0 ? ', +1 místo v ohradě' : ''}`;
  }
  return '';
}

// sklizeň jednoho malého pole (s 8% šancí na dvojitou „bohatou úrodu“)
function harvestPlot(farm, p) {
  const c = CROPS[p.crop];
  const bonus = rnd(farm) < 0.08 && siloFree(farm) >= c.yield * 2;
  const qty = bonus ? c.yield * 2 : c.yield;
  addItem(farm, c.id, qty);
  p.crop = null;
  p.planted = 0;
  return qty;
}

// ---------- pomocník ----------
export const HELPER_PLANS = [{ h: 1, cost: 120 }, { h: 4, cost: 400 }, { h: 8, cost: 700 }];
export const HELPER_LEVEL = 3;
export const helperInterval = farm => (hasTool(farm, 'helper') && farm.machines.some(m => m.model === 'motyka') ? 10 : 20);
export function helperCapacity(farm) {
  return 2 + (farm.machines.some(m => m.model === 'kolecko') ? 2 : 0) + (farm.helper && farm.helper.tractor && hasMachine(farm, 'tractor') ? 3 : 0);
}
export const helperActive = (farm, now) => !!farm.helper && now < farm.helper.until;

// pomocník pracuje v pravidelných kolech; dopočítá se vždy až do „teď“ (stejně na serveru i v prohlížeči)
export function runHelper(farm, now) {
  const h = farm.helper;
  if (!h) return [];
  const end = Math.min(now, h.until);
  const iv = helperInterval(farm) * 1000;
  const touched = [];
  let t = h.last + iv;
  for (let guard = 0; t <= end && guard < 6000; guard++, t += iv) {
    let cap = helperCapacity(farm);
    const plots = [...farm.plots].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const p of plots) {
      if (cap <= 0) break;
      if (p.crop && plotState(p, t).state === 'ready' && siloFree(farm) >= CROPS[p.crop].yield) {
        const c = CROPS[p.crop];
        harvestPlot(farm, p);
        addXp(farm, c.xp);
        h.n = (h.n || 0) + 1; cap--; touched.push([p.x, p.y]);
      }
    }
    const c = h.crop && getCrop(h.crop);
    if (c && farm.level >= c.level) {
      for (const p of plots) {
        if (cap <= 0) break;
        if (!p.crop) {
          if (!payCrop(farm, c, 1)) break;
          addStat(farm, 'plant', 1);
          p.crop = c.id; p.planted = t; p.d = growMs(c, t);
          h.n = (h.n || 0) + 1; cap--; touched.push([p.x, p.y]);
        }
      }
    }
    h.last = t;
  }
  return touched;
}

// ---------- stánek ----------
export const STALL_PERIOD = 2 * 3600 * 1000;
export function stallOffers(farm, now) {
  const period = Math.floor(now / STALL_PERIOD);
  const L = townLevel(farm, 'stanek');
  const lv = farm.stall && farm.stall.p === period ? farm.stall.lv : farm.level;
  const r = seeded(`${farm.created}:${period}:${L}`);
  const pool = orderableItems(lv);
  const pick = n => { const left = [...pool], out = []; for (let i = 0; i < n && left.length; i++) out.push(left.splice(Math.floor(r() * left.length), 1)[0]); return out; };
  const buy = pick(4 + Math.floor((L - 1) / 3)).map(id => ({
    item: id, qty: 3 + Math.floor(r() * (ITEMS[id].price < 20 ? 8 : 4)),
    price: Math.ceil(ITEMS[id].price * (1.6 - 0.03 * (L - 1))),
  }));
  const sell = pick(3).map(id => ({
    item: id, qty: 5 + Math.floor(r() * 11),
    price: Math.max(1, Math.round(ITEMS[id].price * (0.7 + 0.02 * (L - 1)))),
  }));
  return { period, buy, sell, next: (period + 1) * STALL_PERIOD };
}
function stallState(farm, now) {
  const period = Math.floor(now / STALL_PERIOD);
  if (!farm.stall || farm.stall.p !== period) farm.stall = { p: period, lv: farm.level, b: {}, s: {} };
  return farm.stall;
}
export function stallLeft(farm, now, kind, i, total) {
  const period = Math.floor(now / STALL_PERIOD);
  const used = farm.stall && farm.stall.p === period ? (farm.stall[kind][i] || 0) : 0;
  return total - used;
}

// ---------- zakázky ----------
// deterministický generátor (stejný výsledek na serveru i v prohlížeči)
function rnd(farm) {
  farm.seed = (farm.seed * 16807) % 2147483647;
  return (farm.seed - 1) / 2147483646;
}

// co hráč na své úrovni (a s budovami odemčenými statkem st) umí získat; semena a sazenice ne
export function orderableItems(level, st = 99) {
  const out = CROP_LIST.filter(c => c.level <= level).map(c => c.id);
  for (const r of Object.values(RECIPES)) if (PRODUCTS[r.id] && r.level <= level && BUILDINGS[r.building].st <= st) out.push(r.id);
  for (const a of ANIMAL_LIST) if (a.level <= level && BUILDINGS[a.home].st <= st) out.push(a.product);
  for (const t of TREE_LIST) if (t.level <= level) out.push(t.fruit);
  return [...new Set(out)];
}

function genOrder(farm, readyAt) {
  const pool = orderableItems(farm.level, statekLevel(farm));
  const kinds = Math.min(pool.length, 1 + Math.floor(rnd(farm) * Math.min(3, 1 + farm.level / 3)));
  const items = [];
  const left = [...pool];
  for (let k = 0; k < kinds; k++) {
    const id = left.splice(Math.floor(rnd(farm) * left.length), 1)[0];
    const it = ITEMS[id];
    const maxQ = it.price <= 5 ? 6 : it.price <= 15 ? 4 : it.price <= 30 ? 3 : 2;
    items.push({ item: id, qty: 1 + Math.floor(rnd(farm) * maxQ) });
  }
  const value = items.reduce((n, x) => n + ITEMS[x.item].price * x.qty, 0);
  return {
    items,
    coins: Math.round(value * (1.3 + rnd(farm) * 0.4) * orderBonus(farm)) + 2,   // o 30–70 % víc než hodnota zboží
    xp: Math.max(1, Math.round(value / 6)),
    readyAt,
  };
}

export const orderReady = (o, now) => now >= o.readyAt;
export const canDeliver = (farm, o) => o.items.every(x => have(farm, x.item) >= x.qty);


export function findPlot(farm, x, y) {
  return farm.plots.find(p => p.x === x && p.y === y) || null;
}

export function findObject(farm, id) {
  return farm.objects.find(o => o.id === id) || null;
}

// objekt, který zabírá políčko x,y
// velikost objektu (velké pole má vlastní)
export function objSize(o) {
  const d = BUILDINGS[o.kind];
  return { w: o.w || d.w, h: o.h || d.h };
}

export function objectAt(farm, x, y) {
  for (const o of farm.objects) {
    const d = objSize(o);
    if (x >= o.x && x < o.x + d.w && y >= o.y && y < o.y + d.h) return o;
  }
  return null;
}

export function countKind(farm, kind) {
  return farm.objects.filter(o => o.kind === kind).length;
}

// je místo volné? (ignoreId = objekt, který se právě přesouvá)
export function fits(farm, x, y, w, h, ignoreId = 0) {
  if (!isInt(x) || !isInt(y) || !isInt(w) || !isInt(h)) return false;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!landOwned(farm, xx, yy) || isRoad(xx, yy)) return false;
  for (const p of farm.plots) if (p.x >= x && p.x < x + w && p.y >= y && p.y < y + h) return false;
  for (const o of farm.objects) {
    if (o.id === ignoreId) continue;
    const d = objSize(o);
    if (o.x < x + w && x < o.x + d.w && o.y < y + h && y < o.y + d.h) return false;
  }
  return true;
}

// stav pole: 'empty' | 'growing' | 'ready'; progress 0..1; left = zbývající sekundy
export function plotState(plot, now) {
  if (!plot || !plot.crop) return { state: 'empty', progress: 0, left: 0 };
  const c = CROPS[plot.crop];
  const total = plot.d || c.time * 1000;
  const elapsed = Math.max(0, now - plot.planted);
  if (elapsed >= total) return { state: 'ready', progress: 1, left: 0 };
  return { state: 'growing', progress: elapsed / total, left: Math.ceil((total - elapsed) / 1000) };
}

// fronta výroby: [{ r, start, end, state: 'waiting'|'working'|'done', progress, left }]
export function queueState(obj, now) {
  return (obj.queue || []).map(q => {
    const time = q.d || RECIPES[q.r].time * 1000;
    const start = q.end - time;
    if (now >= q.end) return { ...q, state: 'done', progress: 1, left: 0 };
    if (now < start) return { ...q, state: 'waiting', progress: 0, left: Math.ceil((q.end - now) / 1000) };
    return { ...q, state: 'working', progress: (now - start) / time, left: Math.ceil((q.end - now) / 1000) };
  });
}

// stav zvířete: 'hungry' | 'eating' | 'ready'
export function animalState(animal, def, now) {
  if (!animal.fed) return { state: 'hungry', progress: 0, left: 0 };
  const total = animal.dur || def.time * 1000;
  const el = now - animal.fed;
  if (el >= total) return { state: 'ready', progress: 1, left: 0 };
  return { state: 'eating', progress: Math.max(0, el / total), left: Math.ceil((total - el) / 1000) };
}

// souhrn pro budovu (pro bubliny nad budovou)
export function objectStatus(obj, now, farm) {
  const d = BUILDINGS[obj.kind];
  if (d.type === 'bigfield') {
    const st = fieldState(obj, now).state;
    return { done: st === 'ready' || st === 'unload' ? 1 : 0, busy: st === 'sowing' || st === 'harvesting' };
  }
  if (d.type === 'hive' && farm) return { done: hiveStock(farm, obj, now).count };
  if (d.type === 'orchard') {
    const st = treeState(obj, now).state;
    return { done: st === 'ready' ? 1 : 0, dead: st === 'dead' };
  }
  if (d.type === 'main' && farm) {
    return { done: farm.orders.filter(o => orderReady(o, now) && canDeliver(farm, o)).length };
  }
  if (d.type === 'factory') {
    const q = queueState(obj, now);
    return { done: q.filter(x => x.state === 'done').length, busy: q.some(x => x.state === 'working') };
  }
  if (d.type === 'pen') {
    const a = ANIMALS[d.animal];
    const st = (obj.animals || []).map(x => animalState(x, a, now).state);
    return { done: st.filter(s => s === 'ready').length, hungry: st.filter(s => s === 'hungry').length, busy: st.includes('eating') };
  }
  return {};
}

function fail(code) { return { ok: false, error: code }; }

export const ERRORS = {
  bad_action: 'Neznámá akce.',
  no_rod: 'Na rybaření potřebuješ udici z Prodejny strojů v městečku.',
  no_bait: 'Nemáš návnadu – vyrob ji v Krmivárně z pšenice a kukuřice.',
  no_fish: 'V rybníku teď žádná ryba nezabírá. Chvíli počkej, ryby přibývají.',
  hooked: 'Na háčku už ryba je.',
  no_hook: 'Ryba utekla.',
  bad_price: 'Cena musí být aspoň 1 mince a nejvýš trojnásobek skutečné ceny.',
  quest_done: 'Tenhle úkol už máš vyzvednutý.',
  town: 'Tohle je městečko – tady stavět nejde.',
  no_plot: 'Tady není pole.',
  not_empty: 'Pole už je osázené.',
  not_ready: 'Ještě to není hotové.',
  locked: 'Tohle odemkneš na vyšší úrovni.',
  no_coins: 'Nemáš dost mincí.',
  silo_full: 'Sklad je plný – něco prodej nebo ho rozšiř.',
  occupied: 'Tohle místo je obsazené.',
  out_of_farm: 'Tady už farma končí.',
  max_plots: 'Víc polí odemkneš vylepšením Statku.',
  not_enough: 'Tolik toho ve skladu nemáš.',
  max_count: 'Tohle už máš postavené.',
  no_object: 'Tahle budova neexistuje.',
  queue_full: 'Výroba je plná – počkej nebo vyber hotové.',
  no_inputs: 'Chybí suroviny.',
  no_feed: 'Nemáš krmivo – vyrob ho v Krmivárně.',
  nothing: 'Teď tu není co dělat.',
  no_home: 'Nejdřív postav pro zvíře ohradu.',
  pen_full: 'Ohrada je plná.',
  fixed: 'Statek stojí pevně uprostřed farmy.',
  no_machine: 'Na tohle potřebuješ stroj z obchodu.',
  max_orchards: 'Víc sadů odemkneš vylepšením Statku.',
  max_fields: 'Další velké pole odemkneš vylepšením Statku.',
  bad_size: 'Velké pole může mít 3×3 až 6×6 políček.',
  owned: 'Tenhle stroj už máš.',
  machine_busy: 'Stroj právě pracuje na jiném poli.',
  claimed: 'Dnešní odměnu už máš. Přijď zítra!',
  statek_low: 'Nejdřív vylepši Statek.',
  garage_full: 'Ve stodole není místo – vylepši ji, nebo nějaký stroj prodej.',
  no_garage: 'Stroje potřebuješ někam zaparkovat – postav Stodolu (Stavět).',
  max_level: 'Budova už má nejvyšší úroveň.',
  stall_qty: 'Tolik už stánek nemá nebo nechce.',
  helper_level: 'Pomocníka si najmeš od úrovně 3.',
  no_helper: 'Pomocník teď nepracuje – najmi ho ve Statku.',
  land_owned: 'Tenhle pozemek už je tvůj.',
  land_far: 'Nejdřív kup sousední pozemek.',
  wrong_machine: 'Na tuhle plodinu potřebuješ jiný stroj.',
  not_empty_tree: 'V sadu už strom roste.',
  tree_ready: 'Nejdřív sklid zralé ovoce.',
  no_order: 'Tahle zakázka teď není.',
  missing: 'Na zakázku ti ještě něco chybí.',
};

// ---------- akce ----------
// Aplikuje akci na farmu (mění objekt). Vrací { ok, error?, gained? }.
export function applyAction(farm, a, now) {
  normalize(farm);
  ensureQuests(farm, now);
  if (farm.helper) runHelper(farm, now);
  if (!a || typeof a.type !== 'string') return fail('bad_action');
  switch (a.type) {
    case 'plant': {
      const p = findPlot(farm, a.x, a.y);
      if (!p) return fail('no_plot');
      if (p.crop) return fail('not_empty');
      const c = getCrop(a.crop);
      if (!c) return fail('bad_action');
      if (farm.level < c.level) return fail('locked');
      const pay = payCrop(farm, c, 1);
      if (!pay) return fail('no_coins');
      addStat(farm, 'plant', 1);
      p.crop = c.id;
      p.planted = now;
      p.d = growMs(c, now);
      return { ok: true, seed: pay.seeds > 0 };
    }
    case 'harvest': {
      const p = findPlot(farm, a.x, a.y);
      if (!p || !p.crop) return fail('no_plot');
      if (plotState(p, now).state !== 'ready') return fail('not_ready');
      const c = CROPS[p.crop];
      if (siloFree(farm) < c.yield) return fail('silo_full');
      const qty = harvestPlot(farm, p);
      const levelUp = addXp(farm, c.xp);
      return { ok: true, bonus: qty > c.yield, gained: { items: [{ item: c.id, qty }], xp: c.xp, levelUp } };
    }
    case 'sowAll': {
      if (!hasMachine(farm, 'tractor')) return fail('no_machine');
      const c = getCrop(a.crop);
      if (!c) return fail('bad_action');
      if (farm.level < c.level) return fail('locked');
      const empty = farm.plots.filter(p => !p.crop);
      if (!empty.length) return fail('nothing');
      let n = 0;
      for (const p of empty) {
        if (!payCrop(farm, c, 1)) break;
        p.crop = c.id; p.planted = now; p.d = growMs(c, now); n++;
      }
      if (!n) return fail('no_coins');
      addStat(farm, 'plant', n);
      return { ok: true, count: n };
    }
    case 'harvestAll': {
      if (!hasMachine(farm, 'combine')) return fail('no_machine');
      const ready = farm.plots.filter(p => plotState(p, now).state === 'ready');
      if (!ready.length) return fail('not_ready');
      const items = []; let xp = 0, n = 0;
      for (const p of ready) {
        const c = CROPS[p.crop];
        if (siloFree(farm) < c.yield) break;
        addItem(farm, c.id, c.yield);
        items.push({ item: c.id, qty: c.yield });
        xp += c.xp; n++;
        p.crop = null; p.planted = 0;
      }
      if (!n) return fail('silo_full');
      const levelUp = addXp(farm, xp);
      return { ok: true, count: n, partial: n < ready.length, gained: { items: mergeItems(items), xp, levelUp } };
    }
    case 'buyPlot': {
      if (!fits(farm, a.x, a.y, 1, 1)) return fail(isInt(a.x) && isInt(a.y) && landOwned(farm, a.x, a.y) ? 'occupied' : 'out_of_farm');
      if (farm.plots.length >= maxPlots(farm)) return fail('max_plots');
      const price = plotPrice(farm);
      if (farm.coins < price) return fail('no_coins');
      farm.coins -= price;
      farm.plots.push({ x: a.x, y: a.y, crop: null, planted: 0 });
      return { ok: true };
    }
    case 'sell': {
      const it = getItem(a.item);
      if (!it || !isInt(a.qty) || a.qty <= 0) return fail('bad_action');
      if (have(farm, it.id) < a.qty) return fail('not_enough');
      takeItem(farm, it.id, a.qty);
      const earned = a.qty * sellPrice(it.id, now);
      farm.coins += earned;
      addStat(farm, 'sold', earned);
      return { ok: true };
    }
    case 'place': {
      const d = getBuilding(a.kind);
      if (!d || d.type === 'main') return fail('bad_action');
      const free = farm.pending.includes(d.id);
      let { w, h } = d;
      if (d.type === 'bigfield') {
        w = a.w; h = a.h;
        if (!isInt(w) || !isInt(h) || w < FIELD_MIN || h < FIELD_MIN || w > FIELD_MAX || h > FIELD_MAX) return fail('bad_size');
      }
      const cost = d.type === 'orchard' ? orchardPrice(farm) : d.type === 'bigfield' ? w * h * FIELD_CELL_PRICE : d.cost;
      if (d.town) return fail('town');
      if (!free) {
        if (d.type === 'storage') return fail('max_count');
        if (d.st > statekLevel(farm)) return fail('statek_low');
        if (d.max && countKind(farm, d.id) >= d.max) return fail('max_count');
        if (d.type === 'orchard' && countKind(farm, 'sad') >= maxOrchards(farm)) return fail('max_orchards');
        if (d.type === 'bigfield' && countKind(farm, 'velkepole') >= maxBigFields(farm)) return fail('max_fields');
      }
      if (!fits(farm, a.x, a.y, w, h)) return fail('occupied');
      if (!free && farm.coins < cost) return fail('no_coins');
      if (free) farm.pending.splice(farm.pending.indexOf(d.id), 1);
      else farm.coins -= cost;
      const o = { id: farm.nextId++, kind: d.id, x: a.x, y: a.y };
      if (d.type === 'factory') o.queue = [];
      if (d.type === 'pen') o.animals = [];
      if (d.type !== 'deco' && d.type !== 'orchard' && d.type !== 'bigfield') o.lvl = 1;
      if (d.type === 'orchard') { o.tree = null; o.readyAt = 0; o.left = 0; o.dead = false; }
      if (d.type === 'pond') { o.sc = pondCap(o); o.st = now; o.hook = null; }
      if (d.type === 'hive') { o.sc = 0; o.st = now; }
      if (d.type === 'bigfield') { o.w = w; o.h = h; o.crop = null; o.job = null; o.readyAt = 0; o.load = null; o.soil = 'raw'; o.straw = false; }
      farm.objects.push(o);
      const levelUp = addXp(farm, d.xp);
      return { ok: true, id: o.id, gained: { items: [], xp: d.xp, levelUp } };
    }
    case 'move': {
      const o = findObject(farm, a.id);
      if (!o) return fail('no_object');
      const d = BUILDINGS[o.kind];
      if (d.type === 'main') return fail('fixed');
      const sz = objSize(o);
      if (!fits(farm, a.x, a.y, sz.w, sz.h, o.id)) return fail('occupied');
      o.x = a.x; o.y = a.y;
      return { ok: true };
    }
    case 'produce': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'factory') return fail('no_object');
      const r = getRecipe(a.recipe);
      if (!r || r.building !== o.kind) return fail('bad_action');
      if (farm.level < r.level) return fail('locked');
      if (o.queue.length >= queueSize(o)) return fail('queue_full');
      if (!hasInputs(farm, r)) return fail('no_inputs');
      for (const [id, n] of Object.entries(r.in)) takeItem(farm, id, n);
      const last = o.queue.length ? o.queue[o.queue.length - 1].end : 0;
      const d = Math.round(r.time * 1000 * speedMult(o));
      o.queue.push({ r: r.id, end: Math.max(now, last) + d, d });
      return { ok: true };
    }
    case 'collect': {
      const o = findObject(farm, a.id);
      if (!o) return fail('no_object');
      const d = BUILDINGS[o.kind];
      const items = [];
      let xp = 0, full = false, anyReady = false;
      if (d.type === 'factory') {
        while (o.queue.length && o.queue[0].end <= now) {
          anyReady = true;
          const n = recipeQty(RECIPES[o.queue[0].r]);
          if (siloFree(farm) < n) { full = true; break; }
          const q = o.queue.shift();
          addItem(farm, q.r, n);
          items.push({ item: q.r, qty: n });
          xp += RECIPES[q.r].xp;
        }
      } else if (d.type === 'pen') {
        const an = ANIMALS[d.animal];
        for (const x of o.animals) {
          if (animalState(x, an, now).state !== 'ready') continue;
          anyReady = true;
          if (siloFree(farm) < 1) { full = true; break; }
          x.fed = 0;
          addItem(farm, an.product, 1);
          items.push({ item: an.product, qty: 1 });
          xp += an.xp;
        }
      } else if (d.type === 'hive') {
        const s = hiveStock(farm, o, now);
        const n = Math.min(s.count, siloFree(farm));
        anyReady = s.count > 0; full = n < s.count;
        if (n > 0) {
          takeStock(o, now, s.cap, hiveIv(farm, o), n);
          addItem(farm, 'plast', n);
          items.push({ item: 'plast', qty: n });
          xp += 2 * n;
        }
      } else return fail('bad_action');
      if (!items.length) return fail(full ? 'silo_full' : anyReady ? 'silo_full' : 'not_ready');
      const levelUp = addXp(farm, xp);
      return { ok: true, gained: { items: mergeItems(items), xp, levelUp }, partial: full };
    }
    case 'feed': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'pen') return fail('no_object');
      const an = ANIMALS[BUILDINGS[o.kind].animal];
      const hungry = o.animals.filter(x => !x.fed);
      if (!hungry.length) return fail('nothing');
      let fed = 0;
      for (const x of hungry) {
        if (have(farm, an.feed) < 1) break;
        takeItem(farm, an.feed, 1);
        x.fed = now;
        x.dur = Math.round(an.time * 1000 * speedMult(o));
        fed++;
      }
      if (!fed) return fail('no_feed');
      addStat(farm, 'feed', fed);
      return { ok: true, fed };
    }
    case 'buyAnimal': {
      const an = own(ANIMALS, a.animal);
      if (!an) return fail('bad_action');
      if (farm.level < an.level) return fail('locked');
      const home = farm.objects.find(o => o.kind === an.home && o.animals.length < penMax(o));
      if (!home) return fail(countKind(farm, an.home) ? 'pen_full' : 'no_home');
      if (farm.coins < an.cost) return fail('no_coins');
      farm.coins -= an.cost;
      home.animals.push({ fed: 0 });
      return { ok: true, id: home.id };
    }
    case 'upgradeSilo': {
      const price = siloUpgradePrice(farm);
      if (farm.coins < price) return fail('no_coins');
      farm.coins -= price;
      farm.siloCap += SILO_STEP;
      return { ok: true };
    }
    case 'plantTree': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'orchard') return fail('no_object');
      if (o.tree) return fail('not_empty_tree');
      const t = own(TREES, a.tree);
      if (!t) return fail('bad_action');
      if (farm.level < t.level) return fail('locked');
      const sap = have(farm, 'z_' + t.id) > 0;
      if (!sap && farm.coins < t.cost) return fail('no_coins');
      if (sap) takeItem(farm, 'z_' + t.id, 1); else farm.coins -= t.cost;
      o.tree = t.id; o.left = t.harvests; o.dead = false; o.readyAt = now + t.first * 1000;
      o.paid = sap ? 'sap' : t.cost;   // čím se platilo – při vykopání před první úrodou se to vrátí
      return { ok: true, sapling: sap };
    }
    case 'harvestTree': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'orchard') return fail('no_object');
      if (treeState(o, now).state !== 'ready') return fail('not_ready');
      const t = TREES[o.tree];
      const qty = t.yield + beeBonus(farm, o);
      if (siloFree(farm) < qty) return fail('silo_full');
      addItem(farm, t.fruit, qty);
      const levelUp = addXp(farm, t.xp);
      o.left--;
      if (o.left > 0) o.readyAt = now + t.regrow * 1000; else o.dead = true;
      return { ok: true, bees: qty > t.yield, gained: { items: [{ item: t.fruit, qty }], xp: t.xp, levelUp }, dead: o.dead };
    }
    case 'clearTree': {   // vykopat strom: suchý kdykoli, živý jen na výslovné přání (force) a ne se zralým ovocem
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'orchard' || !o.tree) return fail('no_object');
      const st = treeState(o, now).state;
      let back = null;
      if (st !== 'dead') {
        if (!a.force) return fail('not_ready');
        if (st === 'ready') return fail('tree_ready');
        back = treeRefund(o);
        if (back && back.item && siloFree(farm) < 1) return fail('silo_full');
        if (back && back.item) addItem(farm, back.item, 1);
        if (back && back.coins) farm.coins += back.coins;
      }
      o.tree = null; o.dead = false; o.readyAt = 0; o.left = 0; delete o.paid;
      return { ok: true, back };
    }
    case 'buyMachine': {
      const m = own(MACHINES, a.model);
      if (!m) return fail('bad_action');
      if (farm.level < m.level) return fail('locked');
      if (farm.machines.some(x => x.model === m.id)) return fail('owned');
      if (isVehicle(m.id) && vehicleCount(farm) >= garageSlots(farm)) return fail(countKind(farm, 'stodola') ? 'garage_full' : 'no_garage');
      const price = machinePrice(farm, m.id);
      if (farm.coins < price) return fail('no_coins');
      farm.coins -= price;
      const id = farm.nextId++;
      farm.machines.push({ id, model: m.id });
      const levelUp = addXp(farm, 5);
      return { ok: true, id, gained: { items: [], xp: 5, levelUp } };
    }
    case 'fieldSow': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'bigfield') return fail('no_object');
      if (fieldState(o, now).state !== 'empty') return fail('not_empty');
      const c = getCrop(a.crop);
      if (!c) return fail('bad_action');
      if (farm.level < c.level) return fail('locked');
      const m = findMachine(farm, a.machine);
      if (!m || MACHINES[m.model].type !== 'tractor') return fail('no_machine');
      if (machineJob(farm, m.id, now)) return fail('machine_busy');
      const cells = o.w * o.h;
      const pay = payCrop(farm, c, cells);
      if (!pay) return fail('no_coins');
      addStat(farm, 'plant', cells);
      const sec = Math.ceil(jobSeconds(cells, m.model) / (hasTool(farm, 'seeder') ? 2 : 1));
      o.mult = o.soil === 'plowed' ? 1.5 : 1;
      o.soil = 'sown'; o.straw = false;
      o.crop = c.id;
      o.job = { type: 'sow', m: m.id, start: now, end: now + sec * 1000 };
      o.readyAt = o.job.end + growMs(c, now);
      o.load = null;
      addStat(farm, 'jobs', 1);
      return { ok: true };
    }
    case 'fieldHarvest': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'bigfield') return fail('no_object');
      if (fieldState(o, now).state !== 'ready') return fail('not_ready');
      const m = findMachine(farm, a.machine);
      if (!m) return fail('no_machine');
      if (MACHINES[m.model].type !== CROPS[o.crop].harvester) return fail('wrong_machine');
      if (machineJob(farm, m.id, now)) return fail('machine_busy');
      o.job = { type: 'harvest', m: m.id, start: now, end: now + jobSeconds(o.w * o.h, m.model) * 1000 };
      o.load = { item: o.crop, qty: fieldYield(o), xp: CROPS[o.crop].xp * o.w * o.h };
      o.straw = CROPS[o.crop].harvester === 'combine';
      o.crop = null; o.readyAt = 0; o.soil = 'stubble';
      addStat(farm, 'jobs', 1);
      return { ok: true };
    }
    case 'fieldPlow':
    case 'fieldBale': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'bigfield') return fail('no_object');
      const st = fieldState(o, now);
      if (st.state !== 'empty') return fail('not_empty');
      const plow = a.type === 'fieldPlow';
      if (!hasTool(farm, plow ? 'plow' : 'baler')) return fail('no_machine');
      if (plow && o.soil === 'plowed') return fail('nothing');
      if (!plow && !o.straw) return fail('nothing');
      const m = findMachine(farm, a.machine);
      if (!m || MACHINES[m.model].type !== 'tractor') return fail('no_machine');
      if (machineJob(farm, m.id, now)) return fail('machine_busy');
      o.job = { type: plow ? 'plow' : 'bale', m: m.id, start: now, end: now + jobSeconds(o.w * o.h, m.model) * 1000 };
      if (plow) { o.soil = 'plowed'; o.straw = false; }
      else { o.straw = false; o.load = { item: 'slama', qty: Math.floor(o.w * o.h / 2), xp: 0 }; }
      addStat(farm, 'jobs', 1);
      return { ok: true };
    }
    case 'fieldUnload': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'bigfield') return fail('no_object');
      const st = fieldState(o, now);
      if (st.state !== 'unload') return fail('not_ready');
      const n = Math.min(st.stock, siloFree(farm));
      if (n <= 0) return fail('silo_full');
      addItem(farm, o.load.item, n);
      const xp = o.load.xp || 0;
      o.load.xp = 0;
      o.load.qty -= n;
      const levelUp = xp ? addXp(farm, xp) : 0;
      const rest = o.load.qty;
      const item = o.load.item;
      if (!rest) o.load = null;
      return { ok: true, rest, gained: { items: [{ item, qty: n }], xp, levelUp } };
    }
    case 'upgrade': {
      const o = a.town !== undefined ? (TOWN_KINDS.includes(a.town) && BUILDINGS[a.town].type !== 'market' ? townObject(farm, a.town) : null) : findObject(farm, a.id);
      if (!o) return fail('no_object');
      const c = upgradeCost(o);
      if (!c) return fail(UP_BASE[BUILDINGS[o.kind].type] ? 'max_level' : 'bad_action');
      if (BUILDINGS[o.kind].type !== 'main' && c.level > statekLevel(farm)) return fail('statek_low');
      if (c.items.some(x => have(farm, x.item) < x.qty)) return fail('no_inputs');
      if (farm.coins < c.coins) return fail('no_coins');
      for (const x of c.items) takeItem(farm, x.item, x.qty);
      farm.coins -= c.coins;
      if (o.town) farm.town[o.kind] = c.level; else o.lvl = c.level;
      if (BUILDINGS[o.kind].type === 'storage') farm.siloCap += 40;
      const levelUp = addXp(farm, 5 * c.level);
      return { ok: true, level: c.level, gained: { items: [], xp: 5 * c.level, levelUp } };
    }
    case 'sellMachine': {
      const m = findMachine(farm, a.id);
      if (!m) return fail('no_machine');
      if (machineJob(farm, m.id, now)) return fail('machine_busy');
      const refund = Math.round(MACHINES[m.model].cost * 0.5);
      farm.machines = farm.machines.filter(x => x.id !== m.id);
      farm.coins += refund;
      return { ok: true, refund };
    }
    case 'stallBuy':
    case 'stallSell': {
      const offers = stallOffers(farm, now);
      const buy = a.type === 'stallBuy';
      const list = buy ? offers.buy : offers.sell;
      const off = isInt(a.i) ? list[a.i] : null;
      if (!off || !isInt(a.qty) || a.qty <= 0) return fail('bad_action');
      const st = stallState(farm, now);
      const key = buy ? 'b' : 's';
      if ((st[key][a.i] || 0) + a.qty > off.qty) return fail('stall_qty');
      const total = off.price * a.qty;
      if (buy) {
        if (farm.coins < total) return fail('no_coins');
        if (siloFree(farm) < a.qty) return fail('silo_full');
        farm.coins -= total;
        farm.silo[off.item] = (farm.silo[off.item] || 0) + a.qty;
      } else {
        if (have(farm, off.item) < a.qty) return fail('not_enough');
        takeItem(farm, off.item, a.qty);
        farm.coins += total;
        addStat(farm, 'sold', total);
      }
      st[key][a.i] = (st[key][a.i] || 0) + a.qty;
      return { ok: true, total };
    }
    case 'hire': {
      const plan = isInt(a.plan) ? HELPER_PLANS[a.plan] : null;
      if (!plan) return fail('bad_action');
      if (farm.level < HELPER_LEVEL) return fail('helper_level');
      if (a.crop !== null && a.crop !== undefined && !getCrop(a.crop)) return fail('bad_action');
      if (farm.coins < plan.cost) return fail('no_coins');
      farm.coins -= plan.cost;
      if (helperActive(farm, now)) farm.helper.until += plan.h * 3600000;
      else farm.helper = { until: now + plan.h * 3600000, last: now, crop: a.crop || null, tractor: !!(farm.helper && farm.helper.tractor), n: 0 };
      if (a.crop) farm.helper.crop = a.crop;
      return { ok: true };
    }
    case 'helperSet': {
      if (!farm.helper) return fail('no_helper');
      if (a.crop !== undefined) {
        if (a.crop !== null && !getCrop(a.crop)) return fail('bad_action');
        farm.helper.crop = a.crop;
      }
      if (a.tractor !== undefined) farm.helper.tractor = !!a.tractor;
      return { ok: true };
    }
    case 'buyLand': {
      const p = getParcel(a.id);
      if (!p) return fail('bad_action');
      if (farm.land.includes(p.id)) return fail('land_owned');
      if (!landReachable(farm, p)) return fail('land_far');
      if (farm.level < landLevel(farm)) return fail('locked');
      const price = landPrice(farm);
      if (farm.coins < price) return fail('no_coins');
      farm.coins -= price;
      farm.land.push(p.id);
      const levelUp = addXp(farm, 20);
      return { ok: true, price, gained: { items: [], xp: 20, levelUp } };
    }
    case 'claimDaily': {
      const today = dayKey(now);
      if (farm.daily.day === today) return fail('claimed');
      const yesterday = dayKey(now - 86400000);
      const streak = farm.daily.day === yesterday ? farm.daily.streak % 7 + 1 : 1;
      const r = DAILY[streak - 1];
      farm.daily = { day: today, streak };
      farm.coins += r.coins;
      const levelUp = r.xp ? addXp(farm, r.xp) : 0;
      return { ok: true, streak, coins: r.coins, gained: { items: [], xp: r.xp || 0, levelUp } };
    }
    case 'fishCast': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'pond') return fail('no_object');
      if (!hasTool(farm, 'rod')) return fail('no_rod');
      if (farm.level < FISH_LIST[0].level) return fail('locked');
      if (o.hook && now - o.hook.t < HOOK_MS) return fail('hooked');
      const s = pondStock(o, now);
      if (s.count < 1) return fail('no_fish');
      if (have(farm, 'navnada') < 1) return fail('no_bait');
      takeItem(farm, 'navnada', 1);
      takeStock(o, now, s.cap, pondIv(o), 1);
      const f = FISH[pickFish(farm, rnd(farm), now)];
      // váha: většinou menší kusy, v dobrém počasí a s lepší udicí častěji velké
      const boost = weatherAt(now).fish * (farm.machines.some(m => m.model === 'udice2') ? 1.3 : 1);
      const k = Math.pow(rnd(farm), 1.8 / boost);
      const kg = Math.round((f.kg[0] + (f.kg[1] - f.kg[0]) * k) * 100) / 100;
      o.hook = { f: f.id, t: now, kg };
      return { ok: true, fish: f.id, kg };
    }
    case 'fishLand': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'pond') return fail('no_object');
      if (!o.hook || now - o.hook.t > HOOK_MS + 30000) { o.hook = null; return fail('no_hook'); }
      const f = FISH[o.hook.f];
      if (a.ok !== true) { o.hook = null; return { ok: true, lost: true, fish: f.id }; }
      const kg = o.hook.kg || f.kg[0];
      const size = fishSize(f, kg);
      if (siloFree(farm) < size.qty) return fail('silo_full');
      o.hook = null;
      addItem(farm, f.id, size.qty);
      if (!farm.fishRec) farm.fishRec = {};
      const record = kg > (farm.fishRec[f.id] || 0);
      if (record) farm.fishRec[f.id] = kg;
      const xp = f.xp * size.qty + (record ? 3 : 0);
      const levelUp = addXp(farm, xp);
      return { ok: true, fish: f.id, kg, size: size.name, record, gained: { items: [{ item: f.id, qty: size.qty }], xp, levelUp } };
    }
    case 'tutorial': {
      if (!isInt(a.n) || a.n < 0 || a.n > TUTORIAL_DONE) return fail('bad_action');
      farm.tut = a.reset ? a.n : Math.max(farm.tut || 0, a.n);
      return { ok: true };
    }
    case 'claimQuest': {
      const qs = farm.quests;
      if (a.i === 'bonus') {
        if (qs.bonus) return fail('quest_done');
        if (!qs.list.every(q => q.done)) return fail('not_ready');
        const b = questBonus(farm);
        qs.bonus = true;
        farm.coins += b.coins;
        const levelUp = addXp(farm, b.xp);
        return { ok: true, coins: b.coins, gained: { items: [], xp: b.xp, levelUp } };
      }
      const q = isInt(a.i) ? qs.list[a.i] : null;
      if (!q) return fail('bad_action');
      if (q.done) return fail('quest_done');
      if (questProgress(farm, qs, q) < q.n) return fail('not_ready');
      q.done = true;
      farm.coins += q.coins;
      const levelUp = addXp(farm, q.xp);
      return { ok: true, coins: q.coins, gained: { items: [], xp: q.xp, levelUp } };
    }
    case 'claimAch': {
      const ach = ACHIEVEMENTS.find(x => x.id === a.id);
      if (!ach) return fail('bad_action');
      const tier = farm.ach[ach.id] || 0;
      if (tier >= ach.tiers.length) return fail('nothing');
      if ((farm.stats[ach.stat] || 0) < ach.tiers[tier]) return fail('not_ready');
      farm.ach[ach.id] = tier + 1;
      farm.coins += ach.coins[tier];
      return { ok: true, coins: ach.coins[tier], tier: tier + 1 };
    }
    case 'deliver': {
      const o = isInt(a.slot) ? farm.orders[a.slot] : null;
      if (!o || !orderReady(o, now)) return fail('no_order');
      if (!canDeliver(farm, o)) return fail('missing');
      for (const x of o.items) takeItem(farm, x.item, x.qty);
      farm.coins += o.coins;
      addStat(farm, 'orders', 1);
      const levelUp = addXp(farm, o.xp);
      const coins = o.coins, xp = o.xp;
      farm.orders[a.slot] = genOrder(farm, now);
      return { ok: true, coins, gained: { items: [], xp, levelUp } };
    }
    case 'discard': {
      const o = isInt(a.slot) ? farm.orders[a.slot] : null;
      if (!o || !orderReady(o, now)) return fail('no_order');
      farm.orders[a.slot] = genOrder(farm, now + ORDER_WAIT * 1000);
      return { ok: true };
    }
    default:
      return fail('bad_action');
  }
}

function mergeItems(list) {
  const m = {};
  for (const { item, qty } of list) m[item] = (m[item] || 0) + qty;
  return Object.entries(m).map(([item, qty]) => ({ item, qty }));
}
