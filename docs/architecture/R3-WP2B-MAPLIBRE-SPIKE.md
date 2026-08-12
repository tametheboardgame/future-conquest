# R3-WP2B MapLibre Terrain Spike

## Purpose

Prove the approved continuous-terrain direction before replacing the stable SVG campaign renderer.

## Spike scene

Representative theatre bounds: `[-5.8, 44.0, 14.8, 53.8]` WGS84, covering southern England, northern/central France, Benelux, western Germany, Switzerland and Alpine relief.

Initial camera target:

- theatre: oblique regional overview;
- campaign: closer command-map framing;
- selected: local inspection without tactical-battle scale.

Initial terrain exaggeration: `2.0`.

## Required proof

1. A MapLibre host can initialise inside the existing React/Vite application without becoming gameplay-authoritative.
2. A `raster-dem` terrain source can drive a single continuous surface.
3. Existing WGS84 campaign GeoJSON can be placed directly as political overlays.
4. Ownership wash and borders do not alter terrain elevation.
5. MapLibre camera changes remain presentation-only.
6. Terrain/source failure selects the SVG fallback instead of blocking play.
7. No runtime secret is required to display committed/approved terrain assets.
8. GitHub Pages production paths and CORS behaviour are validated.
9. Reduced-effects/mobile can prefer the SVG path until the terrain renderer proves acceptable there.

## Implementation stages

### Stage 1 — isolated host

Add MapLibre dependency and an experimental React terrain host behind an explicit renderer selection boundary. Do not delete or rewrite `MapView`.

### Stage 2 — DEM scene

Connect a legal prototype `raster-dem` source. During development this may be a temporary public/demo source solely to prove renderer plumbing; the merge gate requires the production data contract in `R3-WP2B-TERRAIN-DATA.md` and approved attribution.

### Stage 3 — current political geometry

Add the existing vertical-slice GeoJSON as a MapLibre source. Use fill/line layers for ownership and borders. No new territory IDs or geometry authoring.

### Stage 4 — strategic front/selection cues

Port the already-tested derived political/front visual semantics above the terrain without carrying forward the raised-polygon depth shell.

## Decision gate

The new renderer becomes the normal desktop campaign map only after a deployed prototype is visually approved and technical parity is demonstrated. Until then the stable SVG renderer remains the default live path.
