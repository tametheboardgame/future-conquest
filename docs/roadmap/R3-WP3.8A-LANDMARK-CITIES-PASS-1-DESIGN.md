# R3-WP3.8A Landmark Cities Pass 1 - Model Design Lock

Status: IMPLEMENTATION ACTIVE  
Package: R3-WP3.8A  
Cities: London, Paris, Brussels  
Baseline: accepted R3-WP3.7 `main`

## Purpose

Pass 1 establishes the reusable city-miniature visual language for WP3.8B-E. The approved visual direction is now explicitly landmark-first: each city should read immediately from one highly recognisable hero landmark, with accuracy of the hero landmark taking priority over generic city density.

The approved art references created during visual review showed the intended hierarchy:

- London should read first and unmistakably as Elizabeth Tower / Big Ben;
- Paris should read first and unmistakably as the Eiffel Tower;
- Brussels should read first and unmistakably as the Atomium.

Secondary architecture exists only to establish place and scale. It must not compete visually with the hero landmark.

All runtime models in this pass remain self-created procedural Three.js geometry. No third-party meshes, textures or runtime model hosting are used.

## Locked model rules

- The authoritative `STRATEGIC_NODES` coordinates remain the only geographic anchor.
- Terrain elevation and the existing world-layer clearance remain unchanged.
- Each bespoke city has one dominant hero landmark which must survive at the widest useful scale.
- Recognisable real-world proportions and structural features of that landmark take precedence over decorative city clutter.
- Secondary landmarks should normally be limited to one smaller supporting structure.
- Generic supporting building clusters should be omitted when they reduce landmark clarity.
- Landmark proportions may still be exaggerated where required for board-game readability, but not in ways which destroy the real landmark's defining geometry.
- Shared restrained stone, roof, metal and base materials remain preferable to city-specific texture assets.
- Landmark geometry is presentation only and never becomes collision, ownership, territory or route authority.
- Labels remain authoritative textual identification and must remain unobscured by the physical piece system.
- Existing city/hub Layers controls continue to determine visibility.
- Cities not yet covered by an accepted WP3.8 pass continue to use the existing generic city model.

## Pass 1 hero models

### London

Hero landmark:
- Elizabeth Tower / Big Ben.

Accuracy requirements:
- tall, narrow Gothic Revival stone shaft;
- clearly enlarged square clock stage near the top;
- four clock faces, one on each side of the tower;
- ornamental cornice and open belfry language above the clocks;
- steep pyramidal roof and narrow upper spire;
- corner buttress/pinnacle detail at closer LODs.

Secondary/supporting language:
- Palace of Westminster retained as a low horizontal Gothic wing only;
- no generic surrounding city blocks competing with the tower.

### Paris

Hero landmark:
- Eiffel Tower.

Accuracy requirements:
- four strongly flared legs at ground level;
- legs converge progressively through the first and second platform levels;
- clearly readable first, second and upper observation decks;
- open lattice/bracing language rather than four near-vertical solid posts;
- narrow upper crown and mast/antenna.

Secondary/supporting language:
- Arc de Triomphe retained as a much smaller secondary silhouette;
- generic Haussmann blocks removed from Pass 1 so the Eiffel Tower remains dominant.

### Brussels

Hero landmark:
- Atomium.

Accuracy requirements:
- nine metallic spheres representing the atoms of a body-centred cubic iron unit cell;
- eight outer/corner spheres plus one central sphere;
- twelve outer cube-edge connections plus eight centre-to-corner connections;
- the cubic cell is rotated so one body diagonal reads vertically, producing the characteristic bottom-to-top Atomium composition;
- reflective metallic material and visible structural support legs;
- a narrow antenna above the upper sphere.

Secondary/supporting language:
- Brussels Town Hall / Grand-Place Gothic spire retained at deliberately smaller scale;
- generic historic city blocks removed where they compete with the Atomium.

## LOD lock for later passes

Theatre:
- retain the full defining hero-landmark silhouette and base;
- suppress secondary landmarks and fine recognition detail where possible;
- existing strategic-node importance rules still decide whether the city is shown.

Campaign:
- hero landmark remains primary;
- structural recognition detail becomes visible, such as London clock faces, Eiffel lattice bracing and Atomium support/antenna detail;
- one secondary landmark may become visible if it does not interfere with the hero silhouette.

Selected:
- retain the complete Campaign silhouette;
- permit small recognition details such as London finials and Paris antenna detail;
- do not add geometry which materially changes the authoritative node anchor or label behaviour.

Later WP3.8 passes should use the same hero-first hierarchy and the same LOD tagging mechanism unless measured visual or performance evidence justifies a separately documented change.

## Performance and provenance boundary

The models use reusable primitive geometry and shared materials. Pass 1 adds no runtime network requests, external model assets, texture downloads, gameplay state or save data. Browser/performance validation must compare against the accepted WP3.7 head before visual acceptance.
