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
The next selection pass will score nodes and normally expose only the most
important one to three of each type per territory.

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

1. Score and select gameplay-critical cities, airports and ports.
2. Add broad terrain profiles to all 101 territories.
3. Add the limited set of crossings that materially alter the campaign graph.
4. Add trunk rail and motorway hubs without attempting street-level routing.
5. Render a review map with independently toggleable layers.
