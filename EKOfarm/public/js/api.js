// EKOfarm – spojení se serverem. Lokální režim (testovací verze) hraje bez serveru.
import { newFarm, applyAction, normalize } from './rules.js?v=6';

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
    const headers = { 'content-type': 'application/json' };
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
    if (raw) { try { return normalize(JSON.parse(raw)); } catch { /* poškozené */ } }
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
    async google() { throw new ApiError(400, { message: 'V testovací verzi není přihlášení přes Google.' }); },
    async send(actions) {
      const farm = load();
      const now = Date.now();
      const results = actions.map(a => applyAction(farm, a, a && a.type === 'harvest' ? now + 2000 : now));
      lsSet(LOCAL_KEY, JSON.stringify(farm));
      return { farm, now, results };
    },
  };
}

export function createBackend() {
  return (typeof window !== 'undefined' && window.EKO_LOCAL) ? localBackend() : onlineBackend();
}
