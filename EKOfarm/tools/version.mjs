// Nastaví číslo verze do adres skriptů a stylů, aby prohlížeč po nasazení
// nepoužil starou uloženou kopii:  node tools/version.mjs 6
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const v = process.argv[2];
if (!/^\d+$/.test(v || '')) { console.error('Použití: node tools/version.mjs <číslo>'); process.exit(1); }
const ROOT = new URL('..', import.meta.url).pathname;
const fix = (file, re, to) => {
  const p = join(ROOT, file);
  const s = readFileSync(p, 'utf8');
  const out = s.replace(re, to);
  if (out !== s) writeFileSync(p, out);
};
for (const f of readdirSync(join(ROOT, 'public/js')).filter(f => f.endsWith('.js'))) {
  fix('public/js/' + f, /from '(\.\/[\w-]+\.js)(\?v=\d+)?'/g, `from '$1?v=${v}'`);
}
fix('public/index.html', /(\/js\/main\.js|\/css\/style\.css)(\?v=\d+)?"/g, `$1?v=${v}"`);
fix('public/js/api.js', /export const APP_VERSION = \d+;/, `export const APP_VERSION = ${v};`);   // v38: verzi posílá api.js serveru
console.log('verze', v);
