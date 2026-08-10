# Future Conquest R3 Roadmap

Status: APPROVED / ACTIVE PROGRAMME

R3 is the Visualisation & Command Experience release. Its purpose is to transform the current mechanically stabilised strategy game into a coherent, readable and visually distinctive 2.5D command-table experience without destabilising the simulation.

Entry state: R2-WP1 through R2-WP7 and the R2.5 Balance Stabilisation Gate are complete. PR #113 merged to `main` as `60950fcb634bc789bc77a49f2f2708fd2e7fc281`. The validated R2.5 baseline demonstrated Story at approximately 50.0% wins, Normal at approximately 29.6% and Hard at approximately 7.9% across 720 deterministic day-120 campaigns. R3 therefore begins from a mechanical freeze: presentation code may expose a genuine integration defect, but should not casually rebalance or redesign the game.

## R3 programme principles

- The simulation remains authoritative. Rendering reads game state and never becomes a second source of gameplay truth.
- Preserve the existing TypeScript/Vite browser delivery model and GitHub Pages deployment unless measured evidence requires otherwise.
- Prefer incremental renderer evolution over a wholesale platform rewrite.
- Evaluate the existing SVG/DOM map against WebGL/Three.js or an equivalent browser renderer during WP1 before committing to a renderer.
- 2.5D is the target presentation: a stylised strategic command table / animated board game, not a real-time tactical battlefield simulator.
- Strategic readability takes priority over spectacle.
- Preserve territory geometry, route topology, operation logic, save compatibility, deterministic behaviour and intelligence-information boundaries.
- Visual state should be derived rather than unnecessarily persisted in campaign saves.
- Laptop usability, mobile fallback, keyboard access, contrast and reduced-motion support are first-class constraints.
- Major new mechanics, narrative changes or art-direction changes outside the approved broad direction require product-owner approval.

## R3 sequence

R3-WP1 -> R3-WP2 -> R3-WP3 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.

---

## R3-WP1 - Visual Architecture & Renderer Foundation

Status: ACTIVE

Objective: establish a clean presentation architecture and select the rendering approach before substantial visual content is built.

Acceptance criteria:

- simulation/gameplay state remains independent of the renderer;
- explicit presentation boundaries exist for terrain, political/control state, routes, pieces, effects and UI overlays;
- the current SVG/DOM approach is compared with WebGL/Three.js or an equivalent renderer using measured criteria rather than preference;
- a focused technical spike proves camera movement, selection, representative territory geometry, a small number of unit pieces and overlay composition;
- the selected renderer is justified against performance, maintainability, visual capability, accessibility integration, GitHub Pages compatibility and implementation risk;
- pan, zoom and smooth camera transitions work without changing authoritative territory geometry or operation logic;
- asset-loading and asset-versioning conventions are established;
- level-of-detail behaviour is defined for theatre, regional, local and tactical zoom levels;
- lightweight performance instrumentation can detect severe frame-time/FPS regressions;
- a clear fallback exists if the preferred renderer fails supported-browser, performance or accessibility requirements.

Validation:

- focused camera/selection/presentation-boundary regressions where deterministic testing is practical;
- production TypeScript/Vite build;
- GitHub Pages compatibility;
- representative desktop/laptop/mobile checks;
- representative performance comparison;
- deterministic campaign/balance parity confirming the presentation foundation did not alter simulation outcomes.

---

## R3-WP2 - 2.5D Strategic Map

Objective: replace the flat strategic presentation with a readable 2.5D campaign map that feels like a physical command table while preserving the existing territory model.

Key requirements:

- territories gain controlled elevation/extrusion or equivalent depth cues;
- borders remain precise and selection/adjacency semantics remain unchanged;
- political control is immediately understandable;
- restrained terrain cues distinguish mountains, forests, rivers and urban concentration where useful;
- water supports the style without dominating the command surface;
- front lines are distinguishable from administrative borders;
- selected, threatened, contested and captured states remain unambiguous;
- labels and interaction remain readable from Europe-wide to local command views;
- existing Europe/Campaign/Selected navigation remains supported or is replaced only by a clearly superior equivalent.

Validation includes hit-testing, ownership/front visual-state checks, crowded-region geography checks, compact-desktop readability, geometry parity and full-map performance.

---

## R3-WP3 - Formation Pieces & Animated Movement

Objective: make armies visibly exist on the map as readable board-game-like pieces and make movement understandable as a physical change in campaign state.

Key requirements:

- coherent friendly piece language distinct from contemporary enemy contacts;
- ownership, broad type/status and strength readable without constant panel inspection;
- crowded territories remain usable;
- selected formations are visually dominant;
- movement paths are understandable before/while resolving;
- movement, split, merge, reinforce, retreat and regroup have clear visual transitions where the authoritative state permits interpolation;
- animation never delays or changes deterministic resolution;
- enemy pieces continue to respect intelligence uncertainty;
- reduced-motion/performance settings can simplify or disable movement animation.

---

## R3-WP4 - Battle, Front & Strategic Event Feedback

Objective: make attacks, counterattacks, captures, retreats and major campaign changes visible on the map without turning the game into tactical spectacle.

Key requirements:

- movement and combat read differently;
- attacks/counterattacks have clear direction;
- front-line changes, capture, retreat, reinforcement, isolation and critical supply disruption receive concise cues;
- restrained impacts/smoke/fire may be used where readable at campaign scale;
- after-action reports remain the authoritative detailed explanation;
- effects never expose hidden information or block simulation timing;
- reduced-motion behaviour is supported.

---

## R3-WP5 - Strategic Information Layers

Objective: make the map the primary strategic information surface through coherent overlays tied to authoritative simulation state.

Target layers include political control, friendly strength/readiness, assessed enemy threat, supply/network flow, route condition, Food/Industry/Energy/Transport/Medical/Military Stores, local stockpiles, logistics hubs, occupation/garrison pressure and force-quality information where useful.

Each layer must answer a clear player question, remain understandable through legends, combine without excessive noise, preserve critical exceptions, update without mutating gameplay and retain WP6 contextual navigation into exact actionable objects.

---

## R3-WP6 - Command UI/UX Overhaul

Objective: make the surrounding command interface visually coherent with the new map and reduce effort required to understand and act.

Key requirements:

- one visual system for panels, typography, icons, buttons, alerts and selections;
- territory and formation inspection present situation, resources, defence, infrastructure and actions clearly;
- alerts prioritise what needs attention now;
- exact contextual deep links remain intact;
- confirmation behaviour is proportional to consequence;
- compact desktop avoids horizontal scrolling;
- responsive/mobile, keyboard, contrast and reduced-motion support remain functional.

---

## R3-WP7 - Audio, Music & Atmosphere

Objective: add music, UI/order/movement/battle cues and restrained atmosphere without making gameplay dependent on audio.

Requirements include versioned assets, master/music/effects controls, persistent settings, smooth state transitions, browser autoplay-safe behaviour and graceful missing-asset fallback.

---

## R3-WP8 - Performance, Scalability, Accessibility & Resilience

Objective: ensure the richer presentation remains reliable on realistic hardware.

Requirements include performance budgets for theatre/local/heavy-front states, LOD/culling/batching where needed, stable large-piece/effect counts, controlled asset memory/load time, keyboard/focus/contrast/reduced-motion support, graceful low-performance degradation, recoverable renderer failure and transient rendering state kept out of campaign saves.

---

## R3-WP9 - Visual Polish & Integrated Validation

Objective: audit the finished R3 presentation as one product and establish a stable deployed build for human review.

Final validation gate:

- focused presentation regressions;
- complete repository tests;
- reproducible production build;
- supported save/load validation;
- deterministic campaign/balance parity;
- representative campaign traces;
- performance benchmarks;
- GitHub CI;
- deployed-main verification;
- whole-game visual/UX audit covering title/prologue, campaign, save/load, victory and defeat.

## R3 product-owner handoff

Human review should focus on whether the 2.5D direction feels coherent, whether the map reads like a strategic command table rather than a web dashboard, whether ownership/fronts/forces are immediately understandable, whether pieces and battle feedback feel satisfying without becoming busy, whether the strategic situation surface prioritises the right problems and whether the whole game now feels cohesive.

R4 is intentionally not frozen. Any small findings from the R3 human review should become an R3.5 remediation pass before selecting the next major simulation/content direction.
