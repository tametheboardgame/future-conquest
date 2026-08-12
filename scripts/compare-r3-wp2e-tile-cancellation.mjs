import fs from 'node:fs';

const [defaultPath, retainedPath, output = 'artifacts/r3-wp2e-tile-cancellation-comparison.json'] = process.argv.slice(2);
if (!defaultPath || !retainedPath) {
  throw new Error('usage: compare-r3-wp2e-tile-cancellation.mjs <default.json> <retained.json> [output.json]');
}

const baseline = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(retainedPath, 'utf8'));
if (baseline.presentationProfile !== 'full' || candidate.presentationProfile !== 'full') {
  throw new Error('tile cancellation A/B must use the full terrain profile');
}
if (baseline.tileRequestPolicy !== 'cancel-pending' || candidate.tileRequestPolicy !== 'retain-pending') {
  throw new Error('tile cancellation A/B variants are mislabeled');
}

const ratio = (value, reference) => reference === 0 ? null : value / reference;
const resourceRatios = {
  totalRequests: ratio(candidate.terrainNetwork.totalRequests, baseline.terrainNetwork.totalRequests),
  transferredBytes: ratio(candidate.terrainNetwork.transferredBytes, baseline.terrainNetwork.transferredBytes),
  encodedBodyBytes: ratio(candidate.terrainNetwork.encodedBodyBytes, baseline.terrainNetwork.encodedBodyBytes)
};
const settleRatios = {
  campaignToTheatreMs: ratio(candidate.timingsMs.campaignToTheatreMs, baseline.timingsMs.campaignToTheatreMs),
  theatreToSelectedMs: ratio(candidate.timingsMs.theatreToSelectedMs, baseline.timingsMs.theatreToSelectedMs)
};
const within = (value, ceiling) => value === null || value <= ceiling;
const comparison = {
  schemaVersion: 1,
  experiment: 'cancelPendingTileRequestsWhileZooming',
  baseline: { path: defaultPath, value: true },
  candidate: { path: retainedPath, value: false },
  resourceRatios,
  settleRatios,
  visualEvidence: {
    baseline: baseline.visualEvidence,
    candidate: candidate.visualEvidence,
    requiresHumanSmoothnessReview: true
  },
  resourcePressureAcceptable: Object.values(resourceRatios).every(value => within(value, 1.2)),
  settleAcceptable: Object.values(settleRatios).every(value => within(value, 1.1))
};
comparison.keepCandidate = comparison.resourcePressureAcceptable
  && comparison.settleAcceptable
  && !comparison.visualEvidence.requiresHumanSmoothnessReview;
comparison.decision = comparison.keepCandidate
  ? 'eligible-after-visual-review'
  : 'do-not-ship-without-positive-visual-review-and-acceptable-resource-pressure';

fs.mkdirSync(output.slice(0, output.lastIndexOf('/')) || '.', { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(comparison, null, 2)}\n`);
console.log(JSON.stringify(comparison, null, 2));
