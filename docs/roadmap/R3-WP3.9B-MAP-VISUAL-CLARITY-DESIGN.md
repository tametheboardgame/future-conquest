# R3-WP3.9B - Map Visual Clarity and Grading

Status: **ACTIVE / SECOND VISUAL REVIEW REQUIRED / WP4 BLOCKING**

Current refinement branch: `agent/r3-wp3-9b1-ownership-border-clarity`

Authoritative parent programme: `docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md`

## Objective

Remove the uniform green/dingy cast and the remaining stacked-overlay appearance identified in live product-owner review, while preserving the restrained military-command atmosphere and all strategic readability.

The intended result is cleaner and more natural, not bright, saturated or arcade-like. The terrain should read as the physical board surface; political ownership should read primarily on territory edges rather than as colour spread across the terrain.

## Audit result

The production terrain is not satellite imagery with a CSS overlay placed over it. It is a Copernicus DEM whose visible land colour is authored in MapLibre and then combined with hillshade.

### First review - green cast

The original renderer used an olive `r3-wp2b-land-wash` plus green/grey hillshade. The first WP3.9B candidate (`clean-neutral-v1`) corrected those colours to a neutral earth/stone grade.

### Second review - stacked shoreline / political treatment

Live review of `clean-neutral-v1` showed that the remaining problem was not primarily colour. Several layers were visually stacking around coasts and territory edges:

- the semi-transparent base land material;
- a pale generic administrative outline;
- a controller-coloured territory outline;
- broad state/interaction fills when relevant.

This can make coastlines and territorial edges look like translucent polygons laid over the 3D terrain. It also weakens the board-game read because ownership competes with terrain detail instead of being carried by a strong edge.

## Current candidate - `clean-border-v2`

### Terrain surface

The DEM still requires a land material beneath its hillshade. Removing that fill literally would expose the sea/background colour through the land because there is no hidden photographic basemap underneath.

The v2 solution is therefore:

- sea remains restrained slate-blue `#19313a`;
- land becomes a single opaque neutral board surface `#777a72`;
- hillshade remains neutral/warm;
- sea colour can no longer bleed through a semi-transparent land polygon;
- coastline becomes a very restrained neutral edge (`#b9c0b8`, opacity `0.13`).

This is intended to read as one terrain material rather than an overlay.

### Political ownership

Ownership moves off the terrain surface and onto the edges:

- broad controller/hover territory fill: **off**;
- broad selected/targeted/threat/combat state wash: **off**;
- generic pale administrative border: **off**;
- controller border: stronger, crisp and colour-coded;
- friendly controller colour: `#76f2e1`;
- enemy controller colour: `#ff776f`;
- a wider low-opacity blurred line underneath provides a restrained illuminated-board edge without turning the map into neon UI.

Dedicated operational state remains available through the existing high-priority state-outline layer and orange/red front language. Selection, targeting, threat and combat are therefore still explicit without tinting the whole territory.

## Implementation boundary

The revision remains presentation-only through `src/presentation/r3-map-visual-grading.ts` after the MapLibre style is ready.

It may change paint properties or add the presentation-only `campaign-control-border-glow` layer, but it does not alter:

- terrain DEM source or exaggeration;
- political geometry;
- strategic-node or formation coordinates;
- territory/control simulation state;
- operational threat/front derivation;
- route semantics;
- authored glTF materials;
- save state, deterministic simulation or balance;
- `?terrain=0` fallback.

Runtime evidence remains exposed through `window.__r3MapVisualGrading` and the host `data-visual-grading` marker.

## Visual review matrix

The exact-head browser gate must capture at minimum:

1. Theatre - Western/Central Europe;
2. Campaign - Atlantic France / Brittany / Channel coast, directly covering the reported shoreline issue;
3. Campaign - London / Paris / Benelux;
4. Campaign - Switzerland / Austria and Alpine relief;
5. Selected/local - Alpine city/terrain detail;
6. authored city miniatures and friendly formations visible against the revised terrain;
7. controller borders visibly stronger than the removed generic administrative treatment;
8. operational front and state-outline colours unchanged.

The runtime test must fail if broad controller fill, state wash or the generic administrative border remains visible.

## Acceptance

Do not merge the v2 refinement on CI alone. Product-owner review must confirm that:

- the coast no longer reads as stacked translucent overlays;
- terrain detail is clearer;
- controller ownership is easier to read from the illuminated borders;
- the stronger borders remain restrained enough for the physical-board aesthetic.
