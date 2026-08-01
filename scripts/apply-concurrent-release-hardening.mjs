import { readFileSync, writeFileSync } from 'node:fs';

const enginePath = 'src/game/engine.ts';
const engine = readFileSync(enginePath, 'utf8');

const helperNeedle = `function resolveOperations(state: GameState): GameState {`;
const helper = `function syncOperationDefenders(state: GameState): GameState {
  const operations = structuredClone(state.operations);
  for (const operation of Object.values(operations)) {
    const defenders = Object.values(state.enemyFormations)
      .filter(formation => formation.location === operation.target && formation.personnel > 0);
    operation.enemyFormationIds = defenders.map(formation => formation.id);
    operation.enemyPower = enemyStrengthAt(state, operation.target).power;
  }
  return { ...state, operations };
}

function resolveOperations(state: GameState): GameState {`;

const rosterNeedle = `    const operation = operations[operationId];
    const participants = operationParticipants(next, operation);`;
const rosterReplacement = `    const operation = operations[operationId];
    operation.enemyFormationIds = Object.values(enemyFormations)
      .filter(formation => formation.location === operation.target && formation.personnel > 0)
      .map(formation => formation.id);
    const participants = operationParticipants(next, operation);`;

const returnNeedle = `  for (const victory of victories) next = retreatEnemyFormations(next, victory.target, victory.enemyFormationIds);
  return next;
}`;
const returnReplacement = `  for (const victory of victories) next = retreatEnemyFormations(next, victory.target, victory.enemyFormationIds);
  return syncOperationDefenders(next);
}`;

const endTurnNeedle = `  next = resolveCounterattack(next);
  next = pruneOperations(next);
  next = refreshSupply(next);`;
const endTurnReplacement = `  next = resolveCounterattack(next);
  next = pruneOperations(next);
  next = syncOperationDefenders(next);
  next = refreshSupply(next);`;

let updated = engine;
for (const [needle, replacement, label] of [
  [helperNeedle, helper, 'sync helper insertion'],
  [rosterNeedle, rosterReplacement, 'daily defender roster refresh'],
  [returnNeedle, returnReplacement, 'post-retreat defender sync'],
  [endTurnNeedle, endTurnReplacement, 'end-of-day defender sync']
]) {
  if (!updated.includes(needle)) throw new Error(`Could not find ${label} anchor`);
  updated = updated.replace(needle, replacement);
}
writeFileSync(enginePath, updated);

const testPath = 'tests/concurrent-operation-defenders.test.cjs';
writeFileSync(testPath, `const test = require('node:test');
const assert = require('node:assert/strict');
const { beginOperation, endTurn, newGame } = require('../.test-dist/engine.js');

test('an operation tracks enemy relief formations that arrive after it begins', () => {
  let state = newGame(2, 'standard');
  const target = 'FR-01';
  state.selectedTaskGroupId = 'TG-1';
  state.selectedTerritory = target;
  state.targetTerritory = target;
  state = beginOperation(state);

  const operationId = state.taskGroups['TG-1'].order.operationId;
  const operation = state.operations[operationId];
  for (const defenderId of operation.enemyFormationIds) {
    state.enemyFormations[defenderId].personnel = 0;
    state.enemyFormations[defenderId].armour = 0;
  }

  state.enemyFormations['EF-RELIEF'] = {
    id: 'EF-RELIEF',
    name: 'Relief Formation',
    location: target,
    personnel: 20000,
    armour: 1200,
    readiness: 95,
    entrenchment: 25
  };

  state = endTurn(state);

  assert.equal(state.territories[target].controller, 'enemy');
  assert.ok(state.operations[operationId], 'operation should remain active');
  assert.ok(state.operations[operationId].enemyFormationIds.includes('EF-RELIEF'));
  assert.equal(state.enemyFormations['EF-RELIEF'].location, target);
});
`);
