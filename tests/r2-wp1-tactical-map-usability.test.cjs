const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  FULL_THEATRE_VIEW,
  MAP_WIDTH,
  MAX_ZOOM_PERCENT,
  MIN_VIEW_WIDTH,
  mapZoomPercent,
  zoomMapView
} = require('../.test-dist/map-viewport.js');

const mapView = fs.readFileSync('src/components/MapView.tsx', 'utf8');
const css = fs.readFileSync('src/r2-tactical-map.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');

const importIndex = path => main.indexOf(`import '${path}';`);

test('R2-WP1 provides a genuine 5000 percent tactical zoom ceiling', () => {
  assert.equal(MAX_ZOOM_PERCENT, 5000);
  assert.equal(MIN_VIEW_WIDTH, MAP_WIDTH / 50);
  const maximum = zoomMapView(FULL_THEATRE_VIEW, 1000, { x: MAP_WIDTH / 2, y: 450 });
  assert.equal(mapZoomPercent(maximum), 5000);
});

test('R2-WP1 Selected focus opens a useful tactical view below the manual ceiling', () => {
  assert.match(mapView, /focusMapView\(\{ x: selectedAnchor\[0\], y: selectedAnchor\[1\] \}, 25\)/);
});

test('R2-WP1 separates geographic route anchors from display anchors', () => {
  assert.match(mapView, /const geographicAnchors = projectTerritoryAnchors/);
  assert.match(mapView, /const displayAnchors = projectTerritoryAnchors/);
  assert.match(mapView, /geographicAnchors\[originId\]/);
  assert.match(mapView, /geographicAnchors\[operation\.target\]/);
  assert.match(mapView, /const anchor = displayAnchors\[territoryId\]/);
  assert.match(mapView, /const anchor = displayAnchors\[contact\.territoryId\]/);
  assert.doesNotMatch(mapView, /\banchors\[/, 'retired unspecialised anchor table must not survive the split');
});

test('R2-WP1 explicitly corrects the crowded Belgian display anchors', () => {
  assert.match(mapView, /'BE-01': \[4\.45, 51\.05\]/);
  assert.match(mapView, /'BE-02': \[4\.95, 50\.35\]/);
  assert.match(mapView, /Brussels is geographically close to the Wallonia boundary/);
});

test('R2-WP1 makes own-force counters large enough to read and spaces stacks widely', () => {
  assert.match(mapView, /const columns = territoryGroups\.length <= 4 \? Math\.min\(2, territoryGroups\.length\) : 3/);
  assert.match(mapView, /\* 72 \* overlayScale/);
  assert.match(mapView, /\* 58\) \* overlayScale/);
  assert.match(mapView, /className="marker-body" x="-30" y="-22" width="60" height="44"/);
  assert.match(mapView, /className="marker-selection-halo"/);
  assert.match(mapView, />TG \{group\.id\.replace\('TG-', ''\)\}<\/text>/);
  assert.match(css, /\.marker-strength[\s\S]*?font-size: 14px/);
  assert.match(css, /\.marker-status[\s\S]*?font-size: 10px/);
});

test('R2-WP1 makes the selected formation visually unmistakable', () => {
  assert.match(css, /\.task-group-marker\.selected[\s\S]*?drop-shadow\(0 0 11px/);
  assert.match(css, /\.marker-selection-halo[\s\S]*?stroke: #ffffff/);
  assert.match(css, /stroke-dasharray: 7 3/);
});

test('R2-WP1 enlarges enemy and threat information at tactical laptop scale', () => {
  assert.match(mapView, /M0 -21 L20 15 L-20 15 Z/);
  assert.match(mapView, /<circle cx="0" cy="0" r="20" \/>/);
  assert.match(css, /\.contact-strength[\s\S]*?font-size: 12px/);
  assert.match(css, /\.threat-timing[\s\S]*?font-size: 10px/);
});

test('R2-WP1 styles load after WP10 readability while preserving WP9 shell last', () => {
  const wp10 = importIndex('./map-readability.css');
  const r2 = importIndex('./r2-tactical-map.css');
  const wp9 = importIndex('./responsive-command-fit.css');
  assert.ok(wp10 >= 0 && r2 > wp10);
  assert.ok(wp9 > r2);
});
