# R3-WP3.9 Integrated Exit Review

Status: **IN PROGRESS / R3-WP4 BLOCKED**

Review baseline: corrected `main` after PR #168 (`1ac731f1f3f98d6ea8a563c03e12daa6e9e14f89`).

The first integrated discovery run (#167) successfully exposed a cross-package sequencing defect that the individual WP3.9C checks had missed: the first-time tutorial was mounted underneath the portal and hidden only by CSS. PR #168 replaced that behaviour with synchronous React presentation gating and added permanent browser coverage proving portal first, tutorial second.

This second review is the authoritative R3-WP3.9 exit review against the corrected production baseline.

## Exit checklist

- [ ] BEGIN CAMPAIGN lands directly on the command map.
- [ ] The right command sidebar collapses and materially enlarges the map without losing selection or context.
- [ ] Map grading has no uniform green/dingy political wash.
- [ ] Physical terrain shows clear satellite-inspired regional and land-cover variation across lowlands, woodland, farmland/plains, mountain, high-alpine/snow and water.
- [ ] Illuminated border-led ownership remains clear without broad territory recolouring.
- [ ] Terrain relief, all 15 authored city miniatures and future-soldier pieces remain clear and cohesive.
- [ ] Every genuinely new campaign plays the portal arrival sequence once.
- [ ] Ordinary command-view navigation and established save loading do not replay the portal.
- [ ] On a first-ever campaign, the portal completes before any tutorial DOM or tutorial progression is released.
- [ ] A completed tutorial does not replay merely because a later new campaign correctly replays the portal.
- [ ] Labels, borders, routes, fronts, infrastructure and operational overlays remain readable.
- [ ] Theatre, Campaign and Selected LOD remain coherent.
- [ ] Geographic anchoring remains authoritative.
- [ ] Static terrain/payload performance budgets pass and repeated exact-head browser measurements remain within the accepted practical envelope.
- [ ] Accessibility and reduced-motion behaviour remain safe.
- [ ] `?terrain=0` and renderer-failure fallback remain usable.
- [ ] Save/load behaviour, determinism and balance remain unchanged.
- [ ] Product-owner integrated visual acceptance is explicitly recorded.

## Evidence method

The integrated review runs the complete current production package rather than relying on historical per-WP status:

1. full deterministic regression suite and targeted WP3.9 source contracts;
2. exact production build and physical-terrain/landmark payload verification;
3. browser review of map-default entry and sidebar UX;
4. multi-region grading and operational-readability review;
5. dual-LOD physical-terrain review;
6. all five authored-landmark browser passes, covering the complete 15-city set;
7. portal lifecycle, replay, reduced-motion and fallback review;
8. permanent first-time portal-before-tutorial browser regression;
9. current-engine balance simulation and representative trace;
10. static performance budgets plus three independent exact-head Chromium samples. The median is used for review reporting so a single software-WebGL camera-timing outlier cannot falsely represent the production build.

Any genuine defect found during this review blocks acceptance and must be fixed before the integrated evidence is rerun.

R3-WP4 remains blocked until this document is updated to **ACCEPTED** and product-owner visual acceptance is explicitly recorded.
