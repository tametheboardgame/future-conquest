# Phase VIII-B2.1 — Desktop command fit

This interface correction keeps the large-screen command shell inside the browser viewport and moves immediate order controls to the decision point.

## Behaviour

- At desktop widths above 900 px and viewport heights of at least 720 px, the application shell occupies exactly one dynamic viewport height.
- The map, navigation and command stage flex into the available height.
- The command context panel and specialist command views scroll internally.
- Below the height threshold, or on mobile layouts, normal document scrolling remains available.
- A selected valid move or attack exposes a priority action immediately below the active-formation selector.
- Valid desktop attack selections also expose a compact **Confirm operation?** control anchored directly above the selected territory.
- The compact map control is hidden on mobile and never replaces the full right-panel action.
- Parallel operational corridors can be selected from the priority panel action without scrolling.

## Compact confirmation refinement

- The previous full-height map action card has been removed.
- The compact confirmation follows the selected territory while the map pans and zooms.
- Its screen size remains stable at tactical zoom levels.
- It is rendered above territory hit areas, labels and formation markers so it remains clickable.
- Pointer and keyboard activation both call the same operation command.

## Validation

- 116/116 regression tests passed.
- TypeScript compilation and Vite production build passed.
- The campaign map remained at exactly 15 active territories.
- Temporary patch and refinement workflows were removed before review.
