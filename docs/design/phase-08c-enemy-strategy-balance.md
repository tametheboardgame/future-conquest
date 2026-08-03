# Phase VIII-C — Enemy Strategy and Campaign Balance

Phase VIII-C replaces isolated enemy reactions with a theatre-level strategy that responds to the player's campaign position.

## Design goals

- Make the enemy identify and exploit genuine weaknesses rather than receiving arbitrary combat bonuses.
- Coordinate several formations against vulnerable fronts.
- Attack the expedition's supply network when logistics are strained.
- Concentrate rear formations towards a declared operational focus.
- Expose enemy doctrine, pressure and assessed intent through Intelligence.
- Create a visible operational-crisis path to defeat when several strategic failures persist.

## Enemy doctrine

The enemy reassesses its doctrine every campaign day:

- **Containment** — reinforce and entrench the front while the invasion remains limited.
- **Counteroffensive** — mass forces against an exposed or weakly defended player territory.
- **Logistics war** — prioritise interdiction of heavily used, bottlenecked or portal-connected corridors.
- **Strategic emergency** — combine concentration, interdiction and multi-formation counterattacks when the invasion threatens theatre collapse.

Doctrine selection is driven by escalation, player territorial gains, network efficiency, severe supply shortfalls, portal exposure and current frontline strength.

## Coordinated counterattacks

Counterattack plans may assign a primary formation plus supporting formations from adjacent enemy territory. Participating formations combine combat power and share losses. On success, the attacking force advances into the recaptured province.

The player receives a one-day intelligence warning before a planned counterattack resolves.

## Logistics warfare

When the enemy adopts Logistics war or Strategic emergency doctrine, it evaluates player-controlled routes using:

- current route utilisation;
- existing bottleneck status;
- proximity to the operational focus;
- portal connectivity;
- route condition and capacity.

A successful interdiction order creates persistent infrastructure damage through the existing route-damage system. Garrisons, route redundancy and engineering remain the player's counters.

## Operational crisis

A campaign crisis develops only when several strategic problems coexist, including portal exposure, very poor network efficiency, widespread formation starvation and low remaining personnel. The crisis counter is visible in Intelligence and can recover when the player stabilises the position.

Sustaining the crisis for the difficulty-specific limit causes campaign defeat. This adds a meaningful loss condition without making one unlucky event decisive.

## Persistence

Campaign saves advance to version 13. Version 12 and all earlier supported campaigns migrate with a normalised enemy-strategy state.

## Validation

- Full engine and interface regression suite: 160 tests passed.
- Production TypeScript and Vite build: passed.
- Focused coverage confirms doctrine assessment, logistics-war escalation, coordinated counterattack planning and resolution, reversible operational crisis and version 12 migration.
- Temporary implementation builders and diagnostic workflows were removed before final review.
