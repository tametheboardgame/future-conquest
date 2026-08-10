# Future Conquest R2 Roadmap

Status: APPROVED PROGRAMME

This document is the authoritative roadmap for the current R2 development programme. The intended autonomous sequence is:

R2-WP2 -> R2-WP3 -> R2-WP4 -> R2-WP5 -> R2-WP6 -> R2-WP7 -> whole-game audit -> hardening/balance/exploit testing -> surface results for product-owner review.

The development supervisor may progress through this sequence without requiring a separate "do the next thing" instruction, provided each stage satisfies its acceptance and validation gates and no product-owner stop condition is triggered.

## Programme rules

- Complete work packages sequentially unless an explicit dependency requires otherwise.
- Significant implementation work should use a dedicated branch/PR.
- Inspect the current code and prior work before changing systems; do not restart working implementations unnecessarily.
- Preserve approved game design unless a work package explicitly changes it.
- Do not weaken tests or bypass validation to make a package pass.
- Preserve supported save compatibility and deterministic behaviour where applicable.
- Each package must satisfy its own focused regressions plus the repository-wide validation expected by the project.
- After merge, verify the resulting main commit and production deployment before advancing.
- Engineering, test, CI, save, deployment, technical architecture, exploit, performance and balance issues within approved design may be resolved autonomously.
- Stop and request product-owner input only for fundamental mechanic changes, materially different design directions, narrative/lore choices, art-direction choices, unavoidable subjective judgement, conflicts with an intentional design decision, permissions/tooling blockers, or when a stable build materially benefits from human playtesting.

---

## R2-WP1 - Tactical Map Usability

Status: COMPLETE

Objective: make the tactical/strategic map genuinely usable across supported desktop and mobile layouts, with practical zoom, pan, selection and marker readability.

WP1 is already complete and serves as the R2 baseline for map usability.

---

## R2-WP2 - Engineering & Infrastructure Mechanics

Status: ACTIVE

Canonical active work: PR #106, `agent/r2-wp2-engineering-infrastructure`.

Objective: rebuild engineering and infrastructure as a civil-first persistent project system rather than a whole-formation status lock.

Frozen acceptance baseline includes:

- civil/local infrastructure capability is the primary repair workforce;
- formations provide optional 0-100% engineering support rather than becoming wholly immobilised;
- partial support leaves the parent formation operational with explicit proportional movement/combat penalties;
- support can be reduced or withdrawn independently of the underlying civil project;
- project cancellation remains a separate action;
- repair speed reflects local capability, military support and actual supply;
- damaged corridors degrade movement/throughput progressively while genuinely destroyed or explicitly blocked routes remain impassable;
- the system includes persistent construction/upgrade work beyond simple repair;
- old saves and old whole-formation engineering commitments normalise safely into the new model.

Validation gate: focused WP2 regressions, full repository tests, production build, save/load compatibility, deterministic 720-campaign balance validation, representative traces, and clean diff checks.

Do not start WP3 until WP2 is merged and the resulting deployment is verified.

---

## R2-WP3 - Territory Resources, Stockpiles & Logistics Hubs

Status: APPROVED / NEXT AFTER WP2

Objective: make territory-level resources and logistics meaningfully visible and strategically consequential, including local resilience when formations are disconnected from the main network.

Acceptance criteria:

- expose the meaningful territory/resource dimensions: Food, Industry, Energy, Transport, Medical and Military Stores;
- territories can hold meaningful local stocks/reserves rather than all supply behaviour being abstract/global;
- disconnected forces can continue operating from available local stocks for a limited period rather than failing instantly;
- logistics hubs can be constructed and/or upgraded where geography, local resources and the strategic network justify them;
- hub capability must have persistent strategic value to supply movement, resilience or throughput;
- hub loss must matter materially without creating an arbitrary instant-defeat state;
- resource, stockpile and hub behaviour must integrate with existing logistics/network systems rather than creating a parallel disconnected model;
- the UI must make the relevant resource/stock/hub state understandable enough for the player to make informed decisions;
- save/load compatibility must be preserved for supported saves.

Validation expectations:

- focused resource/stockpile/hub regressions;
- logistics and route interaction regressions;
- save/load migration coverage;
- full repository tests and production build;
- deterministic campaign simulations and representative traces sufficient to show disconnected-force behaviour, hub value and hub-loss consequences are functioning as intended.

---

## R2-WP4 - Saves, Settings & Assistance

Status: APPROVED

Objective: complete persistent quality-of-life and accessibility/control settings so campaign state and player preferences behave predictably.

Acceptance criteria:

- add an Autosave toggle;
- maintain clearly separate Manual Save and Autosave slots/behaviour;
- provide a reliable Return to Title action;
- implement Assistance levels exactly as: Full Guidance, Recommended, Critical Only, Off;
- assistance preference persists independently of campaign save files so it behaves as a player setting rather than campaign data;
- settings survive appropriate reload/restart flows;
- save/load behaviour remains backwards-compatible with supported save versions;
- UI labels and state make it clear what is saved as campaign data versus persistent player preference.

Validation expectations:

- focused save/settings persistence regressions;
- manual/autosave isolation tests;
- backwards save compatibility checks;
- full repository tests and production build.

---

## R2-WP5 - Adviser & Tutorial Completion

Status: APPROVED

Objective: finish the adviser and tutorial so the game explains important strategic risks and core navigation without taking control away from the player.

Acceptance criteria:

- adviser behaviour respects the Assistance levels: Full Guidance, Recommended, Critical Only, Off;
- warnings cover at minimum: threatened undefended territory, isolation, low garrison, exhausted stocks, overloaded routes, engineering-support loss and suicidal assaults;
- adviser warnings are advisory only and never hard-restrict otherwise legal player actions;
- warning severity/visibility is appropriate to the selected assistance level;
- tutorial supports Back and Forward navigation;
- tutorial can recover cleanly when the player navigates to the wrong place instead of becoming stuck or desynchronised;
- tutorial explicitly teaches the important map/navigation concepts, including Europe/Campaign/Selected views and zoom/pan behaviour;
- tutorial framing keeps the relevant campaign area visible and understandable;
- tutorial layout must not require horizontal scrolling on supported layouts;
- tutorial/adviser integration must remain compatible with the systems introduced through WP3 and WP4.

Validation expectations:

- focused adviser-rule regressions;
- assistance-level behaviour tests;
- tutorial navigation/recovery regressions;
- desktop/mobile layout checks for tutorial flow;
- full repository tests and production build.

---

## R2-WP6 - Contextual Navigation & Diagnostics

Status: APPROVED

Objective: eliminate generic diagnostic dead ends by making warnings, failures and intelligence actionable through contextual deep-links into the exact relevant system or object.

Acceptance criteria:

- broken-route diagnostics open the exact affected route in Infrastructure;
- formation warnings open the exact affected formation/context;
- territory-threat warnings open the exact relevant Defence section/context;
- Intelligence, Operations, Logistics and Infrastructure can deep-link into one another where a diagnostic references an actionable object;
- navigation preserves enough context that the player understands why they were sent there;
- generic warnings should not terminate in non-actionable screens when an exact object/section can be identified;
- no new contextual navigation path may silently mutate campaign state merely by opening a diagnostic target;
- deep-links remain usable across supported desktop/mobile layouts.

Validation expectations:

- focused contextual-navigation/deep-link regressions;
- exact-object targeting tests;
- wrong/missing target fallback tests;
- full repository tests and production build.

---

## R2-WP7 - Balance & Playtest Validation

Status: COMPLETE

Objective: validate the complete R2 systems together, improve automated strategic behaviour sufficiently to exercise the new systems, and establish a stable post-R2 baseline before broader hardening.

Acceptance criteria:

- after WP1-WP6 are integrated, upgrade the automated campaign player/bot sufficiently to exercise reconcentration, defensive actions, engineering support, territory resources, hubs and supply decisions;
- the bot must not obviously waste forces or repeatedly make trivially self-defeating decisions that invalidate balance evidence;
- run a clean repository test/build baseline;
- run at least 720 deterministic campaign simulations across the established insertion-start coverage, increasing the sample where useful and computationally practical;
- inspect representative traces rather than relying only on aggregate win/loss statistics;
- identify obvious dominant strategies, dead systems, pathological failures and implausible campaign states exposed by the integrated R2 systems;
- correct clear implementation/balance defects that remain within approved design and rerun the relevant validation;
- preserve save/load compatibility and deterministic testability.

Human playtesting is valuable but is not required to interrupt the autonomous programme immediately after WP7 unless the automated evidence cannot resolve a material issue. The approved sequence continues into the post-R2 audit/hardening programme below before results are surfaced for product-owner review.

---

# Approved Post-R2 Autonomous Programme

The following stages are explicitly approved after WP7. They are part of the same autonomous programme and do not require a fresh "continue" instruction.

## Stage A - Whole-Game Audit

Mode: ANALYSIS FIRST. Do not begin with broad discretionary rewrites.

Perform a comprehensive technical, gameplay and systems audit of the integrated game, covering at minimum:

- combat and force preservation;
- enemy/automated strategic behaviour;
- logistics, routes, stockpiles, resources and hubs;
- engineering and infrastructure;
- escalation and mobilisation;
- occupation/garrison pressure;
- recruitment/recovery where present;
- adviser/tutorial/assistance behaviour;
- contextual navigation and diagnostics;
- save/load and migration behaviour;
- performance and technical debt;
- UI/UX clarity and discoverability;
- interactions between systems, not only each system in isolation.

The audit must actively search for:

- dominant or trivial strategies;
- dead/irrelevant mechanics;
- exploits and resource-generation loopholes;
- impossible or contradictory states;
- mechanics that technically work but are not understandable to the player;
- systems whose interactions create unintended difficulty spikes or remove meaningful choices;
- poor AI behaviour that invalidates balance evidence;
- untested/high-risk architecture.

Produce a ranked evidence-based findings set before broad changes. Each material finding should state the problem, evidence, expected effect of a fix, risk and required validation.

## Stage B - Hardening

Implement high-value audit findings that are defects, regressions, unsafe interactions, technical weaknesses, save/data risks or clearly unintended behaviour.

Permitted autonomous work includes:

- bug/regression fixes;
- exploit closure;
- save/migration hardening;
- deterministic simulation fixes;
- performance/reliability work;
- CI/build/deployment hardening;
- technical refactoring necessary to fix demonstrated problems without redesigning the game.

Fundamental design changes remain a product-owner stop condition.

## Stage C - Balance Programme

Run large-scale automated balancing and tuning across representative starts/strategies.

Track meaningful metrics where available, including:

- player/automated victory and defeat rates;
- turns to victory/defeat;
- force/casualty preservation;
- armour degradation/recovery where applicable;
- territory progression;
- escalation timing;
- enemy mobilisation timing;
- supply shortages and route bottlenecks;
- stockpile exhaustion;
- engineering/hub utilisation;
- occupation/garrison burden;
- retreat/formation-destruction frequency;
- dominant attack routes and strategy patterns;
- mechanics rarely or never used;
- recurring campaign-collapse causes.

Use larger-than-baseline simulation samples when runtime permits. Compare multiple strategic policies rather than optimising only one bot policy. Tune parameters only where evidence supports the change and preserve the intended strategic trade-offs.

## Stage D - Adversarial / Exploit Testing

Actively attempt to break the game as an adversarial player/agent.

Search for ways to:

- trivialise intended decisions;
- bypass logistics, occupation, escalation or engineering constraints;
- generate or preserve resources incorrectly;
- exploit save/load or migration behaviour;
- abuse movement, retreat, formation, support or construction systems;
- prevent meaningful enemy response;
- create degenerate dominant strategies;
- reach invalid or contradictory states.

Fix clear defects/exploits within approved design and rerun relevant regressions and balance simulations.

## Stage E - UX / Clarity Validation

Review whether the player can understand the state and consequences of the completed systems.

Improve clarity where the underlying design is already approved, including diagnostics, labels, previews, warnings, contextual navigation and tutorial/adviser guidance.

Do not use UX work as a pretext to remove or simplify meaningful mechanics without product-owner approval.

## Stage F - Final Integrated Validation

Before surfacing the post-R2 result:

- run focused regressions for changed systems;
- run the complete repository test suite;
- run the complete reproducible production build;
- validate supported save/load migrations;
- run the established deterministic campaign suite and additional representative simulations where useful;
- inspect representative campaign traces;
- run adversarial/exploit regressions created during the hardening cycle;
- verify GitHub CI;
- merge through the established PR workflow;
- verify the deployed main commit using the repository's production deployment verification.

## Stage G - Surface Results to Product Owner

Notify David when one of these is true:

1. the post-R2 audit/hardening/balance programme has produced a stable, deployed version that materially benefits from human playtesting/feedback; or
2. an earlier genuine product-owner stop condition is reached.

The preferred handoff is a concise report covering:

- what changed since the start of R2;
- what automated testing/simulation found;
- important balance changes and remaining uncertainties;
- known issues that remain intentionally unresolved;
- specific things David should test/observe in the current deployed build;
- the highest-value recommended next development direction.

Routine engineering progress should not require product-owner intervention.
