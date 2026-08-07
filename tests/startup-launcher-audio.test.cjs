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

test('global settings persist independently and expose audio, track and display controls', () => {
  const settings = fs.readFileSync('src/game/global-settings.ts', 'utf8');
  const panel = fs.readFileSync('src/components/GlobalSettingsPanel.tsx', 'utf8');
  const launcher = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');

  assert.match(settings, /future-conquest-global-settings-v1/);
  assert.match(settings, /musicTrackId/);
  assert.match(settings, /black-protocol-dawn/);
  assert.match(panel, /Music track/);
  assert.match(panel, /MUSIC_TRACK_OPTIONS/);
  assert.match(panel, /Master volume/);
  assert.match(panel, /Music volume/);
  assert.match(panel, /Sound effects/);
  assert.match(panel, /Mute all/);
  assert.match(panel, /Toggle fullscreen/);
  assert.match(launcher, /global-settings-toggle/);
});

test('music library keeps Black Protocol Dawn and auto-discovers drop-in MP3 tracks', () => {
  const audio = fs.readFileSync('src/audio/audio-manager.ts', 'utf8');
  const library = fs.readFileSync('src/audio/music-library.ts', 'utf8');
  const readme = fs.readFileSync('src/assets/music/README.md', 'utf8');
  const builder = fs.readFileSync('scripts/build-audio-assets.mjs', 'utf8');
  const verifier = fs.readFileSync('scripts/verify-pages-deployment.mjs', 'utf8');
  const packageJson = fs.readFileSync('package.json', 'utf8');

  assert.match(audio, /resolveMusicTrackId/);
  assert.match(audio, /SFX_TRACKS/);
  assert.match(audio, /settings\.musicTrackId/);
  assert.match(library, /import\.meta\.glob\('\.\.\/assets\/music\/\*\.mp3'/);
  assert.match(library, /black-protocol-dawn\.mp3/);
  assert.match(library, /MUSIC_TRACK_OPTIONS/);
  assert.match(readme, /Drop additional `\.mp3` music files in this directory/);
  assert.match(builder, /80e691ed4c4e99f7e09f7b2cc9641e479acd1bdd0d51c5f504d2b0222257b622/);
  assert.match(builder, /6_085_073/);
  assert.match(builder, /response\.arrayBuffer/);
  assert.match(verifier, /audio\/black-protocol-dawn\.mp3/);
  assert.match(verifier, /SOUNDTRACK_SHA256/);
  assert.match(verifier, /verifySoundtrack/);
  assert.match(packageJson, /"build:audio": "node scripts\/build-audio-assets\.mjs"/);
});

test('music continues into gameplay and cycles through the complete library', () => {
  const audio = fs.readFileSync('src/audio/audio-manager.ts', 'utf8');
  const library = fs.readFileSync('src/audio/music-library.ts', 'utf8');
  const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');

  assert.match(audio, /game: 'playlist'/);
  assert.match(audio, /MUSIC_TRACK_OPTIONS\.findIndex/);
  assert.match(audio, /\(currentIndex \+ 1\) % MUSIC_TRACK_OPTIONS\.length/);
  assert.match(audio, /addEventListener\('ended'/);
  assert.match(audio, /playNextTrack\(\)/);
  assert.match(audio, /previousTrack !== nextTrack[\s\S]*playTrack\(nextTrack, 350\)/);
  assert.match(library, /loop: false/);
  assert.match(startup, /audioManager\.requestMusic\('game'\)/);
  assert.doesNotMatch(startup, /else \{\s*audioManager\.stopMusic\(\)/);
});

test('Engineering and Logistics stacks use the desktop scrolling contract', () => {
  const layout = fs.readFileSync('src/desktop-command-fit.css', 'utf8');
  assert.match(layout, /\.infrastructure-command-stack,\s*\.logistics-command-stack\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(layout, /\.infrastructure-command-stack,\s*\.logistics-command-stack\s*\{[\s\S]*?overscroll-behavior:\s*contain/);
  assert.match(layout, /\.infrastructure-command-stack,\s*\.logistics-command-stack\s*\{[\s\S]*?scrollbar-gutter:\s*stable/);
});

test('launcher uses the approved title card rather than drawing a duplicate title over it', () => {
  const launcher = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
  const css = fs.readFileSync('src/components/startup-launcher.css', 'utf8');
  assert.doesNotMatch(launcher, /<h1>FUTURE/);
  assert.match(css, /title-card-future-conquest\.webp/);
  assert.match(css, /background-size: cover, cover, contain/);
});
