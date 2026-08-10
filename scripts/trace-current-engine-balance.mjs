import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const outputDir = resolve(process.cwd(), process.env.FC_BALANCE_OUTPUT_DIR ?? 'balance-output');

const cases = [
  { id: 'story-managed-hub-loss', seed: 13, difficulty: 'story', policy: 'managed', maxTurns: 60 },
  { id: 'standard-managed-best-progress', seed: 54, difficulty: 'standard', policy: 'managed', maxTurns: 60 },
  { id: 'standard-managed-cutoff-stall', seed: 17, difficulty: 'standard', policy: 'managed', maxTurns: 60 },
  { id: 'hard-managed-collapse', seed: 16, difficulty: 'hard', policy: 'managed', maxTurns: 60 }
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
      personnelAfterHubLoss: result.personnelAfterHubLoss,
      defensivePreparations: result.defensivePreparations,
      entrenchments: result.entrenchments,
      reconcentrationMoves: result.reconcentrationMoves,
      supplyPriorityChanges: result.supplyPriorityChanges,
      territoryStockDrawTurns: result.territoryStockDrawTurns
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
  lines.push(`## ${trace.id}`, '', `Seed ${trace.seed}, ${trace.difficulty}/${trace.policy}.`, '', '| Turn | Outcome | Control | Personnel | Ops | Moves | Defence/entrench/reconcentrate | Engineering | Supply priority/local stock | Hub upgrades/gain/value/loss |', '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const row of trace.snapshots) {
    lines.push(`| ${row.turn} | ${row.outcome}${row.defeatCause ? ` (${row.defeatCause})` : ''} | ${row.controlledTerritories} | ${row.activePersonnel} | ${row.operationsStarted}/${row.operationsJoined} | ${row.movesIssued} | ${row.defensivePreparations}/${row.entrenchments}/${row.reconcentrationMoves} | ${row.engineeringProjectsStarted} | ${row.supplyPriorityChanges}/${row.territoryStockDrawTurns} | ${row.hubUpgrades}/${row.hubCapacityGain}/${row.hubValueTurns}/${row.hubLosses} |`);
  }
  lines.push('');
}
writeFileSync(resolve(outputDir, 'current-engine-traces.md'), `${lines.join('\n')}\n`);
process.stdout.write(`${lines.join('\n')}\n`);
