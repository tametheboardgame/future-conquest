import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const path = 'src/game/strategic-response.ts';
let source = readFileSync(path, 'utf8');

const replaceExact = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing expected ${label} block`);
  source = source.replace(before, after);
};

replaceExact(
  "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\n",
  "import { createEnemyStrategyState, normaliseEnemyStrategyState } from './enemy-strategy';\nimport { strategicBalanceFor } from './strategic-balance';\n",
  'strategic balance import'
);

replaceExact(
`const difficultyScale: Record<Difficulty, number> = {
  story: 0.82,
  standard: 1,
  hard: 1.18
};

const mobilisationDelay: Record<Difficulty, number> = {
  story: 3,
  standard: 1,
  hard: -1
};

const escalationTurnGrowth: Record<Difficulty, number> = {
  story: 0.18,
  standard: 0.28,
  hard: 0.42
};

const escalationDailyBase: Record<Difficulty, number> = {
  story: 0.08,
  standard: 0.14,
  hard: 0.22
};

`,
  '',
  'old difficulty tuning constants'
);

replaceExact(
`  const floor = 3
    + Math.max(0, controlled - 1) * 3.35
    + Math.max(0, state.turn - 1) * escalationTurnGrowth[state.difficulty];
  const dailyPressure = escalationDailyBase[state.difficulty]
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * 0.08
    + unsecured * 0.06;
`,
`  const balance = strategicBalanceFor(state.difficulty);
  const floor = 3
    + Math.max(0, controlled - 1) * 3.35
    + Math.max(0, state.turn - 1) * balance.escalationTurnGrowth;
  const dailyPressure = balance.escalationDailyBase
    + Object.keys(state.operations).length * 0.38
    + recentCaptures * 1.35
    + strategicCaptures * balance.strategicCaptureDailyPressure
    + unsecured * balance.unsecuredDailyPressure;
`,
  'escalation pressure calculation'
);

replaceExact(
`    const scale = difficultyScale[next.difficulty];
`,
`    const balance = strategicBalanceFor(next.difficulty);
    const scale = balance.mobilisationScale;
`,
  'mobilisation scale'
);

replaceExact(
`    const arrivalTurn = next.turn + Math.max(1, template.delay + mobilisationDelay[next.difficulty]);
`,
`    const arrivalTurn = next.turn + Math.max(1, template.delay + balance.mobilisationDelay);
`,
  'mobilisation delay'
);

writeFileSync(path, source);
rmSync('scripts/apply-strategic-balance-pass.mjs');
