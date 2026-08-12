const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = fs.readFileSync('src/presentation/r3-terrain-config.ts', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const impl = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');

test('R3 WP2D expands the continuous real-terrain envelope to the mature Europe theatre', () => {
  assert.match(config, /R3_TERRAIN_EUROPE_BOUNDS = \[-25\.0, 33\.0, 50\.0, 72\.0\]/);
  assert.match(config, /R3_TERRAIN_PROTOTYPE_BOUNDS = R3_TERRAIN_EUROPE_BOUNDS/);
  assert.match(config, /theatreBounds: R3_TERRAIN_EUROPE_BOUNDS/);
});

test('R3 WP2B keeps authenticated terrain acquisition out of the browser runtime', () => {
  assert.match(config, /runtimeDelivery: 'preprocessed-static-assets'/);
  assert.match(config, /requiresBrowserSecret: false/);
  assert.doesNotMatch(config, /api[_-]?key/i);
  assert.doesNotMatch(config, /access[_-]?token/i);
});

test('R3 WP2B treats the real-terrain renderer as progressive enhancement', () => {
  assert.match(config, /chooseCampaignMapRenderer/);
  assert.match(config, /'svg-fallback'/);
  assert.match(host, /lazy\(\(\) => import\('\.\/TerrainMapPrototypeImpl'\)\)/);
  assert.match(host, /if \(profile === 'svg-fallback'\)/);
  assert.match(host, /onFallback\(fallbackReason/);
});

test('R3 WP2B-D gives smaller and touch displays a deliberate reduced-pressure path', () => {
  assert.match(config, /chooseTerrainPresentationProfile/);
  assert.match(config, /coarsePointer && width > 0 && width <= 420/);
  assert.match(config, /coarsePointer \|\| \(width > 0 && width <= 900\)/);
  assert.match(config, /return 'compact'/);
  assert.match(config, /return 'svg-fallback'/);
});

test('R3 WP2B-D compact terrain reduces camera and relief pressure without changing geography', () => {
  assert.match(config, /zoom: Math\.max\(3\.2, preset\.zoom - 0\.15\)/);
  assert.match(config, /pitch: Math\.min\(preset\.pitch, 42\)/);
  assert.match(config, /profile === 'compact' \? 1\.6/);
  assert.match(impl, /hillshade-exaggeration': compact \? 0\.48 : 0\.72/);
  assert.match(impl, /canvasContextAttributes: \{ antialias: presentationProfile === 'full' \}/);
});

test('R3 WP2D camera presets preserve a wide theatre and more dramatic campaign/selected views', () => {
  assert.match(config, /id: 'theatre', center: \[12\.0, 56\.0\], zoom: 3\.45, pitch: 28, bearing: -3/);
  assert.match(config, /id: 'campaign', center: \[5\.3, 49\.2\], zoom: 5\.35, pitch: 51, bearing: -9/);
  assert.match(config, /id: 'selected', center: \[5\.3, 49\.2\], zoom: 7\.1, pitch: 57, bearing: -8/);
});

test('R3 WP2B normalises authoritative WGS84 points without inventing gameplay geography', () => {
  assert.match(config, /normaliseLngLat/);
  assert.match(config, /Math\.max\(-180, Math\.min\(180, lng\)\)/);
  assert.match(config, /Math\.max\(-85\.051129, Math\.min\(85\.051129, lat\)\)/);
});

test('R3 WP2B installs MapLibre behind one lazy boundary while preserving the stable SVG map', () => {
  assert.match(host, /TerrainMapPrototypeImpl/);
  assert.match(host, /Terrain prototype failed/);
  assert.match(app, /terrainPrototypeRequested/);
  assert.match(app, /MapView/);
});

test('R3 WP2B prototype uses continuous raster-dem terrain and never raises political polygons', () => {
  assert.match(impl, /type: 'raster-dem'/);
  assert.match(impl, /terrain:/);
  assert.match(impl, /campaign-territories-fill/);
  assert.doesNotMatch(impl, /fill-extrusion/);
});

test('R3 WP2B prototype reuses authoritative WGS84 campaign geometry and state callbacks', () => {
  assert.match(impl, /activeGeojson/);
  assert.match(impl, /buildTerrainPoliticalGeoJSON/);
  assert.match(impl, /selectRef\.current\(territoryId\)/);
});

test('R3 WP2B runtime uses generated Copernicus terrain and no external terrain or consumer-map service', () => {
  assert.match(impl, /generatedTerrainManifestUrl/);
  assert.match(impl, /generatedRasterDemSource/);
  assert.doesNotMatch(impl, /demotiles\.maplibre/i);
  assert.doesNotMatch(impl, /openstreetmap|tile\.openstreetmap/i);
  assert.doesNotMatch(impl, /google/i);
});

test('R3 WP2B stylises real relief rather than depending on a consumer web-map surface', () => {
  assert.match(impl, /type: 'color-relief'/);
  assert.match(impl, /type: 'hillshade'/);
  assert.match(impl, /r3-wp2b-land-wash/);
  assert.match(impl, /r3-wp2b-coastline/);
});

test('R3 WP2B-C keeps ownership borders fronts and operational state as separate terrain overlays', () => {
  assert.match(impl, /campaign-territories-fill/);
  assert.match(impl, /campaign-administrative-borders/);
  assert.match(impl, /campaign-control-borders/);
  assert.match(impl, /campaign-fronts-core/);
  assert.match(impl, /campaign-territory-state-wash/);
  assert.match(impl, /campaign-state-outline/);
});

test('R3 WP2B-C reuses the existing visible threat and front derivation rather than hidden enemy state', () => {
  assert.match(impl, /getThreatenedTerritories\(state\)/);
  assert.match(impl, /deriveR3FrontSegments\(state\.territories, TERRITORIES\)/);
  assert.doesNotMatch(impl, /state\.enemyFormations/);
});

test('R3 WP2B-C projects authoritative strategic routes and nodes without creating new topology', () => {
  assert.match(impl, /STRATEGIC_NODES/);
  assert.match(impl, /STRATEGIC_ROUTES/);
  assert.match(impl, /buildTerrainStrategicRouteGeoJSON/);
  assert.match(impl, /buildTerrainStrategicNodeGeoJSON/);
});

test('R3 WP2B-C keeps contextual territory navigation on the authoritative selection callback', () => {
  assert.match(impl, /map\.on\('click', 'campaign-territories-fill'/);
  assert.match(impl, /selectRef\.current\(territoryId\)/);
});

test('R3 WP2B-D gives compact displays real reduced-pressure terrain rather than CSS-only signalling', () => {
  assert.match(impl, /presentationProfile = 'full'/);
  assert.match(impl, /terrainExaggerationForProfile\(presentationProfile\)/);
  assert.match(impl, /presentationProfile === 'compact' \? 52 : 70/);
  assert.match(impl, /presentationProfile === 'compact' \? 'compact terrain' : 'continuous relief'/);
});

test('R3 WP2B-D adapts compact/full terrain when the viewport changes', () => {
  assert.match(host, /window\.addEventListener\('resize', updateEnvironment\)/);
  assert.match(host, /setEnvironmentVersion/);
  assert.match(host, /key=\{profile\}/);
});

test('R3 WP2B-D keeps a deliberate SVG path for very small touch displays and manual accessibility choice', () => {
  assert.match(host, /2D accessible map/);
  assert.match(host, /r3-terrain-use-svg/);
  assert.match(css, /\.r3-terrain-use-svg/);
  assert.match(css, /focus-visible/);
});

test('R3 WP2B-D restores selected-camera parity using the selected territory WGS84 centre', () => {
  assert.match(impl, /function territoryCentre\(territoryId: string \| null\)/);
  assert.match(impl, /const selectedCentre = useMemo\(\(\) => territoryCentre\(state\.selectedTerritory\)/);
  assert.match(impl, /preset\.id === 'selected' && selectedCentre \? selectedCentre : profiled\.center/);
  assert.match(impl, /disabled=\{preset\.id === 'selected' && !state\.selectedTerritory\}/);
});

test('R3 WP2B-D exposes keyboard help and keeps MapLibre keyboard navigation enabled', () => {
  assert.match(impl, /keyboard: true/);
  assert.match(impl, /tabIndex=\{0\}/);
  assert.match(impl, /aria-describedby="r3-terrain-keyboard-help"/);
  assert.match(impl, /Use arrow keys to pan and plus or minus to zoom/);
  assert.match(css, /\.r3-terrain-sr-only/);
});

test('R3 terrain renderer keeps genuine failures on the SVG fallback path and reduced motion collapses camera transitions', () => {
  assert.match(impl, /onFallback: \(reason: string\) => void/);
  assert.match(impl, /fallbackRef\.current\('WebGL terrain rendering is unavailable/);
  assert.match(impl, /fallbackRef\.current\(`Terrain renderer error: \$\{runtimeError\.detail\}`\)/);
  assert.match(impl, /runtimeError\.kind === 'transient-tile-request'/);
  assert.match(app, /setTerrainPrototypeFailed\(true\)/);
  assert.match(impl, /prefers-reduced-motion: reduce/);
  assert.match(impl, /duration: window\.matchMedia[\s\S]*\? 0 : 850/);
});

test('R3 WP2B terrain CSS loads before the final responsive command contract', () => {
  const terrainCss = main.indexOf("import './r3-terrain-prototype.css'");
  const responsive = main.indexOf("import './responsive-command-fit.css'");
  assert.ok(terrainCss >= 0 && responsive > terrainCss);
});
