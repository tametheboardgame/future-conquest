import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';

const argumentValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
};

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const runsPerStart = positiveInteger(
  argumentValue('runs-per-start') ?? process.env.FC_BALANCE_RUNS_PER_START,
  4
);
const maxTurns = positiveInteger(
  argumentValue('max-turns') ?? process.env.FC_BALANCE_MAX_TURNS,
  120
);
const seedOffset = nonNegativeInteger(
  argumentValue('seed-offset') ?? process.env.FC_BALANCE_SEED_OFFSET,
  1
);
const outputDir = resolve(
  process.cwd(),
  argumentValue('output-dir') ?? process.env.FC_BALANCE_OUTPUT_DIR ?? 'balance-output'
);

rmSync('.balance-dist', { recursive: true, force: true });
execFileSync(tsc, ['-p', 'tsconfig.test.json', '--outDir', '.balance-dist'], { stdio: 'inherit' });
writeFileSync('.balance-dist/package.json', '{"type":"commonjs"}\n');

const {
  runCurrentEngineBalanceSimulation,
  renderCurrentEngineBalanceMarkdown
} = require(resolve(process.cwd(), '.balance-dist/balance-simulation.js'));

const report = runCurrentEngineBalanceSimulation({
  runsPerStart,
  maxTurns,
  seedOffset
});
const markdown = renderCurrentEngineBalanceMarkdown(report);

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'current-engine-balance.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outputDir, 'current-engine-balance.md'), markdown);
process.stdout.write(markdown);
console.log(`\nWrote balance outputs to ${outputDir}`);
