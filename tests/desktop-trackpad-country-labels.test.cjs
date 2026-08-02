const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('desktop trackpad pinch blocks browser page zoom only over the command map', () => {
  const guard = read('src/map-trackpad-guard.ts');
  const main = read('src/main.tsx');

  assert.match(guard, /const MAP_SELECTOR = '\.europe-map-frame'/);
  assert.match(guard, /if \(!event\.ctrlKey\) return/);
  assert.match(guard, /target\.closest\(MAP_SELECTOR\)/);
  assert.match(guard, /event\.preventDefault\(\)/);
  assert.match(guard, /addEventListener\('wheel', handleWheel, \{ capture: true, passive: false \}\)/);
  assert.match(main, /import \{ installMapTrackpadGuard \} from '\.\/map-trackpad-guard'/);
  assert.match(main, /installMapTrackpadGuard\(\)/);
});

test('country labels use a larger strategic style distinct from campaign centres', () => {
  const hierarchy = read('src/map-label-hierarchy.css');
  const europe = read('src/europe-map.css');
  const main = read('src/main.tsx');

  assert.match(hierarchy, /country-name-label[\s\S]*fill:\s*#70d7d0/);
  assert.match(hierarchy, /country-name-label[\s\S]*font:\s*700 18px Barlow Condensed/);
  assert.match(hierarchy, /country-name-label[\s\S]*text-transform:\s*uppercase/);
  assert.match(hierarchy, /country-name-label\.compact[\s\S]*font-size:\s*14px/);
  assert.match(hierarchy, /max-width:\s*540px[\s\S]*country-name-label[\s\S]*font-size:\s*19px/);
  assert.match(europe, /territory-centre-label[\s\S]*font-size:\s*12px/);
  assert.ok(main.indexOf("./map-label-hierarchy.css") > main.indexOf("./mobile-map-corrections.css"));
});
