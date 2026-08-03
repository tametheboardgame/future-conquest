# Phase VIII-B2.1 — Desktop command fit

This interface correction keeps the large-screen command shell inside the browser viewport and moves immediate order controls to the decision point.

## Behaviour

- At desktop widths above 900 px and viewport heights of at least 720 px, the application shell occupies exactly one dynamic viewport height.
- The map, navigation and command stage flex into the available height.
- The command context panel and specialist command views scroll internally.
- Below the height threshold, or on mobile layouts, normal document scrolling remains available.
- A selected valid move or attack exposes a priority action immediately below the active-formation selector.
- Desktop map view also displays a floating duplicate action; the detailed order card remains available lower in the context panel.
- Parallel operational corridors can be selected from the priority action without scrolling.

## Validation

- 116/116 regression tests passed.
- TypeScript compilation and Vite production build passed.
- The generated campaign map remained at exactly 15 active territories.
- The temporary patch workflow and script were removed before review.
