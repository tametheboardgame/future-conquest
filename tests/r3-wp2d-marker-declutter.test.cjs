const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/presentation/r3-terrain-marker-declutter.ts');

test('WP2D-D marker LOD thresholds match theatre campaign and local command scales', async () => {
  const { terrainMarkerLodForZoom, terrainMarkerScaleForLod } = await load();
  assert.equal(terrainMarkerLodForZoom(3.6), 'theatre');
  assert.equal(terrainMarkerLodForZoom(4.79), 'theatre');
  assert.equal(terrainMarkerLodForZoom(4.8), 'campaign');
  assert.equal(terrainMarkerLodForZoom(6.39), 'campaign');
  assert.equal(terrainMarkerLodForZoom(6.4), 'local');
  assert.equal(terrainMarkerScaleForLod('theatre'), 0.82);
  assert.equal(terrainMarkerScaleForLod('campaign'), 0.94);
  assert.equal(terrainMarkerScaleForLod('local'), 1.05);
});

test('WP2F declutter footprint grows with the tightly clamped rendered marker scale', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const candidates = [
    { id: 'a', kind: 'formation', x: 0, y: 0 },
    { id: 'b', kind: 'formation', x: 54, y: 0 }
  ];
  assert.equal(visibleTerrainMarkerIds(candidates, 'theatre').size, 2);
  assert.equal(visibleTerrainMarkerIds(candidates, 'campaign').size, 1);
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

test('WP2D-D treats persistent HUD rectangles as deterministic no-clutter zones', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const reserved = [{ left: 80, top: 40, right: 260, bottom: 100 }];
  const candidates = [
    { id: 'major-node-under-hud', kind: 'node-major', x: 120, y: 70 },
    { id: 'enemy-under-hud', kind: 'enemy-estimated', x: 220, y: 70 },
    { id: 'ordinary-clear', kind: 'territory', x: 400, y: 200 }
  ];
  assert.deepEqual([...visibleTerrainMarkerIds(candidates, 'local', reserved)], ['ordinary-clear']);
});

test('WP2D-D never sacrifices protected command pieces to a reserved HUD zone', async () => {
  const { visibleTerrainMarkerIds } = await load();
  const reserved = [{ left: 0, top: 0, right: 300, bottom: 150 }];
  const candidates = [
    { id: 'selected', kind: 'selected-formation', x: 100, y: 70 },
    { id: 'operation', kind: 'operation', x: 120, y: 70 },
    { id: 'threat', kind: 'live-threat', x: 140, y: 70 }
  ];
  assert.deepEqual([...visibleTerrainMarkerIds(candidates, 'local', reserved)].sort(), ['operation', 'selected', 'threat']);
});
