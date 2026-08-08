const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const fit = fs.readFileSync('src/responsive-command-fit.css', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');

function importIndex(path) {
  return main.indexOf(`import '${path}';`);
}

test('WP9 responsive contract loads after every feature stylesheet', () => {
  const responsive = importIndex('./responsive-command-fit.css');
  assert.ok(responsive > 0, 'responsive command fit stylesheet must be imported');
  for (const feature of [
    './desktop-command-fit.css',
    './infrastructure-command.css',
    './logistics-priorities.css',
    './defence.css',
    './combat-reports.css'
  ]) {
    assert.ok(importIndex(feature) >= 0, `${feature} must remain imported`);
    assert.ok(responsive > importIndex(feature), `WP9 contract must load after ${feature}`);
  }
});

test('WP9 removes the legacy 1240px document floor at final cascade priority', () => {
  assert.match(fit, /body\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow-x:\s*hidden;/);
  assert.match(fit, /\.command-app-shell[\s\S]*?width:\s*100%;/);
  assert.match(fit, /\.command-workspace,[\s\S]*?\.command-stage,[\s\S]*?min-width:\s*0;/);
});

test('WP9 fits laptop browsers below the old 720px height threshold', () => {
  assert.match(fit, /@media \(min-width: 901px\) and \(min-height: 560px\)/);
  assert.match(fit, /height:\s*100dvh;/);
  assert.match(fit, /body\s*\{\s*overflow:\s*hidden;/);
  assert.match(fit, /@media \(min-width: 901px\) and \(min-height: 560px\) and \(max-height: 719px\)/);
  assert.match(fit, /grid-template-rows:\s*repeat\(8, minmax\(34px, 1fr\)\)/);
});

test('WP9 navigation allocates one fitted row for all eight persistent commands', () => {
  assert.match(fit, /grid-template-rows:\s*repeat\(8, minmax\(42px, 1fr\)\)/);
  assert.match(fit, /\.command-nav-items button\s*\{\s*min-height:\s*42px;/);
  assert.doesNotMatch(fit, /repeat\(6,/);
});

test('WP9 prevents Logistics and Infrastructure from restoring a 754px minimum', () => {
  assert.match(fit, /\.command-view,[\s\S]*?\.infrastructure-view,[\s\S]*?\.logistics-priority-view,[\s\S]*?min-height:\s*0;/);
  assert.match(fit, /\.map-context-panel,[\s\S]*?\.command-view,[\s\S]*?overflow-y:\s*auto;/);
  assert.match(fit, /scrollbar-gutter:\s*stable;/);
});

test('WP9 makes the map and metrics fluid on compact desktop widths', () => {
  assert.match(fit, /grid-template-columns:\s*minmax\(0, 1fr\) clamp\(292px, 26vw, 360px\)/);
  assert.match(fit, /grid-template-columns:\s*repeat\(5, minmax\(88px, 1fr\)\) minmax\(170px, 1\.45fr\)/);
  assert.match(fit, /@media \(min-width: 901px\) and \(max-width: 1180px\)/);
  assert.match(fit, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(270px, 31vw\)/);
  assert.match(fit, /\.forces-command-grid,[\s\S]*?\.campaign-command-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test('WP9 preserves a true narrow-screen layout without horizontal document overflow', () => {
  assert.match(fit, /@media \(max-width: 900px\)/);
  assert.match(fit, /\.command-app-shell,[\s\S]*?\.app-shell\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/);
  assert.match(fit, /@media \(max-width: 640px\)/);
  assert.match(fit, /\.topbar-command-actions\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(fit, /\.infrastructure-tabs,[\s\S]*?\.logistics-tabs\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});
