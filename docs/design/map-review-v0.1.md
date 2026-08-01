# Standard Campaign Map Review: Draft 0.1

## Purpose

This is the first rendered test of the proposed 101-territory Standard Campaign. It exists to test overall scale, territory allocation, theatre edges and visual legibility before detailed administrative boundaries and infrastructure are introduced.

## What is reliable in this draft

- 101 stable candidate territory IDs are present.
- Country coastlines come from Natural Earth 1:10m geometry.
- Every territory has an authored name, country, strategic centre and Rapid Campaign parent group.
- Crimea has independent stable geometry rather than being permanently embedded in a claimant state.
- The campaign graph becomes fully connected after 16 explicit sea, strait and fixed-link routes are added.
- Political ownership and military control remain separate from geometry.

## What is deliberately provisional

- Internal borders are centre-weighted strategic partitions.
- Territory boundaries have not yet been aligned with NUTS or equivalent administrative regions.
- Ports, airports, capitals, rail corridors and chokepoints are not yet drawn.
- Sea zones and explicit route lines are not yet rendered.
- Russia's eastern campaign boundary is a theatre edge rather than an international border.
- Dense labels in central Europe require interactive zoom or a revised label treatment.

## Automated validation result

- Territory count: 101
- Unique IDs: 101
- Detected land edges: 215
- Explicit non-land connections: 16
- Campaign graph after routes: connected
- Isolated before explicit routes: Cyprus, Iceland, Sardinia and Malta
- Known geometry warnings requiring refinement: Eastern Germany and Berlin; Southern Greece and Athens
- Strategic-centre points lying marginally outside generalised coastlines: Nicosia, Copenhagen, Split, Naples, Tromsø and Luleå. Each is within approximately 2.1 km and is a source-generalisation issue rather than a territory-allocation failure.

## First review questions

1. Does the map contain the right overall geographic scope?
2. Does 101 territories look manageable rather than cluttered?
3. Are any countries obviously over-divided or under-divided?
4. Does the European-Russia theatre edge feel acceptable?
5. Should Iceland, Cyprus and Malta remain full territories despite their transport difficulty?
6. Does treating microstates as nodes still feel correct?

## Recommended next pass

Replace provisional internal partitions with authored merges of NUTS 2, NUTS 3 and equivalent non-EU administrative regions. Then add capitals, ports, airports and chokepoints before attempting visual polish.

