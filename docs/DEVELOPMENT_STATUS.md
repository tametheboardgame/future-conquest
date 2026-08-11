# Future Conquest Development Status

Last updated: 2026-08-11

## Current programme

R3 Visualisation & Command Experience programme.

Authoritative roadmap: `docs/roadmap/R3-ROADMAP.md`.

Approved sequence:

R3-WP1 -> R3-WP2 -> **R3-WP2B** -> R3-WP3 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.

The simulation/gameplay layer remains mechanically frozen from the validated R2.5 baseline unless R3 exposes a genuine integration defect.

## Completed R2 / R2.5 baseline

R2-WP2 through R2-WP7/R2.5 are complete and merged. The final R2.5 baseline merged via PR #113 as `60950fcb634bc789bc77a49f2f2708fd2e7fc281` and demonstrated approximately Story 50.0%, Normal 29.6% and Hard 7.9% wins across 720 deterministic day-120 campaigns.

## Completed R3 work

### R3-WP1 - Visual Architecture & Renderer Foundation

Status: COMPLETE / MERGED
PR: #114
Merge commit: `be3176de940b37346d713eb575d81bf0c92fe03d`

WP1 established renderer-neutral presentation state, explicit terrain/control/routes/pieces/effects boundaries, camera/LOD/assets/performance conventions and a stable SVG/DOM renderer/fallback.

### R3-WP2 - 2.5D Strategic Map

Status: COMPLETE / MERGED; PRIMARY DEPTH ART DIRECTION SUPERSEDED BY WP2B
PR: #115
Merge commit: `7ad39d5d75889cf05b6af8f54f61eafb09ef033b`

WP2 proved political/control hierarchy, deterministic front derivation, crowded-region zoom hierarchy, non-interactive presentation layers, geometry/hit-testing preservation, mobile/reduced-motion simplification, 393/393 tests, production build and 720-campaign balance parity.

Human visual review immediately after merge identified that the political territory depth/extrusion could read as floating slabs. The useful state/overlay work remains valid, but political polygons will no longer serve as the physical terrain surface.

## Current active work

### R3-WP2B - Real Terrain Foundation

Status: APPROVED / ACTIVE
Branch: `agent/r3-wp2b-real-terrain`
Package definition: `docs/roadmap/R3-WP2B-REAL-TERRAIN.md`

Product-owner decision: replace ownership-driven territory extrusion with one continuous real-elevation landscape.

Selected technical direction:

- MapLibre GL JS for geospatial camera, terrain, tile/LOD and map interaction;
- Copernicus DEM as source direction, preferring GLO-30 material where practical/permitted and allowing GLO-90/downsampled production terrain where appropriate;
- stylised real-earth surface rather than raw Google imagery;
- territory ownership/borders/fronts/routes as overlays on terrain, never terrain geometry;
- initial prototype terrain exaggeration around 2×, tuned visually;
- Three.js reserved for physical pieces/effects through a MapLibre custom 3D layer when WP3 resumes;
- no Copernicus/API client secret in browser code;
- existing SVG/DOM map retained as accessibility/reduced-effects/renderer-failure fallback.

Prototype theatre: southern England -> Paris -> Belgium/Benelux -> Rhine -> Switzerland/Alps.

Immediate WP2B-A work:

1. land platform/data-source contract and geospatial camera helpers;
2. establish attribution/no-secret/fallback rules in code;
3. add an isolated MapLibre terrain host without replacing game authority;
4. prove continuous terrain with representative relief and camera movement;
5. project existing GeoJSON territory overlays onto it;
6. run interaction/performance/build/balance gates;
7. deploy a stable prototype for product-owner visual approval.

## Paused / superseded work

### R3-WP3 - Formation Pieces & Animated Movement

Status: PAUSED UNTIL WP2B VISUAL APPROVAL

Exploratory PR #116 was closed unmerged after the terrain art-direction correction. Its early piece styling may be selectively reused later, but movement animation will not be built around the superseded raised-territory map.

## Next approved work after WP2B

1. R3-WP3 - Formation Pieces & Animated Movement
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation

## Product-owner stop conditions

Product-owner input is required for fundamental mechanic changes, narrative changes, materially different art direction, unresolved subjective gameplay choices, conflicts with intentional design, permissions/tooling blockers, or a stable deployed WP2B terrain prototype that materially benefits from human visual review.

Routine renderer integration, data-pipeline architecture, projection, testing, CI, save compatibility, deployment, performance work, accessibility, attribution and evidence-based technical choices within the approved MapLibre/Copernicus/Three.js direction remain autonomous.

## Source-of-truth rule

Current code, tests, Git history, active PR acceptance criteria, this status file and the approved roadmaps take precedence over stale historical status text elsewhere in the repository.
