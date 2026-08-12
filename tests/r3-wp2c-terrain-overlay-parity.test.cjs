const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const markers = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

test('WP2C terrain markers restore the core command-map information hierarchy', () => {
  for (const selector of [
    'r3-terrain-territory-label',
    'r3-terrain-node-marker',
    'r3-terrain-task-group-marker',
    'r3-terrain-enemy-contact',
    'r3-terrain-threat-marker',
    'r3-terrain-operation-marker',
    'r3-terrain-portal-marker'
  ]) {
    assert.match(markers, new RegExp(selector));
    assert.match(css, new RegExp(selector));
  }
});

test('WP2C terrain enemy markers use player-visible intelligence adapters only', () => {
  assert.match(markers, /getEnemyContacts\(state\)/);
  assert.match(markers, /getThreatenedTerritories\(state\)/);
  assert.doesNotMatch(markers, /state\.enemyFormations/);
  assert.doesNotMatch(markers, /Object\.values\(state\.enemy/);
});

test('WP2C terrain operational markers are screen-space MapLibre markers with LOD', () => {
  assert.match(markers, /new Marker\(/);
  assert.match(renderer, /buildTerrainOperationalMarkers\(map, state/);
  assert.match(renderer, /host\.dataset\.overlayLod/);
  assert.match(renderer, /zoom < 4\.8 \? 'theatre' : zoom < 6\.4 \? 'campaign' : 'local'/);
  assert.match(css, /data-overlay-lod='theatre'/);
  assert.match(css, /data-overlay-lod='campaign'/);
});

test('WP2C terrain markers are rebuilt from current campaign state and cleaned up', () => {
  assert.match(renderer, /removeTerrainOperationalMarkers\(operationalMarkersRef\.current\)/);
  assert.match(renderer, /\[state, status\]/);
  assert.match(renderer, /operationalMarkersRef\.current = \[\]/);
});
