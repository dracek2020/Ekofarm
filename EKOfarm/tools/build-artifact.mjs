// Sestaví testovací verzi do jednoho souboru: build/ekofarm-artifact.html
// (lokální režim bez serveru, farma se ukládá do prohlížeče).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(join(ROOT, p), 'utf8');

function stripModule(src) {
  return src
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^export\s+(?=(const|let|function|class|async)\b)/gm, '');
}

import { readdirSync } from 'node:fs';
const ORDER = ['public/js/assets.js', 'public/js/rules.js', 'public/js/news.js', 'public/js/icons.js', 'public/js/sfx.js', 'public/js/render.js', 'public/js/sprites.js', 'public/js/objects.js', 'public/js/panels.js', 'public/js/api.js', 'public/js/main.js'];
for (const f of readdirSync(join(ROOT, 'public/js'))) if (!ORDER.includes('public/js/' + f)) throw new Error('Soubor chybí v sestavení testovací verze: ' + f);
const js = ['public/js/assets.js', 'public/js/rules.js', 'public/js/news.js', 'public/js/icons.js', 'public/js/sfx.js', 'public/js/render.js', 'public/js/sprites.js', 'public/js/objects.js', 'public/js/panels.js', 'public/js/api.js', 'public/js/main.js']
  .map(p => `// ---- ${p} ----\n` + stripModule(read(p))).join('\n');
if (/^\s*(import|export)\s/m.test(js)) throw new Error('Zůstal import/export – uprav build.');
const seen = {};
for (const m of js.matchAll(/^(?:const|let|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm)) {
  if (seen[m[1]]) throw new Error('Stejné jméno ve dvou souborech: ' + m[1]);
  seen[m[1]] = true;
}

// obrázky budov vložit přímo do souboru (testovací verze nemá vlastní server)
import { ASSETS } from '../public/js/assets.js';
const SPRITE_FILES = Object.entries(ASSETS).flatMap(([k, list]) => list.map(n => `img/${k}/${n}.webp`));
const sprites = 'const SPRITE_DATA = {\n' + SPRITE_FILES.filter(p => existsSync(join(ROOT, 'public', p)))
  .map(p => `  '${p}': 'data:image/webp;base64,${readFileSync(join(ROOT, 'public', p)).toString('base64')}',`).join('\n') + '\n};';
const html = read('public/index.html');
const body = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<script type="module"'));
const out = `<meta charset="utf-8">
<title>EKOfarm – test</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
${read('public/css/style.css')}
</style>
${body}
<script>
window.EKO_LOCAL = true;
${sprites}
(function () {
${js}
})();
</script>
`;
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/ekofarm-artifact.html'), out);
console.log('build/ekofarm-artifact.html', (out.length / 1024).toFixed(1), 'kB');
