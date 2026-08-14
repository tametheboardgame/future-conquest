# Future Conquest R3 Roadmap

Status: APPROVED / ACTIVE PROGRAMME

Last reconciled: 2026-08-14

R3 is the Visualisation & Command Experience release. Its purpose is to transform the mechanically stabilised strategy game into a coherent, readable and visually distinctive grand-strategy command experience without destabilising the simulation.

## CURRENT PACKAGE - READ THIS FIRST

**R3-WP3.5 - World Pieces & Strategic Miniatures is ACTIVE and blocks WP4.**

Authoritative package: `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md`.

No worker, scheduled supervisor, future chat or autonomous development process should start or resume R3-WP4 while WP3.5 is incomplete. The old WP4 PR #137 is closed/unmerged historical reference material only.

The R3 Stabilisation Gate is complete. PR #139 merged to `main` as `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`, GitHub Pages deployed and verified that commit, and the product owner visually accepted the deployed map on 2026-08-14. Geographic anchoring is therefore the accepted production baseline.

One P2 presentation debt from that acceptance is intentionally carried into WP3.5: current marker/piece movement can feel slightly sticky/stepped/guttery during camera movement/layout settlement. Do not reopen the temporary marker implementation merely to polish this. WP3.5 owns replacing/superseding that behaviour with the final physical-piece movement architecture.

---

## Programme principles

- The simulation remains authoritative. Rendering reads game state and never becomes a second source of gameplay truth.
- Preserve the existing TypeScript/Vite browser delivery model and GitHub Pages deployment unless measured evidence requires otherwise.
- Strategic readability takes priority over spectacle.
- Preserve territory IDs/geometry semantics, route topology, operation logic, save compatibility, deterministic behaviour and intelligence-information boundaries.
- Visual state should be derived rather than unnecessarily persisted in campaign saves.
- Laptop usability, compact/touch fallback, keyboard access, contrast and reduced-motion support are first-class constraints.
- 3D/2.5D geography and pieces are presentation only unless a later gameplay change is separately approved.
- Real elevation describes geography, never political ownership: political territories remain overlays on one continuous landscape.
- Runtime browser code must not contain private geospatial-service credentials.
- The stable SVG/DOM campaign map remains the explicit `?terrain=0` accessibility/diagnostic/failure fallback.
- This reconciles, rather than replaces, the historical WP1 renderer decision: the existing SVG/DOM map remained primary while measured evidence compared it with a WebGL/Three.js hybrid, with a clear fallback required for every accelerated presentation layer. WP3.5's measured custom-layer adoption is governed by the current package below; it does not erase that compatibility contract.
- Major new mechanics, narrative changes or art-direction changes outside the approved broad direction require product-owner approval.
- Any autonomous worker must inspect `docs/DEVELOPMENT_STATUS.md`, this roadmap and the current active package before selecting work.

## Authoritative R3 sequence

Completed history:

R3-WP1 -> R3-WP2 -> R3-WP2B -> R3-WP2C -> R3-WP2D -> R3-WP2E -> R3-WP2F -> R3-WP2G -> R3-WP2H -> R3-WP2I -> post-WP2I fixes -> R3-WP3 -> Production Coherence Recovery -> R3 Stabilisation Gate

Current and future:

**R3-WP3.5 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.**

---

## R3-WP1 - Visual Architecture & Renderer Foundation

Status: COMPLETE / MERGED (#114)

WP1 established renderer-neutral presentation state, camera/LOD/assets/performance boundaries and retained SVG/DOM as the stable fallback. It explicitly preserved the simulation/presentation boundary.

---

## R3-WP2 - 2.5D Strategic Map

Status: COMPLETE / MERGED (#115), VISUAL APPROACH PARTLY SUPERSEDED BY REAL TERRAIN

WP2 proved political/control hierarchy, front rendering, crowded-region readability and a more physical campaign presentation. Product-owner review rejected raised political-territory slabs as the final terrain direction, leading to WP2B.

---

## R3-WP2B - Real Terrain Foundation

Status: COMPLETE / MERGED (#117 plus runtime hotfixes #118-#120)

Authoritative detail: `docs/roadmap/R3-WP2B-REAL-TERRAIN.md`.

Key architecture established:

- MapLibre GL JS owns geospatial camera, continuous terrain, terrain tiles/LOD and picking surface;
- Copernicus DEM supplies elevation through self-hosted terrain assets;
- surface appearance is stylised real-earth terrain rather than raw imagery;
- territory ownership, borders, fronts, routes and warnings are strategic overlays;
- Three.js is reserved for physical game pieces/effects through a MapLibre custom 3D layer;
- SVG/DOM remains fallback.

---

## R3-WP2C - Terrain Operational Overlay Parity

Status: COMPLETE / MERGED (#121)

Restored formation selection, labels, strategic nodes, recon contacts/threats, operation/portal cues and screen-space LOD over the real-terrain map while preserving hidden-information boundaries.

---

## R3-WP2D - Terrain Refinement & Presentation Polish

Status: COMPLETE / MERGED (#122), VISUALLY ACCEPTED

Authoritative detail: `docs/roadmap/R3-WP2D-TERRAIN-REFINEMENT.md`.

Owned Europe terrain coverage, camera framing, safe-area behaviour, hierarchy, declutter, browser validation, accessibility/fallback and performance work.

---

## R3-WP2E through post-WP2I terrain completion

Status: COMPLETE / MERGED

- WP2E performance/streaming: PR #123 plus review fixes.
- WP2F readability/marker scaling: PR #128.
- WP2G geographic alignment: PR #129.
- WP2H projection/collision correction: PR #130.
- WP2I persistent labels/layer controls: PR #131.
- post-WP2I camera/marker/layout fixes: PRs #134-#135.

These packages established the stable MapLibre/Copernicus terrain and operational-overlay foundation later hardened by the stabilisation gate.

---

## R3-WP3 - Formation Pieces & Animated Movement

Status: COMPLETE / MERGED (#136)

WP3 delivered the first physical-friendly-formation presentation, status-specific visual states, selected-piece emphasis, route-aware presentation-only movement interpolation and terrain route cues.

Important clarification: WP3 proved the **technical formation-piece and movement system**, but its current markers are not the final visual end-state. The product owner has now approved WP3.5 to replace that temporary representation with actual miniature army pieces and strategic world objects before battle feedback is added.

---

## R3 Production Coherence Recovery

Status: COMPLETE / MERGED (#138)

Authoritative detail: `docs/roadmap/R3-PRODUCTION-COHERENCE-RECOVERY.md`.

Recovery made MapLibre/Copernicus terrain plus WP3 the normal production path, retained automatic fallback and explicit `?terrain=0`, added no-query browser proof and reconciled programme governance.

---

## R3 Stabilisation Gate - Map & WP3 Bug Remediation

Status: COMPLETE / MERGED / DEPLOYED / PRODUCT-OWNER VISUALLY ACCEPTED (#139)

Historical detail: `docs/roadmap/R3-STABILISATION-MAP-WP3-BUGS.md`.

Merge commit: `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`.

Closed issues included:

- P1 territory-selection marker reprojection/layout drift;
- low-zoom Theatre land-mask polygon artefact;
- ambiguous orange/front short-segment presentation;
- camera/layout/performance regressions found during remediation.

The deployed build was visually accepted by the product owner on 2026-08-14. Formations, labels and operational markers remain in the correct places through selection, zoom, pitch and view changes.

Accepted P2 debt transferred to WP3.5: movement can feel somewhat sticky/stepped during camera/layout activity. Geographic correctness is stable; the final physical-piece architecture should solve presentation smoothness rather than polishing the temporary marker implementation twice.

---

# R3-WP3.5 - World Pieces & Strategic Miniatures

Status: **APPROVED / ACTIVE / WP4 BLOCKING**

Authoritative detail: `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md`.

## Objective

Turn the accepted real-terrain map into a physical strategic war-game table before battle/event effects are built.

The package replaces current temporary formation markers with actual stylised miniature army pieces, introduces terrain-grounded miniature cities and key structures, improves movement smoothness as part of the new piece architecture, and establishes controlled LOD/performance behaviour across Local/Selected, Campaign and Theatre scales.

## WP3.5A - Physical formation-piece system

- actual 2.5D/3D miniature Task Group representation;
- initial direction: small groups of stylised future infantry or equivalent readable miniature formation;
- strong silhouettes and slightly exaggerated board-game proportions;
- stable terrain contact/base treatment;
- state language for ready/selected/moving/attacking/recovering/holding and other existing authoritative states;
- co-located formation usability;
- no hidden-information leakage for enemy contacts;
- no gameplay authority changes.

## WP3.5B - Smooth movement & terrain attachment

- solve the accepted sticky/stepped movement debt here;
- smooth interpolation between authoritative positions without changing simulation timing;
- route-following where existing route information permits;
- optional movement-facing/orientation;
- stable terrain-height placement so pieces neither float nor bury into slopes;
- no geographic drift through selection, zoom, pitch, resize or view changes;
- natural settlement at authoritative destinations;
- reduced-motion equivalent;
- extend existing geographic-anchor regressions to the physical-piece layer where practical.

## WP3.5C - City miniatures

- major/capital city clusters;
- important/standard city clusters;
- symbolic scale rather than literal real-world scale;
- terrain-grounded placement;
- persistent/collision-aware labels retained;
- recognisable broad skyline language where useful without requiring bespoke landmark modelling.

## WP3.5D - Strategic infrastructure miniatures

Where existing authoritative data supports them, add recognisable strategic objects such as:

- logistics/supply hubs;
- ports;
- airports/airfields;
- rail/logistics nodes;
- industrial centres;
- command/administrative facilities already represented by game state;
- portal/future-force strategic site presentation where appropriate.

No new infrastructure mechanics are introduced by this package.

## WP3.5E - LOD, scale & performance

- Local/Selected: richest miniature detail and terrain contact;
- Campaign: simplified geometry/materials while retaining strategic identity;
- Theatre: strongly simplified/low-poly/silhouette/billboard/counter form where necessary;
- use instancing/batching/shared materials where appropriate;
- deterministic culling/LOD;
- controlled model/texture budgets;
- preserve established terrain performance budgets unless a measured, separately approved revision is justified.

## WP3.5F - Integration, accessibility & fallback

Validate:

- Theatre/Campaign/Selected;
- territory, formation and attack-target selection;
- moving/stationary pieces;
- crowded/co-located formations;
- labels around miniature cities/structures;
- layers;
- resize/sidebar changes;
- compact/touch;
- reduced motion;
- keyboard where applicable;
- renderer failure;
- `?terrain=0` SVG fallback;
- save/load and deterministic balance parity.

### Active implementation record

WP3.5A/B is accepted as the exact-head technical baseline at `54be95e`. The C-F
implementation composes lightweight city and infrastructure relief from the
existing `STRATEGIC_NODES` catalogue only, preserves the established DOM labels
and interaction targets, shares restrained procedural materials, applies
importance-driven Theatre/Campaign/Selected density, samples MapLibre terrain
with bounded presentation clearance, and follows the existing Cities/hubs,
Ports and Airports layer controls. Browser evidence now records exact node
coordinates, terrain elevation, clearance, visibility and LOD alongside the A/B
formation evidence and the explicit `?terrain=0` fallback. Implementation is
**READY FOR PRODUCT-OWNER VISUAL ACCEPTANCE** on the active PR
line. It remains ACTIVE—not complete—until deployed-main visual acceptance.

## Architecture direction

Three.js through a MapLibre custom 3D layer is the preferred implementation direction for physical pieces/world objects unless measured browser evidence shows a better compatible solution.

MapLibre remains camera/geospatial authority. Simulation state remains gameplay authority. 3D objects are derived presentation only.

## Exit gate

WP3.5 does not complete until:

- miniature formations are visibly preferable to the temporary markers;
- movement is geographically correct and materially smoother;
- cities/key structures read as physical map objects without overwhelming labels/fronts;
- LOD is coherent across all three map scales;
- performance/accessibility/fallback remain acceptable;
- relevant browser/runtime/performance tests and full build/test/balance gates pass;
- deployed `main` receives product-owner visual acceptance.

**Only then may WP4 resume.**

---

## R3-WP4 - Battle, Front & Strategic Event Feedback

Status: BLOCKED BY WP3.5

Old PR #137 is CLOSED/UNMERGED reference material only. A fresh WP4 implementation should start from the accepted WP3.5 `main`, not from the obsolete pre-stabilisation branch.

Objective: make attacks, counterattacks, captures, retreats and major campaign changes visible on the map without turning the game into tactical spectacle.

Key requirements:

- movement and combat read differently;
- attacks/counterattacks have clear direction;
- front-line changes, capture, retreat, reinforcement, isolation and critical supply disruption receive concise cues;
- restrained impacts/smoke/fire may be used where readable at campaign scale;
- effects interact with the final WP3.5 physical-piece architecture;
- after-action reports remain the authoritative detailed explanation;
- effects never expose hidden information or block simulation timing;
- reduced-motion behaviour is supported.

---

## R3-WP5 - Strategic Information Layers

Status: PLANNED / BLOCKED BY EARLIER PACKAGES

Objective: make the map the primary strategic information surface through coherent overlays tied to authoritative simulation state.

Target layers include political control, friendly strength/readiness, assessed enemy threat, supply/network flow, route condition, Food/Industry/Energy/Transport/Medical/Military Stores, local stockpiles, logistics hubs, occupation/garrison pressure and force-quality information where useful.

---

## R3-WP6 - Command UI/UX Overhaul

Status: PLANNED / BLOCKED BY EARLIER PACKAGES

Objective: make the surrounding command interface visually coherent with the new map and reduce effort required to understand and act.

Requirements include a unified panel/typography/icon/button/alert system, clearer territory/formation inspection, better alert priority, preserved deep links, consequence-proportionate confirmation, compact desktop usability, responsive/mobile behaviour, keyboard access, contrast and reduced motion.

---

## R3-WP7 - Audio, Music & Atmosphere

Status: PLANNED / BLOCKED BY EARLIER PACKAGES

Objective: add music, UI/order/movement/battle cues and restrained atmosphere without making gameplay dependent on audio.

Requirements include versioned assets, master/music/effects controls, persistent settings, smooth state transitions, browser-autoplay-safe behaviour and graceful missing-asset fallback.

---

## R3-WP8 - Performance, Scalability, Accessibility & Resilience

Status: PLANNED / BLOCKED BY EARLIER PACKAGES

Objective: ensure the richer presentation remains reliable on realistic hardware.

Requirements include performance budgets for theatre/local/heavy-front states, LOD/culling/batching, stable large-piece/effect counts, controlled asset memory/load time, keyboard/focus/contrast/reduced-motion support, graceful low-performance degradation, recoverable renderer failure and transient rendering state kept out of campaign saves.

WP8 validates both primary MapLibre terrain and retained SVG fallback.

---

## R3-WP9 - Visual Polish & Integrated Validation

Status: PLANNED / BLOCKED BY EARLIER PACKAGES

Objective: audit the finished R3 presentation as one product and establish a stable deployed build for human review.

Final validation includes presentation regressions, full repository tests, production build, save/load, deterministic balance parity, representative campaign traces, performance benchmarks, GitHub CI, deployed-main verification and whole-game visual/UX audit.

---

## R3 product-owner handoff

Human review should ultimately judge whether the real-terrain direction feels like a coherent grand-strategy physical relief/war-game command table, whether ownership/fronts/forces remain immediately understandable above geography, whether miniature armies and world structures feel satisfying without becoming busy, whether battle feedback communicates events clearly, whether strategic information prioritises the right problems and whether the whole game feels cohesive.

Small findings from final R3 review should become an R3.5 remediation pass before selecting the next major simulation/content direction.
