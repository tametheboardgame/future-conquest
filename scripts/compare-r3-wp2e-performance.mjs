import fs from 'node:fs';

const [basePath, headPath, outputPath, expectedBaseSha, expectedHeadSha] = process.argv.slice(2);
if (![basePath, headPath, outputPath, expectedBaseSha, expectedHeadSha].every(Boolean)) {
  throw new Error('usage: compare-r3-wp2e-performance.mjs BASE HEAD OUTPUT EXPECTED_BASE_SHA EXPECTED_HEAD_SHA');
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const head = JSON.parse(fs.readFileSync(headPath, 'utf8'));
const assertIdentity = (evidence, variant, buildSha) => {
  if (evidence.variant !== variant || evidence.buildSha !== buildSha) {
    throw new Error(`${variant} evidence identity mismatch: expected ${buildSha}, got ${evidence.variant}:${evidence.buildSha}`);
  }
};
assertIdentity(base, 'base', expectedBaseSha);
assertIdentity(head, 'head', expectedHeadSha);

const timingFields = ['firstUsefulPaintMs', 'campaignSettledMs', 'campaignToTheatreMs', 'theatreToSelectedMs'];
const networkFields = ['totalRequests', 'uniqueRequests', 'duplicateRequestCount', 'declaredBytes', 'transferredBytes', 'encodedBodyBytes'];

// These are regression guardrails, not optimisation targets. The relative and
// absolute tolerances deliberately absorb normal shared-runner variance while
// ensuring that a materially slower/heavier terrain renderer cannot stay green.
const regressionBudgets = [
  { group: 'timingsMs', field: 'firstUsefulPaintMs', relativeTolerance: 0.35, absoluteTolerance: 1000 },
  { group: 'timingsMs', field: 'campaignSettledMs', relativeTolerance: 0.30, absoluteTolerance: 2500 },
  { group: 'timingsMs', field: 'campaignToTheatreMs', relativeTolerance: 0.50, absoluteTolerance: 1000 },
  { group: 'timingsMs', field: 'theatreToSelectedMs', relativeTolerance: 0.30, absoluteTolerance: 2500 },
  { group: 'terrainNetwork', field: 'totalRequests', relativeTolerance: 0.20, absoluteTolerance: 10 },
  { group: 'terrainNetwork', field: 'uniqueRequests', relativeTolerance: 0.20, absoluteTolerance: 10 },
  { group: 'terrainNetwork', field: 'duplicateRequestCount', relativeTolerance: 1.00, absoluteTolerance: 10 },
  { group: 'terrainNetwork', field: 'transferredBytes', relativeTolerance: 0.20, absoluteTolerance: 1_048_576 }
];

const budgetChecks = regressionBudgets.map(budget => {
  const baseValue = base[budget.group][budget.field];
  const headValue = head[budget.group][budget.field];
  if (!Number.isFinite(baseValue) || !Number.isFinite(headValue)) {
    throw new Error(`performance evidence missing numeric ${budget.group}.${budget.field}`);
  }
  const allowedIncrease = Math.max(baseValue * budget.relativeTolerance, budget.absoluteTolerance);
  const maximumHeadValue = baseValue + allowedIncrease;
  return {
    ...budget,
    base: baseValue,
    head: headValue,
    maximumHeadValue,
    passed: headValue <= maximumHeadValue
  };
});
const failedBudgetChecks = budgetChecks.filter(check => !check.passed);

const comparison = {
  schemaVersion: 1,
  identities: {
    base: { variant: base.variant, buildSha: base.buildSha },
    head: { variant: head.variant, buildSha: head.buildSha }
  },
  timingsMs: Object.fromEntries(timingFields.map(field => [field, {
    base: base.timingsMs[field], head: head.timingsMs[field], delta: head.timingsMs[field] - base.timingsMs[field]
  }])),
  terrainNetwork: Object.fromEntries(networkFields.map(field => [field, {
    base: base.terrainNetwork[field], head: head.terrainNetwork[field], delta: head.terrainNetwork[field] - base.terrainNetwork[field]
  }])),
  regressionBudget: {
    passed: failedBudgetChecks.length === 0,
    checks: budgetChecks
  }
};
fs.writeFileSync(outputPath, `${JSON.stringify(comparison, null, 2)}\n`);
console.log(JSON.stringify(comparison, null, 2));

if (failedBudgetChecks.length > 0) {
  const failures = failedBudgetChecks
    .map(check => `${check.group}.${check.field}=${check.head} exceeds ${check.maximumHeadValue} (base ${check.base})`)
    .join('; ');
  throw new Error(`WP2E performance regression budget exceeded: ${failures}`);
}