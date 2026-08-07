const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const intro = fs.readFileSync('src/components/MotionComicIntro.tsx', 'utf8');
const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
const polish = fs.readFileSync('src/components/motion-comic-final-polish.css', 'utf8');

test('prologue subtitles default off and persist the last user choice', () => {
  assert.match(intro, /INTRO_SUBTITLE_STORAGE_KEY = 'future-conquest:intro-subtitles:v1'/);
  assert.match(intro, /getItem\(INTRO_SUBTITLE_STORAGE_KEY\) === 'true'/);
  assert.match(intro, /setItem\(INTRO_SUBTITLE_STORAGE_KEY, String\(showSubtitles\)\)/);
  assert.match(intro, /useState\(\(\) => loadSubtitlePreference\(\)\)/);
});

test('prologue exposes native mute and global settings controls', () => {
  assert.match(intro, /onMutedChange\?: \(muted: boolean\) => void/);
  assert.match(intro, /onOpenSettings\?: \(\) => void/);
  assert.match(intro, />\{muted \? 'Unmute' : 'Mute'\}<\/button>/);
  assert.match(intro, />Settings<\/button>/);
  assert.match(startup, /muted=\{settings\.muted\}/);
  assert.match(startup, /onMutedChange=\{setMuted\}/);
  assert.match(startup, /onOpenSettings=\{openSettings\}/);
});

test('timeline is scrubbable without losing timed caption state', () => {
  assert.match(intro, /INTRO_TIMELINE_DURATION_MS/);
  assert.match(intro, /type="range"/);
  assert.match(intro, /aria-label="Introduction timeline"/);
  assert.match(intro, /onPointerDown=\{beginScrub\}/);
  assert.match(intro, /onPointerUp=\{finishScrub\}/);
  assert.match(intro, /seekToTimeline\(Number\(event\.target\.value\)\)/);
  assert.match(intro, /setElapsedMs\(Math\.min\(remaining, INTRO_STEP_DURATIONS\[nextStep\]/);
});

test('bubble placement protects speaker targets and subtitle safe space', () => {
  assert.match(intro, /const bottomPadding = subtitlesVisibleInViewport \? 112 : 26/);
  assert.match(intro, /const targetCovered = targetLeft >= left - 8/);
  assert.match(intro, /const candidates = \[/);
  assert.match(intro, /coversTarget \? 100000 : 0/);
  assert.match(intro, /--beat-tail-offset/);
});

test('final polish keeps the energy backing deliberate and corrects Page 1 framing', () => {
  assert.match(polish, /box-shadow:\s*\n\s*9px 8px 0 rgba\(116, 67, 166, \.28\)/);
  assert.match(polish, /\[data-panel-id='anomaly'\][\s\S]*background-position: 50% 60%/);
  assert.match(polish, /\[data-panel-id='order'\][\s\S]*background-position: 48% 44%/);
  assert.match(polish, /motion-comic-page-sprite[\s\S]*opacity: \.12/);
  assert.match(polish, /touch-action: none/);
});
