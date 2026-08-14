# WP3.5 Production Presentation Hotfix

Status: ACTIVE REMEDIATION

## Product-owner finding

The WP3.5 merge deployed successfully, but live Chrome inspection showed the legacy rectangular Task Group cards and strategic-node glyphs covering the intended physical army/city/infrastructure presentation. Incognito reproduced the same state.

## Confirmed root causes

A deployed-style `/future-conquest/` browser probe reproduces the issue on both Linux Chromium and Windows Chrome.

The Three.js runtime itself was loading:
- the formation, world and shared Three.js chunks all load successfully;
- WebGL2 is active;
- `data-physical-formations="ready"` is set;
- both formation and world custom layers report render activity and visible derived objects.

That evidence exposed two separate presentation failures.

### 1. Legacy compatibility cards remained opaque

MapLibre writes marker opacity as an inline style while evaluating marker visibility/terrain occlusion. The ordinary WP3.5 stylesheet rule `opacity: 0` therefore could not suppress the old Task Group card skin after the physical layer became ready, so the legacy cards painted over the physical pieces.

### 2. The Three.js layers used the wrong MapLibre v6 projection input

The custom layers were feeding Three.js the older generic `modelViewProjectionMatrix`. MapLibre v6 exposes the simple Mercator custom-layer projection through `defaultProjectionData.mainMatrix`, including in its terrain + Three.js integration pattern. Render callbacks and diagnostic counters could therefore be active without the geometry presenting correctly in the real map scene.

Both the formation and world miniature layers now use `defaultProjectionData.mainMatrix`. Production-path screenshots after this correction visibly show the actual infantry groups, city clusters and infrastructure silhouettes rather than merely reporting render counts.

A further presentation issue became clear after the projection/card fixes: four starting Task Groups can share one authoritative Luxembourg coordinate, so their physical representations stacked directly on top of one another. The hotfix preserves the exact geographic root but gives co-located miniature child groups deterministic local visual offsets. Strategic scale was then tuned against the corrected projection so pieces remain readable without covering whole territories.

The corrected physical map also exposed avoidable terrain-network churn during Theatre to Selected transitions. Formation DEM samples are now cached until the formation genuinely moves, and Theatre keeps the DEM source attached at zero exaggeration rather than removing terrain entirely. This preserves a flat Theatre presentation while allowing MapLibre to retain terrain tiles for the return to Campaign/Selected relief.

## Hotfix scope

1. Make the physical-ready compatibility-marker transparency authoritative while retaining invisible pointer/keyboard hit targets and restoring a concise card only for `:focus-visible`.
2. Use MapLibre v6 `defaultProjectionData.mainMatrix` for both physical custom layers and regression-test against returning to the obsolete projection path.
3. Preserve exact geographic roots, but arrange co-located Task Group miniature visuals deterministically around their shared root so four formations do not collapse into one object.
4. Tune symbolic Theatre/Campaign/Selected presentation scale for army and world miniatures against the corrected projection.
5. Keep strategic-node text labels/hit targets, but suppress the old circular node glyph when physical city/infrastructure silhouettes are active.
6. Keep the dedicated production-path regression probe on Linux Chromium and Windows Chrome. It mounts the built game at `/future-conquest/`, requires the actual Three.js layers to render, requires legacy Task Group cards to compute to zero opacity, and captures screenshots for visual inspection.
7. Keep Selected in Local LOD while capping the full-profile live zoom at 6.4 to avoid requesting an unnecessary higher-detail terrain band. The historical named Selected preset remains 7.1.
8. Cache formation terrain-height samples across camera-only movement and keep the DEM source attached with zero exaggeration in Theatre, avoiding needless terrain teardown/refetch while retaining proper grounding when formations actually move.
9. Keep WP2F and the performance benchmark focused on settled visual/performance state by programmatically invoking already-proven camera controls; dedicated browser and selection gates continue to exercise real pointer interaction.

## Boundaries

- MapLibre remains camera/geospatial/terrain authority.
- Simulation state remains gameplay authority.
- No gameplay, balance, save, route, territory, intelligence or narrative changes.
- Preserve PR #139 geographic-anchor guarantees and WP3.5 movement/click-target synchronisation.
- Preserve Layers controls, reduced motion, GPU disposal and `?terrain=0` SVG fallback.
- Performance thresholds remain unchanged; benchmark harness changes preserve the existing useful-paint, fallback and terrain-settlement contracts.
- WP4 remains blocked until the corrected deployed WP3.5 build is visually accepted by the product owner.
