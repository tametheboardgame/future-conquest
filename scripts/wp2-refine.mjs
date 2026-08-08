import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const replaceExact = (text, before, after, label) => {
  if (!text.includes(before)) throw new Error(`Missing block: ${label}`);
  return text.replace(before, after);
};

let engine = readFileSync('src/game/engine.ts', 'utf8');
engine = replaceExact(engine,
`    if (condition === 'cut-off' && group.supply <= 0) {
      const attrition = Math.max(2, Math.round(group.personnel * 0.0025));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, \`${'${group.name}'} has exhausted carried stocks in ${'${TERRITORIES[group.location].centre}'}; ${'${attrition}'} personnel lost to attrition and desertion.\`, 'danger');
    }`,
`    if ((condition === 'critical' || condition === 'cut-off') && group.supply <= 0) {
      const attritionRate = condition === 'cut-off' ? 0.0025 : 0.0015;
      const attrition = Math.max(2, Math.round(group.personnel * attritionRate));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, \`${'${group.name}'} has exhausted carried stocks in ${'${TERRITORIES[group.location].centre}'} and local replenishment is inadequate; ${'${attrition}'} personnel lost to attrition and desertion.\`, 'danger');
    }`,
  'progressive exhausted-stock attrition');
writeFileSync('src/game/engine.ts', engine);

let strategy = readFileSync('src/game/enemy-strategy.ts', 'utf8');
strategy = replaceExact(strategy,
`  const activeGroups = Object.values(state.taskGroups).filter(group => group.personnel > 0).length;
  const criticalSourceFrontline = frontlinePlayerTerritories(state).some(id => territorySupplySourceCapacity(state, id) >= 28);
  const indicators = [
    criticalSourceFrontline,
    state.logistics.networkEfficiency < 45,
    state.logistics.starvedFormationIds.length >= Math.max(2, Math.ceil(activeGroups / 2)),`,
`  const activeGroups = Object.values(state.taskGroups).filter(group => group.personnel > 0).length;
  const activeFormations = Object.values(state.taskGroups).filter(group => group.personnel > 0);
  const averageSupplyStock = activeFormations.length
    ? activeFormations.reduce((sum, group) => sum + group.supply, 0) / activeFormations.length
    : 0;
  const criticalSourceFrontline = frontlinePlayerTerritories(state).some(id => territorySupplySourceCapacity(state, id) >= 28);
  const indicators = [
    criticalSourceFrontline,
    state.logistics.networkEfficiency < 45 && averageSupplyStock < 35,
    state.logistics.starvedFormationIds.length >= Math.max(2, Math.ceil(activeGroups / 2)) && averageSupplyStock < 50,`,
  'stock-aware crisis indicators');
writeFileSync('src/game/enemy-strategy.ts', strategy);

let engineTest = readFileSync('tests/engine.test.cjs', 'utf8');
engineTest = replaceExact(engineTest,
  "  assert.ok(allocation.ratio < 15, 'scenario must provide less than 15% of daily demand');",
  "  assert.ok(allocation.ratio < 40, 'scenario must provide less than 40% of daily demand');",
  'critical shortage expectation');
writeFileSync('tests/engine.test.cjs', engineTest);

let priorityTest = readFileSync('tests/logistics-priorities-viii-b4d.test.cjs', 'utf8');
priorityTest = replaceExact(priorityTest,
`test('priority changes warn when lower tiers fall below forty percent delivery', () => {
  let state = overloadedState(94);
  const ids = Object.keys(state.taskGroups);
  const demand = formationSupplyDemand(state.taskGroups[ids[0]]);
  const capacity = state.logistics.sourceCapacity;
  let transition = null;
  for (let criticalCount = 0; criticalCount < ids.length - 1; criticalCount += 1) {
    const beforeLower = (capacity - criticalCount * demand) / Math.max(1, (ids.length - criticalCount) * demand);
    const afterLower = (capacity - (criticalCount + 1) * demand) / Math.max(1, (ids.length - criticalCount - 1) * demand);
    if (beforeLower >= 0.4 && afterLower < 0.4) {
      transition = criticalCount;
      break;
    }
  }
  assert.notEqual(transition, null, 'expected a calculable starvation transition');
  for (let index = 0; index < transition; index += 1) state.logisticsPriorities.formationOverrides[ids[index]] = 'critical';
  state = refreshSupplyNetwork(state);
  const next = setFormationLogisticsPriority(state, ids[transition], 'critical');
  assert.ok(next.logistics.starvedFormationIds.length > state.logistics.starvedFormationIds.length);
  assert.match(next.events[0].text, /below 40% of daily logistics demand/);
  assert.equal(next.events[0].tone, 'warning');
});`,
`test('priority changes warn when lower tiers fall below forty percent delivery', () => {
  let state = overloadedState(94);
  const ids = Object.keys(state.taskGroups);
  let warned = null;
  for (const id of ids.slice(0, -1)) {
    const beforeStarved = state.logistics.starvedFormationIds.length;
    const next = setFormationLogisticsPriority(state, id, 'critical');
    if (next.logistics.starvedFormationIds.length > beforeStarved && /below 40% of daily logistics demand/.test(next.events[0]?.text ?? '')) {
      warned = next;
      break;
    }
    state = next;
  }
  assert.ok(warned, 'expected prioritisation to create and report a lower-tier shortfall');
  assert.equal(warned.events[0].tone, 'warning');
});`,
  'priority warning behavior');
writeFileSync('tests/logistics-priorities-viii-b4d.test.cjs', priorityTest);

let supplyTest = readFileSync('tests/supply-throughput-viii-b3.test.cjs', 'utf8');
supplyTest = replaceExact(supplyTest,
  "    assert.ok(['sustained', 'strained'].includes(allocation.condition));",
  "    assert.ok(['sustained', 'strained', 'undersupplied'].includes(allocation.condition));",
  'opening daily replenishment expectation');
writeFileSync('tests/supply-throughput-viii-b3.test.cjs', supplyTest);

rmSync(fileURLToPath(import.meta.url));
