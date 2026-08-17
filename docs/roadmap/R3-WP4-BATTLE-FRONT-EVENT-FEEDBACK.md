# R3-WP4 - Battle, Front & Strategic Event Feedback

Status: **ACTIVE / IMPLEMENTATION IN PROGRESS**

Entry baseline: accepted `main` at `2db58cdaf3c5ea533bb1ea60910083688913f354` after the R3-WP3.9 integrated exit review was accepted and merged on 2026-08-17.

Historical PR #137 remains closed/unmerged reference material only. This package is a fresh implementation on the accepted physical-map baseline.

## Objective

Make attacks, counterattacks, captures, retreats and major strategic changes visible on the command map without turning Future Conquest into a tactical battle renderer and without moving any authority out of the deterministic simulation.

WP3/WP3.5-WP3.9 established the accepted physical map, future-soldier miniatures, authored city miniatures, end-of-day movement, map-default command UX, physical terrain colour and campaign-arrival presentation. WP4 must make **combat read differently from movement** while preserving that accepted architecture.

The after-action report remains the authoritative detailed explanation of combat. WP4 provides orientation and acknowledgement only.

## Authoritative state already available

WP4 derives presentation from existing game state rather than adding a second event system.

### Active player operations

`GameState.operations` already exposes operation ID, target territory, participant task-group IDs, each participant's authoritative origin, progress/duration and combat state. Player attack direction can therefore be derived from committed origin to target without changing orders or positions.

### Completed combat

`GameState.combatReports` already exposes concluded offensive/counterattack battles, outcome, territory, turn, duration, player losses, assessed enemy losses and the authoritative AAR note.

Renderer DTOs must use only the minimum public metadata needed for map feedback. Full reports do not belong in renderer state.

### Territory capture history

`TerritoryState.capturedTurn` provides a durable authoritative indication that a territory entered player control on a specific turn.

### Hidden enemy information

Raw `enemyOrders`, exact hidden formation data and internal enemy strategy are not renderer inputs for WP4. Enemy/counterattack feedback may only come from information already visible to the player or from concluded combat reports.

## Product principles

1. Movement and combat must read differently. WP3 movement keeps its restrained teal dashed-route language; combat uses warm/high-threat directional language.
2. Strategic scale, not tactical spectacle. The player should understand where a battle is happening and what changed, not watch projectile or squad choreography.
3. Presentation never gates simulation or turn resolution.
4. Event visuals are derived/transient and are not persisted in campaign saves.
5. No hidden-information leakage.
6. MapLibre remains geographic/camera authority; terrain and authoritative WGS84 anchors do not move.
7. After-action reports remain authoritative for detail.
8. Readability beats quantity.
9. Reduced-motion users retain the same strategic meaning through static cues.
10. WP2/WP3/WP3.9 performance, geography, save/load, fallback and balance guarantees remain hard gates.

## Work sequence

### WP4.1 - Renderer-neutral strategic event cue model

Status: **IMPLEMENTED ON ACTIVE BRANCH**

Initial cue vocabulary:

- `active-attack`
- `recent-victory`
- `recent-withdrawal`
- `recent-counterattack-repelled`
- `recent-territory-lost`
- `recent-capture`

The selector is deterministic, sorted, presentation-only and reads no raw hidden enemy planning data.

Recent outcome lifetime is turn-relative, currently the current or immediately previous turn. This remains deterministic across load/replay and requires no wall-clock/save state.

### WP4.2 - Active combat direction over terrain

Status: **IMPLEMENTED ON ACTIVE BRANCH / VALIDATION PENDING**

The terrain renderer receives a lightweight non-interactive SVG layer projected through `map.project` from authoritative operation origin to target.

Initial presentation:

- warm orange/red attack direction line;
- clear target chevron;
- restrained target ring;
- Theatre/Campaign/Selected scaling;
- hidden while the camera is travelling, coalesced redraw on settled frames;
- Operations layer toggle controls visibility;
- no pointer interception and no map/formation position mutation.

### WP4.3 - Recent battle outcome acknowledgement

Status: **IMPLEMENTED ON ACTIVE BRANCH / VALIDATION PENDING**

Current/previous-turn concluded outcomes receive concise territory-centred rings/glyphs:

- victory/capture: gold acknowledgement;
- withdrawal: amber withdrawal mark;
- repelled counterattack: warm repelled mark;
- territory lost: red loss mark.

A capture already represented by a same-turn offensive victory is deduplicated.

These cues expire from derived presentation automatically as turns advance.

### WP4.4 - Front-shift emphasis

Status: **QUEUED**

Temporarily emphasise only current derived opposing-control front segments connected to an authoritative recent affected territory. Do not create a historical front-state model the simulation does not store.

### WP4.5 - Formation-local strategic feedback

Status: **QUEUED / EVIDENCE-DRIVEN**

Where authoritative state proves the transition, add restrained feedback for retreat/recovery, reinforcement/return-to-duty and friendly isolation/critical supply disruption. Do not manufacture transitions from generic status labels and do not expose enemy logistics.

## Explicit non-goals

WP4 does not include:

- combat mechanics, modifiers, balance or AI changes;
- operation timing changes;
- tactical unit animation/projectiles;
- explosions, fire or smoke merely for spectacle;
- persistent visual-event history in saves;
- exact hidden enemy positions/orders/strength;
- replacing after-action reports;
- a general particle engine unless later evidence justifies one;
- WP5 strategic information layers;
- WP6 command-panel redesign;
- WP7 audio/music.

## Validation gates

Before WP4 can be accepted:

- focused cue derivation and presentation contracts pass;
- full repository regression suite passes;
- production build passes;
- current balance/determinism simulation passes;
- active attack direction is visibly distinct from movement routes;
- recent victory/withdrawal/repelled/lost/capture cues are legible without becoming visually dominant;
- multiple simultaneous operations remain readable;
- labels, physical miniatures, authored cities, borders, fronts and routes retain hierarchy;
- terrain performance remains within the established practical envelope;
- Operations layer toggle, reduced motion and compact layouts remain safe;
- `?terrain=0` fallback remains fully usable even if richer WP4 terrain effects are absent there;
- no save-schema, geography, operation, combat, logistics or intelligence-authority change occurs;
- product-owner deployed visual acceptance is explicitly recorded.

## Current implementation branch

`agent/r3-wp4-battle-front-event-feedback-v2`

This branch deliberately ports only architecture that remains valid from historical PR #137 and rebuilds it against the accepted post-WP3.9 physical-map system.
