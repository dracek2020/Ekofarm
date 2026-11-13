// v51: chyba při kreslení jedné věci (v50: chybějící ikona hotové krmné směsi) schovala všechno, co se kreslí po ní –
// pole, stromy a domy vpředu zmizely, jakmile se Krmivárna dostala do obrazu (při oddalování / posouvání).
// drawScene teď chybu jedné věci zachytí, vrátí plátno na kameru, kreslí dál a nahlásí ji přes view.onError.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../public/js/rules.js';

globalThis.Image ??= class { };   // v Node není prohlížeč – obrázky „se načítají“, kreslí se náhradní tvary
const RN = await import('../public/js/render.js');
const T = 1_800_000_000_000;

function scene(trap) {
  const f = R.newFarm(T); f.tut = 99;
  for (let i = 0; i < 5; i++) f.plots.push({ id: 100 + i, x: 2 + i, y: 10, crop: null });
  let plots = 0, saves = 0;
  const errs = [];
  const ctx = new Proxy({}, {
    get: (o, k) => {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({ width: 10 });
      if (/^create(Linear|Radial)Gradient$|^createPattern$/.test(k)) return () => ({ addColorStop() {} });
      if (k === 'save') return () => saves++;
      if (k === 'restore') return () => { if (saves > 0) saves--; };
      return () => {};
    },
    set: (o, k, v) => { if (k === 'fillStyle' && v === '#8e5d33' && ++plots === trap) throw new Error('rozbitá věc'); o[k] = v; return true; },
  });
  RN.drawScene(ctx, { farm: f, now: T, t: 0, cam: { x: -96, y: 432, zoom: 0.6 }, W: 390, H: 844, dpr: 2, people: [], floats: [], onError: e => errs.push(e.message) });
  return { plots, errs, saves };
}

test('X01 chyba u jedné věci neschová zbytek farmy', () => {
  const ok = scene(0);
  assert.equal(ok.plots, 5);
  assert.deepEqual(ok.errs, []);
  const bad = scene(1);   // první pole „spadne“
  assert.equal(bad.plots, 5, 'ostatní pole se nakreslila');
  assert.deepEqual(bad.errs, ['rozbitá věc']);
  assert.equal(bad.saves, 0, 'stav plátna je vyrovnaný (save/restore)');
});

test('X02 hlášení chyby kreslení jen jednou, hra kreslí dál', () => {
  const m = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
  assert.match(m, /onError: drawError/);
  assert.match(m, /function drawError\(e\) \{\n  if \(!perf\.err && window\.showError\)/);
});
