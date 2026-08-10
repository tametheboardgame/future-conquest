import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const outputDir = resolve(process.cwd(), process.env.FC_BALANCE_OUTPUT_DIR ?? 'balance-output');

const cases = [
  { id: 'story-managed-best-progress', seed: 18, difficulty: 'story', policy: 'managed', maxTurns: 120 },
  { id: 'standard-managed-best-progress', seed: 54, difficulty: 'standard', policy: 'managed', maxTurns: 120 },
  { id: 'standard-managed-cutoff-stall', seed: 17, difficulty: 'standard', policy: 'managed', maxTurns: 120 },
  { id: 'hard-managed-healthy-network-stall', seed: 16, difficulty: 'hard', policy: 'managed', maxTurns: 120 }
];

rmSync('.balance-dist', { recursive: true, force: true });
const tscEntry = require.resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tscEntry, '-p', 'tsconfig.test.json', '--outDir', '.balance-dist'], { stdio: 'inherit' });
writeFileSync('.balance-dist/package.json', '{"type":"commonjs"}\n');

const { simulateCurrentEngineCampaign } = require(resolve(process.cwd(), '.balance-dist/balance-simulation.js'));

const traces = cases.map(testCase => {
  const snapshots = [];
  let previous = null;
  for (let cap = 2; cap <= testCase.maxTurns; cap += 1) {
    const result = simulateCurrentEngineCampaign(testCase.seed, testCase.difficulty, testCase.policy, cap);
    const snapshot = {
      turn: result.finalTurn,
      outcome: result.outcome,
      defeatCause: result.defeatCause ?? null,
      controlledTerritories: result.controlledTerritories,
      administeredTerritories: result.administeredTerritories,
      unsecuredTerritories: result.unsecuredTerritories,
      activePersonnel: result.activePersonnel,
      functionalArmour: result.functionalArmour,
      maxEscalation: result.maxEscalation,
      minNetworkEfficiency: result.minNetworkEfficiency,
      captures: result.captures,
      enemyRecaptures: result.enemyRecaptures,
      infrastructureIncidents: result.infrastructureIncidents,
      cutOffFormationDays: result.cutOffFormationDays,
      criticalSupplyFormationDays: result.criticalSupplyFormationDays,
      operationsStarted: result.operationsStarted,
      operationsJoined: result.operationsJoined,
      movesIssued: result.movesIssued,
      garrisonsAssigned: result.garrisonsAssigned,
      garrisonsReleased: result.garrisonsReleased,
      reserveTurns: result.reserveTurns,
      engineeringProjectsStarted: result.engineeringProjectsStarted,
      formationsSplit: result.formationsSplit,
      hubUpgrades: result.hubUpgrades,
      hubCapacityGain: result.hubCapacityGain,
      hubValueTurns: result.hubValueTurns,
      hubLosses: result.hubLosses,
      personnelAfterHubLoss: result.personnelAfterHubLoss
    };
    const changed = !previous || Object.keys(snapshot).some(key => key !== 'turn' && snapshot[key] !== previous[key]);
    if (changed || cap === testCase.maxTurns || result.outcome !== 'timeout') snapshots.push(snapshot);
    previous = snapshot;
    if (result.outcome !== 'timeout') break;
  }
  return { ...testCase, snapshots };
});

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'current-engine-traces.json'), `${JSON.stringify(traces, null, 2)}\n`);

const lines = ['# Current-engine diagnostic traces', ''];
for (const trace of traces) {
  lines.push(`## ${trace.id}`, '', `Seed ${trace.seed}, ${trace.difficulty}/${trace.policy}.`, '', '| Turn | Outcome | Control | Admin | Personnel | Escalation | Min network | Captures | Recaptures | Incidents | Ops | Moves | Garrisons A/R | Splits | Engineering | Hub upgrades/gain/value/loss/survivors |', '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const row of trace.snapshots) {
    lines.push(`| ${row.turn} | ${row.outcome}${row.defeatCause ? ` (${row.defeatCause})` : ''} | ${row.controlledTerritories} | ${row.administeredTerritories} | ${row.activePersonnel} | ${row.maxEscalation} | ${row.minNetworkEfficiency}% | ${row.captures} | ${row.enemyRecaptures} | ${row.infrastructureIncidents} | ${row.operationsStarted}/${row.operationsJoined} | ${row.movesIssued} | ${row.garrisonsAssigned}/${row.garrisonsReleased} | ${row.formationsSplit} | ${row.engineeringProjectsStarted} | ${row.hubUpgrades}/${row.hubCapacityGain}/${row.hubValueTurns}/${row.hubLosses}/${row.personnelAfterHubLoss} |`);
  }
  lines.push('');
}
writeFileSync(resolve(outputDir, 'current-engine-traces.md'), `${lines.join('\n')}\n`);
process.stdout.write(`${lines.join('\n')}\n`);
