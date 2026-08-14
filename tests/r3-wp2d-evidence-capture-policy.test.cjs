const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/r3-wp2d-visual-runtime-probe.yml', 'utf8');

test('WP2D uses reduced motion to gate settled visual states', () => {
  // Normal camera animation behaviour is intentionally owned by other gates; WP2D verifies settled hierarchy/LOD.
  assert.match(
    workflow,
    /browser\.newPage\(\{\s*viewport: \{ width: 1600, height: 1000 \},\s*reducedMotion: 'reduce'\s*\}\)/
  );
  assert.match(workflow, /WP2D gates settled visual states; normal camera animation behaviour remains owned by other gates\./);
});

test('WP2D evidence screenshots are bounded and non-gating', () => {
  const captureStart = workflow.indexOf('const captureEvidence = async viewName =>');
  const verifyStart = workflow.indexOf('const verifyView = async (viewName, expectedLod, expectedRelief, activate = true) =>');
  assert.ok(captureStart >= 0 && verifyStart > captureStart, 'bounded evidence helper must precede view verification');

  const capture = workflow.slice(captureStart, verifyStart);
  assert.match(capture, /try\s*\{/);
  assert.match(capture, /\.screenshot\(\{/);
  assert.match(capture, /timeout: 5000/);
  assert.match(capture, /catch \(error\)/);
  assert.match(capture, /evidence capture skipped after bounded timeout/);
  assert.doesNotMatch(capture, /throw error/);
});

test('WP2D asserts the initial Campaign state without a redundant camera transaction', () => {
  const verifyStart = workflow.indexOf('const verifyView = async (viewName, expectedLod, expectedRelief, activate = true) =>');
  const campaign = workflow.indexOf("await verifyView('campaign', 'campaign', 'physical', false);");
  const theatre = workflow.indexOf("await verifyView('theatre', 'theatre', 'strategic-flat');");
  assert.ok(verifyStart >= 0 && campaign > verifyStart, 'Campaign must be verified through the common gating helper');
  assert.ok(campaign < theatre, 'initial Campaign state must be asserted before Theatre');
  assert.match(workflow, /if \(activate\) \{[\s\S]*?await button\.click\(\);[\s\S]*?\}/);
  assert.match(workflow, /renderer already starts at Campaign\. Assert that settled state in place rather than issuing a redundant camera transaction/);
  assert.match(workflow, /await page\.waitForTimeout\(900\);/);
});

test('WP2D assertions remain gating before a single post-Selected evidence capture', () => {
  const lodAssertion = workflow.indexOf('if (result.lod !== expectedLod) throw new Error');
  const campaign = workflow.indexOf("await verifyView('campaign', 'campaign', 'physical', false);");
  const theatre = workflow.indexOf("await verifyView('theatre', 'theatre', 'strategic-flat');");
  const selected = workflow.indexOf("await verifyView('selected', 'local', 'physical');");
  const captureCall = workflow.indexOf("await captureEvidence('selected');");
  const browserClose = workflow.indexOf('await browser.close();', captureCall);
  const captureCalls = [...workflow.matchAll(/await captureEvidence\(/g)].map(match => match.index);

  assert.ok(lodAssertion >= 0 && lodAssertion < campaign, 'runtime assertions must remain inside gating verification');
  assert.ok(campaign < theatre && theatre < selected, 'views must gate in Campaign, Theatre, Selected order');
  assert.ok(selected < captureCall, 'evidence capture must occur only after Selected verification');
  assert.deepEqual(captureCalls, [captureCall], 'no evidence capture may run inside or before the three view gates');
  assert.ok(captureCall < browserClose, 'browser close must immediately follow best-effort capture');
  assert.match(workflow, /if-no-files-found: ignore/);
});
