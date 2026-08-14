# R3 Stabilisation Gate - Map & WP3 Bug Remediation

Status: AUTHORITATIVE / ACTIVE

Opened: 2026-08-14

Entry baseline: `main` at `5809d08b63a34df6c8aa111f6e300378a1eeb5b3`, the merged and successfully deployed R3 Production Coherence Recovery.

## Purpose

Freeze forward feature development and make the production-default MapLibre/Copernicus campaign map plus merged WP3 formation-piece/movement presentation stable, coherent and visually acceptable before R3-WP4 resumes.

The normal GitHub Pages URL is now the only primary production reference. `?terrain=0` remains the deliberate stable SVG accessibility/diagnostic fallback. `?terrain=1` is no longer required to see the production terrain renderer.

This gate is explicitly BUG FIXES FIRST. It is not permission to add new mechanics, redesign combat, add WP4 effects, or broaden R3 scope.

## Authoritative known defects at entry

The following were explicitly deferred by earlier terrain work and must not be silently treated as solved:

1. **Low-zoom Theatre land-mask polygon artefact**
   - Reproduce on the deployed production-default terrain path.
   - Determine whether the artefact still exists after all WP2D-I changes.
   - If present, fix the land-mask/terrain presentation without changing geography or territory authority.
   - If no longer reproducible, retain machine/browser evidence explaining why it is considered closed.

2. **Ambiguous orange/front short-segment language**
   - Existing player/enemy front indicators can read as unexplained short orange segments.
   - Audit their meaning, colour, geometry, layering and legend/context.
   - Make fronts immediately understandable without introducing WP4 battle/event effects early.

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

- no camera jumps unless the player explicitly invokes a camera preset/action;
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

Automation alone is insufficient for subjective visual defects. The branch must maintain or add deterministic browser probes/screenshots for representative Theatre, Campaign, Selected and moving/crowded states, but final closure requires product-owner live visual acceptance of deployed `main`.

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

## Validation gate

Before this package can merge/close:

- all reproduced P0/P1 defects in scope are fixed;
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
- GitHub Pages deploys the resulting merge commit;
- **human visual acceptance of the normal production URL is obtained before WP4 resumes.**

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
