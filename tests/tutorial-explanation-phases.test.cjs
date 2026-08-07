const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// These regressions keep page explanations readable and persistent without changing campaign mechanics.
test('Logistics and Intelligence retain three readable explanation phases after their pages open', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');

  assert.match(overlay, /previous === 'logistics' && current === 'intelligence'/);
  assert.match(overlay, /previous === 'intelligence' && current === 'engineering'/);
  assert.match(overlay, /id: 'logistics-network'/);
  assert.match(overlay, /id: 'logistics-priorities'/);
  assert.match(overlay, /id: 'logistics-consequences'/);
  assert.match(overlay, /id: 'intelligence-situation'/);
  assert.match(overlay, /id: 'intelligence-confidence'/);
  assert.match(overlay, /id: 'intelligence-decisions'/);
  assert.match(overlay, /EXPANDED_TOTAL_STEPS = 13/);
});

test('explanation progress survives reloads and supplies Continue and Back controls', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');

  assert.match(overlay, /future-conquest-tutorial-explanation-v1/);
  assert.match(overlay, /window\.localStorage\.setItem/);
  assert.match(overlay, /window\.localStorage\.removeItem/);
  assert.match(overlay, />Back<\/button>/);
  assert.match(overlay, />Continue<\/button>/);
  assert.match(overlay, /Find highlighted control/);
});

test('explanation focus does not apply the action-step full-screen dimming mask', () => {
  const css = fs.readFileSync('src/components/tutorial-explanation.css', 'utf8');
  const explanationRule = css.match(/\.tutorial-guide\.explanation \.tutorial-spotlight \{[\s\S]*?\}/)?.[0] ?? '';

  assert.match(explanationRule, /box-shadow:/);
  assert.doesNotMatch(explanationRule, /9999px/);
  assert.match(css, /data-mode='explanation'/);
});
