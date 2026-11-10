// EKOfarm – herní pravidla. Sdílí je server (Worker) i prohlížeč.
// Čisté funkce bez DOM a bez přístupu k síti. Čas se vždy předává zvenku (ms).

export const RULES_VERSION = 4;
export const GRID_W = 17;
export const GRID_H = 17;
export const MAIN_POS = [7, 7];   // Statek 3×3 přesně uprostřed mřížky 17×17
export const START_COINS = 50;
export const SILO_START = 50;
export const SILO_STEP = 25;
export const QUEUE_SIZE = 3;
export const FREE_PLOTS = 6;        // prvních 6 polí je zdarma
export const PLOTS_PER_LEVEL = 6;   // s každou úrovní 6 dalších polí
export const ORDER_SLOTS = 6;
export const ORDER_WAIT = 3 * 60;   // s – nová zakázka po zrušení
export const START_PLOTS = [
  [11, 8], [12, 8], [13, 8],
  [11, 9], [12, 9], [13, 9],
];

// ---------- data ----------
// time = sekundy
export const CROPS = {
  wheat:  { id: 'wheat',  name: 'Pšenice',  level: 1, cost: 1, time: 60,   yield: 2, xp: 1, price: 3,  icon: '🌾' },
  corn:   { id: 'corn',   name: 'Kukuřice', level: 2, cost: 3, time: 300,  yield: 2, xp: 2, price: 8,  icon: '🌽' },
  carrot: { id: 'carrot', name: 'Mrkev',    level: 3, cost: 5, time: 600,  yield: 2, xp: 3, price: 12, icon: '🥕' },
  soy:    { id: 'soy',    name: 'Sója',     level: 5, cost: 8, time: 1200, yield: 2, xp: 4, price: 18, icon: '🫘' },
};
export const CROP_LIST = Object.values(CROPS);

export const PRODUCTS = {
  krmivo_slepice: { id: 'krmivo_slepice', name: 'Krmivo pro slepice', price: 12,  icon: '🥣' },
  krmivo_kravy:   { id: 'krmivo_kravy',   name: 'Krmivo pro krávy',   price: 26,  icon: '🧺' },
  vejce:          { id: 'vejce',          name: 'Vejce',              price: 22,  icon: '🥚' },
  mleko:          { id: 'mleko',          name: 'Mléko',              price: 45,  icon: '🥛' },
  chleb:          { id: 'chleb',          name: 'Chléb',              price: 25,  icon: '🍞' },
  kolac:          { id: 'kolac',          name: 'Koláč',              price: 60,  icon: '🥧' },
  smetana:        { id: 'smetana',        name: 'Smetana',            price: 60,  icon: '🍶' },
  syr:            { id: 'syr',            name: 'Sýr',                price: 110, icon: '🧀' },
};
export const FRUITS = {
  jablko:  { id: 'jablko',  name: 'Jablko',  price: 10, icon: '🍎' },
  hruska:  { id: 'hruska',  name: 'Hruška',  price: 14, icon: '🍐' },
  svestka: { id: 'svestka', name: 'Švestka', price: 12, icon: '🫐' },
  tresne:  { id: 'tresne',  name: 'Třešně',  price: 18, icon: '🍒' },
  merunka: { id: 'merunka', name: 'Meruňka', price: 20, icon: '🍑' },
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
};

// type: main (statek), storage (sklad), factory (výroba), pen (ohrada), machine (stroj), deco (ozdoba); max 0 = bez omezení
export const BUILDINGS = {
  statek:    { id: 'statek',    name: 'Statek',    type: 'main',    level: 1, cost: 0,   w: 3, h: 3, xp: 0,  max: 1, icon: '🏡' },
  sklad:     { id: 'sklad',     name: 'Sklad',     type: 'storage', level: 1, cost: 0,   w: 2, h: 2, xp: 0,  max: 1, icon: '🏚️' },
  sad:       { id: 'sad',       name: 'Sad',       type: 'orchard', level: 3, cost: 0,   w: 1, h: 1, xp: 1,  max: 0, icon: '🌳', info: 'Políčko pro ovocný strom.' },
  traktor:   { id: 'traktor',   name: 'Traktor',   type: 'machine', level: 3, cost: 250, w: 2, h: 2, xp: 5,  max: 1, icon: '🚜', info: 'Zaseje jednu plodinu na všechna prázdná pole najednou.' },
  kombajn:   { id: 'kombajn',   name: 'Kombajn',   type: 'machine', level: 5, cost: 500, w: 2, h: 2, xp: 8,  max: 1, icon: '🌾', info: 'Sklidí všechna zralá pole jedním klepnutím.' },
  krmivarna: { id: 'krmivarna', name: 'Krmivárna', type: 'factory', level: 2, cost: 40,  w: 2, h: 2, xp: 4,  max: 1, icon: '🥣', color: '#6f9bd1' },
  pekarna:   { id: 'pekarna',   name: 'Pekárna',   type: 'factory', level: 2, cost: 60,  w: 2, h: 2, xp: 5,  max: 1, icon: '🍞', color: '#d9734e' },
  mlekarna:  { id: 'mlekarna',  name: 'Mlékárna',  type: 'factory', level: 6, cost: 200, w: 2, h: 2, xp: 10, max: 1, icon: '🧀', color: '#9fb7c9' },
  kurnik:    { id: 'kurnik',    name: 'Kurník',    type: 'pen',     level: 3, cost: 50,  w: 2, h: 2, xp: 5,  max: 1, icon: '🐔', animal: 'slepice' },
  kravin:    { id: 'kravin',    name: 'Kravín',    type: 'pen',     level: 5, cost: 150, w: 3, h: 3, xp: 8,  max: 1, icon: '🐄', animal: 'krava' },
  ker:       { id: 'ker',       name: 'Keř',          type: 'deco', level: 1, cost: 10,  w: 1, h: 1, xp: 1, max: 0, icon: '🌳' },
  kvetiny:   { id: 'kvetiny',   name: 'Záhon květin', type: 'deco', level: 2, cost: 15,  w: 1, h: 1, xp: 1, max: 0, icon: '🌷' },
  lavicka:   { id: 'lavicka',   name: 'Lavička',      type: 'deco', level: 3, cost: 30,  w: 1, h: 1, xp: 2, max: 0, icon: '🪑' },
  jablon:    { id: 'jablon',    name: 'Kvetoucí strom', type: 'deco', level: 4, cost: 40,  w: 1, h: 1, xp: 2, max: 0, icon: '🍎' },
  fontana:   { id: 'fontana',   name: 'Fontána',      type: 'deco', level: 6, cost: 150, w: 1, h: 1, xp: 5, max: 0, icon: '⛲' },
};
export const BUILDING_LIST = Object.values(BUILDINGS);

export const ANIMALS = {
  slepice: { id: 'slepice', name: 'Slepice', acc: 'slepici', home: 'kurnik', level: 3, cost: 20, feed: 'krmivo_slepice', product: 'vejce', time: 600,  xp: 2, max: 3, icon: '🐔' },
  krava:   { id: 'krava',   name: 'Kráva',   acc: 'krávu',   home: 'kravin', level: 5, cost: 60, feed: 'krmivo_kravy',   product: 'mleko', time: 1800, xp: 4, max: 3, icon: '🐄' },
};
export const ANIMAL_LIST = Object.values(ANIMALS);

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
  if (!Array.isArray(farm.orders)) {
    farm.orders = [];
    for (let i = 0; i < ORDER_SLOTS; i++) farm.orders.push(genOrder(farm, 0));
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

function addItem(farm, id, n) { farm.silo[id] = (farm.silo[id] || 0) + n; }
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
export function objectAt(farm, x, y) {
  for (const o of farm.objects) {
    const d = BUILDINGS[o.kind];
    if (x >= o.x && x < o.x + d.w && y >= o.y && y < o.y + d.h) return o;
  }
  return null;
}

export function countKind(farm, kind) {
  return farm.objects.filter(o => o.kind === kind).length;
}

// je místo volné? (ignoreId = objekt, který se právě přesouvá)
export function fits(farm, x, y, w, h, ignoreId = 0) {
  if (!isInt(x) || !isInt(y) || x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  for (const p of farm.plots) if (p.x >= x && p.x < x + w && p.y >= y && p.y < y + h) return false;
  for (const o of farm.objects) {
    if (o.id === ignoreId) continue;
    const d = BUILDINGS[o.kind];
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
      if (!countKind(farm, 'traktor')) return fail('no_machine');
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
      if (!countKind(farm, 'kombajn')) return fail('no_machine');
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
      if (!fits(farm, a.x, a.y, 1, 1)) return fail(isInt(a.x) && isInt(a.y) && a.x >= 0 && a.y >= 0 && a.x < GRID_W && a.y < GRID_H ? 'occupied' : 'out_of_farm');
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
      farm.coins += a.qty * it.price;
      return { ok: true };
    }
    case 'place': {
      const d = getBuilding(a.kind);
      if (!d || d.type === 'main') return fail('bad_action');
      const free = farm.pending.includes(d.id);
      const cost = d.type === 'orchard' ? orchardPrice(farm) : d.cost;
      if (!free) {
        if (d.type === 'storage') return fail('max_count');
        if (farm.level < d.level) return fail('locked');
        if (d.max && countKind(farm, d.id) >= d.max) return fail('max_count');
        if (d.type === 'orchard' && countKind(farm, 'sad') >= maxOrchards(farm.level)) return fail('max_orchards');
      }
      if (!fits(farm, a.x, a.y, d.w, d.h)) return fail('occupied');
      if (!free && farm.coins < cost) return fail('no_coins');
      if (free) farm.pending.splice(farm.pending.indexOf(d.id), 1);
      else farm.coins -= cost;
      const o = { id: farm.nextId++, kind: d.id, x: a.x, y: a.y };
      if (d.type === 'factory') o.queue = [];
      if (d.type === 'pen') o.animals = [];
      if (d.type === 'orchard') { o.tree = null; o.readyAt = 0; o.left = 0; o.dead = false; }
      farm.objects.push(o);
      const levelUp = addXp(farm, d.xp);
      return { ok: true, id: o.id, gained: { items: [], xp: d.xp, levelUp } };
    }
    case 'move': {
      const o = findObject(farm, a.id);
      if (!o) return fail('no_object');
      const d = BUILDINGS[o.kind];
      if (d.type === 'main') return fail('fixed');
      if (!fits(farm, a.x, a.y, d.w, d.h, o.id)) return fail('occupied');
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
    case 'deliver': {
      const o = isInt(a.slot) ? farm.orders[a.slot] : null;
      if (!o || !orderReady(o, now)) return fail('no_order');
      if (!canDeliver(farm, o)) return fail('missing');
      for (const x of o.items) takeItem(farm, x.item, x.qty);
      farm.coins += o.coins;
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
