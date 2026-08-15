# R3-WP3.9B - Map Visual Clarity and Grading

Status: **ACTIVE / VISUAL REVIEW REQUIRED / WP4 BLOCKING**

Branch: `agent/r3-wp3-9b-map-visual-clarity`

Authoritative parent programme: `docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md`

## Objective

Remove the uniform green/dingy cast identified in live product-owner review while preserving the restrained military-command atmosphere and all strategic readability.

The intended result is cleaner and more natural, not bright, saturated or arcade-like.

## Audit result

The production terrain is not satellite imagery with a CSS overlay placed over it. It is a Copernicus DEM whose visible land colour is authored in MapLibre and then combined with hillshade. The green cast is therefore primarily introduced inside the renderer itself.

### Primary source - land ground tone

`TerrainMapPrototypeImpl.tsx` currently defines `r3-wp2b-land-wash` as:

- colour `#6c805b`;
- opacity up to `0.30` in the full Theatre view;
- still `0.27` around Campaign LOD.

That olive ground tone is drawn continuously over European land and is the largest contributor to the broad green appearance.

### Secondary source - relief palette

The existing hillshade uses:

- shadow `#161b18`;
- highlight `#d5d8ca`;
- accent `#6c6759`.

The combination is dark and slightly green/grey. It increases the sense of a green-brown veil when stacked with the olive land ground tone.

### Three.js physical-piece lighting

The soldier layer uses ambient `0xd9f6ee` plus warm directional `0xfff2d4`.
The world-miniature layer uses ambient `0xe6f1e9` plus warm directional `0xffefcf`.

These ambient lights have a slight cool/green bias, but they are close to white and are not the dominant source of the screenshot-wide cast. The first WP3.9B candidate therefore deliberately leaves physical-piece lighting unchanged rather than simultaneously recolouring both the terrain and the authored assets. If product-owner visual review still finds cities/soldiers green after the terrain grade is corrected, lighting can be tuned as a second controlled variable.

### CSS / shell audit

No full-map CSS `filter`, hue rotation, saturation filter or coloured pseudo-element was found over the MapLibre canvas. The dark translucent toolbar, labels and command UI only cover their own interface surfaces and are not responsible for the uniform map cast.

### Operational overlays

Threat/front/control colours are already semantically useful and are not the cause of the uniform wash. WP3.9B must retain the established orange/red threat language, friendly/enemy border distinction, route conditions and selected/targeted cues.

## Candidate grade - `clean-neutral-v1`

The first candidate changes renderer presentation only:

- sea: `#19313a` - restrained slate-blue rather than green-black;
- land: `#958d77` - muted neutral earth/stone rather than olive green;
- land opacity: 0.42 Theatre, 0.39 Campaign boundary, 0.31 local boundary, 0.22 deep local;
- hillshade shadow: `#242321`;
- hillshade highlight: `#eee7d8`;
- hillshade accent: `#8a8171`;
- coastline: `#c6c9bc` at 0.31 opacity;
- administrative border: `#dedbd1`.

The slightly higher land opacity is intentional. Because the DEM has no photographic colour texture underneath it, simply reducing the old green wash would make Europe darker rather than revealing hidden imagery. The correct solution is to replace the ground material with a more neutral one, not remove the land material entirely.

## Implementation boundary

The grade is applied through `src/presentation/r3-map-visual-grading.ts` after the MapLibre style is ready.

It changes only paint properties for:

- `r3-wp2b-sea`;
- `r3-wp2b-land-wash`;
- `r3-wp2b-hillshade`;
- `r3-wp2b-coastline`;
- `campaign-administrative-borders`.

It does not alter:

- terrain DEM source or exaggeration;
- camera presets;
- strategic-node or formation coordinates;
- territory/control simulation state;
- front/threat/route semantics;
- authored glTF materials;
- save state, deterministic simulation or balance;
- `?terrain=0` fallback.

The runtime exposes `window.__r3MapVisualGrading` and `data-visual-grading="clean-neutral-v1"` for exact browser verification.

## Visual review matrix

The exact-head browser gate must capture at minimum:

1. Theatre - Western/Central Europe;
2. Campaign - London / Paris / Benelux lowlands;
3. Campaign - Switzerland / Austria and Alpine relief;
4. Selected/local - Alpine city/terrain detail;
5. physical city miniatures and friendly formations visible against the revised ground;
6. operational labels/borders/front colours remaining legible.

## Acceptance

Do not merge this pass on CI alone. Product-owner review must confirm that the new grade is cleaner and materially less green/dingy without becoming bright, washed out or game-like.

If the terrain is accepted but physical pieces still appear colour-cast, perform a narrowly scoped Three.js light-neutrality refinement before merge rather than changing the terrain grade again.
