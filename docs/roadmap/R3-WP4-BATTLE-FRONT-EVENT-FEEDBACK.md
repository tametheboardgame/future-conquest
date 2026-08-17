# R3-WP4 - Battle, Front & Strategic Event Feedback

Status: **ACCEPTED / COMPLETE / MERGED**

Entry baseline: accepted `main` at `2db58cdaf3c5ea533bb1ea60910083688913f354` after the R3-WP3.9 integrated exit review was accepted and merged on 2026-08-17.

Completion merge: PR #171, squash merge `be3c25c58d5457b53fdcd4cf67685efc94e731e8`, accepted by the product owner on 2026-08-17 after review of the retained active-attack and post-victory/capture evidence.

Historical PR #137 remains closed/unmerged reference material only. WP4 was rebuilt cleanly on the accepted post-WP3.9 physical-map baseline.

## Objective

Make attacks, counterattacks, captures, retreats and major strategic changes visible on the command map without turning Future Conquest into a tactical battle renderer and without moving any authority out of the deterministic simulation.

WP3/WP3.5-WP3.9 established the accepted physical map, future-soldier miniatures, authored city miniatures, end-of-day movement, map-default command UX, physical terrain colour and campaign-arrival presentation. WP4 makes **combat read differently from movement** while preserving that accepted architecture.

The after-action report remains the authoritative detailed explanation of combat. WP4 provides orientation and acknowledgement only.

## Authoritative state

WP4 derives presentation from existing game state rather than adding a second event system.

### Active player operations

`GameState.operations` exposes operation ID, target territory, participant task-group IDs, each participant's authoritative origin, progress/duration and combat state. Player attack direction is derived from committed origin to target without changing orders or positions.

### Completed combat

`GameState.combatReports` exposes concluded offensive/counterattack battles, outcome, territory, turn, duration, player losses, assessed enemy losses and the authoritative AAR note.

Renderer DTOs use only the minimum public metadata needed for map feedback. Full reports do not belong in renderer state.

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

## Completed work

### WP4.1 - Renderer-neutral strategic event cue model

Status: **COMPLETE / ACCEPTED**

Cue vocabulary:

- `active-attack`
- `recent-victory`
- `recent-withdrawal`
- `recent-counterattack-repelled`
- `recent-territory-lost`
- `recent-capture`

The selector is deterministic, sorted, presentation-only and reads no raw hidden enemy planning data.

Recent outcome lifetime is turn-relative, currently the current or immediately previous turn. This remains deterministic across load/replay and requires no wall-clock/save state.

### WP4.2 - Active combat direction over terrain

Status: **COMPLETE / ACCEPTED**

The terrain renderer receives a lightweight non-interactive SVG layer projected through `map.project` from authoritative operation origin to target.

Presentation:

- warm orange/red attack direction line;
- clear target chevron;
- restrained target ring;
- Theatre/Campaign/Selected scaling;
- hidden while the camera is travelling, with coalesced redraw on settled frames;
- Operations layer toggle controls visibility;
- no pointer interception and no map/formation position mutation.

### WP4.3 - Recent battle outcome acknowledgement

Status: **COMPLETE / ACCEPTED**

Current/previous-turn concluded outcomes receive concise territory-centred rings/glyphs:

- victory/capture: gold acknowledgement;
- withdrawal: amber withdrawal mark;
- repelled counterattack: warm repelled mark;
- territory lost: red loss mark.

A capture already represented by a same-turn offensive victory is deduplicated.

These cues expire from derived presentation automatically as turns advance.

### WP4.4 - Front-shift emphasis

Status: **COMPLETE / ACCEPTED**

Recent outcomes temporarily emphasise only the **current** derived opposing-control front segments connected to the affected territory.

The implementation reuses `deriveR3FrontSegments(state.territories, TERRITORIES)` and the same centre-to-centre/perpendicular geometry policy as the accepted terrain front rendering. It does not store or invent previous-front geometry.

The emphasis colour follows the authoritative recent outcome, for example gold after a capture/victory and red after territory loss, while remaining subordinate to labels, miniatures and the base front line.

### WP4.5 - Formation-local strategic feedback audit

Status: **COMPLETE / ACCEPTED / NO NEW TRANSIENT EFFECT REQUIRED**

The current engine exposes formation **current state** such as `recovering` and current logistics condition, but it does not retain a general renderer-safe temporal record saying that a specific formation has just entered or left recovery, just returned to duty, or just crossed a supply-state boundary.

Creating a one-turn formation animation from those current labels would manufacture a transition the authoritative state does not prove. WP4 therefore does not add such an effect. Existing formation marker status, logistics presentation and combat AARs remain authoritative for those conditions.

This is a deliberate information-integrity decision, not an omitted implementation. A future package may add richer formation-local transitions if the simulation later records them explicitly.

## Validation result

Dedicated WP4 validation was green on exact PR head `b3b86f6a795911e8582f9614de457ef55532e49c` before merge.

- Focused cue derivation and presentation contracts: PASS.
- Exact-head browser battle feedback proof: PASS.
- Full repository regression suite: PASS.
- Production build: PASS.
- Terrain performance source contracts: PASS.
- Current balance/determinism simulation: PASS.
- Active attack direction visibly distinct from movement routes: PASS.
- Operations layer toggle: PASS.
- Browser proof confirmed the active attack cue disappeared after authoritative battle resolution and was replaced by recent victory/capture feedback plus affected current-front emphasis.
- No save-schema, geography, operation, combat, logistics, balance or intelligence-authority change was introduced.
- Product-owner visual acceptance: PASS on 2026-08-17.

Retained browser evidence artifact: `r3-wp4-battle-feedback-b3b86f6a795911e8582f9614de457ef55532e49c`.

Three older terrain workflows were red on the PR but were investigated and were not WP4 regressions: WP2C and WP2I retained stale pre-WP3.9 Campaign-default assumptions, while WP2E failed during accepted-base software-WebGL settlement before measuring the WP4 head.

## Explicit non-goals

WP4 does not include:

- combat mechanics, modifiers, balance or AI changes;
- operation timing changes;
- tactical unit animation/projectiles;
- explosions, fire or smoke merely for spectacle;
- persistent visual-event history in saves;
- exact hidden enemy positions/orders/strength;
- replacing after-action reports;
- a general particle engine;
- manufactured formation transition animations without authoritative temporal state;
- WP5 strategic information layers;
- WP6 command-panel redesign;
- WP7 audio/music.

## Completion record

- Implementation branch: `agent/r3-wp4-battle-front-event-feedback-v2`.
- Pull request: #171, `R3-WP4: battle, front and strategic event feedback`.
- Validated head: `b3b86f6a795911e8582f9614de457ef55532e49c`.
- Merge commit: `be3c25c58d5457b53fdcd4cf67685efc94e731e8`.
- Product-owner acceptance: 2026-08-17.
- Final state: **ACCEPTED / COMPLETE / MERGED**.
