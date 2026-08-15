# R3-WP3.8D Landmark Cities Pass 4 Design Lock

Status: **ACCEPTED / MERGE APPROVED**

Parent programme: `R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`

Preceding accepted pass: WP3.8C, product-owner accepted 2026-08-15 with minor detail refinements deferred to the later integrated second-pass polish.

Product-owner visual acceptance: **2026-08-15**. Düsseldorf, Stuttgart and Rennes are accepted at the first-pass landmark standard. Minor architectural/micro-detail refinements are explicitly deferred to the later integrated second-pass polish and do not block WP3.8E.

## Scope

This pass covers exactly three existing strategic city nodes:

- Düsseldorf (`N-DUSSELDORF`)
- Stuttgart (`N-STUTTGART`)
- Rennes (`N-RENNES`)

No strategic-node coordinates, territory ownership, routes, movement rules, balance, saves or hidden-information authority are changed. This package is presentation only.

## Accepted pipeline

WP3.8D reuses the authored miniature architecture accepted in WP3.8A-C:

- deterministic self-created geometry emitted as self-hosted glTF during the normal production build;
- Campaign and Selected/local LOD use authored models once loaded;
- Theatre, loading and failure retain the shared procedural city fallback;
- `STRATEGIC_NODES` remains the sole geographic anchor;
- MapLibre terrain elevation plus the existing 22 m clearance remains authoritative;
- shared premium board-game base and restrained materials preserve programme-wide visual coherence;
- no third-party model hosting, copied game meshes or unlicensed texture/model assets.

## Fidelity rule

The primary landmark must be the first visual read. Secondary architecture establishes city identity but must remain subordinate. The first-pass goal is immediate recognition and a coherent board-game silhouette; micro-detail that does not materially improve map-scale recognition is deferred to the later integrated second-pass polish.

## Düsseldorf

Primary read: **Rheinturm**.

Required silhouette cues:

- very tall, slender concrete television-tower shaft;
- pronounced circular observation / restaurant pod near the top;
- thinner antenna mast above the pod;
- strong vertical dominance over every supporting building;
- restrained red/white or light-band cue only where it improves recognition without becoming a literal illuminated texture.

Secondary read: **Media Harbour / Rhine waterfront**.

- 3-5 low angular modern blocks;
- deliberately skewed / folded roof or façade silhouettes to evoke the harbour's contemporary architecture;
- optional narrow Rhine/waterfront strip as a base-level context cue;
- no supporting block may approach the tower's visual height.

## Stuttgart

Primary read: **Fernsehturm Stuttgart**.

Required silhouette cues:

- narrow tapering tower shaft;
- distinctive multi-level circular observation pod;
- thin broadcast mast / antenna above the pod;
- clean, elegant engineering silhouette distinct from Düsseldorf's Rheinturm through pod proportions and support treatment.

Secondary read: **Neues Schloss / Schlossplatz roofline language**.

- low symmetrical palace block;
- central raised pavilion / shallow dome or cupola cue;
- restrained classical wings and roofline;
- kept substantially lower than the Fernsehturm.

Supporting cluster uses low urban blocks only where they help scale.

## Rennes

Primary read: **Parliament of Brittany**.

Required silhouette cues:

- broad symmetrical masonry palace block;
- dark steep roof;
- central raised pavilion / pediment / lantern cue;
- four-corner or pavilion rhythm that reads as a formal civic building rather than a generic château;
- warm stone and dark slate contrast.

Secondary read: **Rennes half-timbered old town**.

- 4-6 narrow historic houses;
- visibly varied gables;
- timber framing cues at Selected scale;
- colourful but restrained plaster accents are acceptable if they remain coherent with the programme palette;
- the Parliament remains the dominant formal mass.

## Distinguishability rule for the two television towers

Düsseldorf and Stuttgart must not become interchangeable generic tower icons.

- Düsseldorf Rheinturm: thicker concrete shaft, larger rounded pod, more industrial/waterfront setting, explicit Media Harbour geometry.
- Stuttgart Fernsehturm: slimmer/tapered shaft, more elegant stacked observation pod, stronger palace/Schlossplatz counterpoint.

The browser captures must demonstrate that the two cities remain visually different without relying on labels.

## LOD and performance

- Theatre: existing cheap procedural city fallback only.
- Campaign: authored Pass 4 models load lazily when visible.
- Selected: same authored asset at closer scale, retaining all built geometry.
- No new eager runtime dependency is introduced.
- Existing exact-head terrain/static/network performance budgets remain unchanged.
- Asset construction is deterministic so CI can verify byte/face metadata and runtime identity.

## Acceptance gate

Pass 4 completed after all of the following held:

1. Düsseldorf, Stuttgart and Rennes built as self-hosted authored glTF assets.
2. Each loaded in Campaign and Selected LOD in Chromium.
3. Exact strategic-node coordinate anchoring remained unchanged.
4. Terrain elevation was finite and clearance remained 22 m.
5. Existing WP3.8A, WP3.8B and WP3.8C cities continued to pass their regression gates.
6. A Pass 5 city remained on the generic fallback path.
7. Production build, browser and exact-head performance gates were acceptable.
8. Browser captures made Düsseldorf and Stuttgart visually distinguishable despite both using television-tower landmarks.
9. Captures were reviewed and explicitly accepted by the product owner.

R3-WP4 remains blocked after this pass. WP3.8E is now authorised to proceed.