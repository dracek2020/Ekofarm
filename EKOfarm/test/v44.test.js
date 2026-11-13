// v44: dovednosti rostou mnohem pomaleji – XP za kus podle náročnosti práce, tým čtvrtinou, křivka K × (L − 1)², přepočet dosavadních.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newFarm, normalize, applyAction, START_PLOTS, CROPS, SKILL_XP, SKILL_K, SKILL_FISH, skillLevel, unitSkill, RECIPES, ANIMALS, FISH, LEVEL_XP,
} from '../public/js/rules.js';
import { TEAM } from '../public/js/team-config.js';

const T0 = 1_700_000_000_000;

test('křivka: úroveň 10 = 8 100 XP, 20 = 36 100 XP, 50 = 240 100 XP', () => {
  assert.equal(SKILL_K, 100);
  assert.equal(SKILL_XP[2], 100); assert.equal(SKILL_XP[10], 8100); assert.equal(SKILL_XP[20], 36100); assert.equal(SKILL_XP[50], 240100);
});

test('XP za kus podle náročnosti práce, ne podle ceny', () => {
  assert.equal(unitSkill('wheat'), CROPS.wheat.xp / CROPS.wheat.yield);
  assert.equal(unitSkill('mleko'), ANIMALS.krava.xp);
  assert.equal(unitSkill('chleb'), RECIPES.chleb.xp);
  assert.equal(unitSkill('s_wheat'), RECIPES.s_wheat.xp / 3, 'semena: 3 kusy z dávky');
  assert.equal(unitSkill('kapr'), FISH.kapr.xp * SKILL_FISH);
  assert.ok(unitSkill('mleko') < 10, 'drahé mléko už nedává 18 XP za kus');
});

test('ruční sklizeň počítá celé XP, za den se úroveň 20 nedá', () => {
  const f = newFarm(T0);
  for (const [x, y] of START_PLOTS) applyAction(f, { type: 'buyPlot', x, y }, T0);
  f.coins = 1e6; f.level = 20; f.xp = LEVEL_XP[20];
  // 6 polí, 24 h nepřetržitě pšenice po minutě = 8 640 sklizní (horní mez ručního hraní)
  let t = T0;
  for (let i = 0; i < 1440; i++) {
    for (const [x, y] of START_PLOTS) applyAction(f, { type: 'plant', x, y, crop: 'wheat', pay: 'coin' }, t);
    t += CROPS.wheat.time * 1000 + 1;
    for (const [x, y] of START_PLOTS) applyAction(f, { type: 'harvest', x, y }, t);
    f.silo = {};
  }
  assert.ok(f.stats.harvest >= 8640 * 2 * 0.99);
  assert.ok(skillLevel(f, 'f') < 15, `úroveň ${skillLevel(f, 'f')} za den nepřetržitého sázení`);
});

test('dosavadní hráči: dovednosti se přepočítají jednou podle statistik', () => {
  const f = newFarm(T0);
  f.stats = { ...f.stats, harvest: 4000, fruit: 300, animal: 600, fish: 50, produce: 900 };
  f.sk = { f: 50000, r: 9000, v: 40000 }; delete f.skv;   // staré tempo: Farmaření 20+
  normalize(f);
  const mix = 0.2 + 0.8 * TEAM.playerXp;
  assert.equal(f.sk.f, Math.round(mix * (0.75 * 4000 + 300 + 3 * 600)));
  assert.equal(f.sk.r, 3 * SKILL_FISH * 50);
  assert.equal(f.sk.v, Math.round(mix * 3 * 900));
  assert.ok(skillLevel(f, 'f') < 10);
  f.sk.f += 123;
  normalize(f);
  assert.equal(f.sk.f, Math.round(mix * (0.75 * 4000 + 300 + 3 * 600)) + 123, 'jen jednou');
});
