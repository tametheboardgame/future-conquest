# Future Conquest Development Status

Last updated: 2026-08-15

## Current programme

R3 Visualisation & Command Experience is now in **R3-WP3.6 - Future Soldier Army Miniatures**.

Authoritative active programme: `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`.
Programme roadmap: `docs/roadmap/R3-ROADMAP.md`.

**R3-WP4 is blocked by the approved physical-map refinement sequence.** PR #137 remains closed/unmerged historical reference material only. No worker, scheduled task or future development thread should resume WP4 until WP3.6, WP3.7 and all WP3.8 landmark-city passes are merged, deployed and visually accepted together.

The mechanically validated R2/R2.5 baseline remains frozen. R3 remains presentation-led: gameplay, balance, save schema, territory/route topology, hidden-information authority and narrative remain unchanged except for separately approved genuine integration changes.

## Current accepted production baseline

R3-WP3.5 and its production hotfix are now the accepted **technical physical-map baseline**.

- PR #141 delivered the first Three.js/MapLibre physical Task Group, city and infrastructure miniature architecture.
- Product-owner live review found the initial production build still showing legacy opaque TG cards and insufficient visible physical presentation.
- PR #142 repaired the production path, including authoritative hiding of compatibility cards, MapLibre v6 `defaultProjectionData.mainMatrix` projection, co-located formation visual offsets, production startup browser probes and retained performance/fallback guarantees.
- #142 merged to `main` as `75d51412cb101875ca99b352ad0bb39fc40b5bd8`.
- Exact-head validation was 11/11 green before merge, including Windows Chrome and Linux Chromium production-startup probes, terrain/browser/overlay/visual/performance/selection-geographic/WP3 movement and deterministic balance gates.
- GitHub Pages deployed and verified the exact merge commit.
- Product-owner live review on 2026-08-15 confirmed that the physical pieces now work and are a strong starting point.

This is **not** the final physical-map art direction. The product owner explicitly approved the architecture while requiring the refinements below before WP4.

## Active package: R3-WP3.6 - Future Soldier Army Miniatures

Status: **APPROVED / ACTIVE / WP4 BLOCKING**

Objective: replace the current generic formation geometry with recognisable miniature versions of the canonical Future Conquest powered-armour soldiers.

Canonical visual input: **`Future Conquest Armour Revision Sheet.png`** from the approved Future Conquest project art assets.

Locked design requirements include:

- modular, section-replaceable powered armour built around practical military function;
- readable helmet/chest/shoulder/powered-leg/power-pack silhouette;
- separate energy rifle linked to suit targeting/power/data;
- layered protection rather than generic shield bubbles;
- adaptive signature-management surfaces without invisibility;
- visible repair/cannibalisation logic for damaged equipment;
- General/officer remains armoured;
- board-game miniature readability rather than photoreal figure detail.

Implementation must preserve the current Three.js/MapLibre custom-layer architecture, exact geographic roots, selection/movement synchronisation, co-located formation handling, browser diagnostics, performance budgets and `?terrain=0` fallback.

## Approved next package: R3-WP3.7 - End-of-Day Operational Movement Beat

Status: **APPROVED / QUEUED / WP4 BLOCKING**

At the End Day boundary, all eligible ordered formations should visibly move before the next-day command state appears.

Approved invasion behaviour:

- a formation beginning an invasion moves visibly into the target province;
- it settles at a deterministic invasion/operation presentation anchor inside that province;
- its visible arrival does not immediately change territorial ownership;
- the province remains enemy/contested/under invasion until existing simulation rules resolve control;
- combat, capture, attrition, supply and operation timing remain authoritative simulation outcomes;
- the movement beat is presentation around the normal single day-resolution transition, not a second simulation tick.

Reduced-motion, save/load, simultaneous moves, co-located formations and all three map LODs are explicit validation requirements.

## Approved city programme: R3-WP3.8 - Landmark City Miniatures

Status: **APPROVED / QUEUED / WP4 BLOCKING**

The current generic city geometry will be replaced by bespoke low-poly miniature city clusters using one or two defining real landmarks plus restrained supporting buildings.

The authoritative current city/capital catalogue has 15 locations. Delivery is fixed into five passes of three cities:

1. **WP3.8A:** London, Paris, Brussels.
2. **WP3.8B:** Amsterdam, Frankfurt, Bern.
3. **WP3.8C:** Strasbourg, Lyon, Luxembourg.
4. **WP3.8D:** Düsseldorf, Stuttgart, Rennes.
5. **WP3.8E:** Namur, Chur, Innsbruck.

The full landmark plan is recorded in `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md` and must be used rather than inventing generic replacements during implementation.

Ports, airports, rail hubs, logistics nodes and crossings retain the existing strategic-infrastructure language unless a later package explicitly refines them.

## Authoritative sequence

1. **R3-WP3.6 - Future Soldier Army Miniatures** (ACTIVE)
2. **R3-WP3.7 - End-of-Day Operational Movement Beat**
3. **R3-WP3.8A - Landmark Cities Pass 1**
4. **R3-WP3.8B - Landmark Cities Pass 2**
5. **R3-WP3.8C - Landmark Cities Pass 3**
6. **R3-WP3.8D - Landmark Cities Pass 4**
7. **R3-WP3.8E - Landmark Cities Pass 5**
8. Integrated physical-map product-owner review
9. R3-WP4 - Battle, Front & Strategic Event Feedback
10. R3-WP5 - Strategic Information Layers
11. R3-WP6 - Command UI/UX Overhaul
12. R3-WP7 - Audio, Music & Atmosphere
13. R3-WP8 - Performance, Scalability, Accessibility & Resilience
14. R3-WP9 - Visual Polish & Integrated Validation
15. Integrated R3 review and human visual/UX playtest
16. Small R3.5 remediation pass if required

## Completed R3 history

- **R3-WP1:** visual architecture and stable SVG fallback, PR #114.
- **R3-WP2:** initial 2.5D strategic map, PR #115; political-slab direction superseded by real terrain.
- **R3-WP2B:** MapLibre/Copernicus terrain foundation, PR #117 plus runtime fixes #118-#120.
- **R3-WP2C:** terrain operational-overlay parity, PR #121.
- **R3-WP2D:** Europe terrain refinement, camera/LOD, safe-area and declutter work, PR #122.
- **R3-WP2E:** terrain performance and streaming, PR #123 and review fixes.
- **R3-WP2F:** terrain-first readability and marker scaling, PR #128.
- **R3-WP2G:** geographic alignment, PR #129.
- **R3-WP2H:** projection/collision correction, PR #130.
- **R3-WP2I:** persistent labels and layer controls, PR #131.
- **Post-WP2I fixes:** camera, marker and layout corrections, PRs #134 and #135.
- **R3-WP3:** formation pieces, state-specific material language, selection emphasis, movement interpolation and route cues, PR #136.
- **R3 Production Coherence Recovery:** PR #138 made terrain/WP3 the normal production path.
- **R3 Stabilisation Gate:** PR #139, merged/deployed/visually accepted on 2026-08-14.
- **R3-WP3.5:** physical formation/world miniature architecture, PR #141.
- **WP3.5 production hotfix:** PR #142, merge `75d51412cb101875ca99b352ad0bb39fc40b5bd8`, deployed and product-owner accepted as the technical refinement baseline on 2026-08-15.

## Source-of-truth rule

Current `main`, this status file, `docs/roadmap/R3-ROADMAP.md`, and `docs/roadmap/R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md` take precedence over stale historical text, closed branches, old PR descriptions or earlier conversation state.

Any automated worker/supervisor must inspect these files before selecting work. If another source suggests WP4 is active or that WP3.5 is still awaiting its original visual acceptance, that source is stale and must not be followed.
