// EKOfarm – obsah panelů (obchod, budova, ohrada, sklad). Vrací HTML; kliknutí obsluhuje main.js přes data-act.
import {
  ITEMS, ITEM_LIST, RECIPES, BUILDINGS, BUILDING_LIST, ANIMALS, ANIMAL_LIST,
  queueSize, penMax, upgradeCost, upgradeEffect, objLevel, statekLevel, MAX_BLD_LEVEL, garageSlots, vehicleCount,
  FISH_LIST, FISH_SIZES, fmtKg, weatherAt, WEATHER, pondStock, hiveStock, hiveFlowers, PRODUCTS,
  SEEDS, SAPLINGS, recipeQty, dailyQuests, questProgress, QUEST_TYPES, questBonus, MARKET_SLOTS, marketMaxPrice, marketBase, getItem,
  machinePrice, isVehicle, stallOffers, stallLeft, HELPER_PLANS, HELPER_LEVEL, helperActive, helperCapacity, helperInterval, CROP_CATS, getCrop,
  have, hasInputs, countKind, maxPlots, plotPrice, siloUsed, siloUpgradePrice, queueState, animalState,
  CROP_LIST, LEVEL_XP, MAX_LEVEL, plotState,
  TREES, TREE_LIST, FREE_PLOTS, TUTORIAL_DONE, maxOrchards, orchardPrice, treeState, treeRefund, orderReady, canDeliver,
  LAND_PARCELS, landPrice, landLevel, landReachable,
  dailyReward, DAILY_DECO, ACHIEVEMENTS, dayKey, sellPrice, marketMult, nextMarketChange, fieldYield, hasTool,
  MACHINES, MACHINE_LIST, MACHINE_TYPE_NAME, FIELD_CELL_PRICE, FIELD_MIN, FIELD_MAX, CROPS,
  maxBigFields, machineJob, freeMachine, fieldState, jobSeconds, hasMachine,
  VILL_MAX, AREA_MIN, workAreas, areaOf, isFarmer, isSeedItem, seedCap, seedUsed, SEEDS_PER, supplyPrice, villName, villJobType, villAt, findObject,
  workMs, TRADE_IV, PLAN_ROWS, nextTrade, tradeRound, planTotal, villLevel, villOut, speedMult, stockOf, keepOf, wpGet, wpWorkers, wpCap, areaCap, crewPower, bldCap, bldCapNext, factoryRate, penStats, penOut, animalCycleMs, ANIMAL_CYCLE, hiveIv, villMainLevel, villPower, OBOR, needLvl, MAX_VLVL,
  beds, teamCap, teamFree, centerData, LEDGER_SRC, ALERT_LVL, AWAY_MIN, repTier, repNext, adOffers, adWaitMs, statekMerits, TOWN_HOUSES,
  bestOwned, stOk, recipeOk, fishOk, machineLock, SKILLS, SKILL_MAX, skillLevel, skillProgress, levelProgress, POND, DOG, eventNow, EVENTS_BY, evDef, STORY_BY, answerShown, storyText, chapterOf, chapterReward, answerNeed, evCoins, fxActive, fxText, FX_INFO, FJ_MASTER, FJ_ALL, FJ_ALL_MASTER, fjFirst, fjMaster,
  weekNo, weekStart, weekTask, WEEK_PRIZES, WEEK_MS, helpUsed, HELP,
} from './rules.js?v=42';
import { fmtTime } from './render.js?v=42';
import { TEAM } from './team-config.js?v=42';
import { NEWS } from './news.js?v=42';
import { STORY, CHAPTERS, STORY_PEOPLE } from './story.js?v=42';
import { assetUrl, hasAsset, spriteName } from './sprites.js?v=42';

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
    .sort((a, b) => (a.gift && farm.pending.includes(a.id) ? -1 : 0) - (b.gift && farm.pending.includes(b.id) ? -1 : 0) || a.st - b.st || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.cost - b.cost);   // dárky zdarma nahoru
  const cards = list.map(b => {
    const free = farm.pending.includes(b.id);
    const locked = !free && b.st > statekLevel(farm);
    const n = countKind(farm, b.id);
    const done = !free && b.max && n >= b.max;
    const gift = b.gift && !free && !done;   // v39: vzácná ozdoba – jen jako odměna (příběh, denní série)
    const cta = free ? 'Zdarma' : gift ? 'Odměna' : locked ? `Statek úr. ${b.st}` : done ? '✓ Postaveno' : 'Postavit';
    const own = done && farm.objects.find(o => o.kind === b.id);   // postavená budova: klepnutím se otevře (vylepšení)
    return card({ icon: b.icon, img: bImg(b.id), name: b.name, locked, act: own ? 'openObj' : 'buy', v: own ? own.id : b.id, done, disabled: !done && !free && farm.coins < b.cost,
      size: `${b.w}×${b.h}`, price: free || done || gift ? undefined : b.cost, badge: gift ? ':gift: odměna' : locked ? `:lock: Statek ${b.st}` : n && b.max > 1 ? `${n}/${b.max}` : n && b.type === 'house' ? `${n}×` : '',
      lines: free ? [':gift: dostal jsi zdarma'] : gift ? [`<small>${b.gift}</small>`] : locked && meritShort(b.st) ? [`<small>${meritShort(b.st)}</small>`] : b.beds ? [`:helper: ${bedsText(b.beds)}`] : [], cta });
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
      const locked = !stOk(farm, a);   // v37: podle Statku
      const homes = farm.objects.filter(o => o.kind === a.home);
      const count = homes.reduce((n, o) => n + o.animals.length, 0);
      const cap = homes.reduce((n, o) => n + penMax(o), 0);
      const home = BUILDINGS[a.home];
      const hi = bImg(a.home);
      const need = `${hi ? `<img src="${hi}" alt="">` : `:${home.icon}:`}<span>Potřebuje<br><b>${esc(home.name)}</b></span><i class="${homes.length ? 'ok' : 'no'}">${homes.length ? '✓' : '✕'}</i>`;
      return card({ icon: a.icon, img: hasAsset('z', a.id) ? assetUrl('z', a.id) : null, name: a.name, locked, act: 'buyAnimal', v: a.id,
        disabled: !homes.length || count >= cap || farm.coins < a.cost, price: a.cost, need: locked ? '' : need,
        lines: locked ? [] : homes.length ? [`${count}/${cap} v ohradě`] : [], badge: locked ? `:lock: Statek ${a.st}` : '',
        cta: locked ? `Statek ${a.st}` : !homes.length ? `Nejdřív ${home.name.toLowerCase()}` : count >= cap ? 'Ohrada plná' : ':cart: Koupit' });
    });
    // v36: farmářský pes – chodí s farmářem a při nebezpečných událostech (liška, zloděj…) zmírní trest
    const dl = farm.level < DOG.level;
    cards.unshift(card({ icon: 'pes', img: hasAsset('i', 'pes') ? assetUrl('i', 'pes') : null, name: farm.dog ? `Pes ${farm.dog.name}` : 'Farmářský pes', locked: dl,
      act: 'buyDog', v: 'pes', disabled: !!farm.dog || farm.coins < DOG.cost, price: farm.dog || dl ? undefined : DOG.cost, done: !!farm.dog,
      lines: farm.dog ? ['Hlídá farmu'] : dl ? [] : ['Hlídá farmu: u lišky, zloděje, myší a větru zmírní trest'], badge: dl ? `:lock: Úr. ${DOG.level}` : '',
      cta: farm.dog ? '✓ Tvůj pes' : dl ? `Úroveň ${DOG.level}` : ':cart: Koupit' }));
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
  const lvls = [];            // v37: úroveň Statku = nejdřívější cesta, jak surovinu získat
  const lv = l => lvls.push(l || 1);
  const go = x => `<button class="chip" data-act="itemInfo" data-v="${x}">:${ITEMS[x].icon}: ${esc(ITEMS[x].name)}</button>`;
  const c = CROPS[id];
  if (c) { src.push(`:plot: Roste na <b>poli</b> – sklizeň za ${fmtTime(c.time)}, ${c.yield} ks z políčka.`); lv(c.st); }
  const tr = TREE_LIST.find(t => t.fruit === id);
  if (tr) { src.push(`:tree: Ovocný strom <b>${esc(tr.name)}</b> v sadu (${tr.harvests}× úroda po ${tr.yield} ks).`); lv(tr.st); }
  const an = ANIMAL_LIST.find(a => a.product === id);
  if (an) { src.push(`:${an.icon}: Dává ho <b>${esc(an.name)}</b> v budově ${esc(BUILDINGS[an.home].name)} – nakrm ji ${go(an.feed)}`); lv(an.st); }
  if (id === 'plast') src.push(':hive: Sbírají ho včely ve <b>Včelíně</b> (kvetoucí sad nebo květiny poblíž pomůžou).');
  if (id === 'slama') src.push(':field: Zbyde na <b>velkém poli</b> po sklizni obilí – slisuje ji <b>Lis</b>.');
  const fsh = FISH_LIST.find(f => f.id === id);
  if (fsh) { src.push(`:pond: Chytíš ho na udici v <b>rybníku</b> (potřebuješ ${go('navnada')})${fsh.fishLv > 1 ? `, od úrovně <b>rybaření ${fsh.fishLv}</b>` : ''}.`); lv(fsh.st); }
  const r = RECIPES[id];
  if (r) {
    const b = BUILDINGS[r.building];
    src.push(`:${b.icon}: Vyrábí <b>${esc(b.name)}</b>${recipeQty(r) > 1 ? ` (${recipeQty(r)} ks najednou)` : ''} z: ${Object.entries(r.in).map(([x, n]) => `${n}× ${go(x)}`).join(' ')} – ${fmtTime(r.time)}.${b.st > 1 ? ` Budova od Statku úrovně ${b.st}.` : ''}${r.cook > 1 ? ` Recept od úrovně <b>vaření ${r.cook}</b>.` : ''}`);
    lv(r.st);
  }
  const any = { level: 999, objects: [{ kind: 'statek', lvl: 99 }] };
  if (supplyPrice(any, id) !== null) src.push(`:stall: Koupíš ve <b>Stánku</b> v městečku (záložka Zásoby) za ${supplyPrice(any, id)} :coin:.`);
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
    const locked = statekLevel(farm) < lvl, n = have(farm, it.id);
    return `<button class="witem${locked ? ' locked' : ''}" data-act="itemInfo" data-v="${it.id}">
      <span class="ico">:${it.icon}:${n ? `<i class="n">${n}</i>` : ''}</span><b>${esc(it.name)}</b>
      <small>${locked ? `:lock: Statek ${lvl}` : n ? `máš ${n}` : '&nbsp;'}</small></button>`;
  }).join('');
  return `<p class="muted">Všechny suroviny na farmě. Klepni na kteroukoli a uvidíš, kde ji získáš a k čemu je. Zamčené otevře vylepšení Statku na uvedenou úroveň.</p>
    ${tabsHtml(WIKI_TABS, tab, 'wtab')}<div class="wgrid">${tiles}</div>`;
}
export function itemHtml(farm, id, back) {
  const info = itemInfo(farm, id);
  const locked = statekLevel(farm) < info.level;
  return `${back ? '<button class="btn sm alt back" data-act="itemBack">← Zpět</button>' : ''}
    <div class="wdet"><span class="ico">:${info.it.icon}:</span><div><b>${esc(info.it.name)}</b>
      <small>${locked ? `:lock: Otevře se se Statkem úrovně <b>${info.level}</b> (máš ${statekLevel(farm)}).` : `Máš <b>${have(farm, id)}</b>${isSeedItem(id) ? ' v zásobách Statku' : ' ve Skladu'}.`}</small></div></div>
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
// sloučený úkon: „ · 3 políčka“
const cnt = (j, few, many) => { const n = (j.ids || j.xs || []).length; return n > 1 ? ` · ${n} ${n < 5 ? few : many}` : ''; };
// co vesničan právě dělá (v.job), nebo na co čeká (v.w)
function villDoing(farm, v, type) {
  const j = v.job;
  if (j) {
    const c = cellOf(farm, j.id);
    switch (j.k) {
      case 'harvest': return (c && c.crop ? `Sklízí :${CROPS[c.crop].icon}: ${CROPS[c.crop].name.toLowerCase()}` : 'Sklízí') + cnt(j, 'políčka', 'políček');
      case 'plant': return (CROPS[j.x] ? `Sází :${CROPS[j.x].icon}: ${CROPS[j.x].name.toLowerCase()}` : 'Sází') + cnt(j, 'políčka', 'políček');
      case 'pick': return (c && c.tree ? `Trhá :${ITEMS[TREES[c.tree].fruit].icon}: ${ITEMS[TREES[c.tree].fruit].name.toLowerCase()}` : 'Trhá ovoce') + cnt(j, 'stromy', 'stromů');
      case 'dig': return 'Vykopává suchý strom';
      case 'sapling': return (TREES[j.x] ? `Sází :z_${j.x}: ${TREES[j.x].name.toLowerCase()}` : 'Sází strom') + cnt(j, 'stromy', 'stromů');
      case 'haul': return 'Nese hotové do skladu';
      case 'load': return ITEMS[j.x] ? `Chystá výrobu: :${ITEMS[j.x].icon}: ${ITEMS[j.x].name.toLowerCase()}` : 'Chystá výrobu';
      case 'feed': return 'Krmí zvířata' + cnt(j, 'zvířata', 'zvířat');
      case 'gather': return 'Sbírá od zvířat' + cnt(j, 'zvířata', 'zvířat');
      case 'comb': return 'Vybírá plástve';
    }
  }
  switch (v.w) {
    case 'plan': return type === 'trader' ? 'Nemá co prodávat – přidej zboží do plánu' : type === 'factory' ? 'Nemá co vyrábět – přidej výrobek nebo cíl do plánu' : 'Nemá co sázet – přidej něco do plánu';
    case 'seeds': return type === 'sad' ? 'Ve Statku došly sazenice' : 'Ve Statku došla semena';
    case 'inputs': return 'Čeká na suroviny ve skladu (nad rezervou)';
    case 'feed': return 'Ve skladu došlo krmivo (nebo je celé v rezervě)';
    case 'full': return 'Nemá kam dát hotové – sklad je plný';
    case 'limit': return 'Cílové zásoby jsou splněné – čeká, až ubudou';
    case 'empty': return 'V ohradě nejsou zvířata';
    case 'free': return 'Nemá práci';
    case 'skill': return 'Na nic z plánu ještě nemá praxi – přidej jednodušší věc';
    case 'rest': {
      const crew = (type === 'factory' || type === 'pen') && farm.vill.some(x => x !== v && x.at === v.at && x.job);
      return crew ? (type === 'pen' ? 'Pomáhá – kolega má zvířata v rukou, výnos z krmení počítá i s ním' : 'Pomáhá – kolega má práci v rukou, dávka počítá i s jeho silou') : type === 'pole' || type === 'sad' ? 'Všechno roste – čeká, až něco dozraje' : type === 'factory' ? 'Výroba běží – čeká na hotové' : type === 'pen' ? 'Zvířata jsou nakrmená – čeká' : 'Čeká na plástve';
    }
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
  const out = ws.length ? crewPower(farm, o, 1).S : 0;   // kusů na jednu dávku (síla obsluhy)
  const inBld = Object.values(RECIPES).filter(r => r.building === o.kind && recipeOk(farm, r));
  const perH = id => factoryRate(farm, o, id);
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
    ${ws.length ? `<small class="muted">Do jedné dávky jde asi ${num(out)} ${out < 2 ? 'kus' : 'kusů'} (síla obsluhy) – výroba trvá stejně dlouho, jen je jí víc. Na suroviny v rezervě skladu nesáhne.</small>`
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
// síla obsluhy: kdo kolik přispívá (100 %, 60 %, 40 %, 30 %) – výrobna: kusů v dávce, ohrada: výnos z jednoho krmení
function crewLine(farm, o, type) {
  const pen = type === 'pen', an = pen && ANIMALS[BUILDINGS[o.kind].animal];
  const cp = crewPower(farm, o, pen ? an.level : 1, pen ? 'pen' : 'factory');
  const W = TEAM.crew[pen ? 'pen' : 'factory'];
  const parts = cp.parts.map(([v, p], i) => `${esc(villName(v))} ${num(pen ? penOut(v) : villOut(v, 'vyroba'))}${i ? ` × ${Math.round(W[i] * 100)} %` : ''}`).join(' + ');
  return `<div class="crew"><b>${pen ? 'Výnos z jednoho krmení' : 'Síla obsluhy'}: ${num(cp.S)}${pen ? '' : ' kusu na dávku'}</b>${cp.parts.length > 1 ? `<small>${parts}</small>` : ''}
    <small class="muted">${pen ? 'Druhý chovatel přidá čtvrtinu svého výnosu.' : 'Další lidé přidají 60 %, 40 % a 30 % svého výkonu.'} Kdo na věc nemá praxi, nepočítá se.</small></div>`;
}
// jeden pracovník na pracovišti: kdo, úroveň, co dělá, detail / odvolat
const personCard = (farm, v, type, obor, now, freeAct, note = '') => `<div class="who"><b>${whoLine(v)} <small class="muted">hotovo ${v.n || 0}×</small></b>
  ${lvlLine(v, obor)}${villStatus(farm, v, type, now)}${note ? `<small class="muted">${note}</small>` : ''}
  <div class="hire"><button class="btn sm alt" data-act="teamSel" data-v="${v.id}">Detail</button><button class="btn sm alt" data-act="${freeAct}" data-v="${v.id}">Odvolat</button></div></div>`;
// blok „Pracovník“ v okně budovy: kdo tu pracuje (místa podle kapacity), přiřadit / vystřídat, plán pracoviště
export function workerBlock(farm, o, now = Date.now()) {
  const type = villJobType(o.kind);
  if (!type) return '';
  const wp = { o, g: null, type }, ws = wpWorkers(farm, wp), cap = wpCap(wp), obor = OBOR[type], nextL = bldCapNext(o, type);
  const multi = type === 'factory' || type === 'pen';
  const head = multi ? `Pracovníci ${ws.length}/${cap}` : type === 'trader' ? 'Skladník' : 'Pracovník';
  const people = ws.map(v => personCard(farm, v, type, obor, now, 'villFree')).join('');
  const slots = ws.length < cap ? assignChips(farm, obor, x => ['villAssign', `${x.id}|${o.id}|0`])
    : assignChips(farm, obor, x => ['villAssign', `${x.id}|${o.id}|${ws[ws.length - 1].id}`], `Vystřídat ${esc(villName(ws[ws.length - 1]))}:`);
  const v = ws[0];
  const what = !v ? `<small class="muted">Pracovník tu ${VILL_WHAT[type]}. ${cap > 1 ? `Vejde se sem ${cap} lidí.` : 'Zatím je tu místo pro jednoho.'}</small>`
    : type === 'pen' || type === 'hive' ? `<small class="muted">${VILL_WHAT[type][0].toUpperCase() + VILL_WHAT[type].slice(1)} – pořád dokola, jak je co hotové.${type === 'pen' ? ` Z jednoho krmení dá zvíře ${num(TEAM.penYield[villLevel(v, 'chov')])}× víc.` : ''}</small>` : '';
  const table = type === 'factory' ? factoryPlan(farm, o, ws) : type === 'trader' ? traderPlan(farm, o, ws, now) : '';
  const room = multi ? `<small class="muted">${nextL ? `Další místo od ${nextL}. úrovně budovy.` : 'Víc lidí se sem nevejde.'}</small>` : '';
  return `<div class="sect">${head}</div><div class="upg worker">${what}${people}${multi && ws.length ? crewLine(farm, o, type) : ''}${slots}${room}</div>
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
  const c = upgradeCost(o, farm);
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

export const STATEK_TABS = [['zakazky', 'Zakázky'], ['farmari', 'Oblasti'], ['chov', 'Chov'], ['zasoby', 'Zásoby'], ['pomocnik', 'Pomocník'], ['statek', 'Statek']];

export function statekHtml(farm, name, now, tab = 'zakazky', o) {
  const tabs = `<div class="tabs">${STATEK_TABS.filter(([id]) => id !== 'pomocnik' || helperActive(farm, now)).map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="stab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'pomocnik') return tabs + helperHtml(farm, now);
  if (tab === 'farmari') return tabs + farmersHtml(farm, now);
  if (tab === 'chov') return tabs + chovHtml(farm, now);
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
  const cropOpts = CROP_LIST.filter(c => stOk(farm, c)).map(c =>
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
      const locked = !stOk(farm, t);
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
function seedCost(farm, c, n, pay) {
  const s = pay === 'coin' ? 0 : Math.min(n, have(farm, 's_' + c.id));
  return (s ? `${s}× :s_${c.id}:` : '') + (n - s ? `${s ? ' + ' : ''}${(n - s) * c.cost} :coin:` : '');
}

// prodejna strojů v městečku
// v36: prodejna strojů – záložky podle druhu, u každého stroje jeho výhody; ze stejného druhu pracuje ten nejlepší
export const DEALER_TABS = [['traktory', 'Traktory', 'tractor'], ['kombajny', 'Kombajny', 'combine'], ['nacini', 'Náčiní', 'pluh'], ['udice', 'Udice', 'udice']];
const DEALER_TYPES = { traktory: ['tractor'], kombajny: ['combine'], 'nacini': ['seeder', 'plow', 'baler', 'helper'], udice: ['rod'] };
const pct = x => `${Math.round(x * 100)} %`;
export function machinePerks(m) {
  const out = [];
  if (m.speed) out.push(`${m.speed} políček/min`);
  if (m.yld) out.push(`úroda +${m.yld} %`);
  if (m.sow) out.push(`setí ${String(m.sow).replace('.', ',')}× rychleji`);
  if (m.save) out.push(`osivo −${m.save} %`);
  if (m.mult) out.push(`zorané pole ${String(m.mult).replace('.', ',')}× úroda`);
  if (m.bale) out.push(`${String(m.bale).replace('.', ',')} balíku na políčko`);
  if (m.tsp && m.tsp > 1) out.push(`práce o ${pct(m.tsp - 1)} rychlejší`);
  if (m.type === 'rod') {
    if (m.hold > 1) out.push(`ryba se drží o ${pct(m.hold - 1)} snáz`);
    if (m.rare > 1) out.push(`vzácné ryby ${String(m.rare).replace('.', ',')}×`);
    if (m.big > 1) out.push(`větší kusy +${pct(m.big - 1)}`);
    if (m.bait) out.push(`${m.bait} % šance ušetřit návnadu`);
  }
  return out;
}
const mImg = id => (hasAsset('m', id + '_l') ? assetUrl('m', id + '_l') : hasAsset('i', id) ? assetUrl('i', id) : null);
// v42: přepínač, čím platit setí strojem (osivo ze zásob a zbytek mince / jen mince – osivo zůstane týmu)
export const payToggle = pay => `<div class="paysw"><button class="${pay !== 'coin' ? 'on' : ''}" data-act="seedPay" data-v="seed">:s_wheat: Nejdřív osivo ze zásob</button><button class="${pay === 'coin' ? 'on' : ''}" data-act="seedPay" data-v="coin">:coin: Jen za mince</button></div>`;
export function dealerHtml(farm, now, o, tab = 'traktory', pay = 'seed') {
  if (!DEALER_TYPES[tab]) tab = 'traktory';
  const slots = garageSlots(farm), used = vehicleCount(farm);
  const types = DEALER_TYPES[tab];
  const best = Object.fromEntries(types.map(t => [t, bestOwned(farm, t)]));
  const cards = MACHINE_LIST.filter(m => types.includes(m.type)).map(m => {
    const lk = machineLock(farm, m), locked = !!lk;   // v38: farmaření / rybaření, udice až s rybníkem
    const mine = farm.machines.find(x => x.model === m.id);
    const job = mine && machineJob(farm, mine.id, now);
    const price = machinePrice(farm, m.id);
    const noRoom = isVehicle(m.id) && used >= slots;
    const top = mine && best[m.type] && best[m.type].id === m.id && m.type !== 'helper';
    const state = locked ? [] : mine ? [job ? `:gear: pracuje ${fmtTime(Math.ceil((job.job.end - now) / 1000))}` : top && m.type !== 'tractor' && m.type !== 'combine' ? '✓ používáš' : isVehicle(m.id) ? '✓ ve stodole' : '✓ koupeno']
      : noRoom ? [slots ? 'stodola je plná' : 'potřebuje stodolu'] : [];
    const perks = machinePerks(m);
    const lines = [...state, perks.length ? `<b class="perks">${perks.join(' · ')}</b>` : '', perks.length > 1 ? '' : `<small>${m.info}</small>`].filter(Boolean);
    return card({ icon: m.icon, img: mImg(m.id), name: m.name, locked, act: 'buyMachine', v: m.id, disabled: !!mine || noRoom || farm.coins < price,
      price: locked || mine ? undefined : price, badge: lk === 'no_pond' ? ':lock: nejdřív rybník' : locked ? `:lock: ${SKILLS[m.sk].name} ${m.skl}` : top ? '★ nejlepší' : m.tier ? `${m.tier}.` : '', lines });
  });
  let small = '';
  if (tab === 'traktory' && hasMachine(farm, 'tractor')) {
    const empty = farm.plots.filter(p => !p.crop).length;
    small = `<p class="muted"><b>Malá pole</b> – traktor je zaseje najednou.</p>${payToggle(pay)}<div class="crops">${CROP_LIST.filter(c => stOk(farm, c)).map(c => card({ icon: c.icon, name: `Zasít: ${c.name}`, act: 'sowAll', v: c.id, disabled: !empty,
      lines: [seedCost(farm, c, empty, pay)] })).join('')}</div>`;
  }
  if (tab === 'kombajny' && hasMachine(farm, 'combine')) {
    const ready = farm.plots.filter(p => plotState(p, now).state === 'ready').length;
    small = ready ? `<button class="btn" data-act="harvestAll" data-v="">Sklidit všechna zralá malá pole (${ready})</button>` : '';
  }
  const note = tab === 'udice' ? 'Rybaříš vždy tou nejlepší udicí, kterou máš. Udice místo ve stodole nepotřebují.'
    : tab === 'nacini' ? 'Traktor vždy zapřáhne to nejlepší náčiní, které máš (secí stroj, pluh, lis). Náčiní místo ve stodole nepotřebuje.'
    : `Traktory a kombajny parkují ve <b>stodole</b> (${used}/${slots} míst). Na velkém poli pracuje nejrychlejší volný stroj.`;
  return `${tabsHtml(DEALER_TABS, tab, 'dtab')}<p class="muted">${note}</p>
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
    const add = (pole ? CROP_LIST : TREE_LIST).filter(d => stOk(farm, d) && !(d.id in plan)).map(d => [d.id, pole ? d.icon : ITEMS[d.fruit].icon, d.name, needLvl(d.level)]);
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

export function bigfieldHtml(farm, o, now, ask = false, pay = 'seed') {
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
    const sd = bestOwned(farm, 'seeder'), pl = bestOwned(farm, 'plow'), bl = bestOwned(farm, 'baler');   // v38: podle nejlepšího náčiní
    const sec = Math.ceil(jobSeconds(cells, tr.model) / (sd ? sd.sow : 1));
    const soil = o.soil || 'raw';
    const pm = o.pm || 1.5;
    const soilTxt = soil === 'plowed' ? `<b>Zoráno</b> – úroda bude ${String(pm).replace('.', ',')}×.` : soil === 'stubble' ? 'Na poli je strniště.' : 'Pole není zorané.';
    let tools = '';
    if (o.straw && bl) tools += `<button class="btn alt" data-act="fieldBale" data-v="${tr.id}">:${bl.icon}: Slisovat slámu (${Math.max(1, Math.floor(cells * bl.bale))} balíků)</button>`;
    if (soil !== 'plowed' && pl) tools += `<button class="btn alt" data-act="fieldPlow" data-v="${tr.id}">:${pl.icon}: Zorat pole (úroda ${String(pl.mult).replace('.', ',')}×)</button>`;
    const hint = !pl && soil !== 'plowed' ? '<small>Tip: s pluhem z prodejny strojů bude úroda větší.</small>' : '';
    const cards = CROP_LIST.map(c => card({ icon: c.icon, name: c.name, locked: !stOk(farm, c), act: 'fieldSow', v: c.id,
      disabled: farm.coins < (cells - (pay === 'coin' ? 0 : Math.min(cells, have(farm, 's_' + c.id)))) * c.cost,
      lines: !stOk(farm, c) ? [`:lock: Statek ${c.st}`]
        : [`osivo ${seedCost(farm, c, cells, pay)}`, `úroda ${Math.round(cells * c.yield * (o.soil === 'plowed' ? pm : 1))} :${c.icon}:`, `sklízí ${MACHINE_TYPE_NAME[c.harvester]}`] }));
    const mult = soil === 'plowed' ? 1.5 : 1;
    return head + `<p class="muted">${soilTxt} ${hint}</p>${tools}<p class="muted">Seje <b>${MACHINES[tr.model].name}</b>${hasTool(farm, 'seeder') ? ' se secím strojem' : ''} (${fmtTime(sec)}). Čím zaplatit osivo:</p>${payToggle(pay)}<p class="muted">Vyber plodinu:</p><div class="crops">${cards.join('')}</div>` + move;
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
    const cancel = ask ? `<div class="empty">Opravdu zrušit osetí? <b>Osivo ani mince se nevrátí</b> a zorání propadne.</div>
        <button class="btn warn" data-act="fieldClear" data-v="${o.id}">Ano, zrušit osetí</button><button class="btn alt" data-act="fieldClearNo" data-v="${o.id}">Ne, nechat růst</button>`
      : `<button class="btn alt" data-act="fieldClearAsk" data-v="${o.id}">✕ Zrušit osetí</button>`;   // v38
    return head + `<div class="row"><span class="ico">:${c.icon}:</span><div class="info"><b>${c.name} roste</b><small>zralé za ${fmtTime(st.left)}</small>${bar(st.progress)}</div></div>` + cancel + move;
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
    const locked = !recipeOk(farm, r), ok = !locked && hasInputs(farm, r) && !full;
    const name = (recipeQty(r) > 1 ? recipeQty(r) + '× ' : '') + ITEMS[r.id].name;
    return `<button class="recipe${locked ? ' locked' : ''}${ok ? '' : ' dim'}" data-act="produce" data-v="${r.id}">
      <span class="ico">:${ITEMS[r.id].icon}:</span>
      <span class="rinfo"><b>${esc(name)}</b>${locked ? '' : `<span class="ings">${ingredients(farm, r)}</span>`}
        <span class="rmeta">:clock: ${fmtTime(r.time)}<span class="coin-chip">${ITEMS[r.id].price} :coin:</span></span></span>
      <span class="cta">${locked ? (stOk(farm, r) ? `:lock: Vaření ${r.cook}` : `:lock: Statek ${r.st}`) : full ? 'Plno' : 'Vyrobit'}</span>
    </button>`;
  });
  return `<div class="slots">${slots.join('')}</div>
    ${done ? `<button class="btn" data-act="collect" data-v="${o.id}">Vybrat hotové (${done})</button>` : ''}
    <div class="sect">Vyber, co vyrobit</div>
    <div class="recipes">${recipes.join('')}</div>
    ${workerBlock(farm, o, now)}${upgradeBlock(farm, o)}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}

// ---------- přehled chovu (v31) ----------
const rateH = x => (x >= 10 ? String(Math.round(x)) : num(Math.round(x * 10) / 10));
const hoursText = h => (!isFinite(h) ? '' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${num(Math.round(h * 10) / 10)} h` : `${Math.round(h / 24)} dní`);
const PEN_WARN = {
  empty: 'V ohradě nejsou zvířata.',
  no_feed: 'Krmivo došlo – zvířata nic nedají. Vyrob ho v Krmivárně nebo kup ve Stánku.',
  keep: 'Krmivo je celé v rezervě skladu – chovatel na něj nesáhne. Sniž rezervu ve Skladu.',
  low_feed: 'Krmivo vydrží méně než 2 hodiny a Krmivárna nestíhá.',
  full: 'Sklad je plný – hotové výrobky se nevejdou a zvířata stojí.',
  skill: 'Žádný chovatel tu ještě nemá praxi na tohle zvíře.',
  no_worker: 'Bez chovatele krmíš a sbíráš ručně.',
};
// v34: provozní stav ohrady (penStats.status)
const PEN_STATUS = { run: 'v provozu', hungry: 'zvířata mají hlad', feed: 'čeká na krmivo', full: 'stojí – plný sklad', empty: 'prázdná' };
// řádek přehledu ohrady: krmivo (i dostupné nad rezervou), spotřeba, výdrž, produkce, chovatelé, stav, upozornění
function penBox(farm, o, now, link = false) {
  const s = penStats(farm, o, now), an = s.an, fi = ITEMS[an.feed].icon, pi = ITEMS[an.product].icon;
  const bad = s.warn.filter(w => w !== 'no_worker' && w !== 'empty');
  const last = !isFinite(s.hours) ? '' : ` · vydrží asi <b>${hoursText(s.hours)}</b>${s.shared > 1 ? ` (všem ${s.shared} ohradám)` : ''}`;
  const withKr = s.makeH > 0 && s.n ? (isFinite(s.hoursNet) ? ` · s Krmivárnou asi ${hoursText(s.hoursNet)}` : ' · Krmivárna stíhá doplňovat') : '';
  return `<div class="penbox${bad.length ? ' warn' : ''}">
    <b>${link ? `:${BUILDINGS[o.kind].icon}: ${esc(BUILDINGS[o.kind].name)} (úr. ${objLevel(o)}) · ` : ''}${an.name}: ${s.n}/${s.max} · chovatelé ${s.ws.length}/${s.cap}${s.free && s.n ? ` · volné místo ${s.free}` : ''}</b>
    ${s.n ? `<small>Stav: <b class="${s.status === 'run' ? '' : 'miss'}">${PEN_STATUS[s.status]}</b>${s.ready ? ` · hotové :${pi}: ${s.ready}` : ''}${s.hungry ? ` · hladových ${s.hungry}` : ''}</small>` : ''}
    <small>Krmivo :${fi}: ve skladu <b>${s.feedHave}</b>${s.keep ? `, rezerva ${s.keep} → pro chov <b>${s.avail}</b>` : ''}${s.n ? ` · spotřeba asi <b>${rateH(s.feedH)}</b>/h${s.shared > 1 ? ` (všechny ohrady ${rateH(s.feedAll)}/h)` : ''}${last}${withKr}` : ''}</small>
    ${s.n ? `<small>Produkce :${pi}: odhadem <b>${rateH(s.prodH)}</b>/h · jedno krmení na ${hoursText(s.cycleS / 3600)} = ${an.per}× :${pi}:${s.Y !== 1 ? ` × ${num(Math.round(s.Y * 100) / 100)} od chovatelů` : ''}${s.ws.length ? '' : ' (ručně)'}</small>` : ''}
    ${s.kr ? `<small>${esc(BUILDINGS[s.kr.kind].name)}: ${s.makeH ? `asi <b>${rateH(s.makeH)}</b> :${fi}: za hodinu podle plánu` : s.target ? `vyrábí do zásoby ${s.target} :${fi}:` : `:${fi}: nemá v plánu`}</small>` : ''}
    ${s.warn.map(w => `<small class="${w === 'no_worker' || w === 'empty' ? 'muted' : 'miss'}">${w === 'no_worker' || w === 'empty' ? '' : '⚠ '}${PEN_WARN[w]}</small>`).join('')}
    ${link ? `<button class="btn sm alt" data-act="openObj" data-v="${o.id}">Otevřít</button>` : ''}</div>`;
}
// záložka Statku „Chov“: všechny ohrady a včelíny na jednom místě
function chovHtml(farm, now) {
  const pens = farm.objects.filter(o => BUILDINGS[o.kind].type === 'pen'), hives = farm.objects.filter(o => BUILDINGS[o.kind].type === 'hive');
  if (!pens.length && !hives.length) return '<p class="tip">Zatím nemáš žádnou ohradu ani včelín. Kurník se odemkne na Statku 2.</p>';
  const hv = hives.map(o => {
    const s = hiveStock(farm, o, now), ws = farm.vill.filter(v => v.at === o.id);
    return `<div class="penbox"><b>:hive: ${esc(BUILDINGS[o.kind].name)} · plástve ${s.count}/${s.cap} · včelař ${ws.length}/1</b>
      <small>Produkce :plast: asi <b>${rateH(3600000 / hiveIv(farm, o))}</b> za hodinu${ws.length ? '' : ' – bez včelaře vybíráš ručně'}${s.count >= s.cap ? ' · <b class="miss">⚠ plný – včely nepracují</b>' : ''}</small>
      <button class="btn sm alt" data-act="openObj" data-v="${o.id}">Otevřít</button></div>`;
  }).join('');
  return `<p class="muted"><b>Přehled chovu</b> – spotřeba a produkce za hodinu platí, když se o zvířata stará chovatel bez přestávky.</p>
    ${pens.map(o => penBox(farm, o, now, true)).join('')}${hv}`;
}
export function penHtml(farm, o, now) {
  const d = BUILDINGS[o.kind];
  const an = ANIMALS[d.animal];
  const rows = o.animals.map((a, i) => {
    const st = animalState(a, an, now);
    const pi = ITEMS[an.product].icon, next = st.left ? ` · další :${pi}: za ${fmtTime(st.left)}` : ' · cyklus hotový';
    const txt = st.state === 'hungry' ? `má hlad – chce :${ITEMS[an.feed].icon}:` : st.state === 'ready' ? `:${pi}: ${st.avail}× připraveno${next}` : `${st.made}/${an.per} :${pi}:${next}`;
    const bar = st.state !== 'hungry' && st.progress < 1 ? `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>` : '';
    return `<div class="row"><span class="ico">:${an.icon}:</span><div class="info"><b>${an.name} ${i + 1}</b><small>${txt}</small>${bar}</div></div>`;
  }).join('') || `<div class="empty">Ohrada je prázdná. Kup ${an.acc} v obchodě nebo tady.</div>`;
  const ready = o.animals.reduce((n, a) => n + animalState(a, an, now).avail, 0);
  const hungry = o.animals.filter(a => !a.fed).length;
  return `${penBox(farm, o, now)}${rows}
    <p class="muted">${an.name}: 1 krmivo :${ITEMS[an.feed].icon}: vydrží ${fmtTime(Math.round(animalCycleMs(o) / 1000))} a zvíře za tu dobu průběžně dá ${an.per}× :${ITEMS[an.product].icon}: ${ITEMS[an.product].name}.</p>
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

export const TASK_TABS = [['denni', 'Denní úkoly'], ['odmeny', 'Odměny'], ['soutez', 'Soutěž'], ['zebricek', 'Žebříček']];

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

export function tasksHtml(farm, now, tab, board, weekly) {
  const tabs = `<div class="tabs">${TASK_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="ttab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'zebricek') {
    if (!board) return tabs + '<div class="empty">Načítám žebříček…</div>';
    const rows = board.top.map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span class="rank">${i + 1}.</span><div class="info"><b>${esc(r.name)}</b><small>úroveň ${r.level} · ${r.xp} :xp:</small></div>
      ${r.me ? '' : `<button class="btn sm alt" data-act="visit" data-v="${esc(r.name)}">:house: Navštívit</button>`}</div>`).join('');
    const mine = board.me && !board.top.some(r => r.me) ? `<p class="muted">Tvoje místo: <b>${board.me.rank}.</b> (úroveň ${board.me.level || farm.level})</p>` : '';
    return tabs + '<p class="muted">Pořadí podle úrovně hráče. Klepni na Navštívit a podívej se, jak hospodaří ostatní.</p>' + (rows || '<div class="empty">Zatím tu nikdo není.</div>') + mine;
  }
  if (tab === 'denni') return tabs + questsHtml(farm, now);
  if (tab === 'soutez') return tabs + weeklyHtml(farm, now, weekly);   // v36
  const can = canClaimDaily(farm, now);
  // v39: dnešní den a 6 dalších, pod tím milníky se vzácnými ozdobami; v40: vynechaný den = série od 1
  const cont = farm.daily.day === dayKey(now) || farm.daily.day === dayKey(now - 86400000);
  const got = cont ? farm.daily.streak || 0 : 0, next = got + 1, from = can ? next : got;
  const days = Array.from({ length: 7 }, (_, k) => from + k).map(n => {
    const d = dailyReward(n);
    const cls = n <= got ? 'got' : n === next && can ? 'today' : '';
    return `<div class="day ${cls}${d.deco ? ' deco' : ''}"><small>den ${n}</small><span>${d.coins}</span>:coin:${d.xp ? `<small>+${d.xp} :xp:</small>` : ''}${d.deco ? `<small>+ :${BUILDINGS[d.deco].icon}:</small>` : ''}</div>`;
  }).join('');
  const own = id => farm.objects.some(o => o.kind === id) || farm.pending.includes(id);
  const miles = Object.entries(DAILY_DECO).map(([n, id]) => `<div class="mile${own(id) ? ' got' : ''}">${decoImg(id)}<small>${n}. den</small><b>${esc(BUILDINGS[id].name)}</b></div>`).join('');
  const daily = `<p class="muted"><b>:gift: Denní odměna</b> – přijď si každý den pro odměnu. Každý další den po sobě je větší, 7., 14., 21.… den dvojnásobná. Když den vynecháš, série začne znovu od 1. Teď máš <b>${got}</b> ${got === 1 ? 'den' : got >= 2 && got <= 4 ? 'dny' : 'dní'} po sobě.</p>
    <div class="days">${days}</div>
    <p class="muted"><b>Vzácné ozdoby</b> za dny po sobě (jinak je nezískáš, každou jen jednou):</p><div class="miles">${miles}</div>
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
  const rod = bestOwned(farm, 'rod');
  const bait = have(farm, 'navnada');
  const rec = farm.fishRec || {};
  const w = weatherAt(now);
  const need = !rod ? '<div class="empty">:udice: Na rybaření potřebuješ <b>udici</b> – koupíš ji v Prodejně strojů v městečku.</div>'
    : !bait ? '<div class="empty">:navnada: Došla ti <b>návnada</b>. Vyrob ji v Krmivárně (1 pšenice + 1 kukuřice = 3 návnady).</div>' : '';
  const fx = fxActive(farm, now).filter(f => f.k === 'fish').map(f => `<span class="chip ${f.m > 1 ? 'ok' : 'warn'}">${fxText(f)} · ${fmtTime(Math.ceil((f.u - now) / 1000))}</span>`).join('');
  const deep = POND[o.kind] && POND[o.kind].rare > 1 ? ` · hluboká voda: vzácné ryby ${String(POND[o.kind].rare).replace('.', ',')}×` : '';
  return `<div class="row"><span class="ico">:pond:</span><div class="info"><b>Ryby v rybníku: ${s.count}/${s.cap}</b>
      <small>${s.count < s.cap ? `další ryba za ${fmtTime(Math.ceil(s.next / 1000))}` : 'rybník je plný'} · návnada ${bait} :navnada:${rod ? ` · ${rod.name}` : ''}${deep}</small></div></div>
    ${need}
    <button class="btn${rod && bait && s.count ? '' : ' off'}" data-act="fish" data-v="${o.id}">:udice: Rybařit (1 návnada)</button>
    ${fx ? `<div class="chips">${fx}</div>` : ''}
    <p class="muted">:${w.icon}: ${w.name}: ${w.fish > 1 ? 'ryby teď berou dobře a častěji zabere velká.' : w.fish < 1 ? 'ryby teď moc neberou.' : 'běžné rybaření.'}
      Velká ryba dá 2 kusy, obří 3. Lepší udice (Prodejna strojů) a větší rybník = vzácnější a větší ryby.</p>
    <p class="muted">Hodíš udici a čekáš. Když ryba zabere, rychle klepni. Pak drž prst na obrazovce, aby zelená čárka zůstala u ryby, dokud se ukazatel nenaplní. Těžší ryby víc uhýbají.</p>
    ${journalHtml(farm)}
    ${upgradeBlock(farm, o)}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout rybník</button>`;
}
// v36: rybářský deník – sbírka ryb, mistr druhu (10 úlovků) a odměny
export function journalHtml(farm) {
  const fj = farm.fj || { c: {}, r: [] }, rec = farm.fishRec || {};
  const got = FISH_LIST.filter(f => fj.c[f.id]).length, masters = FISH_LIST.filter(f => (fj.c[f.id] || 0) >= FJ_MASTER).length;
  const rows = FISH_LIST.map(f => {
    const n = fj.c[f.id] || 0, lock = !fishOk(farm, f);
    const r1 = fjFirst(f), rm = fjMaster(f);
    const st = lock ? `:lock: Rybaření ${f.fishLv}` : !n ? `první úlovek: +${r1.coins} :coin: +${r1.xp} :xp:`
      : n < FJ_MASTER ? `${n}/${FJ_MASTER} do mistra (+${rm.coins} :coin:)` : '★ mistr';
    return `<div class="row${n ? '' : ' dim'}"><span class="ico">:${f.icon}:</span><div class="info"><b>${f.name}${n ? ` × ${n}` : ''}</b>
      <small>${st}${rec[f.id] ? ` · rekord :trophy: ${fmtKg(rec[f.id])}` : ''}</small></div></div>`;
  }).join('');
  return `<h3 class="sub">:denik_ryb: Rybářský deník</h3>
    <p class="muted">Ulovené druhy <b>${got}/${FISH_LIST.length}</b> · mistr <b>${masters}/${FISH_LIST.length}</b>.
      Za první úlovek každé ryby a za ${FJ_MASTER} úlovků (mistr) dostaneš odměnu. Celá sbírka: +${FJ_ALL.coins} :coin:, mistr všech ryb: +${FJ_ALL_MASTER.coins} :coin:.</p>
    ${rows}`;
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
// v34: postupný průvodce – krok se ukáže, až se jeho část hry odemkne (when) a předchozí kroky jsou hotové nebo ještě
// zamčené; úkol (done) se odškrtne sám, informaci (info) hráč potvrdí tlačítkem Další. Hotové kroky jsou ve farm.tg.
const gHas = (f, pred) => f.objects.some(pred);
const gType = t => o => BUILDINGS[o.kind] && BUILDINGS[o.kind].type === t;
const gWorked = f => f.vill.some(v => v.at || v.area);
export const GUIDE = [
  { id: 'pole', text: 'Klepni na prázdné <b>pole</b> a vyber <b>Pšenici</b>. Prstem pak přejeď přes další pole a zaseješ je najednou.', when: () => true, done: f => (f.stats.plant || 0) > 0 },
  { id: 'sklizen', text: 'Pšenice roste 1 minutu. Zralá pole <b>sklidíš přejetím prstu</b> – úroda jde do <b>Skladu</b>.', when: f => (f.stats.plant || 0) > 0, done: f => (f.stats.harvest || 0) >= 2 },
  { id: 'penize', text: 'Peníze vyděláš <b>zakázkami</b> ve Statku (klepni na něj) nebo prodejem ve <b>Skladu</b>. Zkus jedno z toho.', when: f => (f.stats.harvest || 0) >= 2, done: f => (f.stats.orders || 0) > 0 || (f.stats.sold || 0) > 0 },
  { id: 'ukoly', info: true, text: 'Dole v <b>Úkolech</b> jsou denní úkoly a denní odměna – za splnění dostaneš mince a zkušenosti.', when: f => (f.stats.harvest || 0) >= 2 },
  { id: 'vyroba', text: 'Otevři <b>Stavět → Výrobny</b> a postav <b>Semenárnu</b> nebo <b>Pekárnu</b>. Z úrody budeš vyrábět dražší zboží.', when: f => (f.stats.orders || 0) > 0 || (f.stats.sold || 0) > 0, done: f => gHas(f, gType('factory')) },
  { id: 'vyroba2', info: true, text: 'Ve výrobně vyber výrobek – peče se ve frontě a hotový ho vybereš klepnutím na budovu. <b>Semenárna</b> dělá semena, se kterými sázení nestojí mince.', when: f => gHas(f, gType('factory')) },
  { id: 'statek', text: 'Vylepšuj <b>Statek</b> (klepni na něj → záložka Statek). Každá úroveň odemkne nové budovy, víc polí a sadů.', when: f => gHas(f, gType('factory')), done: f => statekLevel(f) >= 2 },
  { id: 'sad', text: 'Postav <b>Sad</b> (Stavět → Farma) a zasaď ovocný strom. Strom plodí několikrát, pak uschne a vykopeš ho.', when: f => stOk(f, TREE_LIST[0]) && maxOrchards(f) > 0, done: f => gHas(f, o => o.kind === 'sad' && o.tree) },
  { id: 'kurnik', text: 'Postav <b>Kurník</b> (Stavět → Zvířata) a kup do něj slepice.', when: f => statekLevel(f) >= BUILDINGS.kurnik.st && stOk(f, ANIMALS.slepice), done: f => gHas(f, o => gType('pen')(o) && (o.animals || []).length) },
  { id: 'krmeni', info: true, text: 'Zvířata nakrmíš klepnutím na ohradu. <b>Jedno krmivo vydrží 3 hodiny</b> – slepice za tu dobu snese 3 vejce, kráva, prase a ovce dají 2 výrobky. Sbírej průběžně.', when: f => gHas(f, o => gType('pen')(o) && (o.animals || []).length) },
  { id: 'krmivarna', text: 'Postav <b>Krmivárnu</b> a vyrob krmivo pro slepice z pšenice a kukuřice.', when: f => statekLevel(f) >= BUILDINGS.krmivarna.st && gHas(f, gType('pen')), done: f => gHas(f, o => o.kind === 'krmivarna') },
  { id: 'mestecko', info: true, text: 'Vpravo nahoře je <b>Městečko</b>: Stánek se zásobami, Prodejna strojů a <b>Tržiště</b>, kde obchoduješ s kamarády.', when: f => f.level >= 3 },
  { id: 'chatrc', text: 'Pracovníci potřebují bydlet. Postav <b>Chatrč</b> (Stavět → Farma, 200 :coin:) – vejdou se do ní 2 lidé.', when: f => f.coins >= 150 || f.level >= 5, done: f => gHas(f, gType('house')) },
  { id: 'nastenka', text: 'V Městečku na <b>Nástěnce</b> vyvěs inzerát, zaplať pohoštěním a vyber si pracovníka.', when: f => gHas(f, gType('house')), done: f => f.vill.length > 0 },
  { id: 'prace', text: 'Otevři <b>Tým</b> a pracovníka přiřaď – pěstitele k polím, řemeslníka do výrobny, chovatele k ohradě. Pracuje, i když hru zavřeš.', when: f => f.vill.length > 0, done: gWorked },
  { id: 'plan', info: true, text: 'V okně budovy nebo pole nastav <b>plán práce</b>: co dělat, cílové zásoby a procenta. Ve <b>Skladu</b> nastavíš rezervy, na které tým nesáhne.', when: gWorked },
  { id: 'centrum', info: true, text: 'Tlačítko <b>Centrum</b> vlevo otevře <b>Řídicí centrum</b>: hospodaření za 24 h, sklad, tým, výroba, pole, chov a upozornění, co potřebuje pozornost.', when: f => f.vill.length > 0 || f.level >= 5 },
  { id: 'pryc', info: true, text: 'Když budeš pryč déle než půl hodiny, po návratu uvidíš, co tým mezitím udělal – sklizeň, výrobu i prodeje.', when: gWorked },
  { id: 'skladnik', info: true, text: '<b>Skladník</b> ve Skladu prodává zboží na trhu každou půlhodinu podle plánu. Rezervy přitom nechá být.', when: f => f.vill.length >= 2 },
  { id: 'pozemky', info: true, text: 'Za plotem stojí cedule <b>Na prodej</b>. Koupí pozemku farmu zvětšíš.', when: f => f.level >= 6 },
  { id: 'velkepole', text: 'Postav <b>Velké pole</b> (Stavět → Farma). Traktor ho zorá a oseje, kombajn sklidí – stroje koupíš v Prodejně strojů.', when: f => maxBigFields(f) > 0, done: f => gHas(f, o => o.kind === 'velkepole') },
  { id: 'rybnik', info: true, text: 'Od Statku 3 můžeš postavit <b>Rybník</b> a lovit ryby, od Statku 5 <b>Včelín</b> na med.', when: f => statekLevel(f) >= 3 },
  { id: 'konec', info: true, text: 'Všechno ostatní najdeš v <b>Menu → Jak hrát</b> a v <b>Deníku farmáře</b>. Hodně štěstí!', when: f => statekLevel(f) >= 3 && f.vill.length > 0 },
];
// který krok průvodce teď ukázat: první nehotový v pořadí, jehož část hry je odemčená (null = nic)
export function guideStep(f) {
  if ((f.tut || 0) >= TUTORIAL_DONE) return null;
  const done = new Set(f.tg || []);
  return GUIDE.find(s => !done.has(s.id) && s.when(f)) || null;
}

// ---------- v11: pravidla a nápověda (Menu → Jak hrát) ----------
export const HELP_TABS = [['zaklady', 'Základy'], ['statek', 'Statek'], ['urovne', 'Úrovně'], ['mesto', 'Město'], ['ryby', 'Ryby'], ['udalosti', 'Příběh'], ['tipy', 'Tipy']];   // v38: krátké názvy, ať se vejdou
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
      + p('<b>:plot: Kolik lidí kam:</b> výrobna má místo pro 1 pracovníka, od 4. úrovně pro 2, od 7. pro 3 a na 10. úrovni pro 4. Ohrada pro 1, od 5. úrovně pro 2. Včelín a sklad pro jednoho. Oblast polí nebo sadů vezme jednoho na každá 4 pole (6 polí = 1, 8 = 2, 12 = 3). Na plné místo jde jen výměnou.')
      + p('<b>:star: Síla obsluhy:</b> víc lidí ve výrobně dělá větší dávky – první přidá 100 % svého výkonu, druhý 60 %, třetí 40 %, čtvrtý 30 %. V ohradě druhý chovatel přidá čtvrtinu svého výnosu z krmení. Kdo na výrobek nebo zvíře ještě nemá praxi, nepočítá se. Zkušenosti se dělí podle podílu. Statek → <b>Chov</b> ukáže krmivo, spotřebu a produkci všech ohrad.')
      + p('<b>:chleb: Výroba:</b> výrobny dělají z úrody výrobky (fronta až 3 kusy). Klepnutím na budovu vybereš hotové.')
      + p('<b>:hen: Zvířata:</b> potřebují ohradu a krmivo z Krmivárny. Nakrmíš klepnutím na ohradu – <b>1 krmivo vydrží 3 hodiny</b> a zvíře za tu dobu průběžně dá výrobky: slepice 3 vejce, kráva 2 mléka, prase 2 masa, ovce 2 vlny. Vylepšená ohrada má cyklus o 5 % kratší za úroveň.')
      + p('<b>:house: Řídicí centrum</b> (tlačítko Centrum vlevo): hospodaření za 24 hodin, sklad, tým, výroba, pole a chov na jednom místě a upozornění seřazená od nejdůležitějších. Klepnutím na upozornění se dostaneš k budově.')
      + p('<b>:coin: Peníze:</b> nejvíc platí <b>zakázky</b> ve Statku, pak <b>stánek</b> a <b>tržiště</b>. Výkup ve Skladu platí polovinu ceny a mění se každé 4 hodiny.')
      + p('<b>:xp: Úroveň hráče</b> roste za každou práci a pořád dál. Odemyká pozemky, psa, události a je potřeba na vylepšení Statku. <b>Plodiny, stromy, zvířata a výrobny odemyká Statek</b>. <b>Stroje, udice, ryby a recepty</b> odemykají dovednosti Farmaření, Rybaření a Vaření (klepni na svou úroveň vlevo nahoře).')
      + p('<b>:plot: Zrušení výsevu:</b> zasadil jsi něco omylem? Klepni dvakrát na rostoucí políčko → Zrušit výsev. U velkého pole klepni na pole → Zrušit osetí. Osivo a mince za setí propadnou, ale pole je hned volné.')
      + p('<b>:sign: Pozemky:</b> klepni na ceduli „Na prodej“ za plotem a farmu zvětšíš.')
      + p('<b>:chleb: Tabulka práce:</b> v okně budovy nebo oblasti nastavíš, co se tam dělá: na poli jakou část čím osázet, ve výrobně podíl výrobků a strop zásoby, ve skladu kolik procent zásoby jde na trh a kolik si nechat.')
      + p('<b>↔ Přesun:</b> podrž prst na budově nebo poli, zvedne se a můžeš ho táhnout. Potvrď ✓ dole. Přesunout jde všechno, i Statek, a pole i s tím, co na něm roste.');
  } else if (tab === 'statek') {
    const rows = [];
    for (let L = 1; L <= MAX_BLD_LEVEL; L++) {
      const f = { objects: [{ kind: 'statek', lvl: L }] };
      const b = BUILDING_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`)
        .concat(CROP_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`), ANIMAL_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`),
          TREE_LIST.filter(x => x.st === L).map(x => `:${ITEMS[x.fruit].icon}: ${x.name}`), FISH_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`),
          Object.values(RECIPES).filter(x => PRODUCTS[x.id] && x.st === L).map(x => `:${ITEMS[x.id].icon}: ${ITEMS[x.id].name}`)).join(', ');
      rows.push(`<tr${statekLevel(farm) === L ? ' class="me"' : ''}><td><b>${L}</b></td><td>${b || '–'}${meritShort(L) ? `<br><small>zásluhy: ${meritShort(L)}</small>` : ''}</td><td>${maxPlots(f)} / ${maxOrchards(f)} / ${maxBigFields(f)}</td></tr>`);
    }
    body = p('Co můžeš <b>stavět</b>, určuje úroveň <b>Statku</b>. Vylepšíš ho za mince a suroviny, ale jen když farma splní <b>zásluhy</b>: úroveň hráče a jeden úkol (sklizeň, zakázky, živočišné produkty, výroba nebo pověst). Klepni na Statek → záložka Statek. Ostatní budovy můžeš vylepšit nejvýš na úroveň Statku.')
      + `<table class="help"><tr><th>Statek</th><th>Odemkne</th><th>Polí / sadů / velkých polí</th></tr>${rows.join('')}</table>`;
  } else if (tab === 'urovne') {
    const by = {};
    const add = (lv, txt) => { (by[lv] = by[lv] || []).push(txt); };
    add(HELPER_LEVEL, ':helper: Pomocník'); add(3, ':bell: Události'); add(DOG.level, ':pes: Farmářský pes');
    for (let k = 2; k <= MAX_BLD_LEVEL; k++) if (TEAM.statek[k]) add(TEAM.statek[k].player, `:house: Statek ${k} (+ zásluha)`);
    const rows = Object.keys(by).map(Number).sort((a, b) => a - b).map(lv => `<tr${farm.level >= lv ? '' : ' class="dim"'}><td><b>${lv}</b></td><td>${by[lv].join(', ')}</td></tr>`).join('');
    const skr = Object.entries(SKILLS).map(([k, sk]) => p(`<b>:${sk.icon}: ${sk.name}</b> (tvoje úroveň ${skillLevel(farm, k)}) roste za ${SKILL_HOW[k]}. Odemyká:`)
      + `<div class="chips">${skillUnlocks(farm, k).map(([L, ic, n]) => `<span class="chip${skillLevel(farm, k) >= L ? '' : ' dim'}">${L} · :${ic}: ${esc(n)}</span>`).join('')}</div>`).join('');
    body = p(`Tvoje úroveň: <b>${farm.level}</b>. Úroveň hráče roste pomalu a odemyká pozemky, pomocníka, psa, události a je potřeba na vylepšení Statku. Co můžeš pěstovat, chovat a stavět, odemyká <b>Statek</b> (záložka Statek).`)
      + `<table class="help"><tr><th>Úroveň</th><th>Odemkne</th></tr>${rows}</table>`
      + p(`<b>Dovednosti</b> (max. ${SKILL_MAX}) rostou samy tím, co děláš – i když práci udělá tvůj tým. Za dražší věci je víc zkušeností. Nákupy a dárky se nepočítají.`)
      + skr;
  } else if (tab === 'mesto') {
    body = p('Po prašné cestě ze spodního rohu farmy dojdeš do <b>městečka</b> (tlačítko Městečko vpravo nahoře).')
      + p('<b>:shop: Prodejna strojů:</b> 10 traktorů, 10 kombajnů, 10 udic a po 5 secích strojích, pluzích a lisech. Lepší stroj je rychlejší a má výhodu navíc (větší úroda, úspora osiva, vzácnější ryby…). Ze stejného druhu se vždy použije ten nejlepší, který máš. Traktory a kombajny parkují ve Stodole. Vylepšená prodejna dává slevu.')
      + p('<b>:lock: Kdy co koupíš:</b> stroje na pole odemyká dovednost <b>Farmaření</b>, udice dovednost <b>Rybaření</b> – a první udici prodají, až budeš mít rybník.')
      + p('<b>:stall: Stánek:</b> každé 2 hodiny nová nabídka. Prodá ti, co chybí (dráž), a vykoupí za víc než Sklad.')
      + p('<b>:market: Tržiště hráčů</b> (jen online): prodávej kamarádům úrodu, výrobky i stroje za vlastní cenu, nejvýš trojnásobek běžné. Najednou 8 nabídek. Peníze ti přijdou samy.')
      + p('<b>:trophy: Žebříček</b> (Úkoly → Žebříček) řadí podle úrovně. Tlačítkem Navštívit se podíváš na cizí farmu.');
  } else if (tab === 'ryby') {
    body = p('<b>:pond: Rybníky:</b> Rybník (Statek 3, 5 ryb), Větší rybník (Statek 5, 8 ryb), Velký rybník (Statek 7, 15 ryb) a Jezero (Statek 10, 20 ryb). Čím větší voda, tím častěji zabere vzácná ryba. Vylepšení rybníku zrychlí, jak rychle ryby přibývají.')
      + p('<b>:pond: Rybaření:</b> kup <b>udici</b> v Prodejně strojů (až když máš rybník) a vyrob <b>návnadu</b> v Krmivárně. Klepni na rybník → Rybařit. Vzácnější ryby začnou brát, až poroste tvoje dovednost <b>Rybaření</b> (číslo u ryby níže).')
      + p('Až ryba <b>zabere</b>, rychle klepni. Pak <b>drž prst</b> na obrazovce – zelená čárka stoupá, pustíš – klesá. Drž rybu v čárce, dokud se ukazatel nenaplní. Když ukazatel spadne na nulu, ryba uteče. Lepší udice má širší čárku a častěji zabere vzácná ryba.')
      + p('V rybníku je jen pár ryb, každých 10 minut jedna přibude. Ryby prodáš, nebo z nich uděláš jídla v <b>Rybárně</b>.')
      + p('<b>Velikost:</b> každá ryba má váhu. Velká ryba dá do skladu 2 kusy, obří 3 a je těžší ji udržet. Největší úlovek každého druhu se ukazuje jako rekord. V dešti a s lepší udicí častěji zabere velká a vzácná ryba.')
      + p('<b>:denik_ryb: Rybářský deník</b> (v okně rybníku): za první úlovek každého druhu a za 10 úlovků (mistr) dostaneš mince a zkušenosti, za celou sbírku velkou odměnu.')
      + `<div class="chips">${FISH_LIST.map(f => `<span class="chip">:${f.icon}: ${f.name} · rybaření ${f.fishLv} · ${fmtKg(f.kg[0])}–${fmtKg(f.kg[1])} · ${f.price} :coin:</span>`).join('')}</div>`
      + p('<b>:hive: Včelín</b> (od Statku 3): včely samy dělají <b>plástve medu</b>. Květiny, kvetoucí strom nebo sad do 4 políček je zrychlí. Sady blízko včelína dají při sklizni o 1 plod víc. <b>Medárna</b> z pláství udělá med a svíčky, Pekárna perník a medovník.');
  } else if (tab === 'udalosti') {
    body = p('<b>:bell: Události</b> (od úrovně 3): dvakrát denně – dopoledne a odpoledne – se na farmě něco přihodí (liška, bouřka, jarmark, potulný obchodník…). Vybereš jednu ze 4 odpovědí. Některé něco stojí, u některých (🎲) rozhoduje štěstí.')
      + p('Odpověď tě hned odmění nebo potrestá (mince, zboží, zkušenosti) a často na <b>3 hodiny</b> změní farmu: rychlejší nebo pomalejší růst, výrobu, zvířata, stroje, vyšší nebo nižší výkupní ceny, lepší rybaření. Platí pro to, co během té doby začneš. Co platí, uvidíš pod tlačítkem Událost vlevo.')
      + p('<b>:book: Příběh – Kronika údolí</b> (od začátku hry): jednou denně přijde místo jedné události díl příběhu o farmě, dědovi Matoušovi, sousedce Hedvice, Kryštofovi a městečku. Díl na tebe počká, dokud ho nezahraješ. Hra si pamatuje tvoje volby: podle nich se objeví jiné odpovědi a věty v dalších dílech a lepší vztahy zvýší odměnu za kapitolu. Každá kapitola má 4 díly a na konci dá mince, zkušenosti a vzácnou ozdobu, kterou jinak nezískáš. Další kapitolu odemkne vylepšení Statku (kapitola 2 se Statkem 2, kapitola 3 se Statkem 3…). Přehled najdeš v okně Událost → Kronika údolí.')
      + p('<b>:gift: Denní série</b> (Úkoly → Odměny): za každý další den po sobě, kdy si přijdeš pro odměnu, je odměna větší, každý 7. den dvojnásobná. Když den vynecháš, série začne znovu od 1. Na 7., 14., 30., 50. a 100. den po sobě dostaneš vzácnou ozdobu.')
      + p('<b>:pes: Farmářský pes</b> (Obchod → Zvířata, od úrovně 6) chodí s farmářem. U lišky, zloděje, myší, větru a utečených zvířat zvýší šanci na dobrý konec a ztráty i zhoršení zmírní na polovinu.')
      + p('<b>:trophy: Týdenní soutěž</b> (Úkoly → Soutěž): každý týden se soutěží v něčem jiném, co zvládne každý od začátku hry: sklizeň plodin, zakázky, výdělek z prodeje, setí. Počítá se jen to, co získáš sám. První tři dostanou v pondělí odměnu.')
      + p('<b>:gift: Pomoc kamarádovi</b> (jen online): na návštěvě cizí farmy klepni na <b>Pomoct</b>. Jednou denně urychlíš kamarádovi výrobu nebo pole a oba dostanete pár mincí a zkušeností. Jedné farmě můžou pomoct nejvýš 3 lidé denně.');
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

// =====================================================================================================================
// v34: Řídicí centrum – přehled hospodaření ze skutečného stavu farmy (centerData v rules.js, stejné výpočty jako hra)
// =====================================================================================================================
const CENTER_TABS = [['prehled', 'Přehled'], ['hosp', 'Hospodaření'], ['chov', 'Chov']];
const coins = n => `${Math.round(n).toLocaleString('cs-CZ')} :coin:`;
const icList = (ids, max = 8) => ids.slice(0, max).map(id => (ITEMS[id] ? `<span class="needi" title="${esc(ITEMS[id].name)}">:${ITEMS[id].icon}:</span>` : '')).join('') + (ids.length > max ? ` <small class="muted">+${ids.length - max}</small>` : '');
const ALERT_CLS = ['crit', 'warn', 'info'];
// upozornění: nejdřív kritická, stejný druh sloučený, tlačítko na budovu
function alertsHtml(alerts, max = 8) {
  if (!alerts.length) return '<div class="al ok"><b>✓</b><span>Na farmě je všechno v pořádku.</span></div>';
  const rows = alerts.slice(0, max).map(a => {
    const go = a.ids.length ? `<button class="chip" data-act="openObj" data-v="${a.ids[0]}">Otevřít</button>`
      : a.k === 'free' ? '<button class="chip" data-act="openTeam">Tým</button>'
      : a.k === 'silo_full' || a.k === 'silo_high' ? '<button class="chip" data-act="openSilo">Sklad</button>'
      : a.k === 'seeds' ? '<button class="chip" data-act="openStall">Stánek</button>' : '';
    return `<div class="al ${ALERT_CLS[a.lvl]}"><b>${a.lvl === 0 ? '!' : a.lvl === 1 ? '⚠' : 'i'}</b><span>${esc(a.text)}${a.n > 1 ? ` <small>(${a.n}×)</small>` : ''}</span>${go}</div>`;
  }).join('');
  return rows + (alerts.length > max ? `<p class="muted">a další upozornění: ${alerts.length - max}</p>` : '');
}
// co tým udělal, když hráč nebyl ve hře
const AWAY_GROUPS = [['harvest', 'Sklizeno', id => CROPS[id] || id === 'slama'], ['fruit', 'Natrháno', id => FRUITS_OF({ id })],
  ['animal', 'Od zvířat a včel', id => ['vejce', 'mleko', 'maso', 'vlna', 'plast'].includes(id)], ['seed', 'Semena a sazenice', id => isSeedItem(id)], ['produce', 'Vyrobeno', () => true]];
function awayHtml(a, now, full = false) {
  if (!a) return full ? '<p class="tip">Zatím žádná delší nepřítomnost – zpráva se objeví, když budeš pryč déle než půl hodiny a tým bude pracovat.</p>' : '';
  const mins = Math.round((a.to - a.from) / 60000), dur = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
  const left = Object.entries(a.got || {}), groups = [];
  for (const [, name, test] of AWAY_GROUPS) {
    const it = left.filter(([id, n]) => n > 0 && test(id));
    for (const x of it) left.splice(left.indexOf(x), 1);
    if (it.length) groups.push(`<small>${name}: ${it.sort((p, q) => q[1] - p[1]).slice(0, 8).map(([id, n]) => `<b>${n}×</b> :${ITEMS[id] ? ITEMS[id].icon : id}:`).join(' ')}</small>`);
  }
  const sold = Object.entries(a.sold || {});
  return `<div class="penbox away"><b>:clock: ${a.done ? 'Zatímco jsi byl pryč' : 'Dohání se práce týmu'} (${dur})</b>
    ${groups.join('') || '<small>Tým za tu dobu nic nedokončil.</small>'}
    ${a.coins ? `<small>Skladník prodal ${sold.slice(0, 6).map(([id, n]) => `${n}× :${ITEMS[id] ? ITEMS[id].icon : id}:`).join(' ')} za <b>${coins(a.coins)}</b></small>` : ''}
    ${a.fed ? `<small>Nakrmeno zvířat: <b>${a.fed}</b></small>` : ''}
    <small class="muted">Počítá se ze skutečně dokončené práce týmu (${a.jobs} úkonů), každý úsek času jen jednou.</small>
    ${a.done && !a.seen ? '<button class="btn sm" data-act="awayOk">Rozumím</button>' : ''}</div>`;
}
function ccard(title, body, foot = '') {
  return `<div class="ccard"><b class="ct">${title}</b>${body}${foot ? `<div class="cf">${foot}</div>` : ''}</div>`;
}
const crow = (label, value, cls = '') => `<div class="cr${cls ? ' ' + cls : ''}"><span>${label}</span><b>${value}</b></div>`;
export function centerHtml(farm, now, tab = 'prehled') {
  const c = centerData(farm, now);
  const tabs = `<div class="tabs">${CENTER_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="stab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'chov') return tabs + chovHtml(farm, now);
  if (tab === 'hosp') return tabs + ecoHtml(farm, c, now);
  const e = c.eco, s = c.silo, t = c.team, p = c.prod, fl = c.fields;
  const since = e.since && e.since > now - 23 * 3600000 ? `<small class="muted">Zaznamenává se od ${new Date(e.since).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}.</small>` : '';
  const topIn = Object.entries(e.byIn).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${LEDGER_SRC[k] || k} ${coins(v)}`).join(' · ');
  const making = Object.entries(p.making), rates = Object.entries(p.rate).sort((a, b) => b[1] - a[1]);
  const away = c.away && (!c.away.seen || now - c.away.to < 6 * 3600000) ? awayHtml(c.away, now) : '';
  return `${tabs}${away}<div class="sect">Upozornění</div>${alertsHtml(c.alerts)}
  <div class="cgrid">
  ${ccard(':coin: Ekonomika', `${crow('Mince', coins(c.coins))}${crow('Příjmy za 24 h', '+' + coins(e.inc), 'up')}${crow('Výdaje za 24 h', '−' + coins(e.exp), 'down')}${crow('Výsledek', (e.net >= 0 ? '+' : '−') + coins(Math.abs(e.net)), e.net >= 0 ? 'up' : 'down')}
    ${topIn ? `<small>${topIn}</small>` : ''}${since}`, '<button class="chip" data-act="stab" data-v="hosp">Podrobně</button>')}
  ${ccard(':barn: Sklad', `<div class="bar big"><div style="width:${Math.min(100, 100 * s.used / Math.max(1, s.cap)).toFixed(0)}%"></div></div>
    ${crow('Obsazeno', `${s.used} / ${s.cap}`, s.used >= s.cap * 0.85 ? 'down' : '')}${crow('Volno', s.free)}
    ${s.low.length ? `<small>Dochází: ${icList(s.low)}</small>` : ''}
    ${s.keep.length ? `<small>Rezervy: ${s.keep.slice(0, 6).map(k => `:${ITEMS[k.item] ? ITEMS[k.item].icon : k.item}: ${k.have}/${k.keep}`).join(' · ')}</small>` : ''}
    ${s.targets.length ? `<small>Cílové zásoby: ${s.targets.slice(0, 6).map(x => `:${ITEMS[x.item] ? ITEMS[x.item].icon : x.item}: ${x.has}/${x.target}${x.done ? ' ✓' : ''}`).join(' · ')}</small>` : ''}`,
    '<button class="chip" data-act="openSilo">Otevřít Sklad</button>')}
  ${ccard(':helper: Farmářský tým', t.total ? `${crow('Lidí v týmu', t.total)}${crow('Pracuje', t.working, 'up')}${crow('Čeká na práci', t.waiting)}${crow('Nemůže pracovat', t.blocked, t.blocked ? 'down' : '')}${crow('Bez přiřazení', t.free, t.free ? 'down' : '')}
    ${crow('Obsazená místa', `${t.filled} / ${t.seats}`)}${crow('Volná lůžka', t.bedsFree)}${(() => { const n = c.alerts.filter(a => a.k === 'no_worker').reduce((s, a) => s + a.n, 0); return n ? crow('Budovy bez pracovníka', n, 'down') : ''; })()}`
    : `<small>Zatím nemáš žádné pracovníky. Hledají se na Nástěnce v Městečku (lůžek: ${t.beds}).</small>`, '<button class="chip" data-act="openTeam">Tým</button>')}
  ${ccard(':hammer: Výroba', `${crow('Výrobny v provozu', p.active, 'up')}${crow('Výrobny stojí', p.stopped, p.stopped ? 'down' : '')}
    ${making.length ? `<small>Teď se vyrábí: ${making.slice(0, 8).map(([id, n]) => `${n}× :${ITEMS[id] ? ITEMS[id].icon : id}:`).join(' ')}</small>` : ''}
    ${rates.length ? `<small>Odhad za hodinu: ${rates.slice(0, 6).map(([id, r]) => `:${ITEMS[id].icon}: ${rateH(r)}`).join(' · ')}</small>` : '<small class="muted">Odhad za hodinu: výrobny bez plánu nebo bez pracovníků.</small>'}
    ${p.reached.length ? `<small>Splněné cílové zásoby: ${p.reached.length} ${p.reached.length === 1 ? 'výrobna čeká' : 'výrobny čekají'}</small>` : ''}`)}
  ${ccard(':plot: Pole a sady', `${crow('Pole', fl.plots)}${crow('Roste', fl.growing)}${crow('Připraveno ke sklizni', fl.ripe, fl.ripe ? 'up' : '')}${crow('Čeká na zasetí', fl.empty)}${crow('Pěstitelé', fl.growers)}
    ${fl.seedsMissing.length ? `<small class="miss">Chybí semena: ${icList(fl.seedsMissing)}</small>` : ''}
    ${fl.trees.total ? `<small>Sady: stromů ${fl.trees.total} · zralých ${fl.trees.ready}${fl.trees.dead ? ` · uschlých ${fl.trees.dead}` : ''}${fl.trees.empty ? ` · prázdných ${fl.trees.empty}` : ''}</small>` : ''}
    ${fl.big.length ? `<small>Velká pole: ${fl.big.map(b => `${b.crop && CROPS[b.crop] ? `:${CROPS[b.crop].icon}:` : ':field:'} ${BIG_STATE[b.state] || b.state}`).join(' · ')} · strojů ${fl.machines}</small>` : ''}`)}
  ${ccard(':cow: Chov', c.pens.length ? c.pens.map(({ id, s: x }) => `<button class="crow" data-act="openObj" data-v="${id}">:${x.an.icon}: <b>${x.n}/${x.max}</b> <span class="${x.status === 'run' ? '' : 'miss'}">${PEN_STATUS[x.status]}</span>
      ${x.n ? `<small>:${ITEMS[x.an.product].icon}: ${rateH(x.prodH)}/h · krmivo ${isFinite(x.hours) ? hoursText(x.hours) : '–'}</small>` : ''}</button>`).join('')
    : '<small>Zatím nemáš ohradu. Kurník se odemkne na Statku 2.</small>', c.pens.length ? '<button class="chip" data-act="stab" data-v="chov">Podrobně</button>' : '')}
  </div>
  <p class="muted">Hodnoty za hodinu jsou <b>odhady</b> podle plánů a síly pracovníků – stejný výpočet, jakým hra vyrábí. Upozornění se počítají vždy znovu ze stavu farmy.</p>`;
}
const BIG_STATE = { empty: 'prázdné', plowed: 'zorané', sowing: 'seje se', growing: 'roste', ready: 'zralé', harvesting: 'sklízí se', unload: 'vyložit', baled: 'balíky' };
// hospodaření za 24 h: sloupce po hodinách a souhrn podle zdroje
function ecoHtml(farm, c, now) {
  const e = c.eco, max = Math.max(1, ...e.series.map(s => Math.max(s.i, s.o)));
  const bars = e.series.map(s => `<div class="col" title="${new Date(s.h * 3600000).getHours()}:00 · +${s.i} / −${s.o}"><i class="in" style="height:${(100 * s.i / max).toFixed(0)}%"></i><i class="out" style="height:${(100 * s.o / max).toFixed(0)}%"></i></div>`).join('');
  const list = (by, sign) => Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => crow(LEDGER_SRC[k] || k, `${sign}${coins(v)}`, sign === '+' ? 'up' : 'down')).join('') || '<small class="muted">nic</small>';
  const h0 = new Date(e.series[0].h * 3600000).getHours();
  return `${crow('Mince teď', coins(c.coins))}${crow('Výsledek za 24 h', (e.net >= 0 ? '+' : '−') + coins(Math.abs(e.net)), e.net >= 0 ? 'up' : 'down')}
    <div class="sect">Po hodinách</div>
    <div class="chart">${bars}</div><div class="chart-x"><span>${h0}:00</span><span>teď</span></div>
    <p class="muted"><span class="lg in"></span> příjmy <span class="lg out"></span> výdaje</p>
    <div class="cgrid">${ccard('Příjmy za 24 h', list(e.byIn, '+'))}${ccard('Výdaje za 24 h', list(e.byOut, '−'))}</div>
    <p class="muted">Zaznamenávají se jen skutečné změny mincí (od verze 34), po hodinách, nejvýš 48 hodin zpátky.${e.since ? ` První záznam: ${new Date(e.since).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : ''}</p>`;
}

// ---------- v36: události ----------
const useText = (u) => (u.item ? `${u.n}× :${ITEMS[u.item].icon}:` : `${u.n}× ${{ crop: 'plodina', product: 'výrobek', feed: 'krmivo', fruit: 'ovoce', animal: 'od zvířat', any: 'zboží' }[u.pick]}`);
const evImg = id => (hasAsset('e', id) ? assetUrl('e', id) : null);
const hhmm = t => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
export function fxChips(farm, now) {
  return fxActive(farm, now).map(f => `<span class="chip ${(FX_INFO[f.k].time ? f.m < 1 : f.m > 1) ? 'ok' : 'warn'}">${fxText(f)} · ${fmtTime(Math.ceil((f.u - now) / 1000))}</span>`).join('');
}
// res = výsledek právě zvolené odpovědi (z akce), jinak se ukáže čekající událost nebo poslední výsledek
export function eventHtml(farm, now, res, tab) {
  const ev = eventNow(farm, now);
  const fx = fxChips(farm, now);
  const fxBlock = fx ? `<p class="muted"><b>Teď platí</b> (co začneš během této doby, to se počítá):</p><div class="chips">${fx}</div>` : '';
  if (tab === 'kronika') return kronikaHtml(farm);
  if (res && res.ok) {
    const e = evDef(res.id);
    const parts = [];
    if (res.coins) parts.push(`${res.coins > 0 ? '+' : ''}${res.coins} :coin:`);
    if (res.xp) parts.push(`+${res.xp} :xp:`);
    for (const x of res.gift) parts.push(`+${x.qty} :${ITEMS[x.item].icon}:`);
    for (const x of res.used) parts.push(`−${x.qty} :${ITEMS[x.item].icon}:`);
    for (const x of res.lost) parts.push(`<span class="miss">−${x.qty} :${ITEMS[x.item].icon}:</span>`);
    const img = evImg(e.id);
    return `${img ? `<img class="evimg" src="${img}" alt="">` : ''}${storyHead(e)}<h3 class="sub">${esc(e.title)}</h3>
      <p class="evtext"><i>„${esc(e.a[res.i].t)}“</i></p><p class="evtext"><b>${esc(res.text)}</b></p>${relChips(res.rel)}${chapterDone(farm, res.chapter)}
      ${res.dog ? `<p class="muted">:pes: ${esc(farm.dog ? farm.dog.name : DOG.name)} pomohl – dopadlo to líp, než mohlo.</p>` : ''}
      ${parts.length ? `<div class="chips">${parts.map(t => `<span class="chip">${t}</span>`).join('')}</div>` : ''}
      ${res.fx.length ? `<p class="muted">Na 3 hodiny: ${res.fx.map(f => fxText(f)).join(' · ')}</p>` : ''}
      <button class="btn" data-act="closePanel" data-v="">Pokračovat</button>`;
  }
  if (ev) {
    const e = evDef(ev.id), story = !!STORY_BY[e.id];
    const img = evImg(e.id);
    const btns = e.a.map((a, i) => {
      if (!answerShown(farm, e, a)) return '';   // v39: odpověď jen s dřívější volbou nebo dobrým vztahem
      const why = answerNeed(farm, a);
      const cost = [a.pay ? `${evCoins(farm, a.pay)} :coin:` : '', a.use ? useText(a.use) : ''].filter(Boolean).join(' + ');
      return `<button class="btn evans${why ? ' off' : ''}" data-act="evAnswer" data-v="${ev.slot}|${ev.id}|${i}">${esc(a.t)}${cost ? ` <small>(${cost})</small>` : ''}${a.p !== undefined ? ' <small>🎲</small>' : ''}</button>`;
    }).join('');
    return `${img ? `<img class="evimg" src="${img}" alt="">` : ''}${storyHead(e)}<h3 class="sub">${esc(e.title)}</h3>
      <p class="evtext">${esc(story ? storyText(farm, e) : e.text)}</p>
      ${e.danger && farm.dog ? `<p class="muted">:pes: ${esc(farm.dog.name)} je ve střehu – špatné konce zmírní.</p>` : ''}
      <div class="evans-list">${btns}</div>
      <p class="muted">${story ? 'Díl příběhu na tebe počká, dokud ho nezahraješ. Hra si tvoje volby pamatuje a ovlivní další díly. 🎲 = může to dopadnout dobře i špatně.'
        : `🎲 = může to dopadnout dobře i špatně. Událost počká do ${hhmm(ev.until)}, pak ji nahradí další. Dopad trvá 3 hodiny.`}</p>${fxBlock}`;
  }
  const last = farm.ev && farm.ev.last && evDef(farm.ev.last.id);
  return `<p class="muted">Dvakrát denně (dopoledne a odpoledne) se na farmě něco přihodí. Vybereš jednu ze 4 odpovědí – podle ní tě farma odmění, nebo potrestá, často na 3 hodiny.</p>
    ${farm.level < 3 ? '<div class="empty">Události začnou chodit od úrovně 3.</div>' : '<div class="empty">Teď se nic neděje. Další událost brzy.</div>'}
    ${last ? `<p class="muted">Naposledy: <b>${esc(last.title)}</b> – ${esc(farm.ev.last.text)}</p>` : ''}${storyStatus(farm)}${fxBlock}`;
}

// ---------- v39: hlavní příběh a Kronika ----------
const storyHead = e => (STORY_BY[e.id] ? `<p class="evch">:book: Kapitola ${e.ch} · ${esc(chapterOf(e).title)} · díl ${STORY.filter(x => x.ch === e.ch).indexOf(e) + 1}/4</p>` : '');
function relChips(rel) {
  const r = Object.entries(rel || {}).filter(([, n]) => n);
  return r.length ? `<div class="chips">${r.map(([k, n]) => `<span class="chip ${n > 0 ? 'ok' : 'warn'}">:${STORY_PEOPLE[k].icon}: ${STORY_PEOPLE[k].name} ${n > 0 ? '+' + n : '−' + -n}</span>`).join('')}</div>` : '';
}
const decoImg = id => (hasAsset('b', id) ? `<img class="decoimg" src="${assetUrl('b', id)}" alt="">` : `:${BUILDINGS[id].icon}:`);
function chapterDone(farm, c) {
  if (!c) return '';
  const next = CHAPTERS[c.n];
  return `<div class="chdone">${decoImg(c.deco)}<div><b>Kapitola ${c.n} „${esc(c.title)}“ dokončena!</b>
    <small>Odměna: ${c.coins} :coin:${c.bonus ? ` (přátelé +${c.bonus} %)` : ''}, ${c.xp} :xp:${c.got ? ` · ozdoba <b>${esc(BUILDINGS[c.deco].name)}</b> zdarma ve Stavět` : ''}</small>
    <small>${next ? (statekLevel(farm) >= next.st ? `Další kapitola „${esc(next.title)}“ začne zítra.` : `Další kapitola „${esc(next.title)}“ začne, až vylepšíš :house: Statek na úroveň ${next.st}.`) : 'To je zatím konec příběhu. Pokračování přijde v další verzi hry.'}</small></div></div>`;
}
// stav příběhu (v okně událostí, když se zrovna nic neděje)
function storyStatus(farm) {
  const s = farm.story || { n: 0 }, e = STORY[s.n];
  const line = !e ? 'Příběh je zatím celý dohraný.' : statekLevel(farm) < chapterOf(e).st ? `Kapitola ${e.ch} „${esc(chapterOf(e).title)}“ začne, až vylepšíš :house: Statek na úroveň ${chapterOf(e).st}.`
    : s.d === dayKey(Date.now()) ? `Další díl „${esc(e.title)}“ přijde zítra.` : `Další díl „${esc(e.title)}“ přijde s příští událostí.`;
  return `<p class="muted">:book: <b>Příběh:</b> ${line}</p><button class="btn alt" data-act="kronika" data-v="">:book: Kronika údolí</button>`;
}
export function kronikaHtml(farm) {
  const s = farm.story || { n: 0, log: [], r: {} };
  const log = Object.fromEntries((s.log || []).map(x => [x[0], x]));
  const rel = Object.entries(STORY_PEOPLE).map(([k, p]) => `<span class="chip">:${p.icon}: ${p.name}: ${(s.r && s.r[k]) || 0}</span>`).join('');
  const chs = CHAPTERS.map(ch => {
    const eps = STORY.filter(e => e.ch === ch.n), done = eps.every(e => log[e.id]), open = statekLevel(farm) >= ch.st;
    const rows = eps.map(e => {
      const l = log[e.id];
      return l ? `<li><b>${esc(e.title)}</b> – „${esc(e.a[l[1]].t)}“</li>` : `<li class="dim">${STORY.indexOf(e) === s.n && open ? `<b>${esc(e.title)}</b> – na řadě` : '???'}</li>`;
    }).join('');
    const own = farm.objects.some(o => o.kind === ch.deco) || farm.pending.includes(ch.deco);
    return `<div class="chap${done ? ' done' : open ? '' : ' locked'}">${decoImg(ch.deco)}<div class="info"><b>${ch.n}. ${esc(ch.title)}</b>
      <small>${done ? '✓ dohráno' : open ? 'probíhá' : `:lock: od Statku ${ch.st}`} · odměna: ${esc(BUILDINGS[ch.deco].name)}${own ? ' ✓' : ''}, ${ch.coins} :coin:</small>
      ${open || done ? `<ol>${rows}</ol>` : ''}</div></div>`;
  }).join('');
  return `<p class="muted">Kronika údolí: každý den jeden díl příběhu (místo jedné z událostí). Každou další kapitolu odemkne vylepšení Statku. Tvoje volby si hra pamatuje – mění, co se stane v dalších dílech, a dobré vztahy zvýší odměnu za kapitolu (+5 % za každý bod, nejvýš +50 %).</p>
    <h3 class="sub">Vztahy</h3><div class="chips">${rel}</div>${chs}`;
}

// ---------- v36: týdenní soutěž ----------
export function weeklyHtml(farm, now, data) {
  const w = weekNo(now), t = weekTask(w), left = weekStart(w + 1) - now;
  const mine = farm.wk && farm.wk.w === w ? farm.wk.s : 0;
  const prizes = WEEK_PRIZES.map((p, i) => `<span class="chip">${i + 1}. místo: ${p.coins} :coin: +${p.xp} :xp:</span>`).join('');
  let board = '';
  if (data && data.top) {
    board = data.top.map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span class="rank">${i + 1}.</span><div class="info"><b>${esc(r.name)}</b><small>${r.s} ${t.unit}</small></div>
      ${r.me ? '' : `<button class="btn sm alt" data-act="visit" data-v="${esc(r.name)}">:house: Navštívit</button>`}</div>`).join('') || '<div class="empty">Tento týden ještě nikdo nebodoval. Buď první!</div>';
    if (data.me && data.me.rank && !data.top.some(r => r.me)) board += `<p class="muted">Tvoje místo: <b>${data.me.rank}.</b></p>`;
    if (data.prev && data.prev.top.length) board += `<p class="muted">Minulý týden (${data.prev.task.name}): ${data.prev.top.map((r, i) => `${i + 1}. ${esc(r.name)} (${r.s})`).join(', ')}</p>`;
  } else board = `<div class="empty">${data === null ? 'Žebříček soutěže je jen v online hře.' : 'Načítám žebříček…'}</div>`;
  const pr = farm.wk && farm.wk.pr ? `<p class="muted">Minulý týden jsi skončil na <b>${farm.wk.pr}. místě</b>${farm.wk.ps ? ` (${farm.wk.ps})` : ''}.</p>` : '';
  return `<div class="row"><span class="ico">:${t.icon}:</span><div class="info"><b>Úkol týdne: ${t.name}</b>
      <small>Tvoje skóre: <b>${mine}</b> ${t.unit} · konec za ${fmtTime(Math.ceil(left / 1000))}</small></div></div>
    <p class="muted">Každý týden (od pondělí do neděle) se soutěží v něčem jiném. Počítá se, co od začátku týdne získáš sám – nákupy na tržišti a dárky ne. Na začátku dalšího týdne dostanou první tři odměnu.</p>
    <div class="chips">${prizes}</div>${pr}${board}`;
}

// ---------- v38: malé pole – co roste a zrušení výsevu ----------
export function plotHtml(farm, p, now, ask) {
  const st = plotState(p, now);
  if (!p.crop) return '<div class="empty">Pole je prázdné – klepni na něj a vyber, co zasadit.</div>';
  const c = CROPS[p.crop];
  const bar = `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>`;
  const head = `<div class="row"><span class="ico">:${c.icon}:</span><div class="info"><b>${esc(c.name)} ${st.state === 'ready' ? 'je zralá' : 'roste'}</b>
    <small>${st.state === 'ready' ? 'sklidíš tažením prstu přes pole' : `zralé za ${fmtTime(st.left)}`}</small>${bar}</div></div>`;
  if (st.state === 'ready') return head;
  return head + (ask
    ? `<div class="empty">Opravdu zrušit výsev? <b>Osivo ani mince se nevrátí</b>, pole bude hned volné.</div>
      <button class="btn warn" data-act="clearPlot" data-v="${p.x}|${p.y}">Ano, zrušit výsev</button><button class="btn alt" data-act="closePanel" data-v="">Ne, nechat růst</button>`
    : `<p class="muted">Zasadil sis omylem něco jiného? Výsev můžeš zrušit a pole osázet znovu – co jsi za něj dal, propadne.</p>
      <button class="btn alt" data-act="clearPlotAsk" data-v="${p.x}|${p.y}">✕ Zrušit výsev</button>`);
}

// ---------- v38: úrovně hráče a dovednosti ----------
const SKILL_HOW = { f: 'sklizní plodin a ovoce a dary od zvířat (i práce týmu)', r: 'úlovky v rybníku', v: 'výrobky z výroben (i práce týmu)' };
// co daná dovednost odemyká: [[úroveň, ikona, název]]
export function skillUnlocks(farm, k) {
  const out = [];
  if (k === 'f' || k === 'r') for (const m of MACHINE_LIST) if (m.sk === k && m.type !== 'helper') out.push([m.skl, m.icon, m.name]);
  if (k === 'r') for (const f of FISH_LIST) out.push([f.fishLv, f.icon, f.name]);
  if (k === 'v') for (const r of Object.values(RECIPES)) if (PRODUCTS[r.id] && r.cook > 1) out.push([r.cook, ITEMS[r.id].icon, ITEMS[r.id].name + (statekLevel(farm) < r.st ? ` (Statek ${r.st})` : '')]);
  return out.sort((a, b) => a[0] - b[0]);
}
export function skillsHtml(farm) {
  const lp = levelProgress(farm);
  const bar = (cur, need) => `<div class="bar sk"><div style="width:${Math.min(100, cur / need * 100).toFixed(1)}%"></div></div>`;
  const rows = Object.entries(SKILLS).map(([k, sk]) => {
    const pr = skillProgress(farm, k);
    const next = skillUnlocks(farm, k).filter(x => x[0] > pr.L).slice(0, 4);
    return `<div class="row"><span class="ico">:${sk.icon}:</span><div class="info"><b>${sk.name}: úroveň ${pr.L}</b>
      <small>${pr.L >= SKILL_MAX ? 'nejvyšší úroveň' : `${pr.cur} / ${pr.need} XP do další`} · roste za ${SKILL_HOW[k]}</small>${bar(pr.cur, pr.need)}
      ${next.length ? `<small>Další: ${next.map(([L, ic, n]) => `:${ic}: ${esc(n)} (${L})`).join(', ')}</small>` : ''}</div></div>`;
  }).join('');
  return `<div class="row"><span class="ico">:star:</span><div class="info"><b>Úroveň hráče ${farm.level}</b>
      <small>${farm.level >= MAX_LEVEL ? 'nejvyšší úroveň' : `${lp.cur} / ${lp.need} XP do další`} · odemyká pozemky, psa, události a zásluhy pro vylepšení Statku</small>${bar(lp.cur, lp.need)}</div></div>
    <h3 class="sub">Dovednosti</h3>
    <p class="muted">Dovednosti rostou samy tím, co na farmě děláš. <b>Farmaření</b> odemyká stroje, <b>Rybaření</b> udice a vzácnější ryby, <b>Vaření</b> nové recepty ve výrobnách. Budovy, plodiny a zvířata odemyká <b>Statek</b>.</p>
    ${rows}`;
}
