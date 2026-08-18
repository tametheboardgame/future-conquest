const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_MUSIC_TRACK_ID,
  normaliseGlobalSettings
} = require('../.test-dist/global-settings.js');

const roadmap = fs.readFileSync('docs/roadmap/R3-WP7-AUDIO-MUSIC-ATMOSPHERE.md', 'utf8');
const audioManager = fs.readFileSync('src/audio/audio-manager.ts', 'utf8');
const musicLibrary = fs.readFileSync('src/audio/music-library.ts', 'utf8');
const musicReadme = fs.readFileSync('src/assets/music/README.md', 'utf8');
const settingsPanel = fs.readFileSync('src/components/GlobalSettingsPanel.tsx', 'utf8');
const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
const director = fs.readFileSync('src/audio/campaign-audio-director.ts', 'utf8');
const audioBuild = fs.readFileSync('scripts/build-audio-assets.mjs', 'utf8');

const expectedTracks = [
  'black-protocol-dawn',
  'protocol-zero',
  'rising-tension',
  'combat-i',
  'combat-ii'
];

test('WP7 explicitly protects the existing music system and controls', () => {
  assert.match(roadmap, /must extend, not replace, the audio system already in production/i);
  assert.match(roadmap, /global music-track picker remains available/i);
  assert.match(roadmap, /master, music and sound-effects volume controls remain available and persistent/i);
  assert.match(roadmap, /Black Protocol Dawn`? remains the verified built-in default\/title track/i);
  assert.match(roadmap, /Manual playlist: preserves the current player-selected starting track and playlist behaviour/i);
});

test('the existing five-track library remains discoverable and context playlists use it', () => {
  assert.match(musicLibrary, /import\.meta\.glob\('\.\.\/assets\/music\/\*\.mp3'/);
  assert.match(musicReadme, /Drop additional `\.mp3` music files in this directory/);
  assert.match(musicLibrary, /label: 'Black Protocol Dawn'/);
  for (const track of expectedTracks.slice(1)) assert.match(musicLibrary, new RegExp(track));
  assert.match(musicLibrary, /combat:\s*\['combat-i', 'combat-ii', 'rising-tension'\]/);
  assert.match(musicLibrary, /tension:\s*\['rising-tension', 'protocol-zero', DEFAULT_MUSIC_TRACK_ID\]/);
});

test('legacy non-default track selection migrates to Manual mode rather than being overridden', () => {
  const migrated = normaliseGlobalSettings({ musicTrackId: 'combat-i' });
  assert.equal(migrated.musicTrackId, 'combat-i');
  assert.equal(migrated.musicMode, 'manual');

  const defaultMigration = normaliseGlobalSettings({ musicTrackId: DEFAULT_MUSIC_TRACK_ID });
  assert.equal(defaultMigration.musicMode, 'adaptive');

  const explicitAdaptive = normaliseGlobalSettings({ musicTrackId: 'combat-i', musicMode: 'adaptive' });
  assert.equal(explicitAdaptive.musicMode, 'adaptive');
  assert.equal(DEFAULT_GLOBAL_SETTINGS.musicMode, 'adaptive');
});

test('settings keep the existing picker, mute and all three volume controls', () => {
  assert.match(settingsPanel, />Music track</);
  assert.match(settingsPanel, />Mute all</);
  assert.match(settingsPanel, />Master volume</);
  assert.match(settingsPanel, />Music volume</);
  assert.match(settingsPanel, />Sound effects</);
  assert.match(settingsPanel, />Adaptive soundtrack</);
  assert.match(settingsPanel, />Manual playlist</);
});

test('audio manager retains authored SFX extensibility and adds graceful procedural fallbacks', () => {
  assert.match(audioManager, /export const SFX_TRACKS/);
  assert.match(audioManager, /new Audio\(track\.src\)/);
  assert.match(audioManager, /PROCEDURAL_SFX/);
  assert.match(audioManager, /musicPlaylistForContext/);
  assert.match(audioManager, /this\.settings\.masterVolume \* this\.settings\.sfxVolume/);
  assert.match(audioManager, /if \(this\.settings\.muted\) return/);
  assert.match(audioManager, /typeof AudioContext === 'undefined'/);
  assert.match(audioManager, /resolvedTrackId !== DEFAULT_GLOBAL_SETTINGS\.musicTrackId/);
});

test('campaign audio is presentation-only and reacts to already visible command state', () => {
  assert.match(startup, /installCampaignAudioDirector/);
  assert.match(startup, /audioManager\.requestMusic\('victory'\)/);
  assert.match(startup, /audioManager\.requestMusic\('defeat'\)/);
  assert.match(director, /Presentation-only campaign audio bridge/);
  assert.match(director, /\.combat-report-alert/);
  assert.match(director, /\.supply-warning-dialog/);
  assert.match(director, /\.priority-order-action\.attack/);
  assert.doesNotMatch(director, /from '\.\.\/game\/engine'/);
});

test('the verified Black Protocol Dawn build contract remains intact', () => {
  assert.match(audioBuild, /black-protocol-dawn\.mp3/);
  assert.match(audioBuild, /EXPECTED_LENGTH = 6_085_073/);
  assert.match(audioBuild, /EXPECTED_SHA256 = '80e691ed4c4e99f7e09f7b2cc9641e479acd1bdd0d51c5f504d2b0222257b622'/);
});
