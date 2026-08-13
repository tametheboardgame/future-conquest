# R3-WP2F — Terrain Overlay Readability & Marker Scaling

## Purpose

Polish the accepted R3 continuous-terrain command map before R3-WP3 formation pieces and animated movement. This work package addresses two live-review problems observed after R3-WP2E:

1. operational markers no longer feel proportionate as the camera zooms between Theatre, Campaign and Selected/local views;
2. persistent political/control fills darken and muddy the terrain, obscuring the real-elevation visual foundation.

The terrain renderer, simulation, campaign state and intelligence rules remain authoritative and unchanged.

## Product direction

### 1. Terrain is the visual base layer

The real Copernicus terrain should remain visually dominant. Territory ownership/state must be readable primarily through borders, selection/hover emphasis and exceptional operational state, not through a permanent dark colour wash across every polygon.

Default territory presentation:
- administrative/political division lines remain clearly visible at all supported zooms;
- control borders remain legible without overpowering terrain;
- ordinary territory fill is effectively transparent or extremely subtle;
- terrain relief, land texture and coastline remain clearly visible.

Interactive territory presentation:
- mouse/pointer hover adds a temporary soft control-colour tint to the hovered territory;
- selected territory receives a stronger but still translucent highlight;
- targeted territory receives a distinct highlight;
- active combat / under-attack / imminent / preparing states may retain state emphasis, but borders should do most of the work and area fills should stay restrained;
- hover must not disclose hidden enemy information or derive any new state.

Use MapLibre feature-state or another presentation-only hover mechanism where practical so hover does not rebuild authoritative GeoJSON or mutate game state.

### 2. Operational markers behave like UI, not geography

Formation cards, enemy contacts, threat markers, operations, territory labels and strategic-node labels are screen-space command UI. They should not grow/shrink in direct proportion to map geography.

Implement one explicit marker presentation policy driven by the existing terrain LOD thresholds:
- **Theatre (<4.8):** compact/simplified markers, reduced density and restrained footprint;
- **Campaign (4.8–6.4):** normal command markers;
- **Local / Selected (>=6.4):** normal/full-detail markers, with modest additional detail where useful.

Marker scale should be tightly clamped. Avoid large visual jumps at LOD boundaries and avoid markers becoming disproportionately huge relative to the visible territory when zoomed out or tiny/unreadable when zoomed in.

Prefer CSS variables/classes or a small presentation helper over rebuilding MapLibre Marker instances during zoom. Existing keyed marker reconciliation and callback freshness from WP2E must be preserved.

### 3. Declutter must use the same visual footprint as the rendered marker

The marker collision/declutter model currently uses fixed radii. If marker presentation size changes by LOD, collision spacing must remain consistent with the actual displayed footprint. Do not create a situation where visually larger markers overlap because the collision model still assumes the smaller size.

Preserve protected-marker priority for selected formations, operations, live threats, selected territory and portal.

### 4. Camera/zoom transitions must remain smooth

Theatre, Campaign and Selected buttons plus free wheel/trackpad zoom should not produce sudden marker explosions, ghost markers, stale labels or layout instability. Existing WP2E retained-tile behaviour and terrain performance architecture must remain intact.

## Scope

Expected implementation areas include:
- `src/components/TerrainMapPrototypeImpl.tsx`
- `src/presentation/r3-terrain-operational-markers.ts`
- `src/presentation/r3-terrain-marker-declutter.ts`
- `src/r3-terrain-prototype.css`
- focused R3-WP2F tests and browser visual/runtime evidence
- roadmap/status documentation

Do not change authoritative gameplay, balance, save schema, territory/route topology, task-group positions, hidden-information rules or enemy intelligence derivation.

## Acceptance criteria

1. Default terrain no longer looks globally darkened by territory/control fills.
2. Territory division lines remain obvious at Theatre, Campaign and Selected/local zooms.
3. Hovering an ordinary territory produces a clear but restrained temporary tint.
4. Moving the pointer away removes the hover tint without altering selection/game state.
5. Selected and targeted territories remain immediately identifiable.
6. Active combat/threat states remain readable without turning large regions into opaque colour blocks.
7. Formation/task-group markers are visually proportionate at Theatre, Campaign and Selected/local zooms.
8. Enemy contacts, threat/operation markers, territory labels and strategic-node labels follow a coherent LOD policy.
9. Marker changes do not allocate/recreate unchanged MapLibre markers on every zoom frame.
10. Declutter remains deterministic and corresponds to rendered marker footprint.
11. Full and compact terrain profiles remain usable.
12. Existing SVG fallback remains unchanged and available.
13. Existing WP2B/WP2C/WP2D/WP2E browser and performance gates remain green.
14. WP2E regression budgets remain green; this visual polish must not materially regress terrain loading/streaming.
15. Full regression/save tests and deterministic balance remain unchanged.

## Validation

Before merge:
- focused WP2F unit/contract tests;
- existing terrain marker/declutter tests;
- production build and terrain budget;
- WP2B terrain smoke + browser runtime;
- WP2C overlay runtime;
- WP2D visual runtime;
- WP2E exact base/head performance gate/regression budgets;
- new Chromium visual assertions/screenshots covering Theatre, Campaign and Selected/local marker sizing plus hover/default territory styling;
- full engine/persistence regression suite;
- deterministic current-engine 720-campaign balance parity;
- exact-head Codex review with no actionable P1/P2/P3 findings.

## Exit / handoff

R3-WP3 — Formation Pieces & Animated Movement remains paused until this work package is technically green and the live terrain/overlay presentation has been reviewed. WP3 must inherit the marker/LOD and terrain performance rules established here.