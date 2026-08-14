# R3 Production Coherence Recovery

Status: AUTHORITATIVE / ACTIVE

Date opened: 2026-08-14

Entry baseline: `main` at `63a1b3e967601ab762bdc9d4e30fad3674290fbe`, the merge of PR #136 (R3-WP3).

## Why this recovery exists

The repository, deployed GitHub Pages build and development roadmap drifted out of alignment during the R3 terrain programme.

The most important production inconsistency is concrete: the accepted MapLibre/Copernicus terrain renderer and the merged WP3 formation-piece/movement presentation are present in the production bundle, but `App.tsx` still selects that renderer only when the URL contains `?terrain=1`. The normal public URL therefore continues to show the legacy SVG command map.

At the same time, several terrain fixes were implemented as WP2F, WP2G, WP2H, WP2I and post-WP2I hotfixes without being fully reconciled into the high-level R3 roadmap. Known terrain-polish issues were explicitly left out of scope when WP2H/WP2I merged.

Development then advanced into WP3 and briefly began WP4 before this inconsistency was identified.

This recovery restores one source of truth and one production path before any further feature work.

## Terminology clarification

There was already a historical **R2.5 Balance Stabilisation Gate** before R3 began. It is complete and must not be confused with this recovery.

The late R3 terrain remediation was informally discussed as a possible "WP2.5", but no such formal package exists in GitHub. Its real implementation history became WP2F through WP2I plus hotfixes.

This document is therefore named **R3 Production Coherence Recovery**, not R2.5 or WP2.5.

## Audited implementation history

### Mechanical baseline

- R2-WP3 through R2-WP7 completed and merged.
- R2.5 balance/playtest stabilisation completed before R3.
- Mechanical simulation remained frozen for R3 presentation work except genuine integration defects.

### R3 renderer and terrain

- PR #114: R3-WP1 visual architecture / renderer foundation.
- PR #115: R3-WP2 first 2.5D strategic-map approach.
- PR #117 plus #118-#120: R3-WP2B real MapLibre/Copernicus terrain foundation and production-browser fixes.
- PR #121: R3-WP2C operational overlay parity.
- PR #122: R3-WP2D Europe terrain refinement and presentation polish.
- PR #123 plus related review fixes: R3-WP2E terrain performance/streaming.
- PR #128: R3-WP2F terrain-first readability and marker scaling.
- PR #129: R3-WP2G geographic alignment.
- PR #130: R3-WP2H projection/collision correction.
- PR #131: R3-WP2I persistent labels and layer controls.
- PR #134 and #135: post-WP2I camera/marker/layout corrections.

### R3-WP3

- PR #136 merged successfully into `main`.
- WP3 code is present in the terrain path: physical friendly formation-piece styling, status-specific material language, selected-piece emphasis, presentation-only movement interpolation and terrain movement-route cues.
- The post-merge Pages deployment succeeded.
- WP3 nevertheless did not become visible at the normal public URL because the terrain renderer itself remained query-gated.

### R3-WP4

- PR #137 began after WP3 but was paused and closed unmerged on 2026-08-14 when the production coherence problem was identified.
- Its branch is retained only as future reference.
- No WP4 code is authoritative until this recovery and the subsequent bug gate are complete.

## Known issues at recovery entry

### P0 - Production renderer split

The normal public URL uses the legacy SVG renderer while `?terrain=1` uses the MapLibre terrain renderer. This creates two apparent versions of the game and hides merged WP3 work from the normal production experience.

### P0 - Roadmap/status drift

`docs/DEVELOPMENT_STATUS.md` and `docs/roadmap/R3-ROADMAP.md` do not accurately describe the merged WP2F-I/hotfix/WP3 state.

### P1 - Deferred terrain bugs/polish

The WP2H/WP2I merge notes explicitly deferred at least:

- ambiguous orange short front-line segments / front indicator visual language;
- low-zoom Theatre land-mask polygon artefacts.

These are not considered resolved merely because later unrelated CI passed.

### P1 - Human-visible WP3 acceptance not established on the production entry path

WP3 passed automated/runtime gates, but the product owner has not been able to see it at the normal public URL. Automated success is therefore not equivalent to production visual acceptance.

### P2 - Repository hygiene

Old open PRs/branches from superseded development remain and can obscure the active source of truth. They should be reviewed and clearly closed/labelled when superseded, without deleting useful history.

## Recovery scope

### Recovery A - One production renderer path

1. Make the accepted MapLibre/Copernicus terrain renderer the default campaign renderer at the normal public URL on supported hardware.
2. Preserve the existing automatic compact/WebGL failure fallback to the stable SVG renderer.
3. Preserve an explicit diagnostic/accessibility URL override to force the SVG renderer, preferably `?terrain=0`.
4. Remove user-facing "experimental/prototype" wording from the normal loading path where it implies the terrain renderer is not the production renderer.
5. Keep `?terrain=1` compatible as an explicit force-terrain/debug path if useful, but it must no longer be required.

### Recovery B - Prove WP3 is on the production path

1. Production-default browser coverage must assert a MapLibre canvas loads without `?terrain=1` on a supported desktop profile.
2. The same coverage must assert the WP3 physical formation marker styling/classes/data are present.
3. Exercise at least one moving formation scenario and verify presentation movement/route evidence without changing authoritative state.
4. Retain reduced-motion and SVG fallback coverage.

### Recovery C - Reconcile documentation

Update the two authoritative documents:

- `docs/DEVELOPMENT_STATUS.md`
- `docs/roadmap/R3-ROADMAP.md`

They must record the real PR sequence through WP2I/hotfixes and WP3, this recovery, the bug-first gate, and the paused WP4 branch.

### Recovery D - Establish a mandatory bug-first gate

No new WP4 implementation may resume immediately after this recovery merge.

The next active programme item is **R3 Stabilisation Gate - Map & WP3 Bug Remediation**.

Its scope is to:

- visually audit the production-default 3D map in Theatre, Campaign and Selected views;
- reproduce and fix the known low-zoom land-mask artefacts;
- review and fix ambiguous front-line/orange-segment presentation;
- verify territory/city/node labels, formation pieces, enemy contacts, operations and layer controls across zoom/pitch changes;
- verify formation/label/contact collision and camera stability during selection and attack targeting;
- inspect actual WP3 piece and movement presentation in live play;
- fix any regressions exposed by making terrain the default renderer;
- verify compact/reduced-motion/fallback paths;
- run full regression/build/persistence/balance/performance/browser gates;
- require human visual acceptance of the deployed main URL before WP4 resumes.

## Acceptance criteria for this recovery

This recovery may merge only when:

- the production-default path selects terrain on supported desktop browsers without a query flag;
- a force-SVG/fallback path still works;
- the exact recovery head passes focused tests, full repository tests and production build;
- relevant existing terrain/WP3 runtime/performance gates pass;
- a browser gate explicitly covers the no-query production path;
- no simulation, balance, save, topology or intelligence-authority changes are introduced;
- roadmap/status documentation is internally consistent;
- WP4 remains paused.

After merge, GitHub Pages must deploy the merge commit successfully. The normal public URL then becomes the single production reference for human testing.

## Programme sequence after recovery

1. **R3 Production Coherence Recovery** - make one production 3D/WP3 path and repair documentation.
2. **R3 Stabilisation Gate - Map & WP3 Bug Remediation** - BUG FIXES FIRST, live audit and human acceptance.
3. R3-WP4 - Battle, Front & Strategic Event Feedback.
4. R3-WP5 - Strategic Information Layers.
5. R3-WP6 - Command UI/UX Overhaul.
6. R3-WP7 - Audio, Music & Atmosphere.
7. R3-WP8 - Performance, Scalability, Accessibility & Resilience.
8. R3-WP9 - Visual Polish & Integrated Validation.
9. Integrated R3 review and human playtest.
10. Small R3.5 remediation pass if required before choosing R4.

## Source-of-truth rule

Until this recovery is complete, the only authoritative implementation baseline is `main` at or after PR #136 plus this recovery branch. Closed/superseded branches and stale status text are historical evidence, not permission to advance the programme.
