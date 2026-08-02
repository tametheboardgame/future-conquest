const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FULL_THEATRE_VIEW,
  MAP_HEIGHT,
  MAP_WIDTH,
  MIN_VIEW_WIDTH,
  clampMapView,
  fitMapBounds,
  focusMapView,
  mapZoomPercent,
  panMapView,
  screenPointToMap,
  zoomMapView
} = require('../.test-dist/map-viewport.js');
const { SLICE_IDS } = require('../.test-dist/data.js');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the European theatre opens at the complete map extent', () => {
  assert.deepEqual(FULL_THEATRE_VIEW, { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  assert.equal(mapZoomPercent(FULL_THEATRE_VIEW), 100);
});

test('zooming keeps the cursor anchor fixed and respects the maximum zoom', () => {
  const anchor = { x: 720, y: 450 };
  const zoomed = zoomMapView(FULL_THEATRE_VIEW, 2, anchor);
  assert.equal(zoomed.width, MAP_WIDTH / 2);
  assert.equal(zoomed.height, MAP_HEIGHT / 2);
  assert.equal(zoomed.x + zoomed.width / 2, anchor.x);
  assert.equal(zoomed.y + zoomed.height / 2, anchor.y);

  const maximum = zoomMapView(zoomed, 100, anchor);
  assert.equal(maximum.width, MIN_VIEW_WIDTH);
});

test('panning and focus views cannot move the theatre completely off-screen', () => {
  const focused = focusMapView({ x: 50, y: 50 }, 4);
  assert.equal(focused.x, 0);
  assert.equal(focused.y, 0);

  const beyond = panMapView(focused, 99999, 99999);
  assert.equal(beyond.x, MAP_WIDTH - beyond.width);
  assert.equal(beyond.y, MAP_HEIGHT - beyond.height);

  const clamped = clampMapView({ x: -200, y: -200, width: MAP_WIDTH * 2, height: MAP_HEIGHT * 2 });
  assert.deepEqual(clamped, FULL_THEATRE_VIEW);
});

test('campaign bounds and screen coordinates produce stable viewport values', () => {
  const campaign = fitMapBounds([[400, 250], [750, 610]], 40);
  assert.ok(campaign.width < MAP_WIDTH);
  assert.equal(campaign.width / campaign.height, MAP_WIDTH / MAP_HEIGHT);

  const point = screenPointToMap(500, 300, { left: 100, top: 100, width: 800, height: 400 }, campaign);
  assert.equal(point.x, campaign.x + campaign.width / 2);
  assert.equal(point.y, campaign.y + campaign.height / 2);
});

test('the map renderer uses full-Europe geometry and complete viewport controls', () => {
  const source = read('src/components/MapView.tsx');
  assert.match(source, /world-atlas\/countries-110m\.json/);
  assert.match(source, /topojson-client/);
  assert.match(source, /future-theatre/);
  assert.match(source, /onWheel=\{handleWheel\}/);
  assert.match(source, /onPointerDown=\{handlePointerDown\}/);
  assert.match(source, /pinchGesture/);
  assert.match(source, />Europe<\/button>/);
  assert.match(source, />Campaign<\/button>/);
  assert.match(source, />Selected<\/button>/);
  assert.match(source, /Drag · wheel\/pinch/);
});

test('the active campaign remains the original fifteen territories for save compatibility', () => {
  assert.equal(SLICE_IDS.length, 15);
  assert.ok(SLICE_IDS.includes('FR-02'));
  assert.ok(SLICE_IDS.includes('AT-01'));
  const source = read('src/components/MapView.tsx');
  assert.match(source, /SLICE_IDS\.includes/);
  assert.match(source, /if \(!territory\) return null/);
});

test('European map styles load after the existing interface and support mobile touch use', () => {
  const main = read('src/main.tsx');
  assert.ok(main.indexOf("./europe-map.css") > main.indexOf("./save-load.css"));

  const css = read('src/europe-map.css');
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /\.workspace\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /\.command-panel\s*\{\s*max-height:\s*none/s);
});

test('map overlays retain a stable screen size and reveal detail as the player zooms in', () => {
  const source = read('src/components/MapView.tsx');
  const css = read('src/europe-map.css');

  assert.match(source, /const overlayScale = view\.width \/ MAP_WIDTH/);
  assert.match(source, /layers\.countries && <g className="future-theatre-labels"/);
  assert.match(source, /country-name-label/);
  assert.match(source, /showTerritoryLabels = zoomPercent >= 135/);
  assert.match(source, /showTerritoryNames = zoomPercent >= 285/);
  assert.match(source, /scale\(\$\{overlayScale\}\)/);
  assert.match(source, /24 \* overlayScale/);
  assert.match(source, /const offset = .* \* 4 \* overlayScale/);
  assert.match(source, /territory-name-label/);
  assert.match(source, /territory-hit-target/);
  assert.match(css, /\.europe-map \.map-label\s*\{\s*pointer-events:\s*none/s);
  assert.match(css, /\.europe-map \.territory-hit-target/);
  assert.match(css, /vector-effect:\s*non-scaling-stroke/);
});