# R3-WP2B Live Review Hotfix

Status: ACTIVE

Triggered by the first product-owner review of the deployed `?terrain=1` build on 2026-08-12.

Observed defects:

1. `?terrain=1` displayed the stable SVG renderer rather than the requested MapLibre terrain on the review machine.
2. The SVG Layers popover rendered beneath the map surface.

Corrections:

- terrain capability probing follows MapLibre's WebGL fallback model by accepting `webgl2` or `webgl` rather than rejecting any browser without WebGL2 during the preflight;
- actual MapLibre initialisation/data failure still falls back safely to SVG;
- terrain fallback is now visible and retryable during prototype review rather than only logged to the console;
- R3 strategic-map CSS no longer changes the existing absolute map controls/status overlays to relative positioning, and those overlays remain above the SVG surface;
- focused regressions lock both corrections.

No gameplay, save, balance, territory, adjacency, route-topology or hidden-information changes are permitted in this hotfix.
