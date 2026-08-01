# Strategic geography layer v0.1

## Purpose

Strategic geography sits between map geometry and the dated World State. It
describes the durable places and physical features that affect movement,
logistics, combat and escalation without asserting who currently controls them.

## Layer model

Each strategic object has a stable node ID, location, territory ID, source and
gameplay review status. Current controller, operational status, damage and
temporary closures are deliberately supplied by the World State snapshot.

| Layer | Initial scope | Intended gameplay use |
| --- | --- | --- |
| Strategic centres | One approved centre per territory | Occupation, command and territory control |
| Major cities | Capitals and large population centres | Civilian risk, supply, recruitment and escalation |
| Strategic airports | Large airports or an open runway of at least 8,000 feet | Enemy air operations, rapid redeployment and capture objectives |
| Ports | World Port Index candidates | Sea crossings, commandeered shipping and overseas supply |
| Terrain | Next pass | Movement, concealment, attrition and combat modifiers |
| Critical crossings | Next pass | Chokepoints, bridges, tunnels and straits |
| Rail and motorway hubs | Next pass | Strategic movement and supply throughput |

## Candidate build result

- 101 strategic centres.
- 80 major-city candidates.
- 620 strategic-airfield candidates, including long-runway military and closed
  civil facilities rather than relying only on current passenger classification.
- 699 port candidates inside the campaign geometry.
- Every coastal territory contains at least one World Port Index candidate.
- Only `CH-02` and `GB-05` lack an airport meeting the initial 8,000-foot rule;
  this is not an error and will become a meaningful strategic distinction.

These are evidence layers, not the number of icons that will appear in the game.
The selection pass scores nodes and exposes no more than two additional major
cities, two strategic airports and two ports per territory. The first result is:

- 14 additional major cities beyond the 101 strategic centres.
- 189 selected strategic airports and airfields.
- 128 selected ports.

Airport scoring uses runway length, source classification and scheduled service.
Port scoring uses harbour size, supported vessel size, cargo facilities, rail,
fuel, water and provisions. The complete candidate layers remain available.

## Terrain profiles

All 101 territories now have a broad terrain class, winter-severity band,
urbanisation band and base movement-cost multiplier. Natural Earth physical
regions provide the initial mountain, plateau, plain, lowland and tundra
coverage. Twenty-four explicit authored overrides handle islands and strategic
territories whose broad geography is not represented adequately by those
cartographic regions.

The resulting first-pass distribution is deliberately broad rather than
tactical: open lowland, mixed lowland, mixed upland, mountainous and subarctic.
No terrain profile remains unreviewed because of missing source coverage.

## Gameplay principles

1. Capturing an airport does not grant the future army aircraft. It denies or
   enables enemy operations and provides a large logistics site.
2. Capturing a port does not grant naval forces. It creates opportunities to
   seize civilian or military shipping and move troops across explicit routes.
3. Major cities improve access to food, vehicles and recruits but sharply raise
   civilian-risk and escalation consequences.
4. Physical existence is stable data. Operational status and control are dated,
   replaceable facts.
5. Military installations will be represented at strategic scale only. The game
   does not require or benefit from tactical security detail.

## Next pass

1. Add the limited set of crossings that materially alter the campaign graph.
2. Add trunk rail and motorway hubs without attempting street-level routing.
3. Convert movement costs into turn and supply effects during gameplay design.
4. Replace remaining heuristic urbanisation with a continuous population layer.
