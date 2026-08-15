# R3-WP3.8A Landmark Cities Pass 1 - Asset-Driven Model Design Lock

Status: IMPLEMENTATION ACTIVE / V2 REWORK  
Package: R3-WP3.8A  
Cities: London, Paris, Brussels  
Baseline: accepted R3-WP3.7 `main`

## Why WP3.8A changed

The first procedural implementation proved the geographic, LOD and performance architecture but failed the product-owner visual bar. More boxes, cylinders and cones made the landmarks more accurate without producing the detailed premium board-game-piece quality established by the approved concept renders.

WP3.8A is therefore reworked around **authored self-hosted 3D miniature assets**. The approved board-game-piece renders are now the visual specification rather than loose inspiration.

## Canonical visual targets

The approved visual review establishes these targets:

- London: an ornate Elizabeth Tower / Big Ben and Palace of Westminster game-piece miniature, with strong Gothic relief, clock detail, pinnacles, a deliberate miniature base and restrained supporting scenery;
- Paris: a detailed Eiffel Tower game-piece miniature with dense readable latticework, observation decks, Arc de Triomphe, a deliberate diorama base and restrained supporting scenery;
- Brussels: a polished Atomium game-piece miniature with prominent metallic spheres, clean tube connections, structural supports, Town Hall/Gothic language and a deliberate miniature base.

Recognition remains important, but Selected/local quality must now also communicate **crafted miniature detail**. The target is closer to a premium strategy-board sculpt than to a low-poly map icon.

## Runtime architecture lock

- The authoritative `STRATEGIC_NODES` coordinates remain the only geographic anchors.
- MapLibre terrain elevation and the existing 22 m world-layer clearance remain unchanged.
- The authored model is a child visual of the existing strategic-node root. It never owns longitude, latitude, territory control, collision, movement, route or save-state authority.
- Authored Selected/local assets use self-hosted glTF/GLB-compatible delivery through the normal game build. No third-party runtime model hosting is permitted.
- Asset source is committed in deterministic repository bundles and reconstructed during `npm run build` into ordinary files under `public/miniatures/wp3-8a/`.
- Each generated asset receives build-time format validation and a SHA-256 manifest entry.
- Detailed authored models are lazy-loaded only when their city is visible in Selected/local view.
- Theatre and Campaign retain a cheap procedural fallback representation unless a later visual review demonstrates a need for authored lower-LOD assets.
- Loading failure also retains the procedural fallback, so landmark art can never make the command map unusable.
- Existing viewport culling remains mandatory. Off-screen detailed city models must not trigger unnecessary terrain work or rendering cost.
- Existing city/hub Layers controls remain authoritative for presentation visibility.

## Staged rollout

The V2 migration is intentionally staged rather than switching all three cities in one unproven step.

### Stage 1 - London end-to-end proof

London is the first runtime-authored model. Its Selected asset is committed, reconstructed by the build, loaded through Three.js `GLTFLoader`, attached beneath the London strategic-node root, and explicitly identified in browser evidence as `authored-gltf`.

The initial authored London asset is deliberately much denser than the procedural predecessor, at approximately 3.3k authored faces. It includes the clock tower, four clock faces and hands, Gothic ribs/buttresses, roof/spire/weather-vane, a more substantial Westminster wing, repeated windows/pinnacles, supporting trees and a deliberate tiered game-piece base.

### Stage 2 - Paris

Paris remains on the procedural fallback while its approved detailed asset completes the same build/runtime/performance path. The authored target is approximately 7.4k faces and emphasises much denser Eiffel latticework, multiple platform/railing levels, Arc de Triomphe, supporting urban forms/trees and a diorama base.

### Stage 3 - Brussels

Brussels remains on the procedural fallback while its approved detailed asset completes the same path. The authored target is approximately 5.9k faces and emphasises prominent Atomium spheres, complete tube structure, trussed supports, Town Hall/Gothic detail, trees and an octagonal game-piece base.

WP3.8A is not complete until all three stages have passed browser/performance validation and received product-owner visual acceptance.

## LOD rules

Theatre:
- cheap procedural city silhouette only;
- existing strategic-node importance rules continue to decide visibility;
- no authored high-detail asset fetch.

Campaign:
- cheap procedural fallback only during the V2 rollout;
- no authored high-detail asset fetch unless a later approved lower-LOD asset is added.

Selected/local:
- if an approved authored asset is available and the city is in the viewport, begin lazy loading;
- retain the procedural fallback while loading;
- swap to the authored glTF only after a successful load;
- revert/retain fallback on failure without affecting the map or campaign;
- cull the complete strategic-node root when outside the padded viewport.

## Performance and provenance boundary

The detailed miniature assets are self-created for Future Conquest from the approved project visual direction. Third-party game meshes are not copied and external runtime model/CDN dependencies are not introduced.

Higher geometric detail is permitted only behind the lazy Selected-view boundary. Exact-head browser and terrain-performance evidence remains mandatory. A visual improvement is not accepted by weakening the existing performance budget.

## Acceptance criteria

WP3.8A V2 completes only when:

- London, Paris and Brussels visibly approach the approved premium board-game-piece renders rather than the old primitive landmark approximations;
- each city uses an authored self-hosted close-up asset at Selected/local view;
- Theatre/Campaign remain inexpensive and readable;
- loading/error fallback is deterministic and usable;
- the authoritative `STRATEGIC_NODES` coordinates, terrain grounding and 22 m clearance are unchanged;
- no gameplay, balance, save, route, territory or hidden-information authority changes;
- exact-head production build, dedicated landmark browser gate, general terrain visual gate and performance gate are green;
- final deployed visual evidence is accepted by the product owner.
