# Map Pass 2: Administrative Geography and Strategic Layers

Status: In progress  
Baseline: Approved 101-territory Standard Campaign map

## Objective

Replace the provisional centre-weighted internal partitions with recognisable administrative and geographic boundaries while preserving the approved territory count, country allocation and theatre scope.

## Boundary source hierarchy

1. Eurostat NUTS 2024 regions for EU members where they create coherent strategic territories.
2. Eurostat statistical regions for supported candidate, potential-candidate and EFTA countries.
3. EuroGlobalMap and Natural Earth Admin-1 for remaining non-EU coverage.
4. Authored geographic splits following rivers, mountain chains or established regional boundaries where no single administrative combination produces a playable territory.
5. Explicit stable geometry for disputed areas whose claimant and controller belong in World State data.

Every Standard territory will receive a mapping manifest listing the source regions merged into it. Territory IDs will not change during this pass.

## Work stages

### Stage 1: Administrative boundary replacement

- Acquire versioned regional geometry.
- Create a source-region catalogue.
- Map each source region to one approved territory ID.
- Dissolve mapped regions into Standard territories.
- Resolve gaps, overlaps, enclaves and disconnected fragments.
- Re-run geometry and centre validation.

### Stage 2: Strategic settlements

- Add national capitals.
- Add each territory's administrative or strategic centre.
- Add a limited set of additional cities where population, transport or military importance justifies them.
- Define zoom-dependent labels to prevent central-European clutter.

### Stage 3: Transport and chokepoints

- Add major TEN-T-derived road and railway corridors.
- Add strategically significant ports and airports.
- Add fixed links, ferries, tunnels, bridges and mountain passes.
- Replace purely geometric adjacency with authored movement edges and capacity.

### Stage 4: Sea zones

- Add the North Atlantic, Norwegian Sea, North Sea, English Channel, Baltic Sea, Bay of Biscay, Western Mediterranean, Central Mediterranean, Adriatic Sea, Aegean Sea and Black Sea.
- Connect ports through capacity-limited maritime routes.
- Define naval and air-interception exposure without creating a separate naval tactics game.

### Stage 5: Terrain and physical barriers

- Derive simplified elevation classes from Copernicus DEM.
- Add major rivers and mountain chains as movement and combat modifiers.
- Assign territory-level terrain mixes and route-level crossing penalties.
- Add regional seasonal-weather classifications.

### Stage 6: Portal placement

- Generate eligible land-arrival zones.
- Exclude water, tiny islands, dense city centres, extreme slopes and invalid edge locations.
- Calculate supply access and opening-difficulty ratings.
- Validate favourable, balanced, hostile and fully random start modes.

### Stage 7: Presentation

- Introduce selectable political, terrain, logistics and military overlays.
- Add zoom-aware labels and symbols.
- Improve palette, coastlines and sea treatment.
- Preserve accessibility through contrast, shape and icon distinctions rather than colour alone.

## Acceptance criteria

- Exactly 101 Standard territories and 101 stable IDs.
- No unintentional gaps or overlaps.
- All strategic centres lie within or immediately adjacent to their intended territory after source generalisation.
- Every territory is reachable through an authored land, fixed-link, maritime or air route.
- All source datasets have manifests and attribution records.
- Political claim and current controller remain independent from geometry.
- The map remains legible at desktop and tablet sizes.
- Rapid merge groups remain coherent.
- Grand Campaign subdivisions remain feasible.

## First deliverable

An administrative-boundary comparison map showing the approved 101-territory structure with real regional boundaries for the EU and provisional treatment clearly marked for uncovered non-EU states.

