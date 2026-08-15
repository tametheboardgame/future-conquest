# Future Conquest R3 Roadmap

Status: APPROVED / ACTIVE PROGRAMME

Last reconciled: 2026-08-15

R3 is the Visualisation & Command Experience release. Its purpose is to transform the mechanically stabilised strategy game into a coherent, readable and visually distinctive grand-strategy command experience without destabilising the simulation.

## CURRENT PACKAGE - READ THIS FIRST

**R3-WP3.9A - Map UX Foundations is APPROVED / NEXT and blocks WP4.**

Authoritative map-tightening programme: `docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md`.

The deployed MapLibre/Three.js physical-map architecture, canonical future-soldier miniatures, end-of-day operational movement beat and first authored landmark pass across all 15 current city/capital nodes are now the accepted production baseline. Product-owner live review on 2026-08-15 confirmed that the result is visually strong, while identifying a final map-tightening sequence before WP4: make the map the default command surface and allow the right command sidebar to collapse, remove the unwanted green/dingy grading that mutes terrain and miniatures, then add the new-campaign portal arrival sequence.

No worker, scheduled supervisor, future chat or autonomous development process should start or resume R3-WP4 until **WP3.9A, WP3.9B and WP3.9C** are implemented, deployed and accepted together in the integrated physical-map review. The old WP4 PR #137 remains closed/unmerged historical reference material only.

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
- The MapLibre/Three.js hybrid remains governed by measured browser/performance evidence and must retain a stable compatibility fallback.
- Major new mechanics, narrative changes or art-direction changes outside the approved broad direction require product-owner approval.
- Any autonomous worker must inspect `docs/DEVELOPMENT_STATUS.md`, this roadmap and the current active package before selecting work.

## Authoritative R3 sequence

Completed history:

R3-WP1 -> R3-WP2 -> R3-WP2B -> R3-WP2C -> R3-WP2D -> R3-WP2E -> R3-WP2F -> R3-WP2G -> R3-WP2H -> R3-WP2I -> post-WP2I fixes -> R3-WP3 -> Production Coherence Recovery -> R3 Stabilisation Gate -> R3-WP3.5 + production hotfix -> R3-WP3.6 -> R3-WP3.7 -> R3-WP3.8A -> R3-WP3.8B -> R3-WP3.8C -> R3-WP3.8D -> R3-WP3.8E

Current and future:

**R3-WP3.9A -> R3-WP3.9B -> R3-WP3.9C -> integrated physical-map review -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.**

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

WP3 proved the technical formation-piece and movement system. Its temporary marker representation was superseded by WP3.5.

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

The deployed build was visually accepted by the product owner on 2026-08-14. Geographic anchoring remains the accepted correctness baseline.

---

# R3-WP3.5 - World Pieces & Strategic Miniatures

Status: **COMPLETE / MERGED / DEPLOYED / ACCEPTED AS PHYSICAL-MAP BASELINE**

Authoritative historical detail: `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md`.

WP3.5 established the production physical-map architecture:

- Three.js custom-layer friendly Task Group miniatures;
- smooth presentation interpolation and terrain grounding;
- co-located formation handling;
- terrain-grounded city and strategic-infrastructure miniatures;
- Theatre/Campaign/Selected LOD;
- Layers integration and compatibility interaction targets;
- reduced-motion and explicit `?terrain=0` fallback;
- browser/runtime/performance/geographic-anchor evidence.

PR #141 merged the initial package. Product-owner live review then found that legacy TG cards were visually covering the physical pieces and that the Three.js projection path required correction. PR #142 fixed the production overlay/projection behaviour, added Windows/Linux deployed-path startup probes, preserved performance/geographic guarantees and merged as `75d51412cb101875ca99b352ad0bb39fc40b5bd8`.

The product owner reviewed that deployed hotfix on 2026-08-15 and confirmed the system now works and is a strong starting point. The **architecture is accepted; the visual identity is intentionally not final**. The approved refinements became blocking packages WP3.6-WP3.9 rather than reopening the WP3.5 technical implementation indefinitely.

---

# R3-WP3.6 - Future Soldier Army Miniatures

Status: **COMPLETE / MERGED / DEPLOYED / VISUALLY ACCEPTED**

Authoritative detail: `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`.

Objective: replace the generic formation geometry with recognisable low-poly/board-game miniatures of the canonical Future Conquest powered-armour soldiers.

Required source: the approved `Future Conquest Armour Revision Sheet.png` and the locked modular powered-armour design language. The implementation preserves the existing Three.js/MapLibre architecture, geographic roots, selection/movement behaviour, co-location handling, performance budgets and fallback.

Result: deployed pieces are recognisable as this game's future soldiers and preserve the existing exact-head browser/performance/geographic/movement/balance guarantees.

---

# R3-WP3.7 - End-of-Day Operational Movement Beat

Status: **COMPLETE / MERGED / DEPLOYED / VISUALLY ACCEPTED**

Authoritative detail: `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`.

Objective: make committed movement visible by adding a short movement-resolution beat after the player ends the day and before the next-day command state appears.

Core accepted behaviour:

- all eligible ordered formations animate concurrently;
- a formation beginning an invasion visibly moves into its target province and settles on a deterministic invasion/operation anchor;
- physical arrival does **not** imply immediate ownership/capture;
- the province remains enemy/contested/under invasion according to existing authoritative rules;
- combat/capture/attrition/supply/operation timing remains simulation-owned;
- reduced motion and save/load remain deterministic;
- no duplicate simulation tick is introduced by animation/replay/skip behaviour.

Result: the player can appreciate ordered armies moving at the day boundary without changing established strategic-resolution mechanics.

---

# R3-WP3.8 - Landmark City Miniatures Programme

Status: **COMPLETE / MERGED / DEPLOYED / FIRST PASS VISUALLY ACCEPTED**

Authoritative detail: `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`.

Objective: replace generic city clusters with recognisable real-city miniatures built from one or two defining landmarks plus a small supporting building cluster.

The current authoritative `STRATEGIC_NODES` city/capital catalogue contains 15 locations and all 15 have completed their first authored pass:

### R3-WP3.8A - Pass 1

- London: Elizabeth Tower / Big Ben + Palace of Westminster roofline.
- Paris: Eiffel Tower + simplified Arc de Triomphe language.
- Brussels: Atomium + Brussels Town Hall / Grand-Place spire language.

Purpose: establish final landmark exaggeration, materials, base, density and LOD rules.

### R3-WP3.8B - Pass 2

- Amsterdam: canal-house gables + Westerkerk-style tower.
- Frankfurt: modern skyscraper/Main Tower-style skyline + Römer historic language.
- Bern: Zytglogge + Federal Palace dome.

### R3-WP3.8C - Pass 3

- Strasbourg: Strasbourg Cathedral + Petite France half-timbered language.
- Lyon: Notre-Dame de Fourvière + optional simplified Part-Dieu skyline cue.
- Luxembourg: fortified old-city/casemate language + Adolphe Bridge.

### R3-WP3.8D - Pass 4

- Düsseldorf: Rheinturm + Media Harbour/Rhine waterfront blocks.
- Stuttgart: Fernsehturm + Neues Schloss/Schlossplatz roofline.
- Rennes: Parliament of Brittany + half-timbered old-town language.

### R3-WP3.8E - Pass 5

- Namur: Citadel of Namur + Saint-Aubain Cathedral language.
- Chur: Cathedral/episcopal hill + St Martin's Church tower.
- Innsbruck: Bergisel Ski Jump + Golden Roof/historic frontage language.

All 15 current city/capital nodes now have authored Campaign/Selected miniatures with exact authoritative node coordinates, terrain grounding, labels, layer controls and fallback preserved. Minor architectural/micro-detail improvements may be captured during later integrated polish, but the first authored city pass is accepted.

---

# R3-WP3.9 - Map Tightening Programme

Status: **APPROVED / QUEUED / WP4 BLOCKING**

Authoritative detail: `docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md`.

WP3.9 is the final pre-WP4 tightening sequence identified during product-owner review of the integrated physical map.

### R3-WP3.9A - Map UX Foundations

- BEGIN CAMPAIGN defaults directly to the Map / Command Map view.
- The right command/formation/intelligence sidebar gains an accessible collapse/expand control.
- Collapsing the sidebar returns the reclaimed width to the map and preserves selection/context.
- Map resize/reflow, keyboard access, compact layouts and `?terrain=0` fallback must remain stable.

### R3-WP3.9B - Map Visual Clarity and Grading

- Remove the unwanted uniform green/teal/dingy cast currently muting the real terrain and authored miniatures.
- Keep the overall presentation restrained and military rather than bright, saturated or arcade-like.
- Audit terrain colour treatment, CSS/translucent overlays, fog/haze, Three.js lighting/material response and strategic overlay opacity before changing values.
- Preserve border, route, front, label, threat and control readability across lowland and Alpine views.

### R3-WP3.9C - Portal Arrival Sequence

- On the first command-map presentation of a new campaign, show an active arrival portal, stage the future troops appearing/arriving at their existing authoritative anchors, then close the portal.
- The full sequence occurs at most once for a newly created campaign and does not replay on ordinary map re-entry or established-save loading.
- Target a short 2-4 second presentation beat with reduced-motion and renderer-failure safe settling.
- The portal sequence is presentation only and cannot alter positions, personnel, readiness, territory state, simulation timing or saves.

---

## Integrated physical-map refinement gate

Before WP4 may resume, the product owner must accept the integrated deployed result of:

- WP3.6 canonical future-soldier miniatures;
- WP3.7 end-of-day movement presentation;
- WP3.8A-E bespoke landmark cities;
- WP3.9A default-map and collapsible-sidebar UX;
- WP3.9B cleaner map grading/visual clarity;
- WP3.9C new-campaign portal arrival sequence.

The gate must also confirm that real terrain, all 15 authored cities, infrastructure, labels, routes, borders, fronts and physical formations remain readable and that geographic anchoring, performance, accessibility, fallback, saves, determinism and balance remain intact.

---

## R3-WP4 - Battle, Front & Strategic Event Feedback

Status: **BLOCKED BY WP3.9 MAP TIGHTENING AND INTEGRATED PHYSICAL-MAP REVIEW**

Old PR #137 is CLOSED/UNMERGED reference material only. A fresh WP4 implementation must start from the accepted physical-map-refinement `main`, not from obsolete branches.

Objective: make attacks, counterattacks, captures, retreats and major campaign changes visible on the map without turning the game into tactical spectacle.

Key requirements:

- movement and combat read differently;
- attacks/counterattacks have clear direction;
- front-line changes, capture, retreat, reinforcement, isolation and critical supply disruption receive concise cues;
- restrained impacts/smoke/fire may be used where readable at campaign scale;
- effects interact with the final accepted physical-piece architecture;
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

Human review should ultimately judge whether the real-terrain direction feels like a coherent grand-strategy physical relief/war-game command table, whether ownership/fronts/forces remain immediately understandable above geography, whether the canonical future-soldier miniatures and landmark cities feel satisfying without becoming busy, whether the end-of-day movement beat makes the campaign feel physically alive, whether the opening portal sequence gives the campaign an appropriate arrival moment, whether battle feedback communicates events clearly, whether strategic information prioritises the right problems and whether the whole game feels cohesive.

Small findings from final R3 review should become an R3.5 remediation pass before selecting the next major simulation/content direction.
