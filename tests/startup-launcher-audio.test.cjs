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
  const packageJson = fs.readFileSync('package.json', 'utf8');

  assert.match(audio, /MUSIC_TRACKS/);
  assert.match(audio, /SFX_TRACKS/);
  assert.match(audio, /black-protocol-dawn\.webm/);
  assert.match(audio, /title: 'black-protocol-dawn'/);
  assert.match(audio, /prologue: 'black-protocol-dawn'/);
  assert.match(builder, /f030c8ea0d16b06eda35d245b0e119820e8960d77965d73e4c581672b4888c85/);
  assert.match(builder, /1_676_274/);
  assert.match(packageJson, /"build:audio": "node scripts\/build-audio-assets\.mjs"/);
});

test('launcher uses the approved title card rather than drawing a duplicate title over it', () => {
  const launcher = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
  const css = fs.readFileSync('src/components/startup-launcher.css', 'utf8');
  assert.doesNotMatch(launcher, /<h1>FUTURE/);
  assert.match(css, /title-card-future-conquest\.webp/);
  assert.match(css, /background-size: cover, cover, contain/);
});
