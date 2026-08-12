# R3-WP2C — Terrain Overlay Parity

## Trigger

Live product-owner review on 2026-08-12 confirmed that the Copernicus/MapLibre terrain surface now renders correctly, but the terrain path is not yet command-map equivalent. The terrain is visually successful while core operational information from the mature SVG map is absent or too subdued.

## Immediate objective

Restore the command information hierarchy over the 3D terrain before progressing to WP3.

### Required parity

- Friendly task groups visibly readable at campaign zoom.
- Player-visible enemy contacts and threat cues restored without exposing hidden formation data.
- Territory centre/location labels restored.
- Strategic nodes/cities readable at useful campaign zoom levels.
- Active operation and portal cues visible.
- Overlays remain screen-space readable while the terrain camera is pitched/zoomed.
- Existing political control, fronts, route state and selection remain visible beneath the operational layer.
- Chromium regression enters the actual campaign map and asserts that operational markers are present and visible.

## Non-goals for this package

- Further terrain colour/relief/art-direction tuning.
- New gameplay mechanics or authoritative state changes.
- Save-format changes.
- WP3 animated formation-piece work.

Terrain aesthetic refinement will follow once the terrain map has regained command-map playability.
