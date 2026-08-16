# R3-WP3.9 - Map Tightening Programme

Status: **APPROVED / ACTIVE / WP4 BLOCKING**

Approved by product owner: 2026-08-15

Preceding baseline: R3-WP3.8E merged to `main` as `1722499b4ce7214a5b6590c4493c25e13c9076ca`, completing the first authored landmark pass across all 15 current city/capital strategic nodes.

This programme is the second-pass tightening of the production command map before R3-WP4 resumes. It responds to product-owner live review of the integrated terrain, city miniatures and command-map layout. The underlying MapLibre/Three.js physical-map architecture is accepted; this programme improves how that work is presented and how the player first experiences it.

R3-WP4 remains blocked until WP3.9A, WP3.9B, WP3.9B2 and WP3.9C are implemented, deployed and accepted together in an integrated map review.

## Hard sequence

1. **R3-WP3.9A - Map UX Foundations**
2. **R3-WP3.9B - Map Visual Clarity and Grading**
3. **R3-WP3.9B2 - Physical Terrain Colour Pass**
4. **R3-WP3.9C - Portal Arrival Sequence**
5. Product-owner integrated physical-map review
6. Only after acceptance: R3-WP4

The sequence is deliberate. First make the map the default command surface and give it enough screen space; then remove the broad dingy/green cast and move ownership onto clear borders; then give the physical terrain itself richer satellite-inspired land-cover variation; then add the opening portal arrival beat on top of the accepted map presentation.

## Programme boundaries

WP3.9 is a presentation and UX package. Unless separately approved, it must not change:

- simulation rules, balance, combat, supply or operation resolution;
- territory ownership, route topology or strategic-node coordinates;
- authoritative formation positions;
- save-game meaning or deterministic campaign outcomes;
- intelligence/hidden-information boundaries;
- the retained `?terrain=0` compatibility/accessibility fallback.

The production MapLibre terrain, Three.js world-piece architecture, existing authored city assets and future-soldier miniatures remain the technical baseline.

---

# R3-WP3.9A - Map UX Foundations

Status: **COMPLETE / MERGED / DEPLOYED / VISUALLY ACCEPTED**

## Objective

Make the command map the natural first surface of the game and allow the player to give it substantially more screen space when desired.

## Required behaviour

### Campaign starts on the map

- Clicking **BEGIN CAMPAIGN** should enter the normal command shell with the **Map / Command Map** view active by default.
- The player should not need an additional navigation click before seeing the strategic situation.
- Existing campaign-state initialisation, tutorial/onboarding rules and simulation timing remain unchanged; this is a default-view change only.
- If the accelerated terrain renderer cannot initialise, the existing fallback path must remain usable rather than blocking campaign entry.

### Collapsible right command sidebar

- The right-hand command/formation/intelligence sidebar must have an obvious collapse/expand control.
- Collapsing it must return the reclaimed horizontal space to the map rather than leaving an empty gutter.
- Expanding it must restore the existing command information without losing the selected formation/territory context.
- The transition should be quick and restrained; it must not cause the map camera or geographic anchors to jump unexpectedly.
- The collapsed/expanded preference should persist for the current play session. Longer persistence may be used if it does not create surprising behaviour across devices/layouts.
- The control must remain keyboard accessible, expose an appropriate accessible name/state and retain visible focus treatment.
- Compact/mobile behaviour must remain usable; the desktop collapse feature must not create a second incompatible navigation model.

## Validation

Test at minimum:

- new campaign enters directly into the map view;
- normal map selection and formation selection immediately after campaign start;
- collapse and expand with no selection;
- collapse and expand with formation and territory selections active;
- map resize/reflow after collapse/expand at Theatre, Campaign and Selected LOD;
- browser resize while collapsed and expanded;
- keyboard operation and focus return;
- reduced motion;
- `?terrain=0` fallback;
- no simulation/save/balance change.

## Acceptance criteria

WP3.9A completes only when:

- the map is the default first command view after BEGIN CAMPAIGN;
- the right command sidebar can be collapsed to produce a materially larger usable map area and restored without state loss;
- map sizing/camera behaviour remains stable;
- accessibility/fallback behaviour remains intact;
- exact-head build/browser/geographic/performance/balance gates remain acceptable;
- the deployed result is accepted by the product owner.

---

# R3-WP3.9B - Map Visual Clarity and Grading

Status: **COMPLETE / MERGED / DEPLOYED / VISUALLY ACCEPTED**

## Objective

Remove the current dingy/green-cast presentation that visually flattens the real terrain and authored city/formation work, while preserving the serious military-command tone.

The target is **cleaner, clearer and more natural**, not bright, saturated or arcade-like.

## Product-owner visual direction

Current live review identifies a broad green/teal wash over the command map. This is making terrain relief, city materials and physical pieces look more muted than intended. The second pass should allow the underlying terrain and authored miniatures to carry more of their own colour and material separation.

Required direction:

- reduce the persistent green/teal cast over terrain and physical pieces;
- retain a restrained, cohesive military-command atmosphere;
- do not turn the map into a brightly coloured satellite view or fantasy board;
- improve separation between terrain, cities, units, borders, routes, fronts and operational overlays;
- preserve the readability of orange/red threat/front language and friendly/enemy/control cues;
- make Alpine relief, lowland terrain and urban miniatures all benefit rather than optimising for one screenshot.

## Implementation audit

Before changing values, identify where the current cast is introduced. Audit at minimum:

- MapLibre terrain/raster colour treatment;
- CSS overlays or translucent map-shell layers;
- fog/haze/atmospheric settings;
- Three.js ambient/directional lighting and material response;
- colour filters, opacity and blend modes;
- territory/control/front/route overlay opacity;
- label/marker contrast against the revised base.

Do not simply remove every tint globally. The pass should determine which layers are creating the unwanted wash and rebalance them deliberately.

## Accepted refinement

The accepted WP3.9B production treatment now:

- removes broad political/controller fills and broad state washes from the terrain surface;
- removes the generic pale administrative-outline stack that was creating dirty/doubled edges;
- retains one restrained physical coastline treatment;
- carries political ownership primarily through strong controller-coloured illuminated borders;
- preserves selected/combat/front/threat outline language above the controller border;
- uses higher-detail static coastline geometry without inflating the terrain JavaScript bundle.

This solved the ownership/coastline clarity problem, but product-owner live review on 2026-08-16 identified a separate remaining issue: the physical terrain itself still reads as too uniform, grey and murky. That follow-on visual requirement is now owned by WP3.9B2 rather than reopening the accepted border-led ownership architecture.

## Visual validation matrix

Capture before/after evidence at minimum for:

- Theatre view over Western/Central Europe;
- Campaign view over the London/Paris/Benelux region;
- Campaign/Selected view over Switzerland/Austria with strong terrain relief;
- authored city clusters against both lowland and mountain terrain;
- friendly formations and operational overlays;
- a threatened/front-heavy state if available.

Check daytime/default presentation on a typical laptop display. Contrast and accessibility must remain acceptable after removing the cast.

## Acceptance criteria

WP3.9B completes only when:

- the map no longer reads as though a uniform green filter has been placed over the scene;
- terrain relief and authored miniatures are visibly clearer without becoming garish;
- city and soldier materials remain distinct from the ground;
- borders, routes, fronts, labels and threat cues remain strategically legible;
- no geographic or gameplay authority changes are introduced;
- performance remains within the existing accepted envelope unless a separately measured/approved adjustment is required;
- product-owner review accepts the deployed grading across several map regions, not only one hero view.

---

# R3-WP3.9B2 - Physical Terrain Colour Pass

Status: **APPROVED / NEXT / WP4 BLOCKING**

Authoritative detail: `docs/roadmap/R3-WP3.9B2-PHYSICAL-TERRAIN-COLOUR-PASS.md`.

Approved by product owner: 2026-08-16

## Objective

Transform the accepted WP3.9B physical terrain from a mostly uniform neutral relief surface into a **stylised satellite-inspired physical map** with clear natural land-cover and elevation variation.

The visual direction is the product-owner-approved 2026-08-16 mock-up: the map should visibly distinguish grassland, woodland, farmland/open plains, rocky mountains, snow/high alpine terrain and water, while remaining a readable strategy-game command surface rather than raw satellite photography.

## Required terrain vocabulary

- grassland/mixed lowland should read as recognisable natural green;
- woodland/forest should use deeper/darker green material treatment;
- farmland/open plains should introduce warmer green, olive, straw and muted-earth variation;
- rocky high ground should shift into grey/brown/stone tones based on physical geography rather than territory boundaries;
- Alpine/high mountain terrain should have substantially stronger exposed-rock contrast and restrained snow/bright high-altitude accents where appropriate;
- sea/major water should use a richer blue/slate-blue treatment with clean coastline separation;
- rivers/drainage may gain cool blue detail where available, provided routes and operational overlays remain dominant.

The production result must show visible regional variation: France, Benelux/Germany lowlands and the Alps should not look like one material with different hillshade.

## Implementation direction

- Do not restore territory ownership fills or translucent political washes.
- Controller ownership remains on the accepted illuminated border system.
- Do not solve this with another full-screen colour filter/fog/saturation overlay.
- Prefer stylised/derived physical data: elevation/slope ramps, self-hosted/build-time land-cover masks, forest/biome data, procedural low-frequency variation, snow/high-alpine masks, or preprocessed imagery/land-cover textures where licensing/performance are acceptable.
- Raw satellite imagery may be investigated but should not be used unprocessed if it makes the command map noisy or reduces label/miniature readability.
- Prefer static/build-time/self-hosted assets over new third-party runtime dependencies.
- No private geospatial-service credentials may ship to the browser.
- Large terrain/land-cover assets must not be embedded into the terrain JavaScript bundle when they can be delivered separately.

## Strategic-readability constraints

The richer terrain must preserve or improve:

- controller border glow/core hierarchy;
- selected/active-combat/threat/front outlines;
- orange/red operational language;
- city labels and authored landmark miniatures;
- future-soldier formation miniatures;
- infrastructure, rail hubs and corridor cues;
- operation markers and routes;
- coastline clarity;
- Theatre/Campaign/Selected LOD.

Where physical terrain colour competes with operational information, operational information wins.

## Visual validation

Validate at minimum:

- Theatre over Western/Central Europe;
- Campaign over Channel / France / Benelux;
- Campaign over Central Europe / Germany;
- Campaign and Selected over Switzerland / Austria / Alps;
- at least one threat/front-heavy operational state.

The product-owner-approved mock-up is the reference for **direction**, not a pixel-perfect target. Production geography, camera, authored assets and UI remain authoritative.

## Acceptance criteria

WP3.9B2 completes only when:

- the deployed map no longer reads as uniformly foggy, murky, grey or grey-green;
- grassland, woodland, farmland/open plains, rocky mountains and water have visibly distinct physical colour/material identities;
- Alpine terrain reads materially differently from lowlands, with stronger rock/high-altitude character and restrained snow/bright high-elevation treatment where appropriate;
- the map achieves the approved stylised satellite/physical-map direction without becoming raw-photographic, over-saturated or visually noisy;
- regional terrain variation is evident across several parts of Europe rather than being one colour ramp everywhere;
- the accepted WP3.9B border-led ownership treatment remains intact and no broad political wash returns;
- cities, soldiers, infrastructure, labels, routes, operations, fronts and threat cues remain legible against the richer terrain;
- the improved coastline treatment does not regress;
- territory geometry, strategic geography, authoritative anchors and simulation state remain unchanged;
- GitHub Pages/static delivery, `?terrain=0`, accessibility/failure fallback and established camera/LOD behaviour remain safe;
- exact-head production/browser/geographic/performance gates remain within the accepted envelope, or any measured exception is separately approved;
- the product owner accepts the deployed result across Theatre, lowland, Central European and Alpine views.

WP3.9C remains blocked until WP3.9B2 is implemented, deployed and visually accepted.

---

# R3-WP3.9C - Portal Arrival Sequence

Status: **APPROVED / QUEUED / WP4 BLOCKING**

## Objective

Give the beginning of a new campaign a short, memorable physical-map arrival beat: when the command map first opens, a portal is present, the future troops arrive/appear, and the portal then closes.

This should establish immediately that the player's army has arrived from elsewhere in time/world while making use of the now-finished physical soldier miniatures. It is a presentation sequence, not a new deployment mechanic.

## Required sequence

On the first command-map presentation of a **new campaign**:

1. the map opens on the authoritative initial campaign area;
2. the arrival portal is already opening or visibly active;
3. the initial future formations are initially withheld, partially materialised or otherwise staged so their arrival is readable;
4. the troops appear/arrive at their existing authoritative initial formation anchors;
5. the portal closes cleanly;
6. normal command-map interaction is then fully available.

The sequence must not alter formation coordinates, personnel, readiness, orders, territory state or any other simulation value.

## Replay rules

- The full arrival sequence should occur at most once for a newly created campaign.
- It must **not** replay every time the player changes tabs/views and returns to the map.
- Loading an established save must not falsely imply that the army has just arrived again.
- Any persistence used to suppress repeat playback is presentation state and must not become simulation authority or require a disruptive save-format change.

## Art direction

- The portal should feel technologically consistent with Future Conquest rather than magical fantasy imagery.
- It should be visually strong enough to read against the terrain but brief enough not to obscure the strategic map for long.
- The effect should illuminate/react with nearby terrain and miniatures where feasible, but should not blanket the whole map in bloom or colour wash.
- The physical future-soldier miniatures should remain the focus of the arrival; the portal is framing, not the permanent subject.
- A single coherent portal event is preferred. If technical staging is needed for formations at distinct authoritative anchors, the effect must preserve those anchors rather than inventing a false common deployment position.

## Timing, accessibility and interruption

- Target a short opening beat of roughly 2-4 seconds rather than a long unskippable cinematic.
- The player must never receive a duplicate simulation tick because of the sequence.
- Reduced-motion mode should compress the event to a brief non-travelling materialisation/fade and portal close.
- Renderer/effect failure must settle immediately to the correct normal Day 1 map state with all formations visible and usable.
- The sequence should not create a save dependency on an in-progress animation.

## Validation

Test at minimum:

- brand-new campaign first map entry;
- ordinary map re-entry after visiting another command view;
- loading an existing save;
- page refresh/recovery around initial campaign entry;
- reduced motion;
- renderer/effect failure fallback;
- all initial formations end at exactly their authoritative anchors;
- interaction becomes available cleanly after the beat;
- no change to Day 1 simulation/balance/save output.

## Acceptance criteria

WP3.9C completes only when:

- the first map opening of a new campaign clearly shows a portal arrival and closure with the future troops appearing as part of the event;
- the sequence is short, legible and visually coherent with the physical board-game/terrain presentation;
- it does not replay during ordinary map navigation or established-save loading;
- formations end at unchanged authoritative positions;
- reduced-motion and failure behaviour settle safely;
- no simulation/save/determinism regression is introduced;
- the deployed sequence is visually accepted by the product owner.

---

# WP3.9 integrated exit gate

WP3.9 is complete only when A, B, B2 and C are merged, deployed and reviewed together.

The final review must confirm:

- BEGIN CAMPAIGN lands directly on the command map;
- the right command sidebar can be collapsed to provide a substantially larger map surface;
- the map grading no longer carries the unwanted uniform green/dingy political wash;
- the physical terrain now has clear satellite-inspired regional/land-cover colour variation across lowlands, forests, farmland, mountains, snow/high alpine terrain and water;
- the accepted illuminated border-led ownership treatment remains clear without recolouring whole territories;
- real terrain relief, all 15 authored city miniatures and future-soldier pieces remain clear and cohesive;
- the new-campaign portal arrival sequence works once, closes cleanly and leaves the correct Day 1 state;
- labels, borders, routes, fronts, infrastructure and operational overlays remain readable;
- Theatre/Campaign/Selected LOD remains coherent;
- geographic anchoring, performance, accessibility, fallback, saves, determinism and balance remain intact.

**R3-WP4 remains blocked until this integrated product-owner review is explicitly accepted.**
