import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const sourcePath = 'src/game/strategic-response.ts';
const testPath = 'tests/strategic-response-viii-a.test.cjs';
let source = readFileSync(sourcePath, 'utf8');
let test = readFileSync(testPath, 'utf8');

const replaceSource = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing source block: ${label}`);
  source = source.replace(before, after);
};

const replaceTest = (before, after, label) => {
  if (!test.includes(before)) throw new Error(`Missing test block: ${label}`);
  test = test.replace(before, after);
};

replaceSource(
  "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\n",
  "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\nimport { strategicBalanceFor } from './strategic-balance';\n",
  'strategic balance import'
);

replaceSource(
`const difficultyScale: Record<Difficulty, number> = {
  story: 0.82,
  standard: 1,
  hard: 1.18
};

const mobilisationDelay: Record<Difficulty, number> = {
  story: 1,
  standard: 0,
  hard: -1
};

`,
  '',
  'legacy mobilisation constants'
);

replaceSource(
`  const floor = 3 + Math.max(0, controlled - 1) * 3.35 + Math.max(0, state.turn - 1) * 0.42;
  const dailyPressure = 0.22
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * 0.08
    + unsecured * 0.06;
`,
`  const balance = strategicBalanceFor(state.difficulty);
  const floor = 3 + Math.max(0, controlled - 1) * 3.35 + Math.max(0, state.turn - 1) * balance.escalationTurnGrowth;
  const dailyPressure = balance.escalationDailyBase
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * balance.strategicCaptureDailyPressure
    + unsecured * balance.unsecuredDailyPressure;
`,
  'difficulty-aware escalation'
);

replaceSource(
`    const scale = difficultyScale[state.difficulty];
`,
`    const balance = strategicBalanceFor(state.difficulty);
    const scale = balance.mobilisationScale;
`,
  'difficulty-aware mobilisation scale'
);

replaceSource(
`      arrivalTurn: state.turn + Math.max(2, template.delay + mobilisationDelay[state.difficulty]),
`,
`      arrivalTurn: state.turn + Math.max(2, template.delay + balance.mobilisationDelay),
`,
  'difficulty-aware mobilisation delay'
);

replaceSource(
`  const pendingCounterattack = retainedOrders.some(order => order.type === 'counterattack' && order.status !== 'completed');
  if (next.escalationStage >= 2 && playerFront.length && !pendingCounterattack && planned.length < availableOrderSlots) {
    const target = [...playerFront].sort((first, second) => playerPowerAt(next, first) - playerPowerAt(next, second))[0];
    const formation = Object.values(enemyFormations)
      .filter(candidate => candidate.personnel > 250 && TERRITORIES[target].neighbours.includes(candidate.location))
      .sort((first, second) => (second.personnel + second.armour * 4) - (first.personnel + first.armour * 4))[0];
    if (formation) {
      planned.push({
        id: \`EO-\${next.turn}-COUNTER-\${formation.id}-\${target}\`,
        turn: next.turn,
        type: 'counterattack',
        formationId: formation.id,
        origin: formation.location,
        target,
        executeTurn: next.turn + 1,
        status: 'planned',
        priority: 100,
        summary: \`Counterattack preparations detected against \${TERRITORIES[target].centre}\`
      });
    }
  }

`,
  '',
  'legacy standalone counterattack planner'
);

replaceTest(
  "  getEscalationStage,\n  getPlannedCounterattack,\n  resolveStrategicResponse,\n",
  "  getEscalationStage,\n  resolveStrategicResponse,\n",
  'unused counterattack helper import'
);

replaceTest(
`test('enemy command creates operational intent and intelligence reports', () => {
  const state = newGame(73, 'hard');
  state.escalation = 55;
  const next = resolveStrategicResponse(state);
  assert.ok(next.enemyOrders.length >= 1);
  assert.ok(next.intelligenceReports.some(report => report.kind === 'order'));
  const counterattack = next.enemyOrders.find(order => order.type === 'counterattack');
  assert.ok(counterattack);
  assert.equal(counterattack.executeTurn, next.turn + 1);
  assert.equal(getPlannedCounterattack(next), undefined);
  assert.equal(getPlannedCounterattack({ ...next, turn: counterattack.executeTurn }).id, counterattack.id);
});
`,
`test('legacy strategic response creates defensive intent without independently authoring counterattacks', () => {
  const state = newGame(73, 'hard');
  state.escalation = 55;
  const next = resolveStrategicResponse(state);
  assert.ok(next.enemyOrders.length >= 1);
  assert.ok(next.intelligenceReports.some(report => report.kind === 'order'));
  assert.equal(next.enemyOrders.some(order => order.type === 'counterattack'), false);
});
`,
  'counterattack authority contract'
);

writeFileSync(sourcePath, source);
writeFileSync(testPath, test);
rmSync('scripts/rebuild-strategic-response-balance.mjs');
