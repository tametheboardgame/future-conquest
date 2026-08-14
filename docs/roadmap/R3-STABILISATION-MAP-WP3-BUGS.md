# R3 Stabilisation Gate - Map & WP3 Bug Remediation

Status: AUTHORITATIVE / TECHNICALLY ACCEPTED - DEPLOYMENT AND HUMAN VISUAL ACCEPTANCE PENDING

Opened: 2026-08-14

Entry baseline: `main` at `5809d08b63a34df6c8aa111f6e300378a1eeb5b3`, the merged and successfully deployed R3 Production Coherence Recovery.

## Purpose

Freeze forward feature development and make the production-default MapLibre/Copernicus campaign map plus merged WP3 formation-piece/movement presentation stable, coherent and visually acceptable before R3-WP4 resumes.

The normal GitHub Pages URL is now the only primary production reference. `?terrain=0` remains the deliberate stable SVG accessibility/diagnostic fallback. `?terrain=1` is no longer required to see the production terrain renderer.

This gate is explicitly BUG FIXES FIRST. It is not permission to add new mechanics, redesign combat, add WP4 effects, or broaden R3 scope.

## Authoritative known defects at entry

The following were explicitly deferred or reproduced during production review and must not be silently treated as solved:

1. **Low-zoom Theatre land-mask polygon artefact**
   - Reproduce on the deployed production-default terrain path.
   - Determine whether the artefact still exists after all WP2D-I changes.
   - If present, fix the land-mask/terrain presentation without changing geography or territory authority.
   - If no longer reproducible, retain machine/browser evidence explaining why it is considered closed.
   - **Fixed on the stabilisation branch:** the clipped World Atlas
     `MultiPolygon` was being submitted as one continent-spanning render
     geometry. The generated v2 mask emits independently wound `Polygon`
     features, preventing low-zoom triangulation from joining distant parts
     while preserving the same land union and coastline. The WP2D Theatre
     browser evidence and permanent geometry/winding regression cover closure.

2. **Ambiguous orange/front short-segment language**
   - Existing player/enemy front indicators can read as unexplained short orange segments.
   - Audit their meaning, colour, geometry, layering and legend/context.
   - Make fronts immediately understandable without introducing WP4 battle/event effects early.
   - **Fixed on the stabilisation branch:** MapLibre fronts now use the same
     warm segmented core and dark casing as the SVG fallback, and an on-map key
     explicitly contrasts `Opposing-control front` with `Movement / supply
     route`. This is presentation-only and introduces no battle/event effects.

3. **P1 territory-selection marker reprojection/layout drift**
   - Reproduced by the product owner on the normal production terrain map on 2026-08-14.
   - The initial Campaign view is geographically coherent. Immediately after selecting Düsseldorf / entering attack-target-selected state, place labels and operational markers visibly move away from their correct geographic locations. At wider zoom the error becomes extreme: formation pieces and multiple labels are displaced far down the screen while the underlying terrain remains correctly positioned.
   - Treat this as an operational-overlay anchoring defect, not a cosmetic spacing issue. Selecting a territory may legitimately reframe the camera, but it must never change the authoritative geographic anchor of a formation, place label, contact, node or operation marker.
   - Investigate the complete camera/selection/layout transaction, including MapLibre `project()` timing, move/zoom/pitch completion, marker layout scheduling, retained presentation offsets, collision/declutter passes and any CSS/DOM transforms. Do not assume the cause before reproducing it.
   - Ensure screen-space layout is recomputed from authoritative geographic coordinates after the camera settles, without stale projection state, double-applied offsets, accumulated transforms or layout work based on a previous camera transform.
   - The fix must cover ordinary territory selection, attack-target selection, formation selection, Theatre/Campaign/Selected preset changes, manual zoom/pitch and returning from another command view.
   - Add a deterministic exact-browser regression which records one or more known marker geographic anchors, changes selection/camera state, then verifies each visible marker remains within a small pixel tolerance of the current MapLibre projection of its authoritative longitude/latitude after the camera settles. Include at least Düsseldorf/Frankfurt-area selection plus Theatre -> Campaign -> Selected transitions and a zoomed-out check.
   - The browser gate must also verify that labels/formations do not undergo a common large vertical translation or leave the usable map canvas after selection.
   - Do not solve the regression merely by disabling legitimate camera transitions or hiding affected markers.

## Full production audit

The stabilisation audit must cover the deployed/default MapLibre path, not only isolated component tests.

### A. Theatre, Campaign and Selected views

For all three camera profiles verify:

- terrain coverage and continuity;
- land/sea/coast presentation;
- territory borders and control hierarchy;
- front indicators;
- territory labels;
- cities, hubs, ports and enabled strategic nodes;
- friendly formation pieces;
- enemy contacts and uncertainty language;
- operations/threat markers;
- Layers control;
- persistent HUD safe areas;
- marker visibility and collisions;
- camera framing and transitions;
- no unexpected geographic drift or duplicated markers.

### B. WP3 physical pieces and movement

Verify in live gameplay, not only static classes:

- ready, garrison, moving, attacking, recovering, engineering and interdicting piece states are distinguishable where those states exist;
- selected formations are visually dominant;
- pieces remain geographically anchored;
- co-located formations remain usable;
- movement interpolation is visible for ordinary movement orders where authoritative state permits it;
- route/path cues are readable and distinct from front indicators;
- movement completion does not visually teleport in common cases;
- split, merge, retreat/regroup/recovery presentation does not introduce stale markers or impossible intermediate state;
- reduced-motion produces a clear non-animated equivalent;
- presentation never changes authoritative order progress or simulation timing.

### C. Interaction regression audit

Exercise at minimum:

- territory selection;
- formation selection;
- attack-target selection;
- opening/closing attack-ready state;
- Theatre -> Campaign -> Selected transitions;
- zoom and pitch changes;
- layer toggles across camera changes;
- crowded formation/label/contact scenarios;
- map resize/sidebar changes;
- return to map after other command views.

Verify:

- no camera jumps unless the player explicitly invokes a camera preset/action or the documented selection behaviour intentionally reframes the view;
- any intentional camera reframe preserves every marker's geographic anchor;
- no stale camera projection is used for marker placement after selection, zoom, pitch or preset changes;
- no labels disappear unexpectedly;
- no contacts/formation cards cover protected labels;
- no markers leave the usable canvas or hide beneath persistent HUD controls;
- no duplicate Dover/Calais or equivalent node representation reappears;
- marker identity remains stable where required.

### D. Compatibility, accessibility and resilience

Verify:

- normal production URL defaults to terrain on supported desktop hardware;
- `?terrain=0` reliably forces SVG;
- unsupported WebGL/renderer failure falls back safely;
- compact/touch behaviour remains usable;
- keyboard navigation remains usable;
- contrast and focus behaviour remain acceptable;
- reduced-motion avoids unnecessary animation;
- no private terrain credentials exist in browser runtime.

## Audit method

Use both automation and visual evidence.

Automation alone is insufficient for subjective visual defects. The branch must maintain or add deterministic browser probes/screenshots for representative Theatre, Campaign, Selected, selection-transition and moving/crowded states, but final closure requires product-owner live visual acceptance of deployed `main`.

For every discovered issue classify it:

- P0: blocks normal play or production renderer availability;
- P1: materially damages map readability, interaction or strategic interpretation;
- P2: visible polish/readability defect suitable for this stabilisation gate;
- Deferred: genuinely belongs to WP4+ and is explicitly documented rather than silently ignored.

## Scope boundary

Allowed:

- renderer/presentation bug fixes;
- terrain/map-source presentation fixes;
- marker/layout/collision/camera corrections;
- WP3 presentation corrections;
- accessibility/fallback fixes;
- targeted performance fixes required by a reproduced regression;
- tests, browser probes and visual evidence;
- documentation/status corrections.

Not allowed without separate product-owner approval:

- gameplay or balance changes;
- save-schema changes;
- territory IDs/geometry semantics or route topology changes;
- hidden-information/intelligence-authority changes;
- new combat mechanics;
- WP4 battle/event feedback implementation;
- WP5 strategic layer expansion;
- WP6 command-interface redesign;
- new audio/music work.

## Pre-merge technical acceptance

Before this package can merge/close:

- all reproduced P0/P1 defects in scope are fixed;
- the P1 selection/camera marker-drift regression is fixed and covered by an exact-browser geographic-anchor assertion;
- known land-mask and front-segment issues are explicitly closed with evidence or fixed;
- exact-browser production-default terrain test passes;
- WP2B terrain smoke/runtime passes;
- WP2C overlay runtime passes;
- WP2D three-view visual runtime passes;
- WP2E performance budgets pass;
- WP2F readability/collision runtime passes;
- WP2I camera/selection regression passes;
- WP3 formation/movement tests pass;
- complete repository tests pass;
- TypeScript/Vite production build passes;
- supported save/load/persistence regressions pass;
- deterministic 720-campaign balance parity remains unchanged;
- `?terrain=0` SVG fallback passes;
- no gameplay-authority files change unless a separately approved genuine integration defect requires it;

**Technical close-out (2026-08-14): complete on PR #139.** The exact-head
workflows for `9e47bca33d73b5cc4a598f2caa72acecb403a0d2` passed the production build,
the full current-engine 720-campaign balance simulation, WP2B terrain smoke
and browser runtime, WP2C overlay parity, WP2D Theatre/Campaign/Selected visual
runtime, WP2E performance budgets, WP2F visual runtime, WP2I selection and
geographic anchoring, and WP3 formation movement. The complete repository test
suite also passed, including persistence/save compatibility,
terrain failure handling, explicit `?terrain=0` fallback, compact presentation,
keyboard interaction and reduced-motion coverage. No assertion, geographic
anchor tolerance or performance budget was weakened.

The final production audit found no additional P0, P1 or P2 defect within this
gate. Its evidence covers:

- Theatre, Campaign and Selected terrain, coast, border, control, label,
  city/hub/port, contact, operation/threat, formation, route and front layers;
- territory, attack-target and formation selection; settled camera preset,
  zoom and pitch transitions; stable marker identity and geographic anchoring;
- crowded-marker collision/declutter, protected HUD areas, layer toggles,
  sidebar/viewport resizing and return-to-map reconciliation;
- WP3 ready, garrison, moving, attacking, recovering, engineering and
  interdicting presentation, selected-piece emphasis, route interpolation and
  bounded reduced-motion equivalents;
- compact/touch layout, keyboard/focus behavior, renderer-failure resilience,
  and the explicit `?terrain=0` SVG path.

The audit independently confirmed that the P1 fix preserves MapLibre's
structural marker classes and computes each settled presentation from the
current authoritative projection, the v2 land mask uses independently wound
polygon render units, and fronts use the documented segmented warm-core/dark-
casing language plus the map key. No gameplay, save-schema, topology, balance,
hidden-information or WP4 authority changed.

## Post-merge deployment and visual acceptance

After the technically accepted package merges, but before this gate closes or
WP4 resumes:

- GitHub Pages must deploy the resulting merge commit successfully;
- **human visual acceptance of the normal production URL must be obtained.**

These deployment and David visual-acceptance checks are the only remaining
gate. Until both pass, this package remains active and WP4 remains blocked.

## Roadmap after this gate

Only after this stabilisation gate is complete and visually accepted:

1. R3-WP4 - Battle, Front & Strategic Event Feedback
2. R3-WP5 - Strategic Information Layers
3. R3-WP6 - Command UI/UX Overhaul
4. R3-WP7 - Audio, Music & Atmosphere
5. R3-WP8 - Performance, Scalability, Accessibility & Resilience
6. R3-WP9 - Visual Polish & Integrated Validation
7. Integrated R3 review and human playtest
8. R3.5 remediation if required

WP4 PR #137 remains closed/unmerged reference material only until this gate passes.
