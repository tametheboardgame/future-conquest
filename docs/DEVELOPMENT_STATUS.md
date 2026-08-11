# Future Conquest Development Status

Last updated: 2026-08-11

## Current programme

R3 Visualisation & Command Experience programme.

Authoritative roadmap: `docs/roadmap/R3-ROADMAP.md`.

Approved sequence:

R3-WP1 -> R3-WP2 -> R3-WP3 -> R3-WP4 -> R3-WP5 -> R3-WP6 -> R3-WP7 -> R3-WP8 -> R3-WP9 -> integrated R3 review -> human visual/UX playtest -> small R3.5 remediation if required.

The simulation/gameplay layer is mechanically frozen from the validated R2.5 baseline unless R3 exposes a genuine integration defect.

## Completed R2 / R2.5 baseline

### R2-WP2 - Engineering & Infrastructure Mechanics

Status: COMPLETE / MERGED
PR: #106
Merge commit: `f6011f9b1512f29620ae84a7d3c922bb94741daa`

### R2-WP3 - Territory Resources, Stockpiles & Logistics Hubs

Status: COMPLETE / MERGED
PR: #108
Merge commit: `13ab39e2eda4c74a86713b419bc709acff309e41`

### R2-WP4 - Saves, Settings & Assistance

Status: COMPLETE / MERGED
PR: #109
Merge commit: `a2d2323b7a051d6fcd975c3f8fe55c0f3883600e`

### R2-WP5 - Adviser & Tutorial Completion

Status: COMPLETE / MERGED
PR: #110
Merge commit: `26eabaecb8ad4a7f4edae3a7aee454b6174c053e`

### R2-WP6 - Contextual Navigation & Diagnostics

Status: COMPLETE / MERGED
PR: #112
Merge commit: `d055a40f72faf32f917528dffd91a9e76c7187ee`

### R2-WP7 / R2.5 - Balance & Playtest Validation / Stabilisation

Status: COMPLETE / MERGED
PR: #113
Merge commit: `60950fcb634bc789bc77a49f2f2708fd2e7fc281`

Final R2.5 evidence demonstrated a mechanically credible baseline before the graphical overhaul: approximately Story 50.0%, Normal 29.6% and Hard 7.9% wins across 720 deterministic day-120 campaigns. The final branch passed 348 repository tests, TypeScript, production build and GitHub workflows. The final independent Codex review gate was explicitly waived by David because Codex review capacity was exhausted for five days; all other gates were green.

Known small UI/UX issues observed during manual fiddling are intentionally being accumulated for a small post-overhaul bug pass where the graphical redesign may supersede them.

## Completed R3 work

### R3-WP1 - Visual Architecture & Renderer Foundation

Status: COMPLETE / MERGED
PR: #114
Merge commit: `be3176de940b37346d713eb575d81bf0c92fe03d`

WP1 established the renderer-neutral presentation frame, explicit terrain/control/routes/pieces/effects/overlay boundaries, GameState-to-presentation adapter, level-of-detail foundation, asset-versioning and performance instrumentation conventions, equivalent SVG/WebGL renderer spikes, WebGL capability fallback, and deterministic smooth-camera primitives.

Renderer decision: **evolved SVG/DOM is the primary R3 map renderer**. WebGL remains an optional acceleration path behind the renderer-neutral presentation contract if later measured browser paint/effect pressure justifies it.

Final WP1 validation passed 369/369 repository tests, TypeScript, production build, exact-head deterministic balance simulation, both GitHub workflows and final architecture/diff review with no simulation/save coupling or unresolved review threads.

### R3-WP2 - 2.5D Strategic Map

Status: COMPLETE / MERGED
PR: #115
Merge commit: `7ad39d5d75889cf05b6af8f54f61eafb09ef033b`

WP2 delivered the raised command-table theatre, supporting water treatment, political-control hierarchy, presentation-only terrain textures and lighting, deterministic opposing-control front cues, crowded Benelux/Rhine/Alpine zoom hierarchy, and mobile effect simplification while retaining the existing authoritative territory paths for hit-testing and all gameplay geography.

Final functional validation passed 393/393 repository tests, renderer preparation benchmarks, `git diff --check origin/main...HEAD`, TypeScript and production build. The canonical 720-campaign day-120 simulation preserved the R2.5 balance gradient at approximately Story 50.0%, Normal 29.6% and Hard 7.9%. No simulation, save, route-topology, territory-data or gameplay-mechanics files were modified by WP2.

## Current active work

### R3-WP3 - Formation Pieces & Animated Movement

Status: ACTIVE - PACKAGE OPENED

Branch: `agent/r3-wp3-formation-pieces-movement`

Objective: replace flat formation counters with clear physical board-game-style pieces and presentation-only movement/state transitions on the stable WP2 map without changing deterministic engine timing, save semantics or intelligence boundaries.

Primary requirements:

- friendly formation pieces visually distinct from enemy contacts;
- readable ownership, identity/type, operational status and player-visible strength at appropriate map detail levels;
- stable stacking/offset behaviour in crowded territories;
- selected formations remain visually dominant and keyboard accessible;
- presentation transitions for movement, split, merge, reinforcement/reconcentration, retreat and regroup/recovery where authoritative before/after state is available;
- animations never author, delay or change game-state resolution;
- enemy pieces/contacts preserve existing intelligence uncertainty and never expose hidden exact formation state;
- reduced-motion collapses transitions to immediate state changes;
- mobile/compact layouts simplify shadows/transitions before sacrificing operational readability.

Validation will include piece identity/stacking/selection regressions, transition lifecycle/determinism tests, hidden-information checks, reduced-motion/mobile checks, representative renderer pressure, complete repository tests, TypeScript/build, relevant balance parity and final diff review for accidental simulation/save coupling.

Implementation is being performed directly through ChatGPT/GitHub while Codex capacity is unavailable. The scheduled Codex supervisor is delayed until 15 August 2026 and will resume from live repository state rather than duplicating direct work.

## Next approved work

1. R3-WP4 - Battle, Front & Strategic Event Feedback
2. R3-WP5 - Strategic Information Layers
3. R3-WP6 - Command UI/UX Overhaul
4. R3-WP7 - Audio, Music & Atmosphere
5. R3-WP8 - Performance, Scalability, Accessibility & Resilience
6. R3-WP9 - Visual Polish & Integrated Validation

## Product-owner stop conditions

Product-owner input is required for fundamental mechanic changes, materially different design directions, narrative changes, art-direction choices outside the approved command-table/animated-board-game direction, unresolved subjective gameplay choices, conflicts with intentional design, permissions/tooling blockers, or a stable deployed visual milestone that materially benefits from human review.

Routine presentation architecture, renderer integration, testing, CI, save compatibility, deployment, performance work, accessibility, exploit fixes and evidence-based technical choices within the approved direction remain autonomous.

## Source-of-truth rule

Current code, tests, Git history, active PR acceptance criteria, this status file and the approved roadmaps take precedence over stale historical status text elsewhere in the repository.
