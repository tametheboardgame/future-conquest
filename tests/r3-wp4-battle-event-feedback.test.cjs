const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const cueSource = fs.readFileSync('src/presentation/r3-strategic-event-cues.ts', 'utf8');
const overlay = fs.readFileSync('src/presentation/r3-battle-event-overlay.ts', 'utf8');
const movement = fs.readFileSync('src/presentation/r3-formation-route-overlay.ts', 'utf8');
const wrapper = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');

const start = cueSource.indexOf('const clampProgress');
const executable = stripTypeScriptTypes(cueSource.slice(start)
  .replace('export function deriveActiveAttackCues', 'function deriveActiveAttackCues'));
const context = vm.createContext({ Math, Object, globalThis: null });
context.globalThis = context;
vm.runInContext(`${executable}\nglobalThis.derive = deriveActiveAttackCues;`, context);

test('WP4 derives deterministic player attack cues from authoritative operation origins and targets', () => {
  const state = {
    operations: {
      z: { id: 'op-z', target: 'target-z', participantGroupIds: ['g2', 'g1'], origins: { g1: 'origin-a', g2: 'origin-b' }, progress: 45 },
      a: { id: 'op-a', target: 'target-a', participantGroupIds: ['g3'], origins: { g3: 'origin-c' }, progress: 120 }
    },
    enemyOrders: [{ origin: 'secret', target: 'hidden' }],
    enemyFormations: { secret: { location: 'hidden' } }
  };
  const before = JSON.stringify(state);
  const cues = JSON.parse(JSON.stringify(context.derive(state)));
  assert.deepEqual(cues.map(cue => cue.id), ['active-attack:op-a:g3', 'active-attack:op-z:g1', 'active-attack:op-z:g2']);
  assert.deepEqual(cues.map(cue => [cue.originTerritoryId, cue.targetTerritoryId]), [
    ['origin-c', 'target-a'], ['origin-a', 'target-z'], ['origin-b', 'target-z']
  ]);
  assert.equal(cues[0].progress, 100);
  assert.equal(JSON.stringify(state), before, 'selector must not mutate game state');
  assert.doesNotMatch(cueSource, /enemyOrders|enemyFormations|enemyPower|enemyFormationIds/);
});

test('WP4 combat presentation remains visually and semantically distinct from WP3 movement', () => {
  assert.match(cueSource, /kind: 'active-attack'/);
  assert.match(overlay, /#ff7a2f/);
  assert.match(overlay, /#ff4a23/);
  assert.match(overlay, /attack-chevron/);
  assert.match(movement, /#8fe1d4/);
  assert.match(movement, /stroke-dasharray/);
  assert.doesNotMatch(overlay, /#8fe1d4|stroke-dasharray/);
});

test('WP4 provides static reduced-motion meaning and a non-interactive overlay', () => {
  assert.match(overlay, /battleEventMotionPolicy/);
  assert.match(overlay, /staticDirection: true/);
  assert.match(overlay, /staticTarget: true/);
  assert.match(overlay, /pointerEvents: 'none'/);
  assert.match(overlay, /setAttribute\('aria-hidden', 'true'\)/);
  assert.doesNotMatch(overlay, /tabIndex|addEventListener\('click'/);
});

test('WP4 coalesces settled redraws, suspends during camera travel, and removes its lifecycle', () => {
  assert.match(overlay, /requestAnimationFrame/);
  assert.match(overlay, /map\.on\('movestart'/);
  assert.match(overlay, /map\.on\('moveend'/);
  assert.match(overlay, /map\.on\('resize'/);
  assert.doesNotMatch(overlay, /map\.on\('move',/);
  assert.match(overlay, /map\.off\('movestart'/);
  assert.match(overlay, /cancelAnimationFrame/);
  assert.match(overlay, /state\.overlay\?\.remove\(\)/);
  assert.match(overlay, /removeBattleEventOverlay/);
});

test('WP4 terrain wiring projects authoritative endpoints without touching marker positions', () => {
  assert.match(wrapper, /deriveActiveAttackCues\(state\)/);
  assert.match(wrapper, /terrainOperationalTerritoryCentres/);
  assert.match(overlay, /map\.project\(\[origin\[0\], origin\[1\]\]\)/);
  assert.match(overlay, /map\.project\(\[target\[0\], target\[1\]\]\)/);
  assert.doesNotMatch(overlay, /setLngLat|setOffset|r3MarkerOffset|cameraFor|flyTo|easeTo/);
});
