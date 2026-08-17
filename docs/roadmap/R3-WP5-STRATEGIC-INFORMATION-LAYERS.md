# R3-WP5 - Strategic Information Layers

Status: **ACTIVE / IMPLEMENTATION COMPLETE / VALIDATION IN PROGRESS**

Entry baseline: accepted `main` at `01bd5a3e5102cac7f72d9f6ef3db898348ea34f3`, after R3-WP4 was accepted and merged on 2026-08-17.

Implementation branch: `agent/r3-wp5-strategic-information-layers`

Draft PR: **#172 - R3-WP5: Strategic Information Layers**

## Objective

Make the terrain command map the primary strategic information surface without creating a second source of game truth. WP5 derives strategic overlays from authoritative campaign state and player-visible intelligence, while retaining the accepted R3 physical map, formations, landmarks, routes, fronts and battle feedback.

## Information-integrity rules

1. Strategic overlays are presentation-only and never alter campaign state.
2. Overlay selection is retained only in browser presentation preferences, not in campaign saves.
3. Friendly strength, readiness and quality derive from current friendly task-group state.
4. Enemy threat uses the existing `getEnemyContacts` player-visible assessment path. Raw hidden enemy formation strength is not exposed.
5. Supply and network-flow presentation derives from current logistics allocations, route flows and bottlenecks.
6. Resource potential uses the established territory campaign-resource profiles.
7. Current stockpile values are shown only for player-controlled territory. Enemy-held local stockpiles remain hidden.
8. Occupation presentation derives from current resistance and friendly garrison coverage.
9. No save-schema, simulation, balance, geography, pathfinding or combat-authority changes are permitted in WP5.

## Implemented strategic views

### Political control

Provides a restrained territory wash for current player/enemy control while keeping physical terrain and administrative structure visible beneath it.

### Friendly strength

Shows personnel remaining as a share of authorised formation strength, aggregated by current territory. Territories without friendly formations remain clear.

### Friendly readiness

Shows a personnel-weighted combination of current morale and carried supply for friendly formations.

### Assessed enemy threat

Shows the upper bound of current player-visible enemy contact estimates. Opacity follows intelligence confidence so confirmed, estimated and stale contacts do not read as equally certain.

### Supply and network flow

Shows current player territory delivery ratio together with strategic-route utilisation and flow condition. Strained and overloaded network links become more prominent.

### Route condition

Shows current route condition and route status, including damaged, blocked and destroyed links. Current logistics bottlenecks receive stronger emphasis.

### Resource potential

Provides selectable territory potential for:

- Food
- Industry
- Energy
- Transport
- Medical
- Military Stores

Known logistics hubs remain visible as strategic network cues.

### Local stockpiles

Provides selectable current friendly-held local stock levels for the same six campaign-resource categories. Enemy-held stockpile values are masked.

### Occupation and garrison pressure

Shows controlled territory by current resistance, with stronger visual pressure where garrison coverage is absent or thin.

### Force quality

Shows a personnel-weighted friendly formation quality view derived from morale and functional-armour availability.

## Interaction and presentation

The primary MapLibre terrain renderer now exposes a compact `Strategic view` selector. Resource and stockpile views reveal a second `Resource` selector only when required.

The selected view and resource category are stored in `localStorage` under a WP5-specific presentation key. This preference is not part of `GameState` and is not included in campaign persistence.

The retained SVG fallback remains available and functional. WP5's richer strategic heat layers are a primary-terrain enhancement rather than a new simulation dependency.

## Architecture

WP5 extends the accepted R3 terrain presentation through three isolated responsibilities:

- `r3-terrain-overlay.ts` retains its established renderer-neutral political/network projection contract and carries authoritative route-flow properties already available from logistics state;
- `r3-strategic-information-layers.ts` enriches projected GeoJSON with presentation metrics, applies MapLibre strategic layers and defines legends/options;
- `TerrainMapPrototype.tsx` owns browser-only strategic-view preferences and synchronises enriched data into the existing terrain sources.

This split deliberately preserves earlier WP2 terrain adapter tests that execute the projection adapter in isolation.

## Validation gates

Before WP5 can be accepted:

- focused WP5 strategic-layer contracts pass;
- full repository regression suite passes;
- production TypeScript/Vite build passes;
- existing terrain performance contracts pass;
- dedicated exact-head Chromium proof confirms the real production map can switch between the strategic views;
- friendly strength/readiness/quality remain linked to friendly state;
- assessed threat uses player-visible intelligence only;
- supply and route views expose current logistics flow/condition without changing logistics state;
- resource potential and current friendly stockpile categories are selectable;
- enemy-held stockpile values remain hidden;
- occupation view reflects resistance and garrison pressure;
- logistics hubs remain legible where relevant;
- strategic-view preference remains presentation-only;
- existing physical terrain, formations, labels, cities, battle feedback and interactions remain usable;
- no save-schema, geography, simulation, balance, combat or intelligence-authority change occurs;
- product-owner deployed visual acceptance is explicitly recorded.

## Current validation state

- Focused legacy terrain regressions: **PASS** (124/124 on the first corrected WP5 head).
- Production TypeScript/Vite build: **PASS** after resolving MapLibre/native `Map` type ambiguity and strict paint-expression typing.
- Latest focused terrain smoke/build/budget gate: **PASS**.
- Dedicated WP5 exact-head browser workflow: **RUNNING / PENDING RESULT**.
- Several older generic WP2 browser probes remain known to carry pre-WP3.9 Campaign-default assumptions and are not treated as WP5-specific evidence; the dedicated WP5 gate follows the accepted WP4 validation pattern instead.
- Product-owner visual acceptance: **PENDING**.

WP5 must remain unmerged and unaccepted until its dedicated evidence is green and the resulting deployed presentation has been reviewed.
