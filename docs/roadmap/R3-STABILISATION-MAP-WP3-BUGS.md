# R3 Stabilisation Gate - Map & WP3 Bug Remediation

Status: COMPLETE / MERGED / DEPLOYED / PRODUCT-OWNER VISUALLY ACCEPTED

Opened: 2026-08-14
Completed: 2026-08-14

Entry baseline: `main` at `5809d08b63a34df6c8aa111f6e300378a1eeb5b3`.
Final merge: PR #139 -> `main` at `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`.

## Closure

This gate is historical. It no longer authorises active work and must not be treated as the current programme package.

The current active programme package is **R3-WP3.5 - World Pieces & Strategic Miniatures**, defined in `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md`.

WP4 remains blocked until WP3.5 completes.

## Purpose of the completed gate

The stabilisation gate froze forward feature development long enough to make the production-default MapLibre/Copernicus campaign map and the merged WP3 formation/movement presentation geographically stable and visually reviewable.

The normal GitHub Pages URL remained the primary production reference. `?terrain=0` remained the deliberate SVG accessibility/diagnostic fallback.

## Defects closed

### P1 territory-selection marker reprojection/layout drift

Product-owner reproduction showed that selecting Düsseldorf / entering attack-target-selected state could make place labels and TG formation pieces fall progressively down the screen while the terrain itself remained correct.

Root cause: marker reconciliation replaced the complete DOM class list, deleting MapLibre structural marker/anchor classes. Reconciled markers could then enter normal document flow and acquire marker-order-dependent vertical displacement.

Resolution:

- preserve MapLibre-owned structural classes during product styling reconciliation;
- prevent collision/layout measurement from queueing redundant geographic reprojections;
- derive layout from settled authoritative projection plus one fresh bounded presentation offset;
- preserve moving-formation interpolation;
- add an exact-browser geographic-anchor regression comparing visible stationary markers with current `map.project()` output using a small pixel tolerance;
- retain guards against a common large vertical translation of the overlay layer.

The exact-head selection/geographic-anchor gate passed before merge and product-owner live review confirmed that formations, labels and operational markers remained correctly positioned through selection, zoom, pitch and map-view changes.

### Low-zoom Theatre land-mask polygon artefact

Root cause: the clipped World Atlas land mask was rendered as one continent-spanning `MultiPolygon`, allowing low-zoom triangulation to create large visual wedges between distant polygon parts.

Resolution:

- normalise polygon winding;
- emit independent bounded polygon features rather than one continent-spanning render geometry;
- version the generated presentation-only land mask;
- add geometry/winding/bounds regression coverage.

### Ambiguous orange/front short-segment language

Resolution:

- fronts use a restrained segmented warm core over dark casing;
- movement/supply routes remain visually distinct;
- a persistent on-map key explicitly distinguishes `Opposing-control front` from `Movement / supply route`;
- no WP4 battle/event effects were introduced early.

### Performance/camera regressions exposed during repair

The first P1 repair attempt caused camera-settlement and terrain-request regressions. Those changes were rejected. The accepted implementation restored established transition/performance behaviour while retaining the stronger geographic-anchor checks.

## Technical acceptance evidence

Before merge, the final PR #139 head passed the relevant production gates, including:

- full repository tests;
- TypeScript/Vite production build;
- WP2B terrain smoke/runtime;
- WP2C overlay runtime;
- WP2D Theatre/Campaign/Selected visual runtime;
- WP2E exact-head terrain performance;
- WP2F visual/readability/collision runtime;
- WP2I selection/camera/geographic-anchor regression;
- WP3 formation movement;
- persistence/save compatibility coverage;
- deterministic 720-campaign balance simulation;
- SVG fallback, compact and reduced-motion coverage represented by the repository test/runtime suite.

GitHub Pages then deployed and verified merge commit `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`.

## Product-owner visual acceptance

The deployed build was visually accepted on 2026-08-14.

Acceptance specifically confirmed that things now stay in the correct place in all views regardless of selection/camera movement.

One non-blocking P2 visual observation was accepted: current formation-marker movement can feel slightly sticky/stepped/guttery during map/camera movement. Geographic correctness is not affected.

This debt is deliberately transferred to **R3-WP3.5**, where the temporary marker presentation is replaced by the intended physical miniature army/world-object architecture. Do not reopen this completed gate merely to polish temporary marker motion.

## Programme handoff

The next package is:

1. **R3-WP3.5 - World Pieces & Strategic Miniatures** (ACTIVE / WP4 BLOCKING)
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation

PR #137 remains closed/unmerged historical WP4 reference material only.
