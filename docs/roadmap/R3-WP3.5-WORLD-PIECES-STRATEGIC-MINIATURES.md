# R3-WP3.5 - World Pieces & Strategic Miniatures

Status: APPROVED / ACTIVE / WP4 BLOCKING

Approved: 2026-08-14

Entry baseline: `main` at `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`, the merged, deployed and product-owner visually accepted R3 Stabilisation Gate build.

## Purpose

Replace the current technically functional operational-marker presentation with a coherent physical war-game layer: miniature army pieces, smooth geographically anchored movement, and 2.5D/3D representations of cities and strategically important infrastructure.

This package is intentionally inserted **before R3-WP4**. Battle/front/event feedback should be built against the intended physical-piece representation rather than against temporary marker/card presentation that would otherwise be replaced immediately afterwards.

The target experience is a premium strategy board game / military command table: readable miniature forces and strategic structures physically sitting on the real terrain, with exaggerated silhouettes and restrained materials suitable for campaign-map scale rather than photorealistic tactical rendering.

## Product-owner decision

The R3 Stabilisation Gate was visually accepted on 2026-08-14 after deployment of `1e6560cd871fc918d9914eb9cbf6da27b5a4e1c3`.

The accepted build established the critical baseline:

- the MapLibre/Copernicus 3D map is the production default;
- formations, labels and other operational markers remain geographically anchored through selection, zoom, pitch and camera/view transitions;
- the low-zoom land-mask artefact is fixed;
- front/route visual language is understandable;
- WP3 movement/formation state presentation is technically functional.

One known non-blocking P2 visual debt remains: the current marker/piece movement can feel sticky/stepped/guttery during camera movement and layout settlement. Do **not** spend a separate polishing pass on the temporary marker implementation. WP3.5 owns retiring or superseding that behaviour as part of the physical-piece movement architecture.

## Architectural rule

The simulation remains authoritative.

- MapLibre GL JS continues to own the geospatial camera, terrain, map projection, picking surface and terrain LOD.
- Authoritative formation/territory/node state continues to come from existing game/presentation adapters.
- 3D pieces, miniature cities and structure models are derived presentation only.
- Three.js through a MapLibre custom 3D layer is the preferred implementation direction for physical game pieces and world objects unless measured browser evidence demonstrates a better compatible approach.
- No 3D object may become a second source of position, ownership, strength, route progress, hidden-information state or gameplay truth.
- Existing geographic-anchor regressions remain mandatory. Replacing HTML/DOM markers must not reintroduce geographic drift.
- The SVG/DOM map remains the explicit `?terrain=0` fallback and must continue to communicate equivalent gameplay information without requiring 3D assets.

## Visual direction

Aim for **stylised strategic miniatures**, not photorealism.

Desired characteristics:

- strong silhouettes readable at small screen sizes;
- slightly exaggerated proportions appropriate to board-game miniatures;
- coherent material language across forces and structures;
- subtle bases, plinths, shadows or terrain-contact treatment so objects appear to sit on the landscape rather than float above it;
- restrained lighting/material response consistent with the existing real-terrain command-map direction;
- labels remain available where names/identity matter; 3D geometry must not replace necessary text clarity;
- no tactical-scale animation or hundreds of individually simulated soldiers.

## WP3.5A - Physical formation-piece system

Replace current temporary formation-marker visuals with actual 2.5D/3D miniature formations.

Requirements:

- represent a Task Group with a small readable miniature formation rather than a floating card/icon;
- initial direction is approximately 3-6 stylised future infantry figures or an equivalently readable grouped miniature representation per formation;
- retain formation identity and state without requiring the user to open a panel;
- support ready, selected, moving, attacking, recovering, garrison/holding and other existing states where the authoritative game state exposes them;
- selection should use a physical-board-game-compatible treatment such as a base ring, plinth emphasis, subtle halo or material highlight rather than replacing the piece with a large UI card;
- co-located formations must remain distinguishable/selectable;
- friendly pieces may use full miniature representation; enemy presentation must continue to respect existing intelligence/uncertainty boundaries and must not reveal exact force information merely because 3D assets exist;
- no gameplay authority change.

## WP3.5B - Smooth movement and terrain attachment

This package owns the current sticky/stepped movement debt.

Requirements:

- pieces remain tied to authoritative geographic coordinates at all times;
- ordinary movement interpolates smoothly between authoritative positions without altering simulation timing or order progress;
- piece orientation may turn approximately towards movement direction where useful;
- movement follows existing route/path information when available;
- camera zoom, pitch, selection and LOD changes must not cause pieces to jump, lag behind the terrain, accumulate offsets or re-enter DOM-flow-style displacement;
- movement completion must settle naturally and exactly on the authoritative destination;
- terrain height/elevation sampling must prevent floating pieces and pieces buried into slopes;
- a subtle stable base/contact treatment should keep pieces readable on uneven ground;
- reduced-motion mode receives a clear non-animated equivalent;
- the existing exact-browser geographic-anchor regression remains in force and should be extended to the 3D layer where practical.

## WP3.5C - City miniatures

Introduce derived miniature city objects while preserving labels and strategic readability.

Suggested hierarchy:

- **major/capital city:** larger, distinctive cluster with stronger skyline language;
- **important city:** medium building cluster;
- **ordinary represented city:** compact low-detail building cluster.

Requirements:

- cities remain geographically anchored to existing authoritative node coordinates;
- structures must appear grounded on terrain;
- labels remain available and collision-aware;
- visual scale is symbolic rather than literal geographic scale;
- city miniatures do not change territory ownership, population, resources or any simulation state;
- important cities may use recognisable broad silhouette language where sensible, but exact real-world landmark modelling is not required.

## WP3.5D - Strategic infrastructure miniatures

Create recognisable physical objects for strategically meaningful locations where existing game state already exposes them.

Candidate types include:

- logistics/supply hubs;
- ports;
- airports/airfields;
- rail/logistics nodes;
- industrial centres;
- command/administrative facilities where already authoritative;
- portal/future-force strategic site presentation where appropriate.

Visual-language examples:

- ports: dock/crane silhouette;
- airports: runway/hangar/airfield motif;
- industrial centres: factory/stack silhouette;
- logistics hubs: depot/container/warehouse motif.

Requirements:

- each structure type should be recognisable before reading its label where practical;
- no new infrastructure mechanics are introduced here;
- existing layer controls may hide/show categories where appropriate;
- structures must not overwhelm troop pieces, labels or fronts.

## WP3.5E - Level of detail, scale and performance

The physical map must remain readable and performant from Local/Selected through Campaign and Theatre views.

### Local / Selected

- richest miniature detail;
- full formation grouping;
- city/structure geometry visible where relevant;
- smooth movement and terrain contact visible.

### Campaign

- simplified geometry/material detail;
- core formation silhouette retained;
- strategic cities/infrastructure remain readable;
- avoid clutter in dense Benelux/Rhine/urban regions.

### Theatre

- strongly simplified pieces, silhouettes, low-poly variants or billboard/counter fallback where needed;
- avoid attempting to render miniature-detail armies/buildings across the whole theatre;
- strategic identity and approximate force/location readability remain intact.

Performance requirements:

- use instancing/batching/shared materials where appropriate;
- introduce model/texture budgets and avoid unbounded asset proliferation;
- use deterministic LOD/culling rules;
- no per-frame allocation patterns that recreate the marker-layout performance problems fixed during stabilisation;
- maintain established terrain performance budgets unless a separately approved measured budget revision is justified by clear visual benefit.

## WP3.5F - Integration, accessibility and fallback

Verify the complete physical-piece system across normal gameplay rather than isolated model previews.

Required coverage:

- Theatre, Campaign and Selected views;
- territory, formation and attack-target selection;
- camera zoom, pitch and preset transitions;
- moving and stationary pieces;
- crowded/co-located formations;
- labels around city/structure miniatures;
- layer toggles;
- resize/sidebar changes;
- compact/touch behaviour;
- reduced-motion behaviour;
- keyboard interaction where the corresponding game object is keyboard-addressable;
- renderer failure handling;
- explicit `?terrain=0` SVG fallback;
- save/load and deterministic campaign parity.

## Asset strategy

Prefer a deliberately small versioned asset library over large numbers of bespoke models.

Initial implementation should prove the system using a minimal representative set:

- one future-force infantry/formation miniature family;
- selected/base/state material variants derived in code where possible;
- one major-city cluster and one standard-city cluster;
- one representative port;
- one representative logistics/industrial structure;
- one representative airport/airfield structure.

Reuse geometry/materials and compose variants before authoring large asset inventories.

Use open/licensable or project-owned assets only. Asset provenance/licence must be recorded in-repository before shipping.

## Explicit non-goals

WP3.5 does **not**:

- add tactical combat simulation;
- change combat mathematics;
- change formation size/strength mechanics;
- add hidden enemy information;
- add WP4 attack/capture/retreat event effects;
- add WP5 strategic overlays;
- redesign the command UI;
- add music/audio;
- change saves, territory IDs, topology or campaign balance;
- model every individual soldier/building at real scale.

## Validation gates

Before WP3.5 may be accepted:

- current production map geographic-anchor regression remains green;
- no piece/city/structure moves away from its authoritative geographic position through camera transitions;
- smooth movement is visibly better than the accepted stabilisation baseline and does not introduce lag/jump/stale-settlement defects;
- terrain grounding is stable across representative flat/hilly/mountainous locations;
- formation selection remains reliable;
- overlapping formations remain usable;
- city and infrastructure miniatures remain readable without obscuring required labels;
- Theatre/Campaign/Selected LOD transitions are coherent;
- compact/reduced-motion/fallback behaviour works;
- full repository tests pass;
- TypeScript/Vite production build passes;
- relevant exact-browser terrain/runtime/performance gates pass;
- supported save/load regressions pass;
- deterministic 720-campaign balance parity remains unchanged;
- deployed `main` is visually reviewed by the product owner.

## Exit state

WP3.5 completes when the production terrain map reads as a physical strategic war-game table rather than a terrain map with temporary markers: friendly formations are recognisable miniature armies, movement is smooth and geographically correct, key cities/infrastructure have restrained physical representation, LOD/performance remain controlled, and the system is ready for WP4 battle/front/event feedback to animate against the final piece architecture.

## Implementation record

- WP3.5A/B technical baseline: exact head `54be95ed99cb235dc237c63160def2123869ec07`.
- WP3.5C/D: procedural city clusters and distinct port, airport, rail/logistics
  and crossing silhouettes derive exclusively from existing strategic-node type,
  importance and coordinates.
- WP3.5E: deterministic importance-based Theatre/Campaign/Selected visibility,
  shared materials and bounded geometry; no render-loop object construction.
- WP3.5F: existing layer toggles control the physical objects, DOM labels and
  interaction targets remain authoritative, custom-layer failure retains them,
  and the explicit SVG fallback remains unchanged. Chromium evidence covers
  exact geographic anchors, terrain elevation/clearance and all three LODs.

This record does not declare the package accepted. Exact-head validation,
deployment and product-owner visual acceptance remain mandatory, and WP4 remains
blocked.

## Programme dependency

**R3-WP4 is hard-blocked by WP3.5.**

No worker, scheduled supervisor, roadmap reader or future development thread should resume WP4 merely because the earlier WP4 specification exists. PR #137 remains closed/unmerged historical reference only.

Authoritative sequence from this point:

1. **R3-WP3.5 - World Pieces & Strategic Miniatures** (ACTIVE / NEXT IMPLEMENTATION PACKAGE)
2. R3-WP4 - Battle, Front & Strategic Event Feedback
3. R3-WP5 - Strategic Information Layers
4. R3-WP6 - Command UI/UX Overhaul
5. R3-WP7 - Audio, Music & Atmosphere
6. R3-WP8 - Performance, Scalability, Accessibility & Resilience
7. R3-WP9 - Visual Polish & Integrated Validation
8. Integrated R3 review and human visual/UX playtest
9. Small R3.5 remediation pass if required
