# R3-WP2B Terrain Data & Runtime Boundary

## Decision

Future Conquest does not query authenticated Copernicus DEM services from the shipped browser. Terrain acquisition and conversion are build/tooling concerns; runtime consumes versioned static terrain assets committed with the game.

The production-shaped contract is:

`public Copernicus DEM COG -> controlled build-time preprocessing -> static Mapbox Terrain-RGB PNGs + TileJSON -> MapLibre raster-dem source -> continuous campaign terrain`

COP-DEM-GLO-30 is the preferred source. COP-DEM-GLO-90 remains an approved preprocessing fallback where source coverage, processing cost or campaign-scale delivery makes that preferable.

## Implemented WP2B-B pipeline

`scripts/build-r3-copernicus-terrain.py` reads the public Copernicus DEM Cloud Optimized GeoTIFF distribution using HTTP range requests, mosaics only the source cells required for each bounded web tile, resamples to 256 px and encodes elevation using the Mapbox Terrain-RGB convention.

The representative southern-England-to-Alps prototype generated:

- bounds: `[-5.8, 44.0, 14.8, 53.8]`;
- zooms: 4 through 7;
- 82 Terrain-RGB PNGs;
- approximately 6.1 MB total static terrain footprint;
- 81 output tiles using GLO-30 source material;
- zero GLO-90 fallback tiles required for the current prototype;
- one sea-only output tile;
- measured elevation range approximately -248.6 m to 4,535.8 m.

The generated manifest is committed at `public/generated/r3-terrain/tiles.json` and records source family, preferred/fallback dataset, encoding, bounds, generation statistics and attribution. Production build smoke testing verifies that the manifest and all 82 PNGs survive into `dist/generated/r3-terrain/`.

Terrain regeneration is explicit rather than automatic on every presentation commit. The committed asset set is deterministic input to normal game builds; regenerate it only when bounds, source choice, zoom range or preprocessing intentionally changes.

## Runtime rules

1. No terrain acquisition credential or access token belongs in Vite/browser output.
2. MapLibre requests only the generated same-origin Terrain-RGB assets during normal WP2B runtime.
3. If generated terrain cannot initialise, the game returns to the stable SVG command map rather than depending on a third-party demo terrain service.
4. Keep required source attribution adjacent to the generated terrain manifest and visible in the prototype.
5. Preserve WGS84 longitude/latitude coordinates from the existing authoritative GeoJSON so political geometry is projected without inventing a parallel territory model.
6. Terrain/elevation remains presentation only: it does not alter adjacency, routes, movement, combat, logistics or save state.
7. Keep the SVG renderer available until MapLibre terrain passes product-owner visual review and technical parity gates.

## Surface treatment

WP2B-B deliberately does not use a consumer satellite/web-map raster as the visual identity. The self-hosted DEM drives a stylised campaign surface composed from elevation colour relief, hillshade, a restrained land wash, coastline treatment and subdued sea. Political ownership remains a translucent overlay laid onto that continuous landscape.

## Renderer split

MapLibre owns geographic projection, terrain LOD, pitch/bearing/zoom camera, elevation/hillshade and geographic map picking.

The gameplay engine continues to own territory identity/control, adjacency/routes, formations/orders, combat/logistics, intelligence boundaries, save state and deterministic resolution.

Three.js, when introduced after WP2B, owns only presentation objects such as physical formation miniatures/effects through a MapLibre custom 3D layer. It does not own geography or simulation.
