const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/r3-wp2b-browser-runtime-probe.yml', 'utf8');

test('R3 WP2B browser gate requires visible canvas dimensions and rendered pixel variance', () => {
  assert.match(workflow, /Terrain visual DOM/);
  assert.match(workflow, /r3-terrain-visible\.png/);
  assert.match(workflow, /quantisedColours/);
  assert.match(workflow, /dominantRatio/);
  assert.match(workflow, /visually blank or near-uniform/);
});

test('R3 WP2B browser gate retains the rendered terrain screenshot for inspection', () => {
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /r3-terrain-visible-diagnostic/);
});
