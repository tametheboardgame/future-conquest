const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const strategicSource = fs.readFileSync('src/presentation/r3-strategic-information-layers.ts', 'utf8');
const wrapperSource = fs.readFileSync('src/components/TerrainMapPrototype.tsx', 'utf8');
const resourceSource = fs.readFileSync('src/game/territory-resources.ts', 'utf8');

test('R3 WP5 exposes every roadmap strategic information view', () => {
  for (const id of [
    'control',
    'strength',
    'readiness',
    'threat',
    'supply',
    'routes',
    'resources',
    'stockpiles',
    'occupation',
    'quality'
  ]) {
    assert.match(strategicSource, new RegExp(`'${id}'`));
  }
  assert.match(wrapperSource, /Strategic view/);
  assert.match(wrapperSource, /r3-strategic-information-control/);
});

test('R3 WP5 covers all six resource and stockpile categories', () => {
  for (const key of ['food', 'industry', 'energy', 'transport', 'medical', 'militaryStores']) {
    assert.match(strategicSource, new RegExp(key));
    assert.match(resourceSource, new RegExp(key));
  }
  assert.match(strategicSource, /enrichR3StrategicNodeGeoJSON/);
  assert.match(strategicSource, /hub_level/);
  assert.match(strategicSource, /territory\.controller === 'player' \? resourceState\[territoryId\] : undefined/);
  assert.match(strategicSource, /Enemy-held stockpiles stay hidden/);
});

test('R3 WP5 threat presentation consumes assessed contacts instead of raw enemy strength', () => {
  assert.match(strategicSource, /getEnemyContacts/);
  assert.match(strategicSource, /threat_estimated_max/);
  assert.match(strategicSource, /threat_confidence/);
  assert.doesNotMatch(strategicSource, /state\.enemyFormations|enemyStrengthAt/);
});

test('R3 WP5 supply and route overlays consume authoritative logistics state', () => {
  assert.match(strategicSource, /state\.logistics\.territoryAllocations/);
  assert.match(strategicSource, /flow_utilisation/);
  assert.match(strategicSource, /flow_condition/);
  assert.match(strategicSource, /bottleneck/);
});

test('R3 WP5 occupation view exposes resistance and garrison pressure without changing simulation state', () => {
  assert.match(strategicSource, /garrison_personnel/);
  assert.match(strategicSource, /\['get', 'resistance'\]/);
  assert.match(strategicSource, /\['get', 'garrison_personnel'\]/);
  assert.match(strategicSource, /Occupation and garrison pressure/);
});

test('R3 WP5 preferences remain presentation-only browser state', () => {
  assert.match(wrapperSource, /localStorage/);
  assert.match(wrapperSource, /STRATEGIC_PREFERENCES_KEY/);
  assert.match(wrapperSource, /enrichR3StrategicPoliticalGeoJSON/);
  assert.match(wrapperSource, /enrichR3StrategicNodeGeoJSON/);
  assert.doesNotMatch(wrapperSource, /saveGame|setState\(|dispatch\(/);
});
