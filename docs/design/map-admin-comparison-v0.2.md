# Administrative-Boundary Comparison: Draft 0.2

## Result

The approved 101-territory structure has been rebuilt using real NUTS regional polygons wherever coverage is available.

- 101 stable territory IDs retained
- 88 territories rebuilt from NUTS geometry
- 13 eastern territories retain provisional Pass 1 geometry
- 1,302 NUTS source regions assigned and recorded
- 207 candidate land adjacencies detected
- Campaign graph remains connected after explicit route connections

## Coverage

NUTS 2024 provides usable geometry for the EU, EFTA states and most Balkan candidate or potential-candidate countries. The United Kingdom uses NUTS 2021 level 2. Belarus, Moldova, Ukraine and Russia require an equivalent non-NUTS administrative source.

## Comparison method

Source regions are assigned to the nearest approved strategic centre within their country and dissolved into the relevant territory ID. This produces recognisable real boundaries while preserving the approved strategic structure.

## Review findings

- The 101-territory scale remains legible with real regional borders.
- Western and central European divisions now follow recognisable administrative shapes.
- The transition between covered and provisional eastern geography is visually clear.
- Dense central-European labels will require zoom-aware presentation.
- The European-Russia theatre edge remains consistent with the approved design.

## Known validation items

- Five dissolved multipart territories retain source-topology warnings and require a cleaning pass.
- Cardiff is approximately 7.4 km outside the generalised Wales polygon; Split and Rome are within 0.5 km of their coastlines. These are label/source-generalisation issues rather than incorrect territory assignments.
- Cyprus, the Danish Islands, the Greek Islands, Iceland, Sardinia and Malta require explicit non-land connections, as expected.

## Next action

Manually review the source-region mapping, add overrides where nearest-centre assignment creates strategically poor groupings, then acquire equivalent administrative geometry for the four uncovered eastern states.

