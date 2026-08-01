# Playable vertical slice v0.2

## Purpose

This checkpoint replaces the aggregate future army demonstration with persistent formations and an opposing operational layer. It is intended to create the first version in which position, force division and leaving territory undefended have meaningful consequences.

## Future formations

The 10,000-person vertical-slice force is divided into six selectable formations:

- Aegis Command, 1,000 personnel, containing the General
- Aquila Task Group, 1,800 personnel
- Bastion Task Group, 1,800 personnel
- Cobalt Task Group, 1,800 personnel
- Drake Task Group, 1,800 personnel
- Echo Task Group, 1,800 personnel

Each formation persistently tracks location, personnel, functional, damaged and broken armour, cohesion, supply, order availability and engagement state. Movement and attacks consume the selected formation's daily order.

## Contemporary forces

Each initially hostile territory contains a persistent defence brigade. Contemporary formations can suffer losses, reinforce adjacent front-line territories, counterattack exposed player positions, retreat through friendly territory or be destroyed when no retreat route remains.

Coalition reinforcement waves enter at escalation thresholds. Entry requires an enemy-controlled edge territory, so controlling likely reinforcement corridors has strategic value.

## Combat and territory control

Player operations remain multi-day and use the actual attacking and defending formations. Terrain, armour, cohesion, supply and formation quality contribute to combat power. Forecasts report a broad assessment and estimated future-force losses rather than guaranteeing the outcome.

Captured territories must be defended. Enemy formations immediately retake undefended front-line territory when a viable route exists. Occupation develops more slowly without a garrison, and extreme resistance can restore hostile control.

Retreats require an adjacent friendly-controlled territory. Formations without a route are destroyed. Loss or capture of Aegis Command defeats the player because the General is physically present with that formation.

## Logistics

Future formations trace supply through contiguous player-controlled territory to the portal territory. Disconnected formations become isolated, lose cohesion and suffer faster armour degradation. The overall supply network depends on connected territory, occupation maturity, force demand and escalation.

## Interface changes

The browser interface now provides:

- a selectable six-formation roster
- persistent player and enemy formation markers
- formation location, strength, armour, cohesion, supply and order state
- animated order routes
- separate movement and attack orders
- known defender strength and estimated loss ranges
- command-formation identification
- enemy reinforcement and counterattack reporting

## Deferred scope

The following remain for later checkpoints:

- combining several future formations in one operation
- formation splitting and detachments
- independent allied modern brigades
- medical returns and repair allocation decisions
- explicit occupation policies
- detailed air, naval and strategic intervention
- full 101-territory play
- upgraded 2.5D or 3D rendering

The engine remains independent of the SVG map renderer so the visual layer can be replaced without rewriting campaign rules.
