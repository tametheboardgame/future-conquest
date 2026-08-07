const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('startup experience always opens on the title launcher and inspects saved campaigns', () => {
  const source = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
  assert.match(source, /useState<StartupMode>\('launcher'\)/);
  assert.match(source, /inspectStoredCampaign/);
  assert.match(source, /CONTINUE CAMPAIGN/);
  assert.match(source, /BEGIN CAMPAIGN/);
  assert.match(source, /SETTINGS/);
  assert.match(source, /Replay prologue/);
  assert.match(source, /INTRO_STORAGE_KEY/);
});

test('global settings persist independently and expose audio and display controls', () => {
  const settings = fs.readFileSync('src/game/global-settings.ts', 'utf8');
  const panel = fs.readFileSync('src/components/GlobalSettingsPanel.tsx', 'utf8');
  const launcher = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');

  assert.match(settings, /future-conquest-global-settings-v1/);
  assert.match(panel, /Master volume/);
  assert.match(panel, /Music volume/);
  assert.match(panel, /Sound effects/);
  assert.match(panel, /Mute all/);
  assert.match(panel, /Toggle fullscreen/);
  assert.match(launcher, /global-settings-toggle/);
});

test('audio manager is registry based and Black Protocol Dawn is the first title and prologue track', () => {
  const audio = fs.readFileSync('src/audio/audio-manager.ts', 'utf8');
  const builder = fs.readFileSync('scripts/build-audio-assets.mjs', 'utf8');
  const verifier = fs.readFileSync('scripts/verify-pages-deployment.mjs', 'utf8');
  const packageJson = fs.readFileSync('package.json', 'utf8');

  assert.match(audio, /MUSIC_TRACKS/);
  assert.match(audio, /SFX_TRACKS/);
  assert.match(audio, /black-protocol-dawn\.mp3/);
  assert.match(audio, /title: 'black-protocol-dawn'/);
  assert.match(audio, /prologue: 'black-protocol-dawn'/);
  assert.match(builder, /80e691ed4c4e99f7e09f7b2cc9641e479acd1bdd0d51c5f504d2b0222257b622/);
  assert.match(builder, /6_085_073/);
  assert.match(builder, /response\.arrayBuffer/);
  assert.match(verifier, /audio\/black-protocol-dawn\.mp3/);
  assert.match(verifier, /SOUNDTRACK_SHA256/);
  assert.match(verifier, /verifySoundtrack/);
  assert.match(packageJson, /"build:audio": "node scripts\/build-audio-assets\.mjs"/);
});

test('launcher uses the approved title card rather than drawing a duplicate title over it', () => {
  const launcher = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
  const css = fs.readFileSync('src/components/startup-launcher.css', 'utf8');
  assert.doesNotMatch(launcher, /<h1>FUTURE/);
  assert.match(css, /title-card-future-conquest\.webp/);
  assert.match(css, /background-size: cover, cover, contain/);
});
