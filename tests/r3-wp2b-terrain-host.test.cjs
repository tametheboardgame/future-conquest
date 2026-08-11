const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('R3 WP2B installs MapLibre and keeps the real-terrain host isolated from the stable SVG map', () => {
  assert.match(pkg.dependencies['maplibre-gl'], /^\^6\./);
  assert.doesNotMatch(host, /from 'maplibre-gl'/);
  assert.match(host, /lazy\(\(\) => import\('\.\/TerrainMapPrototypeImpl'\)/);
  assert.match(impl, /from 'maplibre-gl'/);
  assert.match(app, /import \{ MapView \} from '\.\/components\/MapView'/);
  assert.match(app, /import \{ TerrainMapPrototype \} from '\.\/components\/TerrainMapPrototype'/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\('terrain'\) === '1'/);
  assert.match(app, /terrainPrototypeRequested && !terrainPrototypeFailed \? <TerrainMapPrototype/);
  assert.match(app, /: <MapView/);
});

test('R3 WP2B prototype uses continuous raster-dem terrain and never raises political polygons', () => {
  assert.match(impl, /type: 'raster-dem'/);
  assert.match(impl, /terrain:[\s\S]*source: 'r3-wp2b-dem'/);
  assert.match(impl, /exaggeration: R3_TERRAIN_MANIFEST\.initialExaggeration/);
  assert.match(impl, /campaign-territories-fill/);
  assert.match(impl, /campaign-territories-line/);
  assert.doesNotMatch(impl, /fill-extrusion|territory-depth-shell/);
});

test('R3 WP2B prototype reuses authoritative WGS84 campaign geometry and state callbacks', () => {
  assert.match(impl, /import activeGeojson from '\.\.\/assets\/vertical-slice-map\.json'/);
  assert.match(impl, /buildTerrainPoliticalGeoJSON\(terrainGeoJSON, state\)/);
  assert.match(impl, /selectRef\.current\(territoryId\)/);
  assert.match(app, /onSelect=\{openTerritoryOnMap\}/);
});

test('R3 WP2B clearly separates temporary plumbing sources from the production Copernicus direction', () => {
  assert.match(impl, /demotiles\.maplibre\.org\/terrain-tiles\/tiles\.json/);
  assert.match(impl, /tile\.openstreetmap\.org/);
  assert.match(impl, /production elevation direction: Copernicus DEM/);
  assert.doesNotMatch(impl, /client_secret|clientSecret|access_token|accessToken/i);
});

test('R3 WP2B renderer failure collapses to SVG and reduced motion collapses camera transitions', () => {
  assert.match(impl, /onFallback: \(reason: string\) => void/);
  assert.match(impl, /fallbackRef\.current\('WebGL2 terrain rendering is unavailable/);
  assert.match(app, /setTerrainPrototypeFailed\(true\)/);
  assert.match(impl, /prefers-reduced-motion: reduce/);
  assert.match(impl, /duration: window\.matchMedia[\s\S]*\? 0 : 850/);
});

test('R3 WP2B terrain CSS loads before the final responsive command contract', () => {
  const terrainCss = main.indexOf("import './r3-terrain-prototype.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(terrainCss >= 0 && responsive > terrainCss);
});
