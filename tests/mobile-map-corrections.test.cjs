const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FULL_THEATRE_VIEW,
  MAP_WIDTH,
  MAX_ZOOM_PERCENT,
  MIN_VIEW_WIDTH,
  mapZoomPercent,
  zoomMapView
} = require('../.test-dist/map-viewport.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the European map supports a 5000 percent tactical zoom', () => {
  assert.equal(MAX_ZOOM_PERCENT, 5000);
  assert.equal(MIN_VIEW_WIDTH, MAP_WIDTH / 50);
  const maximum = zoomMapView(FULL_THEATRE_VIEW, 100, { x: MAP_WIDTH / 2, y: 450 });
  assert.equal(maximum.width, MIN_VIEW_WIDTH);
  assert.equal(mapZoomPercent(maximum), 5000);
});

test('the mobile layer menu opens below its control inside the map', () => {
  const main = read('src/main.tsx');
  const css = read('src/mobile-map-corrections.css');

  assert.ok(main.indexOf("./mobile-map-corrections.css") > main.indexOf("./map-interface-refinements.css"));
  assert.match(css, /@media \(max-width: 540px\)/);
  assert.match(css, /\.map-layer-options\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /top:\s*calc\(100% \+ 7px\)/);
  assert.match(css, /bottom:\s*auto/);
  assert.match(css, /\.map-layer-control\[open\][^{]*\{[^}]*z-index:\s*12/s);
});
