# R3 Physical Map Refinement Programme

Status: **APPROVED / ACTIVE PROGRAMME / WP4 BLOCKING**

Approved by product owner: 2026-08-15

Baseline: WP3.5 + production hotfix #142, deployed from merge commit `75d51412cb101875ca99b352ad0bb39fc40b5bd8`.

This programme records the product-owner refinement requested after successful live review of the first deployed physical-map implementation. The WP3.5 architecture is accepted as the technical baseline: Three.js/MapLibre physical pieces work in production, geographic anchoring is stable, compatibility fallback remains available, and the concept is worth continuing. The current generic miniature shapes and generic city clusters are **not** the desired final visual identity.

R3-WP4 remains blocked until the approved sequence below has been delivered and visually accepted.

## Hard sequence

1. **R3-WP3.6 - Future Soldier Army Miniatures**
2. **R3-WP3.7 - End-of-Day Operational Movement Beat**
3. **R3-WP3.8A - Landmark Cities Pass 1**
4. **R3-WP3.8B - Landmark Cities Pass 2**
5. **R3-WP3.8C - Landmark Cities Pass 3**
6. **R3-WP3.8D - Landmark Cities Pass 4**
7. **R3-WP3.8E - Landmark Cities Pass 5**
8. Product-owner integrated physical-map review
9. Only after acceptance: R3-WP4

Do not parallelise these packages in a way that creates competing piece/city architectures. A later package may be prepared while an earlier package is in review, but implementation must preserve the accepted baseline from the preceding pass.

---

# R3-WP3.6 - Future Soldier Army Miniatures

Status: **APPROVED / ACTIVE / WP4 BLOCKING**

## Objective

Replace the current generic formation geometry with recognisable miniature versions of the canonical Future Conquest soldiers so the map pieces visibly belong to this game's world rather than reading as generic strategy-game placeholders.

## Canonical visual source

Primary approved visual reference: **`Future Conquest Armour Revision Sheet.png`** from the Future Conquest project art assets.

The implementation must also preserve the approved armour-design lock already established for the game:

- future soldiers are unenhanced humans operating in powered combat armour;
- armour is militarily functional rather than decorative;
- silhouette is dominated by modular protective plates, powered joints and practical load-bearing/power systems;
- armour is section-replaceable and visibly repairable/cannibalisable from damaged suits;
- the primary energy rifle remains a separate carried weapon linked to suit targeting/power/data rather than becoming an implausible built-in arm cannon;
- limited integrated secondary systems are acceptable where already canonical;
- adaptive multispectral camouflage/signature-management surfaces are acceptable, but the soldiers are not invisible;
- protection is layered physical/active protection, not a generic glowing bubble shield;
- power, heat and maintenance remain visible design constraints;
- damaged/repaired armour may show mismatched or replacement sections where appropriate;
- the General/officer visual language remains armoured rather than reverting to ceremonial clothing.

Before modelling begins, the worker must inspect the canonical character sheet and record the final miniature silhouette decisions in the implementation PR. Do not invent a new armour aesthetic merely because it is easier to model.

## Miniature art direction

The pieces should read as **premium board-game miniatures of the canonical soldiers**, not tiny photoreal characters.

Required characteristics:

- 3-5 readable future-infantry figures per Task Group presentation where LOD permits;
- recognisable helmet, shoulder/chest armour, powered-leg silhouette, backpack/power module and energy-rifle profile;
- deliberately exaggerated major shapes so the identity survives at approximately strategy-map viewing sizes;
- restrained materials consistent with the existing future-force palette;
- selected/moving/attacking/recovering/holding states expressed primarily through base/accent/material treatment, pose/orientation and restrained effects rather than replacing the model;
- deterministic local offsets for co-located formations, while the authoritative geographic root remains unchanged;
- no enemy-information leakage.

## Asset/renderer approach

Preferred direction:

- retain the current Three.js custom-layer architecture and MapLibre geospatial authority;
- use low-poly reusable geometry and shared materials; compact self-hosted GLB/glTF assets are acceptable if they provide a materially better canonical silhouette than procedural primitives;
- do not introduce runtime dependencies on third-party model hosting;
- keep a simplified low-LOD representation for Theatre/Campaign as needed;
- preserve invisible/accessible DOM interaction targets and the explicit `?terrain=0` fallback;
- preserve the production startup diagnostics added in #142.

Any external model/texture source requires explicit provenance/licensing review before use. Procedural/self-created geometry is preferred.

## Workstreams

### WP3.6A - Character-sheet translation

- inspect the armour revision sheet;
- identify the minimum silhouette features required for recognition;
- define miniature proportions, weapon silhouette, helmet/visor, armour modules and power-pack treatment;
- define selected/moving/attacking/recovering/holding visual states;
- document the result in-repo before final model production.

### WP3.6B - Formation model implementation

- replace generic formation figures with the canonical miniature design;
- preserve existing formation IDs, anchors, selection, movement timing and interaction targets;
- retain deterministic co-location offsets;
- ensure orientation follows current movement/facing data.

### WP3.6C - LOD/performance/accessibility

- Selected/Local: richest figure geometry;
- Campaign: simplified but clearly recognisable future-soldier silhouettes;
- Theatre: strongly simplified formation identity while remaining visually related to the same model family;
- maintain existing terrain/performance budgets unless measured evidence supports a separately approved change;
- reduced motion, keyboard interaction, renderer failure and `?terrain=0` remain functional.

## Acceptance criteria

WP3.6 completes only when:

- the product owner can immediately identify the pieces as the game's future soldiers rather than generic infantry;
- the miniature silhouette is traceable to the approved armour revision sheet/design lock;
- co-located formations remain distinguishable;
- selection and movement remain geographically correct;
- existing movement/click-target synchronisation remains intact;
- exact-head build, browser, performance, selection/geographic, movement and balance gates are green;
- deployed-main visual review is accepted.

---

# R3-WP3.7 - End-of-Day Operational Movement Beat

Status: **APPROVED / QUEUED / WP4 BLOCKING**

## Objective

Make committed movement visually legible and satisfying by giving the player a short map-resolution moment at the end of each day in which all formations ordered to move visibly do so before the next day begins.

The purpose is to let the player **see the war move**. This package must not accidentally convert the strategic game into real-time movement or change the established combat/capture resolution rules.

## Product-owner behaviour

When the player commits an operation/movement and then ends the day:

1. orders are locked for the ending day;
2. the normal simulation transition begins exactly once;
3. before the next-day command state is presented, the map enters a short **Movement Resolution Beat**;
4. every friendly formation whose resolved order changes its strategic presentation position animates concurrently toward its new presentation anchor;
5. a formation beginning an invasion visibly moves **into the target province** and settles at a deterministic invasion/operation anchor inside that province;
6. the target province does **not** immediately become friendly merely because the miniature arrived;
7. the province remains enemy/contested/under invasion according to the existing authoritative operation and control rules;
8. combat, capture, attrition, supply, operation duration and other simulation outcomes continue to resolve according to the existing mechanics;
9. once the movement beat settles, the next-day state/report becomes available.

## Presentation/state boundary

This package is allowed to change **when and where the formation is visually presented** during an active operation, but it must not silently change ownership or resolve combat early.

Preferred architecture:

- derive an `operation/invasion presentation anchor` from authoritative operation state rather than rewriting territory control;
- at the day-transition boundary, animate from the previous authoritative/presentation anchor to the position appropriate to the newly active state;
- for an invasion, the displayed piece should be physically inside the target territory once the operation is active, even while that territory remains uncontrolled;
- if the simulation has multi-day route/travel semantics, audit them explicitly and preserve their gameplay consequences. The visual beat must represent the state the game intends for the start of the new day, not fabricate an early capture or duplicate movement resolution.

## Timing and choreography

- default: all eligible friendly formations move simultaneously so the transition remains short;
- movement duration should be long enough to appreciate but not become a repetitive delay; target roughly 1-3 seconds for ordinary transitions, with a bounded maximum for multiple/long moves;
- camera should remain stable unless a measured, subtle framing adjustment materially improves readability;
- do not force the player through one formation at a time;
- selected formation may receive mild emphasis during the beat, but all ordered moves remain visible;
- next-day panels should not cover the movement until the beat has settled.

## Reduced-motion and interruption behaviour

- reduced-motion mode settles pieces to their new anchors immediately or with a minimal non-travelling transition;
- a skip/complete-transition action may be added if repeated play demonstrates need, but must settle to the same deterministic final presentation state;
- save/load must never depend on persisting an in-progress animation. Reload derives the correct post-resolution presentation from authoritative game state;
- no second simulation tick may be triggered by replaying/skipping the presentation beat.

## Required validation

Test at minimum:

- one invading formation;
- multiple simultaneous invasions;
- move/redeployment orders that are not attacks;
- co-located formations receiving different orders;
- a formation with no order;
- operation cancellation/invalid order before end day;
- save/load immediately before and after the day boundary;
- reduced motion;
- Theatre/Campaign/Selected;
- camera pan/zoom during or immediately after movement;
- existing combat/capture timing and ownership remain unchanged;
- deterministic campaign/balance parity where presentation-only implementation is expected.

## Acceptance criteria

WP3.7 completes only when:

- ending the day produces a clear, short movement-resolution moment;
- all formations ordered to move visibly move before the next day command state appears;
- attacking formations visibly occupy an invasion position inside their target province while the province can still remain enemy/contested;
- ownership/capture/combat timing remains governed by the existing simulation;
- the movement is smooth enough to appreciate the physical miniatures;
- no duplicate day processing, save corruption or hidden-information leakage is introduced;
- exact-head build/browser/movement/geographic/performance/balance gates are green;
- deployed-main visual review is accepted.

---

# R3-WP3.8 - Landmark City Miniatures Programme

Status: **APPROVED / QUEUED / WP4 BLOCKING**

## Objective

Replace generic city clusters with deliberately recognisable miniature representations of the real cities already present in the authoritative `STRATEGIC_NODES` catalogue.

Each bespoke city should read as a small strategy-board caricature of the real place: **one or two defining landmarks plus a restrained supporting building cluster**. Exact architectural scale is not the goal. Recognition, silhouette and strategic readability are.

## Scope boundary

The current authoritative city/capital set contains 15 nodes. The programme covers exactly these current city/capital nodes unless the game data changes through a separately approved package:

London, Rennes, Paris, Strasbourg, Lyon, Brussels, Namur, Amsterdam, Luxembourg, Düsseldorf, Frankfurt, Stuttgart, Bern, Chur and Innsbruck.

Ports, airports, crossings, rail hubs and logistics nodes remain on the existing generic strategic-infrastructure language unless separately refined later.

## City-model design rules

Every city pass must follow these rules:

- 1-2 defining real-city landmarks provide the dominant silhouette;
- 2-6 simplified supporting buildings provide a city cluster rather than a lone icon;
- landmark proportions may be exaggerated for recognition at map scale;
- do not attempt literal city reconstruction;
- terrain grounding and exact authoritative node coordinates remain unchanged;
- labels remain the authoritative textual identification and must not be obscured;
- landmark geometry must not be used as gameplay collision/territory truth;
- avoid logos, readable commercial branding and unnecessary copyrighted decorative detail;
- model from lawful/reference-safe architectural information; do not copy third-party game models or unlicensed mesh assets;
- use shared materials and primitive/low-poly geometry where possible;
- use the same Theatre/Campaign/Selected LOD framework established by WP3.5;
- if a proposed landmark performs poorly at strategy-map scale, substitute another landmark from the same city only after documenting why.

## Planned city passes

No pass should contain more than three bespoke cities. Each pass receives its own browser/performance validation and product-owner visual review before the next pass is considered accepted.

### R3-WP3.8A - Landmark Cities Pass 1

Status: APPROVED / QUEUED

**London**
- dominant landmark: Elizabeth Tower / Big Ben silhouette;
- supporting landmark language: simplified Palace of Westminster roofline;
- supporting city cluster: compact masonry/urban blocks.

**Paris**
- dominant landmark: Eiffel Tower;
- secondary landmark: simplified Arc de Triomphe or compatible low silhouette if it remains readable;
- supporting city cluster: restrained Haussmann-style blocks.

**Brussels**
- dominant landmark: Atomium;
- secondary landmark: Brussels Town Hall / Grand-Place Gothic spire language;
- supporting city cluster: compact historic blocks.

Purpose of Pass 1: establish the final landmark exaggeration, material, base, building-density and LOD rules for every later city.

### R3-WP3.8B - Landmark Cities Pass 2

Status: APPROVED / QUEUED

**Amsterdam**
- dominant language: narrow canal-house gables;
- secondary landmark: Westerkerk-style tower;
- supporting cluster: compressed canal-front roofline.

**Frankfurt**
- dominant language: recognisable modern skyscraper cluster / Main Tower-style high-rise silhouette;
- secondary landmark: Römer historic roof/façade language;
- supporting cluster: mixed modern/historic blocks.

**Bern**
- dominant landmark: Zytglogge clock tower;
- secondary landmark: Federal Palace dome;
- supporting cluster: compact old-town roofs.

### R3-WP3.8C - Landmark Cities Pass 3

Status: APPROVED / QUEUED

**Strasbourg**
- dominant landmark: Strasbourg Cathedral single-spire silhouette;
- supporting language: Petite France half-timbered roofs/buildings.

**Lyon**
- dominant landmark: Basilica of Notre-Dame de Fourvière;
- secondary skyline cue: simplified modern Part-Dieu tower language if it remains readable;
- supporting cluster: dense hillside/urban blocks.

**Luxembourg**
- dominant language: fortified old-city/casemate walls and towers;
- secondary landmark: Adolphe Bridge or compatible bridge silhouette;
- supporting cluster: compact old-town roofs.

### R3-WP3.8D - Landmark Cities Pass 4

Status: APPROVED / QUEUED

**Düsseldorf**
- dominant landmark: Rheinturm;
- secondary language: angular Media Harbour / Rhine waterfront blocks;
- supporting cluster: compact modern city blocks.

**Stuttgart**
- dominant landmark: Fernsehturm television tower;
- secondary landmark: Neues Schloss / Schlossplatz roofline language;
- supporting cluster: low urban blocks.

**Rennes**
- dominant landmark: Parliament of Brittany;
- secondary language: distinctive half-timbered old-town buildings;
- supporting cluster: compact historic roofs.

### R3-WP3.8E - Landmark Cities Pass 5

Status: APPROVED / QUEUED

**Namur**
- dominant landmark: Citadel of Namur;
- secondary landmark: Saint-Aubain Cathedral dome/tower language;
- supporting cluster: compact river-city roofs.

**Chur**
- dominant landmark: Cathedral of Saint Mary of the Assumption / episcopal hill silhouette;
- secondary landmark: St Martin's Church tower;
- supporting cluster: compact Alpine old-town roofs.

**Innsbruck**
- dominant landmark language: Bergisel Ski Jump silhouette;
- secondary landmark: Golden Roof / historic frontage cluster;
- supporting cluster: compact Tyrolean roofs. Existing real terrain provides the mountain context and must not be replaced with fake mountain geometry.

## Per-pass implementation method

For each city pass:

1. validate the proposed landmark references and choose the simplest recognisable silhouette;
2. create low-poly/procedural models compatible with the existing world-miniature layer;
3. keep exact `STRATEGIC_NODES` coordinate and terrain-elevation grounding;
4. add LOD variants/simplification where needed;
5. verify labels/layers/camera selection/crowding;
6. compare performance against the preceding accepted head;
7. deploy and obtain product-owner visual acceptance before marking that pass complete.

## Acceptance criteria for each city

- recognisably different from the generic city template and from the other bespoke cities;
- at least one real-city landmark remains legible at the intended Campaign/Selected scale;
- cluster reads as a miniature city rather than a standalone floating icon;
- no material geographic-anchor, label, layer-control or performance regression;
- fallback remains usable.

## Programme exit gate

R3-WP3.8 completes only when all 15 current city/capital nodes have an accepted bespoke landmark miniature and the integrated map remains readable/performance-safe.

---

# Integrated physical-map refinement exit gate

The physical-map refinement programme is complete only when WP3.6, WP3.7 and all WP3.8 city passes are merged, deployed and visually accepted together.

Final review must confirm:

- Task Groups visibly resemble the canonical Future Conquest soldiers;
- end-of-day movement gives the player a readable moment to watch committed formations move;
- invading armies can visibly enter target provinces without prematurely changing ownership;
- every current city/capital node has a recognisable bespoke landmark miniature;
- infrastructure, labels, routes, borders and fronts remain readable around the richer pieces;
- Theatre/Campaign/Selected LOD remains coherent;
- geographic anchoring, performance, accessibility, fallback, saves, determinism and balance remain intact.

**R3-WP4 remains blocked until this integrated product-owner review is explicitly accepted.**
