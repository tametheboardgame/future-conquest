# WP3.5 Production Presentation Hotfix

Status: ACTIVE REMEDIATION

## Product-owner finding

The WP3.5 merge deployed successfully, but live Chrome inspection showed the legacy rectangular Task Group cards and strategic-node glyphs covering the intended physical army/city/infrastructure presentation. Incognito reproduced the same state.

## Confirmed root cause

A deployed-style `/future-conquest/` browser probe reproduces the issue on both Linux Chromium and Windows Chrome.

The Three.js runtime was not failing:
- the formation, world and shared Three.js chunks all load successfully;
- WebGL2 is active;
- `data-physical-formations="ready"` is set;
- both formation and world custom layers report render activity and visible derived objects.

The visible regression was caused by the compatibility Task Group markers remaining opaque. MapLibre writes marker opacity as an inline style while evaluating marker visibility/terrain occlusion, so the ordinary stylesheet rule `opacity: 0` could not suppress the old card skin after the physical layer became ready. The old cards therefore painted over the physical pieces.

A second presentation issue became clear once the cards were suppressed: four starting Task Groups share one authoritative Luxembourg coordinate, so their physical representations stacked directly on top of one another, and the original strategic scale made the procedural figures/world structures too small to read clearly at Campaign distance.

## Hotfix scope

1. Make the physical-ready compatibility-marker transparency authoritative while retaining invisible pointer/keyboard hit targets and restoring a concise card only for `:focus-visible`.
2. Preserve exact geographic roots, but arrange co-located Task Group miniature visuals deterministically around their shared root so four formations do not collapse into one object.
3. Increase symbolic Theatre/Campaign presentation scale for army and world miniatures, tapering it again at Selected/close zoom so physical pieces remain controlled rather than becoming true-scale geography.
4. Keep strategic-node text labels/hit targets, but suppress the old circular node glyph when physical city/infrastructure silhouettes are active.
5. Keep the dedicated production-path regression probe on Linux Chromium and Windows Chrome. It mounts the built game at `/future-conquest/`, requires the actual Three.js layers to render, and requires legacy Task Group cards to compute to zero opacity.

## Boundaries

- MapLibre remains camera/geospatial/terrain authority.
- Simulation state remains gameplay authority.
- No gameplay, balance, save, route, territory, intelligence or narrative changes.
- Preserve PR #139 geographic-anchor guarantees and WP3.5 movement/click-target synchronisation.
- Preserve Layers controls, reduced motion, GPU disposal and `?terrain=0` SVG fallback.
- WP4 remains blocked until the corrected deployed WP3.5 build is visually accepted by the product owner.
