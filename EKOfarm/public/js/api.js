// EKOfarm – spojení se serverem. Lokální režim (testovací verze) hraje bez serveru.
import { newFarm, applyAction, normalize, VILL_BUDGET, isOldSeason, weekNo } from './rules.js?v=41';
export const APP_VERSION = 41;   // v38: verze aplikace (posílá se serveru; tools/version.mjs ji mění spolu s main.js)

const TOKEN_KEY = 'ekofarm_token';
const LOCAL_KEY = 'ekofarm_local_v1';
const memStore = {};

export function lsGet(k) {
  try { return localStorage.getItem(k); } catch { return memStore[k] ?? null; }
}
export function lsSet(k, v) {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
  catch { if (v === null) delete memStore[k]; else memStore[k] = v; }
}

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.message) || 'Chyba spojení.');
    this.status = status;
    this.code = data && data.error;
  }
}

function onlineBackend() {
  async function req(method, path, body) {
    const headers = { 'content-type': 'application/json', 'x-eko-version': String(APP_VERSION) };   // v38: server odmítne starou verzi
    const t = lsGet(TOKEN_KEY);
    if (t) headers.authorization = 'Bearer ' + t;
    let res;
    try {
      res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError(0, { error: 'offline', message: 'Bez připojení k internetu.' });
    }
    let data = {};
    try { data = await res.json(); } catch { /* prázdná odpověď */ }
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  }
  return {
    mode: 'online',
    async start() {
      if (!lsGet(TOKEN_KEY)) return null;
      try { return await req('GET', '/api/state'); }
      catch (e) { if (e.status === 401) { lsSet(TOKEN_KEY, null); return null; } throw e; }
    },
    async login(name, password) {
      const d = await req('POST', '/api/login', { name, password });
      lsSet(TOKEN_KEY, d.token);
      return d;
    },
    async register(name, password) {
      const d = await req('POST', '/api/register', { name, password });
      lsSet(TOKEN_KEY, d.token);
      return d;
    },
    async logout() {
      try { await req('POST', '/api/logout'); } catch { /* nevadí */ }
      lsSet(TOKEN_KEY, null);
    },
    send(actions) { return req('POST', '/api/actions', { actions }); },
    async config() {
      try { return await req('GET', '/api/config'); } catch { return {}; }
    },
    leaderboard() { return req('GET', '/api/leaderboard'); },
    weekly() { return req('GET', '/api/weekly'); },                       // v36: týdenní soutěž
    help(name) { return req('POST', '/api/help', { name }); },             // v36: pomoc kamarádovi
    visit(name) { return req('GET', '/api/visit?name=' + encodeURIComponent(name)); },
    market() { return req('GET', '/api/market'); },
    // kind: 'list' (vystavit), 'cancel' (stáhnout), 'buy' (koupit)
    marketPost(kind, body) { return req('POST', '/api/market/' + kind, body); },
    chatGet(after) { return req('GET', '/api/chat?after=' + (after || 0)); },
    chatSend(text) { return req('POST', '/api/chat', { text }); },
    pushSubscribe(sub) { return req('POST', '/api/push/subscribe', { sub }); },
    pushUnsubscribe(endpoint) { return req('POST', '/api/push/unsubscribe', { endpoint }); },
    // mode 'login' = přihlásit / založit farmu, 'link' = propojit s přihlášenou farmou
    async google(credential, mode) {
      const d = await req('POST', '/api/google', { credential, mode });
      if (d.token) lsSet(TOKEN_KEY, d.token);
      return d;
    },
  };
}

function localBackend() {
  function load() {
    const raw = lsGet(LOCAL_KEY);
    if (raw) { try { const f = JSON.parse(raw); if (!isOldSeason(f)) return normalize(f); } catch { /* poškozené */ } }   // v34: stará sezóna → nová farma
    const f = newFarm(Date.now());
    lsSet(LOCAL_KEY, JSON.stringify(f));
    return f;
  }
  return {
    mode: 'local',
    async start() { return { name: 'Testovací farma', farm: load(), now: Date.now() }; },
    async login() { return this.start(); },
    async register() { return this.start(); },
    async logout() { lsSet(LOCAL_KEY, null); },
    async config() { return {}; },
    async leaderboard() { const f = load(); return { top: [{ name: 'Testovací farma', level: f.level, xp: f.xp, me: true }], me: { rank: 1, xp: f.xp } }; },
    async google() { throw new ApiError(400, { message: 'V testovací verzi není přihlášení přes Google.' }); },
    async visit() { throw new ApiError(400, { message: 'Návštěvy fungují jen v online hře.' }); },
    async weekly() { const f = load(); const w = weekNo(Date.now()); const s = f.wk && f.wk.w === w ? f.wk.s : 0; return { w, top: s ? [{ name: 'Testovací farma', s, me: true }] : [], me: { s, rank: s ? 1 : 0 }, prev: { top: [] } }; },
    async market() { throw new ApiError(400, { message: 'Tržiště hráčů funguje jen v online hře (s kamarády).' }); },
    async marketPost() { throw new ApiError(400, { message: 'Tržiště hráčů funguje jen v online hře.' }); },
    async chatGet() { return { msgs: [] }; },
    async chatSend() { throw new ApiError(400, { message: 'Chat funguje jen v online hře.' }); },
    async pushSubscribe() { throw new ApiError(400, { message: 'Upozornění fungují jen v online hře.' }); },
    async pushUnsubscribe() { return { ok: true }; },
    async send(actions) {
      const farm = load();
      const now = Date.now();
      const lim = { left: VILL_BUDGET };   // stejně jako server: jeden rozpočet práce vesničanů na požadavek
      const results = actions.map(a => applyAction(farm, a, a && a.type === 'harvest' ? now + 2000 : now, lim));
      lsSet(LOCAL_KEY, JSON.stringify(farm));
      return { farm, now, results };
    },
  };
}

export function createBackend() {
  return (typeof window !== 'undefined' && window.EKO_LOCAL) ? localBackend() : onlineBackend();
}
