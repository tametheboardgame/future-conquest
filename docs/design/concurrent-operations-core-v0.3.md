# Concurrent Operations Core v0.3

## Purpose

The Formation Command release introduced persistent task groups, but retained a single global battle. That prevented the player from using the separate formations as a genuine operational force. Concurrent Operations Core replaces that bottleneck with independently tracked operations and orders.

## Independent orders

Each available task group can now receive its own order before the campaign day resolves. A player can simultaneously:

- attack different enemy territories
- send several task groups into the same operation
- move another task group through controlled territory
- retain formations as garrisons or reserves

Selecting **Resolve all orders** advances every movement and operation during the same campaign day.

## Operation model

Operations are persistent records containing:

- target territory
- participating task groups
- each participant's point of origin
- operational progress and duration
- persistent defending formations
- current enemy power

A task group attacking a territory with an existing operation joins that operation as a reinforcement. Task groups attacking different territories create separate operations.

## Daily resolution

All operations resolve in a deterministic order during the daily sequence. Each operation calculates combined attacking power, applies a coordination factor, distributes losses across its participating task groups and updates its own progress.

An operation can independently achieve victory, continue into the next day or withdraw. Movement orders also resolve during that day. Enemy counterattacks can disrupt task groups and remove them from operations where necessary.

## Dynamic defenders

An operation refreshes its defender roster from the actual enemy formations currently present in the target territory. Enemy formations that reinforce or retreat into an active battle therefore become part of that operation before the next combat resolution. This prevents a territory from being captured while an untracked relief formation is still physically present.

The defender roster and estimated enemy power are synchronised again after retreats, reinforcement and counterattack resolution so the interface shows the current battlefield state between campaign days.

## Interface

The playable slice now includes:

- an Active Operations panel
- participant counts and operation progress
- a **Join operation** order for reinforcement
- active-operation markers on target territories
- animated routes from participating task groups to their targets
- a day control labelled **Resolve all orders**

## Save compatibility

The save format advances to version 3. Version 2 saves remain loadable: an existing single battle is migrated into a one-operation collection and its attacking task group is attached to that operation.

## Release validation

The release suite includes explicit coverage for:

- separate simultaneous operations
- several task groups joining one operation
- simultaneous territorial victories
- movement alongside active combat
- multi-participant withdrawal
- counterattack pruning
- version 2 save migration
- enemy relief formations arriving after an operation begins

## Deliberately deferred

This phase retains the four fixed task groups. The following features should be developed after concurrent operation resolution is stable:

- splitting and merging task groups
- transferring personnel and powered armour
- arbitrary detachment creation
- command hierarchy and scalable formation management
- raid, reconnaissance, infiltration and sabotage orders
- explicit reinforcement withdrawal during an active operation
