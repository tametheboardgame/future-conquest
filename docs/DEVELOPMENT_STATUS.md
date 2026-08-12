# Future Conquest Development Status

Last updated: 2026-08-12

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

Human visual review immediately after merge identified that the political territory depth/extrusion could read as floating slabs. The useful state/overlay work remains valid, but political polygons no longer serve as the physical terrain surface.

## Current active work

### R3-WP2B - Real Terrain Foundation

Status: A/B/C VALIDATED; D ACTIVE / TECHNICAL GATE
PR: #117
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

#### WP2B-A - Platform and data boundary

Status: COMPLETE

- MapLibre GL JS 6 is isolated behind a lazy `?terrain=1` prototype path;
- WGS84 political geometry remains authoritative;
- terrain/WebGL/data failure returns to the stable SVG command map;
- camera, attribution and no-secret runtime boundaries are established.

#### WP2B-B - Representative real-terrain scene

Status: COMPLETE / VALIDATED
Validated head: `21d2e43f5d43f55f4bc934225eea83438aa0b911`

- public Copernicus DEM COGs preprocess into self-hosted Terrain-RGB assets;
- representative set is 82 PNG tiles / approximately 6.1 MB across z4-z7;
- 81 generated tiles use GLO-30, zero require GLO-90 fallback, one is sea-only;
- measured prototype relief spans approximately -248.6 m to 4,535.8 m;
- stylised colour relief, hillshade, land wash, coastline and subdued sea replace consumer-map imagery;
- exact-head terrain smoke, production build and 720-campaign balance/trace workflow passed.

#### WP2B-C - Strategic overlays on terrain

Status: COMPLETE / VALIDATED
Validated head: `c2bb9a568eaa04456369eafffc5d732636e95af5`

- ownership wash, administrative borders, control borders and opposing-control fronts remain separate concepts;
- threat/combat presentation reuses existing player-visible operational-clarity helpers and does not expose hidden enemy strength;
- routes and nodes reuse the authoritative strategic-network definitions and coordinates;
- dense Benelux/Rhine LOD keeps ordinary infrastructure restrained while critical state, fronts and active threats remain prominent;
- representative tests exercise real Wallonia/Rhine geometry under simultaneous threat, operation, front and bottleneck state;
- exact-head focused terrain smoke, full repository build/tests and 720-campaign balance/trace workflow passed.

#### WP2B-D - Interaction, performance and fallback gate

Status: ACTIVE / TECHNICAL VALIDATION

Implemented:

- `full`, `compact` and `svg-fallback` presentation profiles;
- compact profile preserves authoritative geography while reducing terrain exaggeration (2.0 -> 1.6), pitch, hillshade pressure, antialiasing and route/node density;
- very small coarse-pointer displays return deliberately to the stable SVG map;
- profile selection adapts to viewport/orientation changes and remounts the presentation renderer when required;
- visible keyboard-focusable `2D accessible map` escape is available from the terrain renderer;
- MapLibre keyboard pan/zoom remains enabled and accessible help is attached to the terrain canvas;
- Selected camera now uses the selected territory's existing WGS84 centre;
- reduced-motion camera transitions remain immediate;
- all renderer/data failures remain non-blocking and fall back to SVG;
- exact production output keeps MapLibre in a separate lazy terrain chunk.

Performance budget gate:

- exactly 82 representative Terrain-RGB tiles;
- generated terrain <= 8 MiB (measured 6,108,110 bytes);
- lazy terrain JS <= 1.1 MiB raw / 300 KiB gzip (measured 949,750 / 249,054 bytes);
- lazy terrain CSS <= 90 KiB raw / 20 KiB gzip (measured 69,918 / 9,987 bytes);
- MapLibre implementation markers must not leak into eager `index-*.js` chunks;
- production smoke enforces these limits after the real Vite build.

Remaining D gate:

1. complete exact-head full build and deterministic 720-campaign parity on the final D candidate;
2. perform final diff/review/save-topology-information-boundary check;
3. merge the technically accepted prototype while keeping terrain behind `?terrain=1` and the normal live game on SVG;
4. verify GitHub Pages deployment;
5. surface the live hidden terrain prototype for product-owner visual review;
6. do not make terrain primary and do not resume WP3 until that visual review approves the direction.

## Paused / superseded work

### R3-WP3 - Formation Pieces & Animated Movement

Status: PAUSED UNTIL WP2B VISUAL APPROVAL

Exploratory PR #116 was closed unmerged after the terrain art-direction correction. Its early piece styling may be selectively reused later, but movement animation will not be built around the superseded raised-territory map.

## Next approved work after WP2B visual approval

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
