import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'cb407bfb915643db96f004a4fd07fa8b31717d26';
const replaceExact = (text, before, after, label) => {
  if (!text.includes(before)) throw new Error(`Missing block: ${label}`);
  return text.replace(before, after);
};

// A previous connector write replaced too much of this file. Restore the exact WP1 base,
// then change only the supply-exhaustion scenario for the new local-source model.
let engineTest = execFileSync('git', ['show', `${BASE}:tests/engine.test.cjs`], { encoding: 'utf8' });
engineTest = replaceExact(engineTest,
`test('isolated formations suffer attrition when local supply is exhausted', () => {
  let state = newGame(2);
  state.territories['CH-02'] = {
    controller: 'player', occupation: 'controlled', legitimacy: 50, resistance: 30,
    supplied: false, fortification: 0, capturedTurn: 1
  };
  state.taskGroups['TG-1'].location = 'CH-02';
  state.taskGroups['TG-1'].supply = 0;
  state = __testOnly.refreshSupply(state);
  const before = state.taskGroups['TG-1'].personnel;
  state = endTurn(state);
  assert.equal(state.territories['CH-02'].supplied, false);
  assert.ok(state.taskGroups['TG-1'].personnel < before);
  assert.match(state.events[0].text, /isolated/);
});`,
`test('formations suffer attrition only after carried stocks are exhausted and local replenishment is inadequate', () => {
  let state = newGame(2);
  state.territories['CH-02'] = {
    controller: 'player', occupation: 'unsecured', legitimacy: 0, resistance: 100,
    supplied: false, fortification: 0, capturedTurn: 1
  };
  state.taskGroups['TG-1'].location = 'CH-02';
  state.taskGroups['TG-1'].supply = 0;
  state = __testOnly.refreshSupply(state);
  const allocation = state.logistics.formationAllocations['TG-1'];
  assert.ok(allocation.ratio < 15, 'scenario must provide less than 15% of daily demand');
  const before = state.taskGroups['TG-1'].personnel;
  state = endTurn(state);
  assert.equal(state.territories['CH-02'].supplied, false);
  assert.ok(state.taskGroups['TG-1'].personnel < before);
  assert.ok(state.events.some(event => /exhausted carried stocks|attrition/i.test(event.text)));
});`,
  'exhausted carried stock test');
writeFileSync('tests/engine.test.cjs', engineTest);

let priorityTest = readFileSync('tests/logistics-priorities-viii-b4d.test.cjs', 'utf8');
priorityTest = priorityTest.replace('  portalSupplyCapacity,\n', '');
priorityTest = priorityTest.replaceAll('const capacity = portalSupplyCapacity(state);', 'const capacity = state.logistics.sourceCapacity;');
writeFileSync('tests/logistics-priorities-viii-b4d.test.cjs', priorityTest);

let supplyTest = readFileSync('tests/supply-throughput-viii-b3.test.cjs', 'utf8');
supplyTest = replaceExact(supplyTest,
`  for (const group of Object.values(state.taskGroups)) {
    assert.ok(state.logistics.formationAllocations[group.id]);
    assert.equal(state.logistics.formationAllocations[group.id].condition, 'sustained');
  }`,
`  for (const group of Object.values(state.taskGroups)) {
    const allocation = state.logistics.formationAllocations[group.id];
    assert.ok(allocation);
    assert.ok(['sustained', 'strained'].includes(allocation.condition));
    assert.equal(group.supply, 100, 'the expedition begins with full carried operational stocks');
  }`,
  'opening carried-stock expectation');
supplyTest = replaceExact(supplyTest,
`  for (const group of Object.values(state.taskGroups)) {
    group.location = 'CH-02';
    group.supply = 45;
  }
  state = refreshSupplyNetwork(state);`,
`  state.territories['CH-02'].occupation = 'unsecured';
  state.territories['CH-02'].legitimacy = 0;
  state.territories['CH-02'].resistance = 100;
  for (const group of Object.values(state.taskGroups)) {
    group.location = 'CH-02';
    group.supply = 45;
  }
  state = refreshSupplyNetwork(state);
  assert.ok(state.logistics.formationAllocations['TG-1'].ratio < 65, 'scenario must be genuinely undersupplied');`,
  'genuine Alpine shortfall');
writeFileSync('tests/supply-throughput-viii-b3.test.cjs', supplyTest);

rmSync(fileURLToPath(import.meta.url));
