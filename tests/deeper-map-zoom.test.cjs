const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FULL_THEATRE_VIEW,
  MAP_WIDTH,
  MAX_ZOOM_PERCENT,
  MIN_VIEW_WIDTH,
  focusMapView,
  mapZoomPercent,
  zoomMapView
} = require('../.test-dist/map-viewport.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the European map can zoom to 5000 percent without losing its anchor', () => {
  const anchor = { x: MAP_WIDTH / 2, y: 450 };
  const maximum = zoomMapView(FULL_THEATRE_VIEW, 100, anchor);

  assert.equal(MAX_ZOOM_PERCENT, 5000);
  assert.equal(MIN_VIEW_WIDTH, MAP_WIDTH / 50);
  assert.equal(maximum.width, MIN_VIEW_WIDTH);
  assert.equal(mapZoomPercent(maximum), 5000);
  assert.equal(maximum.x + maximum.width / 2, anchor.x);
});

test('selected focus opens at a useful tactical scale below the manual ceiling', () => {
  const focused = focusMapView({ x: 720, y: 450 }, 25);
  const source = read('src/components/MapView.tsx');

  assert.equal(mapZoomPercent(focused), 2500);
  assert.match(source, /focusMapView\(\{ x: selectedAnchor\[0\], y: selectedAnchor\[1\] \}, 25\)/);
  assert.match(source, /if \(zoomPercent <= 600\) return 'Local operations view'/);
  assert.match(source, /return 'Tactical detail view'/);
});
