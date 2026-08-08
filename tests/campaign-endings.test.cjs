const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const story = fs.readFileSync('src/game/ending-story.ts', 'utf8');
const component = fs.readFileSync('src/components/CampaignEndingExperience.tsx', 'utf8');
const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
const settings = fs.readFileSync('src/components/GlobalSettingsPanel.tsx', 'utf8');
const builder = fs.readFileSync('scripts/build-ending-assets.mjs', 'utf8');
const verifier = fs.readFileSync('scripts/verify-ending-assets.mjs', 'utf8');
const packageJson = fs.readFileSync('package.json', 'utf8');

test('victory epilogue contains the causal-loop reveal', () => {
  assert.match(story, /The divergence begins here\./);
  assert.match(story, /At the incursion\./);
  assert.match(story, /It had travelled back to begin it\./);
  assert.match(story, /YOU WON THE WAR\. YOU CREATED THE FUTURE\./);
  assert.match(story, /victory-06-the-loop\.webp/);
});

test('victory ending reuses motion-comic interaction patterns', () => {
  assert.match(component, /Victory epilogue timeline/);
  assert.match(component, /type="range"/);
  assert.match(component, /Subtitles \{showSubtitles \? 'on' : 'off'\}/);
  assert.match(component, /onMutedChange\(!muted\)/);
  assert.match(component, /onOpenSettings/);
  assert.match(component, /Skip to ending/);
});

test('defeat ending exposes restart, reload and title actions', () => {
  assert.match(component, /Reload last save/);
  assert.match(component, /Start new campaign/);
  assert.match(component, /Return to title/);
  assert.match(component, /defeat-campaign-failed\.webp/);
});

test('startup automatically promotes real engine outcomes into ending presentation', () => {
  assert.match(startup, /command-outcome\.victory/);
  assert.match(startup, /command-outcome\.defeat/);
  assert.match(startup, /VictoryEndingComic/);
  assert.match(startup, /CampaignDefeatScreen/);
});

test('settings includes temporary ending preview triggers', () => {
  assert.match(settings, /ENDING PREVIEW/);
  assert.match(settings, /Preview victory ending/);
  assert.match(settings, /Preview defeat screen/);
});

test('ending artwork uses verified high-resolution build reconstruction', () => {
  assert.match(builder, /BUNDLE_LENGTH = 988_260/);
  assert.match(builder, /PART_COUNT = 13/);
  assert.match(builder, /width: 1672, height: 941/);
  assert.match(verifier, /Verified .* campaign ending assets/);
  assert.match(packageJson, /"build:endings": "node scripts\/build-ending-assets\.mjs"/);
  assert.match(packageJson, /verify-ending-assets\.mjs/);
});
