const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// These regressions keep page explanations readable and persistent without changing campaign mechanics.
test('Forces, Logistics and Intelligence retain readable explanation phases after their action steps', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');

  assert.match(overlay, /previous === 'formation' && current === 'operation'/);
  assert.match(overlay, /id: 'forces-organisation'/);
  assert.match(overlay, /Split creates a new independent formation/);
  assert.match(overlay, /Transfer moves personnel or armour/);
  assert.match(overlay, /Merge combines compatible formations/);
  assert.match(overlay, /You do not need to reorganise anything now/);
  assert.match(overlay, /previous === 'logistics' && current === 'intelligence'/);
  assert.match(overlay, /previous === 'intelligence' && current === 'engineering'/);
  assert.match(overlay, /id: 'logistics-network'/);
  assert.match(overlay, /id: 'logistics-priorities'/);
  assert.match(overlay, /id: 'logistics-consequences'/);
  assert.match(overlay, /id: 'intelligence-situation'/);
  assert.match(overlay, /id: 'intelligence-confidence'/);
  assert.match(overlay, /id: 'intelligence-decisions'/);
  assert.match(overlay, /EXPANDED_TOTAL_STEPS = 19/);
});

test('explanation progress survives reloads and action steps no longer need a recovery button', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');

  assert.match(overlay, /future-conquest-tutorial-explanation-v2/);
  assert.match(overlay, /window\.localStorage\.setItem/);
  assert.match(overlay, /window\.localStorage\.removeItem/);
  assert.match(overlay, />Back<\/button>/);
  assert.match(overlay, /'Finish tutorial' : 'Continue'/);
  assert.doesNotMatch(overlay, /Find highlighted control/);
  assert.doesNotMatch(overlay, /focusControl/);
});

test('guided tutorial auto-runs once and SYS can deliberately replay it', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const css = fs.readFileSync('src/components/tutorial-explanation.css', 'utf8');

  assert.match(overlay, /future-conquest-tutorial-seen-v1/);
  assert.match(overlay, /future-conquest-tutorial-replay-v1/);
  assert.match(overlay, /button\?\.textContent\?\.trim\(\) !== 'Restart tutorial'/);
  assert.match(overlay, /previous === 'engineering' && current === undefined/);
  assert.match(overlay, /if \(!step \|\| !tutorialSeen \|\| replayRequested\) return/);
  assert.match(css, /\.tutorial-seen \.tutorial-toggle/);
});

test('explanation focus does not apply the action-step full-screen dimming mask', () => {
  const css = fs.readFileSync('src/components/tutorial-explanation.css', 'utf8');
  const explanationRule = css.match(/\.tutorial-guide\.explanation \.tutorial-spotlight \{[\s\S]*?\}/)?.[0] ?? '';

  assert.match(explanationRule, /box-shadow:/);
  assert.doesNotMatch(explanationRule, /9999px/);
  assert.match(css, /data-mode='explanation'/);
});