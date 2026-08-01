# Transport structure layer v0.1

## Design decision

The game needs transport geography that creates strategic choices without turning
the campaign into a road-routing simulation. This layer therefore models only
the hubs and constrained crossings whose possession or loss could change
movement and supply at the 101-territory scale.

The stable map contains physical structure. Current closures, construction
status, damage, military control and usable capacity are supplied separately by
the dated World State snapshot.

## First-pass scope

- 58 rail, motorway or intermodal hubs.
- 30 critical crossings and constrained approaches.
- Relative capacity bands from 1 to 5 for balancing, not real throughput claims.
- Vulnerability bands and provisional repair duration for later systems design.
- No tactical layout, security arrangements or street-level routing.

Hubs are concentrated where major European corridors converge, transfer between
transport modes, cross rail-gauge systems or connect islands and peninsulas.
Crossings include fixed links, short sea routes, major river bridges, alpine and
Carpathian corridors, straits and strategically narrow land approaches.

## Gameplay use

1. A controlled hub increases supply throughput and strategic redeployment in
   its territory and along connected friendly territory edges.
2. A damaged or denied crossing increases the movement cost of its associated
   edge, or temporarily disables it when no plausible alternative remains.
3. Short-sea crossings still require commandeered shipping. Their presence does
   not give the future army naval units.
4. Internal crossings such as the Bosporus affect movement within a territory
   and can split its effective control without adding another map territory.
5. World State may begin a crossing unavailable or restricted, but never edits
   the permanent geography record.

## Review questions

- Are 58 hubs readable once shown through zoom-sensitive icons rather than all
  at once?
- Which crossings should disable an edge completely when denied, and which
  should merely add movement and supply penalties?
- Should capacity be shared by military movement and civilian supply, creating
  an escalation cost when the player monopolises a corridor?
