# R3-WP2I — Map Labels and Layer Controls

## Goal
Improve the 3D terrain map's information hierarchy after live review of WP2H.

## Required behaviour
- Territory/province names are visible by default in Theatre, Campaign and Local views. Selection changes styling, not existence.
- Enabled territory labels are protected from automatic declutter.
- City/capital/hub labels are stable place labels. Major labels may show at Theatre and secondary labels at Campaign+, but visibility must be based on layer/LOD policy rather than selection.
- Friendly formation cards must not cover visible territory or place labels. Use deterministic screen-space collision avoidance and keep the whole cluster tightly associated with its geographic anchor.
- Restore a visible `Layers` box in the terrain renderer.

## Terrain layer defaults
- Territory names: ON
- Friendly formations: ON
- Enemy contacts: ON
- Operations, threats and front indicators: ON
- Strategic routes: OFF
- Supply/network detail: OFF where separately available
- Cities and hubs: ON
- Ports: ON
- Airports: OFF

Layer state must survive Theatre/Campaign/Selected camera changes and state refreshes. Presentation toggles must not mutate GameState or recreate the MapLibre map.

## Browser acceptance
Extend the existing Chromium visual gate to assert:
- all active territory labels are visible when their layer is enabled, regardless of selection;
- a representative unselected territory remains labelled when another territory is selected;
- all seeded friendly formations remain visible by default;
- no friendly formation rectangle intersects a visible territory/place label rectangle;
- the formation cluster remains within a measured small displacement budget from its terrain-aware territory anchor;
- the terrain Layers control is visible;
- Territory names, Friendly formations, Cities/hubs and Ports can be toggled off/on and remain in the requested state through zoom/state refresh;
- existing Dover/Calais single-source projection, formation collision, hover and DOM-identity checks remain green.

Capture Theatre, Campaign and Selected/Local screenshots with default layers enabled.

## Scope
Presentation only. No gameplay, save-schema, balance, territory/route topology, intelligence authority, strategic-node coordinates, terrain source/DEM streaming or WP3 piece work. Do not restore the removed duplicate strategic-node map layer. Keep the low-zoom land-mask artefact as separate follow-up work.
