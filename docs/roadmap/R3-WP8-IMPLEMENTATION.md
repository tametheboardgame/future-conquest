# R3-WP8 Performance, Scalability, Accessibility + Resilience

## Objective

Keep the R3 command-map renderer responsive, accessible and recoverable under dense operational overlays and adverse renderer states without rewriting the trusted game core or replacing the established terrain/SVG renderer contract.

## Delivered scope

- Replaced the marker-declutter all-pairs accepted-marker scan with a deterministic screen-space spatial grid.
- Preserved marker priority, protected-marker and deterministic ID tie-break behaviour.
- Added persistent display accessibility preferences:
  - Reduce non-essential map motion.
  - Motion intensity from 0% to 100%.
  - Colour-blind map assist.
- Camera preset transitions now respect the in-game motion setting and the operating-system `prefers-reduced-motion` preference.
- Added a deterministic Escape recovery path. Escape returns the terrain camera immediately to Theatre view; if no terrain instance exists, the host requests the stable SVG fallback.
- Added explicit keyboard focus treatment for terrain controls.
- Added non-colour hostile, selected, operation and warning marker cues using dashed, double and dotted outlines.
- Retained the existing player-selectable `2D accessible map` fallback.
- Added automated migration checks for older settings records.
- Added a 250,000-item spatial-index stress guardrail that verifies queries remain local rather than degenerating into all-pairs scans.

## Performance budgets

These are engineering guardrails, not claims about every physical device. Browser/device profiling remains the final acceptance check.

- Spatial-index stress envelope: 250,000 indexed screen-space items.
- Representative strategic scene target: up to 1,000 territories and 10,000 dynamic/derived entities without an algorithmic all-pairs hit-test or declutter path.
- Typical hover/selection processing target: within one 16 ms frame where browser/GPU conditions permit.
- Typical spatial neighbourhood query target: <= 5 ms on representative desktop hardware.
- Common incremental overlay redraw target: within one 16 ms frame; heavy redraw target <= 50 ms.
- Pan/zoom presentation target: approximately 60 FPS on representative supported desktop hardware, degrading through existing LOD/profile/fallback mechanisms rather than locking the UI.
- Recovery target: Escape restores a safe Theatre camera immediately; renderer initialisation/runtime failure retains the established SVG fallback.

## Existing performance foundations retained

WP8 builds on, rather than replaces, the existing R3 renderer protections:

- Lazy terrain renderer loading and pre-warming.
- Full/compact/SVG presentation profiles.
- Terrain LOD and strategic-flat Theatre mode.
- Coalesced requestAnimationFrame marker-layout work.
- Incremental GeoJSON source updates.
- DOM marker reconciliation rather than wholesale recreation.
- Superseded tile-request cancellation.
- Stable SVG renderer fallback for unsupported or failed terrain rendering.

## Verification

Automated checks cover:

- preference persistence, migration and motion-scale clamping;
- 250,000-item deterministic spatial-index locality;
- use of the spatial index by terrain marker decluttering;
- presence of reduced-motion and colour-blind renderer controls;
- Escape-to-Theatre recovery wiring;
- OS reduced-motion integration;
- visible keyboard focus and non-colour marker patterns.

Manual acceptance should confirm:

1. Open Settings > Display & Accessibility and change all three WP8 preferences.
2. Reload and confirm settings persist independently of campaign saves.
3. Set Motion intensity below 100%, then use Theatre/Campaign/Selected camera controls and confirm transition duration is reduced.
4. Enable Reduce non-essential map motion and confirm camera preset changes become immediate.
5. Focus the terrain canvas and press Escape from a zoomed/selected view; confirm Theatre view is restored immediately.
6. Enable Colour-blind map assist and confirm hostile, selected, operation and warning markers gain distinguishable non-colour outlines.
7. Use keyboard navigation through map controls and confirm focus is clearly visible.
8. Force or encounter terrain fallback and confirm the stable SVG command map remains usable.

## Non-goals

- No game-rule, save-state or authoritative data-contract changes.
- No renderer replacement.
- No terrain artefact format change.
- No editor/browser text-editing work.
- No change to derived-overlay authority; overlays remain presentation-only.
