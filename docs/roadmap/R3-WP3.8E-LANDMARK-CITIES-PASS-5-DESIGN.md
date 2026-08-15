# R3-WP3.8E Landmark Cities Pass 5 Design Lock

Status: **IMPLEMENTATION ACTIVE / PRODUCT-OWNER VISUAL REVIEW REQUIRED**

Parent programme: `R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`

Preceding accepted pass: WP3.8D, merged and deployed 2026-08-15. Minor architectural/micro-detail refinements across the landmark programme remain deliberately deferred to the later integrated second-pass polish.

## Scope

This pass covers exactly three existing strategic city nodes:

- Namur (`N-NAMUR`)
- Chur (`N-CHUR`)
- Innsbruck (`N-INNSBRUCK`)

No strategic-node coordinates, territory ownership, routes, movement rules, balance, saves or hidden-information authority are changed. This package is presentation only.

This is the final first-pass landmark-city set. Once accepted, all 15 current city/capital strategic nodes in the WP3.8 programme will have authored landmark miniatures. That does **not** by itself unblock WP4: the integrated physical-map review and later agreed polish still remain.

## Accepted pipeline

WP3.8E reuses the authored miniature architecture accepted in WP3.8A-D:

- deterministic self-created geometry emitted as self-hosted glTF during the normal production build;
- Campaign and Selected/local LOD use authored models once loaded;
- Theatre, loading and failure retain the shared procedural city fallback;
- `STRATEGIC_NODES` remains the sole geographic anchor;
- MapLibre terrain elevation plus the existing 22 m clearance remains authoritative;
- shared premium board-game base and restrained materials preserve programme-wide visual coherence;
- no third-party model hosting, copied game meshes or unlicensed texture/model assets.

## Fidelity rule

The primary landmark must be the first visual read. Secondary architecture establishes place and scale but must remain subordinate. The first-pass goal is immediate recognition and a coherent premium board-game silhouette; micro-detail that does not materially improve map-scale recognition is deferred to the integrated second-pass polish.

## Namur

Primary read: **Citadel of Namur**.

Required silhouette cues:

- broad fortified hill/spur rather than a generic medieval castle;
- low, wide bastioned walls and layered defensive terraces;
- angular bastion geometry with a substantial earthwork/stone mass;
- elevated upper fortified block that remains visually integrated with the ramparts;
- subtle Sambre/Meuse river-confluence context may be encoded at base level where it strengthens recognition.

Secondary read: **Saint-Aubain Cathedral**.

- compact classical church mass;
- central dome/cupola cue;
- paired or balanced façade/tower rhythm;
- substantially smaller than the Citadel.

Supporting read uses a few compact river-city roofs only. The Citadel must dominate both Campaign and Selected views.

## Chur

Primary read: **Cathedral of the Assumption and Episcopal Court**.

Required silhouette cues:

- cathedral/episcopal complex visibly elevated above the compact old town;
- substantial but compact stone church mass rather than a Strasbourg-scale Gothic monument;
- steep Alpine roof language;
- strong cathedral tower cue and clustered episcopal buildings;
- a stepped court/hill plinth is allowed to communicate the real elevated Episcopal Court, but it must read as an urban hill/platform rather than fabricated mountain scenery.

Secondary read: **St Martin's Church tower**.

- separate slender tower;
- pointed roof/spire silhouette;
- visually distinct from the cathedral tower.

Supporting read uses compact plaster/stone Alpine old-town houses with steep roofs.

## Innsbruck

Primary read: **Bergisel Ski Jump**.

Required silhouette cues:

- tall support/jump tower;
- sculptural head / viewing-café mass near the top;
- elevated in-run and jump structure read as a bridged, dramatically sloping continuation of the tower rather than an ordinary tower beside a ramp;
- clear negative space under the ramp;
- modern concrete/glass/steel language;
- the jump must dominate the miniature from both Campaign and Selected views.

Secondary read: **Golden Roof / historic frontage**.

- compact historic façade cluster;
- a small but highly legible gold/copper canopy/oriel cue;
- steep Tyrolean roofs around it;
- deliberately subordinate to Bergisel.

**No fake mountain geometry is permitted.** Innsbruck's Alpine setting must come solely from the existing real MapLibre terrain. The miniature represents the city landmarks, not a second terrain system.

## Final-programme fallback rule

WP3.8E authors the last currently generic city/capital nodes, so the earlier “later-pass city remains generic” regression sentinel is no longer valid.

The durable fallback contract is instead:

- authored cities use glTF in Campaign and Selected LOD;
- the same authored city deliberately returns to the shared procedural city model in Theatre LOD;
- asset loading failure also retains the same procedural fallback architecture.

The A-E browser probes therefore verify a Theatre-LOD procedural fallback rather than depending on an intentionally unfinished future city.

## LOD and performance

- Theatre: existing cheap procedural city fallback only.
- Campaign: authored Pass 5 models load lazily when visible.
- Selected: same authored asset at closer scale, retaining all built geometry.
- No new eager runtime dependency is introduced.
- Existing exact-head terrain/static/network performance budgets remain unchanged.
- Asset construction is deterministic so CI can verify byte/face metadata and runtime identity.

## Acceptance gate

Pass 5 is not complete until all of the following hold:

1. Namur, Chur and Innsbruck build as self-hosted authored glTF assets.
2. Each loads in Campaign and Selected LOD in Chromium.
3. Exact strategic-node coordinate anchoring remains unchanged.
4. Terrain elevation is finite and clearance remains 22 m.
5. Existing WP3.8A-D cities continue to pass their regression gates.
6. Theatre LOD demonstrates the durable procedural fallback contract for authored cities.
7. Innsbruck uses the real terrain only; no fabricated mountain mesh is introduced.
8. Production build, browser and exact-head performance gates are acceptable.
9. Captures are reviewed and explicitly accepted by the product owner.

After product-owner acceptance and merge, run an integrated physical-map review across all 15 authored cities, formations, terrain and operational overlays. R3-WP4 remains blocked until that integrated review is accepted.
