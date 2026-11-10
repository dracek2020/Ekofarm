// EKOfarm – obsah panelů (obchod, budova, ohrada, sklad). Vrací HTML; kliknutí obsluhuje main.js přes data-act.
import {
  ITEMS, ITEM_LIST, RECIPES, BUILDINGS, BUILDING_LIST, ANIMALS, ANIMAL_LIST, QUEUE_SIZE,
  have, hasInputs, countKind, maxPlots, plotPrice, siloUsed, siloUpgradePrice, queueState, animalState,
  CROP_LIST, LEVEL_XP, MAX_LEVEL, plotState,
  TREES, TREE_LIST, FREE_PLOTS, maxOrchards, orchardPrice, treeState, orderReady, canDeliver,
  LAND_PARCELS, landPrice, landLevel, landReachable,
  DAILY, ACHIEVEMENTS, dayKey, sellPrice, marketMult, nextMarketChange, fieldYield, hasTool,
  MACHINES, MACHINE_LIST, MACHINE_TYPE_NAME, FIELD_CELL_PRICE, FIELD_MIN, FIELD_MAX, CROPS,
  maxBigFields, machineJob, freeMachine, fieldState, jobSeconds, hasMachine,
} from './rules.js?v=8';
import { fmtTime } from './render.js?v=8';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card({ icon, name, lines, locked, act, v, disabled }) {
  const cls = 'crop' + (locked ? ' locked' : '') + (disabled ? ' dim' : '');
  return `<button class="${cls}" data-act="${act}" data-v="${esc(v)}">
    <div class="ico">:${icon}:</div><div class="nm">${esc(name)}</div>
    ${lines.map(l => `<div class="meta">${l}</div>`).join('')}
  </button>`;
}

export const SHOP_TABS = [['zvirata', 'Zvířata'], ['farma', 'Farma']];

const TYPE_ORDER = { storage: 0, factory: 1, pen: 2, deco: 3 };

function fieldCards(farm) {
  const max = maxPlots(farm.level);
  const free = farm.plots.length < FREE_PLOTS;
  const plot = card({ icon: 'plot', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max || farm.coins < plotPrice(farm),
    lines: farm.plots.length >= max ? [`${farm.plots.length}/${max}`, `+6 na úrovni ${farm.level + 1}`]
      : [free ? `:gift: zdarma (${FREE_PLOTS - farm.plots.length}×)` : `${plotPrice(farm)} :coin:`, `${farm.plots.length}/${max} polí`] });
  const sadMax = maxOrchards(farm.level);
  const sadCount = countKind(farm, 'sad');
  const sad = card({ icon: 'tree', name: 'Sad', act: 'buy', v: 'sad', locked: farm.level < 3,
    disabled: farm.level >= 3 && (sadCount >= sadMax || farm.coins < orchardPrice(farm)),
    lines: farm.level < 3 ? [':lock: úroveň 3', 'políčko pro strom']
      : sadCount >= sadMax ? [`${sadCount}/${sadMax}`, `+2 na úrovni ${farm.level + 1}`]
      : [`${orchardPrice(farm)} :coin:`, `${sadCount}/${sadMax} sadů`] });
  const bfMax = maxBigFields(farm.level), bfCount = countKind(farm, 'velkepole');
  const big = card({ icon: 'field', name: 'Velké pole', act: 'buy', v: 'velkepole', locked: farm.level < 5,
    disabled: farm.level >= 5 && bfCount >= bfMax,
    lines: farm.level < 5 ? [':lock: úroveň 5', 'pro stroje']
      : bfCount >= bfMax ? [`${bfCount}/${bfMax}`, 'další na vyšší úrovni']
      : [`${FIELD_CELL_PRICE} :coin: za políčko`, `${FIELD_MIN}×${FIELD_MIN} až ${FIELD_MAX}×${FIELD_MAX}`] });
  const left = LAND_PARCELS.filter(p => !farm.land.includes(p.id)).length;
  const land = card({ icon: 'sign', name: 'Pozemky', act: 'openLand', v: '', disabled: !left,
    lines: left ? [`další za ${landPrice(farm)} :coin:`, `od úrovně ${landLevel(farm)}`] : ['vše koupeno', '&nbsp;'] });
  return [plot, sad, big, land];
}

// Stavět: všechny budovy, odemčené i zamčené (podle úrovně)
export function buildHtml(farm) {
  const fields = fieldCards(farm);
  const list = BUILDING_LIST.filter(b => b.type in TYPE_ORDER)
    .sort((a, b) => a.level - b.level || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.cost - b.cost);
  const cards = list.map(b => {
    const free = farm.pending.includes(b.id);
    const locked = !free && farm.level < b.level;
    const done = !free && b.max && countKind(farm, b.id) >= b.max;
    const lines = free ? [':gift: zdarma', `${b.w}×${b.h}`]
      : locked ? [`:lock: úroveň ${b.level}`, `${b.cost} :coin:`]
      : done ? ['✓ postaveno', '&nbsp;']
      : [`${b.cost} :coin:`, `${b.w}×${b.h}`];
    return card({ icon: b.icon, name: b.name, locked, act: 'buy', v: b.id, disabled: done || (!free && farm.coins < b.cost), lines });
  });
  return `<p class="muted">Úroveň ${farm.level}. Zamčené budovy se odemknou s vyšší úrovní.</p><div class="crops">${fields.join('')}${cards.join('')}</div>`;
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
    const max = maxPlots(farm.level);
    cards = [
      card({ icon: 'plot', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max,
        lines: farm.plots.length >= max ? [`${farm.plots.length}/${max} · víc na další úrovni`] : [`${plotPrice(farm)} :coin:`, `${farm.plots.length}/${max} polí`] }),
      card({ icon: 'barn', name: 'Větší sklad', act: 'upgradeSilo', v: '', disabled: farm.coins < siloUpgradePrice(farm),
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

export function statekHtml(farm, name, now) {
  const next = farm.level < MAX_LEVEL ? LEVEL_XP[farm.level + 1] - farm.xp : 0;
  return `<p class="muted"><b>:truck: Zakázky</b> – doruč zboží a dostaneš víc mincí než ve výkupu. Zakázku, která se ti nehodí, zruš ✕ a za 3 minuty přijde nová.</p>
    <div class="orders">${farm.orders.map((o, i) => orderCard(farm, o, i, now)).join('')}</div>
    <p class="muted">Farma ${esc(name)} · úroveň ${farm.level} · ${farm.xp} XP${next ? ` (do další úrovně ${next})` : ''} · ${farm.plots.length} polí · ${countKind(farm, 'sad')} sadů</p>`;
}

export function orchardHtml(farm, o, now) {
  const st = treeState(o, now);
  if (st.state === 'empty') {
    const cards = TREE_LIST.map(t => {
      const locked = farm.level < t.level;
      return card({ icon: ITEMS[t.fruit].icon, name: t.name, locked, act: 'plantTree', v: t.id, disabled: !locked && farm.coins < t.cost,
        lines: locked ? [`:lock: úroveň ${t.level}`] : [`sazenice ${t.cost} :coin:`, `${t.harvests}× ${t.yield} :${ITEMS[t.fruit].icon}: · první za ${fmtTime(t.first)}`] });
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
  return `<div class="row"><span class="ico">:${fruit.icon}:</span><div class="info"><b>${t.name}</b><small>${txt}</small>${bar}
      <small>Zbývá úrod: ${st.state === 'dead' ? 0 : o.left} z ${t.harvests} · ${fruit.price} :coin: za kus</small></div></div>
    ${st.state === 'dead' ? `<button class="btn" data-act="clearTree" data-v="${o.id}">:axe: Vykopat strom</button>` : ''}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout sad</button>`;
}

// prodejna strojů (tlačítko vlevo nahoře)
export function dealerHtml(farm, now) {
  const cards = MACHINE_LIST.map(m => {
    const locked = farm.level < m.level;
    const mine = farm.machines.find(x => x.model === m.id);
    const job = mine && machineJob(farm, mine.id, now);
    const lines = locked ? [`:lock: úroveň ${m.level}`]
      : mine ? [job ? `:gear: pracuje ${fmtTime(Math.ceil((job.job.end - now) / 1000))}` : '✓ v garáži']
      : [`${m.cost} :coin:`];
    if (m.speed) lines.push(`rychlost ${m.speed} políček/min`);
    lines.push(`<small>${m.info}</small>`);
    return card({ icon: m.icon, name: m.name, locked, act: 'buyMachine', v: m.id, disabled: !!mine || farm.coins < m.cost, lines });
  });
  let small = '';
  if (hasMachine(farm, 'tractor') || hasMachine(farm, 'combine')) {
    const empty = farm.plots.filter(p => !p.crop).length;
    const ready = farm.plots.filter(p => plotState(p, now).state === 'ready').length;
    small = `<p class="muted"><b>Malá pole</b> – stroje je obslouží najednou.</p>`;
    if (hasMachine(farm, 'tractor')) {
      small += `<div class="crops">${CROP_LIST.map(c => card({ icon: c.icon, name: `Zasít: ${c.name}`, locked: farm.level < c.level, act: 'sowAll', v: c.id, disabled: !empty,
        lines: farm.level < c.level ? [`:lock: úroveň ${c.level}`] : [`${empty}× ${c.cost} :coin:`] })).join('')}</div>`;
    }
    if (hasMachine(farm, 'combine')) small += ready ? `<button class="btn" data-act="harvestAll" data-v="">Sklidit všechna zralá malá pole (${ready})</button>` : '';
  }
  return `<p class="muted">Stroje bydlí v garáži a jezdí pracovat na <b>velká pole</b> (Stavět → Velké pole, od úrovně 5). Traktor seje, kombajn sklízí obilí, kukuřici a sóju, mrkev sklízí traktor.</p>
    <div class="crops">${cards.join('')}</div>${small}`;
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
    const cards = CROP_LIST.map(c => card({ icon: c.icon, name: c.name, locked: farm.level < c.level, act: 'fieldSow', v: c.id, disabled: farm.coins < c.cost * cells,
      lines: farm.level < c.level ? [`:lock: úroveň ${c.level}`]
        : [`osivo ${c.cost * cells} :coin:`, `úroda ${Math.round(cells * c.yield * (o.soil === 'plowed' ? 1.5 : 1))} :${c.icon}:`, `sklízí ${MACHINE_TYPE_NAME[c.harvester]}`] }));
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
  for (let i = 0; i < QUEUE_SIZE; i++) {
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
      icon: ITEMS[r.id].icon, name: ITEMS[r.id].name, locked, act: 'produce', v: r.id,
      disabled: !locked && (!hasInputs(farm, r) || q.length >= QUEUE_SIZE),
      lines: locked ? [`:lock: úroveň ${r.level}`] : [ingredients(farm, r), `:clock: ${fmtTime(r.time)} · ${ITEMS[r.id].price} :coin:`],
    });
  });
  return `<div class="slots">${slots.join('')}</div>
    ${done ? `<button class="btn" data-act="collect" data-v="${o.id}">Vybrat hotové (${done})</button>` : ''}
    <p class="muted">Vyber, co vyrobit (fronta až ${QUEUE_SIZE} výrobky):</p>
    <div class="crops">${recipes.join('')}</div>
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
    ${o.animals.length < an.max ? `<button class="btn alt" data-act="buyAnimal" data-v="${an.id}">Koupit ${an.acc} za ${an.cost} :coin: (${o.animals.length}/${an.max})</button>` : ''}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}


export function decoHtml(farm, o) {
  return `<p class="muted">Ozdoba dělá farmu hezčí.</p><button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout</button>`;
}

export function siloHtml(farm, now) {
  const items = ITEM_LIST.filter(it => have(farm, it.id) > 0);
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
    ${rows}<button class="btn alt" data-act="upgradeSilo" data-v="">Rozšířit sklad na ${farm.siloCap + 25} míst za ${siloUpgradePrice(farm)} :coin:</button>`;
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

export const TASK_TABS = [['odmeny', 'Odměny a úkoly'], ['zebricek', 'Žebříček']];

export function canClaimDaily(farm, now) { return farm.daily.day !== dayKey(now); }
export function claimableAch(farm) {
  return ACHIEVEMENTS.filter(a => { const t = farm.ach[a.id] || 0; return t < a.tiers.length && (farm.stats[a.stat] || 0) >= a.tiers[t]; }).length;
}

export function tasksHtml(farm, now, tab, board) {
  const tabs = `<div class="tabs">${TASK_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="ttab" data-v="${id}">${n}</button>`).join('')}</div>`;
  if (tab === 'zebricek') {
    if (!board) return tabs + '<div class="empty">Načítám žebříček…</div>';
    const rows = board.top.map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span class="rank">${i + 1}.</span><div class="info"><b>${esc(r.name)}</b><small>úroveň ${r.level} · ${r.xp} :xp:</small></div></div>`).join('');
    const mine = board.me && !board.top.some(r => r.me) ? `<p class="muted">Tvoje místo: <b>${board.me.rank}.</b> (${board.me.xp} :xp:)</p>` : '';
    return tabs + (rows || '<div class="empty">Zatím tu nikdo není.</div>') + mine;
  }
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
