# R3-WP3.8B Landmark Cities Pass 2 - Authored Miniature Design Lock

Status: IMPLEMENTATION ACTIVE  
Package: R3-WP3.8B  
Cities: Amsterdam, Frankfurt, Bern  
Baseline: accepted WP3.8A authored miniature architecture on `main`

## Objective

Extend the accepted premium board-game-piece city language from London, Paris and Brussels to the next three roadmap cities without introducing a second renderer, asset format or LOD system.

Pass 2 must therefore reuse the proven WP3.8A architecture:

- authoritative `STRATEGIC_NODES` coordinates remain the only geographic anchors;
- MapLibre terrain elevation and the existing 22 m world-layer clearance remain unchanged;
- authored city models are self-hosted glTF assets generated during the normal build;
- Campaign and Selected/local use the authored model when visible and loaded;
- Theatre retains the cheap procedural fallback;
- loading/error states retain the fallback;
- viewport culling and the existing city/hub Layers control remain authoritative;
- landmark geometry is presentation only and owns no movement, collision, territory, save-state or hidden-information authority.

## Amsterdam

### Recognition target

Amsterdam must read primarily as a compressed canal-front miniature rather than as one generic tower.

Required visual hierarchy:

1. a row of narrow canal houses with deliberately varied stepped/gabled rooflines;
2. an exaggerated Westerkerk-style square tower and crown/spire as the vertical landmark;
3. a restrained canal/water edge and trees to make the houses read as a city cluster rather than detached buildings.

The house row is intentionally more important than literal architectural reconstruction. Repetition, narrow proportions, windows and gable rhythm should make Amsterdam recognisable at strategy-map scale.

## Frankfurt

### Recognition target

Frankfurt must visibly contrast its modern banking skyline with its historic centre.

Required visual hierarchy:

1. a dominant Main Tower-style modern high-rise language with glass/steel materials and a strong vertical mast;
2. several subordinate skyscrapers to create the recognisable clustered skyline rather than one isolated tower;
3. a small Römer-inspired historic frontage using stone, timber framing and steep roofs at the front of the miniature.

The modern/historic contrast is the defining city identity. The high-rise cluster should dominate from Campaign view while the Römer detail becomes more apparent in Selected/local view.

## Bern

### Recognition target

Bern must read as a compact sandstone old city centred on its clock tower and federal dome.

Required visual hierarchy:

1. an oversized Zytglogge-style square clock tower with a legible front clock, layered masonry stages and steep green/copper roof;
2. a subordinate Federal Palace mass with central drum/dome and low flanking wings;
3. compact old-town roof forms around the base.

The Zytglogge is the primary silhouette. The Federal Palace dome should remain readable without competing with the tower.

## Materials and miniature-base language

Pass 2 keeps the deliberate board-game-piece treatment established in WP3.8A:

- dark tiered strategic base;
- restrained metallic/gold trim;
- city-specific but muted masonry/roof/glass palettes;
- no photoreal textures;
- no external runtime model hosting;
- no copied third-party meshes;
- no readable commercial branding.

## LOD and loading rules

Theatre:
- procedural fallback only;
- no Pass 2 authored asset fetch.

Campaign:
- authored asset begins lazy loading when its city is visible;
- fallback remains visible until the glTF is ready;
- authored model replaces the fallback after successful load.

Selected/local:
- the same authored model remains active;
- richer geometry is inspected through camera proximity rather than a separate gameplay object;
- load failure remains non-fatal and deterministic.

## Performance boundary

Pass 2 must not weaken the accepted WP2E terrain/performance budgets. The additional city assets are deliberately viewport-bound and lazy-loaded. A performance failure must be investigated or rerun for demonstrated timing variance; the comparator must not be relaxed merely to admit the new art.

## Acceptance criteria

WP3.8B completes only when:

- Amsterdam, Frankfurt and Bern each visibly use a distinct authored self-hosted miniature in Campaign and Selected/local views;
- Amsterdam reads from canal-house gables plus Westerkerk-style tower;
- Frankfurt reads from a clustered modern skyline plus Römer historic frontage;
- Bern reads from Zytglogge clock tower plus Federal Palace dome;
- Theatre retains the cheap procedural fallback;
- all three remain on their exact strategic-node coordinate with terrain grounding and 22 m clearance unchanged;
- no gameplay, balance, route, territory, save or hidden-information authority changes;
- production build, source contracts, dedicated Chromium browser evidence and exact-head performance comparison pass;
- the deployed build receives product-owner visual acceptance before WP3.8C is treated as accepted.
