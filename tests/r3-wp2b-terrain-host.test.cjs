const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('R3 WP2B installs MapLibre behind one lazy boundary while preserving the stable SVG map', () => {
  assert.match(pkg.dependencies['maplibre-gl'], /^\^6\./);
  assert.match(app, /const TerrainMapPrototype = lazy\(\(\) => import\('\.\/components\/TerrainMapPrototype'\)/);
  assert.match(app, /import \{ MapView \} from '\.\/components\/MapView'/);
  assert.doesNotMatch(app, /import \{ TerrainMapPrototype \} from '\.\/components\/TerrainMapPrototype'/);
  assert.match(host, /export \{ TerrainMapPrototypeImpl as TerrainMapPrototype \} from '\.\/TerrainMapPrototypeImpl'/);
  assert.doesNotMatch(host, /lazy\(|Suspense|from 'maplibre-gl'/);
  assert.match(impl, /from 'maplibre-gl'/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\('terrain'\) === '1'/);
  assert.match(app, /terrainPrototypeRequested && !terrainPrototypeFailed \? <Suspense/);
  assert.match(app, /<TerrainMapPrototype/);
  assert.match(app, /: <MapView/);
});

test('R3 WP2B prototype uses continuous raster-dem terrain and never raises political polygons', () => {
  assert.match(impl, /r3-wp2b-dem/);
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

test('R3 WP2B runtime uses generated Copernicus terrain and no external terrain or consumer-map service', () => {
  assert.match(impl, /generatedTerrainManifestUrl\(import\.meta\.env\.BASE_URL\)/);
  assert.match(impl, /generatedRasterDemSource\(manifest, import\.meta\.env\.BASE_URL\)/);
  assert.match(impl, /Copernicus GLO-30 static terrain/);
  assert.doesNotMatch(impl, /demotiles\.maplibre\.org|tile\.openstreetmap\.org|google\.com\/maps|earth\.google/i);
  assert.doesNotMatch(impl, /client_secret|clientSecret|access_token|accessToken/i);
  assert.match(impl, /Generated Copernicus terrain is unavailable; using the stable SVG command map/);
});

test('R3 WP2B stylises real relief rather than depending on a consumer web-map surface', () => {
  assert.match(impl, /type: 'color-relief'/);
  assert.match(impl, /'color-relief-color'/);
  assert.match(impl, /type: 'hillshade'/);
  assert.match(impl, /r3-wp2b-land-wash/);
  assert.match(impl, /r3-wp2b-coastline/);
  assert.doesNotMatch(impl, /OpenStreetMap contributors/);
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
