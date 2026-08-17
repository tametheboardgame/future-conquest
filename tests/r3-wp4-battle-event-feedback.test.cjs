const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const cueSource = fs.readFileSync('src/presentation/r3-strategic-event-cues.ts', 'utf8');
const overlay = fs.readFileSync('src/presentation/r3-battle-event-overlay.ts', 'utf8');
const movement = fs.readFileSync('src/presentation/r3-formation-route-overlay.ts', 'utf8');
const wrapper = fs.readFileSync('src/presentation/r3-terrain-operational-markers.ts', 'utf8');

const start = cueSource.indexOf('export const R3_RECENT_STRATEGIC_EVENT_TURNS');
const executable = stripTypeScriptTypes(cueSource.slice(start).replaceAll('export ', ''));
const context = vm.createContext({ Math, Object, Set, globalThis: null });
context.globalThis = context;
vm.runInContext(`${executable}\nglobalThis.deriveActive = deriveActiveAttackCues; globalThis.deriveRecent = deriveRecentStrategicOutcomeCues;`, context);

test('WP4 derives deterministic player attack cues from authoritative operation origins and targets', () => {
  const state = {
    turn: 12,
    operations: {
      z: { id: 'op-z', target: 'target-z', participantGroupIds: ['g2', 'g1'], origins: { g1: 'origin-a', g2: 'origin-b' }, progress: 45 },
      a: { id: 'op-a', target: 'target-a', participantGroupIds: ['g3'], origins: { g3: 'origin-c' }, progress: 120 }
    },
    enemyOrders: [{ origin: 'secret', target: 'hidden' }],
    enemyFormations: { secret: { location: 'hidden' } }
  };
  const before = JSON.stringify(state);
  const cues = JSON.parse(JSON.stringify(context.deriveActive(state)));
  assert.deepEqual(cues.map(cue => cue.id), ['active-attack:op-a:g3', 'active-attack:op-z:g1', 'active-attack:op-z:g2']);
  assert.deepEqual(cues.map(cue => [cue.originTerritoryId, cue.targetTerritoryId]), [
    ['origin-c', 'target-a'], ['origin-a', 'target-z'], ['origin-b', 'target-z']
  ]);
  assert.equal(cues[0].progress, 100);
  assert.equal(JSON.stringify(state), before, 'selector must not mutate game state');
  assert.doesNotMatch(cueSource, /enemyOrders|enemyFormations|enemyPower|enemyFormationIds/);
});

test('WP4 derives only recent public combat outcomes and avoids duplicate capture acknowledgement', () => {
  const state = {
    turn: 10,
    combatReports: [
      { id: 'r1', turn: 10, kind: 'offensive', outcome: 'victory', territoryId: 'a' },
      { id: 'r2', turn: 9, kind: 'offensive', outcome: 'withdrawal', territoryId: 'b' },
      { id: 'r3', turn: 8, kind: 'counterattack', outcome: 'territory-lost', territoryId: 'c' },
      { id: 'r4', turn: 10, kind: 'counterattack', outcome: 'repelled', territoryId: 'd' },
      { id: 'r5', turn: 10, kind: 'counterattack', outcome: 'territory-lost', territoryId: 'e' }
    ],
    territories: {
      a: { controller: 'player', capturedTurn: 10 },
      f: { controller: 'player', capturedTurn: 10 },
      g: { controller: 'enemy', capturedTurn: 10 }
    }
  };
  const before = JSON.stringify(state);
  const cues = JSON.parse(JSON.stringify(context.deriveRecent(state)));
  assert.deepEqual(cues.map(cue => cue.kind), [
    'recent-victory',
    'recent-counterattack-repelled',
    'recent-territory-lost',
    'recent-capture',
    'recent-withdrawal'
  ]);
  assert.deepEqual(cues.map(cue => cue.territoryId), ['a', 'd', 'e', 'f', 'b']);
  assert.equal(cues.some(cue => cue.territoryId === 'c'), false, 'events older than one turn must expire');
  assert.equal(cues.filter(cue => cue.territoryId === 'a').length, 1, 'victory and capturedTurn must not double-announce the same capture');
  assert.equal(JSON.stringify(state), before, 'selector must not mutate game state');
});

test('WP4 combat presentation remains visually and semantically distinct from WP3 movement', () => {
  assert.match(cueSource, /kind: 'active-attack'/);
  assert.match(overlay, /#ff7a2f/);
  assert.match(overlay, /#ff4d4d/);
  assert.match(overlay, /attack-chevron/);
  assert.match(overlay, /recent-victory/);
  assert.match(overlay, /recent-territory-lost/);
  assert.match(movement, /#8fe1d4/);
  assert.match(movement, /stroke-dasharray/);
  assert.doesNotMatch(overlay, /#8fe1d4|stroke-dasharray/);
});

test('WP4 recent outcomes emphasise only current derived front segments touching the affected territory', () => {
  assert.match(wrapper, /deriveR3FrontSegments\(state\.territories, TERRITORIES\)/);
  assert.match(overlay, /r3-wp4-front-shift/);
  assert.match(overlay, /segment\.fromTerritoryId !== cue\.territoryId && segment\.toTerritoryId !== cue\.territoryId/);
  assert.match(overlay, /frontMarkGeo/);
  assert.match(overlay, /Math\.min\(0\.24, Math\.max\(0\.08, distance \* 0\.12\)\)/);
  assert.doesNotMatch(overlay, /historicalFront|frontHistory|previousFront/);
});

test('WP4 provides reduced-motion-safe static meaning and a non-interactive overlay', () => {
  assert.match(overlay, /battleEventMotionPolicy/);
  assert.match(overlay, /staticDirection: true/);
  assert.match(overlay, /staticTarget: true/);
  assert.match(overlay, /staticOutcome: true/);
  assert.match(overlay, /staticFrontShift: true/);
  assert.match(overlay, /prefers-reduced-motion: reduce/);
  assert.match(overlay, /pointerEvents: 'none'/);
  assert.match(overlay, /setAttribute\('aria-hidden', 'true'\)/);
  assert.doesNotMatch(overlay, /tabIndex|addEventListener\('click'/);
});

test('WP4 coalesces settled redraws, suspends during camera travel, and exposes lifecycle cleanup', () => {
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

test('WP4 terrain wiring projects authoritative endpoints and respects the Operations layer toggle', () => {
  assert.match(wrapper, /deriveStrategicEventCues\(state\)/);
  assert.match(wrapper, /terrainOperationalTerritoryCentres/);
  assert.match(wrapper, /setBattleEventOverlayVisible\(map, layers\.operations\)/);
  assert.match(overlay, /map\.project\(\[origin\[0\], origin\[1\]\]\)/);
  assert.match(overlay, /map\.project\(\[target\[0\], target\[1\]\]\)/);
  assert.doesNotMatch(overlay, /setLngLat|setOffset|cameraFor|flyTo|easeTo/);
});
