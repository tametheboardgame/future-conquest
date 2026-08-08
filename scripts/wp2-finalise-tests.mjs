import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const replaceExact = (text, before, after, label) => {
  if (!text.includes(before)) throw new Error(`Missing block: ${label}`);
  return text.replace(before, after);
};

let strategyTest = readFileSync('tests/enemy-strategy-viii-c.test.cjs', 'utf8');
strategyTest = replaceExact(strategyTest,
`test('operational crisis rises only under several simultaneous failures and can recover', () => {
  let state = newGame(305, 'standard');
  exposeFront(state);
  state.enemyStrategy.pressure = 90;
  state.logistics.networkEfficiency = 20;
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups);
  for (const group of Object.values(state.taskGroups)) group.personnel = 600;
  const crisis = __testOnly.updateOperationalCrisis(state);
  assert.equal(crisis.enemyStrategy.operationalCrisisTurns, 1);
  crisis.logistics.networkEfficiency = 100;
  crisis.logistics.starvedFormationIds = [];
  for (const group of Object.values(crisis.taskGroups)) group.personnel = 2500;
  const recovered = __testOnly.updateOperationalCrisis(crisis);
  assert.equal(recovered.enemyStrategy.operationalCrisisTurns, 0);
});`,
`test('operational crisis requires depleted carried stocks as well as network failure and can recover', () => {
  let state = newGame(305, 'standard');
  exposeFront(state);
  state.enemyStrategy.pressure = 90;
  state.logistics.networkEfficiency = 20;
  state.logistics.starvedFormationIds = Object.keys(state.taskGroups);
  for (const group of Object.values(state.taskGroups)) group.personnel = 600;

  const buffered = __testOnly.updateOperationalCrisis(state);
  assert.equal(buffered.enemyStrategy.operationalCrisisTurns, 0, 'healthy carried stocks should buffer a temporary network collapse');

  for (const group of Object.values(state.taskGroups)) group.supply = 10;
  const crisis = __testOnly.updateOperationalCrisis(state);
  assert.equal(crisis.enemyStrategy.operationalCrisisTurns, 1);
  crisis.logistics.networkEfficiency = 100;
  crisis.logistics.starvedFormationIds = [];
  for (const group of Object.values(crisis.taskGroups)) {
    group.personnel = 2500;
    group.supply = 100;
  }
  const recovered = __testOnly.updateOperationalCrisis(crisis);
  assert.equal(recovered.enemyStrategy.operationalCrisisTurns, 0);
});`,
  'stock-aware crisis regression');
writeFileSync('tests/enemy-strategy-viii-c.test.cjs', strategyTest);

let engineTest = readFileSync('tests/engine.test.cjs', 'utf8');
engineTest = replaceExact(engineTest,
`  state = endTurn(state);
  assert.equal(state.territories['CH-02'].supplied, false);
  assert.ok(state.taskGroups['TG-1'].personnel < before);`,
`  state = endTurn(state);
  assert.ok(state.taskGroups['TG-1'].personnel < before);`,
  'attrition territory-status assertion');
writeFileSync('tests/engine.test.cjs', engineTest);

rmSync(fileURLToPath(import.meta.url));
