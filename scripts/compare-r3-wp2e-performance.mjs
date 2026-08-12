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
  }]))
};
fs.writeFileSync(outputPath, `${JSON.stringify(comparison, null, 2)}\n`);
console.log(JSON.stringify(comparison, null, 2));
