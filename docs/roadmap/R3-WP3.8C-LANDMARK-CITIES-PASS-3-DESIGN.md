# R3-WP3.8C Landmark Cities Pass 3 Design Lock

Status: **ACCEPTED / MERGED / DEPLOYED**

Parent programme: `R3-WP3.6-WP3.8-PHYSICAL-MAP-REFINEMENT.md`

Product-owner visual acceptance: 2026-08-15. Minor remaining architectural/detail refinements are explicitly deferred to the later integrated second-pass polish and do not block first-pass progression.

## Scope

This pass covers exactly three existing strategic city nodes:

- Strasbourg (`N-STRASBOURG`)
- Lyon (`N-LYON`)
- Luxembourg (`N-LUXEMBOURG`)

No strategic-node coordinates, territory ownership, routes, movement rules, balance, saves or hidden-information authority are changed. This package is presentation only.

## Accepted pipeline

WP3.8C continues the authored miniature architecture accepted in WP3.8A and WP3.8B:

- deterministic self-created geometry emitted as self-hosted glTF during the normal production build;
- Campaign and Selected/local LOD use authored models once loaded;
- Theatre, loading and failure retain the shared procedural city fallback;
- `STRATEGIC_NODES` remains the sole geographic anchor;
- MapLibre terrain elevation plus the existing 22 m clearance remains authoritative;
- shared premium board-game base and restrained materials preserve programme-wide visual coherence;
- no third-party model hosting, copied game meshes or unlicensed texture/model assets.

## Fidelity rule

The dominant real landmark is the miniature's first read. Supporting city geometry exists only to establish place and scale. If supporting buildings compete with the landmark, they are reduced rather than the landmark being simplified further.

## Strasbourg

Primary read: **Strasbourg Cathedral**.

Required silhouette cues:

- large warm sandstone Gothic mass;
- unmistakable asymmetrical single-spire composition;
- very tall, narrow openwork-style spire impression;
- rose-window cue and strong west-front verticality;
- buttress/pinnacle rhythm exaggerated enough to survive strategy-map scale.

Supporting read: **Petite France**.

- 4-6 small plaster/half-timbered houses;
- dark steep roofs;
- visibly subordinate to the cathedral.

The cathedral must remain the dominant object from both Campaign and Selected camera distances.

## Lyon

Primary read: **Basilica of Notre-Dame de Fourvière**.

Required silhouette cues:

- pale stone basilica mass;
- four strongly legible corner towers;
- central roof/dome mass and elevated sacred-monument silhouette;
- restrained gold/copper accents only where they improve recognition.

Secondary cue: **Part-Dieu modern skyline language**.

- one subordinate modern tower/high-rise cue;
- must not visually overpower Fourvière;
- included mainly to communicate Lyon's historic/modern skyline contrast.

Supporting cluster uses low compact hillside/urban blocks.

## Luxembourg

Primary read: **fortified old-city / casemate language**.

Required silhouette cues:

- substantial stone wall mass;
- round or polygonal defensive towers;
- stepped fortified profile suggesting the old city on rock rather than a generic castle;
- compact old-town roofs behind/alongside the fortification.

Secondary read: **Adolphe Bridge**.

- clearly legible long deck;
- repeated masonry arch silhouette rather than a generic straight bridge;
- subordinate but immediately distinguishable at Selected LOD.

## LOD and performance

- Theatre: existing cheap procedural city fallback only.
- Campaign: authored Pass 3 models load lazily when visible.
- Selected: same authored asset at closer scale, retaining all built geometry.
- No new eager runtime dependency is introduced.
- Existing exact-head terrain/static/network performance budgets remain unchanged.
- Asset construction is deterministic so CI can verify byte/face metadata and runtime identity.

## Acceptance gate

Pass 3 completed after all of the following held:

1. Strasbourg, Lyon and Luxembourg built as self-hosted authored glTF assets.
2. Each loaded in Campaign and Selected LOD in Chromium.
3. Exact strategic-node coordinate anchoring remained unchanged.
4. Terrain elevation was finite and clearance remained 22 m.
5. Existing WP3.8A and WP3.8B cities continued to pass their regression gates.
6. A later-pass city remained on the generic fallback path at acceptance time.
7. Production build, browser and exact-head performance gates were acceptable.
8. Deployed-main captures were reviewed and explicitly accepted by the product owner.

R3-WP4 remains blocked until the full WP3.8 programme and integrated physical-map review are accepted.