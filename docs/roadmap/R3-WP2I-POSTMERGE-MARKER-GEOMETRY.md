# R3-WP2I post-merge marker geometry hotfix

## Purpose

Close two marker-layout edge cases found by the final post-merge review of PR #134 before human visual acceptance.

This is a presentation-only hotfix. Do not change gameplay, simulation, persistence, balance, topology, intelligence authority, terrain sources, camera semantics, terrain profile selection, geographic anchors, or WP2E performance budgets.

## Issue 1 — measure geometry after current visibility is applied

`applyTerrainOperationalMarkerLayout()` currently calls `resetAndCaptureMarkerBaseRects(markers)` before applying the new LOD/layer visibility state. A marker that was hidden in Theatre but becomes eligible in Campaign can therefore be measured while still `hidden`, producing a zero-sized rectangle at the viewport origin for the first collision pass.

Required behaviour:

- determine current layer eligibility and LOD/declutter visibility;
- synchronously apply the resulting `hidden` / `data-declutter` state before measuring collision geometry for the layout pass;
- capture/reset base rectangles only after that visibility is current, or equivalently recapture every marker that changed hidden -> visible before collision calculation;
- hidden markers must not participate in collision passes;
- preserve stable MapLibre marker identity and DOM reuse; do not recreate markers or force React rerenders;
- preserve arbitrary user pan/zoom and existing deterministic LOD/declutter ordering.

Add deterministic regression coverage proving a marker that becomes visible on Theatre -> Campaign has valid non-zero geometry and participates correctly in the first collision pass, without needing a later `moveend`/second layout call.

## Issue 2 — accumulate repeated protected-label fallback displacement

Within `avoidFormationLabelCollisions()`, `placeLabelRect()` includes an existing `placeAvoidanceDisplacement`. When the same protected place label participates in a later cluster's joint fallback, the candidate `move.delta` is therefore validated relative to the already-displaced rectangle. The current assignment then writes only the new delta onto base + toolbar offsets and replaces the dataset value, dropping the earlier displacement.

Required behaviour:

- preserve/accumulate the existing `placeAvoidanceDisplacement` when applying a later fallback move;
- the final rendered rectangle must match the rectangle that was validated against prior formations, fixed labels, HUD and canvas bounds;
- keep the existing <=48px per-search fallback candidate budget and <=96px common formation displacement contract; do not silently expand established budgets;
- preserve WGS84 marker anchors.

Add deterministic regression coverage where the same label participates in two sequential formation-cluster fallbacks. The final displacement must preserve the first move plus the second move, and the final rendered rect must remain collision-free and in-canvas.

## Regression obligations

At minimum run focused marker/layout tests plus the existing R3 exact-head workflows:

- Build and deploy
- Current engine balance simulation (720 campaigns)
- R3 WP2B terrain smoke
- R3 WP2B browser runtime probe
- R3 WP2C terrain overlay runtime probe
- R3 WP2D visual runtime probe
- R3 WP2E exact-head terrain performance gate
- R3 WP2F visual runtime probe
- R3 WP2I selection camera regression

Human visual acceptance remains required after deployment.
