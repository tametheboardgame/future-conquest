# R3-WP1 Renderer Spike

Status: DECISION RECORDED / INTEGRATION VALIDATION IN PROGRESS

## Purpose

R3-WP1 must choose the rendering architecture before the 2.5D visual build accelerates. The current map is a large React/SVG component with mature camera, keyboard, pointer, selection, overlay and accessibility behaviour. R3 requires significantly richer depth, piece movement and effects, but the simulation and geographic model must remain authoritative and unchanged.

The spike compares two practical paths:

1. **Evolved SVG/DOM** — retain SVG as the main map renderer and add stronger layering, depth cues, filters, transforms and animated SVG/DOM pieces.
2. **WebGL hybrid** — use WebGL (Three.js-class rendering remains an available later implementation) for terrain/pieces/effects while retaining DOM/SVG for accessible labels, command overlays, keyboard affordances and fallback.

A full engine migration is explicitly outside WP1.

## Existing renderer strengths

The current `MapView.tsx` already provides:

- authoritative d3-geo projection and generated territory geometry;
- separate geographic and display anchors;
- Europe/Campaign/Selected camera presets;
- wheel, drag, pinch, double-click and keyboard camera control;
- 5000% maximum tactical zoom through the shared viewport model;
- pointer and keyboard territory/formation/contact selection;
- explicit theatre/regional/local/tactical detail tiers;
- mature route, supply, operation, threat and formation overlays;
- direct integration with the existing contextual-navigation model;
- accessible SVG labels and roles;
- a proven GitHub Pages/Vite deployment path.

These capabilities are acceptance requirements for any later accelerated layer rather than functionality to discard.

## Architectural boundary introduced in WP1

`src/presentation/r3-renderer-foundation.ts` defines a renderer-neutral `MapPresentationFrame` and renderer lifecycle contract. The intended direction is:

`GameState -> presentation adapter -> immutable MapPresentationFrame -> renderer adapter`

The renderer must never mutate `GameState`, determine combat outcomes, alter route topology or persist transient camera/effect state into campaign saves.

Presentation layers are explicitly separated as:

- terrain;
- political/control state;
- routes;
- pieces;
- effects;
- overlays.

This gives later R3 packages stable boundaries without requiring those packages to depend directly on a particular rendering technology.

## Technical spike scenes

`src/presentation/r3-renderer-spike.ts` and `scripts/benchmark-r3-renderer-spike.mjs` exercise equivalent scene pressure for both candidates.

The representative profile contains:

- 15 territory polygons;
- 36 route segments;
- 48 pieces;
- 30 overlays;
- an explicit camera;
- selected territory and selected piece state.

The dense profile deliberately keeps the same 15-territory campaign footprint but raises pressure to:

- 72 route segments;
- 120 pieces;
- 90 overlays.

This is intentionally above the current visible campaign-piece density so the decision contains useful headroom rather than only proving today's scene.

Both candidates consume the same synthetic geometry and selection state. The SVG path prepares polygons, route lines, transformed pieces and DOM overlays. The WebGL-hybrid path triangulates the same territory polygons into typed buffers, prepares route/piece buffers and explicitly retains a DOM overlay count for accessibility/command UI.

## Preparation benchmark

A deterministic Node preparation benchmark was added so CI can compare the CPU-side work of the two paths on every change. It is deliberately labelled a **preparation benchmark**, not a GPU/frame-render benchmark: CI does not provide a trustworthy representative browser/GPU environment and WP1 must not invent frame-rate evidence that was never measured.

Reference run during WP1 implementation on 11 August 2026, 2,000 iterations per scene:

| Scene | Candidate | Average preparation | Prepared payload |
|---|---|---:|---:|
| Representative | SVG/DOM | 0.03690 ms | 10,844 chars |
| Representative | WebGL hybrid | 0.01092 ms | 3,456 bytes |
| Dense | SVG/DOM | 0.06892 ms | 24,121 chars |
| Dense | WebGL hybrid | 0.00955 ms | 5,040 bytes |

Interpretation:

- both preparation paths are far below the 16.67 ms 60 FPS reference budget at the current campaign scale;
- WebGL buffer preparation is materially cheaper and produces a smaller prepared numeric payload in the synthetic dense scene;
- the measured preparation advantage does **not** establish that the current SVG renderer has an actual browser rendering bottleneck;
- browser paint/compositing, filters and animation pressure remain observable runtime metrics during the later visual packages and WP8 performance pass.

The automated regression deliberately gates only that both candidates remain comfortably within the reference preparation budget and that both use equivalent scene pressure. It does not require a fragile exact timing ratio.

## WebGL capability and fallback probe

The spike includes a browser capability probe that attempts WebGL2, then WebGL, and reports basic device limits. If neither API is available the accelerated path is unsupported by definition.

No gameplay or command behaviour is allowed to depend on WebGL availability. Labels, command interactions, keyboard affordances and accessible state remain in the DOM/SVG command surface even if a future R3 package adds an accelerated decorative/effect layer.

## Weighted architectural evaluation

The WP1 scoring contract weights maintainability, visual capability, performance, accessibility integration, deployment compatibility and implementation risk. Higher is better; low implementation risk is rewarded.

| Criterion | Weight | Evolved SVG/DOM | WebGL hybrid |
|---|---:|---:|---:|
| Maintainability/integration | 20% | 5.0 | 3.0 |
| 2.5D visual capability | 20% | 4.2 | 5.0 |
| Performance/headroom | 20% | 4.2 | 5.0 |
| Accessibility integration | 15% | 5.0 | 3.0 |
| Deployment compatibility | 10% | 5.0 | 4.5 |
| Implementation risk | 15% inverted | 1.0 | 3.0 |
| **Weighted score** | | **4.53 / 5** | **3.80 / 5** |

The SVG score recognises that the approved R3 target is a 2.5D command table / animated board game, not a free-camera real-time 3D battlefield. Layered SVG paths, masks, filters, gradients, depth shells and transformed pieces can deliver that target while preserving the mature interaction model. WebGL retains a higher visual/effect ceiling and better scaling headroom, but currently pays meaningful integration and accessibility cost without a demonstrated production bottleneck that requires it.

## Decision

**The primary R3 map renderer is evolved SVG/DOM.**

This is the WP1 renderer decision for R3-WP2 and the immediate visual packages. It means:

- preserve the current d3 projection, authoritative territory paths and viewport model;
- evolve the existing map into layered 2.5D SVG/DOM rather than replace it;
- use depth shells, lighting gradients, shadows, texture/mask layers and transformed board-game pieces to create the command-table presentation;
- keep all existing pointer, keyboard, selection, contextual-navigation and mobile behaviour available while visual layers are replaced incrementally;
- keep the renderer-neutral presentation frame so later layers are not permanently coupled to `MapView.tsx` internals.

**WebGL remains an optional acceleration path, not a rejected technology.** If later WP3/WP4 effects, large piece counts or WP8 browser measurements demonstrate a genuine SVG paint/compositing bottleneck, WebGL can be introduced behind the same presentation contract for effect-heavy layers without migrating game logic or removing the SVG/DOM command surface.

This gives R3 the lower-risk path now while preserving an evidence-based escape hatch if the graphical overhaul actually reaches a browser limit.

## Level of detail

The foundation preserves the current validated thresholds initially:

- theatre: below 135% zoom;
- regional: 135% to below 285%;
- local: 285% to below 600%;
- tactical: 600% and above.

WP1 may tune visual contents inside those tiers, but does not reduce the current tactical zoom capability or remove the Europe/Campaign/Selected navigation model.

## Asset convention

R3 presentation assets use a versioned namespace rooted at `assets/r3-v1/` so future art replacements do not depend on fragile cache behaviour or ambiguous unversioned asset names. Generated/build-time assets may still use the established build pipeline where appropriate, but their logical R3 source/version remains explicit.

## Performance instrumentation

The foundation includes a renderer-neutral rolling frame-time sampler with a 60 FPS / 16.67 ms reference budget. The preparation benchmark complements rather than replaces that browser-side instrumentation.

Later live scenes should inspect:

- theatre view with all territory geometry;
- local view with routes, labels and several formations;
- heavy representative state with high marker/overlay density;
- camera pan/zoom while overlays update;
- reduced-motion mode and mobile interaction.

## Remaining WP1 work

1. Keep the renderer decision encoded in tests and architecture status.
2. Validate the new spike code through full repository tests, TypeScript and production build.
3. Verify deterministic balance remains unchanged from the frozen R2.5 baseline.
4. Confirm the branch's GitHub workflows are green.
5. Perform final WP1 review for accidental simulation coupling or renderer-specific leakage.
6. Merge WP1 only after those gates pass; R3-WP2 then begins the actual 2.5D strategic-map build on the evolved SVG/DOM foundation.
