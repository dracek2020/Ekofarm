// EKOfarm – Cloudflare Worker (API). Statické soubory z public/ servíruje Workers Assets.
import { newFarm, applyAction, normalize, marketTake, marketGive, marketPayout, MARKET_SLOTS, ERRORS, ITEMS, MACHINES, readyEvents } from '../public/js/rules.js';
import { sendPush, pushReady } from './webpush.js';
import { verifyGoogleToken } from './google.js';

const SESSION_DAYS = 60;
const MAX_BATCH = 50;
const HARVEST_GRACE_MS = 2000; // tolerance rozdílu hodin klient/server u sklizně
const PBKDF2_ITER = 100000;

export default {
  // časovač (wrangler.toml [triggers] crons) – rozešle upozornění, co je na farmách hotové
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pushRound(env));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    }
    try {
      return await route(req, env, url.pathname, url, ctx);
    } catch (e) {
      console.error(e);
      return json({ error: 'server', message: 'Chyba serveru, zkus to znovu.' }, 500);
    }
  },
};

async function route(req, env, path, url, ctx) {
  const m = req.method;
  if (m === 'POST' && path === '/api/register') return register(req, env);
  if (m === 'POST' && path === '/api/login') return login(req, env);
  if (m === 'GET' && path === '/api/config') return json({ googleClientId: googleId(env), vapidPublic: pushReady(env) ? env.VAPID_PUBLIC : null });
  if (m === 'POST' && path === '/api/google') return google(req, env);
  const user = await auth(req, env);
  if (!user) return json({ error: 'auth', message: 'Přihlas se prosím znovu.' }, 401);
  if (m === 'POST' && path === '/api/logout') return logout(req, env);
  if (m === 'GET' && path === '/api/state') return getState(env, user);
  if (m === 'GET' && path === '/api/leaderboard') return leaderboard(env, user);
  if (m === 'POST' && path === '/api/actions') return actions(req, env, user);
  if (m === 'GET' && path === '/api/visit') return visit(env, url);
  if (m === 'GET' && path === '/api/market') return marketGet(env, user);
  if (m === 'POST' && path === '/api/market/list') return marketSell(req, env, user);
  if (m === 'POST' && path === '/api/market/cancel') return marketDeal(req, env, user, 'cancel');
  if (m === 'POST' && path === '/api/market/buy') return marketDeal(req, env, user, 'buy', ctx);
  if (m === 'GET' && path === '/api/chat') return chatGet(env, url);
  if (m === 'POST' && path === '/api/chat') return chatPost(req, env, user);
  if (m === 'POST' && path === '/api/push/subscribe') return pushSubscribe(req, env, user);
  if (m === 'POST' && path === '/api/push/unsubscribe') return pushUnsubscribe(req, env, user);
  return json({ error: 'not_found' }, 404);
}

// ---------- účty ----------

async function register(req, env) {
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const pass = String(body.password || '');
  if (!/^[\p{L}\p{N}_.\- ]{3,20}$/u.test(name)) return json({ error: 'name', message: 'Jméno musí mít 3–20 znaků (písmena, čísla, _ . -).' }, 400);
  if (pass.length < 6 || pass.length > 200) return json({ error: 'password', message: 'Heslo musí mít aspoň 6 znaků.' }, 400);
  const exists = await env.DB.prepare('SELECT id FROM users WHERE name = ?').bind(name).first();
  if (exists) return json({ error: 'taken', message: 'Tohle jméno už někdo má.' }, 409);
  const salt = randHex(16);
  const hash = await hashPassword(pass, salt);
  return json(await createAccount(env, name, hash, salt, null));
}

async function createAccount(env, name, hash, salt, googleSub) {
  const now = Date.now();
  const res = await env.DB.prepare('INSERT INTO users (name, pass_hash, salt, google_sub, created) VALUES (?, ?, ?, ?, ?)').bind(name, hash, salt, googleSub, now).run();
  const userId = res.meta.last_row_id;
  const farm = newFarm(now);
  await env.DB.prepare('INSERT INTO farms (user_id, state, version, updated) VALUES (?, ?, 1, ?)').bind(userId, JSON.stringify(farm), now).run();
  const token = await createSession(env, userId);
  return { token, name, farm, now, google: !!googleSub, created: true };
}

// Přihlášení přes Google: přihlásí, založí nový účet, nebo (mode=link) propojí s přihlášeným účtem.
const googleId = env => (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.startsWith('SEM_') ? env.GOOGLE_CLIENT_ID : null);

async function google(req, env) {
  const body = await readJson(req);
  const p = await verifyGoogleToken(body.credential, googleId(env));
  if (!p) return json({ error: 'google', message: 'Přihlášení přes Google se nepovedlo, zkus to znovu.' }, 401);
  const owner = await env.DB.prepare('SELECT id, name FROM users WHERE google_sub = ?').bind(p.sub).first();
  if (body.mode === 'link') {
    const user = await auth(req, env);
    if (!user) return json({ error: 'auth', message: 'Přihlas se prosím znovu.' }, 401);
    if (owner && owner.id !== user.id) return json({ error: 'taken', message: 'Tenhle Google účet už patří jiné farmě.' }, 409);
    await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(p.sub, user.id).run();
    return json({ ok: true, google: true });
  }
  if (owner) {
    const token = await createSession(env, owner.id);
    const row = await loadFarm(env, owner.id);
    return json({ token, name: owner.name, farm: row.farm, now: Date.now(), google: true });
  }
  // nový hráč – jméno z Google účtu, při shodě se přidá číslo
  let base = String(p.given_name || p.name || 'Farmář').replace(/[^\p{L}\p{N}_.\- ]/gu, '').trim().slice(0, 16);
  if (base.length < 3) base = 'Farmář';
  let name = base;
  for (let i = 2; await env.DB.prepare('SELECT id FROM users WHERE name = ?').bind(name).first(); i++) {
    name = i < 100 ? `${base}${i}` : `${base}${randHex(2)}`;
  }
  return json(await createAccount(env, name, null, null, p.sub));
}

async function login(req, env) {
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const pass = String(body.password || '');
  const u = await env.DB.prepare('SELECT id, name, pass_hash, salt, google_sub FROM users WHERE name = ?').bind(name).first();
  if (u && !u.pass_hash) return json({ error: 'login', message: 'Tahle farma se přihlašuje přes Google.' }, 401);
  if (!u || !timingSafeEq(await hashPassword(pass, u.salt), u.pass_hash)) {
    return json({ error: 'login', message: 'Špatné jméno nebo heslo.' }, 401);
  }
  const token = await createSession(env, u.id);
  const row = await loadFarm(env, u.id);
  return json({ token, name: u.name, farm: row.farm, now: Date.now(), google: !!u.google_sub });
}

async function logout(req, env) {
  const t = bearer(req);
  if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run();
  return json({ ok: true });
}

async function createSession(env, userId) {
  const token = randB64(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_DAYS * 86400000).run();
  return token;
}

async function auth(req, env) {
  const t = bearer(req);
  if (!t) return null;
  const s = await env.DB.prepare('SELECT s.user_id AS id, s.expires, u.name, u.google_sub FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
    .bind(await sha256(t)).first();
  if (!s || s.expires < Date.now()) return null;
  return { id: s.id, name: s.name, google: !!s.google_sub };
}

// ---------- farma ----------

async function loadFarm(env, userId) {
  const r = await env.DB.prepare('SELECT state, version FROM farms WHERE user_id = ?').bind(userId).first();
  if (!r) return null;
  return { farm: normalize(JSON.parse(r.state)), version: r.version };
}

// Uloží farmu (optimistické zamykání podle verze). V téže transakci můžou proběhnout další příkazy,
// které se provedou jen tehdy, když se farma opravdu uložila (pozná se podle náhodného farm.tx).
// cond = další podmínka pro uložení (např. že nabídka na tržišti pořád existuje).
const IF_SAVED = "(SELECT json_extract(state, '$.tx') FROM farms WHERE user_id = ?) = ?";
async function saveFarm(env, userId, row, now, extra = null, cond = null) {
  const tx = randHex(8);
  row.farm.tx = tx;
  const stmts = [env.DB.prepare(`UPDATE farms SET state = ?, version = version + 1, updated = ? WHERE user_id = ? AND version = ?${cond ? ' AND ' + cond.sql : ''}`)
    .bind(JSON.stringify(row.farm), now, userId, row.version, ...(cond ? cond.args : []))];
  if (extra) stmts.push(...extra(IF_SAVED, [userId, tx]));
  const res = await env.DB.batch(stmts);
  return res[0].meta.changes === 1;
}
const BUSY = () => json({ error: 'busy', message: 'Farma se právě ukládá z jiného zařízení, zkus to znovu.' }, 409);

// peníze za zboží prodané na tržišti, které si prodávající ještě nevyzvedl
async function pendingSales(env, userId) {
  const r = await env.DB.prepare('SELECT id, coins, item, qty, machine, buyer_name FROM market_sales WHERE seller = ? AND paid = 0 ORDER BY id LIMIT 50').bind(userId).all();
  return r.results || [];
}
function paySales(env, userId, farm, sales) {
  for (const s of sales) marketPayout(farm, s.coins);
  if (!sales.length) return null;
  const last = sales[sales.length - 1].id;
  return (ifSaved, args) => [env.DB.prepare(`UPDATE market_sales SET paid = 1 WHERE seller = ? AND paid = 0 AND id <= ? AND ${ifSaved}`).bind(userId, last, ...args)];
}

async function getState(env, user) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await loadFarm(env, user.id);
    const sales = await pendingSales(env, user.id);
    const out = { name: user.name, farm: row.farm, now: Date.now(), google: user.google };
    if (!sales.length) return json(out);
    const extra = paySales(env, user.id, row.farm, sales);
    if (await saveFarm(env, user.id, row, out.now, extra)) return json({ ...out, sales });
  }
  return BUSY();
}

// žebříček: 30 nejlepších farem podle úrovně (a XP) + moje místo
async function leaderboard(env, user) {
  const top = await env.DB.prepare(
    "SELECT u.id, u.name, json_extract(f.state, '$.level') AS level, json_extract(f.state, '$.xp') AS xp FROM farms f JOIN users u ON u.id = f.user_id ORDER BY level DESC, xp DESC, u.id ASC LIMIT 30"
  ).bind().all();
  const mine = await env.DB.prepare("SELECT json_extract(state, '$.level') AS level, json_extract(state, '$.xp') AS xp FROM farms WHERE user_id = ?").bind(user.id).first();
  const lv = mine ? mine.level || 1 : 1, xp = mine ? mine.xp || 0 : 0;
  const better = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM farms WHERE json_extract(state, '$.level') > ? OR (json_extract(state, '$.level') = ? AND json_extract(state, '$.xp') > ?)"
  ).bind(lv, lv, xp).first();
  return json({
    top: (top.results || []).map(r => ({ name: r.name, level: r.level || 1, xp: r.xp || 0, me: r.id === user.id })),
    me: { rank: (better ? better.n : 0) + 1, level: lv, xp },
  });
}

// návštěva cizí farmy (jen na koukání)
async function visit(env, url) {
  const name = String(url.searchParams.get('name') || '').slice(0, 40);
  const r = await env.DB.prepare('SELECT u.name, f.state FROM users u JOIN farms f ON f.user_id = u.id WHERE u.name = ?').bind(name).first();
  if (!r) return json({ error: 'not_found', message: 'Tahle farma neexistuje.' }, 404);
  const farm = normalize(JSON.parse(r.state));
  delete farm.tx;
  return json({ name: r.name, farm, now: Date.now() });
}

async function actions(req, env, user) {
  const body = await readJson(req);
  const list = Array.isArray(body.actions) ? body.actions.slice(0, MAX_BATCH) : [];
  // optimistické zamykání – když farmu mezitím změnilo jiné zařízení, zkusíme znovu
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await loadFarm(env, user.id);
    const sales = await pendingSales(env, user.id);
    const extra = paySales(env, user.id, row.farm, sales);
    const now = Date.now();
    const results = list.map(a => applyAction(row.farm, a, a && a.type === 'harvest' ? now + HARVEST_GRACE_MS : now));
    if (!results.some(r => r.ok) && !sales.length) return json({ farm: row.farm, now, results });
    if (await saveFarm(env, user.id, row, now, extra)) return json({ farm: row.farm, now, results, sales });
  }
  return BUSY();
}

// ---------- tržiště hráčů ----------
const MARKET_COLS = 'id, seller, seller_name, item, qty, machine, price, created';
const offerOut = (r, me) => ({ id: r.id, name: r.seller_name, item: r.item, qty: r.qty, machine: r.machine, price: r.price, created: r.created, mine: r.seller === me });

async function marketGet(env, user) {
  const others = await env.DB.prepare(`SELECT ${MARKET_COLS} FROM market WHERE seller != ? ORDER BY id DESC LIMIT 150`).bind(user.id).all();
  const mine = await env.DB.prepare(`SELECT ${MARKET_COLS} FROM market WHERE seller = ? ORDER BY id DESC`).bind(user.id).all();
  const sold = await env.DB.prepare('SELECT item, qty, machine, coins, buyer_name, created FROM market_sales WHERE seller = ? ORDER BY id DESC LIMIT 10').bind(user.id).all();
  return json({
    offers: (others.results || []).map(r => offerOut(r, user.id)),
    mine: (mine.results || []).map(r => offerOut(r, user.id)),
    sold: sold.results || [],
    slots: MARKET_SLOTS,
  });
}

const marketErr = code => json({ error: code, message: ERRORS[code] || 'To teď nejde.' }, 400);

// vystavit zboží: věci odejdou z farmy do nabídky
async function marketSell(req, env, user) {
  const body = await readJson(req);
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM market WHERE seller = ?').bind(user.id).first();
  if (cnt && cnt.n >= MARKET_SLOTS) return json({ error: 'slots', message: `Na tržišti můžeš mít najednou ${MARKET_SLOTS} nabídek.` }, 409);
  const a = { price: body.price };
  if (body.machine !== undefined) a.machine = body.machine; else { a.item = body.item; a.qty = body.qty; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await loadFarm(env, user.id);
    const now = Date.now();
    const r = marketTake(row.farm, a, now);
    if (!r.ok) return marketErr(r.error);
    const l = r.listing;
    const ok = await saveFarm(env, user.id, row, now, (ifSaved, args) => [
      env.DB.prepare(`INSERT INTO market (seller, seller_name, item, qty, machine, price, created) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${ifSaved}`)
        .bind(user.id, user.name, l.item || null, l.qty || 1, l.machine || null, l.price, now, ...args),
    ]);
    if (ok) return json({ farm: row.farm, now });
  }
  return BUSY();
}

// koupit cizí nabídku nebo stáhnout svoji (zboží se vrátí)
async function marketDeal(req, env, user, kind, ctx) {
  const body = await readJson(req);
  const id = Number(body.id);
  for (let attempt = 0; attempt < 3; attempt++) {
    const l = await env.DB.prepare(`SELECT ${MARKET_COLS} FROM market WHERE id = ?`).bind(id).first();
    if (!l || (kind === 'cancel' && l.seller !== user.id)) return json({ error: 'gone', message: 'Tahle nabídka už na tržišti není.' }, 404);
    if (kind === 'buy' && l.seller === user.id) return json({ error: 'own', message: 'Svoji nabídku koupit nemůžeš – můžeš ji stáhnout.' }, 400);
    const row = await loadFarm(env, user.id);
    const now = Date.now();
    const r = marketGive(row.farm, l, kind === 'buy' ? l.price : 0);
    if (!r.ok) return marketErr(r.error);
    const ok = await saveFarm(env, user.id, row, now, (ifSaved, args) => [
      ...(kind === 'buy' ? [env.DB.prepare(`INSERT INTO market_sales (seller, buyer_name, item, qty, machine, coins, created) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${ifSaved}`)
        .bind(l.seller, user.name, l.item, l.qty, l.machine, l.price, now, ...args)] : []),
      env.DB.prepare(`DELETE FROM market WHERE id = ? AND ${ifSaved}`).bind(id, ...args),
    ], { sql: 'EXISTS (SELECT 1 FROM market WHERE id = ?)', args: [id] });
    if (ok) {
      if (kind === 'buy' && ctx && pushReady(env)) {
        const what = l.machine ? MACHINES[l.machine].name : `${l.qty}× ${ITEMS[l.item] ? ITEMS[l.item].name : l.item}`;
        ctx.waitUntil(pushToUser(env, l.seller, { title: 'Tržiště: prodáno!', body: `${user.name} koupil ${what} za ${l.price} mincí.`, tag: 'market' }).catch(() => {}));
      }
      return json({ farm: row.farm, now, offer: offerOut(l, user.id) });
    }
  }
  return BUSY();
}

// ---------- chat pro všechny hráče ----------
const CHAT_MAX = 200, CHAT_GAP = 3000, CHAT_DAYS = 7;
async function chatGet(env, url) {
  const after = Math.max(0, Number(url.searchParams.get('after')) || 0);
  const r = after
    ? await env.DB.prepare('SELECT id, name, text, created FROM chat WHERE id > ? ORDER BY id LIMIT 60').bind(after).all()
    : await env.DB.prepare('SELECT * FROM (SELECT id, name, text, created FROM chat ORDER BY id DESC LIMIT 50) ORDER BY id').bind().all();
  return json({ msgs: (r.results || []).map(m => ({ id: m.id, name: m.name, text: m.text, t: m.created })) });
}
async function chatPost(req, env, user) {
  const body = await readJson(req);
  const text = String(body.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
  if (!text) return json({ error: 'empty', message: 'Napiš zprávu.' }, 400);
  const now = Date.now();
  const last = await env.DB.prepare('SELECT MAX(created) AS t FROM chat WHERE user_id = ?').bind(user.id).first();
  if (last && last.t && now - last.t < CHAT_GAP) return json({ error: 'slow', message: 'Pomaleji – další zprávu pošleš za chvilku.' }, 429);
  const res = await env.DB.prepare('INSERT INTO chat (user_id, name, text, created) VALUES (?, ?, ?, ?)').bind(user.id, user.name, text, now).run();
  if (res.meta.last_row_id % 50 === 0) await env.DB.prepare('DELETE FROM chat WHERE created < ?').bind(now - CHAT_DAYS * 86400000).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

// ---------- upozornění do telefonu ----------
async function pushSubscribe(req, env, user) {
  if (!pushReady(env)) return json({ error: 'push', message: 'Upozornění zatím nejsou na serveru nastavená.' }, 400);
  const s = (await readJson(req)).sub || {};
  const endpoint = String(s.endpoint || ''), keys = s.keys || {};
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys.p256dh || !keys.auth) return json({ error: 'push', message: 'Neplatný odběr upozornění.' }, 400);
  const now = Date.now();
  await env.DB.prepare('INSERT OR REPLACE INTO push_subs (endpoint, user_id, p256dh, auth, created, last) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(endpoint, user.id, String(keys.p256dh).slice(0, 200), String(keys.auth).slice(0, 100), now, now).run();
  return json({ ok: true });
}
async function pushUnsubscribe(req, env, user) {
  const b = await readJson(req);
  await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').bind(String(b.endpoint || ''), user.id).run();
  return json({ ok: true });
}
async function pushToUser(env, userId, data) {
  const r = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(userId).all();
  for (const s of r.results || []) {
    const st = await sendPush(env, s, data).catch(() => 0);
    if (st === 404 || st === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(s.endpoint).run();
  }
}
// jedno kolo časovače: každému hráči s odběrem pošle, co se od minula dokončilo
export async function pushRound(env, now = Date.now()) {
  if (!pushReady(env)) return 0;
  const r = await env.DB.prepare('SELECT user_id, MIN(last) AS last FROM push_subs GROUP BY user_id LIMIT 500').all();
  let sent = 0;
  for (const u of r.results || []) {
    const row = await loadFarm(env, u.user_id);
    if (!row) continue;
    const ev = readyEvents(row.farm, u.last, now);
    await env.DB.prepare('UPDATE push_subs SET last = ? WHERE user_id = ?').bind(now, u.user_id).run();
    if (!ev.length) continue;
    const body = ev.slice(0, 3).map(e => e.text).join(' · ') + (ev.length > 3 ? ` a další (${ev.length - 3})` : '');
    await pushToUser(env, u.user_id, { title: 'EKOfarm: máš hotovo!', body, tag: 'farm' });
    sent++;
  }
  return sent;
}

// ---------- pomocné ----------

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}

function bearer(req) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function randHex(n) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randB64(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(pass, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
