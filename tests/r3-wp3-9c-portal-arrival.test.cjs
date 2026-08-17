const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
const arrival = fs.readFileSync('src/components/PortalArrivalSequence.tsx', 'utf8');
const miniatures = fs.readFileSync('src/presentation/r3-formation-miniatures-layer.ts', 'utf8');
const css = fs.readFileSync('src/components/portal-arrival.css', 'utf8');
const roadmap = fs.readFileSync('docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md', 'utf8');

test('portal arrival is requested only for fresh campaign entry and bypassed by load/review paths', () => {
  assert.match(startup, /const ARRIVAL_PRESENTATION_KEY = 'future-conquest:r3-wp39c-arrival-played'/);
  assert.match(startup, /requestPortalArrival\(\)/);
  assert.match(startup, /label === 'New campaign'\) requestPortalArrival\(true\)/);
  assert.match(startup, /label === 'Load Manual Save' \|\| label === 'Load Autosave'\) setArrivalRequested\(false\)/);
  assert.match(startup, /const continueCampaign[\s\S]{0,240}setArrivalRequested\(false\)/);
  assert.match(startup, /const reloadLastSave[\s\S]{0,260}setArrivalRequested\(false\)/);
  assert.match(startup, /const reviewCampaign[\s\S]{0,180}setArrivalRequested\(false\)/);
  assert.match(startup, /sessionStorage/);
  assert.doesNotMatch(startup, /writeCampaignSlot|saveGame\(|autosaveGame\(/);
});

test('arrival presentation derives every materialisation point from the authoritative rendered formation targets', () => {
  assert.match(arrival, /__r3FormationMiniatures\?\.pieces/);
  assert.match(arrival, /pieces\.map\(piece => \(\{ id: piece\.id, \.\.\.project\(piece\.target\) \}\)\)/);
  assert.match(arrival, /__r3TerritoryCentres\?\.\[portalTerritory\]/);
  assert.match(arrival, /map\.project\(\[point\[0\], point\[1\]\]\)/);
  assert.doesNotMatch(arrival, /taskGroups|location\s*=|personnel\s*=|readiness\s*=|orders\s*=/);
});

test('fresh-campaign formations are withheld before the portal and revealed at materialisation', () => {
  assert.match(arrival, /useLayoutEffect\(\(\) => \{[\s\S]*setFormationWithheld\(true\)/);
  assert.match(arrival, /setFormationWithheld\(false\);\s*setPhase\('materialising'\)/);
  assert.match(arrival, /const finish = \(\) => \{[\s\S]*setFormationWithheld\(false\)/);
  assert.match(arrival, /return \(\) => setFormationWithheld\(false\)/);
  assert.match(miniatures, /presentationWithheld = document\.documentElement\.dataset\.r3WithholdFormations === 'true'/);
  assert.match(miniatures, /piece\.root\.visible = this\.visible && !presentationWithheld/);
  assert.match(miniatures, /presentationWithheld,/);
  assert.doesNotMatch(miniatures, /state\.taskGroups\[[^\]]+\]\s*=|personnel\s*=|readiness\s*=|order\s*=/);
});

test('normal arrival duration stays inside the approved two-to-four-second presentation budget', () => {
  assert.match(arrival, /const FULL_SEQUENCE = \{[\s\S]*materialise: 720,[\s\S]*closing: 2140,[\s\S]*complete: 3260/);
  assert.match(arrival, /const REDUCED_SEQUENCE = \{[\s\S]*complete: 380/);
  assert.match(arrival, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('renderer failure and accessible terrain fallback settle immediately into the normal Day 1 command map', () => {
  assert.match(arrival, /READY_TIMEOUT_MS = 5000/);
  assert.match(arrival, /params\.get\('terrain'\) === '0'/);
  assert.match(arrival, /data-physical-formations="fallback"/);
  assert.match(arrival, /if \(rendererUnavailable\(\)\) \{[\s\S]{0,80}finish\(\)/);
  assert.match(arrival, /if \(performance\.now\(\) - startedAt >= READY_TIMEOUT_MS\) finish\(\)/);
});

test('the portal is a localised technological map event rather than a global colour wash', () => {
  assert.match(css, /\.r3-portal-map-field\s*\{[\s\S]*position: fixed/);
  assert.match(css, /\.portal-ring/);
  assert.match(css, /repeating-linear-gradient/);
  assert.match(arrival, /TEMPORAL INSERTION GATE/);
  assert.match(arrival, /FORMATIONS MATERIALISING/);
  assert.match(arrival, /style=\{mapStyle\}/);
});

test('implementation remains inside the approved WP3.9C presentation-only boundary', () => {
  assert.match(roadmap, /R3-WP3\.9C - Portal Arrival Sequence/);
  assert.match(roadmap, /roughly 2-4 seconds/);
  assert.match(roadmap, /at most once for a newly created campaign/);
  assert.match(roadmap, /must not alter formation coordinates/);
  assert.match(roadmap, /Renderer\/effect failure must settle immediately/);
});
