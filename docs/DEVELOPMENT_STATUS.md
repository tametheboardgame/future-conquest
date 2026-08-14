# Future Conquest Development Status

Last updated: 2026-08-14

## Current programme

R3 Visualisation & Command Experience is in **Production Coherence Recovery**. The authoritative recovery specification is `docs/roadmap/R3-PRODUCTION-COHERENCE-RECOVERY.md`; the programme roadmap is `docs/roadmap/R3-ROADMAP.md`.

The mechanically validated R2 and R2.5 programme is complete. R3 remains presentation-only: gameplay, balance, save schema, territory/route topology, hidden-information authority and narrative are frozen except for separately approved integration defects.

## Completed baseline and R3 history

- **R2 / R2.5:** complete through the R2.5 Balance Stabilisation Gate (PR #113). The validated 720-campaign baseline remains Story 50.0%, Standard 29.6%, Hard 7.9%.
- **R3-WP1:** renderer-neutral visual architecture and stable SVG fallback, merged in PR #114.
- **R3-WP2:** initial 2.5D strategic map, merged in PR #115; its political-slab art direction was superseded by real terrain.
- **R3-WP2B:** MapLibre/Copernicus terrain foundation, PR #117 with browser/runtime hotfixes #118-#120.
- **R3-WP2C:** operational-overlay parity, PR #121.
- **R3-WP2D:** Europe terrain refinement, camera/LOD, safe-area and declutter work, PR #122.
- **R3-WP2E:** terrain performance and streaming, PR #123 and review fixes.
- **R3-WP2F:** terrain-first readability and marker scaling, PR #128.
- **R3-WP2G:** geographic alignment, PR #129.
- **R3-WP2H:** projection/collision correction, PR #130.
- **R3-WP2I:** persistent labels and layer controls, PR #131.
- **Post-WP2I fixes:** camera, marker and layout corrections, PRs #134 and #135.
- **R3-WP3:** physical formation pieces, state-specific material language, selected-piece emphasis, presentation-only movement interpolation and route cues, merged in PR #136 (`63a1b3e967601ab762bdc9d4e30fad3674290fbe`).

## Active recovery

WP3 was merged and deployed, but the normal production entry path still selected the SVG map because terrain required `?terrain=1`. This recovery makes MapLibre/Copernicus terrain—and therefore WP3—the supported production default. Automatic compact/WebGL failure fallback remains SVG, and `?terrain=0` deliberately forces SVG for accessibility and diagnostics.

Exact-browser coverage must open the production build without a terrain query, prove a real MapLibre canvas and WP3 physical formation presentation, and separately prove the `?terrain=0` fallback. Passing CI is integration evidence, not human visual acceptance.

## Known defects carried forward

The following are explicitly **not declared fixed by this recovery or by unrelated green CI**:

- the low-zoom Theatre land-mask polygon artefact;
- ambiguous front/orange short-segment visual language.

They must be reproduced, verified and fixed or explicitly accepted during the next gate.

## Mandatory next item

**R3 Stabilisation Gate - Map & WP3 Bug Remediation** is mandatory immediately after recovery. It requires production-default Theatre/Campaign/Selected visual audit, remediation of the known defects, live WP3 movement/piece inspection, fallback/reduced-motion validation, full regression/performance/persistence/balance/browser gates, and human acceptance of deployed `main`.

R3-WP4 is paused. PR #137 was closed unmerged on 2026-08-14 and is reference material only; WP4 cannot resume until recovery and the stabilisation gate complete.

## Authoritative sequence

1. R3 Production Coherence Recovery (active)
2. R3 Stabilisation Gate - Map & WP3 Bug Remediation (mandatory next)
3. R3-WP4 through R3-WP9
4. Integrated R3 review and human visual/UX playtest
5. Small R3.5 remediation pass if required
