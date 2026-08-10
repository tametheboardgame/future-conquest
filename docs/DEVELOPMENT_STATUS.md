# Future Conquest Development Status

Last updated: 2026-08-10

## Current programme

R2 gameplay/system improvement programme.

Authoritative roadmap: `docs/roadmap/R2-ROADMAP.md`.

Approved autonomous sequence:

R2-WP5 -> R2-WP6 -> R2-WP7 -> whole-game audit -> hardening -> balance programme -> adversarial/exploit testing -> UX/clarity validation -> final integrated validation -> surface results to David.

The development supervisor is authorised to progress through this sequence when the documented acceptance and validation gates are satisfied.

## Completed R2 work

### R2-WP1 - Tactical Map Usability

Status: COMPLETE / MERGED

PR: #105

### R2-WP2 - Engineering & Infrastructure Mechanics

Status: COMPLETE / MERGED

PR: #106

### R2-WP3 - Territory Resources, Stockpiles & Logistics Hubs

Status: COMPLETE / MERGED

PR: #108

### R2-WP4 - Saves, Settings & Assistance

Status: COMPLETE / MERGED

PR: #109

Merge commit: `a2d2323b7a051d6fcd975c3f8fe55c0f3883600e`

## Current active work

### R2-WP5 - Adviser & Tutorial Completion

Status: ACTIVE

PR: #110

Branch: `agent/r2-wp5-adviser-tutorial`

Current objective: implement WP5 from current `main` according to the acceptance criteria and validation expectations in the authoritative R2 roadmap.

## Next approved R2 work

1. R2-WP6 - Contextual Navigation & Diagnostics
2. R2-WP7 - Balance & Playtest Validation
3. Approved post-R2 autonomous audit/hardening programme in `docs/roadmap/R2-ROADMAP.md`
4. Product-owner handoff for human playtesting when the stable deployed post-R2 build is ready

## R2.5 gate

R2.5 is the human playtest and remediation stage after the automated post-R2 programme.

The expected flow is:

stable post-R2 deployed build -> one or more human test campaigns -> prioritised feedback/bug/balance remediation -> revalidation -> R3 entry decision.

R3 implementation must not begin until the R2.5 entry gate is satisfied.

## Approved future programme

R3 has been approved as the Visualisation & Command Experience release.

Authoritative future roadmap: `docs/roadmap/R3-ROADMAP.md`.

R3 is focused on:

- visual architecture and renderer foundation;
- a 2.5D strategic command-table map;
- board-game-like formation pieces and animated movement;
- battle/front/event visual feedback;
- strategic information layers;
- command UI/UX overhaul;
- audio, music and atmosphere;
- performance, scalability and accessibility;
- integrated visual polish and validation.

R3 is deliberately not a broad new-mechanics release. Major diplomacy, economic redesign, world expansion, naval/air warfare, multiplayer and other large simulation expansions remain outside R3 unless R2.5 demonstrates a direct requirement and product-owner approval is obtained.

## Product-owner stop conditions

Product-owner input is required for fundamental mechanic changes, materially different design directions, narrative choices, art-direction choices outside the approved R3 direction, unresolved subjective gameplay decisions, conflicts with intentional design, permissions/tooling blockers, or a stable deployed build that materially benefits from human playtesting.

Routine engineering, testing, CI, save compatibility, deployment, technical architecture, exploit fixes, performance work and evidence-based balance tuning within approved design remain autonomous.

## Source-of-truth rule

Current code, tests, Git history, active PR acceptance criteria, this status file and the approved roadmaps take precedence over stale historical status text elsewhere in the repository.
