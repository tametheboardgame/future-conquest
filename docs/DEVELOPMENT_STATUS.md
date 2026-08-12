# Future Conquest Development Status

Last updated: 2026-08-12

## Current programme

R3 Visualisation & Command Experience programme.

Authoritative roadmap: `docs/roadmap/R3-ROADMAP.md`.

Approved sequence:

R3-WP1 -> R3-WP2 -> **R3-WP2B -> R3-WP2C -> R3-WP2D** -> R3-WP3 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.

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

Human visual review immediately after merge identified that political territory depth/extrusion could read as floating slabs. The useful state/overlay work remains valid, but political polygons no longer serve as the physical terrain surface.

### R3-WP2B - Real Terrain Foundation

Status: COMPLETE / MERGED
Primary PR: #117
Runtime hotfix PRs: #118, #119, #120
Package definition: `docs/roadmap/R3-WP2B-REAL-TERRAIN.md`

WP2B replaced ownership-driven extrusion with a continuous Copernicus/MapLibre landscape and proved the technical terrain path end-to-end.

Delivered and validated:

- MapLibre GL JS 6 geospatial terrain renderer behind the `?terrain=1` review path;
- public Copernicus GLO-30 source material preprocessed into self-hosted Mapbox Terrain-RGB assets;
- representative terrain set of 82 PNG tiles / approximately 6.1 MB across z4-z7;
- stylised colour relief, hillshade, land wash, coastline and subdued sea;
- explicit MapLibre/Vite worker bundling required for production GeoJSON source loading;
- production browser runtime probe that enters the campaign and verifies a real visible MapLibre canvas;
- `full`, `compact` and `svg-fallback` renderer profiles;
- compact terrain exaggeration/pitch/render-pressure reduction;
- keyboard/reduced-motion behaviour and a visible `2D accessible map` escape;
- exact production terrain asset/chunk budgets;
- GitHub Pages production deployment and live verifier;
- deterministic 720-campaign parity on validated package heads;
- renderer failure remains non-blocking and falls back to SVG.

Important implementation lesson recorded by the browser probes: TypeScript/build success is not enough for WebGL terrain. Runtime browser coverage now guards worker bundling, actual canvas visibility, terrain source readiness and production pathing.

### R3-WP2C - Terrain Operational Overlay Parity

Status: COMPLETE / MERGED
PR: #121
Merge commit: `205e5e0ec154b49c4c01cd47b0eedf85c2fcc74c`

Live product-owner review of the first stable terrain build confirmed the terrain direction but showed that the new renderer had not inherited enough of the mature SVG command-map information surface.

WP2C restored:

- friendly formation counters with strength/readiness language;
- selected-formation distinction and click-selection parity;
- territory/location labels;
- strategic city/node cues;
- player-visible recon contacts;
- threat markers;
- active-operation markers;
- portal marker;
- screen-space operational-marker LOD over pitched terrain;
- hidden-information boundaries by reusing the existing player-visible intelligence adapters rather than raw enemy formation state.

The exact-head Chromium overlay gate verified the real campaign map contains visible friendly formations, territory/location labels, strategic nodes and player-visible recon contacts, then physically clicked `TG-2` and verified that formation became selected.

Product-owner visual review of the deployed WP2C build explicitly approved the broad **real terrain + operational command information + top-down/pitched camera** direction as substantially closer to the intended game.

## Current active work

### R3-WP2D - Terrain Refinement & Presentation Polish

Status: ACTIVE / PACKAGE OPENED
Branch: `agent/r3-wp2d-terrain-refinement`
Package definition: `docs/roadmap/R3-WP2D-TERRAIN-REFINEMENT.md`
Base main: `205e5e0ec154b49c4c01cd47b0eedf85c2fcc74c`

Product-owner direction: perform an intensive second terrain pass now, before WP3, and fine-tune the accepted map foundation as far as practical rather than carrying obvious presentation debt into formation-animation work.

Immediate live-review findings driving WP2D:

- current Terrain-RGB footprint is still the original representative corridor and does not present the intended Europe theatre cleanly;
- a live request for `./generated/r3-terrain/tiles/7/65/46.png` produced a terrain-source warning;
- political/territory lines remain visually noisy and insufficiently hierarchical in some views;
- operational markers and map labels need stronger deterministic declutter/priority rules;
- markers can sit beneath the terrain status/control box and need a formal safe-area constraint;
- the top-down <-> pitched 2.5D camera behaviour is a strong feature and should be retained/refined;
- terrain colouring, contrast, framing, line weight and marker grounding all warrant a deliberate second visual pass.

Approved WP2D order:

1. **WP2D-A — Terrain source robustness & Europe theatre footprint**
2. **WP2D-B — Camera, framing & safe viewport**
3. **WP2D-C — Political/front/route hierarchy cleanup**
4. **WP2D-D — Marker declutter & command-piece presentation**
5. **WP2D-E — Intensive visual/performance/accessibility validation**

WP2D acceptance requires no supported terrain-source warning in the intended Europe camera envelope, a credible Europe Theatre view, persistent-HUD safe areas, clear political/front/route hierarchy, readable dense-region markers, preserved intelligence boundaries, exact gameplay/save/topology parity, green browser/runtime/build/balance gates and product-owner visual acceptance.

## Paused work

### R3-WP3 - Formation Pieces & Animated Movement

Status: PAUSED UNTIL WP2D VISUAL APPROVAL

Exploratory PR #116 was closed unmerged after the terrain art-direction correction. Its early piece styling may be selectively reused later, but substantial movement animation will not resume until WP2D accepts the terrain foundation.

Once accepted, WP3 should build physical formation pieces/movement on the MapLibre terrain using Three.js/custom 3D layers where useful, while preserving the SVG fallback and intelligence uncertainty.

## Next approved work after WP2D visual approval

1. R3-WP3 - Formation Pieces & Animated Movement
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation

## Product-owner stop conditions

Product-owner input is required for fundamental mechanic changes, narrative changes, materially different art direction, unresolved subjective gameplay choices, conflicts with intentional design, permissions/tooling blockers, or a stable deployed WP2D visual milestone that materially benefits from human review.

Routine terrain source hardening, terrain-footprint generation, map-camera/framing work, safe-area logic, overlay hierarchy, marker collision/LOD, projection, testing, CI, save compatibility, deployment, performance work, accessibility, attribution and evidence-based technical choices within the approved MapLibre/Copernicus/Three.js direction remain autonomous.

## Source-of-truth rule

Current code, tests, Git history, active PR acceptance criteria, this status file and the approved roadmaps take precedence over stale historical status text elsewhere in the repository.