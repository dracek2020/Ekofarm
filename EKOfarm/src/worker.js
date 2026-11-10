// EKOfarm – Cloudflare Worker (API). Statické soubory z public/ servíruje Workers Assets.
import { newFarm, applyAction, normalize } from '../public/js/rules.js';
import { verifyGoogleToken } from './google.js';

const SESSION_DAYS = 60;
const MAX_BATCH = 50;
const HARVEST_GRACE_MS = 2000; // tolerance rozdílu hodin klient/server u sklizně
const PBKDF2_ITER = 100000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    }
    try {
      return await route(req, env, url.pathname);
    } catch (e) {
      console.error(e);
      return json({ error: 'server', message: 'Chyba serveru, zkus to znovu.' }, 500);
    }
  },
};

async function route(req, env, path) {
  const m = req.method;
  if (m === 'POST' && path === '/api/register') return register(req, env);
  if (m === 'POST' && path === '/api/login') return login(req, env);
  if (m === 'GET' && path === '/api/config') return json({ googleClientId: googleId(env) });
  if (m === 'POST' && path === '/api/google') return google(req, env);
  const user = await auth(req, env);
  if (!user) return json({ error: 'auth', message: 'Přihlas se prosím znovu.' }, 401);
  if (m === 'POST' && path === '/api/logout') return logout(req, env);
  if (m === 'GET' && path === '/api/state') return getState(env, user);
  if (m === 'GET' && path === '/api/leaderboard') return leaderboard(env, user);
  if (m === 'POST' && path === '/api/actions') return actions(req, env, user);
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

async function getState(env, user) {
  const row = await loadFarm(env, user.id);
  return json({ name: user.name, farm: row.farm, now: Date.now(), google: user.google });
}

// žebříček: 20 nejlepších farem podle XP + moje místo
async function leaderboard(env, user) {
  const top = await env.DB.prepare(
    "SELECT u.id, u.name, json_extract(f.state, '$.level') AS level, json_extract(f.state, '$.xp') AS xp FROM farms f JOIN users u ON u.id = f.user_id ORDER BY xp DESC, u.id ASC LIMIT 20"
  ).bind().all();
  const mine = await env.DB.prepare("SELECT json_extract(state, '$.xp') AS xp FROM farms WHERE user_id = ?").bind(user.id).first();
  const better = await env.DB.prepare("SELECT COUNT(*) AS n FROM farms WHERE json_extract(state, '$.xp') > ?").bind(mine ? mine.xp : 0).first();
  return json({
    top: (top.results || []).map(r => ({ name: r.name, level: r.level || 1, xp: r.xp || 0, me: r.id === user.id })),
    me: { rank: (better ? better.n : 0) + 1, xp: mine ? mine.xp : 0 },
  });
}

async function actions(req, env, user) {
  const body = await readJson(req);
  const list = Array.isArray(body.actions) ? body.actions.slice(0, MAX_BATCH) : [];
  // optimistické zamykání – když farmu mezitím změnilo jiné zařízení, zkusíme znovu
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await loadFarm(env, user.id);
    const now = Date.now();
    const results = list.map(a => applyAction(row.farm, a, a && a.type === 'harvest' ? now + HARVEST_GRACE_MS : now));
    if (!results.some(r => r.ok)) return json({ farm: row.farm, now, results });
    const res = await env.DB.prepare('UPDATE farms SET state = ?, version = version + 1, updated = ? WHERE user_id = ? AND version = ?')
      .bind(JSON.stringify(row.farm), now, user.id, row.version).run();
    if (res.meta.changes === 1) return json({ farm: row.farm, now, results });
  }
  return json({ error: 'busy', message: 'Farma se právě ukládá z jiného zařízení, zkus to znovu.' }, 409);
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
