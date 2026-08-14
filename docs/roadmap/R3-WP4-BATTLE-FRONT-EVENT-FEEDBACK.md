# R3-WP4 - Battle, Front & Strategic Event Feedback

Status: APPROVED / ACTIVE

Entry baseline: `main` at `63a1b3e967601ab762bdc9d4e30fad3674290fbe` after R3-WP3 merged as PR #136 and the post-merge GitHub Pages deployment completed successfully on 2026-08-14.

## Objective

Make combat and major strategic state changes visibly legible on the accepted MapLibre/Copernicus campaign map without turning Future Conquest into a tactical battle renderer and without moving any authority out of the deterministic simulation.

WP3 established physical friendly formation pieces, movement interpolation and movement-route cues. WP4 must make **combat read differently from movement** and give the player concise map-level acknowledgement of important battle outcomes and front changes.

The detailed after-action report remains the authoritative explanation of combat. WP4 supplies orientation and feedback, not a second combat log.

## Authoritative state already available

WP4 should derive presentation from existing state rather than adding a new gameplay/event authority.

### Active player operations

`GameState.operations` already exposes:

- operation ID;
- target territory;
- participant task-group IDs;
- each participant's authoritative origin territory;
- progress and duration;
- enemy formation IDs/power;
- an optional combat ledger once combat is active.

This is sufficient to derive player attack direction from each committed formation origin towards the operation target without changing orders, geography or resolution.

### Completed combat

`GameState.combatReports` already exposes typed concluded battles with:

- battle turn and start turn;
- `offensive` or `counterattack` kind;
- `victory`, `withdrawal`, `repelled` or `territory-lost` outcome;
- affected territory;
- duration;
- friendly participants and assessed losses;
- enemy loss assessments;
- the authoritative AAR note.

WP4 may use recent reports to acknowledge a concluded event on the map, but it must not duplicate detailed casualty/intelligence content already owned by the AAR surface.

### Territory control history

`TerritoryState.capturedTurn` supplies a durable authoritative indication that a territory changed into player control on a specific turn. Current controller/occupation state remains authoritative for the political overlay.

### Enemy counteroffensive information

Enemy orders and strategy contain richer internal intent than the player is necessarily allowed to know. WP4 MUST NOT render raw `enemyOrders`, exact enemy origins, exact formation strength or other hidden planning simply because it exists in `GameState`.

Enemy attack/counterattack feedback may only be derived from information already exposed through existing player-visible operational/intelligence adapters, an active combat state the player is already experiencing, or a concluded combat report.

## Product principles

1. **Movement and combat must be visually different.** WP3 movement remains the restrained teal route/path language. Combat uses a distinct warm/high-threat directional language.
2. **Strategic scale, not tactical spectacle.** A player should understand where an attack is going and what just changed; they should not watch shells, squads or battlefield choreography.
3. **Presentation never gates simulation.** Effects may begin, update or disappear after state changes, but the deterministic turn engine never waits for them.
4. **Derived, transient state by default.** Do not add battle-animation state to campaign saves. Reconstruct cues from authoritative current/recent state.
5. **No hidden-information leaks.** Renderer convenience never bypasses intelligence rules.
6. **Geography remains MapLibre-owned.** WGS84 positions, territory centres, routes and camera state are unchanged. Screen-space offsets/effects are presentation only.
7. **After-action reports remain authoritative.** Map cues do not become an alternative detailed battle report.
8. **Readability beats quantity.** A small number of high-value cues is preferable to showing every event simultaneously.
9. **Reduced motion is first-class.** Every animated cue has a static/instant equivalent.
10. **WP2/WP3 contracts remain hard gates.** Terrain performance, marker collision, camera behaviour, accessibility and deterministic balance may not regress.

## Scope

### WP4.1 - Renderer-neutral strategic combat cue model

Create presentation-only DTOs/selectors that derive the minimum information needed by renderers.

Initial cue types should be deliberately small:

- `active-attack` - player operation currently resolving, with authoritative source formation/origin and target;
- `recent-victory` - recent concluded offensive victory;
- `recent-withdrawal` - recent concluded offensive withdrawal;
- `recent-counterattack-repelled` - concluded visible counterattack that was repelled;
- `recent-territory-lost` - concluded visible counterattack that changed control;
- `recent-capture` - recent player territory capture when useful independently of the report cue.

DTOs should contain stable presentation identity, cue kind, turn/age, involved visible territory IDs and only the minimum public metadata needed to style the cue.

Do not copy full combat reports into a renderer DTO.

### WP4.2 - Active combat direction over terrain

Add a terrain overlay that makes an active attack unmistakably different from a WP3 movement path.

Preferred first implementation:

- MapLibre remains the geographic/camera owner;
- use a lightweight SVG/DOM overlay, analogous to the accepted WP3 movement-route overlay, unless measured evidence justifies a custom 3D layer;
- project authoritative formation/origin and target geography through `map.project`;
- warm/orange-red directional line/chevron/arrow language;
- active combat target receives a restrained emphasis cue;
- selected/active operation may be more prominent than secondary simultaneous operations;
- hide/suspend expensive overlay rebuilding while the camera is travelling and update on settled camera frames;
- no per-frame DOM reconstruction when nothing has changed.

An attack cue must remain understandable at Theatre, Campaign and Selected LODs, but may simplify at Theatre scale.

### WP4.3 - Recent outcome and front-change acknowledgement

Give concluded combat a short-lived strategic acknowledgement derived from current state/history.

Candidate language:

- victory/capture: brief territory-border or centre pulse/wash, then settle into the normal political overlay;
- withdrawal/repelled: concise retreat/failed-assault glyph or fading ring at the affected territory;
- territory lost: high-priority loss acknowledgement before normal enemy-control styling becomes the persistent truth;
- front shift: temporarily emphasise only the affected derived opposing-control front segments.

The cue lifetime should be turn-relative and deterministic, not wall-clock state saved into the campaign. For example, a report from the current or immediately previous turn may qualify as recent; exact lifetime should be codified in one presentation selector and covered by tests.

Do not infer a historical front line that the game does not store. Only highlight front segments derivable from current control plus an authoritative recent affected territory.

### WP4.4 - Formation-local strategic event feedback

Where existing authoritative state makes the event unambiguous, add restrained formation-level feedback for:

- retreat/withdrawal;
- regroup/recovery;
- reinforcement/return-to-duty acknowledgement;
- isolation or critical supply disruption.

This is secondary to active combat direction and recent battle outcomes. Do not manufacture events from generic status labels if the simulation cannot prove that a transition occurred.

Critical supply feedback must use player-visible logistics state already available to the command surface. It must not expose hidden enemy logistics.

## Explicit non-goals

WP4 does NOT include:

- new combat mechanics, modifiers, balance or AI;
- changing operation resolution timing;
- tactical unit animation or projectile simulation;
- explosions/fire/smoke simply for spectacle;
- persistent visual-event history in the save schema;
- exact hidden enemy positions, orders or strength;
- replacing after-action reports;
- a general particle/effects engine unless a measured requirement emerges;
- Three.js merely because it is available;
- the broader strategic-information-layer work reserved for WP5;
- the command-panel redesign reserved for WP6;
- music or sound effects reserved for WP7.

## Presentation architecture

### Derived cue layer

Create a small renderer-neutral module, tentatively `src/presentation/r3-strategic-event-cues.ts`, that:

- accepts only authoritative `GameState` plus existing safe/public adapters where needed;
- produces deterministic, sorted cue descriptors;
- owns recent-turn eligibility and cue priority;
- contains no DOM, MapLibre or React mutation;
- writes nothing back to `GameState`;
- does not persist its own state.

### Terrain renderer

Create a terrain-specific overlay module, tentatively `src/presentation/r3-battle-event-overlay.ts`, that:

- consumes the renderer-neutral descriptors;
- projects positions through the existing MapLibre map;
- reuses stable overlay nodes keyed by cue identity where practical;
- is hidden or cheap during camera movement;
- schedules/coalesces settled redraws rather than doing expensive synchronous work in input handlers;
- is removed cleanly with the terrain renderer;
- remains behind interactive formation/territory controls and never steals pointer events.

### SVG fallback

The stable SVG/DOM map remains functional even if the first WP4 increment only adds the richer terrain overlay. Any strategically essential cue must still have an existing textual/panel/AAR route or a minimal fallback representation before WP4 completes.

## Visual language

### Existing movement language

WP3 movement remains:

- cool teal/cyan;
- dashed route cue;
- movement target marker;
- non-combat piece movement.

### Combat language

WP4 combat should be:

- warm amber/orange/red family;
- directional and immediately distinguishable from movement;
- visually stronger while active but not large enough to obscure territory labels, formation pieces or the persistent terrain HUD;
- restrained at Theatre scale;
- more detailed at Campaign/Selected scale.

Avoid continuous flashing. A subtle static arrow plus limited pulse on the target is preferable to constant animation.

### Outcome language

Outcome cues should be short and semantically consistent:

- success/capture: positive but military, not celebratory UI confetti;
- failed/withdrawn attack: muted retreat/fade language;
- territory lost: clear danger/loss cue;
- counterattack repelled: defensive success distinct from offensive capture.

## Reduced motion and accessibility

When `prefers-reduced-motion: reduce` is active:

- no travelling dash/arrow animation;
- no pulsing scale or repeated opacity animation;
- render the final static direction/outcome state immediately;
- all meaning must remain available through colour + shape/text/ARIA/context, not animation alone.

New interactive controls are not required for the first increment. Overlay graphics must remain `pointer-events: none` and `aria-hidden` unless they deliberately become accessible controls later.

## Performance constraints

WP4 must preserve the accepted WP2E terrain budgets and WP2F/WP2I marker behaviour.

Requirements:

- no game-state polling loop;
- no full overlay DOM rebuild on every MapLibre `move` frame;
- no expensive blur/filter effects that regress software/headless or ordinary browser camera performance;
- camera movement may temporarily hide/simplify battle overlays;
- redraw on state change and coalesced settled camera/resize events;
- bounded number of recent outcome cues;
- no new network requests or terrain assets for WP4.1/WP4.2.

## Intelligence and information-boundary rules

A cue is renderable only if the player is already entitled to know the underlying event.

Safe initial sources:

- player's own task groups/orders;
- active player operations;
- current political control/occupation;
- player-visible threat/contact adapters already used by the terrain map;
- concluded combat reports, whose enemy figures are already treated as battlefield estimates;
- player-visible logistics allocations/conditions.

Unsafe direct sources unless passed through an existing visibility adapter:

- raw enemy formation positions not currently observed;
- planned enemy orders;
- exact enemy strength;
- internal strategy focus/intent;
- hidden route threats.

Tests must explicitly protect this boundary.

## Delivery sequence

### Increment A - Active attack direction

1. Add renderer-neutral `active-attack` cue derivation from existing operations and participant origins.
2. Add terrain overlay with warm directional attack cues.
3. Make movement and attack visually distinct.
4. Support Theatre/Campaign/Selected and reduced motion.
5. Add unit + browser regression coverage.

This is the first implementation increment and should be merged only if it is complete and stable on its own.

### Increment B - Recent battle outcomes

1. Derive bounded recent outcome cues from combat reports/captured turn.
2. Add concise target/front acknowledgement.
3. Prove expiry/priority determinism and no save mutation.
4. Retain AAR as detailed authority.

### Increment C - Strategic event polish

1. Add only those retreat/recovery/reinforcement/supply cues supported unambiguously by existing state.
2. Audit simultaneous-event density and LOD.
3. Integrate fallback/accessibility behaviour.
4. Run full visual/UX acceptance.

The work may stay in a single WP4 PR if increments remain reviewable and the branch stays stable; otherwise split follow-ups must remain explicitly stacked/superseding and never bypass the full exact-head gates.

## Permanent regression requirements

WP4 must add focused tests covering at minimum:

- active attack cue source/target identity from authoritative operation origins;
- deterministic cue ordering;
- no mutation of game state;
- no raw hidden enemy-order/formation dependency;
- movement and attack use distinct presentation classes/language;
- reduced-motion static behaviour;
- overlay lifecycle and camera-movement throttling/coalescing;
- terrain overlay never captures pointer events;
- recent event eligibility/expiry once Increment B lands.

A browser runtime gate should prove representative active combat at Theatre, Campaign and Selected views without HUD/canvas escape or loss of selected formation/territory context.

## Required exact-head gate before merge

WP4 may merge only when the exact PR head is green for:

- WP4 focused unit/browser gate;
- full repository tests/build;
- R3 WP2B terrain smoke;
- R3 WP2B browser runtime;
- R3 WP2C overlay parity;
- R3 WP2D visual runtime;
- R3 WP2E exact-head performance;
- R3 WP2F visual runtime;
- R3 WP2I camera regression;
- R3 WP3 formation movement gate;
- deterministic current-engine balance simulation.

Any failure must be diagnosed rather than bypassed. A flaky evidence-only capture may be made non-gating only when the actual runtime assertions remain authoritative and green.

## Acceptance criteria

WP4 is accepted when:

1. A player can immediately distinguish a formation moving from a formation attacking.
2. Active player attacks clearly communicate direction and target on the terrain map.
3. Multiple active operations remain readable without masking protected map labels, pieces or HUD surfaces.
4. Recent victory/withdrawal/counterattack/loss feedback is concise and derived from authoritative current/recent state.
5. No cue exposes enemy information beyond existing intelligence permissions.
6. Effects do not delay turn resolution or mutate game state.
7. Reduced-motion users receive equivalent static information.
8. After-action reports remain the authoritative detailed combat explanation.
9. Existing terrain performance, marker collision, camera, SVG fallback and accessibility contracts remain intact.
10. Exact-head CI, deterministic balance and deployed-main verification are green before product-owner live review.

## Product-owner live review focus

Human review should answer:

- Does an attack now read immediately differently from ordinary movement?
- Can the direction and target of active combat be understood without opening a panel?
- Do captures/losses/front changes feel acknowledged without visual clutter?
- Does battle feedback feel like a grand-strategy command table rather than tactical spectacle?
- Are pieces, labels, fronts and political control still easier to read than the effects themselves?
- Is reduced-motion behaviour complete rather than merely disabled?

Small visual findings should be fixed inside WP4 where possible. A broader art-direction change requires explicit product-owner approval.