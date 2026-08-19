# R3-WP9 Visual Polish & Integrated Validation

## Status

**In progress.**

R3-WP9 is the final R3 player-facing audit and release gate. It begins from `main` after R3-WP8 merged on 19 August 2026. The starting main revision was `984f1ea1e65338e0c7a92aa5cb9d1227e729fbf4`.

This work package is deliberately validation-led. It must not change simulation rules, balance authority, campaign outcomes or save semantics merely to make presentation checks pass. Any blocker found by the integrated gate should be fixed as a focused defect and revalidated against the same gate.

## R3-WP9 acceptance map

### Typography, spacing, scale and scene cohesion

Automated browser evidence re-runs the late-R3 presentation paths together rather than relying on package-local evidence alone:

- R3-WP4 active battle and concluded-battle feedback;
- R3-WP5 strategic information layers;
- R3-WP6 map-first command shell, notification disclosure and keyboard access;
- R3-WP6.5 desktop, compact and reduced-motion interface polish;
- specialist command workspaces swept by the WP6.5 browser probe.

The resulting screenshots and evidence files are uploaded from the exact validation head for owner review.

### Small-screen, reduced-motion and accessibility

The final gate carries forward the R3-WP6.5 browser checks and R3-WP8 source contracts. These cover compact layout overflow, keyboard focus, reduced-motion handling, non-colour interaction cues, colour-blind assistance and deterministic high-density marker decluttering.

### Onboarding and readability

The WP6.5 browser evidence verifies the tutorial at normal desktop and 640x900 compact sizes, confirms no obsolete Forward action is presented, and checks the tutorial remains within the viewport. The command-shell sweep verifies the persistent navigation and specialist workspaces remain readable without horizontal overflow.

### Save/load and session continuity

`scripts/probe-r3-wp9-session-continuity.mjs` performs a player-level browser cycle:

1. enter the campaign from the launcher;
2. create a distinct Hard campaign with the guided tutorial disabled;
3. make a Manual Save through the Campaign workspace;
4. verify the manual save slot was written with a valid day, seed and difficulty;
5. reload the entire application;
6. verify `CONTINUE CAMPAIGN` is offered;
7. continue through the launcher and wait for the normal `Game loaded` feedback;
8. verify the restored Campaign status has the saved day, seed and difficulty.

This supplements the existing persistence unit and UI contracts, including the separate Manual Save and Autosave slot protections.

### Representative campaign traces

The final gate runs the current-engine balance authority with four runs per start, a 120-day ceiling and a fixed seed offset, then records representative stalled-campaign traces using `scripts/trace-current-engine-balance.mjs`.

The purpose is regression detection and campaign-shape evidence. R3-WP9 does not rebalance the game.

### Performance and maintainability

The gate runs the complete regression suite, the R3 terrain performance contracts, the production build and the static terrain payload budget check. Visual behaviour continues to use the existing presentation modules and probes rather than introducing a parallel release-only rendering path.

The package-specific checks remain individually usable. WP9 is an orchestration layer over those authorities plus the missing session-continuity browser path.

## Automated release gate

`.github/workflows/r3-wp9-integrated-validation.yml` runs on:

- every pull request targeting `main`;
- every push to `main`;
- manual dispatch.

For pull requests it checks out the exact PR head. For `main` pushes it checks out the exact pushed SHA. The workflow has three independent jobs:

- regression/build/performance contracts;
- integrated browser evidence and session continuity;
- representative current-engine campaign traces.

A WP9 release-gate result is valid only for the SHA shown by the workflow run.

## Deployed-main verification

R3-WP9 does not create a second deployment mechanism. The existing `.github/workflows/deploy-pages.yml` workflow remains authoritative for production deployment and already performs a post-deploy check that the live GitHub Pages build identifies the exact `github.sha` deployed from `main`.

The final R3 deployed-main exit criterion is satisfied only after the WP9 branch has been merged, the WP9 gate is green for the resulting current `main` SHA, and the existing production deployment workflow successfully verifies that same `main` revision live.

## Owner review checklist

Owner review remains **pending** until the integrated browser artefacts are available from the WP9 pull request.

Review the exact-head evidence and confirm:

- [ ] the command map remains the dominant interface at 1900x829 and 1366x768;
- [ ] the 640x900 compact presentation has no material clipping, overlap or horizontal overflow;
- [ ] typography, spacing and visual scale feel consistent across map, battle feedback and specialist workspaces;
- [ ] strategic information layers are readable without overwhelming the physical map;
- [ ] battle and strategic-event cues are understandable and dismissible where appropriate;
- [ ] tutorial/onboarding presentation is readable at desktop and compact sizes;
- [ ] keyboard focus and non-colour cues remain visible;
- [ ] reduced-motion presentation remains coherent;
- [ ] Manual Save, full reload and Continue Campaign restore the same campaign visibly;
- [ ] no material browser-console or page errors appear in the integrated evidence;
- [ ] the overall R3 presentation feels like one coherent product rather than a collection of work-package demos.

## Exit criteria

R3-WP9 can be marked complete only when all of the following are true:

- owner review above is completed;
- no material browser smoke, save/load or visual-readability blocker remains;
- the R3-WP9 integrated validation workflow is green on current `main`;
- the existing production deployment workflow has successfully verified the same current `main` revision live.

Until those conditions are met, this document remains the active R3-WP9 review record rather than a completion declaration.
