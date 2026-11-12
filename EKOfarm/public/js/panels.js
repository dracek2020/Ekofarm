// EKOfarm – obsah panelů (obchod, budova, ohrada, sklad). Vrací HTML; kliknutí obsluhuje main.js přes data-act.
import {
  ITEMS, ITEM_LIST, RECIPES, BUILDINGS, BUILDING_LIST, ANIMALS, ANIMAL_LIST,
  queueSize, penMax, upgradeCost, upgradeEffect, objLevel, statekLevel, MAX_BLD_LEVEL, garageSlots, vehicleCount,
  FISH_LIST, FISH_SIZES, fmtKg, weatherAt, WEATHER, pondStock, hiveStock, hiveFlowers, PRODUCTS,
  SEEDS, SAPLINGS, recipeQty, dailyQuests, questProgress, QUEST_TYPES, questBonus, MARKET_SLOTS, marketMaxPrice, marketBase, getItem,
  machinePrice, isVehicle, stallOffers, stallLeft, HELPER_PLANS, HELPER_LEVEL, helperActive, helperCapacity, helperInterval, CROP_CATS, getCrop,
  have, hasInputs, countKind, maxPlots, plotPrice, siloUsed, siloUpgradePrice, queueState, animalState,
  CROP_LIST, LEVEL_XP, MAX_LEVEL, plotState,
  TREES, TREE_LIST, FREE_PLOTS, maxOrchards, orchardPrice, treeState, treeRefund, orderReady, canDeliver,
  LAND_PARCELS, landPrice, landLevel, landReachable,
  DAILY, ACHIEVEMENTS, dayKey, sellPrice, marketMult, nextMarketChange, fieldYield, hasTool,
  MACHINES, MACHINE_LIST, MACHINE_TYPE_NAME, FIELD_CELL_PRICE, FIELD_MIN, FIELD_MAX, CROPS,
  maxBigFields, machineJob, freeMachine, fieldState, jobSeconds, hasMachine,
  VILL_MAX, AREA_MIN, workAreas, areaOf, isFarmer, isSeedItem, seedCap, seedUsed, SEEDS_PER, supplyPrice, villName, villJobType, villAt, findObject,
  workMs, TRADE_IV, PLAN_ROWS, nextTrade, tradeRound, planTotal, villLevel, villOut, speedMult, stockOf, keepOf, wpGet, wpWorkers, wpCap, areaCap, villMainLevel, villPower, OBOR, needLvl, MAX_VLVL,
  beds, teamCap, teamFree, repTier, repNext, adOffers, adWaitMs, statekMerits, TOWN_HOUSES,
} from './rules.js?v=30';
import { fmtTime } from './render.js?v=30';
import { TEAM } from './team-config.js?v=30';
import { NEWS } from './news.js?v=30';
import { assetUrl, hasAsset, spriteName } from './sprites.js?v=30';

const FRUITS_OF = it => !!TREE_LIST.find(t => t.fruit === it.id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// obrázek z herní grafiky (budova, zvíře…) pro karty v oknech
export const bImg = kind => { const n = spriteName({ kind, lvl: 1 }); return n && hasAsset('b', n) ? assetUrl('b', n) : null; };
const imgOr = (img, icon) => (img ? `<img src="${img}" alt="" decoding="async">` : `:${icon}:`);

// karta v mřížce: obrázek, název, údaje (velikost, cena, co potřebuje) a zelené tlačítko dole
// cta = text tlačítka; bez cta je karta jen klikací dlaždice jako dřív
function card({ icon, img, name, lines = [], locked, act, v, disabled, size, price, need, badge, cta, done }) {
  const cls = 'crop' + (cta ? ' card' : '') + (done ? ' done' : '') + (locked ? ' locked' : '') + (disabled ? ' dim' : '');
  const specs = size || price !== undefined
    ? `<div class="specs">${size ? `<span class="sz">${size}</span>` : ''}${price !== undefined ? `<span class="coin-chip">${price} :coin:</span>` : ''}</div>` : '';
  return `<button class="${cls}" data-act="${act}" data-v="${esc(v)}">
    ${badge ? `<span class="badge">${badge}</span>` : ''}
    <div class="ico${img ? ' pic' : ''}">${imgOr(img, icon)}</div><div class="nm">${esc(name)}</div>
    ${specs}${need ? `<div class="need">${need}</div>` : ''}
    ${lines.map(l => `<div class="meta">${l}</div>`).join('')}
    ${cta ? `<span class="cta">${cta}</span>` : ''}
  </button>`;
}
// záložky s ikonou: list = [[id, název, ikona], …]
const tabsHtml = (list, cur, act) => `<div class="tabs">${list.map(([id, n, icon]) =>
  `<button class="tab${id === cur ? ' on' : ''}" data-act="${act}" data-v="${id}">${icon ? `:${icon}: ` : ''}<span>${n}</span></button>`).join('')}</div>`;

export const SHOP_TABS = [['zvirata', 'Zvířata', 'hen'], ['farma', 'Farma', 'plot']];
export const BUILD_TABS = [['farma', 'Farma', 'plot'], ['vyrobny', 'Výrobny', 'chleb'], ['zvirata', 'Zvířata', 'cow'], ['ozdoby', 'Ozdoby', 'fountain']];
const BUILD_TAB_OF = { storage: 'farma', garage: 'farma', house: 'farma', factory: 'vyrobny', pen: 'zvirata', pond: 'zvirata', hive: 'zvirata', deco: 'ozdoby' };

const TYPE_ORDER = { storage: 0, house: 1, garage: 1, factory: 2, pen: 3, pond: 3, hive: 3, deco: 4 };
export const bedsText = n => (n === 1 ? '1 lůžko' : n >= 2 && n <= 4 ? `${n} lůžka` : `${n} lůžek`);
// zásluha pro Statek úrovně st krátce (pro zamčenou kartu ve Stavět)
const meritShort = st => { const m = TEAM.statek[st]; return m ? `${m.k === 'rep' ? `pověst ${m.n}` : `${TEAM.meritText[m.k].toLowerCase()} ${m.n}`}, úroveň ${m.player}` : ''; };
const nextSt = farm => `víc se statkem ${statekLevel(farm) + 1}`;

function fieldCards(farm) {
  const max = maxPlots(farm);
  const free = farm.plots.length < FREE_PLOTS;
  const tImg = n => (hasAsset('t', n) ? assetUrl('t', n) : null), sImg = n => (hasAsset('s', n) ? assetUrl('s', n) : null);
  const plotFull = farm.plots.length >= max;
  const plot = card({ icon: 'plot', img: tImg('pole_osete'), name: 'Pole', act: 'buyPlot', v: 'plot', disabled: plotFull || (!free && farm.coins < plotPrice(farm)),
    size: '1×1', price: free || plotFull ? undefined : plotPrice(farm),
    lines: plotFull ? [`${farm.plots.length}/${max} polí`, nextSt(farm)] : [free ? `:gift: zdarma (${FREE_PLOTS - farm.plots.length}×)` : `${farm.plots.length}/${max} polí`],
    cta: plotFull ? 'Plno' : free ? 'Zdarma' : 'Postavit' });
  const sadMax = maxOrchards(farm);
  const sadCount = countKind(farm, 'sad');
  const sad = card({ icon: 'tree', img: sImg('jablon_ready'), name: 'Sad', act: 'buy', v: 'sad',
    disabled: sadCount >= sadMax || farm.coins < orchardPrice(farm), size: '1×1', price: sadCount >= sadMax ? undefined : orchardPrice(farm),
    lines: [sadCount >= sadMax ? `${sadCount}/${sadMax} · ${nextSt(farm)}` : `${sadCount}/${sadMax} sadů`], cta: sadCount >= sadMax ? 'Plno' : 'Postavit' });
  const bfMax = maxBigFields(farm), bfCount = countKind(farm, 'velkepole');
  const bfLock = BUILDINGS.velkepole.st > statekLevel(farm);
  const big = card({ icon: 'field', img: tImg('pole'), name: 'Velké pole', act: 'buy', v: 'velkepole', locked: bfLock,
    disabled: !bfLock && bfCount >= bfMax, size: `${FIELD_MIN}–${FIELD_MAX}`,
    lines: bfLock ? ['pro stroje'] : bfCount >= bfMax ? [`${bfCount}/${bfMax} · ${nextSt(farm)}`] : [`${FIELD_CELL_PRICE} :coin: za políčko`],
    badge: bfLock ? `:lock: Statek ${BUILDINGS.velkepole.st}` : '', cta: bfLock ? `Statek úr. ${BUILDINGS.velkepole.st}` : bfCount >= bfMax ? 'Plno' : 'Postavit' });
  const left = LAND_PARCELS.filter(p => !farm.land.includes(p.id)).length;
  const land = card({ icon: 'sign', img: tImg('cedule'), name: 'Pozemky', act: 'openLand', v: '', disabled: !left,
    lines: left ? [`další za ${landPrice(farm)} :coin:`, `od úrovně ${landLevel(farm)}`] : ['vše koupeno'], cta: left ? 'Koupit' : 'Hotovo' });
  return [plot, sad, big, land];
}

// Stavět: budovy po záložkách, odemčené i zamčené (odemyká je jen úroveň Statku)
export function buildHtml(farm, tab = 'farma') {
  if (!BUILD_TABS.some(t => t[0] === tab)) tab = 'farma';
  const list = BUILDING_LIST.filter(b => BUILD_TAB_OF[b.type] === tab)
    .sort((a, b) => a.st - b.st || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.cost - b.cost);
  const cards = list.map(b => {
    const free = farm.pending.includes(b.id);
    const locked = !free && b.st > statekLevel(farm);
    const n = countKind(farm, b.id);
    const done = !free && b.max && n >= b.max;
    const cta = free ? 'Zdarma' : locked ? `Statek úr. ${b.st}` : done ? '✓ Postaveno' : 'Postavit';
    const own = done && farm.objects.find(o => o.kind === b.id);   // postavená budova: klepnutím se otevře (vylepšení)
    return card({ icon: b.icon, img: bImg(b.id), name: b.name, locked, act: own ? 'openObj' : 'buy', v: own ? own.id : b.id, done, disabled: !done && !free && farm.coins < b.cost,
      size: `${b.w}×${b.h}`, price: free || done ? undefined : b.cost, badge: locked ? `:lock: Statek ${b.st}` : n && b.max > 1 ? `${n}/${b.max}` : n && b.type === 'house' ? `${n}×` : '',
      lines: free ? [':gift: dostal jsi zdarma'] : locked && meritShort(b.st) ? [`<small>${meritShort(b.st)}</small>`] : b.beds ? [`:helper: ${bedsText(b.beds)}`] : [], cta });
  });
  const head = `<p class="muted">Statek úrovně <b>${statekLevel(farm)}</b>. Každé vylepšení Statku odemkne nové budovy a víc polí a sadů. Stroje a stánek najdeš dole v <b>městečku</b>.</p>
    <p class="tip">↔ <b>Přesun:</b> podrž prst na budově nebo poli a táhni. Potvrď ✓ dole.</p>`;
  return tabsHtml(BUILD_TABS, tab, 'btab') + (tab === 'farma' ? head : '') + `<div class="crops cards">${tab === 'farma' ? fieldCards(farm).join('') : ''}${cards.join('')}</div>`;
}

export function shopHtml(farm, tab) {
  const tabs = tabsHtml(SHOP_TABS, tab, 'tab');
  let cards = [];
  if (tab === 'zvirata') {
    cards = ANIMAL_LIST.map(a => {
      const locked = farm.level < a.level;
      const homes = farm.objects.filter(o => o.kind === a.home);
      const count = homes.reduce((n, o) => n + o.animals.length, 0);
      const cap = homes.reduce((n, o) => n + penMax(o), 0);
      const home = BUILDINGS[a.home];
      const hi = bImg(a.home);
      const need = `${hi ? `<img src="${hi}" alt="">` : `:${home.icon}:`}<span>Potřebuje<br><b>${esc(home.name)}</b></span><i class="${homes.length ? 'ok' : 'no'}">${homes.length ? '✓' : '✕'}</i>`;
      return card({ icon: a.icon, img: hasAsset('z', a.id) ? assetUrl('z', a.id) : null, name: a.name, locked, act: 'buyAnimal', v: a.id,
        disabled: !homes.length || count >= cap || farm.coins < a.cost, price: a.cost, need: locked ? '' : need,
        lines: locked ? [] : homes.length ? [`${count}/${cap} v ohradě`] : [], badge: locked ? `:lock: Úr. ${a.level}` : '',
        cta: locked ? `Úroveň ${a.level}` : !homes.length ? `Nejdřív ${home.name.toLowerCase()}` : count >= cap ? 'Ohrada plná' : ':cart: Koupit' });
    });
  } else {
    const max = maxPlots(farm);
    cards = [
      card({ icon: 'plot', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max,
        lines: farm.plots.length >= max ? [`${farm.plots.length}/${max} · ${nextSt(farm)}`] : [`${plotPrice(farm)} :coin:`, `${farm.plots.length}/${max} polí`] }),
      false && card({ icon: 'barn', name: 'Větší sklad', act: 'upgradeSilo', v: '', disabled: farm.coins < siloUpgradePrice(farm),
        lines: [`${siloUpgradePrice(farm)} :coin:`, `${farm.siloCap} → ${farm.siloCap + 25} míst`] }),
    ];
  }
  return tabs + `<div class="crops${tab === 'zvirata' ? ' cards' : ''}">${cards.join('')}</div>`;
}

function orderCard(farm, o, i, now) {
  if (!orderReady(o, now)) {
    return `<div class="order wait"><div class="ico">:truck:</div><small>Nová zakázka za<br><b>${fmtTime(Math.ceil((o.readyAt - now) / 1000))}</b></small></div>`;
  }
  const ok = canDeliver(farm, o);
  const items = o.items.map(x => `<button class="needi ${have(farm, x.item) >= x.qty ? 'okq' : 'miss'}" data-act="itemInfo" data-v="${x.item}">:${ITEMS[x.item].icon}:<b>${have(farm, x.item)}/${x.qty}</b></button>`).join('');
  return `<div class="order${ok ? ' ready' : ''}">
    <button class="del" data-act="discard" data-v="${i}" aria-label="Zrušit zakázku">✕</button>
    <div class="items">${items}</div>
    <div class="rew">${o.coins} :coin: · ${o.xp} :xp:</div>
    <button class="btn sm${ok ? '' : ' off'}" data-act="deliver" data-v="${i}">Doručit</button>
  </div>`;
}

// ---------- deník farmáře: co je která surovina, kde ji získat a k čemu je ----------
const isFeed = id => id.startsWith('krmivo_');
const WIKI_ANIMAL = new Set(ANIMAL_LIST.map(a => a.product).concat('plast'));
export const WIKI_TABS = [['plodiny', 'Plodiny', 'wheat'], ['ovoce', 'Ovoce', 'jablko'], ['zvirata', 'Zvířata', 'vejce'], ['vyrobky', 'Výrobky', 'chleb'], ['ryby', 'Ryby', 'kapr'], ['zasoby', 'Zásoby', 's_wheat']];
function wikiCat(id) {
  if (CROPS[id]) return 'plodiny';
  if (TREE_LIST.some(t => t.fruit === id)) return 'ovoce';
  if (FISH_LIST.some(f => f.id === id)) return 'ryby';
  if (isSeedItem(id)) return 'zasoby';
  if (WIKI_ANIMAL.has(id) || isFeed(id)) return 'zvirata';
  return 'vyrobky';
}
// odkud surovina je a od jaké úrovně ji jde mít
export function itemInfo(farm, id) {
  const it = ITEMS[id];
  const src = [], use = [];
  const lvls = [];            // úroveň = nejdřívější cesta, jak surovinu získat
  const lv = l => lvls.push(l || 1);
  const go = x => `<button class="chip" data-act="itemInfo" data-v="${x}">:${ITEMS[x].icon}: ${esc(ITEMS[x].name)}</button>`;
  const c = CROPS[id];
  if (c) { src.push(`:plot: Roste na <b>poli</b> – sklizeň za ${fmtTime(c.time)}, ${c.yield} ks z políčka.`); lv(c.level); }
  const tr = TREE_LIST.find(t => t.fruit === id);
  if (tr) { src.push(`:tree: Ovocný strom <b>${esc(tr.name)}</b> v sadu (${tr.harvests}× úroda po ${tr.yield} ks).`); lv(tr.level); }
  const an = ANIMAL_LIST.find(a => a.product === id);
  if (an) { src.push(`:${an.icon}: Dává ho <b>${esc(an.name)}</b> v budově ${esc(BUILDINGS[an.home].name)} – nakrm ji ${go(an.feed)}`); lv(an.level); }
  if (id === 'plast') src.push(':hive: Sbírají ho včely ve <b>Včelíně</b> (kvetoucí sad nebo květiny poblíž pomůžou).');
  if (id === 'slama') src.push(':field: Zbyde na <b>velkém poli</b> po sklizni obilí – slisuje ji <b>Lis</b>.');
  const fsh = FISH_LIST.find(f => f.id === id);
  if (fsh) { src.push(`:pond: Chytíš ho na udici v <b>rybníku</b> (potřebuješ ${go('navnada')}).`); lv(fsh.level); }
  const r = RECIPES[id];
  if (r) {
    const b = BUILDINGS[r.building];
    src.push(`:${b.icon}: Vyrábí <b>${esc(b.name)}</b>${recipeQty(r) > 1 ? ` (${recipeQty(r)} ks najednou)` : ''} z: ${Object.entries(r.in).map(([x, n]) => `${n}× ${go(x)}`).join(' ')} – ${fmtTime(r.time)}.${b.st > 1 ? ` Budova od Statku úrovně ${b.st}.` : ''}`);
    lv(r.level);
  }
  if (supplyPrice({ level: 999 }, id) !== null) src.push(`:stall: Koupíš ve <b>Stánku</b> v městečku (záložka Zásoby) za ${supplyPrice({ level: 999 }, id)} :coin:.`);
  // k čemu je
  const rs = Object.values(RECIPES).filter(x => x.in[id]);
  if (rs.length) use.push(`<b>Vyrobíš z toho:</b><div class="chips">${rs.map(x => go(x.id)).join('')}</div>`);
  const eats = ANIMAL_LIST.filter(a => a.feed === id);
  if (eats.length) use.push(`<b>Krmivo pro:</b> ${eats.map(a => `:${a.icon}: ${esc(a.name)}`).join(', ')}`);
  if (SEEDS[id]) use.push(`<b>Osivo:</b> zasadíš ${go(SEEDS[id].seed)} bez placení mincemi. Ukládá se do zásob ve Statku.`);
  if (SAPLINGS[id]) use.push(`<b>Sazenice:</b> zasadíš strom ${esc(TREES[SAPLINGS[id].sapling].name)} v sadu. Ukládá se do zásob ve Statku.`);
  if (id === 'navnada') use.push('<b>Návnada</b> na rybaření – na každý nához jedna.');
  if (!isSeedItem(id)) use.push(`Prodáš ve Skladu (teď za ${sellPrice(id, Date.now())} :coin:), hodí se do zakázek a na vylepšení budov.`);
  return { it, src, use, level: lvls.length ? Math.min(...lvls) : 1, cat: wikiCat(id) };
}
export function wikiHtml(farm, tab = 'plodiny') {
  if (!WIKI_TABS.some(t => t[0] === tab)) tab = 'plodiny';
  const list = ITEM_LIST.filter(it => wikiCat(it.id) === tab).map(it => ({ it, lvl: itemInfo(farm, it.id).level })).sort((a, b) => a.lvl - b.lvl);
  const tiles = list.map(({ it, lvl }) => {
    const locked = farm.level < lvl, n = have(farm, it.id);
    return `<button class="witem${locked ? ' locked' : ''}" data-act="itemInfo" data-v="${it.id}">
      <span class="ico">:${it.icon}:${n ? `<i class="n">${n}</i>` : ''}</span><b>${esc(it.name)}</b>
      <small>${locked ? `:lock: od úrovně ${lvl}` : n ? `máš ${n}` : '&nbsp;'}</small></button>`;
  }).join('');
  return `<p class="muted">Všechny suroviny na farmě. Klepni na kteroukoli a uvidíš, kde ji získáš a k čemu je. Zamčené se otevřou na uvedené úrovni.</p>
    ${tabsHtml(WIKI_TABS, tab, 'wtab')}<div class="wgrid">${tiles}</div>`;
}
export function itemHtml(farm, id, back) {
  const info = itemInfo(farm, id);
  const locked = farm.level < info.level;
  return `${back ? '<button class="btn sm alt back" data-act="itemBack">← Zpět</button>' : ''}
    <div class="wdet"><span class="ico">:${info.it.icon}:</span><div><b>${esc(info.it.name)}</b>
      <small>${locked ? `:lock: Otevře se na úrovni <b>${info.level}</b> (máš ${farm.level}).` : `Máš <b>${have(farm, id)}</b>${isSeedItem(id) ? ' v zásobách Statku' : ' ve Skladu'}.`}</small></div></div>
    <div class="sect">Kde to získáš</div>${info.src.length ? info.src.map(s => `<p class="wline">${s}</p>`).join('') : '<p class="muted">Jen v zakázkách a na tržišti.</p>'}
    <div class="sect">K čemu je</div>${info.use.map(s => `<p class="wline">${s}</p>`).join('')}
    <button class="btn alt" data-act="openWiki">:book: Celý deník farmáře</button>`;
}

// ---------- Farmářský tým: pracovníci, tabulky práce, nástěnka, domky ----------
const VILL_WHAT = {
  factory: 'vyrábí podle plánu: suroviny bere ze skladu, hotové nosí do skladu',
  pen: 'krmí zvířata krmivem ze skladu a sbírá, co dají',
  hive: 'vybírá plástve a nosí je do skladu',
  trader: 'na trhu prodává zboží ze skladu podle plánu',
};
const num = x => String(Math.round(x * 100) / 100).replace('.', ',');
const secText = ms => (ms < 60000 ? `${num(ms / 1000)} s` : fmtTime(Math.round(ms / 1000)));
const clock = t => new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const cellOf = (farm, id) => farm.plots.find(p => p.id === id) || findObject(farm, id);
// co vesničan právě dělá (v.job), nebo na co čeká (v.w)
function villDoing(farm, v, type) {
  const j = v.job;
  if (j) {
    const c = cellOf(farm, j.id);
    switch (j.k) {
      case 'harvest': return c && c.crop ? `Sklízí :${CROPS[c.crop].icon}: ${CROPS[c.crop].name.toLowerCase()}` : 'Sklízí';
      case 'plant': return CROPS[j.x] ? `Sází :${CROPS[j.x].icon}: ${CROPS[j.x].name.toLowerCase()}` : 'Sází';
      case 'pick': return c && c.tree ? `Trhá :${ITEMS[TREES[c.tree].fruit].icon}: ${ITEMS[TREES[c.tree].fruit].name.toLowerCase()}` : 'Trhá ovoce';
      case 'dig': return 'Vykopává suchý strom';
      case 'sapling': return TREES[j.x] ? `Sází :z_${j.x}: ${TREES[j.x].name.toLowerCase()}` : 'Sází strom';
      case 'haul': return 'Nese hotové do skladu';
      case 'load': return ITEMS[j.x] ? `Chystá výrobu: :${ITEMS[j.x].icon}: ${ITEMS[j.x].name.toLowerCase()}` : 'Chystá výrobu';
      case 'feed': return 'Krmí zvířata';
      case 'gather': return 'Sbírá od zvířat';
      case 'comb': return 'Vybírá plástve';
    }
  }
  switch (v.w) {
    case 'plan': return type === 'trader' ? 'Nemá co prodávat – přidej zboží do plánu' : type === 'factory' ? 'Nemá co vyrábět – přidej výrobek nebo cíl do plánu' : 'Nemá co sázet – přidej něco do plánu';
    case 'seeds': return type === 'sad' ? 'Ve Statku došly sazenice' : 'Ve Statku došla semena';
    case 'inputs': return 'Čeká na suroviny ve skladu';
    case 'feed': return 'Ve skladu došlo krmivo';
    case 'full': return 'Nemá kam dát hotové – sklad je plný';
    case 'limit': return 'Cílové zásoby jsou splněné – čeká, až ubudou';
    case 'empty': return 'V ohradě nejsou zvířata';
    case 'free': return 'Nemá práci';
    case 'skill': return 'Na nic z plánu ještě nemá praxi – přidej jednodušší věc';
    case 'rest': return type === 'pole' || type === 'sad' ? 'Všechno roste – čeká, až něco dozraje' : type === 'factory' ? 'Výroba běží – čeká na hotové' : type === 'pen' ? 'Zvířata jsou nakrmená – čeká' : 'Čeká na plástve';
  }
  return 'Rozhlíží se po práci';
}
// řádek „co právě dělá“ s průběhem úkonu
function villStatus(farm, v, type, now) {
  if (type === 'trader' && planTotal((findObject(farm, v.at) || {}).plan) > 0) {
    const left = Math.max(0, Math.ceil((nextTrade(now) - now) / 1000));
    return `<div class="vstat work"><span>:market: Další trh za <b>${fmtTime(left)}</b></span><div class="bar"><div style="width:${(100 - 100 * left * 1000 / TRADE_IV).toFixed(1)}%"></div></div></div>`;
  }
  if (type === 'trader') return '<div class="vstat warn"><span>⚠ Nemá co prodávat – přidej zboží do plánu</span></div>';
  const j = v.job, text = villDoing(farm, v, type);
  if (j) {
    const pr = Math.max(0, Math.min(1, (now - j.s) / Math.max(1, j.e - j.s)));
    return `<div class="vstat work"><span>${text}</span><div class="bar"><div style="width:${(100 * pr).toFixed(1)}%"></div></div></div>`;
  }
  const bad = ['plan', 'seeds', 'inputs', 'feed', 'full', 'empty'].includes(v.w);
  return `<div class="vstat ${bad ? 'warn' : 'wait'}"><span>${bad ? '⚠ ' : ''}${text}</span>${v.w === 'seeds' ? '<button class="chip" data-act="openStall">dokoupit</button>' : ''}</div>`;
}
// úroveň pracovníka v oboru: L/12, pruh zkušeností do další úrovně, výkon
function lvlLine(v, obor) {
  const L = villLevel(v, obor), xp = (v.xp && v.xp[obor]) || 0;
  const lo = TEAM.xpLvl[L], hi = TEAM.xpLvl[L + 1];
  const pct = hi ? Math.min(100, 100 * (xp - lo) / (hi - lo)) : 100;
  return `<div class="lvl"><span>:star: úroveň <b>${L}</b>/${MAX_VLVL} · výkon ×${num(villPower(v, obor))}</span>
    <div class="bar"><div style="width:${pct.toFixed(0)}%"></div></div><small>${hi ? `${num(Math.floor(xp))} / ${num(hi)} zkušeností` : 'nejvyšší úroveň'}</small></div>`;
}
const profOf = v => TEAM.profs[v.prof] || TEAM.profs.vyroba;
const traitText = t => (TEAM.traits[t] ? `<b>${TEAM.traits[t].name}</b> – ${TEAM.traits[t].text}` : 'bez zvláštní vlastnosti');
const whoLine = v => `:${profOf(v).icon}: <b>${esc(villName(v))}</b> · ${profOf(v).name}`;
// přepínač −/+ : data-v = základ|směr (dvojtečky by iconize() v atributu změnilo na ikonu)
const step = (act, base, text, lo = true, hi = true) => `<span class="stepper"><button data-act="${act}" data-v="${base}|-1"${lo ? '' : ' disabled'}>−</button><b>${text}</b><button data-act="${act}" data-v="${base}|1"${hi ? '' : ' disabled'}>+</button></span>`;
// řádek plánu: ikona, název, procenta (posuvník po 5 % a −/+), ✕, pod tím údaje a případně druhý přepínač (rezerva)
// max = kolik procent řádek smí mít (do 100 % s ostatními); need = potřebná úroveň, kterou pracovník nemá → šedý řádek
function planRow(w, key, icon, name, meta, pct, max, second = '', need = 0) {
  return `<div class="prow${need ? ' dim' : ''}"><button class="ico" data-act="itemInfo" data-v="${ITEMS[key] ? key : ''}">:${icon}:</button>
    <b class="pn">${esc(name)}</b>
    ${step('planPct', `${w}|${key}`, `<span class="pv">${pct}</span> %`, pct > 5, pct < max)}
    <button class="del" data-act="planDel" data-v="${w}|${key}" aria-label="Vyřadit z plánu">✕</button>
    <input class="pslide" type="range" min="0" max="100" step="5" value="${pct}" data-w="${w}" data-key="${key}" data-max="${max}" aria-label="Procenta">
    <small class="pm">${need ? `<b class="miss">umí až od úrovně ${need}</b> · ` : ''}${meta}</small>
    ${second ? `<div class="p2">${second}</div>` : ''}</div>`;
}
// nabídka „přidat“: [id, ikona, název, potřebná úroveň]
const addChips = (w, list, label, L, act = 'planAdd') => (list.length ? `<small><b>${label}</b></small><div class="chips">${list.map(([id, icon, n, need]) =>
  `<button class="chip${need > L ? ' dim' : ''}" data-act="${act}" data-v="${w}|${id}">+ :${icon}: ${esc(n)}${need > L ? ` · úr. ${need}` : ''}</button>`).join('')}</div>` : '');
// souhrn procent: výrobna – využití času (a přepínač přerozdělení), oblast – kolik oblasti je v plánu
function useLine(w, sum, auto, factory) {
  const idle = 100 - sum;
  const txt = factory
    ? (sum >= 100 ? 'Využito <b>100 %</b> výrobního času' : auto ? `Využito <b>${sum} %</b> · zbylých ${idle} % se rozdělí mezi výrobky v plánu` : `Využito <b>${sum} %</b> · <b class="miss">${idle} % času budova stojí</b>`)
    : (sum >= 100 ? 'Rozděleno <b>100 %</b> oblasti' : `Rozděleno <b>${sum} %</b> · ${idle} % oblasti nechá ležet ladem`);
  return `<div class="psum${sum >= 100 ? ' full' : ''}"><div class="bar"><div style="width:${Math.min(100, sum)}%"></div></div><small>${txt}</small>
    ${factory && sum < 100 ? `<button class="chip${auto ? ' on' : ''}" data-act="planAuto" data-v="${w}">${auto ? '✓ ' : ''}Přerozdělit nevyužité</button>` : ''}</div>`;
}
const rate = x => (x >= 10 ? String(Math.round(x)) : num(Math.round(x * 10) / 10));
const hourText = h => { const d = new Date(h * 3600000).getHours(); return `${d}–${(d + 1) % 24} h`; };

// plán výrobny: cílové zásoby (přednost, v pořadí) a podíl výrobního času v procentech; odhad za hodinu a přehled výroby
function factoryPlan(farm, o, ws) {
  const w = 'b' + o.id, plan = o.plan || {}, sum = planTotal(plan), T = o.target || [];
  const L = ws.length ? Math.max(...ws.map(x => villLevel(x, 'vyroba'))) : 99;
  const out = ws.reduce((a, x) => a + villOut(x, 'vyroba'), 0);   // kusů na jednu dávku
  const inBld = Object.values(RECIPES).filter(r => r.building === o.kind && farm.level >= r.level);
  const perH = id => { const r = RECIPES[id]; return out && sum ? plan[id] / (o.auto ? sum : 100) * 3600 / (r.time * speedMult(o)) * out * recipeQty(r) : 0; };
  const tg = T.filter(([id]) => RECIPES[id]).map(([id, n], i) => {
    const it = ITEMS[id], s = stockOf(farm, o, id), need = needLvl(RECIPES[id].level);
    return `<div class="prow tg${need > L ? ' dim' : ''}"><span class="ord"><button data-act="tgtUp" data-v="${w}|${id}|-1"${i ? '' : ' disabled'} aria-label="Výš">▲</button><button data-act="tgtUp" data-v="${w}|${id}|1"${i < T.length - 1 ? '' : ' disabled'} aria-label="Níž">▼</button></span>
      <button class="ico" data-act="itemInfo" data-v="${id}">:${it.icon}:</button><b class="pn">${esc(it.name)}</b>
      ${step('tgtN', `${w}|${id}`, `${n} ks`, n > 1)}
      <button class="del" data-act="tgtDel" data-v="${w}|${id}" aria-label="Vyřadit cíl">✕</button>
      <small class="pm">${need > L ? `<b class="miss">umí až od úrovně ${need}</b> · ` : ''}má <b>${s}</b>${s >= n ? ' · <b class="okc">✓ splněno</b>' : ` · chybí ${n - s}`} · potřebuje <span class="ings">${ingredients(farm, RECIPES[id])}</span></small></div>`;
  }).join('');
  const tgAdd = inBld.filter(r => !T.some(x => x[0] === r.id)).map(r => [r.id, ITEMS[r.id].icon, ITEMS[r.id].name, needLvl(r.level)]);
  const rows = Object.keys(plan).filter(id => RECIPES[id]).map(id => {
    const r = RECIPES[id], it = ITEMS[id], ph = perH(id), need = needLvl(r.level);
    const meta = `${isSeedItem(id) ? 've Statku' : 've skladu'} <b>${have(farm, id)}</b>${ph ? ` · asi <b>${rate(ph)}</b> za hodinu` : ''} · potřebuje <span class="ings">${ingredients(farm, r)}</span>`;
    return planRow(w, id, it.icon, it.name, meta, plan[id], 100 - (sum - plan[id]), '', need > L ? need : 0);
  }).join('');
  const add = inBld.filter(r => !(r.id in plan)).map(r => [r.id, ITEMS[r.id].icon, ITEMS[r.id].name, needLvl(r.level)]);
  const log = (o.log || []).slice().reverse().map(([h, m]) => `<small><b>${hourText(h)}</b> ${Object.entries(m).map(([id, n]) => `${n}× :${ITEMS[id] ? ITEMS[id].icon : 'box'}:`).join(' ')}</small>`).join('');
  return `<small><b>Cílové zásoby</b> – mají přednost. Vyrábí se, dokud jich není tolik (sklad + výroba), v pořadí shora:</small>
    ${tg || '<small class="muted">Žádný cíl – třeba „mít pořád 20 mouky“.</small>'}
    ${T.length < PLAN_ROWS ? addChips(w, tgAdd, 'Přidat cíl:', L, 'tgtAdd') : ''}
    <small><b>Podíl výrobního času</b> – zbytek času se dělí podle procent:</small>
    ${rows || '<small class="muted">Procenta zatím nejsou. Vyber, co vyrábět:</small>'}
    ${rows ? useLine(w, sum, !!o.auto, true) : ''}
    ${Object.keys(plan).length < PLAN_ROWS ? addChips(w, add, rows ? 'Přidat výrobek:' : '', L) : ''}
    ${ws.length ? `<small class="muted">Na úrovni ${L} naloží najednou asi ${num(out)} ${out < 2 ? 'kus' : 'kusů'} – výroba trvá stejně dlouho, jen je jí víc. Na suroviny v rezervě skladu nesáhne.</small>`
      : '<small class="muted">Bez pracovníka se podle plánu nevyrábí – plán ale můžeš připravit předem.</small>'}
    ${log ? `<small><b>Vyrobeno za posledních ${TEAM.logH} h</b></small><div class="plog">${log}</div>` : ''}`;
}
// plán skladu: kolik procent zásoby prodat na jednom trhu; rezerva ve skladu (platí pro celý tým)
function traderPlan(farm, o, ws, now) {
  const w = 'b' + o.id, plan = o.plan || {}, v = ws[0];
  const L = v ? villLevel(v, 'sklad') : 0, rowsMax = v ? TEAM.trade.rows[L] : 0, bonus = v ? TEAM.trade.bonus[L] : 0;
  const tr = v ? tradeRound(farm, v, nextTrade(now)) : null;
  const next = new Map((tr ? tr.rows : []).map(r => [r.item, r]));
  let i = 0;
  const rows = Object.keys(plan).filter(id => ITEMS[id] && !isSeedItem(id) && plan[id] > 0).map(id => {
    const it = ITEMS[id], r = next.get(id), keep = keepOf(farm, id), over = v && i++ >= rowsMax;
    const meta = `ve skladu <b>${have(farm, id)}</b>${r ? ` · příště prodá <b>${r.n}</b> ks${r.n ? ` za ${r.coins} :coin:` : ''}` : over ? ' · <b class="miss">tolik druhů zvládne až zkušenější skladník</b>' : ''}`;
    return planRow(w, id, it.icon, it.name, meta, plan[id], 100, `<span>rezerva ve skladu</span>${step('keepN', id, `${keep} ks`, keep > 0)}`, over ? L + 1 : 0);
  }).join('');
  const add = ITEM_LIST.filter(it => have(farm, it.id) > 0 && !isSeedItem(it.id) && !(it.id in plan)).map(it => [it.id, it.icon, it.name, 0]);
  const last = v && v.last ? `<small class="muted">Poslední trh v ${clock(v.last.t)}: ${v.last.it.map(([id, n]) => `${n}× :${ITEMS[id] ? ITEMS[id].icon : 'coin'}:`).join(' ')} → <b>+${v.last.c} :coin:</b></small>` : '';
  return `<small><b>Co prodávat</b> – kolik procent zásoby nad rezervou jde na každý trh:</small>
    ${rows || '<small class="muted">Plán je prázdný. Vyber, co prodávat:</small>'}
    ${rows && tr ? `<div class="psum${tr.want > tr.cap ? ' full' : ''}"><small>Příští trh: <b>${tr.n} ks</b> za <b>${tr.coins} :coin:</b>${bonus ? ` (cena +${bonus} %)` : ''}${tr.want > tr.cap ? ` · chtěl by prodat ${tr.want} ks, unese jen ${tr.cap} – krátí poměrně` : ` · unese až ${tr.cap} ks`} · zvládne ${rowsMax} druhů</small></div>` : ''}
    ${Object.keys(plan).length < TEAM.trade.rows[MAX_VLVL] ? addChips(w, add, rows ? 'Přidat zboží:' : '', 99) : ''}
    ${v ? '' : '<small class="muted">Bez skladníka se neprodává – plán ale můžeš připravit předem.</small>'}
    <small class="muted">Rezerva platí pro celý tým: na tolik kusů nesáhne výroba ani prodej. Všechny rezervy najdeš i ve Skladu.</small>
    ${last}${v ? `<small class="muted">${esc(villName(v))} celkem prodal ${v.sold || 0} ks a vydělal ${v.earned || 0} :coin:.</small>` : ''}`;
}
// volní pracovníci – nejdřív ti, jejichž profese se k práci hodí
const freeWorkers = (farm, obor) => farm.vill.filter(x => !x.at && !x.area).sort((a, b) => (b.prof === obor) - (a.prof === obor) || villLevel(b, obor) - villLevel(a, obor));
const assignChips = (farm, obor, val, label = 'Přiřadit:') => {
  const free = freeWorkers(farm, obor);
  return free.length
    ? `<small><b>${label}</b></small><div class="chips">${free.map(x => `<button class="chip${x.prof === obor ? ' on' : ''}" data-act="${val(x)[0]}" data-v="${val(x)[1]}">:${profOf(x).icon}: ${esc(villName(x))} · úr. ${villLevel(x, obor)}${x.prof === obor ? '' : ' (mimo profesi)'}</button>`).join('')}</div>`
    : label === 'Přiřadit:' ? `<small class="muted">Nemáš volného pracovníka.</small><div class="hire"><button class="btn sm" data-act="openBoard">:sign: Hledat na nástěnce</button><button class="btn sm alt" data-act="openTeam">:helper: Tým</button></div>` : '';
};
// jeden pracovník na pracovišti: kdo, úroveň, co dělá, detail / odvolat
const personCard = (farm, v, type, obor, now, freeAct, note = '') => `<div class="who"><b>${whoLine(v)} <small class="muted">hotovo ${v.n || 0}×</small></b>
  ${lvlLine(v, obor)}${villStatus(farm, v, type, now)}${note ? `<small class="muted">${note}</small>` : ''}
  <div class="hire"><button class="btn sm alt" data-act="teamSel" data-v="${v.id}">Detail</button><button class="btn sm alt" data-act="${freeAct}" data-v="${v.id}">Odvolat</button></div></div>`;
// blok „Pracovník“ v okně budovy: kdo tu pracuje (místa podle kapacity), přiřadit / vystřídat, plán pracoviště
export function workerBlock(farm, o, now = Date.now()) {
  const type = villJobType(o.kind);
  if (!type) return '';
  const wp = { o, g: null, type }, ws = wpWorkers(farm, wp), cap = wpCap(wp), obor = OBOR[type];
  const head = cap > 1 ? `Pracovníci ${ws.length}/${cap}` : type === 'trader' ? 'Skladník' : 'Pracovník';
  const people = ws.map(v => personCard(farm, v, type, obor, now, 'villFree')).join('');
  const slots = ws.length < cap ? assignChips(farm, obor, x => ['villAssign', `${x.id}|${o.id}|0`])
    : assignChips(farm, obor, x => ['villAssign', `${x.id}|${o.id}|${ws[ws.length - 1].id}`], `Vystřídat ${esc(villName(ws[ws.length - 1]))}:`);
  const v = ws[0];
  const what = !v ? `<small class="muted">Pracovník tu ${VILL_WHAT[type]}. ${cap > 1 ? `Vejde se sem ${cap} lidí.` : 'Zatím je tu místo pro jednoho.'}</small>`
    : type === 'pen' || type === 'hive' ? `<small class="muted">${VILL_WHAT[type][0].toUpperCase() + VILL_WHAT[type].slice(1)} – pořád dokola, jak je co hotové.${type === 'pen' ? ` Z jednoho krmení dá zvíře ${num(TEAM.penYield[villLevel(v, 'chov')])}× víc.` : ''}</small>` : '';
  const table = type === 'factory' ? factoryPlan(farm, o, ws) : type === 'trader' ? traderPlan(farm, o, ws, now) : '';
  return `<div class="sect">${head}</div><div class="upg worker">${what}${people}${slots}</div>
    ${table ? `<div class="sect">${type === 'trader' ? 'Plán prodeje' : 'Plán výroby'}</div><div class="upg worker plan">${table}</div>` : ''}`;
}

// ---------- obrazovka Farmářský tým ----------
// všechna pracoviště: oblasti polí a sadů a budovy, kde jde pracovat
function workplaces(farm) {
  const out = [], areas = workAreas(farm);
  for (const g of areas) out.push({ k: 'a', kind: g.kind, id: g.ids[0], name: `${g.kind === 'pole' ? 'Pole' : 'Sad'} – oblast ${g.n}`, icon: g.kind === 'pole' ? 'plot' : 'tree', obor: 'pole', ws: wpWorkers(farm, { o: null, g }, areas), cap: areaCap(g) });
  for (const o of farm.objects) {
    const t = villJobType(o.kind), wp = { o, g: null, type: t };
    if (t) out.push({ k: 'b', id: o.id, name: BUILDINGS[o.kind].name, icon: BUILDINGS[o.kind].icon, obor: OBOR[t], ws: wpWorkers(farm, wp), cap: wpCap(wp) });
  }
  return out;
}
// kde pracovník je (text) a typ práce pro villDoing
function placeOf(farm, v) {
  if (v.area) { const g = areaOf(workAreas(farm), v); return g ? [`${g.kind === 'pole' ? 'Pole' : 'Sad'} – oblast ${g.n}`, g.kind] : ['oblast už neexistuje', null]; }
  const o = v.at && findObject(farm, v.at);
  return o ? [BUILDINGS[o.kind].name, villJobType(o.kind)] : ['volný', null];
}
const WARN_W = new Set(['plan', 'seeds', 'inputs', 'feed', 'full', 'empty', 'skill']);
const dotOf = (farm, v) => (!v.at && !v.area ? 'free' : v.job ? 'work' : WARN_W.has(v.w) ? 'warn' : 'wait');
export const TEAM_FILTERS = [['all', 'Všichni', 'helper'], ...Object.entries(TEAM.profs).map(([k, p]) => [k, p.name, p.icon])];
function repBox(farm) {
  const t = repTier(farm), next = repNext(farm), lo = TEAM.rep.tiers[t - 1];
  const pct = next ? Math.min(100, 100 * ((farm.rep || 0) - lo) / (next - lo)) : 100;
  return `<div class="rep"><span>:star: Pověst farmy · stupeň <b>${t}</b>/10</span><div class="bar"><div style="width:${pct.toFixed(0)}%"></div></div>
    <small>${farm.rep || 0} bodů${next ? ` · další stupeň za ${next - (farm.rep || 0)}` : ' · nejvyšší stupeň'} · body za doručené zakázky a splněné denní úkoly</small></div>`;
}
const teamHead = farm => `<div class="teamhead"><div><b>Tým ${farm.vill.length} / ${teamCap(farm)}</b><small>${bedsText(beds(farm))} v domcích${beds(farm) > VILL_MAX ? ` (víc než ${VILL_MAX} lidí nejde)` : ''}</small></div>
  <button class="btn sm" data-act="openBoard">:sign: Hledat</button></div>${repBox(farm)}
  ${teamCap(farm) ? '' : '<p class="tip">Pracovníci potřebují bydlet. Postav <b>Chatrč</b> (Stavět → Farma), pak vyvěs inzerát na nástěnce v Městečku.</p>'}`;
export function teamHtml(farm, now, f = 'all', sel = 0, ask = false) {
  const v = sel && farm.vill.find(x => x.id === sel);
  if (v) return teamDetail(farm, v, now, ask);
  const list = farm.vill.filter(x => f === 'all' || x.prof === f);
  const tabs = `<div class="chips filt">${TEAM_FILTERS.map(([k, n, ic]) => `<button class="chip${k === f ? ' on' : ''}" data-act="teamFilter" data-v="${k}">:${ic}: ${n}${k === 'all' ? '' : ` ${farm.vill.filter(x => x.prof === k).length}`}</button>`).join('')}</div>`;
  const rows = list.map(x => {
    const [where, type] = placeOf(farm, x), obor = type ? (OBOR[type] || 'pole') : x.prof;
    return `<button class="trow" data-act="teamSel" data-v="${x.id}"><span class="ico">:${profOf(x).icon}:</span>
      <span class="ti"><b>${esc(villName(x))}</b><small>${profOf(x).name} · ${where}</small><small class="st">${type ? villDoing(farm, x, type) : 'čeká na přiřazení'}</small></span>
      <span class="tl"><b>${villMainLevel(x)}</b><small>×${num(villPower(x, obor))}</small></span><i class="dot ${dotOf(farm, x)}"></i></button>`;
  }).join('');
  const free = workplaces(farm).filter(w => w.ws.length < w.cap);
  return teamHead(farm) + tabs + (rows ? `<div class="tlist">${rows}</div>` : `<div class="empty">${farm.vill.length ? 'Nikdo s touhle profesí.' : 'Zatím nemáš žádného pracovníka.'}</div>`)
    + (free.length ? `<div class="sect">Volná místa</div><div class="chips">${free.map(w => `<span class="chip">:${w.icon}: ${esc(w.name)}${w.cap > 1 ? ` · ${w.cap - w.ws.length} z ${w.cap}` : ''}</span>`).join('')}</div>` : '');
}
function teamDetail(farm, v, now, ask) {
  const [where, type] = placeOf(farm, v);
  const skills = Object.keys(TEAM.profs).map(k => `<div class="skill${k === v.prof ? ' main' : ''}"><small>${TEAM.profs[k].name}${k === v.prof ? ' (profese)' : ''}</small>${lvlLine(v, k)}</div>`).join('');
  const hist = (v.hist || []).slice(-5).reverse().map(([t, k, L]) => `<small>${new Date(t).toLocaleDateString('cs-CZ')} · ${TEAM.profs[k] ? TEAM.profs[k].name : k} → úroveň ${L}</small>`).join('');
  const wps = workplaces(farm).sort((a, b) => (b.obor === v.prof) - (a.obor === v.prof));
  const moves = wps.map(w => {
    const here = w.ws.includes(v), full = !here && w.ws.length >= w.cap;
    const base = w.k === 'a' ? `${v.id}|a|${w.kind}|${w.id}` : `${v.id}|b|${w.id}`;
    const off = w.obor !== v.prof && !(TEAM.traits[v.trait] || {}).any ? ' · mimo profesi' : '', cnt = w.cap > 1 ? ` ${w.ws.length}/${w.cap}` : '';
    if (!full) return `<button class="chip${here ? ' on' : ''}" data-act="teamMove" data-v="${base}|0"${here ? ' disabled' : ''}>:${w.icon}: ${esc(w.name)}${cnt}${off}</button>`;
    return w.ws.map(x => `<button class="chip full" data-act="teamMove" data-v="${base}|${x.id}">:${w.icon}: ${esc(w.name)} · plno – vyměnit s ${esc(villName(x))}${off}</button>`).join('');
  }).join('');
  return `<button class="btn sm alt back" data-act="teamBack">← Tým</button>
    <div class="upg worker"><b>${whoLine(v)}</b><small>${traitText(v.trait)}</small>
      <small>Pracuje: <b>${esc(where)}</b>${type ? ` · ${villDoing(farm, v, type)}` : ''}</small>
      <small class="muted">Zkušenosti dostává za hotovou práci – čím hodnotnější věc, tím víc. Ve své profesi naplno, jinde polovinu.</small></div>
    <div class="sect">Dovednosti</div>${skills}
    ${hist ? `<div class="sect">Postup</div><div class="hist">${hist}</div>` : ''}
    <div class="sect">Přeřadit</div>${moves ? `<small class="muted">Na plné místo jde jen výměnou – ${v.at || v.area ? `ten druhý půjde tam, kde je teď ${esc(villName(v))}` : 'ten druhý bude volný'}. Plán práce zůstává u pracoviště.</small><div class="chips">${moves}</div>` : '<small class="muted">Na farmě zatím není místo, kde by mohl pracovat.</small>'}
    <div class="hire">${v.at || v.area ? `<button class="btn sm alt" data-act="teamMove" data-v="${v.id}|0">Odvolat z práce</button>` : ''}
      ${ask ? `<button class="btn sm red" data-act="fireVill" data-v="${v.id}">Opravdu propustit</button><button class="btn sm alt" data-act="teamSel" data-v="${v.id}">Ne</button>`
        : `<button class="btn sm alt" data-act="fireAsk" data-v="${v.id}">Propustit</button>`}</div>`;
}

// ---------- nástěnka v Městečku: inzeráty a uchazeči ----------
const offerHtml = (farm, opt, i, prof, ok) => {
  const items = opt.map(([id, n]) => `<span class="ing${have(farm, id) >= n ? '' : ' miss'}">:${ITEMS[id].icon}:${have(farm, id)}/${n}</span>`).join(' ');
  const can = ok && opt.every(([id, n]) => have(farm, id) >= n);
  return `<div class="offer"><small>Pohoštění ${i + 1}</small><div class="ings">${items}</div><button class="btn sm${can ? '' : ' off'}" data-act="postAd" data-v="${prof}|${i}">Vyvěsit</button></div>`;
};
export function boardHtml(farm, now, prof = 'pole') {
  const tier = repTier(farm), bed = teamFree(farm) > 0;
  const ads = farm.board.ads.slice().sort((a, b) => a.ready - b.ready);
  const adsHtml = ads.map(ad => {
    if (now < ad.ready) {
      return `<div class="upg ad"><b>:sign: Inzerát: ${TEAM.profs[ad.prof].name}</b><small>Uchazeči přijdou za <b>${fmtTime(Math.ceil((ad.ready - now) / 1000))}</b>.</small>
        <div class="hire"><button class="btn sm alt" data-act="dropAd" data-v="${ad.id}">Stáhnout</button></div></div>`;
    }
    const cands = ad.cands.map((c, i) => `<div class="cand"><span class="ico">:${TEAM.profs[c.prof].icon}:</span><b>${esc(villName(c))}</b>
      <small>${TEAM.profs[c.prof].name} · úroveň <b>${c.lvl}</b></small><small>${traitText(c.trait)}</small>
      <button class="btn sm${bed ? '' : ' off'}" data-act="hireCand" data-v="${ad.id}|${i}">Přijmout</button></div>`).join('');
    return `<div class="upg ad${ad.self ? ' self' : ''}"><b>${ad.self ? ':house: Ozval se sám z domku v Městečku' : `:sign: Na inzerát ${TEAM.profs[ad.prof].name} přišli`}</b>
      <div class="cands">${cands}</div><small class="muted">Vyber jednoho, ostatní odejdou. Za ${fmtTime(Math.max(0, Math.ceil((ad.until - now) / 1000)))} odejdou všichni.</small>
      <div class="hire"><button class="btn sm alt" data-act="dropAd" data-v="${ad.id}">${ad.self ? 'Poslat pryč' : 'Nikoho'}</button></div></div>`;
  }).join('');
  const own = ads.filter(a => !a.self).length, max = TEAM.rep.ads[tier - 1];
  const form = own < max ? `<div class="sect">Nový inzerát</div>
    <div class="chips">${Object.entries(TEAM.profs).map(([k, p]) => `<button class="chip${k === prof ? ' on' : ''}" data-act="adProf" data-v="${k}">:${p.icon}: ${p.name}</button>`).join('')}</div>
    <small class="muted">${TEAM.profs[prof].name}: ${TEAM.profs[prof].text}. Uchazeči přijdou za ${fmtTime(adWaitMs(farm) / 1000)}, bude jich ${TEAM.rep.cands[tier - 1]} (začínají na úrovni ${TEAM.rep.startLvl[tier - 1].join('–')}). Pohoštění je za to, že přijdou – vybereš jedno:</small>
    <div class="offers">${adOffers(farm).map((opt, i) => offerHtml(farm, opt, i, prof, bed)).join('')}</div>`
    : `<p class="tip">Víc inzerátů najednou viset nemůže (${max}). S lepší pověstí můžou viset dva.</p>`;
  return `<div class="teamhead"><div><b>Tým ${farm.vill.length} / ${teamCap(farm)}</b><small>${bed ? `volná lůžka: ${teamFree(farm)}` : 'žádné volné lůžko'}</small></div>
    <button class="btn sm alt" data-act="openTeam">:helper: Tým</button></div>${repBox(farm)}
    ${bed ? '' : `<p class="tip">Nemáš volné lůžko. Postav nebo přestav domek (Stavět → Farma) – jinak nikoho nepřijmeš. <button class="chip" data-act="openBuildFarm">Stavět</button></p>`}
    ${adsHtml}${form}
    <p class="muted">Od pověsti 3 se občas někdo z domků v Městečku ozve sám – bez pohoštění. Nad domkem uvidíš bublinu.</p>`;
}

// ---------- domek (chatrč, chata, dům) ----------
export function houseHtml(farm, o) {
  const d = BUILDINGS[o.kind], next = d.next && BUILDINGS[d.next];
  const up = next ? `<div class="upg"><b>Přestavět na ${next.name}</b><small>${bedsText(next.beds)} místo ${d.beds} · za rozdíl v ceně</small>
    ${next.st > statekLevel(farm) ? `<small>:lock: od Statku úrovně ${next.st}</small>` : ''}
    <button class="btn sm${next.st <= statekLevel(farm) && farm.coins >= next.cost - d.cost ? '' : ' off'}" data-act="rebuildHouse" data-v="${o.id}">Přestavět · ${next.cost - d.cost} :coin:</button></div>` : '<div class="upg"><b>:star: Největší domek</b><small>Víc lůžek dá jen další domek.</small></div>';
  return `<p class="muted">${esc(d.name)}: <b>${bedsText(d.beds)}</b>. Pracovníci bydlí v domcích na farmě – kolik lůžek, tolik lidí v týmu (nejvýš ${VILL_MAX}).</p>
    <div class="teamhead"><div><b>Tým ${farm.vill.length} / ${teamCap(farm)}</b><small>${bedsText(beds(farm))} ve všech domcích</small></div><button class="btn sm alt" data-act="openTeam">:helper: Tým</button></div>
    ${up}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout</button>`;
}

// blok „Vylepšit budovu“ – suroviny, mince, co to přinese
export function upgradeBlock(farm, o) {
  const L = objLevel(o);
  const c = upgradeCost(o);
  if (!c) return `<div class="upg"><b>:star: Úroveň ${L}/${MAX_BLD_LEVEL}</b> – nejvyšší úroveň.</div>`;
  // suroviny jsou tlačítka: klepnutím se ukáže, co to je a kde to sehnat
  const items = c.items.map(x => `<button class="needi ${have(farm, x.item) >= x.qty ? 'okq' : 'miss'}" data-act="itemInfo" data-v="${x.item}" title="${esc(ITEMS[x.item].name)}">:${ITEMS[x.item].icon}:${have(farm, x.item)}/${x.qty}</button>`).join(' ');
  const coinOk = farm.coins >= c.coins;
  const lock = BUILDINGS[o.kind].type !== 'main' && c.level > statekLevel(farm) ? ':lock: nejdřív vylepši Statek' : '';
  // Statek: zásluhy (úroveň hráče + úkol) – bez nich nejde vylepšit
  const merits = BUILDINGS[o.kind].type === 'main' ? statekMerits(farm, c.level) : [];
  const mHtml = merits.length ? `<div class="merits"><small><b>Zásluhy</b></small>${merits.map(m => `<div class="merit${m.ok ? ' ok' : ''}"><span>${m.ok ? '✓' : '○'} ${m.text}</span><b>${Math.min(m.have, m.need)}/${m.need}</b><div class="bar"><div style="width:${Math.min(100, 100 * m.have / m.need).toFixed(0)}%"></div></div></div>`).join('')}</div>` : '';
  const ok = !lock && coinOk && c.items.every(x => have(farm, x.item) >= x.qty) && merits.every(m => m.ok);
  return `<div class="upg"><b>:star: Úroveň ${L}/${MAX_BLD_LEVEL}</b> → ${c.level}: ${upgradeEffect(o)}${mHtml}
    <div class="need">${items} <span class="${coinOk ? 'okq' : 'miss'}">:coin:${c.coins}</span></div>
    <small class="muted">Klepni na surovinu – ukážu, co to je a kde ji sehnat.</small>
    ${lock ? `<small>${lock}</small>` : ''}
    <button class="btn sm${ok ? '' : ' off'}" data-act="upgrade" data-v="${o.id}"${o.town ? ' data-town="1"' : ''}>Vylepšit</button></div>`;
}

export const STATEK_TABS = [['zakazky', 'Zakázky'], ['farmari', 'Oblasti'], ['zasoby', 'Zásoby'], ['pomocnik', 'Pomocník'], ['statek', 'Statek']];

export function statekHtml(farm, name, now, tab = 'zakazky', o) {
  const tabs = `<div class="tabs">${STATEK_TABS.filter(([id]) => id !== 'pomocnik' || helperActive(farm, now)).map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="stab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'pomocnik') return tabs + helperHtml(farm, now);
  if (tab === 'farmari') return tabs + farmersHtml(farm, now);
  if (tab === 'zasoby') return tabs + suppliesHtml(farm);
  if (tab === 'statek') {
    const next = farm.level < MAX_LEVEL ? LEVEL_XP[farm.level + 1] - farm.xp : 0;
    const L = statekLevel(farm);
    const unlocks = BUILDING_LIST.filter(b => b.st === L + 1).map(b => `:${b.icon}: ${b.name}`).join(', ');
    const have1 = BUILDING_LIST.filter(b => b.st && b.st <= L).map(b => `:${b.icon}:`).join('');
    return tabs + `<p class="muted">Farma ${esc(name)} · hráč úrovně <b>${farm.level}</b> · ${farm.xp} XP${next ? ` (do další ${next})` : ''}. Úroveň hráče roste pořád; co můžeš <b>stavět</b>, určuje Statek.</p>
      <p class="muted">Statek ${L}: až ${maxPlots(farm)} polí, ${maxOrchards(farm)} sadů, ${maxBigFields(farm)}× velké pole. Odemčeno: ${have1}</p>
      ${unlocks ? `<p class="muted">Statek úrovně ${L + 1} odemkne: <b>${unlocks}</b></p>` : ''}
      ${upgradeBlock(farm, o)}${o ? `<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout statek</button>` : ''}`;
  }
  return tabs + `<p class="muted"><b>:truck: Zakázky</b> – doruč zboží a dostaneš nejvíc mincí. Zakázku, která se ti nehodí, zruš ✕ a za 3 minuty přijde nová.</p>
    <div class="orders">${farm.orders.map((x, i) => orderCard(farm, x, i, now)).join('')}</div>`;
}

// najímání pomocníka
export function helperHtml(farm, now) {
  const h = farm.helper;
  const active = helperActive(farm, now);
  const cropOpts = CROP_LIST.filter(c => c.level <= farm.level).map(c =>
    `<button class="chip${h && h.crop === c.id ? ' on' : ''}" data-act="helperCrop" data-v="${c.id}">:${c.icon}: ${c.name}</button>`).join('');
  if (farm.level < HELPER_LEVEL) return `<div class="empty">:lock: Pomocníka si najmeš od úrovně ${HELPER_LEVEL}.</div>`;
  // v29: pomocník se už nenajímá – kdo ho má, tomu doběhne; práci převzal Farmářský tým
  const plans = `<small class="muted">Pomocník se už nenajímá ani neprodlužuje. Pracovníky najdeš na nástěnce v Městečku.</small> <button class="btn sm" data-act="openBoard">:sign: Nástěnka</button>`;
  const tools = `Pracuje každých ${helperInterval(farm)} s, najednou obslouží ${helperCapacity(farm)} políčka.` +
    (farm.machines.some(m => m.model === 'kolecko') ? '' : ' :kolecko: Kolečko z prodejny strojů přidá 2 políčka.') +
    (farm.machines.some(m => m.model === 'motyka') ? '' : ' :motyka: Motyka zrychlí práci 2×.');
  const tractor = hasMachine(farm, 'tractor')
    ? `<button class="chip${h && h.tractor ? ' on' : ''}" data-act="helperTractor" data-v="${h && h.tractor ? 0 : 1}">:tractor: Jezdí traktorem (+3 políčka)</button>` : '';
  const status = active
    ? `<div class="row"><span class="ico">:helper:</span><div class="info"><b>Pomocník pracuje</b><small>ještě ${fmtTime(Math.ceil((h.until - now) / 1000))} · hotovo ${h.n || 0} prací</small></div></div>`
    : `<p class="muted">:helper: Pomocník sám sklízí zralá malá pole a zasívá prázdná vybranou plodinou (bere semena ze skladu, jinak platíš mincemi). Úroda jde do skladu.</p>`;
  return `${status}<p class="muted"><b>Co má sít:</b></p><div class="chips">${cropOpts}</div>${tractor ? `<div class="chips">${tractor}</div>` : ''}
    <p class="muted">${tools}</p><div class="hire">${plans}</div>`;
}

export function orchardHtml(farm, o, now, ask) {
  const st = treeState(o, now);
  if (st.state === 'empty') {
    const cards = [...TREE_LIST].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'bush' ? -1 : 1) || a.level - b.level).map(t => {
      const locked = farm.level < t.level;
      const sap = have(farm, 'z_' + t.id);
      return card({ icon: ITEMS[t.fruit].icon, name: t.name, locked, act: 'plantTree', v: t.id, disabled: !locked && !sap && farm.coins < t.cost,
        lines: locked ? [`:lock: úroveň ${t.level}`] : [sap ? `:z_${t.id}: sazenice ze skladu (${sap})` : `sazenice ${t.cost} :coin:`, `${t.harvests}× ${t.yield} :${ITEMS[t.fruit].icon}: · první za ${fmtTime(t.first)}`] });
    });
    return `<p class="muted">Vyber strom. Plodí několikrát, pak doslouží a vykopeš ho.</p><div class="crops">${cards.join('')}</div>
      <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout sad</button>`;
  }
  const t = TREES[o.tree];
  const fruit = ITEMS[t.fruit];
  let txt;
  if (st.state === 'dead') txt = 'Strom doplodil. Vykopej ho a zasaď nový.';
  else if (st.state === 'ready') txt = `${t.yield}× :${fruit.icon}: je zralé – klepni na strom.`;
  else txt = `:${fruit.icon}: za ${fmtTime(st.left)}`;
  const bar = st.state === 'growing' ? `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>` : '';
  // živý strom jde vykopat a zasadit jiný; dokud ještě neplodil, vrátí se sazenice nebo mince
  let dig = '';
  if (st.state === 'dead') dig = `<button class="btn" data-act="clearTree" data-v="${o.id}">:axe: Vykopat strom</button>`;
  else if (st.state === 'ready') dig = `<p class="muted">:axe: Strom jde vykopat, až sklidíš zralé ovoce.</p>`;
  else if (!ask) dig = `<button class="btn alt" data-act="clearAsk" data-v="${o.id}">:axe: Vykopat a zasadit jiný strom</button>`;
  else {
    const back = treeRefund(o);
    const what = !back ? (o.left < t.harvests ? 'Strom už plodil, sazenice se nevrátí.' : 'Sazenice se nevrátí (strom je zasazený ze starší verze hry).')
      : back.item ? `Sazenice :${back.item}: se ti vrátí do skladu.` : `Vrátí se ti ${back.coins} :coin: za sazenici.`;
    dig = `<div class="ask"><p><b>Opravdu vykopat ${t.name.toLowerCase()}?</b><br>${what}</p>
      <div class="ask-btns"><button class="btn warn" data-act="clearTree" data-v="${o.id}">:axe: Ano, vykopat</button>
      <button class="btn alt" data-act="clearNo">Ne</button></div></div>`;
  }
  return `<div class="row"><span class="ico">:${fruit.icon}:</span><div class="info"><b>${t.name}</b><small>${txt}</small>${bar}
      <small>Zbývá úrod: ${st.state === 'dead' ? 0 : o.left} z ${t.harvests} · ${fruit.price} :coin: za kus</small></div></div>
    ${dig}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout sad</button>`;
}

// cena osiva pro n políček: semena ze skladu + zbytek v mincích
function seedCost(farm, c, n) {
  const s = Math.min(n, have(farm, 's_' + c.id));
  return (s ? `${s}× :s_${c.id}:` : '') + (n - s ? `${s ? ' + ' : ''}${(n - s) * c.cost} :coin:` : '');
}

// prodejna strojů v městečku
export function dealerHtml(farm, now, o) {
  const slots = garageSlots(farm), used = vehicleCount(farm);
  const cards = MACHINE_LIST.map(m => {
    const locked = farm.level < m.level;
    const mine = farm.machines.find(x => x.model === m.id);
    const job = mine && machineJob(farm, mine.id, now);
    const price = machinePrice(farm, m.id);
    const noRoom = isVehicle(m.id) && used >= slots;
    const lines = locked ? [`:lock: úroveň ${m.level}`]
      : mine ? [job ? `:gear: pracuje ${fmtTime(Math.ceil((job.job.end - now) / 1000))}` : isVehicle(m.id) ? '✓ ve stodole' : '✓ koupeno']
      : noRoom ? [`${price} :coin:`, slots ? 'stodola je plná' : 'potřebuje stodolu'] : [`${price} :coin:`];
    if (m.speed) lines.push(`${m.speed} políček/min`);
    lines.push(`<small>${m.info}</small>`);
    return card({ icon: m.icon, name: m.name, locked, act: 'buyMachine', v: m.id, disabled: !!mine || noRoom || farm.coins < price, lines });
  });
  let small = '';
  if (hasMachine(farm, 'tractor') || hasMachine(farm, 'combine')) {
    const empty = farm.plots.filter(p => !p.crop).length;
    const ready = farm.plots.filter(p => plotState(p, now).state === 'ready').length;
    small = `<p class="muted"><b>Malá pole</b> – stroje je obslouží najednou.</p>`;
    if (hasMachine(farm, 'tractor')) {
      small += `<div class="crops">${CROP_LIST.filter(c => c.level <= farm.level).map(c => card({ icon: c.icon, name: `Zasít: ${c.name}`, act: 'sowAll', v: c.id, disabled: !empty,
        lines: [seedCost(farm, c, empty)] })).join('')}</div>`;
    }
    if (hasMachine(farm, 'combine')) small += ready ? `<button class="btn" data-act="harvestAll" data-v="">Sklidit všechna zralá malá pole (${ready})</button>` : '';
  }
  return `<p class="muted">Traktory a kombajny parkují ve <b>stodole</b> (${used}/${slots} míst). Náčiní místo nepotřebuje. Stroje pracují na velkých polích.</p>
    <div class="crops">${cards.join('')}</div>${small}${o ? upgradeBlock(farm, o) : ''}`;
}

// stodola: zaparkované stroje, prodej
export function garageHtml(farm, o, now) {
  const slots = garageSlots(farm);
  const rows = farm.machines.map(m => {
    const d = MACHINES[m.model];
    const job = machineJob(farm, m.id, now);
    return `<div class="row"><span class="ico">:${d.icon}:</span><div class="info"><b>${d.name}</b><small>${isVehicle(m.model) ? (job ? 'pracuje na poli' : 'zaparkováno') : 'náčiní'}</small></div>
      <button class="btn sm alt" data-act="sellMachine" data-v="${m.id}"${job ? ' disabled' : ''}>Prodat za ${Math.round(d.cost * 0.5)} :coin:</button></div>`;
  }).join('') || '<div class="empty">Stodola je prázdná. Stroje koupíš v Prodejně strojů.</div>';
  return `<p class="muted">Místa pro traktory a kombajny: <b>${vehicleCount(farm)}/${slots}</b>. Za prodaný stroj dostaneš polovinu ceny.</p>${rows}
    ${upgradeBlock(farm, o)}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout stodolu</button>`;
}

// stánek: nabídka se mění každé 2 hodiny
export function stallHtml(farm, o, now, tab) {
  return tabsHtml(STALL_TABS, tab === 'zasoby' ? 'zasoby' : 'nabidka', 'stab') + (tab === 'zasoby' ? suppliesShopHtml(farm) : stallOffersHtml(farm, o, now));
}
function stallOffersHtml(farm, o, now) {
  const off = stallOffers(farm, now);
  const buy = off.buy.map((x, i) => {
    const left = stallLeft(farm, now, 'b', i, x.qty);
    return `<div class="row"><span class="ico">:${ITEMS[x.item].icon}:</span><div class="info"><b>${ITEMS[x.item].name}</b><small>${x.price} :coin: za kus · zbývá ${left}</small></div>
      <button class="btn sm${left && farm.coins >= x.price ? '' : ' off'}" data-act="stallBuy" data-v="${i}">Koupit 1</button></div>`;
  }).join('');
  const sell = off.sell.map((x, i) => {
    const left = stallLeft(farm, now, 's', i, x.qty);
    const h = have(farm, x.item);
    return `<div class="row"><span class="ico">:${ITEMS[x.item].icon}:</span><div class="info"><b>${ITEMS[x.item].name}</b><small>vykoupí ${left} ks po ${x.price} :coin: · máš ${h}</small></div>
      <button class="btn sm${left && h ? '' : ' off'}" data-act="stallSell" data-v="${i}" data-q="1">Prodat 1</button>
      <button class="btn sm${left && h ? '' : ' off'}" data-act="stallSell" data-v="${i}" data-q="all">Vše</button></div>`;
  }).join('');
  return `<p class="muted">:clock: Nová nabídka za <b>${fmtTime(Math.ceil((off.next - now) / 1000))}</b>. Ve stánku koupíš, co ti chybí (dráž), a prodáš za lepší cenu než ve výkupu skladu.</p>
    <p class="muted"><b>Stánek prodává</b></p>${buy}<p class="muted"><b>Stánek vykupuje</b></p>${sell}${upgradeBlock(farm, o)}`;
}
// Stánek → Zásoby: semena a sazenice (do zásob ve Statku) a krmivo (do Skladu) za mince
export function suppliesShopHtml(farm) {
  const ids = [...CROP_LIST.map(c => 's_' + c.id), ...TREE_LIST.map(t => 'z_' + t.id), ...ITEM_LIST.filter(it => it.id.startsWith('krmivo_')).map(it => it.id)]
    .filter(id => ITEMS[id] && supplyPrice(farm, id) !== null);
  const tiles = ids.map(id => {
    const p = supplyPrice(farm, id);
    return `<div class="item"><span class="ico">:${ITEMS[id].icon}:<i class="n">${have(farm, id)}</i></span><div class="nm">${esc(ITEMS[id].name)}</div><div class="pr">${p} :coin: / ks</div>
      <div class="acts"><button class="btn sm alt" data-act="buySupply" data-v="${id}|1">1×</button><button class="btn sm" data-act="buySupply" data-v="${id}|10">10× · ${10 * p} :coin:</button></div></div>`;
  }).join('');
  return `<p class="muted">Semena a sazenice jdou do zásob ve <b>Statku</b> (${seedUsed(farm)}/${seedCap(farm)}), krmivo do <b>Skladu</b>. Farmáři sázejí jen ze zásob.</p><div class="items">${tiles}</div>`;
}
export const STALL_TABS = [['nabidka', 'Nabídka', 'stall'], ['zasoby', 'Zásoby', 's_wheat']];
// Statek → Zásoby: co je v zásobě semen a sazenic
function suppliesHtml(farm) {
  const used = seedUsed(farm), cap = seedCap(farm);
  const list = Object.entries(farm.seeds || {}).filter(([id, n]) => n > 0 && ITEMS[id]).map(([id, n]) =>
    `<div class="item"><span class="ico">:${ITEMS[id].icon}:<i class="n">${n}</i></span><div class="nm">${esc(ITEMS[id].name)}</div></div>`).join('');
  return `<p class="muted">Semena a sazenice se ukládají tady ve Statku, ne ve Skladu. Na každé pole a sad se vejdou ${SEEDS_PER} kusy. Vyrábí je Semenárna a Školka, nebo je koupíš ve Stánku v městečku.</p>
    <div class="upg"><b>Zásoba ${used}/${cap}</b><div class="bar"><div style="width:${cap ? Math.min(100, 100 * used / cap).toFixed(1) : 0}%"></div></div></div>
    ${list ? `<div class="items">${list}</div>` : '<div class="empty">Zásoba je prázdná.</div>'}
    <button class="btn" data-act="openStall">:stall: Nakoupit v městečku</button>`;
}
// Statek → Oblasti: pracovní oblasti polí a sadů, kdo v nich pracuje a plán osázení v procentech
function farmersHtml(farm, now = Date.now()) {
  const areas = workAreas(farm);
  const rows = areas.map(g => {
    const w = g.kind + g.ids[0], wp = wpGet(farm, w, areas), ws = wpWorkers(farm, wp, areas), cap = areaCap(g);
    const pole = g.kind === 'pole', N = g.cells.length, set = wp.set, unit = pole ? 'políčko' : 'místo';
    const title = `${pole ? ':plot: Pole' : ':tree: Sad'} – oblast ${g.n} <small class="muted">(${N} ${pole ? 'políček' : 'stromů'} · pracovníci ${ws.length}/${cap})</small>`;
    // co v oblasti právě je
    const cnt = {};
    let planted = 0, ripe = 0, dead = 0;
    for (const c of g.cells) {
      const k = pole ? c.crop : c.dead ? null : c.tree;
      if (c.dead) dead++;
      if (!k) continue;
      cnt[k] = (cnt[k] || 0) + 1; planted++;
      if ((pole ? plotState(c, now) : treeState(c, now)).state === 'ready') ripe++;
    }
    const plan = set.plan, sum = planTotal(plan), defs = pole ? CROPS : TREES;
    const L = ws.length ? Math.max(...ws.map(x => villLevel(x, 'pole'))) : 99;
    const table = Object.keys(plan).filter(id => defs[id]).map(id => {
      const d = defs[id], seed = (pole ? 's_' : 'z_') + id, sn = have(farm, seed);
      const exact = plan[id] * N / 100, cur = cnt[id] || 0, need = needLvl(d.level);
      const meta = `${Number.isInteger(exact) ? exact : 'asi ' + Math.round(exact)} z ${N} ${pole ? 'polí' : 'míst'} · teď <b>${cur}</b> · ${pole ? 'semen' : 'sazenic'} <b class="${sn ? '' : 'miss'}">${sn}</b>`;
      return planRow(w, id, pole ? d.icon : ITEMS[d.fruit].icon, d.name, meta, plan[id], 100 - (sum - plan[id]), '', need > L ? need : 0);
    }).join('');
    const add = (pole ? CROP_LIST : TREE_LIST).filter(d => farm.level >= d.level && !(d.id in plan)).map(d => [d.id, pole ? d.icon : ITEMS[d.fruit].icon, d.name, needLvl(d.level)]);
    const people = ws.map(v => personCard(farm, v, g.kind, 'pole', now, 'areaFree', `jedno ${unit} mu zabere ${secText(workMs(v, pole ? 'harvest' : 'pick', 'pole'))}`)).join('');
    const slots = ws.length < cap ? assignChips(farm, 'pole', x => ['areaAssign', `${x.id}|${g.kind}|${g.ids[0]}`]) : '';
    const nextAt = (cap + 1) * TEAM.areaPer;
    const replant = set.replant !== false;
    return `<div class="upg worker"><b>${title}</b>${people}${slots}
      <small class="muted">Na každá ${TEAM.areaPer} ${pole ? 'pole' : 'místa'} jeden pracovník${ws.length >= cap ? ` – dalšího vezme oblast od ${nextAt} ${pole ? 'polí' : 'míst'}` : ''}.</small>
      <small class="muted">${pole ? `Osázeno ${planted}/${N}` : `Roste ${planted}/${N}`}${ripe ? ` · zralé ${ripe}` : ''}${dead ? ` · suché ${dead}` : ''}</small>
      <small><b>${pole ? 'Plán osázení' : 'Plán sadu'}</b> – jakou část oblasti čím osázet:</small>
      ${table || `<small class="muted">Plán je prázdný – jen sklízí${pole ? '' : ' a vykopává suché stromy'}. Vyber, co sázet:</small>`}
      ${table ? useLine(w, sum, false, false) : ''}
      ${Object.keys(plan).length < PLAN_ROWS ? addChips(w, add, table ? (pole ? 'Přidat plodinu:' : 'Přidat strom:') : '', L) : ''}
      <div class="chips"><button class="chip${replant ? ' on' : ''}" data-act="planReplant" data-v="${w}">${replant ? '✓ Znovu sázet' : 'Znovu sázet: vypnuto – jen sklízí'}</button></div></div>`;
  }).join('');
  return `<p class="muted"><b>Pracovní oblast</b> je aspoň ${AREA_MIN} pole (nebo sady) vedle sebe. Pracovníci v ní pracují pořád: co dozraje, hned sklidí, a prázdné místo osází podle <b>plánu v procentech</b> – jen ze zásob semen a sazenic ve Statku. Plán patří oblasti, ne pracovníkovi. Na každá ${TEAM.areaPer} pole se vejde jeden pracovník (6 polí = 1, 8 polí = 2). Nejlíp to umí <b>Pěstitel</b>.</p>
    ${areas.length ? rows : '<p class="tip">Zatím nemáš žádnou pracovní oblast. Postav aspoň 4 pole nebo 4 sady vedle sebe.</p>'}`;
}

export function newsHtml() {
  return NEWS.map(n => `<div class="news"><b>Verze ${n.v}: ${esc(n.title)}</b><ul>${n.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
}

export function bigfieldHtml(farm, o, now) {
  const st = fieldState(o, now);
  const cells = o.w * o.h;
  const head = `<p class="muted">Velikost ${o.w}×${o.h} = <b>${cells} políček</b>.</p>`;
  const move = `<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout velké pole</button>`;
  const bar = p => `<div class="bar"><div style="width:${(p * 100).toFixed(1)}%"></div></div>`;
  if (st.state === 'empty') {
    const tr = freeMachine(farm, 'tractor', now);
    if (!tr) {
      return head + `<div class="empty">${hasMachine(farm, 'tractor') ? 'Traktor právě pracuje na jiném poli. Počkej, až se vrátí.' : 'K setí potřebuješ traktor. Kup ho v prodejně strojů :tractor: vlevo nahoře.'}</div>` + move;
    }
    const sec = Math.ceil(jobSeconds(cells, tr.model) / (hasTool(farm, 'seeder') ? 2 : 1));
    const soil = o.soil || 'raw';
    const soilTxt = soil === 'plowed' ? '<b>Zoráno</b> – úroda bude o 50 % větší.' : soil === 'stubble' ? 'Na poli je strniště.' : 'Pole není zorané.';
    let tools = '';
    if (o.straw && hasTool(farm, 'baler')) tools += `<button class="btn alt" data-act="fieldBale" data-v="${tr.id}">:lis: Slisovat slámu (${Math.floor(cells / 2)} balíků)</button>`;
    if (soil !== 'plowed' && hasTool(farm, 'plow')) tools += `<button class="btn alt" data-act="fieldPlow" data-v="${tr.id}">:pluh: Zorat pole (+50 % úrody)</button>`;
    const hint = !hasTool(farm, 'plow') && soil !== 'plowed' ? '<small>Tip: s pluhem z prodejny strojů bude úroda o 50 % větší.</small>' : '';
    const cards = CROP_LIST.map(c => card({ icon: c.icon, name: c.name, locked: farm.level < c.level, act: 'fieldSow', v: c.id,
      disabled: farm.coins < (cells - Math.min(cells, have(farm, 's_' + c.id))) * c.cost,
      lines: farm.level < c.level ? [`:lock: úroveň ${c.level}`]
        : [`osivo ${seedCost(farm, c, cells)}`, `úroda ${Math.round(cells * c.yield * (o.soil === 'plowed' ? 1.5 : 1))} :${c.icon}:`, `sklízí ${MACHINE_TYPE_NAME[c.harvester]}`] }));
    const mult = soil === 'plowed' ? 1.5 : 1;
    return head + `<p class="muted">${soilTxt} ${hint}</p>${tools}<p class="muted">Seje <b>${MACHINES[tr.model].name}</b>${hasTool(farm, 'seeder') ? ' se secím strojem' : ''} (${fmtTime(sec)}). Vyber plodinu:</p><div class="crops">${cards.join('')}</div>` + move;
  }
  const m = farm.machines.find(x => o.job && x.id === o.job.m);
  if (['sowing', 'harvesting', 'plowing', 'baling'].includes(st.state)) {
    const what = st.state === 'sowing' ? `seje ${CROPS[o.crop].name.toLowerCase()}`
      : st.state === 'harvesting' ? `sklízí ${ITEMS[o.load.item].name.toLowerCase()}`
      : st.state === 'plowing' ? 'orá pole' : 'lisuje slámu';
    const icon = st.state === 'plowing' ? 'pluh' : st.state === 'baling' ? 'lis' : MACHINES[m.model].icon;
    return head + `<div class="row"><span class="ico">:${icon}:</span><div class="info">
      <b>${MACHINES[m.model].name} ${what}</b><small>hotovo za ${fmtTime(st.left)}</small>${bar(st.progress)}</div></div>` + move;
  }
  if (st.state === 'growing') {
    const c = CROPS[o.crop];
    return head + `<div class="row"><span class="ico">:${c.icon}:</span><div class="info"><b>${c.name} roste</b><small>zralé za ${fmtTime(st.left)}</small>${bar(st.progress)}</div></div>` + move;
  }
  if (st.state === 'ready') {
    const c = CROPS[o.crop];
    const type = c.harvester;
    const hm = freeMachine(farm, type, now);
    const btn = hm ? `<button class="btn" data-act="fieldHarvest" data-v="${hm.id}">Sklidit – ${MACHINES[hm.model].name} (${fmtTime(jobSeconds(cells, hm.model))})</button>`
      : `<div class="empty">${hasMachine(farm, type) ? `Tvůj ${MACHINE_TYPE_NAME[type]} právě pracuje jinde.` : `Na sklizeň potřebuješ ${MACHINE_TYPE_NAME[type]} – kup ho v prodejně strojů :tractor:.`}</div>`;
    return head + `<p class="muted">:${c.icon}: ${c.name} je zralá: ${fieldYield(o)} kusů.</p>` + btn + move;
  }
  const it = ITEMS[st.item];
  return head + `<p class="muted">Hotovo. Na poli čeká ${st.stock} × :${it.icon}: ${it.name.toLowerCase()}.</p>
    <button class="btn" data-act="fieldUnload" data-v="${o.id}">:box: Odvézt do skladu</button>` + move;
}

function ingredients(farm, recipe) {
  return Object.entries(recipe.in).map(([id, n]) =>
    `<span class="ing${have(farm, id) >= n ? '' : ' miss'}">:${ITEMS[id].icon}:${have(farm, id)}/${n}</span>`).join(' ');
}

export function factoryHtml(farm, o, now) {
  const d = BUILDINGS[o.kind];
  const q = queueState(o, now);
  const slots = [];
  const qs = queueSize(o);
  for (let i = 0; i < qs; i++) {
    const s = q[i];
    if (!s) { slots.push('<div class="slot empty"><b>+</b><small>Volná výrobní pozice</small></div>'); continue; }
    const it = ITEMS[s.r], r = RECIPES[s.r];
    const name = (recipeQty(r) > 1 ? recipeQty(r) + '× ' : '') + it.name;
    const info = s.state === 'done' ? '✓ Hotovo' : s.state === 'working' ? fmtTime(s.left) : 'Čeká na řadu';
    const bar = s.state === 'working' ? `<div class="bar"><div style="width:${(s.progress * 100).toFixed(1)}%"></div><span>${info}</span></div>` : `<small>${info}</small>`;
    slots.push(`<div class="slot ${s.state}"><span class="ico">:${it.icon}:</span><b class="sn">${esc(name)}</b>${bar}</div>`);
  }
  const done = q.filter(s => s.state === 'done').length;
  const full = q.length >= qs;
  // recepty jako řádky: výrobek, suroviny (červeně co chybí), čas a cena, tlačítko Vyrobit
  const recipes = Object.values(RECIPES).filter(r => r.building === o.kind).map(r => {
    const locked = farm.level < r.level, ok = !locked && hasInputs(farm, r) && !full;
    const name = (recipeQty(r) > 1 ? recipeQty(r) + '× ' : '') + ITEMS[r.id].name;
    return `<button class="recipe${locked ? ' locked' : ''}${ok ? '' : ' dim'}" data-act="produce" data-v="${r.id}">
      <span class="ico">:${ITEMS[r.id].icon}:</span>
      <span class="rinfo"><b>${esc(name)}</b>${locked ? '' : `<span class="ings">${ingredients(farm, r)}</span>`}
        <span class="rmeta">:clock: ${fmtTime(r.time)}<span class="coin-chip">${ITEMS[r.id].price} :coin:</span></span></span>
      <span class="cta">${locked ? `:lock: Úr. ${r.level}` : full ? 'Plno' : 'Vyrobit'}</span>
    </button>`;
  });
  return `<div class="slots">${slots.join('')}</div>
    ${done ? `<button class="btn" data-act="collect" data-v="${o.id}">Vybrat hotové (${done})</button>` : ''}
    <div class="sect">Vyber, co vyrobit</div>
    <div class="recipes">${recipes.join('')}</div>
    ${workerBlock(farm, o, now)}${upgradeBlock(farm, o)}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}

export function penHtml(farm, o, now) {
  const d = BUILDINGS[o.kind];
  const an = ANIMALS[d.animal];
  const rows = o.animals.map((a, i) => {
    const st = animalState(a, an, now);
    const txt = st.state === 'hungry' ? `má hlad – chce :${ITEMS[an.feed].icon}:` : st.state === 'ready' ? `:${ITEMS[an.product].icon}: připraveno` : `:${ITEMS[an.product].icon}: za ${fmtTime(st.left)}`;
    const bar = st.state === 'eating' ? `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>` : '';
    return `<div class="row"><span class="ico">:${an.icon}:</span><div class="info"><b>${an.name} ${i + 1}</b><small>${txt}</small>${bar}</div></div>`;
  }).join('') || `<div class="empty">Ohrada je prázdná. Kup ${an.acc} v obchodě nebo tady.</div>`;
  const ready = o.animals.filter(a => animalState(a, an, now).state === 'ready').length;
  const hungry = o.animals.filter(a => !a.fed).length;
  return `${rows}
    <p class="muted">${an.name}: krmivo :${ITEMS[an.feed].icon}: → :${ITEMS[an.product].icon}: ${ITEMS[an.product].name} za ${fmtTime(an.time)}. Krmivo ve skladu: <b>${have(farm, an.feed)}</b></p>
    ${ready ? `<button class="btn" data-act="collect" data-v="${o.id}">Sebrat :${ITEMS[an.product].icon}: (${ready})</button>` : ''}
    ${hungry ? `<button class="btn" data-act="feed" data-v="${o.id}">Nakrmit (${hungry})</button>` : ''}
    ${o.animals.length < penMax(o) ? `<button class="btn alt" data-act="buyAnimal" data-v="${an.id}">Koupit ${an.acc} za ${an.cost} :coin: (${o.animals.length}/${penMax(o)})</button>` : ''}
    ${workerBlock(farm, o, now)}${upgradeBlock(farm, o)}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}


export function decoHtml(farm, o) {
  return `<p class="muted">Ozdoba dělá farmu hezčí.</p><button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout</button>`;
}

export function siloHtml(farm, now, keepAdd = false) {
  const group = it => (SEEDS[it.id] || SAPLINGS[it.id] ? 2 : CROPS[it.id] || FRUITS_OF(it) ? 0 : 1);
  const items = ITEM_LIST.filter(it => !isSeedItem(it.id) && have(farm, it.id) > 0).sort((a, b) => group(a) - group(b));   // semena jsou ve Statku
  const trend = id => {
    const m = marketMult(id, now);
    return m >= 1.15 ? ' <span class="up" title="dobrá cena">▲</span>' : m <= 0.85 ? ' <span class="down" title="nízká cena">▼</span>' : '';
  };
  // dlaždice po skupinách: úroda, výrobky, semena a sazenice
  const tile = it => {
    const n = have(farm, it.id), pr = sellPrice(it.id, now);
    return `<div class="item">
      <span class="ico">:${it.icon}:<i class="n">${n}</i></span>
      <div class="nm">${esc(it.name)}</div>
      <div class="pr">${pr} :coin: / ks${trend(it.id)}${keepOf(farm, it.id) ? ` · <span class="kp">rezerva ${keepOf(farm, it.id)}</span>` : ''}</div>
      <div class="acts"><button class="btn sm alt" data-act="sell" data-v="${it.id}" data-q="1">1×</button>
        <button class="btn sm" data-act="sell" data-v="${it.id}" data-q="all">Vše · ${n * pr} :coin:</button></div>
    </div>`;
  };
  const GROUPS = ['Úroda a ovoce', 'Výrobky'];
  const sk = farm.objects.find(o => o.kind === 'sklad');
  const rows = items.length ? GROUPS.map((g, k) => {
    const list = items.filter(it => group(it) === k);
    return list.length ? `<div class="items-h">${g}</div><div class="items">${list.map(tile).join('')}</div>` : '';
  }).join('') : '<div class="empty">Sklad je prázdný. Sklízej úrodu z polí! :wheat:</div>';
  return `<p class="muted">:clock: Výkupní ceny se mění každé 4 hodiny – další změna za <b>${fmtTime(Math.ceil((nextMarketChange(now) - now) / 1000))}</b>. Zakázky ve Statku platí vždy víc.</p>
    ${rows}${keepHtml(farm, items, keepAdd)}${sk ? workerBlock(farm, sk, now) + upgradeBlock(farm, sk) + `<button class="btn alt" data-act="move" data-v="${sk.id}">↔ Přesunout sklad</button>` : ''}`;
}

// rezervy pro tým: pod tolik kusů výroba ani skladník nesáhnou (hráč sám může dál)
function keepHtml(farm, items, open) {
  const K = Object.entries(farm.keep || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
  const rows = K.map(([id, n]) => `<div class="prow kp"><button class="ico" data-act="itemInfo" data-v="${id}">:${ITEMS[id].icon}:</button><b class="pn">${esc(ITEMS[id].name)}</b>
    ${step('keepN', id, `${n} ks`, true)}<button class="del" data-act="keepN" data-v="${id}|0" aria-label="Zrušit rezervu">✕</button>
    <small class="pm">ve skladu <b>${have(farm, id)}</b>${have(farm, id) < n ? ' · <b class="miss">pod rezervou</b>' : ''}</small></div>`).join('');
  const free = items.filter(it => !keepOf(farm, it.id));
  return `<div class="sect">Rezervy pro tým</div><div class="upg worker"><small class="muted">Pod tolik kusů tým nesáhne – výroba z nich nebere suroviny a skladník je neprodá. Ty sám je prodávat i používat můžeš.</small>
    ${rows}${open ? (free.length ? `<div class="chips">${free.map(it => `<button class="chip" data-act="keepAdd" data-v="${it.id}">+ :${it.icon}: ${esc(it.name)}</button>`).join('')}</div>` : '<small class="muted">Všechno ve skladu už rezervu má.</small>') : ''}
    <div class="hire"><button class="btn sm alt" data-act="keepOpen">${open ? 'Hotovo' : '+ Přidat rezervu'}</button></div></div>`;
}

// dokupování pozemků kolem farmy
export function landHtml(farm, sel) {
  const price = landPrice(farm), lvl = landLevel(farm);
  const cards = LAND_PARCELS.map(p => {
    const own = farm.land.includes(p.id);
    const reach = landReachable(farm, p);
    const lines = own ? ['✓ tvůj pozemek'] : !reach ? ['nejdřív sousední pozemek'] : farm.level < lvl ? [`:lock: úroveň ${lvl}`] : [`${price} :coin:`];
    lines.push(`${p.w}×${p.h} políček`);
    return `<button class="crop${p.id === sel ? ' sel' : ''}${own || !reach ? ' dim' : ''}" data-act="selLand" data-v="${p.id}">
      <div class="nm">${esc(p.name)}</div>${lines.map(l => `<div class="meta">${l}</div>`).join('')}</button>`;
  }).join('');
  const sp = LAND_PARCELS.find(p => p.id === sel);
  let buy = '';
  if (sp && !farm.land.includes(sp.id) && landReachable(farm, sp)) {
    buy = farm.level < lvl ? `<div class="empty">:lock: Další pozemek koupíš od úrovně ${lvl}.</div>`
      : `<button class="btn" data-act="buyLand" data-v="${sp.id}"${farm.coins < price ? ' disabled' : ''}>Koupit ${esc(sp.name)} za ${price} :coin:</button>`;
  }
  return `<p class="muted">Když ti dojde místo, přikup pozemek kolem farmy. Každý další je dražší. Rohové pozemky jdou koupit, až máš některý vedlejší.</p>
    <div class="landmap">${landMap(farm, sel)}</div>
    ${buy}<div class="crops">${cards}</div>`;
}

// malá mapka 3×3: uprostřed farma, kolem pozemky
function landMap(farm, sel) {
  const grid = [['nw', 'n', 'ne'], ['w', '', 'e'], ['sw', 's', 'se']];
  return grid.map(row => row.map(id => {
    if (!id) return '<div class="lm farm">:house:</div>';
    const own = farm.land.includes(id);
    return `<button class="lm${own ? ' own' : ''}${id === sel ? ' sel' : ''}" data-act="selLand" data-v="${id}">${own ? '✓' : ':sign:'}</button>`;
  }).join('')).join('');
}

export const TASK_TABS = [['denni', 'Denní úkoly'], ['odmeny', 'Odměny'], ['zebricek', 'Žebříček']];

export function canClaimDaily(farm, now) { return farm.daily.day !== dayKey(now); }
export function claimableQuests(farm, now) {
  const qs = dailyQuests(farm, now);
  const n = qs.list.filter(q => !q.done && questProgress(farm, qs, q) >= q.n).length;
  return n + (!qs.bonus && qs.list.every(q => q.done) ? 1 : 0);
}

// 8 denních úkolů + bonus za všechny
export function questsHtml(farm, now) {
  const qs = dailyQuests(farm, now);
  const left = 86400000 - ((now + 3600000) % 86400000);
  const rows = qs.list.map((q, i) => {
    const T = QUEST_TYPES[q.t];
    const p = Math.min(q.n, questProgress(farm, qs, q));
    const ok = p >= q.n;
    const btn = q.done ? '<span class="okq">✓</span>' : `<button class="btn sm${ok ? '' : ' off'}" data-act="claimQuest" data-v="${i}">${q.coins} :coin:</button>`;
    return `<div class="row${q.done ? ' dim' : ''}"><span class="ico">:${T.icon}:</span><div class="info"><b>${T.text}: ${p}/${q.n}</b><small>odměna ${q.coins} :coin: + ${q.xp} :xp:</small>
      <div class="bar"><div style="width:${(p / q.n * 100).toFixed(1)}%"></div></div></div>${btn}</div>`;
  }).join('');
  const done = qs.list.filter(q => q.done).length;
  const b = questBonus(farm);
  const bonus = qs.bonus ? '<p class="muted">:trophy: Dnešní bonus máš. Zítra přijdou nové úkoly!</p>'
    : `<div class="row"><span class="ico">:gift:</span><div class="info"><b>Bonus za všech ${qs.list.length} úkolů (${done}/${qs.list.length})</b><small>${b.coins} :coin: + ${b.xp} :xp:</small></div>
      <button class="btn sm${done === qs.list.length ? '' : ' off'}" data-act="claimQuest" data-v="bonus">Vyzvednout</button></div>`;
  return `<p class="muted"><b>:star: Denní úkoly</b> – každý den nové. Nové za <b>${fmtTime(Math.ceil(left / 1000))}</b>.</p>${rows}${bonus}`;
}

// tržiště hráčů v městečku (jen online). data = odpověď serveru, form = rozpracovaná nabídka
export const MARKET_TABS = [['koupit', 'Koupit'], ['prodat', 'Prodat'], ['moje', 'Moje nabídky']];
export function marketHtml(farm, data, tab = 'koupit', form = {}, now = Date.now()) {
  const tabs = `<div class="tabs">${MARKET_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="mtab" data-v="${id}">${n}</button>`).join('')}</div>`;
  const intro = '<p class="muted">:market: Tady si hráči prodávají úrodu, výrobky i stroje. Cenu určuje prodávající – nejvýš trojnásobek běžné ceny.</p>';
  if (data && data.error) return tabs + intro + `<div class="empty">${esc(data.error)}</div>`;
  if (!data) return tabs + intro + '<div class="empty">Načítám tržiště…</div>';
  const what = o => (o.machine ? { icon: MACHINES[o.machine].icon, name: MACHINES[o.machine].name } : { icon: ITEMS[o.item].icon, name: `${o.qty}× ${ITEMS[o.item].name}` });
  if (tab === 'koupit') {
    const rows = data.offers.filter(o => (o.machine ? MACHINES[o.machine] : getItem(o.item))).map(o => {
      const w = what(o);
      return `<div class="row"><span class="ico">:${w.icon}:</span><div class="info"><b>${esc(w.name)}</b><small>od ${esc(o.name)} · běžně ${marketBase(o)} :coin:</small></div>
        <button class="btn sm${farm.coins >= o.price ? '' : ' off'}" data-act="marketBuy" data-v="${o.id}">${o.price} :coin:</button></div>`;
    }).join('');
    return tabs + intro + (rows || '<div class="empty">Zatím tu nikdo nic neprodává. Buď první – záložka Prodat!</div>') + '<button class="btn alt" data-act="marketReload" data-v="">↻ Obnovit</button>';
  }
  if (tab === 'moje') {
    const rows = data.mine.map(o => {
      const w = what(o);
      return `<div class="row"><span class="ico">:${w.icon}:</span><div class="info"><b>${esc(w.name)}</b><small>za ${o.price} :coin: · čeká na kupce</small></div>
        <button class="btn sm alt" data-act="marketCancel" data-v="${o.id}">Stáhnout</button></div>`;
    }).join('') || '<div class="empty">Nic nenabízíš.</div>';
    const sold = data.sold.map(s => `<div class="row"><span class="ico">:${s.machine ? MACHINES[s.machine].icon : ITEMS[s.item] ? ITEMS[s.item].icon : 'box'}:</span><div class="info"><b>Prodáno: ${s.machine ? esc(MACHINES[s.machine].name) : `${s.qty}× ${esc(ITEMS[s.item] ? ITEMS[s.item].name : s.item)}`}</b><small>koupil ${esc(s.buyer_name)} · +${s.coins} :coin:</small></div></div>`).join('');
    return tabs + `<p class="muted">Nabídky: <b>${data.mine.length}/${data.slots || MARKET_SLOTS}</b>. Stažená nabídka se ti vrátí do skladu. Peníze za prodané zboží ti přijdou samy.</p>` + rows + (sold ? '<p class="muted"><b>Naposledy prodáno</b></p>' + sold : '');
  }
  // prodat: vybrat zboží ze skladu nebo stroj, počet a cenu
  const items = ITEM_LIST.filter(it => have(farm, it.id) > 0);
  const chips = items.map(it => `<button class="chip${form.item === it.id ? ' on' : ''}" data-act="mPick" data-v="i:${it.id}">:${it.icon}: ${have(farm, it.id)}</button>`).join('')
    + farm.machines.map(m => `<button class="chip${form.machine === m.id ? ' on' : ''}" data-act="mPick" data-v="m:${m.id}">:${MACHINES[m.model].icon}: ${esc(MACHINES[m.model].name)}</button>`).join('');
  let f = '';
  if (form.item && have(farm, form.item) > 0) {
    const it = ITEMS[form.item];
    const qty = Math.max(1, Math.min(have(farm, it.id), form.qty || 1));
    const l = { item: it.id, qty };
    const price = Math.max(1, Math.min(marketMaxPrice(l), form.price || marketBase(l)));
    f = `<div class="upg"><b>:${it.icon}: ${esc(it.name)}</b> (máš ${have(farm, it.id)})
      <div class="mform"><label>Počet <span class="stepper"><button data-act="mQty" data-v="-10">−10</button><button data-act="mQty" data-v="-1">−</button><b>${qty}</b><button data-act="mQty" data-v="1">+</button><button data-act="mQty" data-v="10">+10</button></span></label>
      <label>Cena <span class="stepper"><button data-act="mPrice" data-v="-10">−10</button><button data-act="mPrice" data-v="-1">−</button><b>${price} :coin:</b><button data-act="mPrice" data-v="1">+</button><button data-act="mPrice" data-v="10">+10</button></span></label></div>
      <small>Běžná cena ${marketBase(l)} :coin:, nejvýš ${marketMaxPrice(l)} :coin:. Výkup ve skladu by dal ${qty * sellPrice(it.id, now)} :coin:.</small>
      <button class="btn" data-act="marketList" data-v="">Vystavit za ${price} :coin:</button></div>`;
  } else if (form.machine && farm.machines.some(m => m.id === form.machine)) {
    const m = farm.machines.find(x => x.id === form.machine);
    const l = { machine: m.model };
    const price = Math.max(1, Math.min(marketMaxPrice(l), form.price || marketBase(l)));
    f = `<div class="upg"><b>:${MACHINES[m.model].icon}: ${esc(MACHINES[m.model].name)}</b>
      <div class="mform"><label>Cena <span class="stepper"><button data-act="mPrice" data-v="-100">−100</button><button data-act="mPrice" data-v="-10">−10</button><b>${price} :coin:</b><button data-act="mPrice" data-v="10">+10</button><button data-act="mPrice" data-v="100">+100</button></span></label></div>
      <small>Nový stojí ${marketBase(l)} :coin:, nejvýš ${marketMaxPrice(l)} :coin:. Ve stodole bys za něj dostal ${Math.round(MACHINES[m.model].cost * 0.5)} :coin:.</small>
      <button class="btn" data-act="marketList" data-v="">Vystavit za ${price} :coin:</button></div>`;
  }
  return tabs + `<p class="muted">Vyber, co chceš prodat (nabídek ${data.mine.length}/${data.slots || MARKET_SLOTS}). Zboží se ze skladu přesune na tržiště, dokud ho někdo nekoupí nebo ho nestáhneš.</p>
    <div class="chips">${chips || '<span class="muted">Sklad je prázdný.</span>'}</div>${f}`;
}
export function claimableAch(farm) {
  return ACHIEVEMENTS.filter(a => { const t = farm.ach[a.id] || 0; return t < a.tiers.length && (farm.stats[a.stat] || 0) >= a.tiers[t]; }).length;
}

export function tasksHtml(farm, now, tab, board) {
  const tabs = `<div class="tabs">${TASK_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="ttab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'zebricek') {
    if (!board) return tabs + '<div class="empty">Načítám žebříček…</div>';
    const rows = board.top.map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span class="rank">${i + 1}.</span><div class="info"><b>${esc(r.name)}</b><small>úroveň ${r.level} · ${r.xp} :xp:</small></div>
      ${r.me ? '' : `<button class="btn sm alt" data-act="visit" data-v="${esc(r.name)}">:house: Navštívit</button>`}</div>`).join('');
    const mine = board.me && !board.top.some(r => r.me) ? `<p class="muted">Tvoje místo: <b>${board.me.rank}.</b> (úroveň ${board.me.level || farm.level})</p>` : '';
    return tabs + '<p class="muted">Pořadí podle úrovně hráče. Klepni na Navštívit a podívej se, jak hospodaří ostatní.</p>' + (rows || '<div class="empty">Zatím tu nikdo není.</div>') + mine;
  }
  if (tab === 'denni') return tabs + questsHtml(farm, now);
  const can = canClaimDaily(farm, now);
  const next = can ? (farm.daily.day === dayKey(now - 86400000) ? farm.daily.streak % 7 + 1 : 1) : farm.daily.streak;
  const days = DAILY.map((d, i) => {
    const n = i + 1;
    const cls = n < next || (!can && n === next) ? 'got' : n === next && can ? 'today' : '';
    return `<div class="day ${cls}"><small>den ${n}</small><span>${d.coins}</span>:coin:${d.xp ? `<small>+${d.xp} :xp:</small>` : ''}</div>`;
  }).join('');
  const daily = `<p class="muted"><b>:gift: Denní odměna</b> – přijď každý den, 7. den je velká odměna. Když den vynecháš, začínáš znovu.</p>
    <div class="days">${days}</div>
    ${can ? '<button class="btn" data-act="claimDaily" data-v="">Vyzvednout dnešní odměnu</button>' : '<p class="muted">Dnešní odměnu máš. Další zítra.</p>'}`;
  const ach = ACHIEVEMENTS.map(a => {
    const tier = farm.ach[a.id] || 0;
    const val = farm.stats[a.stat] || 0;
    const stars = [0, 1, 2].map(k => `<span class="star${k < tier ? ' on' : ''}">★</span>`).join('');
    if (tier >= a.tiers.length) {
      return `<div class="row"><span class="ico">:${a.icon}:</span><div class="info"><b>${a.name} ${stars}</b><small>Hotovo všechno – ${val}×</small></div></div>`;
    }
    const goal = a.tiers[tier];
    const ok = val >= goal;
    return `<div class="row"><span class="ico">:${a.icon}:</span><div class="info"><b>${a.name} ${stars}</b><small>${a.text}: ${Math.min(val, goal)}/${goal}</small>
      <div class="bar"><div style="width:${Math.min(100, val / goal * 100).toFixed(1)}%"></div></div></div>
      <button class="btn sm${ok ? '' : ' off'}" data-act="claimAch" data-v="${a.id}">${a.coins[tier]} :coin:</button></div>`;
  }).join('');
  return tabs + daily + `<p class="muted"><b>:trophy: Úkoly</b> – každý má 3 stupně.</p>` + ach;
}

export function siloTitle(farm) {
  return `Sklad ${siloUsed(farm)}/${farm.siloCap}`;
}

// ---------- v11: rybník a včelín ----------
export function pondHtml(farm, o, now) {
  const s = pondStock(o, now);
  const rod = farm.machines.find(m => m.model === 'udice2') || farm.machines.find(m => m.model === 'udice');
  const bait = have(farm, 'navnada');
  const rec = farm.fishRec || {};
  const fishRows = FISH_LIST.map(f => `<span class="chip${farm.level < f.level ? ' dim' : ''}">:${f.icon}: ${f.name} ${farm.level < f.level ? `:lock: ${f.level}` : rec[f.id] ? `:trophy: ${fmtKg(rec[f.id])}` : `${f.price} :coin:`}</span>`).join('');
  const w = weatherAt(now);
  const need = !rod ? '<div class="empty">:udice: Na rybaření potřebuješ <b>udici</b> – koupíš ji v Prodejně strojů v městečku.</div>'
    : !bait ? '<div class="empty">:navnada: Došla ti <b>návnada</b>. Vyrob ji v Krmivárně (1 pšenice + 1 kukuřice = 3 návnady).</div>' : '';
  return `<div class="row"><span class="ico">:pond:</span><div class="info"><b>Ryby v rybníku: ${s.count}/${s.cap}</b>
      <small>${s.count < s.cap ? `další ryba za ${fmtTime(Math.ceil(s.next / 1000))}` : 'rybník je plný'} · návnada ${bait} :navnada:${rod ? ` · ${MACHINES[rod.model].name}` : ''}</small></div></div>
    ${need}
    <button class="btn${rod && bait && s.count ? '' : ' off'}" data-act="fish" data-v="${o.id}">:udice: Rybařit (1 návnada)</button>
    <p class="muted">:${w.icon}: ${w.name}: ${w.fish > 1 ? 'ryby teď berou dobře a častěji zabere velká.' : w.fish < 1 ? 'ryby teď moc neberou.' : 'běžné rybaření.'}
      Velká ryba dá 2 kusy, obří 3. U každé ryby se ukazuje tvůj rekord :trophy:.</p>
    <p class="muted">Hodíš udici a čekáš. Když ryba zabere, rychle klepni. Pak drž prst na obrazovce, aby zelená čárka zůstala u ryby, dokud se ukazatel nenaplní. Těžší ryby víc uhýbají.</p>
    <div class="chips">${fishRows}</div>
    ${upgradeBlock(farm, o)}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout rybník</button>`;
}

export function hiveHtml(farm, o, now) {
  const s = hiveStock(farm, o, now);
  const flowers = hiveFlowers(farm, o);
  return `<div class="row"><span class="ico">:hive:</span><div class="info"><b>Plástve medu: ${s.count}/${s.cap}</b>
      <small>${s.count < s.cap ? `další za ${fmtTime(Math.ceil(s.next / 1000))}` : 'včelín je plný – vyber ho'}</small></div></div>
    ${s.count ? `<button class="btn" data-act="collect" data-v="${o.id}">Vybrat :plast: (${s.count})</button>` : ''}
    <p class="muted">${flowers ? ':flowers: Kolem jsou květy – včely pracují o čtvrtinu rychleji.' : ':flowers: Tip: záhon květin, kvetoucí strom nebo sad do 4 políček zrychlí včely o čtvrtinu.'}
      Sady do 4 políček od včelína dají při sklizni o 1 plod víc. Z pláství udělá Medárna med a svíčky.</p>
    ${workerBlock(farm, o, now)}${upgradeBlock(farm, o)}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout včelín</button>`;
}

// ---------- v11: průvodce pro nové hráče ----------
// done = splněno (podle farmy), info = jen vysvětlení s tlačítkem Dál
export const TUTORIAL = [
  { text: 'Klepni na prázdné pole a vyber <b>Pšenici</b>. Pak můžeš prstem přejet přes další pole a zasít je najednou.', done: f => (f.stats.plant || 0) > 0 },
  { text: 'Pšenice roste 1 minutu. Až zezlátne, <b>přejeď prstem</b> přes zralá pole a sklidíš je do skladu.', done: f => (f.stats.harvest || 0) >= 2 },
  { text: 'Peníze vyděláš <b>zakázkami</b> (klepni na Statek) nebo prodejem ve <b>Skladu</b>. Zkus jedno z toho.', done: f => (f.stats.orders || 0) > 0 || (f.stats.sold || 0) > 0 },
  { text: 'Otevři <b>Stavět</b> a postav <b>Semenárnu</b> nebo <b>Pekárnu</b> – z úrody budeš vyrábět.', done: f => f.objects.some(o => BUILDINGS[o.kind].type === 'factory') },
  { text: 'V <b>Úkolech</b> čeká každý den 8 denních úkolů a denní odměna. Plň je, dostaneš mince.', info: true },
  { text: 'Tlačítko <b>Městečko</b> vpravo nahoře: prodejna strojů, stánek a tržiště, kde obchoduješ s kamarády.', info: true },
  { text: 'Pracovníci potřebují bydlet. Až budeš mít 200 mincí, postav <b>Chatrč</b> (Stavět → Farma).', done: f => f.objects.some(o => BUILDINGS[o.kind].type === 'house') },
  { text: 'V Městečku najdeš <b>Nástěnku</b>. Vyvěs inzerát, zaplať pohoštěním (stačí 4 pšenice) a vyber si prvního pracovníka.', done: f => f.vill.length > 0 || f.board.ads.length > 0 },
  { text: 'Vylepšuj <b>Statek</b> – za zásluhy odemyká nové budovy, pole a sady. Všechno najdeš v <b>Menu → Jak hrát</b>. Hodně štěstí!', info: true },
];

// ---------- v11: pravidla a nápověda (Menu → Jak hrát) ----------
export const HELP_TABS = [['zaklady', 'Základy'], ['statek', 'Statek'], ['urovne', 'Úrovně'], ['mesto', 'Městečko'], ['ryby', 'Rybník a včely'], ['tipy', 'Počasí a další']];
export function helpHtml(farm, tab = 'zaklady') {
  const tabs = `<div class="tabs">${HELP_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="htab" data-v="${id}">${n}</button>`).join('')}</div>`;
  const p = t => `<p class="muted">${t}</p>`;
  let body = '';
  if (tab === 'zaklady') {
    body = p('<b>:wheat: Pole:</b> klepni na prázdné pole, vyber plodinu a přejeď prstem přes další pole. Zralé pole sklidíš přejetím. Sklizeň jde do <b>Skladu</b> – když je plný, prodej něco nebo ho vylepši.')
      + p('<b>:seed_info: Osivo:</b> sázení stojí mince, nebo bere <b>semena</b> ze zásob ve <b>Statku</b> (3 kusy na každé pole a sad). Semena a sazenice vyrábí Semenárna a Školka, nebo je koupíš ve Stánku (záložka Zásoby).'.replace(':seed_info:', ':s_wheat:'))
      + p('<b>:helper: Farmářský tým</b> (tlačítko <b>Tým</b> vpravo): pracovníci se nekupují, <b>hledají se</b>. Postav domek (<b>Chatrč</b> 2 lůžka, <b>Chata</b> 3, <b>Dům</b> 5), pak v Městečku na <b>Nástěnce</b> vyvěs inzerát a zaplať pohoštěním z farmy. Za chvíli přijdou uchazeči – každý má profesi, úroveň a jednu vlastnost. Jednoho přijmeš.')
      + p('<b>:star: Pověst farmy</b> roste za doručené zakázky a splněné denní úkoly. S lepší pověstí přijde víc a zkušenějších uchazečů, můžou viset dva inzeráty a od stupně 3 se lidé z Městečka ozvou sami.')
      + p('<b>:farmer: Profese:</b> <b>Pěstitel</b> (pole a sady), <b>Chovatel</b> (zvířata a včely), <b>Řemeslník</b> (výrobny), <b>Skladník</b> (prodej na trhu každou půlhodinu). Pracovník umí cokoli, ale ve své profesi se učí naplno a pracuje lépe.')
      + p('<b>:star: Zkušenosti:</b> pracovník je dostává za hotovou práci – čím hodnotnější věc, tím víc. Má 12 úrovní a s každou udělá za stejný čas víc: pěstitel na úrovni 1 zvládne políčko za 12 s, na úrovni 12 za 1 s; řemeslník naloží do jedné dávky víc kusů. Náročnější výrobky, plodiny a zvířata zvládne až s praxí (v plánu je uvidíš šedě).')
      + p('<b>:sign: Plán práce</b> patří pracovišti, ne člověku – když pracovníka vyměníš, plán zůstane. Ve výrobně nastavíš <b>cílové zásoby</b> (mají přednost, v pořadí shora) a <b>procenta výrobního času</b> posuvníkem. Když procenta nedají 100 %, budova zbytek času stojí – nebo zapni <b>Přerozdělit nevyužité</b>. Ve Skladu nastavíš <b>rezervy</b>: pod tolik kusů tým nesáhne.')
      + p('<b>:plot: Kolik lidí kam:</b> ve výrobně, ohradě, včelíně a skladu je zatím místo pro jednoho. Pracovní oblast polí nebo sadů vezme jednoho pracovníka na každá 4 pole (6 polí = 1, 8 polí = 2, 12 polí = 3). Na plné místo jde jen výměnou.')
      + p('<b>:chleb: Výroba:</b> výrobny dělají z úrody výrobky (fronta až 3 kusy). Klepnutím na budovu vybereš hotové.')
      + p('<b>:hen: Zvířata:</b> potřebují ohradu a krmivo z Krmivárny. Nakrmíš klepnutím na ohradu.')
      + p('<b>:coin: Peníze:</b> nejvíc platí <b>zakázky</b> ve Statku, pak <b>stánek</b> a <b>tržiště</b>. Výkup ve Skladu platí polovinu ceny a mění se každé 4 hodiny.')
      + p('<b>:xp: Úroveň hráče</b> roste za každou práci a pořád dál. Odemyká nové plodiny, zvířata, stromy, ryby, stroje a recepty.')
      + p('<b>:sign: Pozemky:</b> klepni na ceduli „Na prodej“ za plotem a farmu zvětšíš.')
      + p('<b>:chleb: Tabulka práce:</b> v okně budovy nebo oblasti nastavíš, co se tam dělá: na poli jakou část čím osázet, ve výrobně podíl výrobků a strop zásoby, ve skladu kolik procent zásoby jde na trh a kolik si nechat.')
      + p('<b>↔ Přesun:</b> podrž prst na budově nebo poli, zvedne se a můžeš ho táhnout. Potvrď ✓ dole. Přesunout jde všechno, i Statek, a pole i s tím, co na něm roste.');
  } else if (tab === 'statek') {
    const rows = [];
    for (let L = 1; L <= MAX_BLD_LEVEL; L++) {
      const f = { objects: [{ kind: 'statek', lvl: L }] };
      const b = BUILDING_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`).join(', ');
      rows.push(`<tr${statekLevel(farm) === L ? ' class="me"' : ''}><td><b>${L}</b></td><td>${b || '–'}${meritShort(L) ? `<br><small>zásluhy: ${meritShort(L)}</small>` : ''}</td><td>${maxPlots(f)} / ${maxOrchards(f)} / ${maxBigFields(f)}</td></tr>`);
    }
    body = p('Co můžeš <b>stavět</b>, určuje úroveň <b>Statku</b>. Vylepšíš ho za mince a suroviny, ale jen když farma splní <b>zásluhy</b>: úroveň hráče a jeden úkol (sklizeň, zakázky, živočišné produkty, výroba nebo pověst). Klepni na Statek → záložka Statek. Ostatní budovy můžeš vylepšit nejvýš na úroveň Statku.')
      + `<table class="help"><tr><th>Statek</th><th>Odemkne</th><th>Polí / sadů / velkých polí</th></tr>${rows.join('')}</table>`;
  } else if (tab === 'urovne') {
    const by = {};
    const add = (lv, txt) => { (by[lv] = by[lv] || []).push(txt); };
    for (const c of CROP_LIST) add(c.level, `:${c.icon}: ${c.name}`);
    for (const a of ANIMAL_LIST) add(a.level, `:${a.icon}: ${a.name}`);
    for (const t of TREE_LIST) add(t.level, `:${ITEMS[t.fruit].icon}: ${t.name}`);
    for (const f of FISH_LIST) add(f.level, `:${f.icon}: ${f.name}`);
    for (const m of MACHINE_LIST) add(m.level, `:${m.icon}: ${m.name}`);
    for (const r of Object.values(RECIPES)) if (PRODUCTS[r.id]) add(r.level, `:${ITEMS[r.id].icon}: ${ITEMS[r.id].name}`);
    add(HELPER_LEVEL, ':helper: Pomocník');
    const rows = Object.keys(by).map(Number).sort((a, b) => a - b).map(lv => `<tr${farm.level >= lv ? '' : ' class="dim"'}><td><b>${lv}</b></td><td>${by[lv].join(', ')}</td></tr>`).join('');
    body = p(`Tvoje úroveň: <b>${farm.level}</b>. Úroveň hráče odemyká, co můžeš pěstovat, chovat, lovit a vyrábět (k výrobě potřebuješ i budovu – tu odemyká Statek).`)
      + `<table class="help"><tr><th>Úroveň</th><th>Odemkne</th></tr>${rows}</table>`;
  } else if (tab === 'mesto') {
    body = p('Po prašné cestě ze spodního rohu farmy dojdeš do <b>městečka</b> (tlačítko Městečko vpravo nahoře).')
      + p('<b>:shop: Prodejna strojů:</b> traktory, kombajny, pluh, secí stroj, lis, náčiní pro pomocníka a udice. Traktory a kombajny parkují ve Stodole. Vylepšená prodejna dává slevu.')
      + p('<b>:stall: Stánek:</b> každé 2 hodiny nová nabídka. Prodá ti, co chybí (dráž), a vykoupí za víc než Sklad.')
      + p('<b>:market: Tržiště hráčů</b> (jen online): prodávej kamarádům úrodu, výrobky i stroje za vlastní cenu, nejvýš trojnásobek běžné. Najednou 8 nabídek. Peníze ti přijdou samy.')
      + p('<b>:trophy: Žebříček</b> (Úkoly → Žebříček) řadí podle úrovně. Tlačítkem Navštívit se podíváš na cizí farmu.');
  } else if (tab === 'ryby') {
    body = p('<b>:pond: Rybník</b> (od Statku 2): kup <b>udici</b> v Prodejně strojů a vyrob <b>návnadu</b> v Krmivárně. Klepni na rybník → Rybařit.')
      + p('Až ryba <b>zabere</b>, rychle klepni. Pak <b>drž prst</b> na obrazovce – zelená čárka stoupá, pustíš – klesá. Drž rybu v čárce, dokud se ukazatel nenaplní. Když ukazatel spadne na nulu, ryba uteče. Karbonová udice má širší čárku a častěji zabere vzácná ryba.')
      + p('V rybníku je jen pár ryb, každých 10 minut jedna přibude. Ryby prodáš, nebo z nich uděláš jídla v <b>Rybárně</b>.')
      + p('<b>Velikost:</b> každá ryba má váhu. Velká ryba dá do skladu 2 kusy, obří 3 a je těžší ji udržet. Největší úlovek každého druhu se ukazuje jako rekord. V dešti a s karbonovou udicí častěji zabere velká a vzácná ryba.')
      + `<div class="chips">${FISH_LIST.map(f => `<span class="chip">:${f.icon}: ${f.name} · úr. ${f.level} · ${fmtKg(f.kg[0])}–${fmtKg(f.kg[1])} · ${f.price} :coin:</span>`).join('')}</div>`
      + p('<b>:hive: Včelín</b> (od Statku 3): včely samy dělají <b>plástve medu</b>. Květiny, kvetoucí strom nebo sad do 4 políček je zrychlí. Sady blízko včelína dají při sklizni o 1 plod víc. <b>Medárna</b> z pláství udělá med a svíčky, Pekárna perník a medovník.');
  } else {
    body = p('<b>:bell: Upozornění</b> ti do telefonu napíše, když je úroda zralá, výroba hotová nebo když ti někdo koupil zboží na tržišti. Zapneš je v Menu.')
      + p('<b>iPhone a iPad:</b> nejdřív v Safari klepni na Sdílet → <b>Přidat na plochu</b>, otevři hru z plochy a teprve tam upozornění zapni.')
      + p('<b>Android:</b> stačí Menu → Zapnout upozornění a povolit.')
      + p('<b>:w_sun: Počasí</b> je stejné pro všechny a mění se každé 2 hodiny (vlevo nahoře). ' + Object.values(WEATHER).map(x => `:${x.icon}: <b>${x.name}</b>: ${x.text}`).join(' '))
      + p('<b>:chat: Chat</b> (vpravo nahoře) je společný pro všechny hráče. Klepnutím na jméno navštívíš jeho farmu.')
      + p('<b>:gift: Denní odměna</b> roste 7 dní po sobě. <b>Denních úkolů</b> je každý den 8 a za všechny je bonus.');
  }
  return tabs + body + '<button class="btn alt" data-act="tutRestart" data-v="">:farmer: Spustit průvodce znovu</button>';
}
