# Phase VIII-B4A — Infrastructure Disruption

Version 9 introduces persistent damage to the strategic route network.

## Disruption model

- Resistance can sabotage routes inside occupied territory, with risk driven by local resistance.
- Enemy forces can interdict frontier corridors, with risk increasing as escalation rises.
- A substantial garrison at either end reduces disruption risk.
- At most one deterministic infrastructure incident is selected each campaign day.
- Every incident records its cause, route, severity, turn and description.

## Route consequences

Route condition now drives persistent operational state:

- 75–100: open
- 35–74: damaged
- 1–34: blocked
- 0: destroyed

Damage also recalculates route capacity modifiers, immediately affecting movement and supply throughput.

## Recovery baseline

Secured player-to-player corridors recover gradually. Administered and supplied endpoints accelerate work, while a ready or garrison formation provides an additional local engineering presence bonus.

## Persistence

Campaign saves advance to version 9. Version 8 and all earlier supported saves migrate with an empty infrastructure incident ledger while retaining route condition and logistics state.

## Scope boundary

This increment establishes persistent disruption and baseline recovery. Player-issued engineering projects, repair resource allocation, deliberate interdiction missions, combat-generated route damage and manual logistics priorities follow in later Phase VIII-B4 increments.
