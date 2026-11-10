// EKOfarm – obsah panelů (obchod, budova, ohrada, sklad). Vrací HTML; kliknutí obsluhuje main.js přes data-act.
import {
  ITEMS, ITEM_LIST, RECIPES, BUILDINGS, BUILDING_LIST, ANIMALS, ANIMAL_LIST, QUEUE_SIZE,
  have, hasInputs, countKind, maxPlots, plotPrice, siloUsed, siloUpgradePrice, queueState, animalState,
  CROP_LIST, LEVEL_XP, MAX_LEVEL, plotState,
  TREES, TREE_LIST, FREE_PLOTS, maxOrchards, orchardPrice, treeState, orderReady, canDeliver,
} from './rules.js';
import { fmtTime } from './render.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card({ icon, name, lines, locked, act, v, disabled }) {
  const cls = 'crop' + (locked ? ' locked' : '') + (disabled ? ' dim' : '');
  return `<button class="${cls}" data-act="${act}" data-v="${esc(v)}">
    <div class="ico">${icon}</div><div class="nm">${esc(name)}</div>
    ${lines.map(l => `<div class="meta">${l}</div>`).join('')}
  </button>`;
}

export const SHOP_TABS = [['zvirata', 'Zvířata'], ['stroje', 'Stroje'], ['farma', 'Farma']];

const TYPE_ORDER = { storage: 0, factory: 1, pen: 2, deco: 3 };

function fieldCards(farm) {
  const max = maxPlots(farm.level);
  const free = farm.plots.length < FREE_PLOTS;
  const plot = card({ icon: '🟫', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max || farm.coins < plotPrice(farm),
    lines: farm.plots.length >= max ? [`${farm.plots.length}/${max}`, `+6 na úrovni ${farm.level + 1}`]
      : [free ? `🎁 zdarma (${FREE_PLOTS - farm.plots.length}×)` : `${plotPrice(farm)} 🪙`, `${farm.plots.length}/${max} polí`] });
  const sadMax = maxOrchards(farm.level);
  const sadCount = countKind(farm, 'sad');
  const sad = card({ icon: '🌳', name: 'Sad', act: 'buy', v: 'sad', locked: farm.level < 3,
    disabled: farm.level >= 3 && (sadCount >= sadMax || farm.coins < orchardPrice(farm)),
    lines: farm.level < 3 ? ['🔒 úroveň 3', 'políčko pro strom']
      : sadCount >= sadMax ? [`${sadCount}/${sadMax}`, `+2 na úrovni ${farm.level + 1}`]
      : [`${orchardPrice(farm)} 🪙`, `${sadCount}/${sadMax} sadů`] });
  return [plot, sad];
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
    const lines = free ? ['🎁 zdarma', `${b.w}×${b.h}`]
      : locked ? [`🔒 úroveň ${b.level}`, `${b.cost} 🪙`]
      : done ? ['✔ postaveno', '&nbsp;']
      : [`${b.cost} 🪙`, `${b.w}×${b.h}`];
    return card({ icon: b.icon, name: b.name, locked, act: 'buy', v: b.id, disabled: done || (!free && farm.coins < b.cost), lines });
  });
  return `<p class="muted">Úroveň ${farm.level}. Zamčené budovy se odemknou s vyšší úrovní.</p><div class="crops">${fields.join('')}${cards.join('')}</div>`;
}

export function shopHtml(farm, tab) {
  const tabs = `<div class="tabs">${SHOP_TABS.map(([id, n]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}</div>`;
  let cards = [];
  if (tab === 'stroje') {
    cards = BUILDING_LIST.filter(b => b.type === 'machine').map(b => {
      const locked = farm.level < b.level;
      const done = countKind(farm, b.id) >= b.max;
      return card({
        icon: b.icon, name: b.name, locked, act: 'buy', v: b.id, disabled: done || farm.coins < b.cost,
        lines: [locked ? `🔒 úroveň ${b.level}` : done ? '✔ koupeno' : `${b.cost} 🪙`, `<small>${b.info}</small>`],
      });
    });
  } else if (tab === 'zvirata') {
    cards = ANIMAL_LIST.map(a => {
      const locked = farm.level < a.level;
      const homes = farm.objects.filter(o => o.kind === a.home);
      const count = homes.reduce((n, o) => n + o.animals.length, 0);
      const cap = homes.length * a.max;
      const lines = locked ? [`🔒 úroveň ${a.level}`]
        : !homes.length ? [`${a.cost} 🪙`, `potřebuje ${BUILDINGS[a.home].name}`]
        : [`${a.cost} 🪙`, `${count}/${cap} v ohradě`];
      return card({ icon: a.icon, name: a.name, locked, act: 'buyAnimal', v: a.id, disabled: !homes.length || count >= cap || farm.coins < a.cost, lines });
    });
  } else {
    const max = maxPlots(farm.level);
    cards = [
      card({ icon: '🟫', name: 'Pole', act: 'buyPlot', v: 'plot', disabled: farm.plots.length >= max,
        lines: farm.plots.length >= max ? [`${farm.plots.length}/${max} · víc na další úrovni`] : [`${plotPrice(farm)} 🪙`, `${farm.plots.length}/${max} polí`] }),
      card({ icon: '🏚️', name: 'Větší sklad', act: 'upgradeSilo', v: '', disabled: farm.coins < siloUpgradePrice(farm),
        lines: [`${siloUpgradePrice(farm)} 🪙`, `${farm.siloCap} → ${farm.siloCap + 25} míst`] }),
    ];
  }
  return tabs + `<div class="crops">${cards.join('')}</div>`;
}

function orderCard(farm, o, i, now) {
  if (!orderReady(o, now)) {
    return `<div class="order wait"><div class="ico">🚚</div><small>Nová zakázka za<br><b>${fmtTime(Math.ceil((o.readyAt - now) / 1000))}</b></small></div>`;
  }
  const ok = canDeliver(farm, o);
  const items = o.items.map(x => `<span class="${have(farm, x.item) >= x.qty ? 'okq' : 'miss'}">${ITEMS[x.item].icon}<b>${have(farm, x.item)}/${x.qty}</b></span>`).join('');
  return `<div class="order${ok ? ' ready' : ''}">
    <button class="del" data-act="discard" data-v="${i}" aria-label="Zrušit zakázku">✕</button>
    <div class="items">${items}</div>
    <div class="rew">${o.coins} 🪙 · ${o.xp} ⭐</div>
    <button class="btn sm${ok ? '' : ' off'}" data-act="deliver" data-v="${i}">Doručit</button>
  </div>`;
}

export function statekHtml(farm, name, now) {
  const next = farm.level < MAX_LEVEL ? LEVEL_XP[farm.level + 1] - farm.xp : 0;
  return `<p class="muted"><b>🚚 Zakázky</b> – doruč zboží a dostaneš víc mincí než ve výkupu. Zakázku, která se ti nehodí, zruš ✕ a za 3 minuty přijde nová.</p>
    <div class="orders">${farm.orders.map((o, i) => orderCard(farm, o, i, now)).join('')}</div>
    <p class="muted">Farma ${esc(name)} · úroveň ${farm.level} · ${farm.xp} XP${next ? ` (do další úrovně ${next})` : ''} · ${farm.plots.length} polí · ${countKind(farm, 'sad')} sadů</p>`;
}

export function orchardHtml(farm, o, now) {
  const st = treeState(o, now);
  if (st.state === 'empty') {
    const cards = TREE_LIST.map(t => {
      const locked = farm.level < t.level;
      return card({ icon: ITEMS[t.fruit].icon, name: t.name, locked, act: 'plantTree', v: t.id, disabled: !locked && farm.coins < t.cost,
        lines: locked ? [`🔒 úroveň ${t.level}`] : [`sazenice ${t.cost} 🪙`, `${t.harvests}× ${t.yield} ${ITEMS[t.fruit].icon} · první za ${fmtTime(t.first)}`] });
    });
    return `<p class="muted">Vyber strom. Plodí několikrát, pak doslouží a vykopeš ho.</p><div class="crops">${cards.join('')}</div>
      <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout sad</button>`;
  }
  const t = TREES[o.tree];
  const fruit = ITEMS[t.fruit];
  let txt;
  if (st.state === 'dead') txt = 'Strom doplodil. Vykopej ho a zasaď nový.';
  else if (st.state === 'ready') txt = `${t.yield}× ${fruit.icon} je zralé – klepni na strom.`;
  else txt = `${fruit.icon} za ${fmtTime(st.left)}`;
  const bar = st.state === 'growing' ? `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>` : '';
  return `<div class="row"><span class="ico">${fruit.icon}</span><div class="info"><b>${t.name}</b><small>${txt}</small>${bar}
      <small>Zbývá úrod: ${st.state === 'dead' ? 0 : o.left} z ${t.harvests} · ${fruit.price} 🪙 za kus</small></div></div>
    ${st.state === 'dead' ? `<button class="btn" data-act="clearTree" data-v="${o.id}">🪓 Vykopat strom</button>` : ''}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout sad</button>`;
}

export function traktorHtml(farm, o) {
  const empty = farm.plots.filter(p => !p.crop).length;
  const cards = CROP_LIST.map(c => {
    const locked = farm.level < c.level;
    return card({ icon: c.icon, name: c.name, locked, act: 'sowAll', v: c.id, disabled: !empty,
      lines: locked ? [`🔒 úroveň ${c.level}`] : [`${empty}× ${c.cost} 🪙 = ${empty * c.cost} 🪙`] });
  });
  return `<p class="muted">Prázdných polí: <b>${empty}</b>. Vyber plodinu a traktor ji zaseje všude najednou.</p>
    <div class="crops">${cards.join('')}</div>
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout traktor</button>`;
}

export function kombajnHtml(farm, o, now) {
  const ready = farm.plots.filter(p => plotState(p, now).state === 'ready').length;
  return `<p class="muted">Zralých polí: <b>${ready}</b>. Kombajn je sklidí jedním klepnutím (pokud se úroda vejde do skladu).</p>
    ${ready ? `<button class="btn" data-act="harvestAll" data-v="">Sklidit vše (${ready})</button>` : ''}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout kombajn</button>`;
}

function ingredients(farm, recipe) {
  return Object.entries(recipe.in).map(([id, n]) =>
    `<span class="${have(farm, id) >= n ? '' : 'miss'}">${ITEMS[id].icon}${have(farm, id)}/${n}</span>`).join(' ');
}

export function factoryHtml(farm, o, now) {
  const d = BUILDINGS[o.kind];
  const q = queueState(o, now);
  const slots = [];
  for (let i = 0; i < QUEUE_SIZE; i++) {
    const s = q[i];
    if (!s) { slots.push('<div class="slot empty">volno</div>'); continue; }
    const it = ITEMS[s.r];
    const info = s.state === 'done' ? '✔ hotovo' : s.state === 'working' ? fmtTime(s.left) : 'čeká';
    const bar = s.state === 'working' ? `<div class="bar"><div style="width:${(s.progress * 100).toFixed(1)}%"></div></div>` : '';
    slots.push(`<div class="slot ${s.state}"><span class="ico">${it.icon}</span><small>${info}</small>${bar}</div>`);
  }
  const done = q.filter(s => s.state === 'done').length;
  const recipes = Object.values(RECIPES).filter(r => r.building === o.kind).map(r => {
    const locked = farm.level < r.level;
    return card({
      icon: ITEMS[r.id].icon, name: ITEMS[r.id].name, locked, act: 'produce', v: r.id,
      disabled: !locked && (!hasInputs(farm, r) || q.length >= QUEUE_SIZE),
      lines: locked ? [`🔒 úroveň ${r.level}`] : [ingredients(farm, r), `⏱ ${fmtTime(r.time)} · ${ITEMS[r.id].price} 🪙`],
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
    const txt = st.state === 'hungry' ? `má hlad – chce ${ITEMS[an.feed].icon}` : st.state === 'ready' ? `${ITEMS[an.product].icon} připraveno` : `${ITEMS[an.product].icon} za ${fmtTime(st.left)}`;
    const bar = st.state === 'eating' ? `<div class="bar"><div style="width:${(st.progress * 100).toFixed(1)}%"></div></div>` : '';
    return `<div class="row"><span class="ico">${an.icon}</span><div class="info"><b>${an.name} ${i + 1}</b><small>${txt}</small>${bar}</div></div>`;
  }).join('') || `<div class="empty">Ohrada je prázdná. Kup ${an.acc} v obchodě nebo tady.</div>`;
  const ready = o.animals.filter(a => animalState(a, an, now).state === 'ready').length;
  const hungry = o.animals.filter(a => !a.fed).length;
  return `${rows}
    <p class="muted">${an.name}: krmivo ${ITEMS[an.feed].icon} → ${ITEMS[an.product].icon} ${ITEMS[an.product].name} za ${fmtTime(an.time)}. Krmivo ve skladu: <b>${have(farm, an.feed)}</b></p>
    ${ready ? `<button class="btn" data-act="collect" data-v="${o.id}">Sebrat ${ITEMS[an.product].icon} (${ready})</button>` : ''}
    ${hungry ? `<button class="btn" data-act="feed" data-v="${o.id}">Nakrmit (${hungry})</button>` : ''}
    ${o.animals.length < an.max ? `<button class="btn alt" data-act="buyAnimal" data-v="${an.id}">Koupit ${an.acc} za ${an.cost} 🪙 (${o.animals.length}/${an.max})</button>` : ''}
    <button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout ${esc(d.name)}</button>`;
}

export function decoHtml(farm, o) {
  return `<p class="muted">Ozdoba dělá farmu hezčí.</p><button class="btn alt" data-act="move" data-v="${o.id}">↔ Přesunout</button>`;
}

export function siloHtml(farm) {
  const items = ITEM_LIST.filter(it => have(farm, it.id) > 0);
  const rows = items.length ? items.map(it => `
    <div class="row">
      <span class="ico">${it.icon}</span>
      <div class="info"><b>${esc(it.name)} × ${have(farm, it.id)}</b><small>${it.price} 🪙 za kus</small></div>
      <button class="btn sm" data-act="sell" data-v="${it.id}" data-q="1">Prodat 1</button>
      <button class="btn sm" data-act="sell" data-v="${it.id}" data-q="all">Vše (${have(farm, it.id) * it.price} 🪙)</button>
    </div>`).join('') : '<div class="empty">Sklad je prázdný. Sklízej úrodu z polí! 🌾</div>';
  return `${rows}<button class="btn alt" data-act="upgradeSilo" data-v="">Rozšířit sklad na ${farm.siloCap + 25} míst za ${siloUpgradePrice(farm)} 🪙</button>`;
}

export function siloTitle(farm) {
  return `Sklad ${siloUsed(farm)}/${farm.siloCap}`;
}
