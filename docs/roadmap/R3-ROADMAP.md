# Future Conquest R3 Roadmap

Status: APPROVED FUTURE PROGRAMME

R3 is the Visualisation & Command Experience release. Its purpose is to transform the existing strategy-game prototype into a coherent, readable and visually distinctive game without destabilising the strategic simulation established during R2.

The intended sequence is:

R2 autonomous completion -> R2.5 human playtest/remediation -> R3-WP1 -> R3-WP2 -> R3-WP3 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest.

R3 must not begin implementation until the R2.5 entry gate below is satisfied. Documentation, technical investigation and isolated proof-of-concept work that does not destabilise the current playable build may be prepared earlier when useful.

## R2.5 entry gate

R2.5 is the explicit product-owner feedback and remediation stage between the R2 systems programme and R3 visual development.

R2.5 begins only after the approved post-R2 automated audit, hardening, balance, adversarial/exploit, UX and integrated-validation programme has produced a stable deployed build for human testing.

R2.5 should include:

- one or more human test campaigns on the deployed R2 build;
- capture of gameplay friction, bugs, balance concerns, confusing systems and usability failures;
- prioritised remediation of findings that should be fixed before visual architecture changes begin;
- revalidation of affected mechanics, saves and balance where required;
- explicit acceptance of any known issues intentionally deferred beyond R2.5.

R3 may start when the game is judged mechanically stable enough that major presentation work is unlikely to mask unresolved core-system defects or require repeated renderer/UI rework.

---

## R3 programme principles

- The simulation remains authoritative. Rendering and presentation must read game state rather than becoming a second source of gameplay truth.
- Preserve the existing TypeScript/Vite browser delivery model and GitHub Pages deployment unless evidence demonstrates that a different architecture is necessary.
- Prefer an incremental rendering upgrade over rewriting the game around a heavyweight general-purpose 3D engine.
- Evaluate WebGL/Three.js or an equivalent browser-capable renderer during WP1; do not lock the project to a renderer before the technical spike is complete.
- Preserve current game rules unless a visual/interaction requirement exposes a genuine defect. R3 is not a broad mechanics-expansion release.
- Keep strategic readability ahead of spectacle. The player must be able to understand ownership, fronts, forces, threats, logistics and selected objects at a glance.
- 2.5D is the target presentation. The intended feel is a stylised strategic command table or animated board game, not a real-time tactical battlefield simulation.
- Visual effects must never obscure important command information.
- Major art-direction changes outside the approved broad direction remain a product-owner stop condition.
- Maintain supported save compatibility. Visual state should be derived where possible rather than becoming unnecessary persistent campaign data.
- Keep accessibility, laptop usability and responsive behaviour as first-class requirements rather than post-polish fixes.

## R3 scope boundary

Unless R2.5 demonstrates a direct need, R3 does not include:

- a new diplomacy model;
- a major economic-system redesign;
- a replacement combat model;
- world-map expansion;
- player-controlled naval warfare;
- player-controlled air warfare;
- multiplayer;
- a general rewrite of enemy strategic AI;
- a full engine/platform migration solely for visual novelty.

Those remain candidates for later releases.

---

## R3-WP1 - Visual Architecture & Renderer Foundation

Status: APPROVED / FIRST R3 PACKAGE

Objective: establish a clean presentation architecture and choose the rendering approach before substantial visual content is built.

Acceptance criteria:

- simulation/gameplay state remains independent of the renderer;
- introduce explicit presentation boundaries for map terrain, political/control state, routes, pieces, effects and UI overlays;
- investigate the current SVG/DOM approach versus WebGL/Three.js or an equivalent browser-capable renderer;
- build a focused technical spike that proves camera movement, selection, representative territory geometry, a small number of unit pieces and overlay composition;
- select the renderer using measured criteria including performance, maintainability, visual capability, accessibility integration, deployment compatibility and implementation risk;
- support pan, zoom and smooth camera transitions without changing underlying territory geometry or operation logic;
- establish asset-loading and asset-versioning conventions;
- define a level-of-detail strategy for zoomed-out and zoomed-in states;
- add lightweight performance instrumentation sufficient to detect severe FPS/frame-time regressions;
- retain a clear fallback path if the preferred renderer cannot meet supported-browser or accessibility requirements.

Validation expectations:

- focused renderer/camera/selection regressions where deterministic testing is practical;
- production build and GitHub Pages deployment validation;
- representative desktop/laptop/mobile-browser checks;
- performance comparison using representative territory and marker counts;
- confirmation that simulation results remain unchanged by the presentation foundation.

---

## R3-WP2 - 2.5D Strategic Map

Status: APPROVED

Objective: replace the flat strategic presentation with a readable 2.5D campaign map that feels like a physical command table while preserving the existing territory model.

Acceptance criteria:

- territories have a clear 2.5D visual treatment, including controlled elevation/extrusion or equivalent depth cues;
- territory borders remain precise enough for command use and do not distort adjacency or selection semantics;
- political control is immediately understandable;
- terrain is visually differentiated using restrained strategic textures/features such as mountains, forests, major rivers and urban concentration where useful;
- ocean/water treatment supports the overall visual style without drawing excessive attention from land operations;
- front lines are visually distinguishable from ordinary administrative borders;
- selected, threatened, contested, captured and otherwise important territories have unambiguous states;
- camera zoom levels preserve meaningful visual hierarchy from Europe-wide overview to local command view;
- country/territory labels remain readable and do not collide excessively with pieces or effects;
- existing Europe/Campaign/Selected navigation concepts remain supported or are replaced only by clearly superior equivalents;
- map interaction remains keyboard and pointer accessible where technically practical.

Validation expectations:

- territory hit-testing/selection regressions;
- ownership/front-state visual-state tests where feasible;
- geographic-placement checks for known crowded regions;
- laptop and compact-desktop readability review;
- no regression to route, operation or territory geometry semantics;
- production performance assessment at full campaign-map scale.

---

## R3-WP3 - Formation Pieces & Animated Movement

Status: APPROVED

Objective: make armies exist visibly on the strategic map as readable board-game-like pieces and make their movement understandable as a physical change in the campaign state.

Acceptance criteria:

- friendly formations have a coherent piece/counter language distinct from contemporary enemy formations;
- piece design communicates ownership, broad formation type/status and strength without requiring constant panel inspection;
- multiple formations in one territory remain readable without collapsing into an unusable overlapping cluster;
- selected formations are visually dominant without obscuring nearby pieces;
- movement orders show understandable paths before commitment where appropriate;
- committed movement is animated between territories rather than teleporting visually at resolution boundaries where the game state allows meaningful interpolation;
- split, merge, reinforce, retreat and regroup outcomes produce understandable visual changes;
- animation never delays or changes deterministic simulation resolution;
- pieces have simplified level-of-detail states at wider zoom levels;
- enemy pieces/contacts continue to respect intelligence uncertainty and do not expose hidden exact enemy state;
- unit animation can be disabled or reduced through settings if required for accessibility/performance.

Validation expectations:

- piece-placement and crowded-territory regressions;
- selected-piece/readability checks at supported zoom levels;
- movement-path consistency with authoritative route/adjacency state;
- intelligence-information boundary tests;
- representative large-piece-count performance testing.

---

## R3-WP4 - Battle, Front & Strategic Event Feedback

Status: APPROVED

Objective: make combat and major campaign changes visible on the map so the player can understand what happened without relying entirely on text reports.

Acceptance criteria:

- attacks and counterattacks have clear directional visualisation;
- active battles are visually distinguishable from simple movement;
- capture, retreat, reinforcement and contested-state transitions receive concise visual feedback;
- front-line movement is visible and coherent as territory control changes;
- combat effects may include restrained flashes, impacts, smoke, fire or equivalent strategic abstractions but must remain readable at campaign scale;
- casualties, armour degradation and other major consequences receive concise visual cues without pretending to depict exact tactical events;
- after-action reports remain available as the authoritative detailed explanation of battle outcome;
- encirclement/isolation and critical supply disruption receive map-level visual cues where supported by existing game state;
- effects timing never blocks command input longer than necessary and can be reduced/disabled;
- event animation does not expose hidden information or alter simulation timing.

Validation expectations:

- event-to-visual-state mapping regressions;
- simultaneous-event stress tests;
- review of visual clutter during multi-front campaigns;
- reduced-motion behaviour checks;
- no change to combat/balance results attributable to presentation code.

---

## R3-WP5 - Strategic Information Layers

Status: APPROVED

Objective: make the map itself the primary strategic information surface through coherent, toggleable overlays tied to the systems already present in the game.

Target layers include, where supported by authoritative game state:

- political/control state;
- friendly military strength/readiness;
- assessed enemy threat/intelligence;
- supply/network flow;
- infrastructure/route condition;
- Food, Industry, Energy, Transport, Medical and Military Stores;
- local stockpiles/reserves;
- logistics hubs;
- occupation/garrison pressure;
- escalation/mobilisation pressure where geographically meaningful;
- powered-armour condition or force-quality information where useful.

Acceptance criteria:

- each layer answers a clear player question rather than existing as decorative data;
- layer legends and state meanings are understandable;
- overlays can be combined where useful without producing unreadable visual noise;
- critical exceptions such as broken routes, isolated forces or severe threats remain visible even when a related overlay is not active where current adviser/alert rules require them;
- overlay data matches the authoritative simulation state;
- switching layers is fast and does not trigger gameplay mutations;
- contextual navigation can take the player from a map problem to the relevant command surface and back.

Validation expectations:

- state-to-overlay mapping tests;
- contextual-navigation regressions;
- stale/invalid target fallback checks;
- representative clutter/readability review across multiple simultaneous overlays;
- performance checks for high-density route/resource visualisation.

---

## R3-WP6 - Command UI/UX Overhaul

Status: APPROVED

Objective: make the surrounding command interface visually coherent with the new map and reduce the effort required to understand and act on campaign information.

Acceptance criteria:

- establish one consistent visual system for panels, typography, icons, buttons, alerts and selection states;
- territory inspection clearly separates situation, resources, defence, infrastructure and actionable commands;
- formation inspection clearly exposes personnel, armour, carried stocks, status, orders, support commitments and relevant warnings;
- important contextual actions remain discoverable without presenting every possible action simultaneously;
- alerts prioritise situations requiring attention rather than merely reporting every state change;
- important warnings continue to deep-link to exact relevant objects/sections where possible;
- confirmation behaviour is proportional to consequence, avoiding both accidental destructive actions and excessive confirmation fatigue;
- battle summaries, infrastructure diagnostics, supply problems and adviser warnings share a consistent information hierarchy;
- long command surfaces remain usable on 14-inch/compact desktop displays without horizontal scrolling;
- responsive/mobile presentation remains functional even if desktop is the primary target;
- keyboard focus, contrast and reduced-motion requirements remain supported.

A specific target is a concise strategic-situation surface that answers: "What needs my attention now?" using existing adviser, threat, logistics and event data.

Validation expectations:

- full contextual-navigation/deep-link regression suite;
- compact-desktop and mobile layout checks;
- keyboard/focus/accessibility checks;
- alert-priority and exact-target tests;
- human readability review of representative complex campaign states.

---

## R3-WP7 - Audio, Music & Atmosphere

Status: APPROVED

Objective: add sound and restrained environmental presentation so the game has a consistent emotional identity without making core play dependent on audio.

Acceptance criteria:

- support main-menu, strategic-map, tension/escalation and combat-context music states where suitable;
- integrate authored/generated music through a versioned asset pipeline that respects project licensing requirements;
- support UI, order, movement, battle and major-event sound cues where they materially improve feedback;
- add independent master/music/effects volume controls and mute behaviour;
- settings persist independently of campaign saves where appropriate;
- audio transitions are smooth and avoid rapid track thrashing during frequent state changes;
- no important gameplay information is available only through sound;
- optional environmental effects such as subtle clouds, smoke, fire, weather or day/night treatment may be added only where they reinforce existing game state or atmosphere and do not materially reduce readability or performance;
- atmosphere features can be reduced or disabled where necessary.

Validation expectations:

- settings persistence tests;
- audio-state transition tests where practical;
- missing/failed asset fallback behaviour;
- production asset-size/loading review;
- no autoplay/browser-policy failures that block game startup.

---

## R3-WP8 - Performance, Scalability, Accessibility & Resilience

Status: APPROVED

Objective: ensure the richer visual game remains reliable on realistic hardware and does not sacrifice command usability for graphical complexity.

Acceptance criteria:

- establish representative performance budgets for Europe-wide view, local command view and heavy multi-front states;
- use level-of-detail, culling, batching/instancing or equivalent techniques where needed;
- support large formation/effect counts without catastrophic frame degradation;
- avoid unnecessary re-rendering when simulation state has not changed;
- maintain acceptable load time and asset-memory use for GitHub Pages deployment;
- retain or improve keyboard navigation, focus visibility, contrast and reduced-motion support;
- provide graceful degradation for lower-performance devices where practical;
- renderer failures must fail visibly and recoverably rather than silently corrupting campaign state;
- save/load remains independent of transient rendering state;
- visual settings that affect performance persist appropriately.

Validation expectations:

- benchmark representative low/medium/high-complexity campaign scenes;
- long-session memory/leak checks where practical;
- asset-loading failure tests;
- reduced-motion and low-effects settings tests;
- full repository tests, production build and deployment verification.

---

## R3-WP9 - Visual Polish & Integrated Validation

Status: APPROVED

Objective: treat the completed R3 presentation as one integrated product, remove visual/interaction inconsistencies and establish a stable deployed build for human review.

Acceptance criteria:

- perform a whole-game visual/interaction audit rather than reviewing each package in isolation;
- identify overlapping pieces, unreadable labels, ambiguous ownership, hidden alerts, misleading effects, excessive animation and inconsistent command patterns;
- verify major game flows from title/prologue through campaign, save/load, victory and defeat under the new presentation;
- verify that visually impressive states remain strategically understandable during complex multi-front play;
- verify that players can distinguish movement, attack, retreat, capture, threat, isolation, supply failure and infrastructure problems without needing developer knowledge;
- remove temporary proof-of-concept assets, renderer scaffolding and obsolete presentation paths not required by the selected architecture;
- run final performance and accessibility passes;
- update documentation needed for future maintainers and automated development agents.

Final validation gate:

- focused regressions for every changed presentation system;
- complete repository test suite;
- reproducible production build;
- supported save/load migration validation;
- deterministic campaign/balance parity checks demonstrating that presentation changes did not unintentionally alter strategic outcomes;
- representative campaign traces;
- performance benchmarks against the agreed R3 budgets;
- GitHub CI validation;
- deployed-main verification;
- final autonomous visual/UX audit before product-owner handoff.

---

# R3 Product-Owner Handoff

After WP9 and integrated validation, surface a concise R3 report and deployed build for human testing.

The human review should focus particularly on observations that automation cannot reliably judge, including:

- whether the 2.5D art direction feels coherent and distinctive;
- whether the map looks like a strategic command table rather than a web dashboard;
- whether ownership/fronts/forces are immediately understandable;
- whether pieces are satisfying to move and watch without becoming visually busy;
- whether battle feedback communicates consequence without becoming spectacle for its own sake;
- whether the strategic situation surface highlights the right problems;
- whether audio/atmosphere improves the experience rather than becoming repetitive;
- whether the game now feels like a cohesive strategy game rather than a technically capable prototype.

Findings from this review should become a short R3.5 remediation package if necessary before the next major simulation/content release.

## Likely post-R3 direction

R4 is intentionally not frozen by this roadmap. It should be selected after R3 human review and should respond to what the mature visualised game is genuinely missing rather than pre-committing to a large feature set now.
