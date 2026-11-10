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
} from './rules.js?v=19';
import { fmtTime } from './render.js?v=19';
import { NEWS } from './news.js?v=19';

const FRUITS_OF = it => !!TREE_LIST.find(t => t.fruit === it.id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card({ icon, name, lines, locked, act, v, disabled }) {
  const cls = 'crop' + (locked ? ' locked' : '') + (disabled ? ' dim' : '');
  return `<button class="${cls}" data-act="${act}" data-v="${esc(v)}">
    <div class="ico">:${icon}:</div><div class="nm">${esc(name)}</div>
    ${lines.map(l => `<div class="meta">${l}</div>`).join('')}
  </button>`;
}

export const SHOP_TABS = [['zvirata', 'Zvířata'], ['farma', 'Farma']];

const TYPE_ORDER = { storage: 0, garage: 1, factory: 2, pen: 3, pond: 3, hive: 3, deco: 4 };
const nextSt = farm => `víc se statkem ${statekLevel(farm) + 1}`;

function fieldCards(farm) {
  const max = maxPlots(farm);
  const free = farm.plots.length < FREE_PLOTS;
  const plot = card({ icon: 'plot', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max || farm.coins < plotPrice(farm),
    lines: farm.plots.length >= max ? [`${farm.plots.length}/${max}`, nextSt(farm)]
      : [free ? `:gift: zdarma (${FREE_PLOTS - farm.plots.length}×)` : `${plotPrice(farm)} :coin:`, `${farm.plots.length}/${max} polí`] });
  const sadMax = maxOrchards(farm);
  const sadCount = countKind(farm, 'sad');
  const sad = card({ icon: 'tree', name: 'Sad', act: 'buy', v: 'sad',
    disabled: sadCount >= sadMax || farm.coins < orchardPrice(farm),
    lines: sadCount >= sadMax ? [`${sadCount}/${sadMax}`, nextSt(farm)]
      : [`${orchardPrice(farm)} :coin:`, `${sadCount}/${sadMax} sadů`] });
  const bfMax = maxBigFields(farm), bfCount = countKind(farm, 'velkepole');
  const bfLock = BUILDINGS.velkepole.st > statekLevel(farm);
  const big = card({ icon: 'field', name: 'Velké pole', act: 'buy', v: 'velkepole', locked: bfLock,
    disabled: !bfLock && bfCount >= bfMax,
    lines: bfLock ? [`:lock: statek úr. ${BUILDINGS.velkepole.st}`, 'pro stroje']
      : bfCount >= bfMax ? [`${bfCount}/${bfMax}`, nextSt(farm)]
      : [`${FIELD_CELL_PRICE} :coin: za políčko`, `${FIELD_MIN}×${FIELD_MIN} až ${FIELD_MAX}×${FIELD_MAX}`] });
  const left = LAND_PARCELS.filter(p => !farm.land.includes(p.id)).length;
  const land = card({ icon: 'sign', name: 'Pozemky', act: 'openLand', v: '', disabled: !left,
    lines: left ? [`další za ${landPrice(farm)} :coin:`, `od úrovně ${landLevel(farm)}`] : ['vše koupeno', '&nbsp;'] });
  return [plot, sad, big, land];
}

// Stavět: všechny budovy, odemčené i zamčené (odemyká je jen úroveň Statku)
export function buildHtml(farm) {
  const fields = fieldCards(farm);
  const list = BUILDING_LIST.filter(b => b.type in TYPE_ORDER)
    .sort((a, b) => a.st - b.st || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.cost - b.cost);
  const cards = list.map(b => {
    const free = farm.pending.includes(b.id);
    const locked = !free && b.st > statekLevel(farm);
    const done = !free && b.max && countKind(farm, b.id) >= b.max;
    const lines = free ? [':gift: zdarma', `${b.w}×${b.h}`]
      : locked ? [`:lock: statek úr. ${b.st}`, `${b.cost} :coin:`]
      : done ? ['✓ postaveno', '&nbsp;']
      : [`${b.cost} :coin:`, `${b.w}×${b.h}`];
    return card({ icon: b.icon, name: b.name, locked, act: 'buy', v: b.id, disabled: done || (!free && farm.coins < b.cost), lines });
  });
  return `<p class="muted">Statek úrovně <b>${statekLevel(farm)}</b>. Každé vylepšení Statku odemkne nové budovy a víc polí a sadů. Stroje a stánek najdeš dole v <b>městečku</b>.</p><div class="crops">${fields.join('')}${cards.join('')}</div>`;
}

export function shopHtml(farm, tab) {
  const tabs = `<div class="tabs">${SHOP_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}</div>`;
  let cards = [];
  if (tab === 'zvirata') {
    cards = ANIMAL_LIST.map(a => {
      const locked = farm.level < a.level;
      const homes = farm.objects.filter(o => o.kind === a.home);
      const count = homes.reduce((n, o) => n + o.animals.length, 0);
      const cap = homes.length * a.max;
      const lines = locked ? [`:lock: úroveň ${a.level}`]
        : !homes.length ? [`${a.cost} :coin:`, `potřebuje ${BUILDINGS[a.home].name}`]
        : [`${a.cost} :coin:`, `${count}/${cap} v ohradě`];
      return card({ icon: a.icon, name: a.name, locked, act: 'buyAnimal', v: a.id, disabled: !homes.length || count >= cap || farm.coins < a.cost, lines });
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
  return tabs + `<div class="crops">${cards.join('')}</div>`;
}

function orderCard(farm, o, i, now) {
  if (!orderReady(o, now)) {
    return `<div class="order wait"><div class="ico">:truck:</div><small>Nová zakázka za<br><b>${fmtTime(Math.ceil((o.readyAt - now) / 1000))}</b></small></div>`;
  }
  const ok = canDeliver(farm, o);
  const items = o.items.map(x => `<span class="${have(farm, x.item) >= x.qty ? 'okq' : 'miss'}">:${ITEMS[x.item].icon}:<b>${have(farm, x.item)}/${x.qty}</b></span>`).join('');
  return `<div class="order${ok ? ' ready' : ''}">
    <button class="del" data-act="discard" data-v="${i}" aria-label="Zrušit zakázku">✕</button>
    <div class="items">${items}</div>
    <div class="rew">${o.coins} :coin: · ${o.xp} :xp:</div>
    <button class="btn sm${ok ? '' : ' off'}" data-act="deliver" data-v="${i}">Doručit</button>
  </div>`;
}

// blok „Vylepšit budovu“ – suroviny, mince, co to přinese
export function upgradeBlock(farm, o) {
  const L = objLevel(o);
  const c = upgradeCost(o);
  if (!c) return `<div class="upg"><b>:star: Úroveň ${L}/${MAX_BLD_LEVEL}</b> – nejvyšší úroveň.</div>`;
  const items = c.items.map(x => `<span class="${have(farm, x.item) >= x.qty ? 'okq' : 'miss'}">:${ITEMS[x.item].icon}:${have(farm, x.item)}/${x.qty}</span>`).join(' ');
  const coinOk = farm.coins >= c.coins;
  const lock = BUILDINGS[o.kind].type !== 'main' && c.level > statekLevel(farm) ? ':lock: nejdřív vylepši Statek' : '';
  const ok = !lock && coinOk && c.items.every(x => have(farm, x.item) >= x.qty);
  return `<div class="upg"><b>:star: Úroveň ${L}/${MAX_BLD_LEVEL}</b> → ${c.level}: ${upgradeEffect(o)}
    <div class="need">${items} <span class="${coinOk ? 'okq' : 'miss'}">:coin:${c.coins}</span></div>
    ${lock ? `<small>${lock}</small>` : ''}
    <button class="btn sm${ok ? '' : ' off'}" data-act="upgrade" data-v="${o.id}"${o.town ? ' data-town="1"' : ''}>Vylepšit</button></div>`;
}

export const STATEK_TABS = [['zakazky', 'Zakázky'], ['pomocnik', 'Pomocník'], ['statek', 'Statek']];

export function statekHtml(farm, name, now, tab = 'zakazky', o) {
  const tabs = `<div class="tabs">${STATEK_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="stab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'pomocnik') return tabs + helperHtml(farm, now);
  if (tab === 'statek') {
    const next = farm.level < MAX_LEVEL ? LEVEL_XP[farm.level + 1] - farm.xp : 0;
    const L = statekLevel(farm);
    const unlocks = BUILDING_LIST.filter(b => b.st === L + 1).map(b => `:${b.icon}: ${b.name}`).join(', ');
    const have1 = BUILDING_LIST.filter(b => b.st && b.st <= L).map(b => `:${b.icon}:`).join('');
    return tabs + `<p class="muted">Farma ${esc(name)} · hráč úrovně <b>${farm.level}</b> · ${farm.xp} XP${next ? ` (do další ${next})` : ''}. Úroveň hráče roste pořád; co můžeš <b>stavět</b>, určuje Statek.</p>
      <p class="muted">Statek ${L}: až ${maxPlots(farm)} polí, ${maxOrchards(farm)} sadů, ${maxBigFields(farm)}× velké pole. Odemčeno: ${have1}</p>
      ${unlocks ? `<p class="muted">Statek úrovně ${L + 1} odemkne: <b>${unlocks}</b></p>` : ''}
      ${upgradeBlock(farm, o)}`;
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
  const plans = HELPER_PLANS.map((p, i) => `<button class="btn sm" data-act="hire" data-v="${i}">${active ? 'Prodloužit' : 'Najmout'} na ${p.h} h · ${p.cost} :coin:</button>`).join(' ');
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
export function stallHtml(farm, o, now) {
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
    `<span class="${have(farm, id) >= n ? '' : 'miss'}">:${ITEMS[id].icon}:${have(farm, id)}/${n}</span>`).join(' ');
}

export function factoryHtml(farm, o, now) {
  const d = BUILDINGS[o.kind];
  const q = queueState(o, now);
  const slots = [];
  const qs = queueSize(o);
  for (let i = 0; i < qs; i++) {
    const s = q[i];
    if (!s) { slots.push('<div class="slot empty">volno</div>'); continue; }
    const it = ITEMS[s.r];
    const info = s.state === 'done' ? '✓ hotovo' : s.state === 'working' ? fmtTime(s.left) : 'čeká';
    const bar = s.state === 'working' ? `<div class="bar"><div style="width:${(s.progress * 100).toFixed(1)}%"></div></div>` : '';
    slots.push(`<div class="slot ${s.state}"><span class="ico">:${it.icon}:</span><small>${info}</small>${bar}</div>`);
  }
  const done = q.filter(s => s.state === 'done').length;
  const recipes = Object.values(RECIPES).filter(r => r.building === o.kind).map(r => {
    const locked = farm.level < r.level;
    return card({
      icon: ITEMS[r.id].icon, name: (recipeQty(r) > 1 ? recipeQty(r) + '× ' : '') + ITEMS[r.id].name, locked, act: 'produce', v: r.id,
      disabled: !locked && (!hasInputs(farm, r) || q.length >= qs),
      lines: locked ? [`:lock: úroveň ${r.level}`] : [ingredients(farm, r), `:clock: ${fmtTime(r.time)} · ${ITEMS[r.id].price} :coin:`],
    });
  });
  return `<div class="slots">${slots.join('')}</div>
    ${done ? `<button class="btn" data-act="collect" data-v="${o.id}">Vybrat hotové (${done})</button>` : ''}
    <p class="muted">Vyber, co vyrobit (fronta až ${qs} výrobky):</p>
    <div class="crops">${recipes.join('')}</div>
    ${upgradeBlock(farm, o)}
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
    ${upgradeBlock(farm, o)}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}


export function decoHtml(farm, o) {
  return `<p class="muted">Ozdoba dělá farmu hezčí.</p><button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout</button>`;
}

export function siloHtml(farm, now) {
  const group = it => (SEEDS[it.id] || SAPLINGS[it.id] ? 2 : CROPS[it.id] || FRUITS_OF(it) ? 0 : 1);
  const items = ITEM_LIST.filter(it => have(farm, it.id) > 0).sort((a, b) => group(a) - group(b));
  const trend = id => {
    const m = marketMult(id, now);
    return m >= 1.15 ? ' <span class="up">:up: dobrá cena</span>' : m <= 0.85 ? ' <span class="down">:down: nízká cena</span>' : '';
  };
  const rows = items.length ? items.map(it => `
    <div class="row">
      <span class="ico">:${it.icon}:</span>
      <div class="info"><b>${esc(it.name)} × ${have(farm, it.id)}</b><small>${sellPrice(it.id, now)} :coin: za kus${trend(it.id)}</small></div>
      <button class="btn sm" data-act="sell" data-v="${it.id}" data-q="1">Prodat 1</button>
      <button class="btn sm" data-act="sell" data-v="${it.id}" data-q="all">Vše (${have(farm, it.id) * sellPrice(it.id, now)} :coin:)</button>
    </div>`).join('') : '<div class="empty">Sklad je prázdný. Sklízej úrodu z polí! :wheat:</div>';
  return `<p class="muted">:clock: Výkupní ceny se mění každé 4 hodiny – další změna za <b>${fmtTime(Math.ceil((nextMarketChange(now) - now) / 1000))}</b>. Zakázky ve Statku platí vždy víc.</p>
    ${rows}${farm.objects.find(o => o.kind === 'sklad') ? upgradeBlock(farm, farm.objects.find(o => o.kind === 'sklad')) : ''}`;
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
    ${upgradeBlock(farm, o)}<button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout včelín</button>`;
}

// ---------- v11: průvodce pro nové hráče ----------
// done = splněno (podle farmy), info = jen vysvětlení s tlačítkem Dál
export const TUTORIAL = [
  { text: 'Klepni na prázdné pole a vyber <b>Pšenici</b>. Pak můžeš prstem přejet přes další pole a zasít je najednou.', done: f => (f.stats.plant || 0) > 0 },
  { text: 'Pšenice roste 1 minutu. Až zezlátne, <b>přejeď prstem</b> přes zralá pole a sklidíš je do skladu.', done: f => (f.stats.harvest || 0) >= 2 },
  { text: 'Peníze vyděláš <b>zakázkami</b> (klepni na Statek) nebo prodejem ve <b>Skladu</b>. Zkus jedno z toho.', done: f => (f.stats.orders || 0) > 0 || (f.stats.sold || 0) > 0 },
  { text: 'Otevři <b>Stavět</b> a postav <b>Krmivárnu</b> nebo <b>Semenárnu</b> – z úrody budeš vyrábět.', done: f => f.objects.some(o => BUILDINGS[o.kind].type === 'factory') },
  { text: 'V <b>Úkolech</b> čeká každý den 8 denních úkolů a denní odměna. Plň je, dostaneš mince.', info: true },
  { text: 'Tlačítko <b>Městečko</b> vpravo nahoře: prodejna strojů, stánek a tržiště, kde obchoduješ s kamarády.', info: true },
  { text: 'Vylepšuj <b>Statek</b> – odemyká nové budovy, pole a sady. Všechno najdeš v <b>Menu → Jak hrát</b>. Hodně štěstí!', info: true },
];

// ---------- v11: pravidla a nápověda (Menu → Jak hrát) ----------
export const HELP_TABS = [['zaklady', 'Základy'], ['statek', 'Statek'], ['urovne', 'Úrovně'], ['mesto', 'Městečko'], ['ryby', 'Rybník a včely'], ['tipy', 'Počasí a další']];
export function helpHtml(farm, tab = 'zaklady') {
  const tabs = `<div class="tabs">${HELP_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="htab" data-v="${id}">${n}</button>`).join('')}</div>`;
  const p = t => `<p class="muted">${t}</p>`;
  let body = '';
  if (tab === 'zaklady') {
    body = p('<b>:wheat: Pole:</b> klepni na prázdné pole, vyber plodinu a přejeď prstem přes další pole. Zralé pole sklidíš přejetím. Sklizeň jde do <b>Skladu</b> – když je plný, prodej něco nebo ho vylepši.')
      + p('<b>:seed_info: Osivo:</b> sázení stojí mince, nebo bere <b>semena</b> ze skladu (Semenárna: 2 plodiny → 3 balíčky).'.replace(':seed_info:', ':s_wheat:'))
      + p('<b>:chleb: Výroba:</b> výrobny dělají z úrody výrobky (fronta až 3 kusy). Klepnutím na budovu vybereš hotové.')
      + p('<b>:hen: Zvířata:</b> potřebují ohradu a krmivo z Krmivárny. Nakrmíš klepnutím na ohradu.')
      + p('<b>:coin: Peníze:</b> nejvíc platí <b>zakázky</b> ve Statku, pak <b>stánek</b> a <b>tržiště</b>. Výkup ve Skladu platí polovinu ceny a mění se každé 4 hodiny.')
      + p('<b>:xp: Úroveň hráče</b> roste za každou práci a pořád dál. Odemyká nové plodiny, zvířata, stromy, ryby, stroje a recepty.')
      + p('<b>:helper: Pomocník</b> (Statek → Pomocník) sám sklízí a zasívá malá pole.')
      + p('<b>:sign: Pozemky:</b> klepni na ceduli „Na prodej“ za plotem a farmu zvětšíš.');
  } else if (tab === 'statek') {
    const rows = [];
    for (let L = 1; L <= MAX_BLD_LEVEL; L++) {
      const f = { objects: [{ kind: 'statek', lvl: L }] };
      const b = BUILDING_LIST.filter(x => x.st === L).map(x => `:${x.icon}: ${x.name}`).join(', ');
      rows.push(`<tr${statekLevel(farm) === L ? ' class="me"' : ''}><td><b>${L}</b></td><td>${b || '–'}</td><td>${maxPlots(f)} / ${maxOrchards(f)} / ${maxBigFields(f)}</td></tr>`);
    }
    body = p('Co můžeš <b>stavět</b>, určuje jen úroveň <b>Statku</b>. Vylepšíš ho za mince a suroviny (klepni na Statek → záložka Statek). Ostatní budovy můžeš vylepšit nejvýš na úroveň Statku.')
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
