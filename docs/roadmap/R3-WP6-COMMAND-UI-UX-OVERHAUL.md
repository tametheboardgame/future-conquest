# R3-WP6 - Command UI/UX Overhaul

Status: **ACTIVE / IMPLEMENTATION STARTED**

Started: 2026-08-18

Baseline: accepted R3-WP5 `main` (`ba56b37c5488ec37fe92560011793269c0362a30`).

## Product-owner direction

The map is the main interface. The surrounding UI must stop behaving like a dashboard that happens to contain a map.

The current desktop layout has too much permanent chrome above the map: programme/version text, a large title bar, a six-part telemetry strip, logistics/adviser/threat warnings and after-action reports can collectively consume close to half of the first viewport before the player reaches the command map.

R3-WP6 changes the information architecture without removing information. The default state should show only what is needed to understand the immediate situation and issue an action. Secondary detail remains available on demand through hover/focus disclosure, contextual panels, dedicated workspaces or notifications.

The visual direction is more pictorial and object-led:

- the map remains the dominant command surface;
- the left navigation remains permanently discoverable but becomes a compact icon rail with short labels and hover titles;
- top-level status becomes compact telemetry rather than a second dashboard;
- warnings and after-action reports become overlays/notifications rather than full-width page sections;
- formation UI uses Future Conquest's approved powered-armour visual language and visual damage/readiness cues;
- engineering/infrastructure UI uses visual depictions of the object being repaired, upgraded or interdicted, such as roads, railways, crossings, bridges and tunnels;
- detailed numerical and textual information remains available when requested;
- visual reduction must not become discoverability loss.

## UX principles

1. **Map first**: desktop chrome should surrender space to the map wherever practical.
2. **Progressive disclosure**: show the immediate decision first; expose supporting detail on demand.
3. **Recognition before reading**: icons, silhouettes, condition bars, portraits and object imagery should communicate category/state before prose is required.
4. **Persistent wayfinding**: primary navigation remains visible. This is not a hidden-menu or full “zen mode” redesign.
5. **Severity earns attention**: routine information stays quiet; genuinely urgent information may interrupt, but should be dismissible or collapsible and recoverable from its owning workspace.
6. **Context over duplication**: information should appear beside the map object, formation, route or operation it concerns where possible rather than being repeated in permanent global strips.
7. **Accessibility survives simplification**: icon controls retain visible short labels where space permits, native buttons, keyboard focus, accessible names, contrast and reduced-motion behaviour.
8. **Presentation remains presentation**: no WP6 visual or disclosure state changes simulation authority, save compatibility, hidden-information rules, balance, route topology or deterministic resolution.

## Delivery slices

### WP6-A - Map-first shell and navigation

Initial implementation in this branch.

- remove the runtime programme/work-package sentence from the visual header;
- reduce title/day/resolve chrome to one compact command bar;
- compress global telemetry into one shallow status line;
- convert the 96 px code-heavy left navigation into a roughly 70 px icon rail with short visible labels, badges and hover titles;
- overlay the map instruction/legend HUD on the map rather than consuming a separate horizontal band;
- retain the existing WP3.9A right-sidebar collapse behaviour;
- preserve keyboard navigation and compact-layout fallbacks.

### WP6-B - Notification and alert model

Started in the initial implementation; completion follows live review of WP6-A.

- logistics, adviser, enemy-action and battle notifications stop pushing the map down the page;
- notification cards default to a compact summary and expand on hover/focus or explicit activation;
- after-action reports gain explicit dismissal while remaining available from Operations/Combat Reporting;
- introduce a consistent notification priority model so routine advisory information cannot visually compete with immediate combat/supply danger;
- if a notification centre/tray is required after live review, it should provide recall without recreating a permanent top-of-page dashboard.

### WP6-C - Pictorial formations and force inspection

Initial roster and inspection treatment begins in this branch.

- formation cards use a UI-scale powered-infantry schematic derived from the approved visual design bible rather than a generic military icon;
- the schematic preserves the written canon's modular hard plates, visible flexible under-suit, segmented optics, restrained cyan sensor role and separately carried compact weapon;
- armour damage is communicated visually as well as numerically;
- personnel, supply, morale/readiness and current status remain available without requiring a second screen;
- selected-formation inspection evolves towards a formation portrait/miniature plus condition zones rather than a pure definition list;
- damaged armour presentation uses the established modular/cannibalised Future Conquest armour language rather than generic red warning boxes.

### WP6-D - Pictorial infrastructure, logistics and operations

Initial infrastructure-card treatment begins in this branch.

- engineering project cards receive a visual object/corridor header before numerical detail;
- the Infrastructure overview receives distinct pictorial repair, construction and interdiction cards so the action is recognisable before the explanatory copy is read;
- authored visual families should distinguish road, rail, bridge/crossing, tunnel, mountain route, port/air/logistics hub and damaged/repairing/upgraded state;
- logistics should use route flow, stockpile, transport and hub imagery rather than relying primarily on text tables;
- operation/battle cards should use formation/territory/object imagery where it improves recognition without obscuring authoritative numbers.

### WP6-E - Secondary-screen coherence and responsive/accessibility pass

- unify panel, button, tab, icon, progress, condition and alert language across Forces, Operations, Territories, Infrastructure, Logistics, Intelligence and Campaign;
- remove duplicated explanatory prose where the interface already communicates the same state;
- retain explanations through contextual help where genuinely useful;
- validate keyboard focus order, screen-reader names, contrast, 1366×768 desktop fit, larger desktop layouts, compact/touch layouts and reduced motion;
- preserve deep/contextual links and consequence-proportionate confirmation.

R3-WP6.5 remains the later bounded whole-interface polish/remediation package. It must not be consumed by avoidable work that belongs to WP6 itself.

## Reference-art integrity safeguard

The inherited repository copy of `docs/art/reference/canon-armour-and-male-general.webp` is not safe to use as a runtime source asset in this WP:

- `docs/art/reference/manifest.json` declares canonical SHA-256 `711291b403dbabf792271235a213f05eae7b734261866dd870be9a4cfb396754`;
- the currently committed binary hashes to `daa3d6b5dd211a6a2693ad5023ed7ab98fc065d3354a25bd49a05c298294506d`;
- independent image decoders reject the current binary despite its RIFF/WEBP header.

WP6 therefore does **not** silently replace or redefine that canonical reference. Runtime formation imagery is a deliberately schematic UI interpretation of `docs/art/visual-design-bible-v1.md` and `docs/art/canon-generation-prompt-v1.md`. Recovering/recommitting the correct canonical binary should be treated as a separate art-asset integrity repair with the existing manifest remaining authoritative.

## Initial implementation target

The first WP6 build intentionally establishes the hierarchy before attempting bespoke art for every secondary screen:

- map begins near the top of the first desktop viewport rather than after several stacked information bands;
- the terrain/map surface fills the reclaimed primary command stage rather than leaving a dead strip beneath it;
- alerts are removed from normal document flow and behave as compact command notifications over the map while the map is active;
- left navigation becomes pictographic and narrower;
- map instruction/legend becomes an over-map HUD;
- formation roster and selected-formation inspection begin using canon-derived powered-armour schematics plus visual damage state;
- active engineering cards and the Infrastructure overview receive pictorial corridor/repair/build/interdiction treatments;
- detailed data and the existing specialist workspaces are retained.

This first build should be visually reviewed before expanding the same language across every secondary panel. The purpose of the review is to validate hierarchy and interaction cost, not to decide whether the old dense layout should be preserved.

## Acceptance criteria

WP6 is complete only when all of the following are true:

- on normal desktop play the map is unmistakably the dominant first-view surface;
- the player does not need to scroll past global dashboard chrome to begin map interaction;
- primary navigation remains permanently discoverable and keyboard operable;
- every icon-only or icon-led interactive control has an unambiguous accessible name;
- urgent alerts are visually distinct from routine information, do not permanently consume map space and can be dismissed/collapsed or recovered from their owning workspace;
- formation and engineering/infrastructure surfaces have a meaningful pictorial first read, not merely decorative icons added beside unchanged text walls;
- all currently available operational information remains reachable without exposing hidden enemy information;
- existing map selection, right-sidebar collapse, route/order issue, End Day, combat reporting, logistics, engineering, save/load and contextual navigation behaviours remain functional;
- no simulation, balance, save-schema, deterministic or geographic-authority change is introduced;
- production build and repository regressions pass;
- exact-head browser review covers at least 1366×768 and a larger desktop viewport, plus keyboard/reduced-motion checks;
- product-owner live visual review accepts the hierarchy before merge.

## Out of scope

- new simulation mechanics;
- balance changes;
- new campaign content;
- replacement of the accepted MapLibre/Copernicus/Three.js map architecture;
- hiding critical navigation behind an undiscoverable menu;
- deleting detailed data merely to make screens look cleaner;
- silently replacing an approved reference asset whose integrity cannot be demonstrated;
- large bespoke art production that belongs in a separately approved later art/content package rather than this interface overhaul.
