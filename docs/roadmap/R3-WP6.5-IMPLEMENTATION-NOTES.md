# R3-WP6.5 Implementation Notes

Status: **IMPLEMENTED ON BRANCH / AWAITING AUTOMATED AND PRODUCT-OWNER VISUAL ACCEPTANCE**

Branch: `agent/r3-wp6-5-interface-polish`

Scope authority: `docs/roadmap/R3-WP6.5-INTERFACE-POLISH-REMEDIATION.md`

## Implementation boundary

WP6.5 remains a presentation-only remediation pass. No simulation, balance, save schema, geography, route topology, hidden-information or deterministic-resolution code is changed.

The accepted WP6 map-first information architecture and icon-first navigation remain intact.

## Product-owner findings addressed

1. **Tutorial progression and sizing**
   - The action tutorial no longer presents the redundant Forward control.
   - Back and Skip remain available.
   - Action-step copy continues to state that progression occurs only after the highlighted game action is confirmed.
   - Desktop tutorial cards use natural content height.
   - Internal scrolling is introduced only for constrained desktop heights or compact/mobile layouts.

2. **Duplicate map attribution**
   - The bespoke duplicate terrain attribution is suppressed.
   - MapLibre remains the single visible attribution surface, using the attribution already carried by the generated Copernicus terrain source.
   - Bottom-map controls are restacked so attribution, map key and accessible 2D-map control do not occupy the same anchor.

3. **Map HUD compaction**
   - The ready-state `3D TERRAIN COMMAND MAP` implementation label/status band is removed from presentation.
   - Camera and layer controls collapse to a compact top-right control group.
   - The operational legend remains a separate compact top-left HUD.
   - Initialising and warning terrain status copy remains available when it is useful.

4. **Sidebar collapse control**
   - The collapse/expand control is styled as an attached tab sharing the context-panel edge.
   - Existing aria naming, `aria-controls`, expanded state and keyboard behaviour are preserved.

5. **Settings anchoring**
   - The command header reserves space for the Settings control.
   - Settings is reduced to a stable header-sized control and aligned within the header vertical bounds.
   - Focus treatment remains explicit.

6. **Top telemetry alignment**
   - Network Supply now uses the same column/flex geometry as adjacent telemetry cells.
   - Numeric values use stable tabular figures.
   - Severity colours no longer affect box geometry.

7. **Primary navigation rail**
   - Eight icon-led navigation tiles use bounded heights rather than stretching to fill the viewport.
   - The rail is vertically centred in the command workspace where space permits.
   - Short desktop heights use a denser bounded tile size and controlled rail scrolling.
   - Existing icons, captions, badges, title tooltips and keyboard behaviour remain intact.

## Whole-interface consistency sweep

The remediation pass explicitly rechecks the following shared surfaces and contracts:

- topbar, telemetry and command-stage edge alignment;
- primary rail icon scale, badge placement and vertical rhythm;
- map legend, terrain controls, Settings and sidebar-tab anchors;
- bottom-map attribution/key/accessibility-control stacking;
- specialist workspace horizontal containment for Forces, Operations, Territories, Infrastructure, Logistics, Intelligence and Campaign;
- tutorial action/explanation footer spacing and viewport containment;
- focus visibility for Settings/sidebar controls;
- reduced-motion behaviour for the corrected floating/overlay elements;
- desktop and compact page-level horizontal overflow.

## Exact-head validation gate

`.github/workflows/r3-wp6-5-interface-polish.yml` runs on the PR head and performs:

- WP6.5 source-contract tests;
- the full engine regression suite;
- the production build;
- a Chromium production-preview probe with reduced motion;
- screenshots and geometry evidence at 1900x829, 1366x768 and 640x900;
- map-active and tutorial-open captures;
- visible attribution count check;
- map legend/terrain-control overlap check;
- sidebar edge attachment check in expanded and collapsed states;
- Settings/header and Settings/telemetry collision checks;
- telemetry-value baseline checks;
- stable primary-rail tile-size checks;
- specialist-workspace overflow sweep;
- keyboard focus check for Settings.

Generated evidence is uploaded as the `r3-wp6-5-interface-polish-<head-sha>` Actions artifact.

## Acceptance state

Automated evidence must be green before the package is offered for product-owner live visual review. The package must not merge until that live review is accepted.
