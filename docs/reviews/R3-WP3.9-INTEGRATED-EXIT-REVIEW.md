# R3-WP3.9 Integrated Exit Review

Status: IN PROGRESS

Review baseline: `main` after R3-WP3.9C replay/tutorial-order correction.

Purpose: validate the complete R3-WP3.9 map-tightening package as one integrated production experience after A, B, B2/B3 and C have all landed.

## Exit checklist

- [ ] BEGIN CAMPAIGN lands directly on the command map.
- [ ] Right command sidebar collapses and materially enlarges the map without losing selection/context.
- [ ] Map grading has no uniform green/dingy political wash.
- [ ] Physical terrain shows clear satellite-inspired regional and land-cover variation across lowlands, forest, farmland/plains, mountain, high-alpine/snow and water.
- [ ] Illuminated border-led ownership remains clear without broad territory recolouring.
- [ ] Terrain relief, all 15 authored city miniatures and future-soldier pieces remain clear and cohesive.
- [ ] Every genuinely new campaign plays the portal arrival sequence once; ordinary navigation and save loads do not replay it.
- [ ] Portal arrival completes before first-time tutorial presentation.
- [ ] Labels, borders, routes, fronts, infrastructure and operational overlays remain readable.
- [ ] Theatre, Campaign and Selected LOD remain coherent.
- [ ] Geographic anchoring remains authoritative.
- [ ] Performance remains within accepted budgets.
- [ ] Accessibility and reduced-motion behaviour remain safe.
- [ ] `?terrain=0` and renderer failure fallback remain usable.
- [ ] Save/load, determinism and balance remain unchanged.
- [ ] Product-owner integrated visual acceptance recorded.

## Evidence plan

The review branch intentionally contains no production-code change. Opening the review PR re-runs the current exact-head workflow matrix against the fully integrated baseline. Evidence will be assessed from the current map UX, terrain/visual, landmark, formation, performance, portal-arrival, balance and production-build gates. Any defect found during this review will be fixed on a separate focused branch/PR and this checklist re-run against the corrected integrated head.

R3-WP4 remains blocked until this document is updated to ACCEPTED and product-owner visual acceptance is explicitly recorded.
