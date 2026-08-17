# R3-WP3.9 Integrated Exit Review

Status: **TECHNICAL PASS / AWAITING PRODUCT-OWNER VISUAL ACCEPTANCE / R3-WP4 BLOCKED**

Review baseline: corrected `main` after PR #168 (`1ac731f1f3f98d6ea8a563c03e12daa6e9e14f89`).

The first integrated discovery run (#167) successfully exposed a cross-package sequencing defect that the individual WP3.9C checks had missed: the first-time tutorial was mounted underneath the portal and hidden only by CSS. PR #168 replaced that behaviour with synchronous React presentation gating and added permanent browser coverage proving portal first, tutorial second.

This second review is the authoritative R3-WP3.9 exit review against the corrected production baseline. Integrated workflow run `32026756331` completed successfully across browser/visual, performance and balance jobs. The ordinary production build workflow also completed successfully on the review head.

## Exit checklist

- [x] BEGIN CAMPAIGN lands directly on the command map.
- [x] The right command sidebar collapses and materially enlarges the map without losing selection or context.
- [x] Map grading has no uniform green/dingy political wash.
- [x] Physical terrain shows clear satellite-inspired regional and land-cover variation across lowlands, woodland, farmland/plains, mountain, high-alpine/snow and water.
- [x] Illuminated border-led ownership remains clear without broad territory recolouring.
- [x] Terrain relief, all 15 authored city miniatures and future-soldier pieces remain clear and cohesive.
- [x] Every genuinely new campaign plays the portal arrival sequence once.
- [x] Ordinary command-view navigation and established save loading do not replay the portal.
- [x] On a first-ever campaign, the portal completes before any tutorial DOM or tutorial progression is released.
- [x] A completed tutorial does not replay merely because a later new campaign correctly replays the portal.
- [x] Labels, borders, routes, fronts, infrastructure and operational overlays remain readable.
- [x] Theatre, Campaign and Selected LOD remain coherent.
- [x] Geographic anchoring remains authoritative.
- [x] Static terrain/payload performance budgets pass and repeated exact-head browser measurements remain within the accepted practical envelope.
- [x] Accessibility and reduced-motion behaviour remain safe.
- [x] `?terrain=0` and renderer-failure fallback remain usable.
- [x] Save/load behaviour, determinism and balance remain unchanged.
- [ ] Product-owner integrated visual acceptance is explicitly recorded.

## Integrated evidence result

### Regression, production and payload

- Full deterministic regression suite: PASS.
- Targeted WP3.9 A/B/B3/landmark/C contracts: PASS.
- Exact production build: PASS.
- Broad physical-terrain texture: present and expected 37,032-byte build asset.
- High-resolution physical-terrain coverage: all 1,023 expected z7 WebP tiles present.
- Final authored landmark assets and manifests: present.

### Map UX and visual package

- WP3.9A map-default entry and sidebar collapse/restore: PASS.
- WP3.9B multi-region grading and operational colour hierarchy: PASS.
- WP3.9B3 dual-LOD physical terrain: PASS, including 28/28 successful local-detail requests in the Alpine Selected capture.
- All five authored-landmark browser passes: PASS, covering all 15 current city/capital miniatures in Campaign and Selected LOD with zero geographic anchor error in the recorded evidence.
- Manual evidence inspection found no integrated visual conflict between the physical terrain, ownership borders, landmarks, soldier pieces and operational overlays. Lowlands, woodland, upland and high-Alpine terrain remain materially distinguishable; the Alps retain substantially stronger exposed-rock/snow character while operational borders and labels remain readable.
- Sidebar-expanded and sidebar-collapsed evidence both retain map composition and selected context; collapsed mode materially increases usable map width.
- SVG/`?terrain=0` fallback remains usable and returns to the established accessible 2D command-map presentation.

### Portal and tutorial integration

- Normal fresh-campaign portal lifecycle: PASS.
- Initial four formations are fully withheld during opening, revealed at materialisation and finish at unchanged authoritative anchors; recorded maximum anchor delta is below 0.001 px.
- Second genuinely new campaign portal replay: PASS.
- Ordinary navigation/save-load replay suppression: PASS.
- Reduced-motion path: PASS.
- Renderer/SVG fallback settlement: PASS.
- First-time presentation ordering: PASS. Atomic browser evidence records `portalPresent=true`, `tutorialCount=0`, `arrivalClass=true` and formations withheld during opening; after completion it records `portalCount=0`, `tutorialCount=1`, the arrival gate released and formations visible.
- Completed tutorial does not replay during or after a later new-campaign portal sequence: PASS.

The full-page screenshot labelled `tutorial-order-portal-first.png` is not used as sequencing authority because the short cinematic completed while Playwright was taking the screenshot, so the captured pixels show the subsequently released tutorial. The same test retains an atomic in-frame state object before screenshot capture, and that authoritative evidence proves zero tutorial DOM while the portal is active. Portal visual presentation itself is separately exercised by the WP3.9C lifecycle gate.

### Performance

Static performance contracts and terrain payload budgets: PASS.

Three independent exact-head cold/software-WebGL samples completed successfully. Median values:

- First useful paint: 27.760 s.
- Campaign settled: 28.060 s.
- Campaign → Theatre: 2.682 s.
- Theatre → Selected: 9.081 s.
- Terrain requests: 73 median total / 61 median unique.
- Duplicate terrain requests: 10 median.
- Encoded terrain response bytes: 6,275,756 median.

The median Selected transition is inside the established practical tolerance that the earlier discovery run's single noisy sample narrowly exceeded. The repeated-sample result supports treating that earlier failure as software-WebGL timing variance rather than a production regression.

### Balance and simulation authority

- Full deterministic regression suite: PASS.
- Current-engine balance simulation: PASS.
- Representative stalled-campaign trace: PASS.
- No simulation, save-format, formation-position, combat, supply or balance authority change is introduced by WP3.9.

## Remaining gate

Engineering/technical integrated review is complete and passed. The only outstanding R3-WP3.9 exit criterion is explicit product-owner visual acceptance of the live integrated result.

R3-WP4 remains blocked until product-owner acceptance is recorded and this review is merged as **ACCEPTED**.
