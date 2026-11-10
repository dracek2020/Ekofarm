// Kontrola, že každý import v public/js opravdu existuje v cílovém souboru
// (chybějící export = hra se v prohlížeči vůbec nenačte).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../public/js/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.js'));
const src = Object.fromEntries(files.map(f => [f, readFileSync(new URL(f, dir), 'utf8')]));
const exportsOf = f => new Set([...src[f].matchAll(/^export\s+(?:const|let|function|class|async function)\s+([\w$]+)/gm)].map(m => m[1]));

test('všechny importy mezi soubory existují', () => {
  for (const f of files) {
    for (const m of src[f].matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+\.js)(?:\?v=\d+)?'/g)) {
      const target = m[2];
      assert.ok(src[target], `${f}: soubor ${target} neexistuje`);
      const ex = exportsOf(target);
      for (const name of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
        assert.ok(ex.has(name), `${f} importuje ${name}, ale ${target} ho neexportuje`);
      }
    }
  }
});

test('všechny soubory mají stejnou verzi v adresách', () => {
  const vs = new Set();
  for (const f of files) for (const m of src[f].matchAll(/from '\.\/[\w-]+\.js\?v=(\d+)'/g)) vs.add(m[1]);
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const m of html.matchAll(/\?v=(\d+)/g)) vs.add(m[1]);
  assert.equal(vs.size, 1, 'různé verze: ' + [...vs].join(', '));
});
