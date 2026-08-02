const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FULL_THEATRE_VIEW,
  MAP_WIDTH,
  MIN_VIEW_WIDTH,
  focusMapView,
  mapZoomPercent,
  zoomMapView
} = require('../.test-dist/map-viewport.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the European map can zoom to 1000 percent without losing its anchor', () => {
  const anchor = { x: MAP_WIDTH / 2, y: 450 };
  const maximum = zoomMapView(FULL_THEATRE_VIEW, 100, anchor);

  assert.equal(MIN_VIEW_WIDTH, 144);
  assert.equal(maximum.width, MIN_VIEW_WIDTH);
  assert.equal(mapZoomPercent(maximum), 1000);
  assert.equal(maximum.x + maximum.width / 2, anchor.x);
});

test('selected focus opens at tactical scale and deep zoom has its own status', () => {
  const focused = focusMapView({ x: 720, y: 450 }, 7);
  const source = read('src/components/MapView.tsx');

  assert.equal(mapZoomPercent(focused), 700);
  assert.match(source, /focusMapView\(\{ x: selectedAnchor\[0\], y: selectedAnchor\[1\] \}, 7\)/);
  assert.match(source, /if \(zoomPercent <= 600\) return 'Local operations view'/);
  assert.match(source, /return 'Tactical detail view'/);
});
