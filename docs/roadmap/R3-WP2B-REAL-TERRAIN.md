# R3-WP2B — Real Terrain Foundation

Status: COMPLETE / MERGED

Product-owner decision: 2026-08-11.

## Why this package exists

R3-WP2 successfully proved the presentation separation, political/front hierarchy, hit-testing preservation and performance envelope, but human visual review exposed an art-direction flaw in the raised-territory treatment: individual political regions can read as floating slabs rather than geography.

WP2B therefore replaced **territory extrusion as terrain** with a **single continuous geospatial terrain surface**. Political territory remains a derived overlay on that terrain. The intended reference feeling is a stylised grand-strategy campaign landscape / physical relief command table, not photorealistic Google Earth and not a tactical battlefield simulator.

This was an approved art-direction correction, not a gameplay redesign.

## Selected technical direction

Primary terrain/map platform: **MapLibre GL JS**.

Terrain source direction: **Copernicus DEM**, preferring GLO-30 source material where permitted/practical and allowing GLO-90/downsampled terrain as a production fallback where access, size or performance makes 30 m source material unnecessary.

Surface appearance: **stylised real-earth terrain**, derived from legal/open geographic or earth-observation inputs rather than raw Google satellite imagery as the permanent visual identity.

3D pieces: **Three.js through a MapLibre custom 3D layer** when WP3 resumes. MapLibre owns geospatial camera/terrain/tile/picking responsibilities; Three.js is reserved for game objects/effects that benefit from actual 3D geometry.

Runtime service boundary: the shipped browser must not contain Copernicus client secrets. Authenticated Copernicus processing/download belongs in an asset-generation pipeline or controlled build step. Production terrain assets should be static/versioned or served from an explicitly approved public tile source with attribution and availability understood.

Legacy renderer: the existing SVG/DOM strategic map remains an accessible/reduced-effects/failure fallback while the terrain renderer matures.

## Art direction

The map is one continuous landscape:

- sea at a common low plane;
- plains remain physically low;
- mountain systems rise because of elevation data, not political boundaries;
- terrain elevation may be exaggerated for strategic readability, with ~2× as the initial prototype value rather than a permanent rule;
- ownership is a translucent ground tint / boundary treatment;
- administrative borders are markings on the landscape;
- opposing-control fronts remain a stronger strategic overlay;
- terrain texture should be natural but deliberately stylised/desaturated so forces, routes and warnings win the visual hierarchy;
- cities, forests, rivers and infrastructure should become increasingly legible with zoom without recreating a consumer satellite map.

Political capture must never alter the physical terrain mesh.

## Prototype theatre

The first representative terrain spike covered the corridor from **southern England through Paris/Belgium/Rhine into Switzerland and the Alps**. This intentionally exercised:

- sea/coast;
- flat lowland;
- dense political geography;
- urban concentration;
- river corridors;
- major relief and Alpine terrain;
- the crowded Benelux/Rhine region that stressed the SVG map.

The prototype did not expand campaign mechanics or change the current fifteen authoritative campaign territories.

## Completed work slices

### WP2B-A — Platform and data boundary

- MapLibre added as an isolated presentation capability rather than a gameplay authority;
- terrain configuration/manifests and source attribution metadata established;
- geospatial camera presets and projection helpers established;
- no-secret browser data boundary established;
- explicit legacy-SVG fallback preserved.

### WP2B-B — Representative real-terrain scene

- continuous DEM terrain rendered over the prototype theatre;
- relief/hillshade and restrained stylised surface added;
- initial ~2× vertical exaggeration proved and compact profile reduced to ~1.6×;
- pitch, bearing, zoom and campaign camera framing proved;
- graceful loading/error fallback proved;
- 82 self-hosted Terrain-RGB tiles generated from Copernicus GLO-30 source material at approximately 6.1 MB.

### WP2B-C — Strategic overlays on terrain

- current territory geometry projected onto the geospatial surface;
- ownership wash, administrative borders and opposing-control fronts separated;
- selected/targeted/threatened/combat state projected without changing authoritative state semantics;
- strategic routes/nodes reused authoritative network definitions;
- information boundaries and contextual navigation preserved.

### WP2B-D — Interaction, performance and fallback gate

- selection/picking parity with existing map;
- compact desktop/mobile behaviour;
- keyboard/reduced-motion/accessibility fallback behaviour;
- representative terrain/render pressure budgets;
- GitHub Pages/CORS/assets validation;
- exact simulation/save/balance parity;
- real Chromium browser gate proving the terrain canvas is visibly rendered in the campaign map.

## Runtime hardening after initial merge

The first deployed terrain prototype exposed runtime-only integration defects that compile/build tests did not catch. Follow-up hotfixes therefore established permanent browser evidence for:

- MapLibre WebGL2 -> WebGL fallback capability;
- valid MapLibre zoom expressions;
- explicit MapLibre Vite worker bundling so GeoJSON sources load in production;
- host sizing that cannot be collapsed by MapLibre's own `.maplibregl-map` CSS;
- actual visible campaign-map rendering rather than DOM/canvas existence alone.

These lessons are now part of the permanent terrain CI boundary.

## Acceptance outcome

WP2B successfully proved:

- terrain reads as one continuous landscape and no territory is physically elevated by ownership;
- recognisable strategic relief across the representative England/France/Benelux/Rhine/Alps corridor;
- authoritative territory IDs, adjacency, orders, routes, saves and deterministic campaign outcomes remained unchanged;
- enemy uncertainty boundaries remained unchanged;
- browser runtime contains no private Copernicus/API credential;
- required attribution is documented;
- renderer failure falls back to SVG/DOM;
- compact desktop/mobile has a deliberate reduced-effects/fallback path;
- production build and GitHub Pages deployment are reproducible;
- complete tests and deterministic balance validation remained green;
- product-owner visual review approved the **broad real-terrain direction**.

The foundation package did not claim final-Europe coverage or final visual polish. Those follow-on concerns are now owned by WP2C/WP2D.

## Explicit non-goals retained

- no Google Maps / Google Earth runtime dependency;
- no consumer-photorealistic recreation of Europe as the art style;
- no gameplay elevation mechanic unless separately approved later;
- no changed movement costs, territory boundaries, route topology or combat rules from visual elevation;
- no requirement to ship raw 30 m DEM data to every browser;
- no 3D city/building simulation in this gate;
- no continuation of the WP2 raised-political-slab effect as the primary map.

## Handoff

R3-WP2C subsequently restored operational information parity over the terrain renderer. R3-WP2D is now the active intensive terrain-refinement package and owns Europe footprint expansion, source robustness, camera/safe-area refinement, overlay hierarchy and marker declutter.

R3-WP3 remains approved in principle but **PAUSED** until WP2D receives product-owner visual acceptance. Existing exploratory WP3 piece styling may be reused selectively after the refined terrain surface is accepted; substantial movement-animation architecture should not be built around an unrefined map foundation.