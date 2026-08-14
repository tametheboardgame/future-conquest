# Future Conquest R3 Roadmap

Status: APPROVED / ACTIVE PROGRAMME

R3 is the Visualisation & Command Experience release. Its purpose is to transform the mechanically stabilised strategy game into a coherent, readable and visually distinctive grand-strategy command experience without destabilising the simulation.

Entry state: R2-WP1 through R2-WP7 and the R2.5 Balance Stabilisation Gate are complete. PR #113 merged to `main` as `60950fcb634bc789bc77a49f2f2708fd2e7fc281`. The validated R2.5 baseline demonstrated Story at approximately 50.0% wins, Normal at approximately 29.6% and Hard at approximately 7.9% across 720 deterministic day-120 campaigns. R3 therefore begins from a mechanical freeze: presentation work may expose a genuine integration defect, but should not casually rebalance or redesign the game.

## R3 programme principles

- The simulation remains authoritative. Rendering reads game state and never becomes a second source of gameplay truth.
- Preserve the existing TypeScript/Vite browser delivery model and GitHub Pages deployment unless measured evidence requires otherwise.
- Strategic readability takes priority over spectacle.
- Preserve territory IDs/geometry semantics, route topology, operation logic, save compatibility, deterministic behaviour and intelligence-information boundaries.
- Visual state should be derived rather than unnecessarily persisted in campaign saves.
- Laptop usability, mobile fallback, keyboard access, contrast and reduced-motion support are first-class constraints.
- 3D/2.5D geography is presentation only unless a later gameplay change is separately approved.
- Real elevation must describe geography, never political ownership: political territories are overlays on one continuous landscape.
- Runtime browser code must not contain private geospatial-service credentials.
- The stable SVG/DOM campaign map remains an accessibility/reduced-effects/failure fallback while the real-terrain renderer matures.
- Major new mechanics, narrative changes or art-direction changes outside the approved broad direction require product-owner approval.

## R3 sequence

R3-WP1 -> R3-WP2 -> **R3-WP2B -> R3-WP2C -> R3-WP2D -> R3-WP2E -> R3-WP2F -> R3-WP2G -> R3-WP2H -> R3-WP2I -> post-WP2I fixes** -> R3-WP3 -> **Production Coherence Recovery -> R3 Stabilisation Gate** -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.

WP2B was inserted by product-owner decision on 2026-08-11 after visual review of WP2 showed that territory-level extrusion could read as floating political slabs. WP2C followed after the first deployed terrain build proved the landscape but lacked command-map information parity. WP2D was approved on 2026-08-12 after the restored-overlay build confirmed the overall terrain direction while also exposing the need for an intensive Europe-coverage, robustness, safe-area, hierarchy and declutter pass before WP3 resumes.

---

## R3-WP1 - Visual Architecture & Renderer Foundation

Status: COMPLETE / MERGED (#114)

Objective: establish a clean presentation architecture and select the rendering approach before substantial visual content is built.

WP1 established renderer-neutral presentation state, camera/LOD/assets/performance boundaries and initially selected evolved SVG/DOM over a wholesale WebGL rewrite based on the then-required map. WP1 explicitly evaluated the **existing SVG/DOM map** against a **WebGL/Three.js**-class alternative using measured evidence, selecting evolved SVG/DOM as the primary renderer with a **clear fallback** and escalation path if later browser paint/effect pressure justified WebGL. That historical decision remains valid for the stable fallback renderer. The later WP2B art-direction decision is a separately approved specialised geospatial-terrain requirement and does not move game authority into the renderer.

---

## R3-WP2 - 2.5D Strategic Map

Status: COMPLETE / MERGED (#115), VISUAL APPROACH PARTLY SUPERSEDED BY WP2B

Objective: prove political/control hierarchy, front rendering, hit-testing preservation, crowded-region readability and a more physical campaign presentation while preserving the existing territory model.

WP2 successfully established:

- non-interactive derived terrain/front/depth layers;
- clearer political control and operational states;
- deterministic opposing-control front derivation;
- zoom hierarchy for crowded Benelux/Rhine/Alpine regions;
- mobile/reduced-motion simplification;
- geometry/hit-testing/accessibility regressions and balance parity.

Human visual review then identified a flaw: making political territory polygons appear physically raised can read as disconnected/floating slabs. The useful WP2 overlay/state work should be retained where compatible, but **territory extrusion is not the final terrain model**.

---

## R3-WP2B - Real Terrain Foundation

Status: COMPLETE / MERGED (#117 plus runtime hotfixes #118-#120)

Authoritative package detail: `docs/roadmap/R3-WP2B-REAL-TERRAIN.md`.

Objective: replace political-slab depth with a continuous real-elevation campaign landscape while retaining the proven simulation/presentation boundary and strategic overlays.

Selected direction:

- **MapLibre GL JS** owns the geospatial camera, continuous terrain, tile/LOD and terrain picking surface;
- **Copernicus DEM** is the elevation source direction, preferring GLO-30 source material where practical/permitted with GLO-90/downsampled assets as an acceptable production fallback;
- authenticated Copernicus access belongs in controlled asset-generation tooling, not browser secrets;
- surface appearance is stylised real-earth terrain rather than raw Google imagery;
- territory ownership, borders, fronts, routes and warnings are strategic overlays on the landscape;
- terrain begins with an approximately 2× vertical-exaggeration prototype and is tuned by visual evidence;
- **Three.js** is reserved for 3D game pieces/effects through a MapLibre custom 3D layer when WP3 resumes;
- the existing SVG/DOM map remains the fallback.

WP2B proved the self-hosted Copernicus Terrain-RGB pipeline, MapLibre/Vite worker integration, real browser rendering, compact/mobile fallback policy, terrain performance budgets, camera/navigation, production GitHub Pages deployment and deterministic balance parity. The representative footprint intentionally began as southern England -> Paris -> Belgium/Benelux -> Rhine -> Switzerland/Alps rather than the whole intended theatre.

---

## R3-WP2C - Terrain Operational Overlay Parity

Status: COMPLETE / MERGED (#121)

Objective: restore the mature command-map information hierarchy over the accepted real-terrain renderer after live review showed that the first terrain build had removed too much operational information.

WP2C restored:

- friendly formation counters and selection parity;
- territory/location labels;
- strategic city/node cues;
- player-visible recon contacts and threat markers;
- active-operation and portal cues;
- screen-space marker LOD over pitched terrain;
- hidden-information safeguards using existing intelligence adapters;
- Chromium runtime coverage proving overlays are visible in the actual campaign map and that formation-counter selection works.

WP2C established that the combination of **real terrain + operational command information** is the accepted broad visual direction. It did not attempt the final terrain/overlay refinement pass.

---

## R3-WP2D - Terrain Refinement & Presentation Polish

Status: COMPLETE / MERGED (#122), VISUALLY ACCEPTED

Authoritative package detail: `docs/roadmap/R3-WP2D-TERRAIN-REFINEMENT.md`.

Objective: intensively refine the accepted real-terrain command map until it is robust, Europe-scaled, safe around persistent HUD surfaces, decluttered and visually coherent enough to become the stable foundation for WP3.

Product-owner review of the live WP2C build explicitly approved the broad direction and highlighted the next issues:

- the current static terrain footprint does not yet cover the intended Europe theatre cleanly;
- a deployed tile request can produce a terrain-source warning;
- political/territory lines remain visually messy in some views;
- dense map markers need stronger priority/collision behaviour;
- operational markers can intrude beneath the terrain status/control box;
- the strong top-down <-> pitched 2.5D camera capability should be retained and refined rather than simplified away.

WP2D therefore owned:

- terrain tile/source robustness;
- expansion/regeneration of the terrain footprint for the intended Europe theatre;
- formal Theatre/Campaign/Selected camera framing;
- map safe-area insets and marker/HUD collision prevention;
- political/front/route hierarchy cleanup;
- marker declutter and priority rules;
- intensive browser visual/runtime validation across top-down and pitched views;
- performance/accessibility/fallback preservation and exact simulation parity.

The product owner visually accepted WP2D on 2026-08-12. At that point WP3 remained paused while the focused WP2E terrain performance and streaming pass proceeded; WP2E through WP2I and the post-WP2I corrections have since completed.

---

## R3-WP2E through post-WP2I terrain completion

Status: COMPLETE / MERGED

The accepted terrain programme continued through WP2E performance/streaming (PR #123 and review fixes), WP2F readability/marker scaling (#128), WP2G geographic alignment (#129), WP2H projection/collision correction (#130), WP2I persistent labels/layer controls (#131), and post-WP2I camera/marker/layout fixes (#134-#135). These packages preserved the renderer/simulation boundary and SVG fallback.

Their green CI does **not** prove that the known low-zoom Theatre land-mask polygon artefact or ambiguous front/orange short-segment language is fixed. Both remain open until the stabilisation gate reproduces and verifies/remediates them.

---

## R3-WP3 - Formation Pieces & Animated Movement

Status: COMPLETE / MERGED (#136)

WP3 delivered physical friendly formation pieces, status-specific material language, selected-piece emphasis, presentation-only route-aware movement interpolation and terrain route cues. It changes no authoritative location, order progress, gameplay timing or hidden enemy state. Its code merged at `63a1b3e967601ab762bdc9d4e30fad3674290fbe`, but remained hidden from the normal URL because terrain was still query-gated.

---

## R3 Production Coherence Recovery

Status: COMPLETE / MERGED (#138)

The authoritative specification is `docs/roadmap/R3-PRODUCTION-COHERENCE-RECOVERY.md`. Recovery made MapLibre/Copernicus terrain and WP3 the normal supported production path, retained automatic compact/WebGL fallback and explicit `?terrain=0` SVG selection, added no-query exact-browser proof, and reconciled programme governance. PR #138 merged as `5809d08b63a34df6c8aa111f6e300378a1eeb5b3` and was successfully deployed to GitHub Pages. PR #137 (WP4) remains paused and closed unmerged.

---

## R3 Stabilisation Gate - Map & WP3 Bug Remediation

Status: ACTIVE / WP4 BLOCKING

Authoritative package detail: `docs/roadmap/R3-STABILISATION-MAP-WP3-BUGS.md`.

Before WP4, audit and repair the production-default map in Theatre, Campaign and Selected views. The gate must explicitly reproduce and fix/verify:

- **P1 territory-selection marker reprojection/layout drift:** selecting Düsseldorf / entering attack-target-selected state currently causes labels and TG formation pieces to move away from their correct geographic anchors; at wider zoom the displacement becomes extreme, with formations and labels translated far down the screen while the terrain remains correctly positioned. The fix must preserve authoritative lon/lat anchoring through selection, camera settlement, zoom/pitch and Theatre/Campaign/Selected transitions and must be protected by an exact-browser `map.project()` geographic-anchor regression;
- the low-zoom land-mask polygon artefact;
- ambiguous orange/front short-segment visual language;
- any additional P0/P1/P2 map/WP3 defects found by the full production audit.

The gate must also inspect pieces, movement routes, labels, contacts, operations, collisions and camera stability; validate compact, reduced-motion and SVG fallback; run full regression, build, persistence, balance, performance and browser gates; and obtain human visual acceptance before WP4 resumes. CI alone cannot close visual defects.

---

## R3-WP4 - Battle, Front & Strategic Event Feedback

Objective: make attacks, counterattacks, captures, retreats and major campaign changes visible on the map without turning the game into tactical spectacle.

Key requirements:

- movement and combat read differently;
- attacks/counterattacks have clear direction;
- front-line changes, capture, retreat, reinforcement, isolation and critical supply disruption receive concise cues;
- restrained impacts/smoke/fire may be used where readable at campaign scale;
- after-action reports remain the authoritative detailed explanation;
- effects never expose hidden information or block simulation timing;
- reduced-motion behaviour is supported.

---

## R3-WP5 - Strategic Information Layers

Objective: make the map the primary strategic information surface through coherent overlays tied to authoritative simulation state.

Target layers include political control, friendly strength/readiness, assessed enemy threat, supply/network flow, route condition, Food/Industry/Energy/Transport/Medical/Military Stores, local stockpiles, logistics hubs, occupation/garrison pressure and force-quality information where useful.

Each layer must answer a clear player question, remain understandable through legends, combine without excessive noise, preserve critical exceptions, update without mutating gameplay and retain contextual navigation into exact actionable objects.

---

## R3-WP6 - Command UI/UX Overhaul

Objective: make the surrounding command interface visually coherent with the new map and reduce effort required to understand and act.

Key requirements:

- one visual system for panels, typography, icons, buttons, alerts and selections;
- territory and formation inspection present situation, resources, defence, infrastructure and actions clearly;
- alerts prioritise what needs attention now;
- exact contextual deep links remain intact;
- confirmation behaviour is proportional to consequence;
- compact desktop avoids horizontal scrolling;
- responsive/mobile, keyboard, contrast and reduced-motion support remain functional.

---

## R3-WP7 - Audio, Music & Atmosphere

Objective: add music, UI/order/movement/battle cues and restrained atmosphere without making gameplay dependent on audio.

Requirements include versioned assets, master/music/effects controls, persistent settings, smooth state transitions, browser autoplay-safe behaviour and graceful missing-asset fallback.

---

## R3-WP8 - Performance, Scalability, Accessibility & Resilience

Objective: ensure the richer presentation remains reliable on realistic hardware.

Requirements include performance budgets for theatre/local/heavy-front states, LOD/culling/batching where needed, stable large-piece/effect counts, controlled asset memory/load time, keyboard/focus/contrast/reduced-motion support, graceful low-performance degradation, recoverable renderer failure and transient rendering state kept out of campaign saves.

WP8 must validate both the primary MapLibre terrain path and the retained SVG fallback.

---

## R3-WP9 - Visual Polish & Integrated Validation

Objective: audit the finished R3 presentation as one product and establish a stable deployed build for human review.

Final validation gate:

- focused presentation regressions;
- complete repository tests;
- reproducible production build;
- supported save/load validation;
- deterministic campaign/balance parity;
- representative campaign traces;
- performance benchmarks;
- GitHub CI;
- deployed-main verification;
- whole-game visual/UX audit covering title/prologue, campaign, save/load, victory and defeat.

## R3 product-owner handoff

Human review should focus on whether the real-terrain direction feels like a coherent grand-strategy campaign landscape/physical relief command table, whether ownership/fronts/forces remain immediately understandable above geography, whether pieces and battle feedback feel satisfying without becoming busy, whether the strategic situation surface prioritises the right problems and whether the whole game feels cohesive.

R4 is intentionally not frozen. Small findings from R3 human review should become an R3.5 remediation pass before selecting the next major simulation/content direction.
