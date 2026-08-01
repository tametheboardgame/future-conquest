# Eastern administrative-boundary pass v0.3

## Outcome

The approved 101-territory campaign structure is unchanged. Belarus, Moldova,
Ukraine and European Russia now use open administrative source geometry rather
than the striped Pass 1 strategic partitions.

| Country | Campaign territories | Source units assigned | Result |
| --- | ---: | ---: | --- |
| Belarus | 2 | 7 ADM1 units | Administrative geometry |
| Moldova | 1 | 37 ADM1 units | Administrative geometry |
| Ukraine | 5 | 27 ADM1 units | Administrative geometry |
| Russia | 5 | 58 ADM1 units | European-theatre administrative geometry |

The source units are grouped around the previously approved strategic centres.
An explicit override file records deliberate exceptions to nearest-centre
assignment. This makes later corrections reviewable and repeatable rather than
embedding them invisibly in the build script.

## Disputed territories

Boundary geometry is not the game's source of truth for sovereignty or current
control. Crimea remains `UA-05` in the stable campaign catalogue, while claimant,
controller and conflict-state fields will be supplied separately by the dated
World State layer. The same separation will apply to every disputed area.

## Validation

- 101 territories and 101 unique IDs.
- 0 provisional/fallback territories.
- 1,431 source regions assigned across the complete map.
- 208 detected land connections plus 17 explicit crossing routes, including the
  World-State-controlled Kerch fixed link.
- Complete campaign graph connected.
- All polygon components pass geometry validation. Multipart territories are
  validated component by component because valid island groups can fail a
  whole-MultiPolygon predicate when components touch at a shared boundary.
- Two strategic centres fall just outside the generalised source geometry:
  `HR-02` and `IT-02`. Their strategic coordinates are preserved,
  while separate in-territory label anchors are generated for presentation.

## Next correction pass

1. Review every multi-territory country's source-region membership and record
   any further exceptions in `map-region-overrides.json`.
2. Rebuild adjacency after corrections and compare the graph against v0.2.
3. Lock the reviewed v0.3 map as the geometry baseline for gameplay prototyping.
