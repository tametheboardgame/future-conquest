# R3-WP2B — Real Terrain Foundation

Status: APPROVED / ACTIVE

Product-owner decision: 2026-08-11.

## Why this package exists

R3-WP2 successfully proved the presentation separation, political/front hierarchy, hit-testing preservation and performance envelope, but human visual review exposed an art-direction flaw in the raised-territory treatment: individual political regions can read as floating slabs rather than geography.

WP2B therefore replaces **territory extrusion as terrain** with a **single continuous geospatial terrain surface**. Political territory remains a derived overlay on that terrain. The intended reference feeling is a stylised grand-strategy campaign landscape / physical relief command table, not photorealistic Google Earth and not a tactical battlefield simulator.

This is an approved art-direction correction, not a gameplay redesign.

## Selected technical direction

Primary terrain/map platform: **MapLibre GL JS**.

Terrain source direction: **Copernicus DEM**, preferring GLO-30 source material where permitted/practical and allowing GLO-90/downsampled terrain as a production fallback where access, size or performance makes 30 m source material unnecessary.

Surface appearance: **stylised real-earth terrain**, derived from legal/open geographic or earth-observation inputs rather than raw Google satellite imagery as the permanent visual identity.

3D pieces: **Three.js through a MapLibre custom 3D layer** when WP3 resumes. MapLibre owns geospatial camera/terrain/tile/picking responsibilities; Three.js is reserved for game objects/effects that benefit from actual 3D geometry.

Runtime service boundary: the shipped browser must not contain Copernicus client secrets. Authenticated Copernicus processing/download belongs in an asset-generation pipeline or controlled build step. Production terrain assets should be static/versioned or served from an explicitly approved public tile source with attribution and availability understood.

Legacy renderer: the existing SVG/DOM strategic map remains an accessible/reduced-effects/failure fallback until the terrain renderer proves deployment, interaction, performance and readability parity.

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

The first representative terrain spike covers the corridor from **southern England through Paris/Belgium/Rhine into Switzerland and the Alps**. This intentionally exercises:

- sea/coast;
- flat lowland;
- dense political geography;
- urban concentration;
- river corridors;
- major relief and Alpine terrain;
- the crowded Benelux/Rhine region that stressed the SVG map.

The prototype does not expand campaign mechanics or change the current fifteen authoritative campaign territories.

## Work slices

### WP2B-A — Platform and data boundary

- add MapLibre as an isolated presentation capability rather than replacing game state;
- define terrain configuration/manifests and source attribution metadata;
- define geospatial camera presets and projection helpers;
- establish a no-secret browser data boundary;
- preserve an explicit legacy-SVG fallback switch.

### WP2B-B — Representative real-terrain scene

- render continuous DEM terrain over the prototype theatre;
- add relief/hillshade and a restrained stylised surface;
- test initial vertical exaggeration around 2×;
- support pitch, bearing, zoom and bounded campaign camera framing;
- prove graceful loading/error fallback.

### WP2B-C — Strategic overlays on terrain

- project current territory geometry onto the geospatial surface;
- render ownership wash, administrative borders and opposing-control fronts as separate concepts;
- project selected/targeted/threatened/combat state without changing authoritative hit/state semantics;
- preserve information boundaries and contextual navigation.

### WP2B-D — Interaction, performance and fallback gate

- selection/picking parity with existing map;
- compact desktop/mobile behaviour;
- keyboard/reduced-motion/accessibility fallback behaviour;
- representative terrain/render pressure measurements;
- GitHub Pages/CORS/assets validation;
- exact simulation/save/balance parity;
- human visual review before WP3 resumes.

## Acceptance criteria

WP2B may replace the current primary campaign map only when all of the following are true:

- terrain reads as one continuous landscape and no territory appears physically detached or elevated by ownership;
- the prototype shows recognisable strategic relief from England/France/Benelux/Rhine into the Alps;
- territory control, fronts, selection and threats remain clearer than the underlying terrain;
- authoritative territory IDs, adjacency, orders, routes, saves and deterministic campaign outcomes remain unchanged;
- enemy uncertainty boundaries are unchanged;
- camera presets remain useful from theatre to local/tactical inspection;
- the browser contains no private Copernicus/API credential;
- required attribution is visible and documented;
- renderer failure or unsupported capability falls back to the stable SVG/DOM map rather than blocking play;
- compact desktop remains fully usable and mobile has a deliberate reduced-effects path;
- production build and GitHub Pages deployment are reproducible;
- complete tests and deterministic balance validation remain green;
- product-owner visual review approves the terrain direction before substantial WP3 movement animation is resumed.

## Explicit non-goals

- no Google Maps / Google Earth runtime dependency;
- no consumer-photorealistic recreation of Europe as the art style;
- no gameplay elevation mechanic unless separately approved later;
- no changed movement costs, territory boundaries, route topology or combat rules from visual elevation;
- no requirement to ship raw 30 m DEM data to every browser;
- no 3D city/building simulation in this gate;
- no continuation of the WP2 raised-political-slab effect as the primary map.

## WP3 dependency

R3-WP3 remains approved in principle but **PAUSED** until WP2B establishes the stable terrain surface. Existing exploratory WP3 piece styling may be reused selectively after the map surface is accepted; no movement-animation architecture should be built around the old raised-territory renderer.
