# Future Conquest Development Status

Last updated: 2026-08-14

## Current programme

R3 Visualisation & Command Experience is in **R3 Stabilisation Gate - Map & WP3 Bug Remediation**. PR #139 is technically accepted; deployment of the resulting merge and David's live visual acceptance are the only remaining gate.

Authoritative active package: `docs/roadmap/R3-STABILISATION-MAP-WP3-BUGS.md`.
Programme roadmap: `docs/roadmap/R3-ROADMAP.md`.
Recovery history: `docs/roadmap/R3-PRODUCTION-COHERENCE-RECOVERY.md`.

The mechanically validated R2 and R2.5 programme is complete. R3 remains presentation-only: gameplay, balance, save schema, territory/route topology, hidden-information authority and narrative are frozen except for separately approved genuine integration defects.

## Completed baseline and R3 history

- **R2 / R2.5:** complete through the R2.5 Balance Stabilisation Gate (PR #113). Validated baseline: Story 50.0%, Standard 29.6%, Hard 7.9% across 720 deterministic day-120 campaigns.
- **R3-WP1:** visual architecture and stable SVG fallback, PR #114.
- **R3-WP2:** initial 2.5D strategic map, PR #115; political-slab art direction superseded by real terrain.
- **R3-WP2B:** MapLibre/Copernicus terrain foundation, PR #117 plus runtime fixes #118-#120.
- **R3-WP2C:** terrain operational-overlay parity, PR #121.
- **R3-WP2D:** Europe terrain refinement, camera/LOD, safe-area and declutter work, PR #122.
- **R3-WP2E:** terrain performance and streaming, PR #123 and review fixes.
- **R3-WP2F:** terrain-first readability and marker scaling, PR #128.
- **R3-WP2G:** geographic alignment, PR #129.
- **R3-WP2H:** projection/collision correction, PR #130.
- **R3-WP2I:** persistent labels and layer controls, PR #131.
- **Post-WP2I fixes:** camera, marker and layout corrections, PRs #134 and #135.
- **R3-WP3:** physical formation pieces, status-specific material language, selected-piece emphasis, presentation-only movement interpolation and route cues, PR #136.
- **R3 Production Coherence Recovery:** PR #138, merged to `main` as `5809d08b63a34df6c8aa111f6e300378a1eeb5b3` and successfully deployed to GitHub Pages. The normal production URL now selects MapLibre/Copernicus terrain by default on supported hardware and therefore exposes the merged WP3 presentation. `?terrain=0` deliberately forces the stable SVG fallback.

## Active stabilisation gate - technical checks complete

Forward feature development remains frozen while the technically accepted production-default 3D map and WP3 stabilisation package awaits deployment and human visual acceptance.

The entry defects are resolved on PR #139:

- the P1 selection drift was traced to reconciliation removing MapLibre's structural marker classes; the fix and permanent three-pixel `map.project()` regression are green;
- the low-zoom Theatre artefact was fixed by emitting independently wound land-mask polygon render units;
- fronts now use a segmented warm core with dark casing and an explicit key that distinguishes them from movement/supply routes.

The production audit covers Theatre, Campaign and Selected views; labels and strategic nodes; contacts and operations; WP3 pieces, states and routes; collision handling; territory, attack and formation selection; camera settlement; layer controls; resizing; compact/touch and reduced-motion behavior; keyboard/focus behavior; resilience; and explicit `?terrain=0` SVG fallback. No additional in-scope P0/P1/P2 defect was found.

All exact-head technical workflows were green at audited implementation head `9e47bca33d73b5cc4a598f2caa72acecb403a0d2`, including the full test/build and 720-campaign balance gates plus WP2B, WP2C, WP2D, WP2E, WP2F, WP2I and WP3 browser/runtime gates. No gameplay, save-schema, topology, balance, hidden-information or WP4 authority changed.

Automated technical acceptance is complete but is not final visual acceptance. The only remaining gate is successful deployment of the resulting merge commit followed by David's human visual acceptance of the normal production URL. Until then, this gate remains active and WP4 remains blocked.

## Paused work

R3-WP4 is paused. PR #137 was closed unmerged on 2026-08-14 and is reference material only. No WP4 implementation may resume until the active stabilisation gate is complete and visually accepted.

## Authoritative sequence

1. **R3 Stabilisation Gate - Map & WP3 Bug Remediation** (ACTIVE, BUG FIXES FIRST)
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation
8. Integrated R3 review and human visual/UX playtest
9. Small R3.5 remediation pass if required

## Source-of-truth rule

Current `main`, this status file, the active stabilisation package, the authoritative R3 roadmap, current tests/CI and active PR acceptance criteria take precedence over stale historical text or superseded branches.
