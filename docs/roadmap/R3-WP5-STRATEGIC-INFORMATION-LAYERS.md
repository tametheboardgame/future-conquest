# R3-WP5 - Strategic Information Layers

Status: **ACCEPTED / MERGE AUTHORISED**

Entry baseline: accepted `main` at `01bd5a3e5102cac7f72d9f6ef3db898348ea34f3`, after R3-WP4 was accepted and merged on 2026-08-17.

Implementation branch: `agent/r3-wp5-strategic-information-layers`

PR: **#172 - R3-WP5: Strategic Information Layers**

Validated implementation head: `d544e2542a36847ad8cc7431fa103661f95157fb`

Product-owner merge authorisation: **RECORDED 2026-08-17**

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
9. No save-schema, simulation, balance, geography, pathfinding or combat-authority changes are introduced by WP5.

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

The primary MapLibre terrain renderer exposes a compact `Strategic view` selector. Resource and stockpile views reveal a second `Resource` selector only when required.

The selected view and resource category are stored in `localStorage` under a WP5-specific presentation key. This preference is not part of `GameState` and is not included in campaign persistence.

The retained SVG fallback remains available and functional. WP5's richer strategic heat layers are a primary-terrain enhancement rather than a new simulation dependency.

## Architecture

WP5 extends the accepted R3 terrain presentation through three isolated responsibilities:

- `r3-terrain-overlay.ts` retains its established renderer-neutral political/network projection contract and carries authoritative route-flow properties already available from logistics state;
- `r3-strategic-information-layers.ts` enriches projected GeoJSON with presentation metrics, applies MapLibre strategic layers and defines legends/options;
- `TerrainMapPrototype.tsx` owns browser-only strategic-view preferences and synchronises enriched data into the existing terrain sources.

This split deliberately preserves earlier WP2 terrain adapter tests that execute the projection adapter in isolation.

## Validation result

All dedicated WP5 acceptance gates passed on implementation head `d544e2542a36847ad8cc7431fa103661f95157fb`:

- focused WP5 strategic-layer contracts: **PASS**;
- full repository regression suite: **PASS**;
- production TypeScript/Vite build: **PASS**;
- terrain performance contracts: **PASS**;
- dedicated exact-head Chromium production-source/UI proof: **PASS**;
- friendly strength/readiness/quality remain linked to friendly state: **PASS**;
- assessed threat uses player-visible intelligence only: **PASS**;
- supply and route sources load from authoritative logistics state: **PASS**;
- resource potential and friendly stockpile categories are selectable: **PASS**;
- enemy-held stockpile leakage: **0**;
- occupation view reflects resistance and garrison pressure: **PASS**;
- strategic-view preference remains presentation-only: **PASS**;
- no save-schema, geography, simulation, balance, combat or intelligence-authority change: **PASS**.

Production browser evidence confirmed 65 territory features carrying readiness, quality, assessed-threat, supply, occupation and resource fields, with friendly stocks visible and no enemy stockpile leakage. Strategic route and node sources loaded successfully, and all ten strategic view selections plus resource switching completed successfully.

Headless software WebGL retains the already accepted R3/WP4 behaviour where `map.loaded()` or `styleLoaded()` can remain unsettled even after campaign sources have loaded. This is not treated as a WP5 regression.

## Acceptance

Automated acceptance evidence is green. The product owner explicitly authorised PR #172 to be merged on 2026-08-17. Because the repository deploys GitHub Pages only from `main`, there is no PR-branch live preview; live visual review therefore follows the authorised merge rather than blocking it.

WP5 is accepted for merge into `main`.