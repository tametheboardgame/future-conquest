const test = require('node:test');
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
