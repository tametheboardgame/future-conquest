const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const host = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const markers = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');
const declutter = fs.readFileSync('src/presentation/r3-terrain-marker-declutter.ts', 'utf8');
const selectionReplay = fs.readFileSync('scripts/run-r3-wp2i-selection-regression.mjs', 'utf8');

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

test('WP2I selection preserves the profile-key lifecycle and does not move contact authority', () => {
  assert.match(host, /TerrainMapPrototypeImpl key=\{profile\}/);
  assert.doesNotMatch(renderer, /containerResizeObserver/);
  assert.match(markers, /avoidEnemyPlaceLabelCollisions/);
  assert.match(markers, /contactDisplacementX/);
  assert.match(markers, /distance <= 64/);
  assert.match(markers, /marker\.setOffset\(\[baseX \+ delta\[0\], baseY \+ delta\[1\]\]\)/);
});

test('WP2I browser replay covers every live Frankfurt selection surface on clean product-sized pages', () => {
  assert.match(selectionReplay, /width: 1792, height: 858/);
  assert.match(selectionReplay, /territory-html-label/);
  assert.match(selectionReplay, /enemy-contact-card/);
  assert.match(selectionReplay, /campaign-territories-fill/);
  assert.match(selectionReplay, /map\.project\(coordinate\)/);
  assert.match(selectionReplay, /page\.mouse\.click/);
  assert.match(selectionReplay, /future-conquest-slice-v0\.14/);
  assert.match(selectionReplay, /Manual Save/);
  assert.match(selectionReplay, /Load Manual Save/);
  assert.match(selectionReplay, /CONTINUE CAMPAIGN/);
  assert.match(selectionReplay, /setup-diagnostic\.json/);
  assert.match(selectionReplay, /setup-failure\.png/);
  assert.match(selectionReplay, /const savedCampaign = await findAndSaveNaturalDusseldorfCampaign/);
  assert.match(selectionReplay, /Persist the complete transaction before evaluating a single invariant/);
  assert.match(selectionReplay, /after\.zoom < 4\.8/);
  assert.match(selectionReplay, /after\.lod !== 'campaign'/);
  assert.match(selectionReplay, /after\.terrainRelief !== 'physical'/);
});

test('WP2I protects province names and lays out complete formation clusters around place labels', () => {
  assert.match(declutter, /territory: \{[^}]+protected: true/);
  assert.match(markers, /avoidFormationLabelCollisions/);
  assert.match(markers, /formationTerritoryIds\.has\(territoryId\) \? \[0, -54\] : \[0, -10\]/);
  assert.match(markers, /clusters\.values\(\)/);
  assert.match(markers, /getBoundingClientRect\(\)/);
  assert.match(markers, /dx \* dx \+ dy \* dy <= 49 \* 49/);
  assert.match(markers, /deltas\.sort/);
  assert.match(markers, /obstacle, 0/);
  assert.match(markers, /marker\.setOffset\(\[baseX \+ delta\[0\], baseY \+ delta\[1\]\]\)/);
  assert.match(markers, /marker\.setLngLat|setLngLat/);
});

test('WP2I keeps strategic nodes single-source and selection-independent', () => {
  assert.doesNotMatch(renderer, /id: 'campaign-strategic-nodes'/);
  assert.match(markers, /for \(const node of STRATEGIC_NODES\)/);
  assert.doesNotMatch(markers, /state\.selectedTerritory === node/);
});
