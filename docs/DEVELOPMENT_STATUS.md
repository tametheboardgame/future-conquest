# Future Conquest Development Status

Last updated: 2026-08-14

## Current programme

R3 Visualisation & Command Experience is now in **R3-WP3.5 - World Pieces & Strategic Miniatures**.

Authoritative active package: `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md`.
Programme roadmap: `docs/roadmap/R3-ROADMAP.md`.
Active implementation line: `agent/r3-wp3-5-implementation` (single WP3.5 implementation branch; all WP3.5 code, tests and review work belongs here until this package is complete).

**R3-WP4 is blocked.** PR #137 remains closed/unmerged historical reference material only. No worker, scheduled task or future development thread should resume WP4 until WP3.5 has been implemented, deployed and visually accepted.

The mechanically validated R2/R2.5 baseline remains frozen. R3 is presentation-led: gameplay, balance, save schema, territory/route topology, hidden-information authority and narrative remain unchanged except for separately approved genuine integration defects.

## Most recent accepted production baseline

The R3 Stabilisation Gate was completed through PR #139 and merged to `main` as `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3` on 2026-08-14.

GitHub Pages successfully deployed and verified that exact merge commit. Product-owner live review then confirmed that formations, labels and operational markers remain in the correct geographic positions through selection, zoom, pitch and all map views.

The stabilisation package fixed:

- the P1 territory-selection marker reprojection/layout drift;
- the low-zoom Theatre land-mask polygon artefact;
- ambiguous orange/front short-segment presentation;
- associated camera/layout/performance regressions discovered during remediation.

Exact-head build, terrain/runtime, visual, selection/geographic-anchor, WP3 movement, performance and deterministic 720-campaign balance gates were green before merge.

One non-blocking P2 presentation debt was accepted: current marker/piece movement can feel slightly sticky/stepped/guttery during camera movement and layout settlement. This is **not** a reason to reopen the old marker implementation. It is transferred into WP3.5, which replaces/supersedes the temporary marker presentation with the intended physical-piece architecture.

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

## Active package: R3-WP3.5 - World Pieces & Strategic Miniatures

WP3.5 is inserted deliberately between WP3/stabilisation and WP4 so later battle/front/event effects are built against the intended final physical-piece system rather than temporary HTML/marker presentation.

Primary outcomes:

- replace current formation markers with actual stylised 2.5D/3D miniature army pieces;
- make Task Groups read as small physical future-infantry formations on the terrain;
- solve the accepted sticky/stepped movement debt as part of the new piece movement architecture;
- keep every piece geographically anchored through all camera/view/selection transitions;
- add terrain-grounded miniature representations of major/ordinary cities;
- add recognisable miniatures for strategically meaningful infrastructure such as ports, airfields, logistics hubs and industrial centres where existing authoritative data supports them;
- establish Theatre/Campaign/Selected LOD so miniatures remain readable without turning the map into clutter;
- use Three.js through a MapLibre custom layer as the preferred direction for physical pieces/world objects unless measured evidence shows a better compatible solution;
- preserve MapLibre as camera/geospatial authority and preserve existing simulation authority;
- maintain compact, reduced-motion, performance and `?terrain=0` SVG fallback behaviour.

See `docs/roadmap/R3-WP3.5-WORLD-PIECES-STRATEGIC-MINIATURES.md` for the complete approved package.

Implementation status on the active PR line: WP3.5A/B is technically accepted at
`54be95ed99cb235dc237c63160def2123869ec07`. WP3.5C-F now adds a second derived
Three.js custom layer for authoritative strategic nodes: importance-scaled city
clusters and distinct port, airport, rail/logistics and crossing miniatures,
terrain elevation plus bounded clearance, deterministic Theatre/Campaign/Selected
LOD, existing Layers-state visibility, browser diagnostics and automatic DOM/SVG
fallback. Final hardening is **READY FOR PRODUCT-OWNER VISUAL ACCEPTANCE** on
the active PR line after exact-head browser, performance, build, persistence and
deterministic-balance validation. This is not deployed-main visual acceptance;
WP4 remains blocked until the product-owner exit gate is satisfied.

## Authoritative sequence

1. **R3-WP3.5 - World Pieces & Strategic Miniatures** (ACTIVE / WP4 BLOCKING)
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation
8. Integrated R3 review and human visual/UX playtest
9. Small R3.5 remediation pass if required

## Source-of-truth rule

Current `main`, this status file, `docs/roadmap/R3-ROADMAP.md`, and the active WP3.5 package take precedence over stale historical text, closed branches, old PR descriptions or earlier conversation state.

Any automated worker/supervisor must inspect these files before selecting work. If another source suggests WP4 is active while WP3.5 is incomplete, that source is stale and must not be followed.
