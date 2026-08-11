const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('R3 WP2B installs MapLibre and keeps the real-terrain host isolated from the stable SVG map', () => {
  assert.match(pkg.dependencies['maplibre-gl'], /^\^6\./);
  assert.match(host, /from 'maplibre-gl'/);
  assert.match(app, /import \{ MapView \} from '\.\/components\/MapView'/);
  assert.match(app, /import \{ TerrainMapPrototype \} from '\.\/components\/TerrainMapPrototype'/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\('terrain'\) === '1'/);
  assert.match(app, /terrainPrototypeRequested && !terrainPrototypeFailed \? <TerrainMapPrototype/);
  assert.match(app, /: <MapView/);
});

test('R3 WP2B prototype uses continuous raster-dem terrain and never raises political polygons', () => {
  assert.match(host, /type: 'raster-dem'/);
  assert.match(host, /terrain:[\s\S]*source: 'r3-wp2b-dem'/);
  assert.match(host, /exaggeration: R3_TERRAIN_MANIFEST\.initialExaggeration/);
  assert.match(host, /campaign-territories-fill/);
  assert.match(host, /campaign-territories-line/);
  assert.doesNotMatch(host, /fill-extrusion|territory-depth-shell/);
});

test('R3 WP2B prototype reuses authoritative WGS84 campaign geometry and state callbacks', () => {
  assert.match(host, /import activeGeojson from '\.\.\/assets\/vertical-slice-map\.json'/);
  assert.match(host, /buildTerrainPoliticalGeoJSON\(terrainGeoJSON, state\)/);
  assert.match(host, /selectRef\.current\(territoryId\)/);
  assert.match(app, /onSelect=\{openTerritoryOnMap\}/);
});

test('R3 WP2B clearly separates temporary plumbing sources from the production Copernicus direction', () => {
  assert.match(host, /demotiles\.maplibre\.org\/terrain-tiles\/tiles\.json/);
  assert.match(host, /tile\.openstreetmap\.org/);
  assert.match(host, /production elevation direction: Copernicus DEM/);
  assert.doesNotMatch(host, /client_secret|clientSecret|access_token|accessToken/i);
});

test('R3 WP2B renderer failure collapses to SVG and reduced motion collapses camera transitions', () => {
  assert.match(host, /onFallback: \(reason: string\) => void/);
  assert.match(host, /fallbackRef\.current\('WebGL2 terrain rendering is unavailable/);
  assert.match(app, /setTerrainPrototypeFailed\(true\)/);
  assert.match(host, /prefers-reduced-motion: reduce/);
  assert.match(host, /duration: window\.matchMedia[\s\S]*\? 0 : 850/);
});

test('R3 WP2B terrain CSS loads before the final responsive command contract', () => {
  const terrainCss = main.indexOf("import './r3-terrain-prototype.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(terrainCss >= 0 && responsive > terrainCss);
});
