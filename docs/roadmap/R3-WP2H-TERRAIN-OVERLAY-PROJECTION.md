# R3-WP2H — Terrain Overlay Projection & Collision Correction

## Purpose

Correct the remaining live-review defects in the MapLibre terrain operational overlay after WP2G:

1. geography-critical strategic-node presentation can visibly diverge under pitched terrain (reported at Dover and Calais), despite both representations using the same authoritative WGS84 coordinates;
2. co-located player formation cards are geographically anchored but overlap because the current 24px fan-out is smaller than the rendered card footprint;
3. the existing browser evidence can miss both classes of defect because it compares DOM markers with other DOM markers and measures centre-point distance rather than rendered rectangle collisions.

This work is presentation-only. The simulation, saves, territory/route topology, strategic-network authority, intelligence authority and balance must remain unchanged.

## Constraints

- MapLibre remains the terrain/geographic renderer.
- Copernicus terrain remains unchanged.
- SVG fallback and compact terrain modes must remain functional.
- Do not reintroduce large fixed pixel offsets that make formation geography misleading at wide zoom.
- Do not hide ordinary player formations to solve collisions.
- Do not change strategic-node coordinates to compensate for a rendering/projection defect.
- Three.js formation pieces remain a later R3 work package; WP2H must stabilise the current interim operational overlay first.

## WP2H-A — Prove the strategic-node projection defect

Before changing node rendering, extend the Chromium runtime evidence so Dover and Calais are measured under Theatre, Campaign and Selected/Local camera presets.

For each measured node capture:

- authoritative WGS84 coordinate;
- `map.project(node.position)` screen point;
- DOM operational marker bounding-box centre;
- rendered `campaign-strategic-nodes` map-layer feature position/coverage using `queryRenderedFeatures` or equivalent map-engine evidence;
- `map.queryTerrainElevation(node.position)` when terrain is available;
- current zoom, pitch and bearing.

Run the same evidence at pitch 0 where practical so any terrain/pitch dependency is explicit.

The diagnostic must establish which duplicate representation is visually/geometrically divergent. Do not assume in advance that either the DOM marker or map-layer circle is correct.

## WP2H-B — One geographic representation per strategic node

Once WP2H-A proves the mismatch, make geography-critical strategic nodes use one consistent terrain-aware rendered anchor.

Preferred outcomes:

- if the existing MapLibre style-layer representation is the reliable geographic anchor, render the node icon/text through a MapLibre symbol/circle strategy and remove the conflicting duplicate DOM geography;
- if the DOM MapLibre Marker is the reliable anchor, remove the duplicate/conflicting style-layer point rather than displaying two different positions for one node;
- if both systems are internally valid but use different terrain semantics, choose one representation and remove the duplicate.

Requirements:

- Dover and Calais must appear once at their authoritative geographic location;
- node interaction/territory selection must remain available;
- no strategic-node source coordinates may be altered as a visual correction;
- node labels must remain readable at supported LODs without looking detached from their node icon.

## WP2H-C — Footprint-aware formation clustering

Replace the fixed 24px formation fan-out with a deterministic layout based on the rendered formation-card footprint for the current LOD.

Minimum behaviour:

- one group: centred on the authoritative territory anchor;
- two groups: non-overlapping symmetric pair;
- three groups: compact deterministic cluster with no overlap;
- four groups: compact 2x2 cluster with a visible gap;
- additional groups: deterministic compact grid/cluster that remains centred on the authoritative territory anchor.

The cluster centroid must stay on the territory anchor. Spacing should scale with the existing marker LOD scale rather than grow into large arbitrary geographic displacement.

All player formations remain protected from declutter hiding.

## WP2H-D — Replace weak visual evidence

Extend the permanent Chromium visual gate so it fails when:

- Dover or Calais node icon/label diverges materially from its chosen map-engine geographic anchor;
- duplicate node representations appear at conflicting positions;
- any player formation is hidden;
- any pair of visible player formation cards in the same territory has intersecting rendered bounding boxes beyond a very small tolerance;
- a formation cluster leaves the map canvas at Theatre/Campaign scale;
- the cluster centroid drifts materially away from its authoritative territory anchor.

Do not use another DOM territory label as the sole geographic oracle.

Capture screenshots for Theatre, Campaign and Selected/Local evidence.

## Front-line visual note

The orange short segments are the existing presentation-only front indicators generated where player-controlled territory borders enemy-controlled territory. They are not roads, supply lines or movement paths.

Their visual language is currently ambiguous. WP2H should document that ambiguity but should not expand into a major front-line redesign unless a minimal clarity adjustment is necessary to validate the overlay. A dedicated later presentation pass should replace the isolated orange ticks with a clearer front-boundary treatment.

## Acceptance

WP2H is ready to merge only when:

- exact-head production build and regression tests pass;
- WP2B/WP2C/WP2D/WP2F terrain/runtime visual gates remain green;
- WP2E performance gate remains within budget;
- 720-campaign balance parity remains unchanged;
- new Chromium evidence proves Dover/Calais geographic consistency under pitched terrain;
- new Chromium evidence proves co-located formation cards do not overlap;
- no gameplay/save/topology/intelligence-authority files are modified.
