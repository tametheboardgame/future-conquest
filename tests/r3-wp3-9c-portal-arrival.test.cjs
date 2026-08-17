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

test('arrival waits for stable terrain plus the physical renderer and derives authoritative materialisation points', () => {
  assert.match(miniatures, /__r3FormationPortalTargets/);
  assert.match(miniatures, /private publishPortalTargets\(\)/);
  assert.match(miniatures, /pieces: \[\.\.\.this\.pieces\.entries\(\)\]\.map\(\(\[id, piece\]\) => \(\{ id, target: \[\.\.\.piece\.target\] \}\)\)/);
  assert.match(miniatures, /this\.publishPortalTargets\(\);/);
  assert.match(arrival, /function terrainRendererStable\(\)[\s\S]{0,180}status === 'ready' \|\| status === 'warning'/);
  assert.match(arrival, /if \(!terrainRendererStable\(\)\) \{[\s\S]{0,100}return;/);
  assert.match(arrival, /const renderedPieces = runtime\.__r3FormationMiniatures\?\.pieces/);
  assert.match(arrival, /if \(!map \|\| !renderedPieces\?\.length\) return undefined/);
  assert.match(arrival, /runtime\.__r3FormationPortalTargets\?\.pieces \?\? renderedPieces/);
  assert.match(arrival, /pieces\.map\(piece => \(\{ id: piece\.id, \.\.\.project\(piece\.target\) \}\)\)/);
  assert.match(arrival, /__r3TerritoryCentres\?\.\[portalTerritory\]/);
  assert.match(arrival, /map\.project\(\[point\[0\], point\[1\]\]\)/);
  assert.match(arrival, /projectArrivalFrame\(portalTerritoryRef\.current\)/);
  assert.doesNotMatch(arrival, /taskGroups|location\s*=|personnel\s*=|readiness\s*=|orders\s*=/);
});

test('fresh-campaign formations stay withheld until the materialisation callback and reveal there', () => {
  assert.match(arrival, /useLayoutEffect\(\(\) => \{[\s\S]*setFormationWithheld\(true\)/);
  assert.match(arrival, /return \(\) => setFormationWithheld\(false\)/);
  assert.match(arrival, /lifecycle\.withheldAtMaterialisingBoundary = formationsWithheld\(\);[\s\S]{0,120}setFormationWithheld\(false\);[\s\S]{0,160}lifecycle\.withheldAfterMaterialisingBoundary = formationsWithheld\(\);[\s\S]{0,100}setPhase\('materialising'\)/);
  assert.match(arrival, /const finish = \(reason: ArrivalCompletionReason\) => \{[\s\S]*setFormationWithheld\(false\)/);
  assert.doesNotMatch(arrival, /for \(const timeout of timeouts\) window\.clearTimeout\(timeout\);\s*setFormationWithheld\(false\)/);
  assert.match(miniatures, /presentationWithheld = document\.documentElement\.dataset\.r3WithholdFormations === 'true'/);
  assert.match(miniatures, /piece\.root\.visible = this\.visible && !presentationWithheld/);
  assert.match(miniatures, /presentationWithheld,/);
  assert.match(miniatures, /map\.triggerRepaint\(\)/);
  assert.doesNotMatch(miniatures, /state\.taskGroups\[[^\]]+\]\s*=|personnel\s*=|readiness\s*=|order\s*=/);
});

test('executed lifecycle evidence survives slow headless rendering without changing campaign state', () => {
  assert.match(arrival, /__r3PortalArrivalLifecycle\?: ArrivalLifecycleEvidence/);
  assert.match(arrival, /schemaVersion: 1,[\s\S]*status: 'running',[\s\S]*formationCount: nextFrame\.formations\.length,[\s\S]*startedAt: performance\.now\(\),[\s\S]*withheldAtStart: formationsWithheld\(\)/);
  assert.match(arrival, /lifecycle\.materialisingAt = performance\.now\(\)/);
  assert.match(arrival, /lifecycle\.closingAt = performance\.now\(\)/);
  assert.match(arrival, /lifecycle\.completedAt = performance\.now\(\)/);
  assert.match(arrival, /lifecycle\.status = reason === 'completed' \? 'completed' : 'aborted'/);
  assert.match(arrival, /lifecycle\.reason = reason/);
  assert.match(arrival, /portalTerritoryRef\.current = portalTerritory/);
  assert.match(arrival, /onStartedRef\.current\?\.\(\)/);
  assert.match(arrival, /onCompleteRef\.current\(\)/);
  assert.doesNotMatch(arrival, /__r3PortalArrivalLifecycle[\s\S]{0,80}(taskGroups|personnel|readiness|orders)/);
});

test('pre-sequence renderer waiting is invisible and cannot block normal map interaction', () => {
  assert.match(arrival, /if \(!active \|\| !frame\) return null/);
  assert.doesNotMatch(arrival, /ACQUIRING TERRAIN LOCK/);
  assert.doesNotMatch(arrival, /Acquiring arrival corridor/);
});

test('normal arrival duration stays inside the approved two-to-four-second presentation budget', () => {
  assert.match(arrival, /const FULL_SEQUENCE = \{[\s\S]*materialise: 720,[\s\S]*closing: 2140,[\s\S]*complete: 3260/);
  assert.match(arrival, /const REDUCED_SEQUENCE = \{[\s\S]*complete: 380/);
  assert.match(arrival, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('renderer failure and transient map-lifecycle loss settle safely without an arbitrary startup race', () => {
  assert.match(arrival, /READY_WITHOUT_FORMATIONS_GRACE_MS = 1500/);
  assert.match(arrival, /RENDERER_LOSS_GRACE_MS = 1000/);
  assert.match(arrival, /params\.get\('terrain'\) === '0'/);
  assert.match(arrival, /physicalFormationStatus\(\) === 'fallback'/);
  assert.match(arrival, /if \(rendererUnavailable\(\)\) \{[\s\S]{0,100}finish\('renderer-unavailable'\)/);
  assert.match(arrival, /if \(sequenceStarted\) \{[\s\S]*const refreshedFrame = terrainRendererStable\(\) \? projectArrivalFrame\(portalTerritoryRef\.current\) : undefined/);
  assert.match(arrival, /rendererLostSince = undefined;\s*setFrame\(refreshedFrame\)/);
  assert.match(arrival, /rendererLostSince \?\?= performance\.now\(\)/);
  assert.match(arrival, /performance\.now\(\) - rendererLostSince >= RENDERER_LOSS_GRACE_MS\) finish\('renderer-lost'\)/);
  assert.match(arrival, /formationStatus === 'ready'/);
  assert.match(arrival, /finish\('no-formations'\)/);
  assert.doesNotMatch(arrival, /READY_TIMEOUT_MS/);
  assert.match(miniatures, /delete window\.__r3FormationPortalTargets/);
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
