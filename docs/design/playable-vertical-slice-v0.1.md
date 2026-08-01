# Playable vertical slice v0.1

## Scope

The first playable browser checkpoint covers fifteen territories across north-western and central Europe:

- Southern England
- Northwest France
- Paris Basin
- Northeast France
- Central and Alpine France
- Flanders and Brussels
- Wallonia
- Southern Netherlands
- Luxembourg
- Rhine-Ruhr
- Central Germany
- Southwest Germany
- Swiss Plateau
- Alpine Switzerland
- Western Austria

This region contains the Channel crossing, dense cities and transport corridors, several national borders, lowland manoeuvre space and Alpine terrain. It deliberately excludes full naval and air warfare from the first interaction loop.

## Technical foundation

The client uses:

- React and TypeScript
- Vite for local development and production builds
- the approved administrative GeoJSON rendered as an interactive SVG
- a pure game-state transition module separated from presentation
- JSON-compatible state for deterministic saves
- browser local storage for the initial save slot

The Vite base path is relative so the same build can be hosted under a GitHub Pages repository URL.

## Implemented checkpoint

The first checkpoint provides:

- random portal placement from a campaign seed
- the real fifteen-territory geographic map
- player, enemy, selected, targeted and active-battle map states
- territory information including terrain, supply, legitimacy and resistance
- adjacent-territory targeting
- an operation forecast and committed force size
- persistent multi-day operation progress
- daily casualty and armour-damage resolution
- captured territory occupation states
- supply and escalation updates
- resistance disruption events
- functional and damaged armour totals
- victory and defeat conditions
- a command event log
- save, load and new-campaign controls

## Current simplifications

The checkpoint intentionally uses one aggregate future field force. The next implementation pass will replace it with selectable task-group pieces and independent contemporary formations.

Enemy behaviour currently holds territory and resolves defence. It does not yet launch counter-operations. Occupation uses the restrained baseline and has no player policy selector yet.

The browser save is a single local slot. Versioned saves and migration handling will be added after the engine state stabilises.

## Next implementation pass

The next pass should add:

- selectable future task groups on the map
- formation movement separate from attack orders
- independent modern brigades after occupation integration
- enemy counter-attacks and reinforcement choices
- route-aware retreat
- explicit occupation-policy decisions
- clearer battle forecast ranges
- deterministic engine tests

## Deployment

The repository includes a GitHub Actions workflow that builds and deploys the
slice to GitHub Pages on pushes to the vertical-slice branch and `main`. This
allows review from a stable browser URL before the slice is merged.
