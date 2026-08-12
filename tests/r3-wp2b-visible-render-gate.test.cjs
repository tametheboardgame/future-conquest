const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/r3-wp2b-browser-runtime-probe.yml', 'utf8');
const css = fs.readFileSync('src/r3-terrain-prototype.css', 'utf8');

test('R3 WP2B browser gate enters the visible campaign map before judging terrain output', () => {
  assert.match(workflow, /future-conquest:intro-seen:v3/);
  assert.match(workflow, /BEGIN CAMPAIGN/);
  assert.match(workflow, /\[data-command-view=\\?"map\\?"\]/);
  assert.match(workflow, /command-map-workspace/);
  assert.match(workflow, /remained covered by the title launcher/);
});

test('R3 WP2B browser gate requires visible host and canvas dimensions plus rendered pixel variance', () => {
  assert.match(workflow, /Terrain visual DOM/);
  assert.match(workflow, /Terrain host has invalid visible dimensions/);
  assert.match(workflow, /r3-terrain-visible\.png/);
  assert.match(workflow, /quantisedColours/);
  assert.match(workflow, /dominantRatio/);
  assert.match(workflow, /visually blank or near-uniform/);
});

test('R3 WP2B keeps the MapLibre-mutated terrain host stretched over the map panel', () => {
  assert.match(css, /\.r3-terrain-prototype \.r3-terrain-prototype-canvas\.maplibregl-map\s*\{/);
  const ruleStart = css.indexOf('.r3-terrain-prototype .r3-terrain-prototype-canvas.maplibregl-map');
  const ruleEnd = css.indexOf('}', ruleStart);
  assert.ok(ruleStart >= 0 && ruleEnd > ruleStart);
  const rule = css.slice(ruleStart, ruleEnd + 1);
  assert.match(rule, /position:\s*absolute/);
  assert.match(rule, /inset:\s*0/);
});

test('R3 WP2B browser gate retains the rendered terrain screenshot for inspection', () => {
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /r3-terrain-visible-diagnostic/);
});
