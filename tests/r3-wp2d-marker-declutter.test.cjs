const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/presentation/r3-terrain-marker-declutter.ts');

test('WP2D-D marker LOD thresholds match theatre campaign and local command scales', async () => {
  const { terrainMarkerLodForZoom } = await load();
  assert.equal(terrainMarkerLodForZoom(3.6), 'theatre');
  assert.equal(terrainMarkerLodForZoom(4.79), 'theatre');
  assert.equal(terrainMarkerLodForZoom(4.8), 'campaign');
  assert.equal(terrainMarkerLodForZoom(6.39), 'campaign');
  assert.equal(terrainMarkerLodForZoom(6.4), 'local');
});

test('WP2D-D protects selected formations operations live threats selected ground and the portal', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const candidates = [
    { id: 'selected', kind: 'selected-formation', x: 100, y: 100 },
    { id: 'operation', kind: 'operation', x: 100, y: 100 },
    { id: 'threat', kind: 'live-threat', x: 100, y: 100 },
    { id: 'territory', kind: 'selected-territory', x: 100, y: 100 },
    { id: 'portal', kind: 'portal', x: 100, y: 100 }
  ];
  assert.deepEqual([...visibleTerrainMarkerIds(candidates, 'theatre')].sort(), candidates.map(candidate => candidate.id).sort());
});

test('WP2D-D deterministically lets higher priority markers displace ordinary clutter', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const candidates = [
    { id: 'ordinary-label', kind: 'territory', x: 200, y: 200 },
    { id: 'major-node', kind: 'node-major', x: 201, y: 200 },
    { id: 'confirmed-contact', kind: 'enemy-confirmed', x: 202, y: 200 },
    { id: 'formation', kind: 'formation', x: 203, y: 200 }
  ];
  const forward = [...visibleTerrainMarkerIds(candidates, 'campaign')];
  const reverse = [...visibleTerrainMarkerIds([...candidates].reverse(), 'campaign')];
  assert.deepEqual(forward, ['formation']);
  assert.deepEqual(reverse, forward);
});

test('WP2D-D suppresses low-confidence and secondary context at theatre scale', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const candidates = [
    { id: 'activity', kind: 'enemy-activity', x: 0, y: 0 },
    { id: 'stale', kind: 'enemy-stale', x: 100, y: 0 },
    { id: 'secondary-node', kind: 'node-secondary', x: 200, y: 0 },
    { id: 'recent-combat', kind: 'recent-threat', x: 300, y: 0 },
    { id: 'confirmed', kind: 'enemy-confirmed', x: 400, y: 0 },
    { id: 'major-node', kind: 'node-major', x: 500, y: 0 }
  ];
  assert.deepEqual([...visibleTerrainMarkerIds(candidates, 'theatre')], ['confirmed', 'major-node']);
});

test('WP2D-D relaxes spacing as the player zooms into local command detail', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const candidates = [
    { id: 'a', kind: 'territory', x: 0, y: 0 },
    { id: 'b', kind: 'territory', x: 45, y: 0 }
  ];
  assert.equal(visibleTerrainMarkerIds(candidates, 'theatre').size, 1);
  assert.equal(visibleTerrainMarkerIds(candidates, 'local').size, 2);
});
