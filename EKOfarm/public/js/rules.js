// EKOfarm – herní pravidla. Sdílí je server (Worker) i prohlížeč.
// Čisté funkce bez DOM a bez přístupu k síti. Čas se vždy předává zvenku (ms).
import { TEAM } from './team-config.js?v=34';

export const RULES_VERSION = 20;
// v34: nová sezóna – farmy uložené ve starší verzi než RESET_V server při načtení nahradí novou farmou (účet zůstává)
export const RESET_V = 20;
export const isOldSeason = raw => !raw || (raw.v || 0) < RESET_V;
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
  { kind: 'nastenka', x: 28, y: 31, w: 1, h: 1 },   // v29: nástěnka na kraji náměstí
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
  return TOWN_BUILDINGS.find(b => x >= b.x && x < b.x + (b.w || 3) && y >= b.y && y < b.y + (b.h || 3)) || null;
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
// v34: jedno krmení (1 krmivo na zvíře) vydrží ANIMAL_CYCLE = 3 hodiny; za tu dobu zvíře průběžně dá `per` výrobků
// (slepice 3 vejce, kráva 2 mléka, prase 2 masa, ovce 2 vlny – po třetinách / polovinách cyklu). Vylepšená ohrada má
// cyklus kratší (speedMult, −5 % za úroveň). `time` = původní doba z v1–v33, už jen pro výpočet ceny výrobku (ceny se nemění).
export const ANIMAL_CYCLE = 3 * 3600;
export const ANIMALS = {
  slepice: { id: 'slepice', name: 'Slepice', acc: 'slepici', home: 'kurnik',   level: 3, cost: 20,  feed: 'krmivo_slepice', product: 'vejce', per: 3, time: 600,  xp: 2, max: 3, icon: 'hen' },
  krava:   { id: 'krava',   name: 'Kráva',   acc: 'krávu',   home: 'kravin',   level: 5, cost: 60,  feed: 'krmivo_kravy',   product: 'mleko', per: 2, time: 1800, xp: 4, max: 3, icon: 'cow' },
  prase:   { id: 'prase',   name: 'Prase',   acc: 'prase',   home: 'prasecak', level: 7, cost: 90,  feed: 'krmivo_prasata', product: 'maso',  per: 2, time: 2400, xp: 5, max: 3, icon: 'pig' },
  ovce:    { id: 'ovce',    name: 'Ovce',    acc: 'ovci',    home: 'ovcin',    level: 9, cost: 120, feed: 'krmivo_ovce',    product: 'vlna',  per: 2, time: 3000, xp: 6, max: 3, icon: 'sheep' },
};
export const animalCycleMs = o => Math.round(ANIMAL_CYCLE * 1000 * speedMult(o));
// nakrmit jedno zvíře: začne nový tříhodinový cyklus
function startCycle(x, o, t) { x.fed = t; x.dur = animalCycleMs(o); x.got = 0; }
// sebrat u zvířete u kusů; po posledním výrobku cyklu má zase hlad
function takeAnimal(x, an, u) { x.got = (x.got || 0) + u; if (x.got >= an.per) { x.fed = 0; x.got = 0; delete x.dur; } }
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
  nastenka:     B('nastenka', 'Nástěnka', 'board', 0, 0, 1, 1, 0, 1, 'sign', { town: true, info: 'Inzeráty: tady hledáš nové pracovníky.' }),
  // v29: co se odemyká, určuje úroveň Statku (a zásluhy pro jeho vylepšení – TEAM.statek)
  // statek 1
  semenarna:    B('semenarna', 'Semenárna', 'factory', 1, 30, 2, 2, 3, 1, 's_wheat'),
  pekarna:      B('pekarna', 'Pekárna', 'factory', 1, 60, 2, 2, 5, 1, 'chleb'),
  sad:          B('sad', 'Sad', 'orchard', 1, 0, 1, 1, 1, 0, 'tree', { info: 'Políčko pro ovocný strom nebo keř.' }),
  chatrc:       B('chatrc', 'Chatrč', 'house', 1, 200, 2, 2, 3, 0, 'house', { beds: 2, next: 'chata', info: 'Bydlí v ní 2 pracovníci.' }),
  ker:          B('ker', 'Keř', 'deco', 1, 10, 1, 1, 1, 0, 'bush'),
  kvetiny:      B('kvetiny', 'Záhon květin', 'deco', 1, 15, 1, 1, 1, 0, 'flowers'),
  // statek 2
  krmivarna:    B('krmivarna', 'Krmivárna', 'factory', 2, 40, 2, 2, 4, 1, 'krmivo_slepice'),
  kurnik:       B('kurnik', 'Kurník', 'pen', 2, 50, 2, 2, 5, 1, 'hen', { animal: 'slepice' }),
  lavicka:      B('lavicka', 'Lavička', 'deco', 2, 30, 1, 1, 2, 0, 'bench'),
  // statek 3
  mlyn:         B('mlyn', 'Mlýn', 'factory', 3, 120, 2, 2, 6, 1, 'mouka'),
  skolka:       B('skolka', 'Školka stromků', 'factory', 3, 120, 2, 2, 5, 1, 'z_jablon'),
  rybnik:       B('rybnik', 'Rybník', 'pond', 3, 200, 3, 3, 8, 2, 'pond', { info: 'Rybaření: potřebuješ udici a návnadu.' }),
  chata:        B('chata', 'Chata', 'house', 3, 500, 2, 2, 5, 0, 'house', { beds: 3, next: 'dum', info: 'Bydlí v ní 3 pracovníci.' }),
  jablon:       B('jablon', 'Kvetoucí strom', 'deco', 3, 40, 1, 1, 2, 0, 'blossom'),
  // statek 4
  stodola:      B('stodola', 'Stodola na stroje', 'garage', 4, 300, 3, 2, 10, 1, 'garage'),
  velkepole:    B('velkepole', 'Velké pole', 'bigfield', 4, 0, 4, 4, 5, 0, 'field', { info: 'Pole, na kterém pracují stroje. Velikost si zvolíš.' }),
  dzusarna:     B('dzusarna', 'Džusárna', 'factory', 4, 200, 2, 2, 8, 1, 'dzus_jablko'),
  kravin:       B('kravin', 'Kravín', 'pen', 4, 150, 3, 3, 8, 1, 'cow', { animal: 'krava' }),
  fontana:      B('fontana', 'Fontána', 'deco', 4, 150, 1, 1, 5, 0, 'fountain'),
  // statek 5
  mlekarna:     B('mlekarna', 'Mlékárna', 'factory', 5, 200, 2, 2, 10, 1, 'syr'),
  vcelin:       B('vcelin', 'Včelín', 'hive', 5, 250, 2, 2, 8, 2, 'hive', { info: 'Včely dělají plástve medu a sadům v okolí přidají úrodu.' }),
  dum:          B('dum', 'Dům', 'house', 5, 1000, 2, 2, 8, 0, 'house', { beds: 5, info: 'Bydlí v něm 5 pracovníků.' }),
  // statek 6
  konzervarna:  B('konzervarna', 'Konzervárna', 'factory', 6, 180, 2, 2, 8, 1, 'okurky'),
  medarna:      B('medarna', 'Medárna', 'factory', 6, 280, 2, 2, 9, 1, 'med'),
  rybarna:      B('rybarna', 'Rybárna', 'factory', 6, 300, 2, 2, 9, 1, 'rybi_polevka'),
  // statek 7
  olejna:       B('olejna', 'Olejna', 'factory', 7, 250, 2, 2, 8, 1, 'olej'),
  marmeladarna: B('marmeladarna', 'Marmeládárna', 'factory', 7, 260, 2, 2, 9, 1, 'dzem_jahoda'),
  prasecak:     B('prasecak', 'Prasečák', 'pen', 7, 260, 3, 3, 9, 1, 'pig', { animal: 'prase' }),
  // statek 8
  cukrovar:     B('cukrovar', 'Cukrovar', 'factory', 8, 400, 2, 2, 10, 1, 'cukr'),
  uzenarstvi:   B('uzenarstvi', 'Uzenářství', 'factory', 8, 420, 2, 2, 10, 1, 'klobasa'),
  // statek 9
  ovcin:        B('ovcin', 'Ovčín', 'pen', 9, 450, 3, 3, 10, 1, 'sheep', { animal: 'ovce' }),
  // statek 10
  textilka:     B('textilka', 'Textilka', 'factory', 10, 600, 2, 2, 12, 1, 'klubko'),
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
    if (spaceFor(farm, l.item) < l.qty) return fail(isSeedItem(l.item) ? 'seeds_full' : 'silo_full');
    const s = storeOf(farm, l.item);
    s[l.item] = (s[l.item] || 0) + l.qty;
  }
  farm.coins -= pay;
  ledger(farm, 'market', -pay, Date.now());
  return { ok: true };
}
// prodávajícímu přijdou peníze za prodané nabídky
export function marketPayout(farm, coins, t = Date.now()) {
  farm.coins += coins;
  addStat(farm, 'sold', coins);
  ledger(farm, 'market', coins, t);
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
let weatherP = -1, weatherW = null;   // naposledy spočítané období (ptá se na to každé zasazení)
export function weatherAt(now) {
  const p = Math.floor(now / WEATHER_PERIOD);
  if (p === weatherP) return weatherW;
  let x = (hashStr('pocasi:' + p) % 1000) / 1000 * 100, out = WEATHER.jasno;
  for (const w of Object.values(WEATHER)) { x -= w.w; if (x < 0) { out = w; break; } }
  weatherP = p; weatherW = out;
  return out;
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
  if (!Array.isArray(farm.vill)) farm.vill = [];
  if (!farm.seeds || typeof farm.seeds !== 'object') farm.seeds = {};
  for (const k of Object.keys(farm.silo || {})) if (isSeedItem(k)) { farm.seeds[k] = (farm.seeds[k] || 0) + farm.silo[k]; delete farm.silo[k]; }   // přestěhovat ze Skladu
  for (const p of farm.plots || []) if (!p.id) p.id = farm.nextId++;                                                                          // pole mají id (pracovní oblasti)
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
  if (!Array.isArray(farm.tg)) farm.tg = [];   // v34: hotové kroky postupného průvodce
  if (!farm.seed) farm.seed = ((farm.created || 1) % 2147483646) + 1;
  if (!Array.isArray(farm.orders)) farm.orders = [];
  while (farm.orders.length < ORDER_SLOTS) farm.orders.push(genOrder(farm, 0));
  // v29: Farmářský tým začíná od nuly – dosavadní vesničané odejdou (co měli v rukou, se vrátí do skladu),
  // pracovníci se hledají na nástěnce a bydlí v domcích. Pověst se spočítá z už doručených zakázek.
  if ((farm.v || 0) < 17) { for (const v of farm.vill) if (v.job) dropJob(farm, v); farm.vill = []; }
  if (!(farm.rep >= 0)) farm.rep = TEAM.rep.order * (farm.stats.orders || 0);
  if (!farm.board || !Array.isArray(farm.board.ads)) farm.board = { ads: [], k: 0, next: 0 };
  if (!farm.keep || typeof farm.keep !== 'object') farm.keep = {};
  if (!farm.areas || typeof farm.areas !== 'object') farm.areas = {};
  // v30: plán práce patří pracovišti – co měl pracovník v tabulce, převezme budova nebo oblast, kde pracuje.
  // Dělník: „vyrábět do zásoby“ → cílové zásoby výrobny; skladník: „kolik nechat“ → rezerva skladu.
  if ((farm.v || 0) < 18) {
    const areas = workAreas(farm);
    for (const v of farm.vill) {
      const plan = v.plan || {}, lim = v.lim || {};
      if (v.area) {
        const g = areaOf(areas, v), s = g && areaSet(farm, g);
        if (s && !Object.keys(s.plan).length) Object.assign(s.plan, plan);
      } else if (v.at) {
        const o = findObject(farm, v.at), type = o && villJobType(o.kind);
        if ((type === 'factory' || type === 'trader') && !Object.keys(o.plan || {}).length) o.plan = { ...plan };
        if (type === 'factory') o.target = Object.keys(plan).filter(k => lim[k] > 0).map(k => [k, lim[k]]);
        if (type === 'trader') for (const k in lim) if (lim[k] > 0) farm.keep[k] = Math.max(farm.keep[k] || 0, lim[k]);
      }
      delete v.plan; delete v.lim; delete v.cw; delete v.pk;
    }
  }
  // v31: zlomky dávky výrobny se sčítají u budovy (o.uc), ne u pracovníka
  if ((farm.v || 0) < 19) for (const v of farm.vill) delete v.uc;
  // nastavení oblastí, které už neexistují (pole i sady prodané)
  const A = Object.keys(farm.areas);
  if (A.length) {
    const ids = new Set([...farm.plots.map(p => 'pole' + p.id), ...farm.objects.filter(o => o.kind === 'sad').map(o => 'sad' + o.id)]);
    for (const k of A) if (!ids.has(k)) delete farm.areas[k];
  }
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
  if (before >= 1 && farm.xp >= LEVEL_XP[before]) { while (farm.level < MAX_LEVEL && farm.xp >= LEVEL_XP[farm.level + 1]) farm.level++; }
  else farm.level = levelForXp(farm.xp);
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
// semena a sazenice se neskladují ve Skladu, ale v zásobě Statku (farm.seeds): 3 kusy na každé pole a sad
const SEED_ITEMS = new Set([...Object.keys(SEEDS), ...Object.keys(SAPLINGS)]);
export const isSeedItem = id => SEED_ITEMS.has(id);
const storeOf = (farm, id) => (isSeedItem(id) ? farm.seeds : farm.silo);
export const SEEDS_PER = 3;
export function seedCap(farm) {
  let n = farm.plots.length;
  for (const o of farm.objects) if (o.kind === 'sad') n++;
  return SEEDS_PER * n;
}
export function seedUsed(farm) {
  let n = 0;
  for (const k in farm.seeds) n += farm.seeds[k];
  return n;
}
export const seedFree = farm => Math.max(0, seedCap(farm) - seedUsed(farm));
export const spaceFor = (farm, id) => (isSeedItem(id) ? seedFree(farm) : siloFree(farm));
function addItem(farm, id, n) {
  const s = storeOf(farm, id);
  s[id] = (s[id] || 0) + n;
  addStat(farm, statOf(id), n);
  if (villHook) { villHook.add.push(id); if (villHook.away) villHook.away.got[id] = (villHook.away.got[id] || 0) + n; }
}
function takeItem(farm, id, n) {
  const s = storeOf(farm, id);
  s[id] -= n;
  if (!s[id]) delete s[id];
  if (villHook) { villHook.take.push(id); if (s === farm.seeds) villHook.seedRoom = true; else villHook.room = true; }
}
// zařadí výrobek do fronty výrobny; k = násobič času – šikovnější vesničan vyrábí rychleji
// n = kolik kusů v dávce (pracovník podle výkonu naloží víc najednou; doba je stejná) – dávka od týmu má t: 1
function queueRecipe(o, r, now, k = 1, n = 0, pause = 0) {
  const last = o.queue.length ? o.queue[o.queue.length - 1].end : 0;
  const d = Math.round(r.time * 1000 * speedMult(o) * k) + pause;
  const q = { r: r.id, end: Math.max(now, last) + d, d };
  if (n) { q.n = n; q.t = 1; }
  o.queue.push(q);
}
// zasadí strom do sadu; paid = čím se platilo ('sap' = sazenicí, jinak mince) – při vykopání před první úrodou se to vrátí
function setTree(o, t, now, paid) {
  o.tree = t.id; o.left = t.harvests; o.dead = false; o.readyAt = now + t.first * 1000; o.paid = paid;
}
export const have = (farm, id) => storeOf(farm, id)[id] || 0;
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
export const maxBigFields = farm => { const st = statekLevel(farm); return st < 4 ? 0 : 1 + Math.floor((st - 4) / 2); };
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
    if (d.type === 'pen' && (o.animals || []).some(x => { if (!x.fed) return false; const an = ANIMALS[d.animal], st = (x.dur || ANIMAL_CYCLE * 1000) / an.per; for (let k = (x.got || 0) + 1; k <= an.per; k++) if (inR(x.fed + k * st)) return true; return false; })) ev.push({ k: 'pen', text: `${d.name}: zvířata mají hotovo` });
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
// vylepšení přidá místo pro dalšího pracovníka?
const capUp = (o, L) => (bldCap({ ...o, lvl: L }) > bldCap(o) ? `, místo pro ${bldCap({ ...o, lvl: L })}. pracovníka` : '');
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
    case 'factory': return `výroba o ${5 * (L - 1)} % rychlejší${(L - 1) % 3 === 0 ? ', +1 místo ve frontě' : ''}${capUp(o, L)}`;
    case 'pen': return `zvířata o ${5 * (L - 1)} % rychlejší${(L - 1) % 3 === 0 ? ', +1 místo v ohradě' : ''}${capUp(o, L)}`;
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

// ---------- Farmářský tým: pracovníci pracují průběžně podle plánu ----------
// Každý pracovník má vlastní čas (v.t). Vybere si úkol, ten trvá podle jeho výkonu a na konci se provede
// (sklizeň, zasazení, naložení výroby…). Když není co dělat, čeká – a ví na co (v.w), aby to hráč viděl.
// Plán patří pracovišti (od v30): pole – čím osázet oblast (farm.areas), výrobna – podíly výrobního času a cílové
// zásoby (o.plan, o.target), sklad – kolik procent zásoby prodat na jednom trhu (o.plan). Rezervy skladu: farm.keep.
// Pracovníci se nekupují: hledají se na nástěnce v Městečku a bydlí v domcích (v.prof, v.trait, v.xp po oborech).
export const VILL_MAX = TEAM.maxTeam;
export const MAX_VLVL = TEAM.maxLvl;
// obor práce podle pracoviště: pole a sady → pole, ohrada a včelín → chov, výrobna → vyroba, sklad → sklad
export const OBOR = { pole: 'pole', sad: 'pole', pen: 'chov', hive: 'chov', factory: 'vyroba', trader: 'sklad' };
// úroveň pracovníka v oboru (1–12) podle zkušeností
export function villLevel(v, obor) {
  const xp = (v.xp && v.xp[obor]) || 0;
  let L = 1;
  while (L < TEAM.maxLvl && xp >= TEAM.xpLvl[L + 1]) L++;
  return L;
}
export const villMainLevel = v => villLevel(v, v.prof || 'vyroba');
// výkon v oboru: násobek práce za stejný čas (úroveň 1 = 1×, úroveň 12 = 12×), mimo profesi 90 %
export function villPower(v, obor) {
  const off = v.prof !== obor && !(TEAM.traits[v.trait] || {}).any;
  return TEAM.mult[villLevel(v, obor)] * (off ? TEAM.offProf.power : 1);
}
const traitOf = v => TEAM.traits[v.trait] || {};
export const WORK = TEAM.work;
// délka úkonu (ms) pro pracovníka v daném oboru
export const workMs = (v, k, obor) => Math.round(WORK[k] * 1000 / (villPower(v, obor || 'pole') * (traitOf(v).work || 1)));
// kolik vyrobí / nasbírá najednou (výkon × pečlivost)
export const villOut = (v, obor) => villPower(v, obor) * (traitOf(v).out || 1);
// náročnost: jakou úroveň pracovníka chce věc, která se odemyká na úrovni hráče lvl
export const needLvl = lvl => (TEAM.need.find(([max]) => lvl <= max) || [0, 1])[1];
// připsat zkušenosti (poloviční mimo profesi, učenlivý +25 %); vrací novou úroveň při povýšení
function villGain(v, obor, xp, t) {
  if (!(xp > 0)) return 0;
  const k = (v.prof === obor || traitOf(v).any ? 1 : TEAM.offProf.xp) * (traitOf(v).xp || 1);
  if (!v.xp) v.xp = {};
  const before = villLevel(v, obor);
  v.xp[obor] = Math.round(((v.xp[obor] || 0) + xp * k) * 100) / 100;
  const after = villLevel(v, obor);
  if (after > before) { (v.hist || (v.hist = [])).push([t, obor, after]); if (v.hist.length > 12) v.hist.shift(); if (crewCache) crewCache.clear(); return after; }
  return 0;
}
// chovatel: kolik produktů dá zvíře z jednoho krmení (úroveň 1 → 1, úroveň 12 → 3; mimo profesi 90 %, pečlivý +5 %)
export const penOut = v => TEAM.penYield[villLevel(v, 'chov')] * (v.prof === 'chov' || traitOf(v).any ? 1 : TEAM.offProf.power) * (traitOf(v).out || 1);
// Síla obsluhy budovy (v31): kdo v ní pracuje a na věc úrovně lvl má praxi, seřazeno podle výkonu, váhy TEAM.crew
// (100 %, 60 %, 40 %, 30 %). Výrobna: S = kolik kusů jde do jedné dávky. Ohrada: S = výnos z jednoho krmení.
// parts = [[pracovník, příspěvek]] – podle nich se dělí zkušenosti.
let crewCache = null;   // během dopočítávání: síla obsluhy podle budovy a náročnosti (smaže se, když někdo povýší)
export function crewPower(farm, o, lvl, kind = 'factory') {
  const need = needLvl(lvl), key = o.id * 32 + need * 2 + (kind === 'pen' ? 1 : 0);
  if (crewCache) { const c = crewCache.get(key); if (c) return c; }
  const W = TEAM.crew[kind], obor = kind === 'pen' ? 'chov' : 'vyroba', list = [];
  for (const v of farm.vill) if (v.at === o.id && villLevel(v, obor) >= need) list.push([v, kind === 'pen' ? penOut(v) : villOut(v, obor)]);
  list.sort((a, b) => b[1] - a[1] || a[0].id - b[0].id);
  let S = 0;
  const parts = [];
  for (let i = 0; i < list.length && i < W.length; i++) { const p = list[i][1] * W[i]; S += p; parts.push([list[i][0], p]); }
  const res = { S, parts };
  if (crewCache) crewCache.set(key, res);
  return res;
}
// Odhad výroby za hodinu (v31): výrobek podle procent v plánu a síly obsluhy; 0 = bez pracovníka / mimo plán
export function factoryRate(farm, o, id) {
  const plan = o.plan || {}, sum = planTotal(plan), r = RECIPES[id];
  if (!r || !(plan[id] > 0) || !sum) return 0;
  const S = crewPower(farm, o, r.level).S;
  return S ? plan[id] / (o.auto ? sum : 100) * 3600 / (r.time * speedMult(o)) * S * recipeQty(r) : 0;
}
// Přehled ohrady (v31): zvířata, krmivo, spotřeba a produkce za hodinu při nepřetržité péči, chovatelé, upozornění.
// warn: 'empty' bez zvířat, 'no_feed' krmivo došlo, 'keep' krmivo je jen v rezervě, 'low_feed' vydrží méně než 2 h,
// 'skill' chovatel na zvíře nemá praxi, 'no_worker' bez chovatele (krmí se ručně)
export function penStats(farm, o, now = Date.now()) {
  const an = ANIMALS[BUILDINGS[o.kind].animal], list = o.animals || [], n = list.length;
  const ws = farm.vill.filter(v => v.at === o.id), cap = bldCap(o, 'pen');
  const cycleS = ANIMAL_CYCLE * speedMult(o), feedH = n * 3600 / cycleS;
  const cp = ws.length ? crewPower(farm, o, an.level, 'pen') : null;
  const Y = cp && cp.S > 0 ? cp.S : 1, prodH = feedH * an.per * Y;
  const feedHave = have(farm, an.feed), keep = keepOf(farm, an.feed), avail = availFor(farm, an.feed);
  // v34: stejné krmivo jí víc ohrad (víc kurníků) → doba vydržení podle spotřeby všech, ne každé zvlášť
  let feedAll = 0, shared = 0;
  for (const p of farm.objects) {
    const dp = BUILDINGS[p.kind];
    if (dp.type === 'pen' && dp.animal === an.id) { feedAll += (p.animals || []).length * 3600 / (ANIMAL_CYCLE * speedMult(p)); shared++; }
  }
  const hours = feedAll > 0 ? avail / feedAll : Infinity;   // jednoduchý odhad: jen ze zásoby, bez doplňování
  let hungry = 0, ready = 0, inCycle = 0;
  for (const a of list) { const s = animalState(a, an, now); if (s.state === 'hungry') hungry++; else if (s.made < an.per) inCycle++; ready += s.avail; }
  // krmivárna: kolik tohohle krmiva udělá za hodinu podle plánu, a jestli ho má v cílových zásobách
  const kr = farm.objects.find(x => RECIPES[an.feed] && RECIPES[an.feed].building === x.kind);
  const makeH = kr ? factoryRate(farm, kr, an.feed) : 0, target = kr && (kr.target || []).find(x => x[0] === an.feed);
  const hoursNet = !(feedAll > makeH) ? Infinity : avail / (feedAll - makeH);   // s doplňováním z Krmivárny (podle plánu)
  const room = siloFree(farm);
  const warn = [];
  if (!n) warn.push('empty');
  else {
    if (avail < 1) warn.push(feedHave > 0 ? 'keep' : 'no_feed');
    else if (hours < 2 && makeH < feedAll) warn.push('low_feed');
    if (ready > 0 && room < 1) warn.push('full');
    if (!ws.length) warn.push('no_worker');
    else if (!(cp.S > 0)) warn.push('skill');
  }
  // provozní stav: run = zvířata pracují, feed = všechna mají hlad a krmivo není, full = výrobky se nevejdou do skladu
  const status = !n ? 'empty' : inCycle ? 'run' : ready && room < 1 ? 'full' : hungry && avail < 1 ? 'feed' : hungry ? 'hungry' : 'run';
  return { an, n, max: penMax(o), ws, cap, free: Math.max(0, cap - ws.length), cycleS, feedH, feedAll, shared, Y, prodH, feedHave, keep, avail, hours, hoursNet,
    hungry, ready, room, status, kr: kr || null, makeH, target: target ? target[1] : 0, warn };
}
// zkušenosti za společnou práci: podle podílu na síle obsluhy (nikdo z obsluhy → celé tomu, kdo práci dodělal)
function crewGain(parts, actor, obor, xp, t) {
  let S = 0;
  for (const x of parts) S += x[1];
  if (!(S > 0)) { villGain(actor, obor, xp, t); return; }
  for (const [v, p] of parts) villGain(v, obor, xp * p / S, t);
}
// hráč dostane z práce týmu jen část XP (TEAM.playerXp); zlomky se sčítají
function teamXp(farm, xp) {
  farm.xpc = (farm.xpc || 0) + xp * TEAM.playerXp;
  const k = Math.floor(farm.xpc);
  farm.xpc -= k;
  return k ? addXp(farm, k) : 0;
}
export const TRADE_IV = TEAM.trade.iv;                // trh je každou půlhodinu
export const PLAN_ROWS = 12;                          // nejvíc řádků v tabulce farmáře a dělníka
// rozpočet jednoho dopočítání (server má na požadavek málo času): od v31 se počítá každá událost – dokončený úkon
// i probuzení, při kterém pracovník nic nenašel (to dřív rozpočet nehlídal a čekání mohlo požadavek protáhnout)
export const VILL_BUDGET = 1000;
const VILL_CATCHUP = 24 * 3600 * 1000;                // po dlouhé nepřítomnosti se dopočítá nejvýš den práce
export const nextTrade = t => (Math.floor(t / TRADE_IV) + 1) * TRADE_IV;
const VILL_NAMES = ['Anička', 'Pepa', 'Mařenka', 'Franta', 'Božena', 'Vašek', 'Jarka', 'Honza', 'Liduška', 'Tonda', 'Věrka', 'Kuba', 'Zdenka', 'Lojza', 'Hanka', 'Míla'];
export const villName = v => VILL_NAMES[(v.id * 7 + 3) % VILL_NAMES.length];
// jakou práci jde v budově dělat
export function villJobType(kind) {
  const t = BUILDINGS[kind] && BUILDINGS[kind].type;
  return t === 'factory' ? 'factory' : t === 'pen' ? 'pen' : t === 'hive' ? 'hive' : t === 'storage' ? 'trader' : null;
}
// zásoby za mince v městečku (Stánek): semena, sazenice a krmivo; null = nekupuje se / ještě zamčené
export function supplyPrice(farm, id) {
  if (SEEDS[id]) { const c = CROPS[SEEDS[id].seed]; return farm.level >= c.level ? c.cost : null; }
  if (SAPLINGS[id]) { const t = TREES[SAPLINGS[id].sapling]; return farm.level >= t.level ? t.cost : null; }
  if (typeof id === 'string' && id.startsWith('krmivo_') && ITEMS[id]) { const r = RECIPES[id]; return !r || farm.level >= r.level ? ITEMS[id].price : null; }
  return null;
}
export const villAt = (farm, objId) => (farm.vill || []).find(v => v.at === objId) || null;
export const findVill = (farm, id) => (farm.vill || []).find(v => v.id === id) || null;

// ---------- farmáři ze Statku a pracovní oblasti ----------
// Oblast = aspoň 4 pole (nebo sady) vedle sebe (sousedé přes hranu). Přikoupené pole oblast zvětší, další skupina
// o kus dál je nová oblast. Číslo oblasti podle nejstaršího pole/sadu, farmář je přiřazený k jednomu jejímu kusu.
export const AREA_MIN = 4;
export function workAreas(farm) {
  const groups = (cells, kind) => {
    const key = (x, y) => x * 4096 + y, map = new Map(cells.map(c => [key(c.x, c.y), c]));
    const seen = new Set(), out = [];
    for (const c of cells) {
      if (seen.has(c)) continue;
      const comp = [], st = [c];
      seen.add(c);
      while (st.length) {
        const q = st.pop(); comp.push(q);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = map.get(key(q.x + dx, q.y + dy));
          if (n && !seen.has(n)) { seen.add(n); st.push(n); }
        }
      }
      if (comp.length >= AREA_MIN) out.push({ kind, ids: comp.map(q => q.id).sort((a, b) => a - b), cells: comp });
    }
    out.sort((a, b) => a.ids[0] - b.ids[0]);
    out.forEach((g, i) => { g.n = i + 1; g.key = kind + g.ids[0]; });
    return out;
  };
  return [...groups(farm.plots, 'pole'), ...groups(farm.objects.filter(o => o.kind === 'sad'), 'sad')];
}
export const areaOf = (areas, v) => (v.area ? areas.find(g => g.kind === v.area.kind && g.ids.includes(v.area.id)) || null : null);
export const isFarmer = v => !!v.area;   // pracuje v oblasti polí nebo sadů

// kde a jak vesničan pracuje: { v, type: 'pole'|'sad'|'factory'|'pen'|'hive'|'trader', g (oblast) | o (budova), key }; null = nemá práci
function villCtx(farm, v, areas) {
  if (isFarmer(v)) { const g = areaOf(areas, v); return g ? { v, type: g.kind, obor: 'pole', L: villLevel(v, 'pole'), g, set: areaSet(farm, g), o: null, key: g.key, next: 0, wait: null, mates: NONE } : null; }
  const o = v.at && findObject(farm, v.at);
  const type = o && villJobType(o.kind);
  return type ? { v, type, obor: OBOR[type], L: villLevel(v, OBOR[type]), g: null, set: null, o, key: o.id, next: 0, wait: null, mates: NONE } : null;
}
// co se píše do tabulky plánu: 'crop' (pole), 'tree' (sad), 'recipe' (výrobna), 'item' (obchodník); null = tabulku nemá
export const planKind = (farm, w) => planKindW(wpGet(farm, w));
export const planTotal = plan => Object.values(plan || {}).reduce((a, b) => a + b, 0);

// ---------- pracoviště: budova nebo oblast, kapacita, nastavení (v30) ----------
// Plán práce patří pracovišti, ne pracovníkovi: budova má o.plan (procenta), o.target (cílové zásoby v pořadí),
// o.auto (přerozdělit nevyužitou kapacitu), o.used (kolik času výroby dostal který výrobek), o.log (výroba po hodinách).
// Oblast polí / sadů má nastavení ve farm.areas[klíč] = { plan, replant }. Pracoviště se označuje textem:
// 'b12' = budova s id 12, 'pole101' / 'sad205' = oblast, ve které je pole / sad s tím id.
export const areaCap = g => Math.max(1, Math.floor(g.cells.length / TEAM.areaPer));
// kolik lidí se vejde do budovy podle její úrovně (TEAM.cap); oblast podle velikosti
export const bldCap = (o, type = villJobType(o.kind)) => { const c = TEAM.cap[type]; return c ? c[Math.min(c.length, objLevel(o)) - 1] : 1; };
export const wpCap = wp => (wp.g ? areaCap(wp.g) : bldCap(wp.o, wp.type));
// od které úrovně budovy přibude další místo (null = už ne)
export function bldCapNext(o, type = villJobType(o.kind)) {
  const c = TEAM.cap[type] || [1], now = bldCap(o, type);
  for (let L = objLevel(o) + 1; L <= c.length; L++) if (c[L - 1] > now) return L;
  return null;
}
// nastavení oblasti; když se oblasti spojí nebo změní nejmenší pole, převezme nastavení oblast, ve které leží
export function areaSet(farm, g) {
  const A = farm.areas || (farm.areas = {});
  if (!A[g.key]) {
    const n = k => Number(k.slice(g.kind.length));
    const old = Object.keys(A).filter(k => k.startsWith(g.kind) && g.ids.includes(n(k))).sort((a, b) => n(a) - n(b))[0];
    A[g.key] = old ? A[old] : { plan: {}, replant: true };
    if (old) delete A[old];
  }
  return A[g.key];
}
export function wpGet(farm, w, areas) {
  if (typeof w !== 'string' || !w) return null;
  if (w[0] === 'b') {
    const o = findObject(farm, Number(w.slice(1))), type = o && villJobType(o.kind);
    return type ? { w, type, o, g: null, set: null } : null;
  }
  const kind = w.startsWith('pole') ? 'pole' : w.startsWith('sad') ? 'sad' : null;
  if (!kind) return null;
  const id = Number(w.slice(kind.length));
  const g = (areas || workAreas(farm)).find(x => x.kind === kind && x.ids.includes(id));
  return g ? { w, type: kind, o: null, g, set: areaSet(farm, g) } : null;
}
export const wpOfVill = v => (v.area ? v.area.kind + v.area.id : v.at ? 'b' + v.at : null);
// kdo na pracovišti pracuje
export function wpWorkers(farm, wp, areas) {
  if (wp.o) return farm.vill.filter(x => x.at === wp.o.id);
  const all = areas || workAreas(farm);
  return farm.vill.filter(x => { const g = x.area && areaOf(all, x); return g && g.key === wp.g.key; });
}
// plán pracoviště (procenta) a co se do něj píše
export const wpPlan = wp => (wp.g ? wp.set.plan : (wp.o.plan || (wp.o.plan = {})));
export const planKindW = wp => (!wp ? null : wp.type === 'pole' ? 'crop' : wp.type === 'sad' ? 'tree' : wp.type === 'factory' ? 'recipe' : wp.type === 'trader' ? 'item' : null);
// rezervy skladu: pod tolik kusů automatika nesáhne (výroba, prodej na trhu)
export const keepOf = (farm, id) => (farm.keep && farm.keep[id]) || 0;
export const availFor = (farm, id) => Math.max(0, have(farm, id) - keepOf(farm, id));
const hasInputsKeep = (farm, r) => Object.entries(r.in).every(([id, n]) => availFor(farm, id) >= n);
// kolik výrobku je na skladě + ve frontě + v rukou pracovníků (pro cílové zásoby)
export function stockOf(farm, o, id) {
  const r = RECIPES[id];
  let n = have(farm, id);
  for (const q of o.queue || []) if (q.r === id) n += recipeQty(r) * (q.n || 1);
  for (const v of farm.vill) if (v.at === o.id && v.job && v.job.k === 'load' && v.job.x === id) n += recipeQty(r) * (v.job.n || 1);
  return n;
}
// záznam výroby po hodinách (posledních TEAM.logH hodin)
function logMade(o, id, n, now) {
  const h = Math.floor(now / 3600000);
  const log = o.log || (o.log = []);
  let last = log[log.length - 1];
  if (!last || last[0] !== h) { log.push(last = [h, {}]); while (log.length > TEAM.logH) log.shift(); }
  last[1][id] = (last[1][id] || 0) + n;
}
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
// smí to být v plánu pracoviště? vrací kód chyby nebo null
function planKeyErr(farm, wp, kind, key) {
  if (kind === 'crop') { const c = getCrop(key); return !c ? 'bad_action' : farm.level < c.level ? 'locked' : null; }
  if (kind === 'tree') { const t = own(TREES, key); return !t ? 'bad_action' : farm.level < t.level ? 'locked' : null; }
  if (kind === 'recipe') { const r = getRecipe(key); return !r || r.building !== wp.o.kind ? 'bad_action' : farm.level < r.level ? 'locked' : null; }
  return !getItem(key) || isSeedItem(key) ? 'bad_action' : null;
}
// uvolnit místo na pracovišti: když je plné, vymění se pracovník swap (jde tam, odkud přišel v), jinak chyba
function makeRoom(farm, v, wp, areas, swap, now) {
  const ws = wpWorkers(farm, wp, areas).filter(x => x !== v);
  if (ws.length < wpCap(wp)) return null;
  const o = swap ? ws.find(x => x.id === swap) : null;
  if (!o) return fail(swap ? 'bad_action' : 'workplace_full');
  dropJob(farm, o);
  o.at = v.area ? 0 : v.at || 0;
  o.area = v.area ? { ...v.area } : null;
  o.t = now; o.w = o.at || o.area ? '' : 'free';
  delete o.uc;
  return null;
}
// Kolegové na stejném pracovišti (e.mates, v31): na čem už dělají, aby dva nešli na stejné políčko / zvíře / frontu.
const NONE = [];
// políčka a stromy v rukou kolegů: id → co tam sází (plodina / strom), nebo null (sklízí, trhá, kope)
const MATE_CELLS = new Map();   // jedna mapa pro všechny (výpočet je synchronní) – méně práce pro úklid paměti
function mateCells(e) {
  const m = MATE_CELLS;
  m.clear();
  for (const x of e.mates) {
    const j = x.v.job;
    if (!j) continue;
    const sow = j.k === 'plant' || j.k === 'sapling';
    if (!j.ids) { m.set(j.id, sow ? j.x : null); continue; }
    for (let i = 0; i < j.ids.length; i++) m.set(j.ids[i], sow ? j.xs[i] : null);
  }
  return m.size ? m : null;
}
// kolik kusů vzít do jednoho úkonu: nejvýš TEAM.batch.max a TEAM.batch.ms práce, a spravedlivě s kolegy
function batchN(e, k, avail) {
  const ms = workMs(e.v, k, e.obor);
  return Math.max(1, Math.min(TEAM.batch.max, Math.floor(TEAM.batch.ms / ms) || 1, Math.ceil(avail / (1 + e.mates.length))));
}

// co zasadit na prázdné místo: plodina (strom) s největším schodkem proti plánu, na kterou jsou ve Statku semena.
// Vrací id, nebo null a do PICK důvod: 'plan' (v plánu nic není), 'done' (plán je naplněný, zbytek leží ladem), 'seeds' (+ PICK.needs)
const PICK = { w: '', needs: null, took: null };
function planPick(farm, plan, cnt, total, defs, pre, L, res = null) {
  let best = null, bestD = 0, any = false, needs = null, skill = false;
  for (const id in plan) {
    const pct = plan[id], d = defs[id];
    if (!(pct > 0) || !d || farm.level < d.level) continue;
    if (needLvl(d.level) > L) { skill = true; continue; }   // na tohle pracovník ještě nemá praxi
    any = true;
    const miss = pct * total / 100 - (cnt[id] || 0);
    if (miss <= 1e-9) continue;
    if (!((farm.seeds[pre + id] || 0) - ((res && res[pre + id]) || 0) > 0)) { (needs || (needs = [])).push(pre + id); continue; }
    if (miss > bestD) { best = id; bestD = miss; }
  }
  PICK.w = needs ? 'seeds' : any ? 'done' : skill ? 'skill' : 'plan';
  PICK.needs = needs;
  return best;
}
// úkol vesničana: k = co dělá, id = kde (pole / sad / budova), x = čeho se týká (plodina, strom, výrobek, pořadí zvířete), s–e = od kdy do kdy
const job = (k, id, x = 0) => ({ k, id, x, s: 0, e: 0 });
// sloučený úkon na víc políček / stromů (ids, u sázení xs = co kam) nebo zvířat (xs = pořadí zvířat); jeden kus = obyčejný job
const jobCells = (k, ids, xs = null) => (ids.length === 1 ? job(k, ids[0], xs ? xs[0] : 0) : { k, id: ids[0], x: xs ? xs[0] : 0, ids, xs, s: 0, e: 0 });
const jobAnimals = (k, id, xs) => (xs.length === 1 ? job(k, id, xs[0]) : { k, id, x: xs[0], xs, s: 0, e: 0 });
const jobCount = j => (j.ids || j.xs || NONE).length || 1;
// čekání: w = důvod (pro hráče), wake = kdy se to změní samo, needs = které suroviny pomůžou, took = úbytek čeho pomůže,
// room / seedRoom = čeká na místo ve Skladu / v zásobě semen
const idle = (w, wake = Infinity, needs = null, room = false, took = null, seedRoom = false) => ({ k: '', w, wake, needs, room, took, seedRoom });
// Výběr úkolu v čase t: vrací job(…) nebo idle(…).
const VILL_TASK = {
  // pole: nejdřív osázet prázdné (ať roste), pak sklidit to, co je zralé nejdéle. Víc políček najednou (batchN),
  // na políčka v rukou kolegů nesahá.
  pole(farm, e, t) {
    const cells = e.g.cells, cnt = {}, busy = e.mates.length ? mateCells(e) : null, empty = [], ripe = [];
    let wake = Infinity;
    for (const p of cells) {
      if (busy && busy.has(p.id)) { const c = busy.get(p.id) || p.crop; if (c) cnt[c] = (cnt[c] || 0) + 1; continue; }   // na tom už dělá kolega
      if (!p.crop) { empty.push(p); continue; }
      cnt[p.crop] = (cnt[p.crop] || 0) + 1;
      const at = p.planted + (p.d || CROPS[p.crop].time * 1000);
      if (at > t) { if (at < wake) wake = at; } else ripe.push([at, p]);
    }
    let w = 'rest', needs = null, full = false;
    if (empty.length && e.set.replant !== false) {
      empty.sort((a, b) => a.id - b.id);
      const n = batchN(e, 'plant', empty.length), ids = [], xs = [], res = {};
      for (const p of empty) {
        if (ids.length >= n) break;
        const c = planPick(farm, e.set.plan, cnt, cells.length, CROPS, 's_', e.L, res);
        if (!c) break;
        ids.push(p.id); xs.push(c);
        cnt[c] = (cnt[c] || 0) + 1; res['s_' + c] = (res['s_' + c] || 0) + 1;
      }
      if (ids.length) return jobCells('plant', ids, xs);
      if (PICK.w !== 'done') { w = PICK.w; needs = PICK.needs; }
    }
    if (ripe.length) {
      ripe.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
      const n = batchN(e, 'harvest', ripe.length), ids = [];
      let free = siloFree(farm);
      for (const [, p] of ripe) {
        const y = CROPS[p.crop].yield;
        if (ids.length >= n || free < y) break;
        free -= y; ids.push(p.id);
      }
      if (ids.length) return jobCells('harvest', ids);
      w = 'full'; full = true;
    }
    return idle(w, wake, needs, full);
  },
  // sad: zasadit sazenice na prázdná místa, otrhat zralé, vykopat suché
  sad(farm, e, t) {
    const cells = e.g.cells, cnt = {}, busy = e.mates.length ? mateCells(e) : null, empty = [], ripe = [];
    let dead = null, wake = Infinity;
    for (const o of cells) {
      if (busy && busy.has(o.id)) { const c = busy.get(o.id) || (o.tree && !o.dead ? o.tree : null); if (c) cnt[c] = (cnt[c] || 0) + 1; continue; }
      if (!o.tree) empty.push(o);
      else if (o.dead) { if (!dead || o.id < dead.id) dead = o; }
      else {
        cnt[o.tree] = (cnt[o.tree] || 0) + 1;
        if (o.readyAt > t) { if (o.readyAt < wake) wake = o.readyAt; }
        else ripe.push(o);
      }
    }
    let w = 'rest', needs = null, full = false;
    if (empty.length && e.set.replant !== false) {
      empty.sort((a, b) => a.id - b.id);
      const n = batchN(e, 'sapling', empty.length), ids = [], xs = [], res = {};
      for (const o of empty) {
        if (ids.length >= n) break;
        const c = planPick(farm, e.set.plan, cnt, cells.length, TREES, 'z_', e.L, res);
        if (!c) break;
        ids.push(o.id); xs.push(c);
        cnt[c] = (cnt[c] || 0) + 1; res['z_' + c] = (res['z_' + c] || 0) + 1;
      }
      if (ids.length) return jobCells('sapling', ids, xs);
      if (PICK.w !== 'done') { w = PICK.w; needs = PICK.needs; }
    }
    if (ripe.length) {
      ripe.sort((a, b) => a.readyAt - b.readyAt || a.id - b.id);
      const n = batchN(e, 'pick', ripe.length), ids = [];
      let free = siloFree(farm);
      for (const o of ripe) {
        const y = TREES[o.tree].yield + beeBonus(farm, o);
        if (ids.length >= n || free < y) break;
        free -= y; ids.push(o.id);
      }
      if (ids.length) return jobCells('pick', ids);
      w = 'full'; full = true;
    }
    if (dead) return job('dig', dead.id);
    return idle(w, wake, needs, full);
  },
  // výrobna: odnést hotové do skladu, pak naložit další výrobek podle podílů v plánu
  factory(farm, e, t) {
    const o = e.o, q = o.queue;
    let w = 'rest', wake = Infinity, room = false, seedRoom = false, hauling = false, loading = 0;
    for (const x of e.mates) {   // co dělají kolegové: hotové odnáší jen jeden, nakládá se jen do volných míst ve frontě
      const j = x.v.job;
      if (j) { if (j.k === 'haul') hauling = true; else if (j.k === 'load') loading++; }
    }
    if (q.length) {
      if (q[0].end > t) { if (q[0].end < wake) wake = q[0].end; }
      else if (!hauling) {
        const r = RECIPES[q[0].r];
        if (spaceFor(farm, r.id) >= recipeQty(r)) return job('haul', o.id);
        w = 'full';
        if (isSeedItem(r.id)) seedRoom = true; else room = true;
      }
    }
    if (q.length + loading >= queueSize(o)) return idle(w, wake, null, room, null, seedRoom);
    const r = factoryPick(farm, o, e.L);
    if (r) {
      // dávka = síla obsluhy (všichni v budově, kdo na výrobek mají praxi; zlomky se sčítají u budovy),
      // nejvýš na kolik jsou suroviny nad rezervou a do cíle
      const R = RECIPES[r], u = crewPower(farm, o, R.level).S + (o.uc || 0);
      let n = Math.max(1, Math.floor(u));
      for (const id in R.in) n = Math.min(n, Math.floor(availFor(farm, id) / R.in[id]));
      if (PICK.tg) n = Math.min(n, Math.ceil((PICK.tg - stockOf(farm, o, r)) / recipeQty(R)));
      n = Math.max(1, n);
      o.uc = Math.max(0, u - Math.floor(u));
      const j = job('load', o.id, r); j.n = n;
      if (PICK.tg) j.tg = 1;
      return j;
    }
    return idle(w === 'full' ? w : PICK.w, wake, PICK.needs, room, PICK.took, seedRoom);
  },
  // ohrada: nakrmit hladové (ať pracují), pak posbírat hotové – zvíře po zvířeti
  pen(farm, e, t) {
    const o = e.o, an = ANIMALS[BUILDINGS[o.kind].animal], list = o.animals || [];
    if (list.length && needLvl(an.level) > e.L) return idle('skill');
    let busy = null, wake = Infinity;
    for (const x of e.mates) {   // zvířata, která má v práci kolega
      const j = x.v.job;
      if (!j || (j.k !== 'feed' && j.k !== 'gather')) continue;
      for (const i of j.xs || [j.x]) (busy || (busy = new Set())).add(i);
    }
    const hungry = [], ready = [];
    for (let i = 0; i < list.length; i++) {
      if (busy && busy.has(i)) continue;
      const x = list[i];
      if (!x.fed) { hungry.push(i); continue; }
      const step = (x.dur || ANIMAL_CYCLE * 1000) / an.per, at = x.fed + ((x.got || 0) + 1) * step;   // další výrobek
      if (at > t) { if (at < wake) wake = at; } else ready.push([at, i]);
    }
    // krmí z krmiva nad rezervou skladu; víc zvířat najednou
    const feed = Math.min(hungry.length, availFor(farm, an.feed));
    if (feed > 0) return jobAnimals('feed', o.id, hungry.slice(0, Math.min(feed, batchN(e, 'feed', hungry.length))));
    const room = siloFree(farm);
    if (ready.length && room >= 1) {
      ready.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      return jobAnimals('gather', o.id, ready.slice(0, Math.min(room, batchN(e, 'gather', ready.length))).map(x => x[1]));
    }
    if (ready.length) return idle('full', wake, hungry.length ? [an.feed] : null, true);
    if (hungry.length) return idle('feed', wake, [an.feed]);
    return idle(list.length ? 'rest' : 'empty', wake);
  },
  // včelín: vybrat plástve, jakmile nějaké jsou
  hive(farm, e, t) {
    const s = hiveStock(farm, e.o, t);
    if (s.count > 0) return siloFree(farm) >= 1 ? job('comb', e.o.id) : idle('full', Infinity, null, true);
    return idle('rest', t + s.next);
  },
};
// Který výrobek teď naložit. Nejdřív cílové zásoby v pořadí (o.target: pod cílem → přednost, na cíli → nevyrábí se vůbec),
// potom procenta (o.plan) jako podíl výrobního času: dostane ho výrobek, kterému proti plánu nejvíc času chybí (o.used).
// Vrací id, nebo null a do PICK důvod: 'inputs' (+ needs), 'limit' (+ took: cíl je splněný, čeká na úbytek), 'skill', 'plan'.
// PICK.tg = cíl, když se vybíralo podle cílové zásoby (dávka se omezí, aby cíl nepřelezla).
function factoryPick(farm, o, L) {
  const plan = o.plan || {}, tgt = o.target || [], done = new Set();
  let took = null, needs = null, skill = false;
  const why = () => { PICK.w = needs ? 'inputs' : took ? 'limit' : skill ? 'skill' : 'plan'; PICK.needs = needs; PICK.took = took; };
  PICK.tg = 0;
  for (const [id, n] of tgt) {
    const r = RECIPES[id];
    if (!r || r.building !== o.kind || farm.level < r.level) continue;
    if (needLvl(r.level) > L) { skill = true; continue; }
    if (stockOf(farm, o, id) >= n) { done.add(id); (took || (took = [])).push(id); continue; }
    if (!hasInputsKeep(farm, r)) { needs = needs || []; for (const i in r.in) needs.push(i); continue; }
    PICK.tg = n;
    return id;
  }
  const ok = [];
  let sum = 0, used = 0;
  for (const id in plan) {
    const r = RECIPES[id], pct = plan[id];
    if (!(pct > 0) || !r || r.building !== o.kind || farm.level < r.level || done.has(id)) continue;
    if (needLvl(r.level) > L) { skill = true; continue; }
    if (!hasInputsKeep(farm, r)) { needs = needs || []; for (const i in r.in) needs.push(i); continue; }
    ok.push(id); sum += pct; used += (o.used && o.used[id]) || 0;
  }
  why();
  if (!ok.length) return null;
  let best = null, bestD = -Infinity;
  for (const id of ok) {
    const d = plan[id] / sum * used - ((o.used && o.used[id]) || 0);
    if (d > bestD + 1e-9) { best = id; bestD = d; }
  }
  return best;
}
// vrátit zpět do zásob bez počítání do statistik (nedokončený úkol)
function putBack(farm, id, n) { const s = storeOf(farm, id); s[id] = (s[id] || 0) + n; if (villHook) villHook.add.push(id); }
// Začátek úkolu: vesničan si vezme, co k němu potřebuje (semínko, sazenici, suroviny, krmivo) – nikdo jiný už to nevezme.
function takeFor(farm, e, j) {
  switch (j.k) {
    case 'plant': for (const c of j.xs || [j.x]) takeItem(farm, 's_' + c, 1); break;
    case 'sapling': for (const c of j.xs || [j.x]) takeItem(farm, 'z_' + c, 1); break;
    case 'load': { const r = RECIPES[j.x]; for (const id in r.in) takeItem(farm, id, r.in[id] * (j.n || 1)); break; }
    case 'feed': takeItem(farm, ANIMALS[BUILDINGS[e.o.kind].animal].feed, jobCount(j)); break;
  }
}
// Úkol se nedokončil (hráč byl rychlejší, vesničan přeřazen…): co si vzal, vrátí.
// j.given = materiál už vyřídil finishJob (u sloučeného úkonu kus po kusu) – podruhé se nevrací.
function giveBack(farm, v) {
  const j = v.job;
  if (!j || j.given) return;
  if (j.k === 'plant') for (const c of j.xs || [j.x]) putBack(farm, 's_' + c, 1);
  else if (j.k === 'sapling') for (const c of j.xs || [j.x]) putBack(farm, 'z_' + c, 1);
  else if (j.k === 'load' && RECIPES[j.x]) { const r = RECIPES[j.x]; for (const id in r.in) putBack(farm, id, r.in[id] * (j.n || 1)); }
  else if (j.k === 'feed') { const o = findObject(farm, j.id), d = o && BUILDINGS[o.kind]; if (d && d.animal) putBack(farm, ANIMALS[d.animal].feed, jobCount(j)); }
}
// vesničan přestane dělat, co dělal (přeřazení, zrušená oblast)
function dropJob(farm, v) { giveBack(farm, v); v.job = null; }
// Jedno políčko / strom sloučeného úkonu: vrací získané věci ([] = povedlo se bez zisku), nebo null (nepovedlo se).
function cellFinish(farm, e, k, c, x, t) {
  switch (k) {
    case 'harvest': {
      const cr = c.crop && CROPS[c.crop];
      if (!cr || t - c.planted < (c.d || cr.time * 1000) || siloFree(farm) < cr.yield) return null;
      const qty = harvestPlot(farm, c);
      teamXp(farm, cr.xp);
      villGain(e.v, 'pole', cr.price * qty * TEAM.xpValue, t);
      return [{ item: cr.id, qty }];
    }
    case 'plant': {
      const cr = getCrop(x);
      if (c.crop || !cr) return null;
      addStat(farm, 'plant', 1);
      c.crop = cr.id; c.planted = t; c.d = growMs(cr, t);
      return NONE;
    }
    case 'pick': {
      const r = doAction(farm, { type: 'harvestTree', id: c.id, team: true }, t);
      if (!r.ok) return null;
      for (const y of r.gained.items) villGain(e.v, 'pole', ITEMS[y.item].price * y.qty * TEAM.xpValue, t);
      return r.gained.items;
    }
    case 'dig': return c.dead && doAction(farm, { type: 'clearTree', id: c.id }, t).ok ? NONE : null;
    case 'sapling': {
      const tr = own(TREES, x);
      if (c.tree || !tr) return null;
      setTree(c, tr, t, 'sap');
      return NONE;
    }
  }
  return null;
}
// sečíst získané věci do jednoho seznamu
function addGot(got, items) {
  for (const it of items) { const g = got.find(y => y.item === it.item); if (g) g.qty += it.qty; else got.push({ item: it.item, qty: it.qty }); }
}
// Dokončení úkolu v čase t. Všechno se znovu ověří – mezitím mohl zasáhnout hráč. Sloučený úkon se dodělá kus po kusu:
// co nejde, vrátí svůj materiál hned (j.given). Vrací { ok, n = kolik kusů, gained }, nebo null (nepovedlo se nic).
const DONE = { ok: true };
function finishJob(farm, e, j, t, live) {
  if (e.g) {
    const ids = j.ids || [j.id], xs = j.xs || [j.x], got = [];
    let n = 0;
    for (let i = 0; i < ids.length; i++) {
      let c = null;
      for (const y of e.g.cells) if (y.id === ids[i]) { c = y; break; }
      const r = c ? cellFinish(farm, e, j.k, c, xs[i], t) : null;
      if (r) { n++; if (r.length) addGot(got, r); }
      else if (j.k === 'plant') putBack(farm, 's_' + xs[i], 1);
      else if (j.k === 'sapling') putBack(farm, 'z_' + xs[i], 1);
    }
    j.given = true;
    return n ? { ok: true, n, gained: live && got.length ? { items: got, xp: 0 } : null } : null;
  }
  const o = e.o;
  if (j.id !== o.id) return null;
  switch (j.k) {
    case 'haul': {
      const r = doAction(farm, { type: 'collect', id: o.id, team: true }, t);
      // zkušenosti za výrobky dostane obsluha budovy podle podílu na síle obsluhy
      if (r.ok) for (const x of r.gained.items) crewGain(crewPower(farm, o, (RECIPES[x.item] || {}).level || 1).parts, e.v, e.obor, ITEMS[x.item].price * x.qty * TEAM.xpValue, t);
      return r;
    }
    case 'comb': {
      const r = doAction(farm, { type: 'collect', id: o.id, team: true }, t);
      if (r.ok) for (const x of r.gained.items) villGain(e.v, e.obor, ITEMS[x.item].price * x.qty * TEAM.xpValue, t);
      return r;
    }
    case 'load': {
      const r = getRecipe(j.x);
      if (!r || r.building !== o.kind || o.queue.length >= queueSize(o)) return null;
      const d = Math.round(r.time * 1000 * speedMult(o));
      // procenta pod 100 % bez „přerozdělit“: budova po dávce stojí v poměru nevyužité kapacity
      const sum = planTotal(o.plan), pause = !j.tg && !o.auto && sum > 0 && sum < 100 ? Math.round(d * (100 - sum) / sum) : 0;
      queueRecipe(o, r, t, 1, j.n || 1, pause);
      if (!j.tg) {
        const u = o.used || (o.used = {});
        u[r.id] = (u[r.id] || 0) + d;
        let tot = 0;
        for (const k in u) tot += u[k];
        if (tot > TEAM.usedWindowH * 3600000) for (const k in u) u[k] = Math.round(u[k] / 2);
      }
      return DONE;
    }
    case 'feed': {   // zvíře po zvířeti; kde to nejde (hráč nakrmil dřív), krmivo se vrátí
      const an = ANIMALS[BUILDINGS[o.kind].animal];
      let n = 0;
      for (const i of j.xs || [j.x]) {
        const x = (o.animals || [])[i];
        if (!x || x.fed) { putBack(farm, an.feed, 1); continue; }
        startCycle(x, o, t);
        addStat(farm, 'feed', 1);
        n++;
      }
      j.given = true;
      return n ? { ok: true, n } : null;
    }
    case 'gather': {
      // výnos z jednoho výrobku zvířete = síla obsluhy ohrady (úroveň 1 → 1, úroveň 12 → 3, druhý chovatel přidá čtvrtinu
      // svého); zlomky se sčítají u ohrady. v34: u zvířete se seberou všechny hotové výrobky cyklu (nejvýš kolik se vejde).
      const an = ANIMALS[BUILDINGS[o.kind].animal], cp = crewPower(farm, o, an.level, 'pen'), Y = cp.S > 0 ? cp.S : penOut(e.v);
      let n = 0, qty = 0;
      for (const i of j.xs || [j.x]) {
        const x = (o.animals || [])[i];
        if (!x || !x.fed) continue;
        const u = Math.min(animalState(x, an, t).avail, siloFree(farm));
        if (u < 1) continue;
        const y = u * Y + (o.yc || 0);
        const q = Math.max(u, Math.min(Math.floor(y), siloFree(farm)));
        o.yc = Math.max(0, y - Math.floor(y));
        takeAnimal(x, an, u);
        addItem(farm, an.product, q);
        n++; qty += q;
      }
      if (!n) return null;
      teamXp(farm, an.xp * qty);
      crewGain(cp.parts, e.v, 'chov', ITEMS[an.product].price * qty * TEAM.xpValue, t);
      return { ok: true, n, gained: live ? { items: [{ item: an.product, qty }], xp: 0 } : null };
    }
  }
  return null;
}

// ---------- obchodník a trh ----------
// Co obchodník prodá na trhu v čase t: z každého zboží v tabulce zvolené procento toho, co je nad rezervou.
// Dohromady nejvýš TEAM.trade.cap kusů – když je toho víc, zkrátí se všechno stejným poměrem. Vyšší úroveň = lepší cena.
export function tradeRound(farm, v, t) {
  const L = villLevel(v, 'sklad');
  const cap = Math.round(TEAM.trade.cap[L] * (v.prof === 'sklad' || traitOf(v).any ? 1 : TEAM.offProf.power) * (traitOf(v).out || 1));
  const k = 1 + (TEAM.trade.bonus[L] || 0) / 100;
  const o = v.at && findObject(farm, v.at), plan = (o && o.plan) || {};
  const rows = [], rowsMax = TEAM.trade.rows[L] || 0;
  let want = 0;
  for (const [item, pct] of Object.entries(plan)) {
    if (!ITEMS[item] || isSeedItem(item) || !(pct > 0)) continue;
    if (rows.length >= rowsMax) break;   // víc druhů zboží pracovník zatím nezvládne
    const free = have(farm, item) - keepOf(farm, item);
    const n = free > 0 ? Math.min(free, Math.ceil(free * pct / 100)) : 0;
    rows.push({ item, pct, want: n, n, f: 0, price: 0, coins: 0 });
    want += n;
  }
  if (want > cap) {
    let left = cap;
    for (const r of rows) { const x = r.want * cap / want; r.n = Math.floor(x); r.f = x - r.n; left -= r.n; }
    for (const r of [...rows].sort((a, b) => b.f - a.f)) { if (left <= 0) break; if (r.n < r.want) { r.n++; left--; } }
  }
  let coins = 0, n = 0;
  for (const r of rows) { r.price = sellPrice(r.item, t); r.coins = Math.round(r.n * r.price * k); coins += r.coins; n += r.n; }
  return { rows, n, coins, cap, want };
}
function tradeNow(farm, v, t) {
  const tr = tradeRound(farm, v, t);
  if (!tr.n) return null;
  for (const r of tr.rows) if (r.n) takeItem(farm, r.item, r.n);
  farm.coins += tr.coins;
  addStat(farm, 'sold', tr.coins);
  ledger(farm, 'trade', tr.coins, t);
  const aw = villHook && villHook.away;
  if (aw) { aw.coins += tr.coins; for (const r of tr.rows) if (r.n) aw.sold[r.item] = (aw.sold[r.item] || 0) + r.n; }
  v.earned = (v.earned || 0) + tr.coins;
  v.sold = (v.sold || 0) + tr.n;
  v.last = { t, n: tr.n, c: tr.coins, it: tr.rows.filter(r => r.n).map(r => [r.item, r.n, r.coins]) };
  villGain(v, 'sklad', tr.coins * TEAM.xpTrade, t);
  return { ok: true, coins: tr.coins };
}

// Dopočítá práci všech vesničanů do času now – událost po události v pořadí času (co jeden sklidí, může druhý hned zpracovat).
// lim = { left } je společný rozpočet úkonů (server ho má jeden na celý požadavek). Vrací { did: poslední úkony, n, behind }.
// behind = rozpočet došel dřív, než se došlo do „teď“ – zbytek se dopočítá příště (klient pak posílá akci tick).
let villHook = null;   // během dopočítávání: co přibylo a ubylo ve skladu, kde se uvolnilo místo (probouzí čekající)
const ROOM = ' room', SEED_ROOM = ' seeds';   // klíče řetězu buzení pro místo ve Skladu a v zásobě semen
const wakeAt = (x, t) => { x.next = t; x.v.t = t; x.wait = null; };
const chainOn = (chain, id) => { const s = chain.get(id); if (s) s.clear(); else chain.set(id, new Set()); };
const hits = (a, b) => { for (const x of a) if (b.includes(x)) return true; return false; };
export function runVillagers(farm, now, lim) {
  const out = { did: [], n: 0, behind: false };
  const vs = farm.vill;
  if (!vs || !vs.length) return out;
  if (!lim) lim = { left: VILL_BUDGET };
  const areas = vs.some(isFarmer) ? workAreas(farm) : [];
  const from = now - VILL_CATCHUP, list = [];
  for (const v of vs) {
    const e = villCtx(farm, v, areas);
    if (!e) { if (v.job) dropJob(farm, v); v.w = 'free'; if (!(v.t >= now)) v.t = now; continue; }
    if (!(v.t >= from)) { v.t = from; if (v.job) dropJob(farm, v); }
    if (e.type === 'trader') {
      const on = planTotal(e.o.plan) > 0;
      v.w = on ? '' : 'plan';
      if (!on && !(v.t >= now)) v.t = now;
      e.next = on ? nextTrade(v.t) : Infinity;
    } else e.next = v.job ? v.job.e : v.t;
    e.wait = null;
    list.push(e);
  }
  if (list.length > 1) {   // kolegové na stejném pracovišti (víc lidí v oblasti nebo budově)
    const by = new Map();
    for (const e of list) { const a = by.get(e.key); if (a) a.push(e); else by.set(e.key, [e]); }
    for (const e of list) { const a = by.get(e.key); if (a.length > 1) e.mates = a.filter(x => x !== e); }
  }
  let S = now, steps = 0;
  const hook = villHook = { add: [], take: [], room: false, seedRoom: false, away: awayStart(farm, now) }, chain = new Map();
  crewCache = new Map();
  try {
    for (;;) {
      let e = null;
      for (const x of list) if (e === null || x.next < e.next) e = x;
      if (e === null || e.next > now) break;
      if (lim.left <= 0) { out.behind = true; S = e.next; break; }
      lim.left--; steps++;
      const t = e.next, v = e.v, live = now - t < 4000, had = !!v.job;
      let r = null, k = 'trade', jid = 0;
      if (e.type === 'trader') { r = tradeNow(farm, v, t); v.t = t; e.next = t + TRADE_IV; }
      else {
        const j = v.job;
        if (j) {
          k = j.k; jid = j.id;
          r = finishJob(farm, e, j, t, live);
          if (!r || !r.ok) giveBack(farm, v);
          v.job = null;
        }
        v.t = t;
        const task = VILL_TASK[e.type](farm, e, t);
        if (task.k) { task.s = t; task.e = t + workMs(v, task.k, e.obor) * jobCount(task); takeFor(farm, e, task); v.job = task; v.w = ''; e.next = task.e; e.wait = null; if (v.nd) delete v.nd; }
        else {
          v.w = task.w; e.next = task.wake > t ? task.wake : Infinity; e.wait = task.needs || task.took || task.room || task.seedRoom ? task : null;
          if (task.needs && task.needs.length) v.nd = task.needs.slice(0, 3); else if (v.nd) delete v.nd;   // v34: co chybí (upozornění)
        }
      }
      // Kolegové na stejném pracovišti se rozhodují i podle toho, co má v rukou tenhle pracovník (políčka, zvířata,
      // fronta). Když úkon dodělal, mohla se pro ně uvolnit práce – čekající kolegové se hned znovu rozhodnou, takže
      // výsledek nezávisí na tom, jak se čas rozkrájí na požadavky. (Začátek úkonu práci jen ubírá, ten budit netřeba.)
      if (had && e.mates.length) for (const x of e.mates) if (!x.v.job && x.next > t) wakeAt(x, t);
      if (r && r.ok) {
        v.n = (v.n || 0) + (r.n || 1); out.n++;
        if (hook.away) { hook.away.jobs++; if (k === 'feed') hook.away.fed += r.n || 1; }
        if (live) { out.did.push({ v: v.id, key: e.key, k, id: jid, g: r.gained || null, coins: r.coins || 0 }); if (out.did.length > 24) out.did.shift(); }
      }
      // Probudit ty, kdo čekali právě na tohle. Úbytek zásoby (cíl výroby) probudí všechny, kdo na něj čekají.
      // Surovina a místo se budí po jednom (v31): další čekající přijde na řadu, jen dokud ještě něco zbývá –
      // jinak by se při každé dávce semen probudilo 15 pěstitelů a 14 z nich by zase usnulo.
      // v34: nikdo nečeká → nic k buzení (dřív se i tak procházely všechny přibylé suroviny × všichni pracovníci)
      let waiting = false;
      for (const x of list) if (x.wait !== null && x !== e) { waiting = true; break; }
      if (!waiting) { hook.take.length = 0; hook.add.length = 0; hook.room = false; hook.seedRoom = false; if (chain.size) chain.clear(); continue; }
      if (hook.take.length) {
        for (const x of list) { const w = x.wait; if (w !== null && w.took && x !== e && hits(w.took, hook.take)) wakeAt(x, t); }
        hook.take.length = 0;
      }
      if (hook.add.length) { for (const id of hook.add) chainOn(chain, id); hook.add.length = 0; }
      if (hook.room) { chainOn(chain, ROOM); hook.room = false; }
      if (hook.seedRoom) { chainOn(chain, SEED_ROOM); hook.seedRoom = false; }
      if (chain.size) {
        for (const [id, seen] of chain) {
          let x = null;
          for (const y of list) { const w = y.wait; if (w !== null && y !== e && (id === ROOM ? w.room : id === SEED_ROOM ? w.seedRoom : w.needs && w.needs.includes(id)) && !seen.has(y)) { x = y; break; } }
          if (x && (id === ROOM ? siloFree(farm) > 0 : id === SEED_ROOM ? seedUsed(farm) < seedCap(farm) : availFor(farm, id) > 0)) { seen.add(x); wakeAt(x, t); }
          else chain.delete(id);
        }
      }
    }
  } finally { villHook = null; crewCache = null; }
  for (const e of list) if (!e.v.job && e.type !== 'trader' && e.next > S && !(e.v.t >= S)) e.v.t = S;
  if (hook.away) awayEnd(farm, S, out.behind);
  farm.vt = S;
  out.steps = steps;
  if (lim.did) for (const d of out.did) lim.did.push(d);   // prohlížeč si z toho bere čísla nad políčky a zprávu o trhu
  return out;
}
// o kolik je práce vesničanů pozadu za časem now (ms); větší číslo = ještě se dopočítává dlouhá nepřítomnost
export const villLag = (farm, now) => (farm.vill && farm.vill.length && farm.vt ? Math.max(0, now - farm.vt) : 0);

// ---------- domky, pověst a nástěnka (hledání pracovníků) ----------
// lůžka v domcích = kolik lidí může mít tým (nejvýš TEAM.maxTeam)
export const beds = farm => farm.objects.reduce((n, o) => n + ((BUILDINGS[o.kind] && BUILDINGS[o.kind].beds) || 0), 0);
export const teamCap = farm => Math.min(TEAM.maxTeam, beds(farm));
export const teamFree = farm => teamCap(farm) - farm.vill.length;
// stupeň pověsti 1–10
export function repTier(farm) {
  let t = 1;
  TEAM.rep.tiers.forEach((p, i) => { if ((farm.rep || 0) >= p) t = i + 1; });
  return t;
}
export const repNext = farm => TEAM.rep.tiers[repTier(farm)] ?? null;   // body na další stupeň (null = nejvyšší)
// pohoštění k inzerátu podle velikosti týmu: dvě možnosti [[položka, ks], …]
export const adOffers = farm => (TEAM.board.offers.find(o => farm.vill.length <= o.upTo) || TEAM.board.offers[TEAM.board.offers.length - 1]).opts;
export const adWaitMs = farm => (TEAM.board.waitMin + TEAM.board.perMember * farm.vill.length) * 60000;
const TRAIT_IDS = Object.keys(TEAM.traits);
const PROF_IDS = Object.keys(TEAM.profs);
// uchazeč: profese (null = náhodná jiná), začínající úroveň podle pověsti, jedna vlastnost
function makeCand(farm, r, tier, prof) {
  const [lo, hi] = TEAM.rep.startLvl[tier - 1];
  if (!prof) prof = PROF_IDS[Math.floor(r() * PROF_IDS.length)];
  return { id: farm.nextId++, prof, lvl: lo + Math.floor(r() * (hi - lo + 1)), trait: TRAIT_IDS[Math.floor(r() * TRAIT_IDS.length)] };
}
// Nástěnka: staré inzeráty odejdou, od stupně pověsti 3 se občas někdo z domků v Městečku ozve sám.
// Čas a podoba zájemce se počítá z čísla farmy a pořadí (seeded), takže server i prohlížeč vidí totéž.
function ensureBoard(farm, now) {
  const b = farm.board;
  if (b.ads.length) b.ads = b.ads.filter(ad => ad.until > now);
  const every = TEAM.rep.selfH[repTier(farm) - 1] * 3600000;
  if (!every) { b.next = 0; return; }
  const r = seeded(`${farm.created}:self:${b.k || 0}`);
  if (!b.next) { b.next = now + Math.round(every * (0.5 + r())); return; }
  if (now < b.next) return;
  // je volné lůžko a nikdo z domků už nečeká → ozve se ten, jehož profese je v týmu nejméně
  if (teamFree(farm) > 0 && !b.ads.some(ad => ad.self)) {
    const cnt = Object.fromEntries(PROF_IDS.map(p => [p, 0]));
    for (const v of farm.vill) if (cnt[v.prof] !== undefined) cnt[v.prof]++;
    const prof = PROF_IDS.reduce((m, p) => (cnt[p] < cnt[m] ? p : m), PROF_IDS[Math.floor(r() * PROF_IDS.length)]);
    const at = Math.max(b.next, now - TEAM.board.stayH * 3600000 + 60000);
    b.ads.push({ id: farm.nextId++, self: true, house: Math.floor(r() * 9), prof, ready: at, until: at + TEAM.board.stayH * 3600000, cands: [makeCand(farm, r, repTier(farm), prof)] });
  }
  b.k = (b.k || 0) + 1;
  b.next = Math.max(now, b.next) + Math.round(every * (0.75 + 0.5 * r()));
}
// zásluhy pro vylepšení Statku na úroveň L: [{ k, text, have, need, ok }]
export function statekMerits(farm, L) {
  const m = TEAM.statek[L];
  if (!m) return [];
  const have = m.k === 'rep' ? repTier(farm) : (farm.stats[m.k] || 0);
  return [
    { k: 'level', text: 'Úroveň hráče', have: farm.level, need: m.player, ok: farm.level >= m.player },
    { k: m.k, text: TEAM.meritText[m.k] + (m.k === 'rep' ? ' (stupeň)' : ''), have, need: m.n, ok: have >= m.n },
  ];
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
// v34: hungry = čeká na krmení; eating = v cyklu, nic hotového; ready = má hotové výrobky (avail), cyklus může dál běžet.
// made = kolik výrobků cyklu už vzniklo, left = sekundy do dalšího výrobku (0 = cyklus doběhl).
export function animalState(animal, def, now) {
  if (!animal.fed) return { state: 'hungry', progress: 0, left: 0, avail: 0, made: 0 };
  const total = animal.dur || ANIMAL_CYCLE * 1000, per = def.per || 1, step = total / per, el = Math.max(0, now - animal.fed);
  const made = Math.min(per, Math.floor(el / step + 1e-9)), avail = Math.max(0, made - (animal.got || 0));
  const left = made < per ? Math.ceil((animal.fed + (made + 1) * step - now) / 1000) : 0;
  return { state: avail > 0 ? 'ready' : 'eating', progress: Math.min(1, el / total), left, avail, made };
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
    let done = 0, hungry = 0, busy = false;
    for (const x of obj.animals || []) { const s = animalState(x, a, now); done += s.avail; if (s.state === 'hungry') hungry++; else if (s.made < a.per) busy = true; }
    return { done, hungry, busy };
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
  vill_max: 'Víc vesničanů už na farmu nepřibude.',
  farm_max: 'Ve Statku může být nejvýš 5 farmářů.',
  seeds_full: 'Zásoba semen a sazenic ve Statku je plná – na každé pole a sad se vejdou 3 kusy.',
  no_supply: 'Tohle se v městečku nekupuje.',
  area_small: 'Pracovní oblast musí mít aspoň 4 políčka vedle sebe.',
  vill_lvl_max: 'Vesničan už má nejvyšší úroveň.',
  bad_job: 'Tady vesničan pracovat nemůže.',
  plan_over: 'Dohromady to nejde přes 100 %. Nejdřív uber jinde.',
  team_search: 'Pracovníci se nekupují – najdi je na Nástěnce v Městečku.',
  helper_gone: 'Pomocník na hodiny už není – pracovníky najdeš na Nástěnce v Městečku.',
  no_bed: 'Nemáš volné lůžko. Postav nebo přestav domek.',
  ads_max: 'Víc inzerátů najednou viset nemůže.',
  merits: 'Statek zatím nejde vylepšit – chybí zásluhy.',
  plan_rows: 'Víc řádků se do tabulky nevejde.',
  workplace_full: 'Tady už je plno – vyber, s kým se má vyměnit.',
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
// lim = { left } – společný rozpočet úkonů vesničanů (server ho dává jeden na celý požadavek)
export function applyAction(farm, a, now, lim) {
  normalize(farm);
  ensureQuests(farm, now);
  let c = farm.coins;
  if (farm.helper) { runHelper(farm, now); ledger(farm, 'other', farm.coins - c, now); }
  if (farm.vill.length && !(now <= farm.vt)) runVillagers(farm, now, lim);   // ve stejném čase už dopočítáno (skladník zapisuje sám)
  ensureBoard(farm, now);
  c = farm.coins;
  const r = doAction(farm, a, now);
  if (farm.coins !== c) ledger(farm, (a && ACT_SRC[a.type]) || 'other', farm.coins - c, now);   // v34: příjmy a výdaje podle akce
  return r;
}
// samotná akce (bez dopočítání pomocníka a vesničanů – ty ji volají taky)
function doAction(farm, a, now) {
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
      farm.plots.push({ id: farm.nextId++, x: a.x, y: a.y, crop: null, planted: 0 });
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
    case 'move': {   // přesun jakékoli budovy (i Statku) na volné místo
      const o = findObject(farm, a.id);
      if (!o) return fail('no_object');
      const sz = objSize(o);
      if (!fits(farm, a.x, a.y, sz.w, sz.h, o.id)) return fail('occupied');
      o.x = a.x; o.y = a.y;
      return { ok: true };
    }
    case 'movePlot': {   // přesun malého pole i s tím, co na něm roste
      const p = findPlot(farm, a.x, a.y);
      if (!p) return fail('no_object');
      if (a.tx === p.x && a.ty === p.y) return { ok: true };
      if (!fits(farm, a.tx, a.ty, 1, 1)) return fail('occupied');
      p.x = a.tx; p.y = a.ty;
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
      queueRecipe(o, r, now);
      return { ok: true };
    }
    case 'collect': {
      const o = findObject(farm, a.id);
      if (!o) return fail('no_object');
      const d = BUILDINGS[o.kind];
      const items = [];
      let xp = 0, xpTeam = 0, full = false, anyReady = false, seedsFull = false;
      if (d.type === 'factory') {
        // dávka od týmu (q.n kusů) se odnáší po částech, kolik se vejde; XP za ni dostane hráč jen z části (TEAM.playerXp)
        while (o.queue.length && o.queue[0].end <= now) {
          anyReady = true;
          const q = o.queue[0], per = recipeQty(RECIPES[q.r]), left = q.n || 1;
          const fit = Math.min(left, Math.floor(spaceFor(farm, q.r) / per));
          if (fit < 1) { full = true; seedsFull = isSeedItem(q.r); break; }
          addItem(farm, q.r, fit * per);
          logMade(o, q.r, fit * per, now);
          items.push({ item: q.r, qty: fit * per });
          if (q.t) xpTeam += RECIPES[q.r].xp * fit; else xp += RECIPES[q.r].xp * fit;
          if (fit < left) { q.n = left - fit; full = true; break; }
          o.queue.shift();
        }
      } else if (d.type === 'pen') {
        const an = ANIMALS[d.animal];
        for (const x of o.animals) {
          const av = animalState(x, an, now).avail;
          if (av < 1) continue;
          anyReady = true;
          const u = Math.min(av, siloFree(farm));
          if (u < av) full = true;
          if (u < 1) break;
          takeAnimal(x, an, u);
          addItem(farm, an.product, u);
          items.push({ item: an.product, qty: u });
          xp += an.xp * u;
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
      if (!items.length) return fail(seedsFull ? 'seeds_full' : full ? 'silo_full' : anyReady ? 'silo_full' : 'not_ready');
      if (a.team) { xpTeam += xp; xp = 0; }
      const levelUp = Math.max(addXp(farm, xp), teamXp(farm, xpTeam));
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
        startCycle(x, o, now);
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
      setTree(o, t, now, sap ? 'sap' : t.cost);
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
      const levelUp = a.team ? teamXp(farm, t.xp) : addXp(farm, t.xp);
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
      if (BUILDINGS[o.kind].type === 'main' && statekMerits(farm, c.level).some(m => !m.ok)) return fail('merits');
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
        if (spaceFor(farm, off.item) < a.qty) return fail(isSeedItem(off.item) ? 'seeds_full' : 'silo_full');
        farm.coins -= total;
        const s = storeOf(farm, off.item);
        s[off.item] = (s[off.item] || 0) + a.qty;
      } else {
        if (have(farm, off.item) < a.qty) return fail('not_enough');
        takeItem(farm, off.item, a.qty);
        farm.coins += total;
        addStat(farm, 'sold', total);
      }
      st[key][a.i] = (st[key][a.i] || 0) + a.qty;
      return { ok: true, total };
    }
    case 'buySupply': {
      const price = supplyPrice(farm, a.item);
      if (price === null || !isInt(a.qty) || a.qty < 1 || a.qty > 100) return fail('no_supply');
      if (farm.coins < price * a.qty) return fail('no_coins');
      if (spaceFor(farm, a.item) < a.qty) return fail(isSeedItem(a.item) ? 'seeds_full' : 'silo_full');
      farm.coins -= price * a.qty;
      const s = storeOf(farm, a.item);
      s[a.item] = (s[a.item] || 0) + a.qty;
      return { ok: true, cost: price * a.qty };
    }
    case 'buyFarmer': case 'buyVill': case 'upVill':   // od v29 se pracovníci nekupují ani nevylepšují za mince
      return fail('team_search');
    case 'assignArea': {   // kind 'pole' | 'sad', a = id pole/sadu v oblasti (0 = odvolat); swap = id pracovníka, se kterým se vymění
      const v = findVill(farm, a.id);
      if (!v || !isInt(a.a)) return fail('bad_action');
      if (!a.a) { dropJob(farm, v); v.area = null; return { ok: true }; }
      if (a.kind !== 'pole' && a.kind !== 'sad') return fail('bad_action');
      const areas = workAreas(farm);
      const g = areas.find(x => x.kind === a.kind && x.ids.includes(a.a));
      if (!g) return fail('area_small');
      if (areaOf(areas, v) === g) return { ok: true, n: g.n };   // už tam pracuje
      const err = makeRoom(farm, v, { o: null, g }, areas, a.swap, now);
      if (err) return err;
      dropJob(farm, v);
      v.at = 0; v.w = '';
      v.area = { kind: a.kind, id: a.a }; v.t = now;
      return { ok: true, n: g.n };
    }
    case 'assignVill': {   // at = id budovy, 0 = odvolat; swap = id pracovníka, se kterým se vymění, když je místo plné
      const v = findVill(farm, a.id);
      if (!v || !isInt(a.at)) return fail('bad_action');
      if (a.at) {
        const o = findObject(farm, a.at), type = o && villJobType(o.kind);
        if (!type) return fail('bad_job');
        if (v.at === a.at && !v.area) return { ok: true };
        const err = makeRoom(farm, v, { o, g: null, type }, null, a.swap, now);
        if (err) return err;
      }
      dropJob(farm, v);
      v.area = null; v.w = a.at ? '' : 'free';
      v.at = a.at; v.t = now;
      return { ok: true };
    }
    case 'fireVill': {     // propustit: odejde, vrátí, co měl v rukou, uvolní lůžko
      const v = findVill(farm, a.id);
      if (!v) return fail('bad_action');
      dropJob(farm, v);
      farm.vill = farm.vill.filter(x => x !== v);
      return { ok: true };
    }
    case 'postAd': {       // vyvěsit inzerát na nástěnce: profese + jedna ze dvou možností pohoštění
      if (!TEAM.profs[a.prof] || !isInt(a.opt)) return fail('bad_action');
      if (teamFree(farm) < 1) return fail('no_bed');
      const tier = repTier(farm);
      if (farm.board.ads.filter(x => !x.self).length >= TEAM.rep.ads[tier - 1]) return fail('ads_max');
      const opt = adOffers(farm)[a.opt];
      if (!opt) return fail('bad_action');
      if (opt.some(([id, n]) => have(farm, id) < n)) return fail('no_inputs');
      for (const [id, n] of opt) takeItem(farm, id, n);
      const ready = now + adWaitMs(farm);
      const ad = { id: farm.nextId++, prof: a.prof, ready, until: ready + TEAM.board.stayH * 3600000, cands: [] };
      const r = seeded(`${farm.created}:ad:${ad.id}`);
      for (let i = 0, k = TEAM.rep.cands[tier - 1]; i < k; i++) ad.cands.push(makeCand(farm, r, tier, i < k - 1 || r() < 0.7 ? a.prof : null));
      farm.board.ads.push(ad);
      return { ok: true, id: ad.id, ready };
    }
    case 'hireCand': {     // přijmout uchazeče z inzerátu (ostatní odejdou)
      const ad = farm.board.ads.find(x => x.id === a.ad);
      const c = ad && isInt(a.i) ? ad.cands[a.i] : null;
      if (!c) return fail('bad_action');
      if (now < ad.ready) return fail('not_ready');
      if (teamFree(farm) < 1) return fail('no_bed');
      farm.board.ads = farm.board.ads.filter(x => x !== ad);
      const v = { id: c.id, prof: c.prof, trait: c.trait, xp: { [c.prof]: TEAM.xpLvl[c.lvl] }, hist: [], at: 0, area: null, t: now, n: 0 };
      farm.vill.push(v);
      return { ok: true, id: v.id };
    }
    case 'dropAd': {       // stáhnout inzerát (pohoštění se nevrací)
      const ad = farm.board.ads.find(x => x.id === a.ad);
      if (!ad) return fail('bad_action');
      farm.board.ads = farm.board.ads.filter(x => x !== ad);
      return { ok: true };
    }
    case 'rebuildHouse': { // přestavba: chatrč → chata → dům za rozdíl v ceně, na stejném místě
      const o = findObject(farm, a.id);
      const d = o && BUILDINGS[o.kind];
      const next = d && d.type === 'house' && d.next && BUILDINGS[d.next];
      if (!next) return fail('bad_action');
      if (next.st > statekLevel(farm)) return fail('statek_low');
      const cost = next.cost - d.cost;
      if (farm.coins < cost) return fail('no_coins');
      farm.coins -= cost;
      o.kind = next.id;
      const levelUp = addXp(farm, next.xp);
      return { ok: true, kind: next.id, cost, gained: { items: [], xp: next.xp, levelUp } };
    }
    case 'villPlan': case 'villLim':   // do v29 měl plán pracovník; od v30 patří pracovišti (akce plan, planTarget, keep)
      return fail('bad_action');
    case 'plan': {         // řádek plánu pracoviště: w = pracoviště, key = plodina / strom / výrobek / zboží, pct = podíl v % (0 = vyřadit)
      const wp = wpGet(farm, a.w);
      if (!wp || typeof a.key !== 'string' || !isInt(a.pct) || a.pct < 0 || a.pct > 100 || a.pct % 5) return fail('bad_action');
      const kind = planKindW(wp);
      if (!kind) return fail('bad_job');
      const plan = wpPlan(wp);
      if (!a.pct) { if (has(plan, a.key)) delete plan[a.key]; return { ok: true }; }
      const err = planKeyErr(farm, wp, kind, a.key);
      if (err) return fail(err);
      if (!has(plan, a.key) && Object.keys(plan).length >= (kind === 'item' ? TEAM.trade.rows[TEAM.maxLvl] : PLAN_ROWS)) return fail('plan_rows');
      if (kind !== 'item' && planTotal(plan) - (plan[a.key] || 0) + a.pct > 100) return fail('plan_over');   // sklad: každé zboží zvlášť
      plan[a.key] = a.pct;
      return { ok: true };
    }
    case 'planTarget': {   // výrobna: cílová zásoba výrobku (n = kolik kusů mít, 0 = vyřadit); cíle mají přednost před procenty
      const wp = wpGet(farm, a.w);
      if (!wp || typeof a.key !== 'string' || !isInt(a.n) || a.n < 0 || a.n > 9999) return fail('bad_action');
      if (wp.type !== 'factory') return fail('bad_job');
      const T = wp.o.target || (wp.o.target = []), i = T.findIndex(x => x[0] === a.key);
      if (!a.n) { if (i >= 0) T.splice(i, 1); return { ok: true }; }
      const err = planKeyErr(farm, wp, 'recipe', a.key);
      if (err) return fail(err);
      if (i >= 0) T[i][1] = a.n;
      else if (T.length >= PLAN_ROWS) return fail('plan_rows');
      else T.push([a.key, a.n]);
      return { ok: true };
    }
    case 'planOrder': {    // výrobna: posunout cíl v pořadí (d = -1 nahoru, 1 dolů)
      const wp = wpGet(farm, a.w);
      if (!wp || wp.type !== 'factory' || (a.d !== 1 && a.d !== -1)) return fail('bad_action');
      const T = wp.o.target || [], i = T.findIndex(x => x[0] === a.key), j = i + a.d;
      if (i < 0 || j < 0 || j >= T.length) return fail('bad_action');
      [T[i], T[j]] = [T[j], T[i]];
      return { ok: true };
    }
    case 'planAuto': {     // výrobna: přerozdělit nevyužitou kapacitu (procenta pod 100 %) mezi výrobky v plánu
      const wp = wpGet(farm, a.w);
      if (!wp || wp.type !== 'factory' || typeof a.on !== 'boolean') return fail('bad_action');
      if (a.on) wp.o.auto = true; else delete wp.o.auto;
      return { ok: true };
    }
    case 'planReplant': {  // oblast: znovu osazovat volná místa (vypnuto = jen sklízí a pole nechá ladem)
      const wp = wpGet(farm, a.w);
      if (!wp || !wp.g || typeof a.on !== 'boolean') return fail('bad_action');
      wp.set.replant = a.on;
      return { ok: true };
    }
    case 'keep': {         // rezerva ve skladu: pod n kusů tým nesáhne (výroba ani prodej na trhu), 0 = bez rezervy
      if (typeof a.item !== 'string' || !getItem(a.item) || !isInt(a.n) || a.n < 0 || a.n > 99999) return fail('bad_action');
      if (a.n) farm.keep[a.item] = a.n; else delete farm.keep[a.item];
      return { ok: true };
    }
    case 'tick':           // jen dopočítá práci vesničanů (klient ji posílá, když dohání dlouhou nepřítomnost)
      return { ok: true };
    case 'awaySeen':       // v34: hráč viděl zprávu o nepřítomnosti
      if (!farm.away || farm.away.seen) return fail('nothing');
      farm.away.seen = true;
      return { ok: true };
    case 'hire': {
      if (!a.legacy) return fail('helper_gone');   // od v29 se pomocník nenajímá – pracovníci se hledají na nástěnce
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
      if (a.reset) farm.tg = [];
      return { ok: true };
    }
    case 'guide': {        // v34: postupný průvodce – hotové kroky podle id (krok se ukáže, až se jeho část hry odemkne)
      if (typeof a.id !== 'string' || !/^[a-z0-9_]{1,24}$/.test(a.id)) return fail('bad_action');
      if (!farm.tg.includes(a.id)) { if (farm.tg.length >= 64) return fail('bad_action'); farm.tg.push(a.id); }
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
      farm.rep = (farm.rep || 0) + TEAM.rep.quest;
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
      farm.rep = (farm.rep || 0) + TEAM.rep.order;
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

// =====================================================================================================================
// v34: hospodaření, zpráva o nepřítomnosti, upozornění a Řídicí centrum. Nic z toho nemění ekonomiku – jen zaznamenává
// skutečné změny (mince, výrobky) a vyhodnocuje stav farmy stejnými funkcemi, kterými hra počítá (penStats, factoryRate…).
// =====================================================================================================================
export const LEDGER_H = 48;                  // hodinové souhrny mincí za posledních 48 hodin (starší se mažou)
export const LEDGER_SRC = {
  orders: 'Zakázky', sell: 'Výkup ve Skladu', trade: 'Skladník na trhu', market: 'Tržiště hráčů', quests: 'Úkoly a odměny', fish: 'Rybaření',
  stall: 'Stánek', build: 'Stavby a vylepšení', land: 'Pole a pozemky', seeds: 'Osivo a sazenice', animals: 'Zvířata', machines: 'Stroje',
  team: 'Tým', other: 'Ostatní',
};
const ACT_SRC = {
  deliver: 'orders', sell: 'sell', claimDaily: 'quests', claimQuest: 'quests', claimAch: 'quests', fishCast: 'fish', fishLand: 'fish',
  stallBuy: 'stall', stallSell: 'stall', place: 'build', upgrade: 'build', upgradeSilo: 'build', buyPlot: 'land', buyLand: 'land',
  plant: 'seeds', sowAll: 'seeds', plantTree: 'seeds', clearTree: 'seeds', fieldSow: 'seeds', buyAnimal: 'animals',
  buyMachine: 'machines', sellMachine: 'machines', fieldPlow: 'machines', fieldBale: 'machines',
  buySupply: 'team', postAd: 'team', hireCand: 'team', rebuildHouse: 'team', hire: 'team',
};
// zapíše změnu mincí do hodinového souhrnu (t = kdy se to stalo – u práce týmu čas úkonu, ne čas požadavku)
function ledger(farm, src, delta, t) {
  if (!delta || !isFinite(delta)) return;
  const h = Math.floor(t / 3600000), L = farm.led || (farm.led = []);
  let i = L.length - 1;
  while (i >= 0 && L[i].h > h) i--;
  let b = i >= 0 && L[i].h === h ? L[i] : null;
  if (!b) { b = { h, i: {}, o: {} }; L.splice(i + 1, 0, b); }
  const side = delta > 0 ? b.i : b.o;
  side[src] = (side[src] || 0) + Math.abs(delta);
  const minH = Math.floor(Math.max(t, (L[L.length - 1] || b).h * 3600000) / 3600000) - LEDGER_H + 1;
  while (L.length && L[0].h < minH) L.shift();
}
// příjmy a výdaje za posledních `hours` hodin (včetně běžící hodiny); by = podle zdroje
export function ledgerSum(farm, now, hours = 24) {
  const h0 = Math.floor(now / 3600000) - hours + 1, out = { inc: 0, exp: 0, byIn: {}, byOut: {}, series: [], since: null };
  const L = farm.led || [];
  if (L.length) out.since = L[0].h * 3600000;
  for (let h = h0; h <= h0 + hours - 1; h++) out.series.push({ h, i: 0, o: 0 });
  for (const b of L) {
    if (b.h < h0) continue;
    const s = out.series[b.h - h0];
    for (const k in b.i) { out.inc += b.i[k]; out.byIn[k] = (out.byIn[k] || 0) + b.i[k]; if (s) s.i += b.i[k]; }
    for (const k in b.o) { out.exp += b.o[k]; out.byOut[k] = (out.byOut[k] || 0) + b.o[k]; if (s) s.o += b.o[k]; }
  }
  out.net = out.inc - out.exp;
  return out;
}

// ---------- zpráva o nepřítomnosti ----------
// Když se práce týmu dopočítává po víc než AWAY_MIN, otevře se farm.away a do ní se sčítá, co tým během té doby získal
// a prodal. Po dohnání (done) ji hráč uvidí jednou (akce awaySeen); další nepřítomnost ji nahradí. Každý úsek času se
// dopočítává jen jednou (farm.vt), takže se nic nezapočítá dvakrát ani při opakovaném otevření hry.
export const AWAY_MIN = 30 * 60000;
function awayStart(farm, now) {
  if (farm.away && !farm.away.done) return farm.away;                      // dlouhá nepřítomnost se dohání po dávkách
  if (!(farm.vt && now - farm.vt > AWAY_MIN)) return null;
  return (farm.away = { from: farm.vt, to: farm.vt, done: false, seen: false, got: {}, sold: {}, coins: 0, fed: 0, jobs: 0 });
}
function awayEnd(farm, S, behind) {
  const a = farm.away;
  if (!a || a.done) return;
  a.to = S;
  if (!behind) a.done = true;
}

// ---------- upozornění ----------
// Počítají se pokaždé znovu ze stavu farmy (nic se neukládá → stejné upozornění nevzniká opakovaně a po vyřešení zmizí).
// lvl 0 = kritické (něco stojí teď), 1 = varování (hrozí / omezení), 2 = informace (splněný cíl, běžná věc).
// Stejný druh se slučuje (ids = budovy, n = kolik). Plánované zastavení po splnění cílové zásoby není chyba (info).
export const ALERT_LVL = ['Kritické', 'Varování', 'Informace'];
export function farmAlerts(farm, now) {
  const map = new Map();
  const add = (lvl, k, text, id = null, item = null) => {
    const key = k + (item ? ':' + item : '');
    const a = map.get(key);
    if (a) { a.n++; if (id && !a.ids.includes(id)) a.ids.push(id); return; }
    map.set(key, { lvl, k, text, item, n: 1, ids: id ? [id] : [] });
  };
  const nameOf = o => (BUILDINGS[o.kind] || {}).name || o.kind;
  // sklad
  const used = siloUsed(farm), cap = farm.siloCap;
  if (used >= cap) add(0, 'silo_full', 'Sklad je plný – sklizeň, výroba ani zvířata nemají kam ukládat.');
  else if (used >= cap * 0.85) add(1, 'silo_high', `Sklad je skoro plný (${used}/${cap}).`);
  // ohrady
  for (const o of farm.objects) {
    const d = BUILDINGS[o.kind];
    if (d.type !== 'pen' || !(o.animals || []).length) continue;
    const s = penStats(farm, o, now);
    if (s.warn.includes('full')) add(0, 'pen_full', `${nameOf(o)}: sklad je plný, zvířata stojí.`, o.id);
    if (s.warn.includes('no_feed') && s.hungry) add(0, 'no_feed', `${nameOf(o)}: došlo krmivo (${ITEMS[s.an.feed].name.toLowerCase()}).`, o.id, s.an.feed);
    else if (s.warn.includes('keep') && s.hungry) add(1, 'feed_keep', `${nameOf(o)}: krmivo je celé v rezervě skladu.`, o.id, s.an.feed);
    else if (s.warn.includes('low_feed')) add(1, 'low_feed', `${nameOf(o)}: krmivo vydrží asi ${Math.max(1, Math.round(s.hours * 60))} min.`, o.id, s.an.feed);
  }
  // tým: kdo stojí a proč (stav pracovníka v.w z posledního dopočítání)
  const areas = farm.vill.some(isFarmer) ? workAreas(farm) : [];
  for (const v of farm.vill) {
    if (v.job) continue;
    const o = v.at ? findObject(farm, v.at) : null, place = o ? nameOf(o) : v.area ? (v.area.kind === 'sad' ? 'Sad' : 'Pole') : '';
    const need = (v.nd || [])[0];
    switch (v.w) {
      case 'free': add(1, 'free', 'Pracovník nemá přiřazenou práci.'); break;
      case 'inputs': add(0, 'inputs', `${place}: chybí suroviny${need && ITEMS[need] ? ` (${ITEMS[need].name.toLowerCase()})` : ''}.`, o && o.id, need); break;
      case 'feed': break;   // hlásí ohrada (no_feed / feed_keep)
      case 'seeds': add(0, 'seeds', `${place}: ve Statku došla ${v.area && v.area.kind === 'sad' ? 'sazenice' : 'semena'}${need && ITEMS[need] ? ` (${ITEMS[need].name.toLowerCase()})` : ''}.`, null, need); break;
      case 'full': add(0, 'full', `${place}: nemá kam dát hotové – sklad je plný.`, o && o.id); break;
      case 'plan': add(1, 'plan', `${place}: nemá plán práce.`, o && o.id); break;
      case 'skill': add(1, 'skill', `${place}: pracovník na nic z plánu nemá praxi.`, o && o.id); break;
      case 'limit': add(2, 'limit', `${place}: cílové zásoby jsou splněné, výroba čeká.`, o && o.id); break;
    }
  }
  // budovy bez lidí (jen když už má hráč tým a budova má plán nebo zvířata)
  if (farm.vill.length) {
    for (const o of farm.objects) {
      const d = BUILDINGS[o.kind], type = villJobType(o.kind);
      if (!type || farm.vill.some(v => v.at === o.id)) continue;
      const wants = type === 'factory' ? planTotal(o.plan) > 0 || (o.target || []).length > 0 : type === 'pen' ? (o.animals || []).length > 0 : type === 'trader' ? planTotal(o.plan) > 0 : false;
      if (wants) add(1, 'no_worker', `${d.name} nemá pracovníka – plán se neplní.`, o.id);
    }
    void areas;
  }
  // pole, sady, stromy, včelíny, zakázky
  const emptyPlots = farm.plots.filter(p => !p.crop).length;
  if (emptyPlots && !farm.vill.some(isFarmer)) add(2, 'empty_plots', `${emptyPlots} ${emptyPlots === 1 ? 'pole čeká' : emptyPlots < 5 ? 'pole čekají' : 'polí čeká'} na zasetí.`);
  const dead = farm.objects.filter(o => o.kind === 'sad' && o.tree && treeState(o, now).state === 'dead');
  if (dead.length) add(2, 'dead_tree', `Uschlý strom – pokácej ho a zasaď nový (${dead.length}).`, dead[0].id);
  for (const o of farm.objects) if (BUILDINGS[o.kind].type === 'hive') { const s = hiveStock(farm, o, now); if (s.count >= s.cap && !farm.vill.some(v => v.at === o.id)) add(1, 'hive_full', `${nameOf(o)} je plný – včely nepracují.`, o.id); }
  const st = farm.objects.find(o => o.kind === 'statek');
  const deliverable = (farm.orders || []).filter(o => o && orderReady(o, now) && canDeliver(farm, o)).length;
  if (deliverable && st) add(2, 'orders', `Zakázky připravené k doručení: ${deliverable}.`, st.id);
  return [...map.values()].sort((a, b) => a.lvl - b.lvl || b.n - a.n);
}

// ---------- Řídicí centrum: souhrn ze skutečného stavu farmy ----------
export function centerData(farm, now) {
  const areas = workAreas(farm);
  // sklad
  const used = siloUsed(farm), cap = farm.siloCap;
  const keepList = Object.entries(farm.keep || {}).filter(([, n]) => n > 0).map(([item, n]) => ({ item, keep: n, have: have(farm, item) }));
  const low = new Map();
  for (const v of farm.vill) if (!v.job && (v.w === 'inputs' || v.w === 'seeds' || v.w === 'feed')) for (const it of v.nd || []) low.set(it, (low.get(it) || 0) + 1);
  for (const o of farm.objects) if (BUILDINGS[o.kind].type === 'pen' && (o.animals || []).length) { const s = penStats(farm, o, now); if (s.warn.includes('low_feed') || s.warn.includes('no_feed')) low.set(s.an.feed, (low.get(s.an.feed) || 0) + 1); }
  const targets = [];
  for (const o of farm.objects) for (const [item, n] of o.target || []) if (n > 0) { const has = stockOf(farm, o, item); if (has >= n * 0.8) targets.push({ item, target: n, has, id: o.id, done: has >= n }); }
  // tým a pracovní místa
  let seats = 0, filled = 0;
  for (const o of farm.objects) { const type = villJobType(o.kind); if (type) { const c = bldCap(o, type), n = farm.vill.filter(v => v.at === o.id).length; seats += c; filled += Math.min(c, n); } }
  for (const g of areas) { const c = areaCap(g), n = farm.vill.filter(v => v.area && v.area.kind === g.kind && g.ids.includes(v.area.id)).length; seats += c; filled += Math.min(c, n); }
  const BLOCK = new Set(['inputs', 'seeds', 'feed', 'full', 'plan', 'skill']);
  const team = {
    total: farm.vill.length, working: farm.vill.filter(v => v.job).length, free: farm.vill.filter(v => !v.at && !v.area).length,
    blocked: farm.vill.filter(v => !v.job && BLOCK.has(v.w)).length, waiting: farm.vill.filter(v => !v.job && (v.w === 'rest' || v.w === 'limit')).length,
    seats, filled, beds: beds(farm), bedsFree: Math.max(0, teamCap(farm) - farm.vill.length),
  };
  // výroba
  const prod = { active: 0, stopped: 0, making: {}, rate: {}, reached: [] };
  for (const o of farm.objects) {
    if (BUILDINGS[o.kind].type !== 'factory') continue;
    const q = queueState(o, now), working = q.some(x => x.state === 'working') || farm.vill.some(v => v.at === o.id && v.job);
    if (working) prod.active++; else prod.stopped++;
    for (const x of q) if (x.state === 'working') prod.making[x.r] = (prod.making[x.r] || 0) + (o.queue.find(y => y.end === x.end) || {}).n || 1;
    for (const id in o.plan || {}) { const r = factoryRate(farm, o, id); if (r > 0) prod.rate[id] = (prod.rate[id] || 0) + r; }
    if (farm.vill.some(v => v.at === o.id && v.w === 'limit')) prod.reached.push(o.id);
  }
  // pole a sady
  let growing = 0, ripe = 0, empty = 0;
  for (const p of farm.plots) { const s = plotState(p, now).state; if (s === 'ready') ripe++; else if (s === 'growing') growing++; else empty++; }
  const trees = { total: 0, ready: 0, dead: 0, empty: 0 };
  for (const o of farm.objects) if (o.kind === 'sad') { trees.total++; const s = treeState(o, now).state; if (s === 'ready') trees.ready++; else if (s === 'dead') trees.dead++; else if (s === 'empty') trees.empty++; }
  const big = farm.objects.filter(o => o.kind === 'velkepole').map(o => ({ id: o.id, crop: o.crop || (o.load && o.load.item) || null, state: fieldState(o, now).state }));
  const seedsMissing = [...new Set(farm.vill.filter(v => !v.job && v.w === 'seeds').flatMap(v => v.nd || []))];
  const fields = { plots: farm.plots.length, growing, ripe, empty, trees, big, growers: farm.vill.filter(isFarmer).length, seedsMissing, machines: (farm.machines || []).length };
  // chov
  const pens = farm.objects.filter(o => BUILDINGS[o.kind].type === 'pen').map(o => ({ id: o.id, s: penStats(farm, o, now) }));
  return {
    coins: farm.coins, eco: ledgerSum(farm, now, 24),
    silo: { used, cap, free: Math.max(0, cap - used), keep: keepList, low: [...low.keys()], targets },
    team, prod, fields, pens, alerts: farmAlerts(farm, now), away: farm.away || null,
  };
}
