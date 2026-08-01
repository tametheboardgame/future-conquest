const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const layoutCss = readFileSync('src/command-panel-layout.css', 'utf8');
const mainSource = readFileSync('src/main.tsx', 'utf8');

test('command panel layout override loads after the base stylesheet', () => {
  const baseIndex = mainSource.indexOf("import './styles.css';");
  const overrideIndex = mainSource.indexOf("import './command-panel-layout.css';");
  assert.ok(baseIndex >= 0, 'base stylesheet import is missing');
  assert.ok(overrideIndex > baseIndex, 'layout override must load after the base stylesheet');
});

test('command panel uses normal document flow rather than a shrinking flex column', () => {
  assert.match(layoutCss, /\.command-panel\s*\{[^}]*display:\s*block;/s);
  assert.match(layoutCss, /\.command-panel\s*>\s*section\s*\{[^}]*flex:\s*none;/s);
  assert.match(layoutCss, /\.command-panel\s*>\s*section\s*\{[^}]*min-height:\s*0;/s);
});

test('panel controls no longer consume remaining flex space', () => {
  assert.match(layoutCss, /\.command-panel\s+\.controls\s*\{[^}]*margin-top:\s*0;/s);
  assert.doesNotMatch(layoutCss, /margin-top:\s*auto/);
});

test('the whole panel remains vertically scrollable at map height', () => {
  assert.match(layoutCss, /\.command-panel\s*\{[^}]*height:\s*754px;/s);
  assert.match(layoutCss, /\.command-panel\s*\{[^}]*overflow-y:\s*auto;/s);
});
