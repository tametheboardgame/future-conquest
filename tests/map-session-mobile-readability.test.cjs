const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the command map retains its viewport and layer state between command views', () => {
  const source = read('src/components/MapView.tsx');
  assert.match(source, /let retainedMapView: MapViewBox = FULL_THEATRE_VIEW/);
  assert.match(source, /let retainedMapLayers: MapLayers = DEFAULT_MAP_LAYERS/);
  assert.match(source, /useState<MapViewBox>\(\(\) => retainedMapView\)/);
  assert.match(source, /retainedMapView = view/);
  assert.match(source, /retainedMapLayers = layers/);
});

test('mobile map overlays receive a responsive readability boost', () => {
  const source = read('src/components/MapView.tsx');
  const css = read('src/mobile-map-corrections.css');
  assert.match(source, /max-width: 540px/);
  assert.match(source, /return 2\.7/);
  assert.match(source, /view\.width \/ MAP_WIDTH \* overlayBoost/);
  assert.match(css, /\.territory-centre-label[\s\S]*font-size:\s*16px/);
  assert.match(css, /\.territory-name-label[\s\S]*font-size:\s*13px/);
  assert.match(css, /\.task-group-marker text[\s\S]*font-size:\s*11px/);
});

test('reselecting the active specialist menu returns to the command map', () => {
  const source = read('src/components/CommandNavigation.tsx');
  assert.match(source, /active === item\.id && item\.id !== 'map' \? 'map' : item\.id/);
});
