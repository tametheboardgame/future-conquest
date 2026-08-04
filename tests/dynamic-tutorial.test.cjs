const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('guided tutorial anchors to the actionable control instead of a fixed mobile card', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const css = fs.readFileSync('src/operational-clarity.css', 'utf8');

  assert.match(overlay, /document\.querySelector<HTMLElement>\(anchorSelector\)/);
  assert.match(overlay, /getBoundingClientRect\(\)/);
  assert.match(overlay, /scrollIntoView\(\{ block: 'center'/);
  assert.match(overlay, /ResizeObserver/);
  assert.match(overlay, /visualViewport/);
  assert.match(app, /tutorialAnchorSelector/);
  assert.match(app, /data-tutorial="garrison-action"/);
  assert.match(app, /data-tutorial="resolve-day"/);
  assert.match(app, /data-tutorial="command-map"/);
  assert.match(app, /anchorSelector=\{tutorialAnchorSelector\}/);
  assert.match(css, /\.tutorial-guide[\s\S]*pointer-events:\s*none/);
  assert.match(css, /\.tutorial-overlay[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /data-placement='above'/);
});

test('occupation guidance resolves combat before spotlighting the garrison action', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const engine = fs.readFileSync('src/game/engine.ts', 'utf8');
  assert.match(app, /if \(capturedGroundReady\) return '\[data-tutorial=\"garrison-action\"\]'/);
  assert.match(app, /if \(operations\.length > 0\) return '\[data-tutorial=\"resolve-day\"\]'/);
  assert.match(app, /selectedGroup\.location !== state\.portalTerritory/);
  assert.match(engine, /next\.selectedTerritory = operation\.target;\s+next\.targetTerritory = null;/);
});
