# Phase VIII-B2 — Route-based movement

## Objective

Convert operational reach and player movement timing from territory-neighbour and terrain heuristics to the explicit strategic route network introduced in Phase VIII-B1.

## Included

- Move and attack targets require at least one traversable strategic route.
- Open and damaged routes are traversable; blocked and destroyed routes are not.
- Parallel routes remain independent, so one blocked corridor does not close an adjacency when another route remains available.
- Movement orders persist the selected route ID.
- The command interface exposes available routes and recommends the fastest usable corridor.
- Movement progress uses route movement days, route condition, route capacity modifier, route status and formation supply.
- Corridors not rated for heavy equipment slow powered formations but do not make them immobile.
- Active version-6 movement and attack orders migrate to the best available route.
- Campaign persistence advances to version 7 while retaining versions 2–6.

## Excluded

- Strategic supply throughput.
- Route capacity consumption by simultaneous formations.
- Route damage generation, interdiction, repair or engineering orders.
- Enemy route planning and route-aware reinforcement.
- Multi-territory pathfinding.

## Selection rules

1. Routes are considered only between the formation's current territory and the selected adjacent territory.
2. Blocked, destroyed or zero-capacity routes are unavailable.
3. A player-selected available route is used when supplied.
4. Otherwise the engine selects the route with the lowest estimated movement duration, then highest effective capacity, then route name.
5. Existing movement orders without a route ID are normalised during migration or on first resolution.

## Movement timing

- Base duration comes from the route definition's `movementDays` value.
- Damaged corridors reduce daily progress.
- Poor condition and reduced capacity modifier reduce daily progress.
- Formation supply below 40 percent reduces daily progress.
- Routes not suitable for heavy equipment impose a moderate penalty when the formation carries functional powered armour.
- Movement progress remains deterministic and resolves during the existing daily sequence.

## Compatibility

- Save version 7 stores `routeId` on active orders.
- Version-6 saves are upgraded by assigning the best available route to each active order.
- Versions 2–5 continue through the existing migration chain before route assignment.
- Current 15-territory geography and B1 route definitions remain unchanged.
