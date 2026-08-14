const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/r3-wp2d-visual-runtime-probe.yml', 'utf8');

test('WP2D evidence screenshots are bounded and non-gating', () => {
  const captureStart = workflow.indexOf('const captureEvidence = async viewName =>');
  const verifyStart = workflow.indexOf('const verifyView = async (viewName, expectedLod, expectedRelief) =>');
  assert.ok(captureStart >= 0 && verifyStart > captureStart, 'bounded evidence helper must precede view verification');

  const capture = workflow.slice(captureStart, verifyStart);
  assert.match(capture, /try\s*\{/);
  assert.match(capture, /\.screenshot\(\{/);
  assert.match(capture, /timeout: 5000/);
  assert.match(capture, /catch \(error\)/);
  assert.match(capture, /evidence capture skipped after bounded timeout/);
  assert.doesNotMatch(capture, /throw error/);
});

test('WP2D assertions remain gating and Selected runs after best-effort Theatre capture', () => {
  const lodAssertion = workflow.indexOf('if (result.lod !== expectedLod) throw new Error');
  const captureCall = workflow.indexOf('await captureEvidence(viewName);');
  const campaign = workflow.indexOf("await verifyView('campaign', 'campaign', 'physical');");
  const theatre = workflow.indexOf("await verifyView('theatre', 'theatre', 'strategic-flat');");
  const selected = workflow.indexOf("await verifyView('selected', 'local', 'physical');");

  assert.ok(lodAssertion >= 0 && lodAssertion < captureCall, 'runtime assertions must gate before evidence capture');
  assert.ok(campaign < theatre && theatre < selected, 'Selected verification must still run after Theatre');
  assert.match(workflow, /if-no-files-found: ignore/);
});
