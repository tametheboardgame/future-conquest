# Phase VIII-B3 — Supply Throughput and Logistics

Version 8 turns supply connectivity into a finite daily network allocation.

## Model

- The portal is the expeditionary supply source.
- Controlled, secured territory can relay supply. Unsecured captures cannot relay it.
- Route supply capacity is modified by status, physical condition, capacity modifier and endpoint infrastructure.
- Territory relay capacity is derived from local supply value, strategic nodes and occupation quality.
- Formation demand is derived from personnel, deployable armour and current status. Combat and movement require more throughput than static duty.
- Territorial administration also consumes throughput.
- A deterministic weighted allocation distributes finite capacity across all simultaneous demands and can use parallel routes.

## Conditions

Formation and territory allocations are classified as Sustained, Strained, Undersupplied, Critical or Cut off. Delivered throughput changes local supply stocks, morale, recovery, armour repair and attrition.

## Interface

- Network Supply reports delivered demand rather than simple connectivity.
- The map includes an independent Supply network layer and highlights the selected formation's primary path.
- Selected formation and territory panels expose demand, delivery and condition.
- Intelligence exposes source utilisation, total demand, delivery, saturated corridors and stressed formations.

## Persistence

Campaign saves advance to version 8. Version 7 and all earlier supported campaigns migrate by recalculating logistics from their current map, formations and route states.

## Scope boundary

B3 does not yet generate route damage, enemy interdiction, engineering orders, repair projects, manual logistics priorities or convoy units. Those belong to VIII-B4.
