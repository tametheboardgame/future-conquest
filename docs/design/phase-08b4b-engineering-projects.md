# Phase VIII-B4B — Engineering Projects and Repair Allocation

Version 10 gives the player direct control over strategic infrastructure repair.

## Engineering projects

- A repair project can be created for a damaged route whose endpoints are both controlled and sufficiently secured.
- A ready or garrison formation must be located at either end of the corridor.
- The assigned formation enters engineering status and cannot move, attack or reorganise until the project completes or is cancelled.
- Completed and cancelled projects remain in a persistent project history.

## Repair allocation

Each project can be assigned 25%, 50%, 75% or 100% engineering intensity.

Higher intensity:

- increases daily route-condition recovery;
- increases the assigned formation's logistics demand;
- can place additional pressure on bottleneck routes and other formations.

Actual repair work is reduced when the assigned formation receives inadequate logistics throughput. Projects can stall completely when delivery falls below the critical threshold.

## Passive maintenance

Automatic route recovery is now limited to one condition point per day and only applies when both endpoint territories are administered and supplied. Significant damage therefore requires an explicit engineering project.

## Persistence

Campaign saves advance to version 10. Version 9 and all earlier supported saves migrate with an empty engineering-project ledger.

## Interface

A dedicated Engineering command view provides:

- damaged-corridor selection;
- eligible formation assignment;
- repair-intensity control;
- live project progress, route condition, supply delivery and resources spent;
- cancellation and project history.

## Scope boundary

Deliberate player interdiction missions, combat-generated route damage and logistics-priority controls remain for later Phase VIII-B4 increments.
