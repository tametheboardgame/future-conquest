# R3-WP6 - Command UI/UX Overhaul

Status: **ACTIVE / IMPLEMENTATION COMPLETE / FINAL PRODUCT-OWNER REVIEW PENDING**

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

## Product-owner review 1 - hierarchy accepted

Live visual review on 2026-08-18 accepted the first map-first hierarchy pass as **“a LOT better”** and approved continuing the direction through the remainder of WP6.

The follow-up instruction is explicit: **menus must become more icon based as well as the wider interface becoming more pictorial.** This is a locked WP6 requirement, not optional polish.

The second implementation pass extended the accepted language into the specialist workspaces:

- Logistics and Infrastructure internal mode menus became icon-first controls with small retained text captions and badges;
- summary telemetry gained pictographic category cues so it can be scanned before reading labels;
- Logistics uses source, route, stockpile, formation and territory imagery to explain supply state;
- Operations received direction/target and formation imagery;
- Territory Administration became a set of visual map dossiers rather than visually identical text cards;
- Intelligence panels gained persistent category pictograms;
- Campaign control gained a recognisable command/archive visual identity;
- visible captions and accessible button names remain present so icon use does not reduce discoverability or accessibility.

A second live review then described the propagated interface as **“looking really good”** and approved continuing into final WP6 cleanup.

PR #173 remains draft until the completed WP6 pass receives final product-owner acceptance.

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

Implemented.

- remove the runtime programme/work-package sentence from the visual header;
- reduce title/day/resolve chrome to one compact command bar;
- compress global telemetry into one shallow status line;
- convert the 96 px code-heavy left navigation into a roughly 70 px icon rail with short visible labels, badges and hover titles;
- overlay the map instruction/legend HUD on the map rather than consuming a separate horizontal band;
- retain the existing WP3.9A right-sidebar collapse behaviour;
- preserve keyboard navigation and compact-layout fallbacks.

### WP6-B - Notification and alert model

Implemented.

- logistics, adviser, enemy-action and battle notifications stop pushing the map down the page;
- notification cards default to a compact summary and expand on hover/focus where supporting detail exists;
- after-action reports have explicit dismissal while remaining available from Operations/Combat Reporting;
- logistics, adviser and enemy-action warnings have accessible dismissal controls;
- a dismissed warning remains quiet only for that continuous warning episode;
- changed warning content reappears automatically, and an identical warning that genuinely clears and later recurs is treated as a new episode;
- routine advisory information no longer permanently competes with immediate combat/supply danger.

A separate permanent notification centre was not added because the owning specialist workspaces already retain the recoverable detailed information and a new tray would risk recreating the dashboard density WP6 removes.

### WP6-C - Pictorial formations and force inspection

Implemented.

- formation cards use a UI-scale powered-infantry schematic derived from the approved visual design bible rather than a generic military icon;
- the schematic preserves the written canon's modular hard plates, visible flexible under-suit, segmented optics, restrained cyan sensor role and separately carried compact weapon;
- armour damage is communicated visually as well as numerically;
- personnel, supply, morale/readiness and current status remain available without requiring a second screen;
- selected-formation inspection uses a formation portrait/miniature plus condition cues rather than a pure definition list;
- damaged armour presentation uses the established modular/cannibalised Future Conquest armour language rather than generic red warning boxes.

### WP6-D - Pictorial infrastructure, logistics and operations

Implemented.

- engineering project cards receive a visual object/corridor header before numerical detail;
- the Infrastructure overview receives distinct pictorial repair, construction and interdiction cards so the action is recognisable before the explanatory copy is read;
- Infrastructure and Logistics internal menus use pictograms as the primary recognition cue while retaining short text captions;
- visual families distinguish repair, construction, route/network and interdiction state at UI scale;
- Logistics uses route flow, source, stockpile, formation and territory imagery rather than relying primarily on text tables;
- Operations uses formation/territory/object imagery where it improves recognition without obscuring authoritative numbers;
- Territories, Intelligence and Campaign carry the same object-led visual language.

### WP6-E - Secondary-screen coherence and responsive/accessibility pass

Implemented.

- panel, button, tab, icon, progress, condition and alert language is coherent across Forces, Operations, Territories, Infrastructure, Logistics, Intelligence and Campaign;
- specialist menus are icon-first where a stable pictogram exists, retaining a small visible caption rather than relying on unexplained icon-only controls;
- Operations, Territories, Intelligence and Campaign have pictorial recognition cues without altering authoritative data;
- duplicated explanatory prose is visually de-emphasised where the interface already communicates the state;
- explanations remain available where genuinely useful;
- icon-led controls have a strong `:focus-visible` treatment including forced-colours support;
- exact-head browser validation covers keyboard activation, visible focus, reduced motion, desktop fit, 640 px compact/touch-oriented layout, navigation target sizes and specialist-menu fit;
- deep/contextual links and consequence-proportionate confirmation remain intact.

R3-WP6.5 remains the later bounded whole-interface polish/remediation package. It must not be consumed by avoidable work that belongs to WP6 itself.

## Reference-art integrity safeguard

The inherited repository copy of `docs/art/reference/canon-armour-and-male-general.webp` is not safe to use as a runtime source asset in this WP:

- `docs/art/reference/manifest.json` declares canonical SHA-256 `711291b403dbabf792271235a213f05eae7b734261866dd870be9a4cfb396754`;
- the currently committed binary hashes to `daa3d6b5dd211a6a2693ad5023ed7ab98fc065d3354a25bd49a05c298294506d`;
- independent image decoders reject the current binary despite its RIFF/WEBP header.

WP6 therefore does **not** silently replace or redefine that canonical reference. Runtime formation imagery is a deliberately schematic UI interpretation of `docs/art/visual-design-bible-v1.md` and `docs/art/canon-generation-prompt-v1.md`. Recovering/recommitting the correct canonical binary should be treated as a separate art-asset integrity repair with the existing manifest remaining authoritative.

## Final implementation state

The completed implementation now provides:

- a map that begins near the top of the first desktop viewport and fills the reclaimed primary command stage;
- compact top-level command/status chrome rather than a stacked dashboard;
- pictographic primary navigation and icon-first specialist menus;
- an over-map instruction/legend HUD;
- dismissible, recoverable command warnings that no longer consume document flow;
- pictorial formation inspection with armour/damage state;
- pictorial infrastructure repair/build/interdiction treatments;
- visual scanning cues across Logistics, Operations, Territories, Intelligence and Campaign;
- strong keyboard focus and compact-layout behaviour without hiding the primary command categories;
- the same operational information and simulation authority as before WP6.

The legacy WP2E terrain performance benchmark was also corrected during final validation. WP6 intentionally makes the production map physically larger, which caused the old benchmark to compare different visible tile footprints and falsely report additional terrain requests as a renderer regression. The benchmark now fixes the MapLibre test surface to 1100×600 for both exact base and exact head while leaving camera, LOD, sources, tiles and renderer behaviour unchanged. Exact-head evidence records and asserts the benchmark geometry. With geometry normalised, base and WP6 head requested the same 66 terrain tiles, the same 55 unique tiles and the same transferred bytes, and the existing strict performance budgets passed without being loosened.

## Validation at implementation-complete head

Before final product-owner acceptance:

- production build passes;
- R3-WP6 source contracts pass;
- exact-head browser review passes at 1900×829 and 1366×768;
- Command Map, Forces, Infrastructure, Logistics, Operations, Territories, Intelligence and Campaign visual evidence is captured;
- notification dismissal/change/recurrence browser probe passes;
- keyboard focus, activation, control-target and 640×900 compact-layout browser probe passes;
- R3-WP3.9B map visual grading passes;
- normalised R3-WP2E exact-head terrain performance/regression gate passes with unchanged substantive regression limits;
- no simulation, balance, route topology, save-schema, geographic authority or hidden-information rule has changed.

## Acceptance criteria

WP6 is complete only when all of the following are true:

- on normal desktop play the map is unmistakably the dominant first-view surface;
- the player does not need to scroll past global dashboard chrome to begin map interaction;
- primary navigation remains permanently discoverable and keyboard operable;
- specialist menus use stable pictograms where appropriate and retain unambiguous visible/accessibility labels;
- every icon-only or icon-led interactive control has an unambiguous accessible name;
- urgent alerts are visually distinct from routine information, do not permanently consume map space and can be dismissed/collapsed or recovered from their owning workspace;
- formation and engineering/infrastructure surfaces have a meaningful pictorial first read, not merely decorative icons added beside unchanged text walls;
- Logistics, Operations, Territories, Intelligence and Campaign can be scanned by visual category/state before the player must read dense prose;
- all currently available operational information remains reachable without exposing hidden enemy information;
- existing map selection, right-sidebar collapse, route/order issue, End Day, combat reporting, logistics, engineering, save/load and contextual navigation behaviours remain functional;
- no simulation, balance, save-schema, deterministic or geographic-authority change is introduced;
- production build and repository regressions pass;
- exact-head browser review covers at least 1366×768 and a larger desktop viewport, plus keyboard/reduced-motion and compact-layout checks;
- product-owner live visual review accepts the completed WP6 hierarchy before merge.

All technical acceptance criteria are satisfied at implementation-complete state. The final item, product-owner acceptance before merge, remains deliberately open.

## Out of scope

- new simulation mechanics;
- balance changes;
- new campaign content;
- replacement of the accepted MapLibre/Copernicus/Three.js map architecture;
- hiding critical navigation behind an undiscoverable menu;
- deleting detailed data merely to make screens look cleaner;
- silently replacing an approved reference asset whose integrity cannot be demonstrated;
- large bespoke art production that belongs in a separately approved later art/content package rather than this interface overhaul.
