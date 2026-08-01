# Integrated foundation v0.2

## Purpose

This is the final systems simulation before playable development. It places the approved map, logistics, formations, combat, occupation and escalation rules inside one persistent campaign loop.

Earlier packages isolated individual relationships. This version tests whether those relationships remain coherent when they affect one another across all 101 territories.

## Daily campaign sequence

Each campaign day resolves in this order:

1. Recoverable and critical wounded reach their return date.
2. Territory legitimacy, resistance, incidents and uprisings change.
3. Eligible territories raise contemporary formations.
4. Global escalation decays or rises to its territorial floor.
5. Sanctions, intervention, foreign reinforcement and strategic risk update.
6. Civilian and military supply capacity is calculated.
7. Idle formations recover, replace losses and repair equipment.
8. Active multi-day battles resolve another day.
9. Finished battles apply medical, salvage, technology and occupation consequences.
10. The campaign command system starts new operations where capacity permits.

This sequence is deterministic for a saved seed and is suitable for the eventual turn-resolution engine.

## Persistent future formations

Future troops remain in task groups with:

- active personnel
- functional, damaged and broken armour state
- readiness and cohesion
- current location and battle assignment
- killed, captured and medically unavailable personnel
- recovery state

Routine wear and battle damage move armour from functional to damaged and then unarmoured. Idle formations repair a limited number of suits using finite parts. Medical returns restore personnel faster than armour.

## Persistent contemporary formations

Modern brigades retain national identity, role, equipment, loyalty, location and casualties. Their mobilisation condition depends on occupation policy:

- negotiated territories must become integrated
- client governments may mobilise once administered
- military administrations can coerce units once basic control exists

This gives coercive occupation early access to nominal forces, but their low loyalty produces refusals and defections. The units exist on the map and can be lost; they are never converted into a passive support multiplier.

## Multi-day operations

An operation owns its assigned attackers until victory, withdrawal or defeat. Each day changes:

- objective progress
- personnel casualties
- powered-armour damage
- modern equipment strength
- readiness and cohesion

Terrain, urbanisation, escalation, foreign reinforcement and supply affect the enemy relationship. Formations withdraw when cohesion or operational strength collapses. Battlefield possession determines salvage and technology exposure.

## Medical and salvage integration

Combat casualties immediately leave active strength. At battle conclusion they are classified as killed, critical, recoverable or captured using the approved operational outcome tables.

Recoverable wounded return after seven days and critical wounded after 45 days. Future personnel may return with damaged or no armour. Broken suits recovered from a held battlefield enter the repair and parts pools; equipment left after withdrawal increases technology exposure and escalation.

## Occupation and resistance integration

Victory creates a newly occupied territory, not an instantly productive one. Its policy determines starting legitimacy, resistance, administration delay, local-force eligibility and supply activation.

Resistance incidents damage that named territory's supply contribution. Severe low-legitimacy resistance can produce an uprising and remove the territory from control, reopening its borders and supply relationships.

## Escalation integration

The current escalation stage directly modifies:

- enemy combat power
- usable supply
- foreign reinforcement frequency
- strategic-strike risk

Conquest, civilian harm, infrastructure destruction and technology capture raise escalation. Humanitarian policy and time can reduce it, but never below the floor created by the proportion of Europe controlled.

## Command bandwidth and campaign modes

The four modes share world, combat, mobilisation and political rules. They differ through future personnel, concurrent command capacity and operational cycle:

- Campaign can direct four simultaneous battles.
- Standard can direct three.
- Veteran can direct two.
- Desperate can direct one and requires regular reorganisation days.

This preserves campaign identity without giving smaller armies artificial allied bonuses.

## Implementation boundary

The simulator is a design oracle, not the final game engine. The vertical slice should translate these state transitions into typed engine modules with logged player-facing events.

The dated World State remains responsible for real national forces, alliances, active conflicts, political relationships and intervention decisions.
