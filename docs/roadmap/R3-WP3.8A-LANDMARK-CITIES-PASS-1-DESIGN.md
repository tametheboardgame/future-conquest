# R3-WP3.8A Landmark Cities Pass 1 - Model Design Lock

Status: IMPLEMENTATION ACTIVE  
Package: R3-WP3.8A  
Cities: London, Paris, Brussels  
Baseline: accepted R3-WP3.7 `main`

## Purpose

Pass 1 establishes the reusable city-miniature visual language for WP3.8B-E. The goal is a premium strategy-board caricature of each real city, not a literal reconstruction.

All models in this pass are self-created procedural Three.js geometry. No third-party meshes, textures or runtime model hosting are used.

## Locked model rules

- The authoritative `STRATEGIC_NODES` coordinates remain the only geographic anchor.
- Terrain elevation and the existing world-layer clearance remain unchanged.
- Each bespoke city has one dominant landmark which must survive at the widest useful scale.
- Secondary landmarks and 2-6 supporting buildings establish a city cluster rather than a floating icon.
- Landmark proportions are deliberately exaggerated where required for recognition.
- Shared restrained stone, roof, metal and base materials are preferred over city-specific texture assets.
- Landmark geometry is presentation only and never becomes collision, ownership, territory or route authority.
- Labels remain authoritative textual identification and must remain unobscured by the physical piece system.
- Existing city/hub Layers controls continue to determine visibility.
- Cities not yet covered by an accepted WP3.8 pass continue to use the existing generic city model.

## Pass 1 silhouettes

### London

Dominant landmark:
- Elizabeth Tower / Big Ben, represented as an exaggerated tall stone clock tower with a dark pyramidal roof.

Secondary/supporting language:
- simplified Palace of Westminster horizontal roofline;
- compact masonry blocks around the landmark;
- clock-face detail reserved for the closest LOD.

### Paris

Dominant landmark:
- Eiffel Tower, represented by four converging structural legs, two readable decks and a narrow upper mast.

Secondary/supporting language:
- simplified Arc de Triomphe three-part arch silhouette;
- compact Haussmann-style urban blocks.

### Brussels

Dominant landmark:
- Atomium, represented by a recognisable network of metallic spheres and connecting struts.

Secondary/supporting language:
- Brussels Town Hall / Grand-Place Gothic spire language;
- compact historic blocks.

## LOD lock for later passes

Theatre:
- retain the dominant landmark silhouette and base;
- suppress secondary landmarks and supporting urban detail;
- existing strategic-node importance rules still decide whether the city is shown.

Campaign:
- dominant landmark remains primary;
- secondary landmark and supporting cluster become visible;
- proportions remain exaggerated enough to distinguish nearby cities.

Selected:
- retain the complete Campaign silhouette;
- permit small recognition details such as the London clock face;
- do not add geometry which materially changes the authoritative node anchor or label behaviour.

Later WP3.8 passes should use the same dominant/secondary/supporting hierarchy and the same LOD tagging mechanism unless measured visual or performance evidence justifies a separately documented change.

## Performance and provenance boundary

The models use reusable primitive geometry and shared materials. Pass 1 adds no network requests, external assets, texture downloads, gameplay state or save data. Browser/performance validation must compare against the accepted WP3.7 head before visual acceptance.
