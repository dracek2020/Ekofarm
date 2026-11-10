// Lokální server pro vývoj: node tools/dev-server.mjs  →  http://localhost:8787
// Servíruje public/ a API přes src/worker.js nad SQLite v paměti (náhrada D1).
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';

const ROOT = new URL('..', import.meta.url).pathname;
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(join(ROOT, 'schema.sql'), 'utf8'));
const DB = {
  prepare(sql) {
    let args = [];
    const st = {
      bind(...a) { args = a; return st; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    };
    return st;
  },
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ASSETS = {
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === '/') p = '/index.html';
    const f = join(ROOT, 'public', p);
    if (!f.startsWith(join(ROOT, 'public')) || !existsSync(f) || statSync(f).isDirectory()) return new Response('Not found', { status: 404 });
    return new Response(readFileSync(f), { headers: { 'content-type': TYPES[extname(f)] || 'application/octet-stream' } });
  },
};

const port = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' ? undefined : body }), { DB, ASSETS });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log(`EKOfarm běží na http://localhost:${port}`));
