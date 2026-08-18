# R3-WP6.5 - Interface Polish & Visual Consistency Remediation

Status: **APPROVED / NEXT**

Added: 2026-08-18

Baseline: merged R3-WP6 command UI/UX overhaul, PR #173, merge commit `c479e8058f450ed0196192f103590414514b5336`.

Sequence: **R3-WP6.5 is the next R3 package to execute, immediately before R3-WP7.**

## Purpose

R3-WP6 established the accepted map-first, pictorial and icon-first command interface. The live post-merge review confirmed that the overall direction is good, but exposed a bounded set of small layout, anchoring, sizing and consistency problems that should be corrected before audio/atmosphere work begins.

WP6.5 is therefore a focused whole-interface polish/remediation pass. It is **not** another redesign. The accepted WP6 information architecture, map-first hierarchy, icon-led navigation and simulation/presentation boundaries remain authoritative.

## Product-owner findings to resolve

### 1. Tutorial progression and modal sizing

- Remove the tutorial **Forward** button.
- Tutorial progression must remain action-driven: completing the highlighted game action advances the tutorial.
- Retain **Back** and **Skip tutorial** only where relevant.
- The tutorial panel should use natural/content-driven height on normal desktop screens.
- Internal scrolling should appear only when the available viewport is genuinely too small for the content.
- Avoid a permanently oversized modal with unnecessary scroll space.
- Recheck tutorial button alignment, footer spacing, copy width and highlighted-action messaging after the change.

### 2. Duplicate map attribution/copyright treatment

- Remove the current duplicate attribution presentation at the bottom of the map.
- Keep one complete, compliant attribution treatment for Copernicus/other required map sources.
- Ensure the surviving attribution is visually quiet, legible and anchored consistently.
- It must not collide with map controls, bottom overlays, terrain labels or command panels.

### 3. Map HUD/top-of-map compaction

- Remove or materially reduce the redundant **3D TERRAIN COMMAND MAP** presentation if it adds no useful player information.
- Shrink the associated top-of-map box/band so it does not consume unnecessary width or height.
- Remove unintended empty bands or dead space between top telemetry and the map.
- Recheck legend, camera/layer controls and map title/HUD placement as one composition rather than independent floating boxes.

### 4. Sidebar collapse control integration

- Embed the right command/sidebar collapse-expand control into the panel edge rather than leaving it visually floating beside the panel.
- The control should clearly read as part of the panel it operates.
- Preserve keyboard accessibility, accessible naming, hit target size and existing collapse behaviour.
- Ensure the control does not cover map controls or panel content at any supported viewport.

### 5. Settings control anchoring

- Anchor Settings firmly within the top command bar/header layout.
- It must not float over or overlap telemetry, panels, tooltips or the command map.
- Recheck tooltip placement and collision around the settings control.
- Preserve access to all existing settings and keyboard behaviour.

### 6. Top telemetry alignment

- Correct the visibly misaligned **Network Supply** percentage/value.
- Audit all top telemetry cells for consistent baseline, vertical centring, number size, label spacing and cell padding.
- Ensure warning colour/state does not change the metric's alignment or dimensions.
- Recheck the relationship between telemetry, End Day/Resolve control and Settings at 1366-wide desktop as well as larger screens.

### 7. Primary left navigation rail sizing and placement

- Stop stretching navigation items vertically to fill the available screen height.
- Use fixed or tightly bounded tile/item dimensions so icons and captions remain visually consistent.
- Maintain consistent spacing between command categories and badges.
- Centre the navigation rail vertically against the main command/map area where practical.
- The rail may visually overlap the map plane if this produces a cleaner command-console composition, provided map interaction remains usable and the rail remains permanently discoverable.
- On short screens, prefer controlled scrolling or a deliberate compact spacing mode rather than distorting individual menu items.
- Preserve the icon-first WP6 direction, short visible captions, hover titles, badges, accessible names and keyboard navigation.

## Full visual consistency sweep

In addition to the explicit product-owner findings above, WP6.5 must perform a systematic visual audit across Command Map, Forces, Operations, Territories, Infrastructure, Logistics, Intelligence, Campaign and tutorial/overlay states.

The audit should look for and correct small inconsistencies including:

- panel edge and grid alignment;
- inconsistent padding, gaps and vertical rhythm;
- stray 1-2 px baseline or border offsets;
- buttons that appear detached from the surface they control;
- floating controls without a clear anchor;
- accidental overlaps between tooltips, controls, alerts and panels;
- inconsistent badge positioning or sizing;
- inconsistent icon scale or optical centring;
- duplicated labels or redundant chrome;
- unnecessary empty bands/dead space;
- inconsistent panel header heights;
- map-control collisions at common desktop sizes;
- inconsistent hover/focus/selected states;
- scrollbars appearing when content should naturally fit;
- missing scroll containment when content genuinely cannot fit;
- compact/mobile layouts where elements stretch or distort rather than reflow cleanly;
- attribution, legend and map-key positioning;
- visual regressions introduced by WP6 progressive-disclosure behaviour.

## UX rules retained from WP6

WP6.5 must preserve the accepted WP6 rules:

1. The map is the primary command surface.
2. Primary navigation remains permanently discoverable.
3. Menus remain icon-first/pictorial with concise supporting text rather than reverting to dense text menus.
4. Detail is progressively disclosed rather than permanently occupying map space.
5. Important alerts may interrupt, but they must not permanently consume layout space.
6. Accessibility and discoverability must not be sacrificed for visual minimalism.
7. Presentation changes cannot alter simulation authority, save state, balance, hidden-information rules, geography or deterministic resolution.

## Validation and acceptance

WP6.5 is complete only when:

- tutorial progression no longer presents a redundant Forward action;
- the tutorial modal fits normal desktop screens without unnecessary internal scrolling and still scrolls safely on genuinely constrained screens;
- exactly one required map attribution treatment is visible;
- the redundant top-of-map title/band has been removed or compacted and no dead strip remains;
- the sidebar collapse control is visually integrated with its panel;
- Settings is anchored and does not overlap neighbouring UI;
- Network Supply and all other telemetry align consistently;
- primary left-rail items have stable dimensions and no longer stretch awkwardly with viewport height;
- all primary and specialist navigation remains icon-led, readable, keyboard operable and accessible;
- no obvious panel/control/tooltip overlap remains at the validated viewports;
- the whole-interface visual sweep has been performed and documented, not just the seven named fixes;
- exact-head browser evidence covers at least 1900x829, 1366x768 and 640x900, including tutorial-open and map-active states;
- reduced-motion and keyboard/focus checks remain green;
- production build and relevant map/performance regression gates pass;
- no simulation, balance, save-schema, geography, route-topology or hidden-information behaviour changes;
- product-owner live visual review accepts the final polish pass before merge.

## Out of scope

- another major command-UI redesign;
- new gameplay mechanics;
- balance changes;
- new map architecture;
- replacement of MapLibre/Copernicus/Three.js;
- large bespoke art production;
- audio/music work, which remains R3-WP7;
- unrelated feature additions discovered during the polish pass unless separately approved.

## Next package after completion

After WP6.5 is accepted and merged, proceed to **R3-WP7 - Audio, Music & Atmosphere**.