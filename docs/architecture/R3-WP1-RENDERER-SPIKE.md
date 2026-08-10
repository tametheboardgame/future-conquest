# R3-WP1 Renderer Spike

Status: IN PROGRESS

## Purpose

R3-WP1 must choose the rendering architecture before the 2.5D visual build accelerates. The current map is a large React/SVG component with mature camera, keyboard, pointer, selection, overlay and accessibility behaviour. R3 requires significantly richer depth, piece movement and effects, but the simulation and geographic model must remain authoritative and unchanged.

The spike therefore compares two practical paths:

1. **Evolved SVG/DOM** — retain SVG as the main map renderer and add stronger layering, depth cues, filters, transforms and animated SVG/DOM pieces.
2. **WebGL hybrid** — use WebGL (most likely Three.js-class rendering) for terrain/pieces/effects while retaining DOM/SVG for accessible labels, command overlays, keyboard affordances and fallback.

A full engine migration is explicitly outside WP1 unless evidence shows it is necessary.

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

These are expensive capabilities to throw away and therefore become acceptance requirements for any replacement renderer.

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

This gives R3-WP2 through WP5 stable boundaries without requiring those packages to know whether the final terrain renderer is SVG or WebGL.

## Level of detail

The foundation preserves the current validated thresholds initially:

- theatre: below 135% zoom;
- regional: 135% to below 285%;
- local: 285% to below 600%;
- tactical: 600% and above.

WP1 may tune visual contents inside those tiers, but should not silently reduce the current tactical zoom capability or remove the Europe/Campaign/Selected navigation model.

## Asset convention

R3 presentation assets use a versioned namespace rooted at `assets/r3-v1/` so future art replacements do not depend on fragile cache behaviour or ambiguous unversioned asset names. Generated/build-time assets may still use the established build pipeline where appropriate, but their logical R3 source/version must remain explicit.

## Performance instrumentation

The foundation includes a renderer-neutral rolling frame-time sampler with a 60 FPS / 16.67 ms reference budget. This is not a promise that every device will render at 60 FPS; it is a consistent signal for comparing representative scenes and detecting severe regressions.

WP1 comparison scenes should include at minimum:

- theatre view with all territory geometry;
- local view with routes, labels and several formations;
- heavy representative state with high marker/overlay density;
- camera pan/zoom while overlays update.

Record average frame time, worst sampled frame time, over-budget ratio and qualitative interaction stability.

## Initial structural comparison

This table is an architectural assessment only. Performance scores remain provisional until both spikes are benchmarked on the same representative scenes.

| Criterion | Evolved SVG/DOM | WebGL hybrid |
|---|---:|---:|
| Existing maintainability/integration | Strong | Medium |
| 2.5D visual ceiling | Medium/Strong | Strong |
| Large animated-piece/effect scaling | Medium | Strong |
| Accessibility integration | Strong | Medium without DOM overlay |
| Current hit-testing/navigation reuse | Strong | Medium |
| GitHub Pages compatibility | Strong | Strong |
| Implementation risk | Low/Medium | Medium |
| Graceful fallback | Native/current renderer | Must retain SVG/DOM fallback |

## Provisional direction

The likely R3 architecture is **hybrid rather than replacement**:

- keep the existing projection, viewport semantics, accessible DOM/SVG command surface and tested fallbacks;
- introduce a renderer-neutral presentation frame;
- allow a WebGL terrain/piece/effect layer to sit behind/within the command surface if the benchmark demonstrates enough benefit;
- retain an evolved SVG renderer as a supported fallback and potentially as the low-effects/reduced-motion path.

This is deliberately not the final renderer decision. WP1 only selects WebGL as the primary visual layer if the technical spike demonstrates clear value without sacrificing the current accessibility/navigation/deployment contracts.

## Remaining WP1 work

1. Adapt representative current map state into `MapPresentationFrame` without changing `GameState`.
2. Build the evolved-SVG spike against that frame.
3. Build the WebGL capability/scene spike against the same frame, using a minimal dependency path appropriate to Vite/GitHub Pages.
4. Benchmark both using identical scene counts and camera actions.
5. Validate keyboard/pointer selection and fallback behaviour.
6. Record the final renderer decision and evidence.
7. Run full tests, TypeScript, production build and deterministic balance parity before WP1 merge.
