# Phase VIII-D — Operational Clarity and Onboarding

Phase VIII-D makes the campaign's existing combat and logistics systems visible enough for players to understand, anticipate and respond to them.

## Design goals

- Show enemy presence and attack preparation without granting perfect information.
- Make threatened territories and active combat obvious on the campaign map.
- Turn supply percentages into actionable warnings rather than passive statistics.
- Warn before a player resolves a day with correctable critical logistics failures.
- Provide a skippable, restartable tutorial that teaches the current game through real actions.

## D1 — Battlefield intelligence

Enemy map markers use intelligence confidence rather than perfect information:

- **Confirmed** — recent high-confidence observation with formation identity and approximate strength.
- **Estimated** — probable formation presence with a strength range.
- **Activity** — unidentified enemy movement or concentration.
- **Stale** — a previously observed position that may no longer be accurate.

Planned counterattacks, active combat and likely enemy concentration receive distinct map indicators. Selecting a warning focuses the relevant territory and exposes nearby friendly formations, expected timing and available reinforcement routes.

## D2 — Supply clarity

The top-level logistics indicators use normal, warning, danger and critical states with trend information. A diagnostics panel explains the immediate causes of network degradation, including:

- disconnected territories;
- starved formations;
- blocked or destroyed routes;
- bottlenecked corridors;
- enemy interdiction;
- inadequate source capacity.

The supply overlay distinguishes healthy, stressed, bottlenecked and broken routes. Resolving a day with a severe but potentially correctable logistics problem requires explicit acknowledgement.

## D3 — Guided campaign tutorial

The tutorial is an optional campaign layer rather than a separate hard-coded scenario. It is available when starting a campaign and can be restarted or skipped.

The guided sequence covers:

1. Selecting and inspecting a formation.
2. Beginning the first operation against an adjacent enemy territory.
3. Resolving the offensive and securing captured territory with a garrison.
4. Reinforcing the captured position with a movement order.
5. Opening Logistics and identifying a supply route or bottleneck.
6. Responding to enemy activity or a threatened territory.
7. Opening Engineering or Infrastructure when a route is damaged.
8. Continuing independently.

Tutorial prompts are short, context-sensitive and highlight the relevant interface region. Progress is saved with the campaign.

## Persistence

Campaign saves advance to version 14. Version 13 and all earlier supported saves migrate with tutorial disabled and a normalised operational-awareness state.

## Validation

The completed implementation passes all 167 engine, persistence and interface tests. Focused coverage verifies intelligence confidence, counterattack indicators, supply severity and causes, end-turn acknowledgement, tutorial progression and version 13 migration. TypeScript compilation and the production Vite build also pass.