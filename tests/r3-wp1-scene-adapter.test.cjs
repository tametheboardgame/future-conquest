const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const adapter = fs.readFileSync('src/presentation/map-scene-adapter.ts', 'utf8');

test('R3 WP1 scene adapter maps authoritative state into semantic presentation layers', () => {
  for (const layer of ['terrain', 'political-control', 'routes', 'pieces', 'effects', 'overlays']) {
    assert.match(adapter, new RegExp(`id: '${layer}'`));
  }
  assert.match(adapter, /buildMapPresentationFrame\(state: Readonly<GameState>/);
  assert.match(adapter, /resolveMapDetailTier\(input\.zoomPercent\)/);
});

test('R3 WP1 scene adapter does not expose exact hidden enemy formation state', () => {
  assert.doesNotMatch(adapter, /state\.enemyFormations/);
  assert.match(adapter, /Enemy pieces\/intelligence[\s\S]*player-visible assessment helpers/);
});

test('R3 WP1 scene adapter preserves own-force and network information needed by later renderers', () => {
  assert.match(adapter, /personnel: group\.personnel/);
  assert.match(adapter, /functionalArmour: group\.functionalArmour/);
  assert.match(adapter, /status: group\.status/);
  assert.match(adapter, /condition: route\.condition/);
  assert.match(adapter, /utilisation: state\.logistics\.routeFlows\[id\]\?\.utilisation/);
  assert.match(adapter, /bottleneckRouteIds/);
  assert.match(adapter, /starvedFormationIds/);
});

test('R3 WP1 scene adapter derives selection and operation feedback without mutating state', () => {
  assert.match(adapter, /selected: state\.selectedTerritory === id/);
  assert.match(adapter, /selected: state\.selectedTaskGroupId === group\.id/);
  assert.match(adapter, /participantCount: operation\.participantGroupIds\.length/);
  assert.doesNotMatch(adapter, /state\.[A-Za-z0-9_]+\s*=/);
});
