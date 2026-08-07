const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Pages workflow queues in-progress runs instead of cancelling releases', () => {
  const workflow = fs.readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /Verify live deployment commit and title asset/);
});

test('production build writes a verified title-card deployment manifest', () => {
  const verifier = fs.readFileSync('scripts/verify-title-card-build.mjs', 'utf8');
  assert.match(verifier, /title-card-info\.json/);
  assert.match(verifier, /createHash\('sha256'\)/);
  assert.match(verifier, /path: `assets\/\$\{fileName\}`/);
  assert.match(verifier, /EXPECTED_SHA256/);
});

test('live deployment verification checks both commit metadata and the title-card bytes', () => {
  const verifier = fs.readFileSync('scripts/verify-pages-deployment.mjs', 'utf8');
  assert.match(verifier, /title-card-info\.json/);
  assert.match(verifier, /verifyTitleCard/);
  assert.match(verifier, /assetResponse\.arrayBuffer\(\)/);
  assert.match(verifier, /isWebP\(bytes\)/);
  assert.match(verifier, /actualHash !== expectedHash/);
});
