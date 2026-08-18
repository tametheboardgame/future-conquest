# Future Conquest Development Status

Last updated: 2026-08-18

## Current programme

R3 Visualisation & Command Experience is now in **R3-WP6.6 - Command Shell Follow-up Polish & Warning Preferences**.

Authoritative active package: `docs/roadmap/R3-WP6.6-COMMAND-SHELL-FOLLOW-UP.md`.
Programme roadmap: `docs/roadmap/R3-ROADMAP.md`.

R3-WP4, R3-WP5, R3-WP6 and R3-WP6.5 are merged. WP6.6 is the approved bounded follow-up identified by product-owner live review after WP6.5. R3-WP7 should not begin until WP6.6 is implemented, deployed and visually accepted.

The mechanically validated R2/R2.5 baseline remains frozen. R3 remains presentation-led: gameplay, balance, campaign geography, route topology, hidden-information authority, save compatibility and deterministic simulation remain unchanged except for separately approved genuine integration changes.

## Current accepted production baseline

The current accepted baseline is the merged R3-WP6.5 command shell on top of the completed physical-map, battle-feedback and strategic-layer programmes.

Key merged packages:

- R3-WP3.9 integrated physical-map tightening and exit review completed before WP4 resumed.
- R3-WP4 Battle, Front & Strategic Event Feedback merged in PR #171.
- R3-WP5 Strategic Information Layers merged in PR #172.
- R3-WP6 Command UI/UX Overhaul merged in PR #173.
- R3-WP6.5 Interface Polish & Visual Consistency Remediation merged in PR #174.
- PR #174 landed on `main` at merge commit `977fa10dfb0e4dae2934f94e97e8bdf418ba1a1e`.

The accepted command direction is map-first, compact and pictorial/icon-led, with detailed information available on demand rather than permanently consuming map space.

## Active package: R3-WP6.6 - Command Shell Follow-up Polish & Warning Preferences

Status: **APPROVED / NEXT**

Product-owner live review after WP6.5 identified four concrete follow-up issues:

1. the left navigation rail is now slightly too cramped;
2. the Logistics `How Supply Works` cards have visible icon/heading/body alignment inconsistencies;
3. the right context-panel collapse/expand control should be fully inside the panel header, with the title recomposed around it;
4. repetitive end-turn/logistics warnings need persistent player preference controls and a direct route into warning Settings.

WP6.6 owns only those bounded findings plus the regression/accessibility work required to land them safely.

### Warning-preference rule

Warning preference state is UI preference state, not simulation state.

The implementation must:

- support stable per-warning suppression for explicitly suppressible advisory warnings;
- provide a Warning Preferences section in Settings and an easy reset/default path;
- allow the warning modal to open the relevant Settings section directly;
- represent severity/suppressibility explicitly rather than inferring it from copy or colour;
- keep critical/game-protective warnings surfaceable unless a specific warning type is separately approved as suppressible;
- persist preferences outside deterministic campaign resolution inputs;
- preserve existing campaign-save compatibility and fail safely to normal warning display if preference data is unavailable or invalid.

### Visual corrections

WP6.6 also must:

- modestly widen/refine the primary command rail without returning to a wide sidebar-heavy layout;
- correct `How Supply Works` card geometry across desktop and compact widths;
- move the right context-panel toggle fully inside the panel header while preserving collapse/reflow/context behaviour;
- retain keyboard focus, touch target size, reduced motion, forced-colour behaviour, map resizing and `?terrain=0` fallback.

## Authoritative sequence

Completed through:

1. R3-WP1 through R3-WP3 and the production coherence/stabilisation work.
2. R3-WP3.5 through R3-WP3.8E physical-piece/landmark programme.
3. R3-WP3.9A/B/B2/B3/C plus integrated physical-map exit review.
4. R3-WP4 - Battle, Front & Strategic Event Feedback, PR #171.
5. R3-WP5 - Strategic Information Layers, PR #172.
6. R3-WP6 - Command UI/UX Overhaul, PR #173.
7. R3-WP6.5 - Interface Polish & Visual Consistency Remediation, PR #174.

Current and future:

8. **R3-WP6.6 - Command Shell Follow-up Polish & Warning Preferences** (APPROVED / NEXT)
9. R3-WP7 - Audio, Music & Atmosphere
10. R3-WP8 - Performance, Scalability, Accessibility & Resilience
11. R3-WP9 - Visual Polish & Integrated Validation
12. Integrated R3 review and human visual/UX playtest
13. Small R3.5 remediation pass if required

## Source-of-truth rule

Current `main`, this status file, `docs/roadmap/R3-ROADMAP.md`, and the active package document `docs/roadmap/R3-WP6.6-COMMAND-SHELL-FOLLOW-UP.md` take precedence over stale historical text, closed branches, old PR descriptions or earlier conversation state.

Any automated worker/supervisor must inspect these files before selecting work. If another source suggests WP3.x, WP4, WP5, WP6 or WP6.5 is still the active package, that source is stale and must not be followed.
