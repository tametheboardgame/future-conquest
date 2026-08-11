# R3-WP2B Terrain Data & Runtime Boundary

## Decision

Future Conquest will not query authenticated Copernicus DEM services directly from the shipped browser. Copernicus client credentials are build/tooling secrets and must never be embedded in Vite output, committed configuration or browser network code.

The runtime contract is therefore:

`Copernicus DEM source -> controlled preprocessing/downsampling -> versioned terrain assets or approved public terrain endpoint -> MapLibre raster-dem source -> continuous campaign terrain`

The first prototype prefers COP-DEM-GLO-30 source material where access and preprocessing are practical. COP-DEM-GLO-90 is an approved fallback because campaign-scale rendering does not require every browser to receive raw 30 m source data.

## Current service facts affecting implementation

- Copernicus Data Space Sentinel Hub requests are OAuth2-authenticated.
- Copernicus documents both COPERNICUS_30 and COPERNICUS_90 DEM instances.
- The 30 m view service has additional access-category requirements from 28 July 2026, so production architecture must not assume anonymous direct 30 m tile access.
- MapLibre terrain consumes a `raster-dem` source and supports terrain exaggeration.

These constraints reinforce preprocessing/static delivery rather than weakening the selected Copernicus source direction.

## Prototype data rules

1. Do not commit OAuth client IDs/secrets or short-lived access tokens.
2. Do not make the game fail to load because terrain tiles are unavailable.
3. Keep source attribution metadata adjacent to the terrain manifest.
4. Prefer derived/downsampled terrain appropriate to the visible campaign scale instead of shipping raw source resolution.
5. Preserve WGS84 longitude/latitude coordinates from the existing authoritative GeoJSON so political geometry can be projected without inventing a parallel territory model.
6. Keep the SVG renderer available until MapLibre terrain passes product-owner visual review and technical parity gates.

## Renderer split

MapLibre will own:

- geographic projection;
- terrain tile loading/LOD;
- pitch/bearing/zoom camera;
- terrain elevation/hillshade;
- geographic feature layers and map picking.

The gameplay engine continues to own:

- territory identity/control;
- adjacency and routes;
- formations and orders;
- combat/logistics;
- hidden-information semantics;
- save state and deterministic resolution.

Three.js, when introduced in WP3, will own only presentation objects such as physical formation miniatures/effects through a MapLibre custom 3D layer. It will not own geography or simulation.
