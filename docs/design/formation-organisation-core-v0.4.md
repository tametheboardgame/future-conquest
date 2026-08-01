# Formation Organisation Core v0.4

## Purpose

Concurrent Operations made the four original task groups independently useful, but they remained fixed counters. Formation Organisation Core lets the player restructure the expedition while preserving every person and armour unit.

## Formation actions

Available formations can now be:

- split into a new formation with exact personnel and armour allocations
- merged with another available formation in the same province
- used as the source or destination of personnel and armour transfers
- renamed
- dissolved after all personnel and equipment have been reassigned

Moving, attacking and recovering formations cannot be reorganised. This prevents active orders and operation participation from becoming internally inconsistent.

## Arbitrary force size

The engine permits formations down to a single person. A two-person detachment is therefore legal, but the interface clearly identifies it as a detachment with negligible territorial combat and no occupation capability.

Formation capability is derived from current personnel:

- detachment: fewer than 50
- company-sized force: 50–249
- battalion-sized force: 250–799
- task group: 800–2,199
- major formation: 2,200 or more

These bands communicate capability; they do not impose hard creation limits.

## Conservation rules

Split, merge and transfer operations conserve:

- current personnel
- personnel establishment capacity
- functional armour
- damaged armour

Personnel establishment capacity moves proportionally with transferred or split personnel so wounded recovery capacity is not silently created or destroyed.

## Territorial occupation

Winning combat and occupying a province are now separate outcomes.

Each territory has an occupation requirement derived from:

- strategic supply value
- terrain difficulty

When an operation wins with insufficient surviving personnel, the territory becomes **unsecured**. An unsecured territory:

- remains vulnerable to counterattack
- does not carry supply routes
- contributes no supply capacity
- cannot satisfy the campaign victory condition
- accumulates resistance until enough personnel are present

Once local non-moving, non-attacking personnel meet the occupation requirement, the territory advances to contested control and can enter the existing occupation process.

## Interface

The command panel now includes:

- a searchable formation roster grouped by province
- automatic force-size capability labels
- a Force Organisation panel
- exact split and transfer allocation controls
- merge, rename and dissolve controls
- occupation requirement and readiness information

## Save compatibility

The save format advances to version 4.

- version 4 saves load directly
- version 3 concurrent-operation saves migrate without data loss
- version 2 single-battle saves continue through the existing operation migration and are returned as version 4

## Deferred work

This phase does not yet add:

- reconnaissance, raids, infiltration or sabotage
- headquarters and command hierarchy
- command-capacity or fragmentation penalties
- detailed equipment categories
- explicit cancellation or withdrawal from active operations
- reinforcement production or strategic resource economy

Those systems should build on the arbitrary formation model established here.
