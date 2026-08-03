# Phase VIII-B4D — Manual Logistics Priorities

Version 12 gives the player direct control over how scarce throughput is distributed without requiring constant logistics micromanagement.

## Priority doctrine

Every formation and controlled territory receives an automatic logistics priority:

- **Critical** — active attacks.
- **High** — movement, recovery, engineering and interdiction.
- **Standard** — ready formations, garrisons and controlled territory.
- **Restricted** — stable administered territory.

The player may override any automatic priority or return it to automatic control.

## Allocation behaviour

Available source, route and territory throughput is allocated by tier. Critical requests are served before High, followed by Standard and Restricted. Requests within the same tier share available capacity proportionally.

This means a deliberate Critical allocation can preserve an offensive or repair project, but may leave lower-tier formations or administration below their daily requirement.

## Consequences and warnings

The logistics view displays requested and delivered supply for every formation and administration request. A severe shortfall is recorded below 40% delivery.

Changing a priority recalculates the network immediately. If the change creates a new severe shortfall, the command log names the affected formations or territories.

## Interface

A dedicated Logistics command view provides:

- network capacity, demand and efficiency;
- automatic or manual formation priorities;
- automatic or manual administration priorities;
- requested-versus-delivered throughput;
- severe-shortfall warnings;
- current route bottlenecks.

## Persistence

Campaign saves advance to version 12. Version 11 and all earlier supported campaigns migrate with empty override maps, preserving the automatic behaviour.

## Validation

- Full engine and interface regression suite: 153 tests passed.
- Production TypeScript and Vite build: passed.
- Focused coverage confirms automatic defaults, tiered shortage allocation, manual overrides, starvation warnings and version 11 migration.

## Scope boundary

Enemy logistics strategy and campaign balance remain for Phase VIII-C.
