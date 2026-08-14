const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync('src/presentation/r3-formation-movement.ts', 'utf8');
const presentation = fs.readFileSync('src/presentation/r3-formation-marker-presentation.ts', 'utf8');
const routeOverlay = fs.readFileSync('src/presentation/r3-formation-route-overlay.ts', 'utf8');
const wrapper = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const pieceCss = fs.readFileSync('src/map-label-hierarchy.css', 'utf8');
const pureStart = source.indexOf('const clamp01');
const pureEnd = source.indexOf('export function formationPresentationPath');
const pureSource = stripTypeScriptTypes(source.slice(pureStart, pureEnd).replace('export function interpolateFormationPath', 'function interpolateFormationPath'));
const context = vm.createContext({ Math, globalThis: null });
context.globalThis = context;
vm.runInContext(`${pureSource}\nglobalThis.interpolate = interpolateFormationPath;`, context);
const interpolate = (points, progress) => Array.from(context.interpolate(points, progress));

test('WP3 movement interpolation follows the complete presentation path by distance', () => {
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 0), [0, 0]);
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 0.5), [1, 0]);
  assert.deepEqual(interpolate([[0, 0], [2, 0]], 1), [2, 0]);
  assert.deepEqual(interpolate([[0, 0], [1, 0], [1, 1]], 0.25), [0.5, 0]);
  assert.deepEqual(interpolate([[0, 0], [1, 0], [1, 1]], 0.75), [1, 0.5]);
});

test('WP3 formation movement is presentation-only and route-aware', () => {
  assert.match(source, /export function formationPresentationPath/);
  assert.match(source, /group\.status !== 'moving'/);
  assert.match(source, /order\?\.type !== 'move'/);
  assert.match(source, /order\.progress \/ 100/);
  assert.match(source, /STRATEGIC_ROUTES\.find/);
  assert.match(source, /STRATEGIC_NODES\.find/);
  assert.match(source, /route\.fromTerritoryId === group\.location/);
  assert.match(source, /route\.toTerritoryId === group\.location/);
  assert.doesNotMatch(source, /group\.location\s*=/);
  assert.doesNotMatch(source, /order\.progress\s*=/);
  assert.doesNotMatch(source, /group\.order\s*=/);
});

test('WP3 reconciled movement animates presentation, including completed one-turn moves', () => {
  assert.match(presentation, /MOVEMENT_ANIMATION_MS = 520/);
  assert.match(presentation, /new WeakMap<Marker, FormationGeoPoint>/);
  assert.match(presentation, /new WeakSet<Marker>/);
  assert.match(presentation, /movingMarkers\.add\(marker\)/);
  assert.match(presentation, /const wasMoving = movingMarkers\.has\(marker\)/);
  assert.match(presentation, /setMarkerPresentationPosition\(marker, settled, animate && wasMoving\)/);
  assert.match(presentation, /requestAnimationFrame/);
  assert.match(presentation, /cancelAnimationFrame/);
  assert.match(presentation, /prefers-reduced-motion: reduce/);
  assert.match(presentation, /marker\.setLngLat/);
  assert.match(presentation, /movementProgress/);
  assert.match(presentation, /movementTarget/);
  assert.match(presentation, /movementPath/);
  assert.doesNotMatch(presentation, /group\.location\s*=/);
  assert.doesNotMatch(presentation, /group\.order\s*=/);
  assert.doesNotMatch(presentation, /element\.dataset\.r3MarkerOffsetX\s*=/);
  assert.doesNotMatch(presentation, /element\.dataset\.r3MarkerOffsetY\s*=/);
  assert.match(wrapper, /terrainOperationalTerritoryCentres,\s*false/);
  assert.match(wrapper, /terrainOperationalTerritoryCentres,\s*true/);
});

test('WP3 route overlay does not rebuild synchronously throughout camera travel', () => {
  assert.match(routeOverlay, /const scheduledFrames = new WeakMap<Map, number>/);
  assert.match(routeOverlay, /requestAnimationFrame/);
  assert.match(routeOverlay, /map\.on\('movestart'/);
  assert.match(routeOverlay, /map\.on\('moveend'/);
  assert.match(routeOverlay, /map\.isMoving\(\)/);
  assert.match(routeOverlay, /hideMovementRoutesDuringCameraTravel/);
  assert.doesNotMatch(routeOverlay, /map\.on\('move',/);
  assert.doesNotMatch(routeOverlay, /const refresh = \(\) => renderMovementRoutes/);
});

test('WP3 physical pieces preserve MapLibre absolute marker positioning', () => {
  const rule = pieceCss.match(/\.r3-terrain-prototype \.r3-terrain-task-group-marker\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(rule, /position:\s*absolute\s*;/);
  assert.doesNotMatch(rule, /position:\s*(?:relative|static)\s*;/);
});
