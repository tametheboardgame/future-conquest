# R3-WP2D — Terrain Refinement & Presentation Polish

Status: APPROVED / ACTIVE

Product-owner approval: 2026-08-12.

## Why this package exists

R3-WP2B proved the continuous Copernicus/MapLibre terrain foundation and R3-WP2C restored the operational information that the mature SVG map already exposed. Product-owner visual review of the deployed `?terrain=1` build confirmed that the direction is now substantially closer to the intended grand-strategy / physical relief command-table experience and that the top-down / pitched 2.5D camera is a strong part of the final visual identity.

The same review also showed that the terrain path is not yet visually finished. The representative DEM footprint is smaller than the intended Europe theatre, one live terrain tile request can fail, political/territory linework is visually noisy in places, dense markers need stronger collision/safe-area behaviour, and the operational markers can intrude beneath the terrain status/control panel.

WP2D is therefore an intensive second pass focused on **refining the terrain presentation until it is robust, legible and visually cohesive enough to become the accepted foundation for WP3**. This remains a presentation package: simulation authority, territory topology, save state and deterministic campaign behaviour remain mechanically frozen.

## Product-owner visual direction

The accepted target is:

- one continuous real-elevation European campaign landscape;
- a command-table / Total-War-campaign-map feeling rather than consumer Google Earth;
- a camera that can move convincingly between strategic top-down and pitched 2.5D views;
- geography visually dominant at theatre scale, with political/operational information layered cleanly above it;
- screen-space formation/intelligence pieces that feel anchored to the terrain while remaining readable;
- restrained, consistent political boundaries rather than a dense web of equal-weight administrative lines;
- important fronts, operations, threats and selected objects visually winning the hierarchy;
- map markers never colliding with persistent map HUD/status/control surfaces;
- no terrain-source warning/error during normal supported play.

Terrain beauty can continue to improve later in R3, but WP2D must leave the renderer feeling intentionally designed rather than technically demonstrated.

## Work slices

### WP2D-A — Terrain source robustness & Europe theatre footprint

- eliminate the live missing-tile/source warning path seen during product-owner review;
- distinguish harmless out-of-manifest/sea requests from genuine terrain failure;
- ensure MapLibre requests resolve safely on the GitHub Pages base path;
- expand or regenerate the static terrain footprint so theatre framing covers the intended Europe view rather than only the original England–France–Benelux–Rhine–Alps spike;
- keep terrain static/self-hosted and browser-secret-free;
- retain explicit attribution and SVG fallback.

### WP2D-B — Camera, framing & safe viewport

- formalise Theatre, Campaign and Selected camera presets against the expanded footprint;
- preserve both top-down and pitched 2.5D use as first-class views;
- add map safe-area insets for the terrain status/control box, zoom controls and surrounding command HUD;
- ensure markers and automatic camera targets remain out from underneath persistent terrain UI;
- preserve keyboard, reduced-motion and compact/mobile behaviour.

### WP2D-C — Political/front/route hierarchy cleanup

- simplify administrative borders at wide views;
- make active control boundaries and fronts distinct from passive political lines;
- tune ownership opacity so terrain remains readable;
- refine selected/targeted/operation/threat treatments;
- reduce route/node noise while preserving damaged, blocked, bottleneck and selected supply exceptions;
- ensure dense Benelux/Rhine and Alpine states read as deliberate operational information rather than line soup.

### WP2D-D — Marker declutter & command-piece presentation

- introduce deterministic screen-space collision/priority rules for territory labels, cities/nodes, recon contacts, threats, operations and friendly formations;
- guarantee friendly formations, active threats/operations and selected objects win over passive labels;
- keep player-visible intelligence boundaries unchanged;
- make markers feel visually anchored to the map surface while staying readable during pitch/zoom;
- prevent markers from rendering beneath the terrain status/control panel;
- retain contextual click/selection parity with the SVG map.

### WP2D-E — Intensive visual/performance/accessibility validation

- add browser-runtime gates for missing terrain requests, safe-area overlap and representative dense-map readability;
- capture representative top-down and pitched screenshots for visual review;
- preserve terrain asset/lazy-chunk budgets or explicitly justify measured revisions;
- full repository tests/build;
- deterministic 720-campaign balance/trace parity;
- final diff/save/topology/intelligence-boundary review;
- deploy hidden `?terrain=1` candidate and obtain product-owner visual acceptance before making terrain primary or resuming substantial WP3 movement work.

## Acceptance criteria

WP2D is complete only when:

- supported terrain play produces no missing-tile/source warning in the intended Europe camera envelope;
- Theatre view presents the intended European strategic footprint rather than the original small prototype corridor;
- Campaign and Selected presets remain useful in both top-down and pitched use;
- the terrain/control/status HUD has an explicit safe area and no operational marker can sit underneath it;
- friendly formations remain immediately visible and clickable;
- cities/location labels are useful without dominating the map;
- recon contacts, threats and operations remain readable without exposing hidden information;
- administrative borders, control borders, fronts and routes have a clear visual hierarchy;
- dense Benelux/Rhine/Alpine scenes remain legible;
- no gameplay authority, territory IDs/adjacency, route topology, save schema or deterministic campaign result is changed by presentation work;
- mobile/compact/reduced-motion/SVG fallback behaviour remains deliberate and usable;
- full tests, production build, browser runtime probes and deterministic balance validation are green;
- product-owner review approves the refined terrain foundation.

## Explicit non-goals

- no gameplay elevation effects;
- no movement-cost/combat bonuses from physical terrain;
- no replacement of authoritative territory adjacency or strategic-network topology;
- no Google Maps/Earth runtime dependency;
- no exact hidden enemy formations on the map;
- no large WP3 movement-animation implementation before WP2D visual acceptance;
- no full R3 visual-polish audit — WP9 still owns final integrated polish.

## WP3 dependency

R3-WP3 remains approved but paused. Once WP2D receives product-owner visual acceptance, WP3 resumes on this terrain foundation using Three.js/MapLibre custom 3D layers where useful for physical formation pieces and movement, while the stable SVG map remains the accessibility/reduced-effects/failure fallback.