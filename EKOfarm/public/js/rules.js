// EKOfarm – herní pravidla. Sdílí je server (Worker) i prohlížeč.
// Čisté funkce bez DOM a bez přístupu k síti. Čas se vždy předává zvenku (ms).

export const RULES_VERSION = 8;
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
export const START_COINS = 50;
export const SILO_START = 50;
export const SILO_STEP = 25;
export const QUEUE_SIZE = 3;
export const FREE_PLOTS = 6;        // prvních 6 polí je zdarma
export const PLOTS_PER_LEVEL = 6;   // s každou úrovní 6 dalších polí
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
export const CROPS = {
  wheat:  { id: 'wheat',  name: 'Pšenice',  level: 1, cost: 1, time: 60,   yield: 2, xp: 1, price: 3,  icon: 'wheat', harvester: 'combine' },
  corn:   { id: 'corn',   name: 'Kukuřice', level: 2, cost: 3, time: 300,  yield: 2, xp: 2, price: 8,  icon: 'corn', harvester: 'combine' },
  carrot: { id: 'carrot', name: 'Mrkev',    level: 3, cost: 5, time: 600,  yield: 2, xp: 3, price: 12, icon: 'carrot' , harvester: 'tractor' },
  soy:    { id: 'soy',    name: 'Sója',     level: 5, cost: 8, time: 1200, yield: 2, xp: 4, price: 18, icon: 'soy' , harvester: 'combine' },
  potato: { id: 'potato', name: 'Brambory', level: 4, cost: 6,  time: 900,  yield: 2, xp: 3, price: 15, icon: 'potato', harvester: 'tractor' },
  repka:  { id: 'repka',  name: 'Řepka',    level: 6, cost: 10, time: 1500, yield: 2, xp: 5, price: 22, icon: 'repka',  harvester: 'combine' },
  sun:    { id: 'sun',    name: 'Slunečnice', level: 7, cost: 12, time: 1800, yield: 2, xp: 5, price: 26, icon: 'sun', harvester: 'combine' },
  beet:   { id: 'beet',   name: 'Cukrová řepa', level: 8, cost: 14, time: 2400, yield: 2, xp: 6, price: 30, icon: 'beet', harvester: 'tractor' },
};
export const CROP_LIST = Object.values(CROPS);

export const PRODUCTS = {
  krmivo_slepice: { id: 'krmivo_slepice', name: 'Krmivo pro slepice', price: 12,  icon: 'krmivo_slepice' },
  krmivo_kravy:   { id: 'krmivo_kravy',   name: 'Krmivo pro krávy',   price: 26,  icon: 'krmivo_kravy' },
  vejce:          { id: 'vejce',          name: 'Vejce',              price: 22,  icon: 'vejce' },
  mleko:          { id: 'mleko',          name: 'Mléko',              price: 45,  icon: 'mleko' },
  chleb:          { id: 'chleb',          name: 'Chléb',              price: 25,  icon: 'chleb' },
  kolac:          { id: 'kolac',          name: 'Koláč',              price: 60,  icon: 'kolac' },
  smetana:        { id: 'smetana',        name: 'Smetana',            price: 60,  icon: 'smetana' },
  syr:            { id: 'syr',            name: 'Sýr',                price: 110, icon: 'syr' },
  mouka:          { id: 'mouka',          name: 'Mouka',              price: 15,  icon: 'mouka' },
  olej:           { id: 'olej',           name: 'Olej',               price: 70,  icon: 'olej' },
  cukr:           { id: 'cukr',           name: 'Cukr',               price: 75,  icon: 'cukr' },
  buchty:         { id: 'buchty',         name: 'Buchty',             price: 160, icon: 'buchty' },
  slama:          { id: 'slama',          name: 'Sláma',              price: 6,   icon: 'slama' },
};
export const FRUITS = {
  jablko:  { id: 'jablko',  name: 'Jablko',  price: 10, icon: 'jablko' },
  hruska:  { id: 'hruska',  name: 'Hruška',  price: 14, icon: 'hruska' },
  svestka: { id: 'svestka', name: 'Švestka', price: 12, icon: 'svestka' },
  tresne:  { id: 'tresne',  name: 'Třešně',  price: 18, icon: 'tresne' },
  merunka: { id: 'merunka', name: 'Meruňka', price: 20, icon: 'merunka' },
};

// stromy do sadu: cost = sazenice, first = první úroda (s), regrow = další úroda (s), harvests = kolikrát plodí
export const TREES = {
  jablon:  { id: 'jablon',  name: 'Jabloň',  fruit: 'jablko',  level: 3, cost: 40,  first: 1800, regrow: 1200, yield: 3, harvests: 4, xp: 3, color: '#d9342b' },
  hrusen:  { id: 'hrusen',  name: 'Hrušeň',  fruit: 'hruska',  level: 4, cost: 60,  first: 2700, regrow: 1800, yield: 3, harvests: 4, xp: 4, color: '#c9c23a' },
  svestka: { id: 'svestka', name: 'Švestka', fruit: 'svestka', level: 5, cost: 80,  first: 3600, regrow: 2400, yield: 4, harvests: 4, xp: 5, color: '#5b3f8f' },
  tresen:  { id: 'tresen',  name: 'Třešeň',  fruit: 'tresne',  level: 6, cost: 120, first: 5400, regrow: 3600, yield: 4, harvests: 4, xp: 6, color: '#b5122b' },
  merunka: { id: 'merunka', name: 'Meruňka', fruit: 'merunka', level: 8, cost: 160, first: 7200, regrow: 5400, yield: 4, harvests: 5, xp: 8, color: '#f2a03d' },
};
export const TREE_LIST = Object.values(TREES);

export const ITEMS = { ...CROPS, ...PRODUCTS, ...FRUITS };
export const ITEM_LIST = Object.values(ITEMS);

// výrobek = id receptu, vždy 1 kus
export const RECIPES = {
  krmivo_slepice: { id: 'krmivo_slepice', building: 'krmivarna', level: 2, in: { wheat: 2, corn: 1 },  time: 120,  xp: 1 },
  krmivo_kravy:   { id: 'krmivo_kravy',   building: 'krmivarna', level: 4, in: { corn: 2, carrot: 1 }, time: 300,  xp: 2 },
  chleb:          { id: 'chleb',          building: 'pekarna',   level: 2, in: { wheat: 3 },           time: 300,  xp: 3 },
  kolac:          { id: 'kolac',          building: 'pekarna',   level: 4, in: { wheat: 2, vejce: 2 }, time: 900,  xp: 6 },
  smetana:        { id: 'smetana',        building: 'mlekarna',  level: 6, in: { mleko: 1 },           time: 600,  xp: 3 },
  syr:            { id: 'syr',            building: 'mlekarna',  level: 7, in: { mleko: 2 },           time: 1200, xp: 6 },
  mouka:          { id: 'mouka',          building: 'mlyn',      level: 4, in: { wheat: 3 },           time: 240,  xp: 2 },
  olej:           { id: 'olej',           building: 'olejna',    level: 6, in: { repka: 2 },           time: 600,  xp: 4 },
  cukr:           { id: 'cukr',           building: 'cukrovar',  level: 8, in: { beet: 2 },            time: 600,  xp: 4 },
  buchty:         { id: 'buchty',         building: 'pekarna',   level: 8, in: { mouka: 2, cukr: 1, vejce: 1 }, time: 900, xp: 7 },
};

// type: main (statek), storage (sklad), factory (výroba), pen (ohrada), machine (stroj), deco (ozdoba); max 0 = bez omezení
export const BUILDINGS = {
  statek:    { id: 'statek',    name: 'Statek',    type: 'main',    level: 1, cost: 0,   w: 3, h: 3, xp: 0,  max: 1, icon: 'house' },
  sklad:     { id: 'sklad',     name: 'Sklad',     type: 'storage', level: 1, cost: 0,   w: 2, h: 2, xp: 0,  max: 1, icon: 'barn' },
  sad:       { id: 'sad',       name: 'Sad',       type: 'orchard', level: 3, cost: 0,   w: 1, h: 1, xp: 1,  max: 0, icon: 'tree', info: 'Políčko pro ovocný strom.' },
  velkepole: { id: 'velkepole', name: 'Velké pole', type: 'bigfield', level: 5, cost: 0, w: 4, h: 4, xp: 5,  max: 0, icon: 'field', info: 'Pole, na kterém pracují stroje. Velikost si zvolíš.' },
  krmivarna: { id: 'krmivarna', name: 'Krmivárna', type: 'factory', level: 2, cost: 40,  w: 2, h: 2, xp: 4,  max: 1, icon: 'krmivo_slepice', color: '#6f9bd1' },
  pekarna:   { id: 'pekarna',   name: 'Pekárna',   type: 'factory', level: 2, cost: 60,  w: 2, h: 2, xp: 5,  max: 1, icon: 'chleb', color: '#d9734e' },
  mlekarna:  { id: 'mlekarna',  name: 'Mlékárna',  type: 'factory', level: 6, cost: 200, w: 2, h: 2, xp: 10, max: 1, icon: 'syr', color: '#9fb7c9' },
  mlyn:      { id: 'mlyn',      name: 'Mlýn',      type: 'factory', level: 4, cost: 120, w: 2, h: 2, xp: 6,  max: 1, icon: 'mouka', color: '#e8dcc0' },
  olejna:    { id: 'olejna',    name: 'Olejna',    type: 'factory', level: 6, cost: 250, w: 2, h: 2, xp: 8,  max: 1, icon: 'olej',  color: '#d9c25a' },
  cukrovar:  { id: 'cukrovar',  name: 'Cukrovar',  type: 'factory', level: 8, cost: 400, w: 2, h: 2, xp: 10, max: 1, icon: 'cukr',  color: '#b9c7d6' },
  kurnik:    { id: 'kurnik',    name: 'Kurník',    type: 'pen',     level: 3, cost: 50,  w: 2, h: 2, xp: 5,  max: 1, icon: 'hen', animal: 'slepice' },
  kravin:    { id: 'kravin',    name: 'Kravín',    type: 'pen',     level: 5, cost: 150, w: 3, h: 3, xp: 8,  max: 1, icon: 'cow', animal: 'krava' },
  ker:       { id: 'ker',       name: 'Keř',          type: 'deco', level: 1, cost: 10,  w: 1, h: 1, xp: 1, max: 0, icon: 'bush' },
  kvetiny:   { id: 'kvetiny',   name: 'Záhon květin', type: 'deco', level: 2, cost: 15,  w: 1, h: 1, xp: 1, max: 0, icon: 'flowers' },
  lavicka:   { id: 'lavicka',   name: 'Lavička',      type: 'deco', level: 3, cost: 30,  w: 1, h: 1, xp: 2, max: 0, icon: 'bench' },
  jablon:    { id: 'jablon',    name: 'Kvetoucí strom', type: 'deco', level: 4, cost: 40,  w: 1, h: 1, xp: 2, max: 0, icon: 'blossom' },
  fontana:   { id: 'fontana',   name: 'Fontána',      type: 'deco', level: 6, cost: 150, w: 1, h: 1, xp: 5, max: 0, icon: 'fountain' },
};
export const BUILDING_LIST = Object.values(BUILDINGS);

export const ANIMALS = {
  slepice: { id: 'slepice', name: 'Slepice', acc: 'slepici', home: 'kurnik', level: 3, cost: 20, feed: 'krmivo_slepice', product: 'vejce', time: 600,  xp: 2, max: 3, icon: 'hen' },
  krava:   { id: 'krava',   name: 'Kráva',   acc: 'krávu',   home: 'kravin', level: 5, cost: 60, feed: 'krmivo_kravy',   product: 'mleko', time: 1800, xp: 4, max: 3, icon: 'cow' },
};
export const ANIMAL_LIST = Object.values(ANIMALS);

// stroje z prodejny; speed = políček za minutu
export const MACHINES = {
  brazda60:  { id: 'brazda60',  name: 'Traktor Brázda 60',  type: 'tractor', level: 3, cost: 250,  speed: 6,  color: '#c8452d', icon: 'tractor', info: 'Seje na velkém poli, sklízí mrkev. Zaseje i všechna malá pole.' },
  brazda120: { id: 'brazda120', name: 'Traktor Brázda 120', type: 'tractor', level: 7, cost: 900,  speed: 12, color: '#2f6fb5', icon: 'tractor', info: 'Dvakrát rychlejší traktor.' },
  klas4:     { id: 'klas4',     name: 'Kombajn Klas 4',     type: 'combine', level: 5, cost: 600,  speed: 6,  color: '#4f9a3a', icon: 'combine', info: 'Sklízí obilí, kukuřici a sóju. Sklidí i všechna malá pole.' },
  klas8:     { id: 'klas8',     name: 'Kombajn Klas 8',     type: 'combine', level: 9, cost: 1800, speed: 12, color: '#d9b43b', icon: 'combine', info: 'Dvakrát rychlejší kombajn.' },
  pluh:      { id: 'pluh',      name: 'Pluh',               type: 'plow',    level: 5, cost: 300,  speed: 0,  color: '#8a8f96', icon: 'pluh', info: 'Zorá pole po sklizni. Zorané pole dá o 50 % větší úrodu. Táhne ho traktor.' },
  secka:     { id: 'secka',     name: 'Secí stroj',         type: 'seeder',  level: 6, cost: 500,  speed: 0,  color: '#3f7fbf', icon: 'secka', info: 'Traktor s ním seje dvakrát rychleji.' },
  lis:       { id: 'lis',       name: 'Lis na balíky',      type: 'baler',   level: 7, cost: 700,  speed: 0,  color: '#d9b43b', icon: 'lis', info: 'Po sklizni obilí slisuje slámu do balíků. Táhne ho traktor.' },
};
export const MACHINE_LIST = Object.values(MACHINES);

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
  { id: 'jobs',    name: 'Strojník',       stat: 'jobs',    tiers: [5, 50, 300],      coins: [80, 400, 1500], icon: 'tractor', text: 'Prací strojů na velkém poli' },
];
const STAT_KEYS = ['harvest', 'produce', 'animal', 'fruit', 'orders', 'sold', 'jobs'];

// výkupní cena se mění každé 4 hodiny (0,7× až 1,4×), stejně na serveru i v prohlížeči
export const MARKET_PERIOD = 4 * 3600 * 1000;
export function marketMult(id, now) {
  const period = Math.floor(now / MARKET_PERIOD);
  let h = 2166136261;
  for (const ch of id + ':' + period) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return Math.round((0.7 + (h % 1000) / 1000 * 0.7) * 100) / 100;
}
export const sellPrice = (id, now) => Math.max(1, Math.round(ITEMS[id].price * marketMult(id, now)));
export const nextMarketChange = now => (Math.floor(now / MARKET_PERIOD) + 1) * MARKET_PERIOD;

// den pro denní odměnu (středoevropský čas, zjednodušeně UTC+1)
export const dayKey = now => new Date(now + 3600000).toISOString().slice(0, 10);
export const MACHINE_TYPE_NAME = { tractor: 'traktor', combine: 'kombajn', plow: 'pluh', seeder: 'secí stroj', baler: 'lis' };
export const isVehicle = model => ['tractor', 'combine'].includes(MACHINES[model].type);

// celkové XP potřebné pro dosažení úrovně (index = úroveň)
export const LEVEL_XP = [0, 0, 10, 25, 45, 70, 100, 140, 190, 250, 320, 400, 500, 620, 760, 920];
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

const ANIMAL_PRODUCTS = new Set(['vejce', 'mleko']);
function statOf(id) {
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
export function hasInputs(farm, recipe) {
  return Object.entries(recipe.in).every(([id, n]) => have(farm, id) >= n);
}

export function maxPlots(level) {
  return PLOTS_PER_LEVEL * level;
}

export function plotPrice(farm) {
  const n = farm.plots.length;
  return n < FREE_PLOTS ? 0 : 15 + 5 * (n - FREE_PLOTS);
}

export function maxOrchards(level) {
  return level < 3 ? 0 : 2 * (level - 2);
}
export function orchardPrice(farm) {
  return 30 + 20 * countKind(farm, 'sad');
}

// stav stromu v sadu: 'empty' | 'growing' | 'ready' | 'dead'
export function treeState(obj, now) {
  if (!obj.tree) return { state: 'empty', progress: 0, left: 0 };
  if (obj.dead) return { state: 'dead', progress: 1, left: 0 };
  const t = TREES[obj.tree];
  if (now >= obj.readyAt) return { state: 'ready', progress: 1, left: 0 };
  const total = (obj.left === t.harvests ? t.first : t.regrow) * 1000;
  return { state: 'growing', progress: Math.max(0, 1 - (obj.readyAt - now) / total), left: Math.ceil((obj.readyAt - now) / 1000) };
}

// ---------- stroje a velké pole ----------
export const maxBigFields = level => (level < 5 ? 0 : 1 + Math.floor((level - 5) / 3));
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

// ---------- zakázky ----------
// deterministický generátor (stejný výsledek na serveru i v prohlížeči)
function rnd(farm) {
  farm.seed = (farm.seed * 16807) % 2147483647;
  return (farm.seed - 1) / 2147483646;
}

// co hráč na své úrovni umí získat
export function orderableItems(level) {
  const out = CROP_LIST.filter(c => c.level <= level).map(c => c.id);
  for (const r of Object.values(RECIPES)) if (r.level <= level && BUILDINGS[r.building].level <= level) out.push(r.id);
  for (const a of ANIMAL_LIST) if (a.level <= level) out.push(a.product);
  for (const t of TREE_LIST) if (t.level <= level) out.push(t.fruit);
  return [...new Set(out)];
}

function genOrder(farm, readyAt) {
  const pool = orderableItems(farm.level);
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
    coins: Math.round(value * (1.3 + rnd(farm) * 0.4)) + 2,   // o 30–70 % víc než výkup
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
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!landOwned(farm, xx, yy)) return false;
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
  const total = c.time * 1000;
  const elapsed = Math.max(0, now - plot.planted);
  if (elapsed >= total) return { state: 'ready', progress: 1, left: 0 };
  return { state: 'growing', progress: elapsed / total, left: Math.ceil((total - elapsed) / 1000) };
}

// fronta výroby: [{ r, start, end, state: 'waiting'|'working'|'done', progress, left }]
export function queueState(obj, now) {
  return (obj.queue || []).map(q => {
    const time = RECIPES[q.r].time * 1000;
    const start = q.end - time;
    if (now >= q.end) return { ...q, state: 'done', progress: 1, left: 0 };
    if (now < start) return { ...q, state: 'waiting', progress: 0, left: Math.ceil((q.end - now) / 1000) };
    return { ...q, state: 'working', progress: (now - start) / time, left: Math.ceil((q.end - now) / 1000) };
  });
}

// stav zvířete: 'hungry' | 'eating' | 'ready'
export function animalState(animal, def, now) {
  if (!animal.fed) return { state: 'hungry', progress: 0, left: 0 };
  const total = def.time * 1000;
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
  no_plot: 'Tady není pole.',
  not_empty: 'Pole už je osázené.',
  not_ready: 'Ještě to není hotové.',
  locked: 'Tohle odemkneš na vyšší úrovni.',
  no_coins: 'Nemáš dost mincí.',
  silo_full: 'Sklad je plný – něco prodej nebo ho rozšiř.',
  occupied: 'Tohle místo je obsazené.',
  out_of_farm: 'Tady už farma končí.',
  max_plots: 'Víc polí odemkneš na vyšší úrovni.',
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
  max_orchards: 'Víc sadů odemkneš na vyšší úrovni.',
  max_fields: 'Další velké pole odemkneš na vyšší úrovni.',
  bad_size: 'Velké pole může mít 3×3 až 6×6 políček.',
  owned: 'Tenhle stroj už máš.',
  machine_busy: 'Stroj právě pracuje na jiném poli.',
  claimed: 'Dnešní odměnu už máš. Přijď zítra!',
  land_owned: 'Tenhle pozemek už je tvůj.',
  land_far: 'Nejdřív kup sousední pozemek.',
  wrong_machine: 'Na tuhle plodinu potřebuješ jiný stroj.',
  not_empty_tree: 'V sadu už strom roste.',
  no_order: 'Tahle zakázka teď není.',
  missing: 'Na zakázku ti ještě něco chybí.',
};

// ---------- akce ----------
// Aplikuje akci na farmu (mění objekt). Vrací { ok, error?, gained? }.
export function applyAction(farm, a, now) {
  normalize(farm);
  if (!a || typeof a.type !== 'string') return fail('bad_action');
  switch (a.type) {
    case 'plant': {
      const p = findPlot(farm, a.x, a.y);
      if (!p) return fail('no_plot');
      if (p.crop) return fail('not_empty');
      const c = getCrop(a.crop);
      if (!c) return fail('bad_action');
      if (farm.level < c.level) return fail('locked');
      if (farm.coins < c.cost) return fail('no_coins');
      farm.coins -= c.cost;
      p.crop = c.id;
      p.planted = now;
      return { ok: true };
    }
    case 'harvest': {
      const p = findPlot(farm, a.x, a.y);
      if (!p || !p.crop) return fail('no_plot');
      if (plotState(p, now).state !== 'ready') return fail('not_ready');
      const c = CROPS[p.crop];
      if (siloFree(farm) < c.yield) return fail('silo_full');
      addItem(farm, c.id, c.yield);
      const levelUp = addXp(farm, c.xp);
      p.crop = null;
      p.planted = 0;
      return { ok: true, gained: { items: [{ item: c.id, qty: c.yield }], xp: c.xp, levelUp } };
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
        if (farm.coins < c.cost) break;
        farm.coins -= c.cost;
        p.crop = c.id; p.planted = now; n++;
      }
      if (!n) return fail('no_coins');
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
      if (farm.plots.length >= maxPlots(farm.level)) return fail('max_plots');
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
      if (!free) {
        if (d.type === 'storage') return fail('max_count');
        if (farm.level < d.level) return fail('locked');
        if (d.max && countKind(farm, d.id) >= d.max) return fail('max_count');
        if (d.type === 'orchard' && countKind(farm, 'sad') >= maxOrchards(farm.level)) return fail('max_orchards');
        if (d.type === 'bigfield' && countKind(farm, 'velkepole') >= maxBigFields(farm.level)) return fail('max_fields');
      }
      if (!fits(farm, a.x, a.y, w, h)) return fail('occupied');
      if (!free && farm.coins < cost) return fail('no_coins');
      if (free) farm.pending.splice(farm.pending.indexOf(d.id), 1);
      else farm.coins -= cost;
      const o = { id: farm.nextId++, kind: d.id, x: a.x, y: a.y };
      if (d.type === 'factory') o.queue = [];
      if (d.type === 'pen') o.animals = [];
      if (d.type === 'orchard') { o.tree = null; o.readyAt = 0; o.left = 0; o.dead = false; }
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
      if (o.queue.length >= QUEUE_SIZE) return fail('queue_full');
      if (!hasInputs(farm, r)) return fail('no_inputs');
      for (const [id, n] of Object.entries(r.in)) takeItem(farm, id, n);
      const last = o.queue.length ? o.queue[o.queue.length - 1].end : 0;
      o.queue.push({ r: r.id, end: Math.max(now, last) + r.time * 1000 });
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
          if (siloFree(farm) < 1) { full = true; break; }
          const q = o.queue.shift();
          addItem(farm, q.r, 1);
          items.push({ item: q.r, qty: 1 });
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
        fed++;
      }
      if (!fed) return fail('no_feed');
      return { ok: true, fed };
    }
    case 'buyAnimal': {
      const an = own(ANIMALS, a.animal);
      if (!an) return fail('bad_action');
      if (farm.level < an.level) return fail('locked');
      const home = farm.objects.find(o => o.kind === an.home && o.animals.length < an.max);
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
      if (farm.coins < t.cost) return fail('no_coins');
      farm.coins -= t.cost;
      o.tree = t.id; o.left = t.harvests; o.dead = false; o.readyAt = now + t.first * 1000;
      return { ok: true };
    }
    case 'harvestTree': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'orchard') return fail('no_object');
      if (treeState(o, now).state !== 'ready') return fail('not_ready');
      const t = TREES[o.tree];
      if (siloFree(farm) < t.yield) return fail('silo_full');
      addItem(farm, t.fruit, t.yield);
      const levelUp = addXp(farm, t.xp);
      o.left--;
      if (o.left > 0) o.readyAt = now + t.regrow * 1000; else o.dead = true;
      return { ok: true, gained: { items: [{ item: t.fruit, qty: t.yield }], xp: t.xp, levelUp }, dead: o.dead };
    }
    case 'clearTree': {
      const o = findObject(farm, a.id);
      if (!o || BUILDINGS[o.kind].type !== 'orchard' || !o.tree) return fail('no_object');
      if (!o.dead) return fail('not_ready');
      o.tree = null; o.dead = false; o.readyAt = 0; o.left = 0;
      return { ok: true };
    }
    case 'buyMachine': {
      const m = own(MACHINES, a.model);
      if (!m) return fail('bad_action');
      if (farm.level < m.level) return fail('locked');
      if (farm.machines.some(x => x.model === m.id)) return fail('owned');
      if (farm.coins < m.cost) return fail('no_coins');
      farm.coins -= m.cost;
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
      if (farm.coins < c.cost * cells) return fail('no_coins');
      farm.coins -= c.cost * cells;
      const sec = Math.ceil(jobSeconds(cells, m.model) / (hasTool(farm, 'seeder') ? 2 : 1));
      o.mult = o.soil === 'plowed' ? 1.5 : 1;
      o.soil = 'sown'; o.straw = false;
      o.crop = c.id;
      o.job = { type: 'sow', m: m.id, start: now, end: now + sec * 1000 };
      o.readyAt = o.job.end + c.time * 1000;
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
