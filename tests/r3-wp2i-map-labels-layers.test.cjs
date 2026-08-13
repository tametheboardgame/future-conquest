const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const markers = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const declutter = fs.readFileSync('src/presentation/r3-terrain-marker-declutter.ts', 'utf8');

test('WP2I terrain layers use persistent presentation-only defaults', () => {
  for (const enabled of ['territoryNames', 'friendlyFormations', 'enemyContacts', 'operations', 'citiesHubs', 'ports']) {
    assert.match(renderer, new RegExp(`${enabled}: true`));
  }
  for (const disabled of ['strategicRoutes', 'airports']) {
    assert.match(renderer, new RegExp(`${disabled}: false`));
  }
  assert.match(renderer, /let retainedTerrainMapLayers/);
  assert.match(renderer, /retainedTerrainMapLayers = layers/);
  assert.match(renderer, /className="map-layer-control r3-terrain-layer-control"/);
  assert.match(renderer, /setLayoutProperty\('campaign-strategic-routes', 'visibility'/);
});

test('WP2I protects province names and lays out complete formation clusters around place labels', () => {
  assert.match(declutter, /territory: \{[^}]+protected: true/);
  assert.match(markers, /avoidFormationLabelCollisions/);
  assert.match(markers, /formationTerritoryIds\.has\(territoryId\) \? \[0, -54\] : \[0, -10\]/);
  assert.match(markers, /clusters\.values\(\)/);
  assert.match(markers, /getBoundingClientRect\(\)/);
  assert.match(markers, /distance <= 48/);
  assert.match(markers, /marker\.setOffset\(\[baseX \+ delta\[0\], baseY \+ delta\[1\]\]\)/);
  assert.match(markers, /marker\.setLngLat|setLngLat/);
});

test('WP2I keeps strategic nodes single-source and selection-independent', () => {
  assert.doesNotMatch(renderer, /id: 'campaign-strategic-nodes'/);
  assert.match(markers, /for \(const node of STRATEGIC_NODES\)/);
  assert.doesNotMatch(markers, /state\.selectedTerritory === node/);
});
