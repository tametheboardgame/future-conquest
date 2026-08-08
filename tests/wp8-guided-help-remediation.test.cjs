const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('WP8 action steps explain purpose and an observable completion condition', () => {
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');

  assert.match(clarity, /why: string;/);
  assert.match(clarity, /completion: string;/);
  assert.match(clarity, /Taking a province and controlling it are different problems/);
  assert.match(clarity, /The tutorial completes after that walkthrough, not merely when the page opens/);
  assert.match(overlay, /WHY IT MATTERS/);
  assert.match(overlay, /COMPLETE WHEN/);
  assert.match(overlay, /data-wp8-action-context="true"/);
  assert.match(overlay, /advances only after the game confirms it/);
});

test('WP8 teaches the real post-remediation combat and defence command model', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(overlay, /previous === 'operation' && current === 'occupation'/);
  assert.match(overlay, /topic: 'operations'/);
  assert.match(overlay, /multi-day operation, not an instant territory flip/);
  assert.match(overlay, /previous === 'occupation' && current === 'movement'/);
  assert.match(overlay, /topic: 'defence'/);
  assert.match(overlay, /Entrench, Prepare defence, Reinforce and Prioritise supply/);
  assert.match(app, /data-tutorial="formation-orders"/);
  assert.match(overlay, /\.territory-defence-section/);
});

test('WP8 logistics guidance reflects distributed sources and current WP6 screen anchors', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const logistics = fs.readFileSync('src/components/LogisticsCommand.tsx', 'utf8');

  assert.doesNotMatch(overlay, /Source use shows pressure on the portal/);
  assert.doesNotMatch(overlay, /focusSelector: '\.supply-diagnostics-panel'/);
  assert.match(overlay, /Controlled territories generate distributed source capacity/);
  assert.match(overlay, /data-tutorial=\"logistics-flow\"/);
  assert.match(overlay, /data-tutorial=\"logistics-doctrine\"/);
  assert.match(overlay, /data-tutorial=\"logistics-reserves\"/);
  assert.match(logistics, /data-tutorial="logistics-flow"/);
  assert.match(logistics, /data-tutorial="logistics-doctrine"/);
  assert.match(logistics, /data-tutorial="logistics-reserves"/);
});

test('WP8 does not end the tutorial merely because Infrastructure was opened', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const infrastructure = fs.readFileSync('src/components/InfrastructureCommand.tsx', 'utf8');

  assert.match(overlay, /previous === 'engineering' && current === undefined/);
  assert.match(overlay, /setExplanation\(\{ topic: 'infrastructure', phase: 0 \}\)/);
  assert.match(overlay, /id: 'infrastructure-repair'/);
  assert.match(overlay, /id: 'infrastructure-interdict'/);
  assert.match(overlay, /id: 'infrastructure-eligibility'/);
  assert.match(overlay, /finishedTopic === 'infrastructure'/);
  assert.match(overlay, /Finish tutorial/);
  assert.match(infrastructure, /data-tutorial="infrastructure-repair"/);
  assert.match(infrastructure, /data-tutorial="infrastructure-interdict"/);
  assert.match(infrastructure, /data-tutorial="infrastructure-rules"/);
});

test('WP8 expands the guided curriculum to 19 visible phases without changing campaign tutorial schema', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const types = fs.readFileSync('src/game/types.ts', 'utf8');

  assert.match(overlay, /EXPANDED_TOTAL_STEPS = 19/);
  assert.match(overlay, /formation: 1/);
  assert.match(overlay, /operation: 3/);
  assert.match(overlay, /occupation: 5/);
  assert.match(overlay, /movement: 7/);
  assert.match(overlay, /logistics: 8/);
  assert.match(overlay, /intelligence: 12/);
  assert.match(overlay, /engineering: 16/);
  assert.match(types, /export interface TutorialState \{/);
  assert.doesNotMatch(types, /explanationTopic/);
});

test('WP8 docks action guidance away from mobile targets instead of covering the requested control', () => {
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const css = fs.readFileSync('src/components/tutorial-explanation.css', 'utf8');

  assert.match(overlay, /targetCentre >= viewportCentre/);
  assert.match(overlay, /placement: dockAboveTarget \? 'docked-top' : 'docked-bottom'/);
  assert.match(css, /data-placement='docked-top'/);
  assert.match(css, /data-placement='docked-bottom'/);
  assert.match(css, /max-height: 44vh/);
});

test('WP8 release marker is visible while underlying tutorial trigger semantics remain action-driven', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');

  assert.match(app, /WP8 GUIDED HELP/);
  assert.match(clarity, /trigger: 'select-formation'/);
  assert.match(clarity, /trigger: 'begin-operation'/);
  assert.match(clarity, /trigger: 'set-garrison'/);
  assert.match(clarity, /trigger: 'issue-move'/);
  assert.match(clarity, /trigger: 'open-logistics'/);
  assert.match(clarity, /trigger: 'review-intelligence'/);
  assert.match(clarity, /trigger: 'open-engineering'/);
});
