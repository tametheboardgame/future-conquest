# R3-WP6.6 - Command Shell Follow-up Polish & Warning Preferences

Status: **APPROVED / NEXT**

Approved: 2026-08-18

Depends on: R3-WP6 and R3-WP6.5 merged/accepted command-shell baseline.

## Objective

Deliver a focused follow-up polish pass to resolve the remaining command-shell usability issues identified during live review immediately after R3-WP6.5.

WP6.6 is presentation- and UX-led. The only new persistent state permitted by this package is player-facing warning preference state. It must not alter campaign simulation, logistics calculations, balance, geography, route topology, combat resolution, hidden-information authority or deterministic game outcomes.

## Product-owner review findings

The accepted WP6/WP6.5 direction is substantially improved, but live review identified four concrete follow-up issues:

1. the left primary navigation rail is now slightly too narrow and feels cramped;
2. the `How Supply Works` cards have visible icon/heading/body alignment inconsistencies;
3. the right command-context panel collapse/expand control still reads as external to the panel, whereas it should sit inside the panel header;
4. the end-turn logistics warning needs player-controlled suppression and a direct route to warning settings.

These findings define the package. WP6.6 is not a new interface redesign.

---

## WP6.6A - Left navigation rail refinement

Increase the effective primary rail width modestly so the permanent command navigation remains compact without looking squeezed.

Requirements:

- retain the icon-first command-rail language established by WP6;
- give labels, icons and badges more breathing room;
- preserve stable equal tile sizing and visual centring;
- preserve or improve the current minimum interactive-target contract;
- avoid returning to the pre-WP6 wide/sidebar-heavy interface;
- retain keyboard focus, touch usability, forced-colour support and compact-layout behaviour;
- no new horizontal overflow or viewport clipping at supported widths.

The implementation should be judged by the live result rather than by a preselected pixel width. The rail should feel deliberate and readable while still surrendering the majority of screen width to the map/workspace.

---

## WP6.6B - `How Supply Works` alignment correction

Correct the internal geometry of the supply-explanation cards so the icon frame, title and descriptive copy read as one consistent component.

Requirements:

- use one shared layout grid for all cards;
- align icon boxes consistently;
- align headings and body text consistently relative to the icon;
- remove baseline drift, overlapping text or uneven vertical padding;
- preserve all current explanatory content and logistics meaning;
- validate normal desktop, 1366-class laptop and compact layouts.

This is a presentation correction only. Supply calculations, allocation doctrine and logistics authority remain unchanged.

---

## WP6.6C - Right context-panel header integration

Move the existing collapse/expand control fully inside the right-hand context-panel header.

Required presentation:

- the control sits inside the same panel/header box as `COMMAND MAP` or the applicable context title;
- the title is shifted/recomposed as necessary so button and title form one coherent header row;
- the control no longer floats outside the panel boundary or appears half over the map;
- expanded/collapsed state remains visually obvious;
- control remains keyboard accessible, touch usable and strongly focus-visible;
- collapse continues to reclaim map width without losing the selected formation/territory/context;
- renderer resize/reflow and `?terrain=0` fallback behaviour remain stable.

This package changes presentation and control placement, not the underlying context-selection model.

---

## WP6.6D - Warning preferences and end-turn logistics warning controls

Extend the current end-turn logistics warning so players can suppress repetitive advisory warnings without disabling genuinely critical game-protective messages by accident.

### Modal actions

The logistics/end-turn warning should provide:

- the existing safe return/review actions;
- a clear `Don't show this warning again` control for the specific warning class;
- a `Warning settings` / `Manage warnings` action that opens Settings directly to the relevant warning-preferences section;
- the existing explicit proceed/resolve action where applicable.

The suppression control must be understandable and reversible.

### Preference model

Support two levels of preference:

1. **Per-warning suppression**
   - a player can suppress a specific repeat advisory warning, for example territorial source-capacity exhaustion;
   - suppression persists across reloads;
   - each suppressible warning must have a stable explicit identifier rather than relying on display text matching.

2. **General warning behaviour**
   - Settings exposes a dedicated Warning Preferences section;
   - the player can restore default warning behaviour easily;
   - Settings should support at minimum an all-warnings/default mode and a reduced-advisory mode, with selected-warning suppression shown clearly;
   - exact UI wording may be refined during implementation for clarity.

### Critical-warning rule

Warning preference state controls presentation only. It must not suppress a warning that is classified as critical/game-protective unless that warning type has been explicitly approved as suppressible.

The implementation therefore needs an explicit warning severity/suppressibility contract, for example:

- advisory/repeat warning: may be suppressed;
- important warning: may be configurable if explicitly permitted;
- critical/end-state/data-integrity warning: always eligible to surface.

Do not infer criticality from colour or copy. It must be represented explicitly in the warning definition/configuration.

### Persistence and save boundaries

- Warning preferences are player/UI preferences, not campaign simulation state.
- Prefer browser-local preference persistence consistent with the existing Settings model.
- Do not add warning preferences to deterministic campaign resolution inputs.
- Existing campaign saves must continue to load unchanged.
- If a preference store is unavailable/corrupt, fall back safely to normal warning display.

---

## Non-goals

WP6.6 must not:

- redesign the whole command shell again;
- change logistics throughput, source capacity, network delivery or carried-stock calculations;
- alter the conditions under which a logistics problem exists;
- change combat, AI, operations, territory ownership or end-turn resolution;
- permanently suppress critical warnings without a separately approved rule;
- add a new notification centre/tray merely to support this package;
- reopen the accepted physical-map or terrain architecture;
- modify save schema except if an unavoidable compatibility-safe UI metadata mechanism is separately justified and approved.

---

## Acceptance criteria

### Left rail

- The primary rail is visibly less cramped than the accepted WP6.5 baseline.
- Icons, labels and badges remain centred/readable.
- Interactive target-size/accessibility checks pass.
- No supported viewport gains horizontal overflow or clipped navigation.

### Supply explanation cards

- All `How Supply Works` cards share consistent icon/title/body geometry.
- No heading or body copy visibly collides with the icon frame.
- Alignment remains coherent across desktop and compact layouts.

### Right context panel

- Collapse/expand control is fully inside the panel header.
- Header title and control form one visually coherent row.
- Collapse still returns width to the map and preserves context.
- Mouse, touch and keyboard operation remain valid.

### Warning preferences

- End-turn logistics warning includes a specific `don't show again` path.
- Modal includes direct access to warning-related Settings.
- Suppressing a specific advisory warning prevents that warning from reappearing according to its explicit preference rule.
- Preference survives reload.
- Settings exposes current warning preference state and a clear reset/default action.
- Critical/non-suppressible warnings remain surfaceable regardless of advisory suppression.
- Campaign simulation outcome is identical with warning preferences on or off.

### Regression protection

- Existing WP6/WP6.5 command-shell source contracts remain green unless deliberately superseded by a stricter WP6.6 contract.
- Full deterministic regression suite passes.
- Production build passes.
- No new console errors are introduced.
- Map default launch, map resizing, sidebar context preservation, `?terrain=0`, reduced motion and keyboard navigation remain intact.

---

## Browser and visual evidence

Exact-head evidence must include at minimum:

- 1900x829 command map with the widened left rail and right panel expanded;
- 1366x768 command map with the same state;
- 640x900 compact layout;
- Logistics `How Supply Works` view showing all alignment-corrected cards;
- right context panel expanded and collapsed states;
- end-turn logistics warning with the new preference controls;
- Settings opened directly to Warning Preferences;
- reload/persistence proof for a suppressed advisory warning;
- proof that an explicitly non-suppressible critical-warning fixture still appears.

Automated geometry assertions should cover rail target size, panel-header button containment and supply-card alignment where robust measurements are practical.

---

## Risk and mitigation

Overall risk: **LOW TO MODERATE**.

Primary behavioural risk is incorrect suppression of warnings. Mitigate through explicit warning identifiers, explicit severity/suppressibility metadata, persistence tests and a fail-open/default-show behaviour when preference data is missing or invalid.

Primary visual risk is reintroducing cramped or overflow-prone shell geometry. Mitigate through the existing WP6/WP6.5 exact-head viewport matrix and inherited accessibility gates.

---

## Definition of done

R3-WP6.6 is complete when:

- all four live-review findings are implemented;
- warning preferences are persistent, reversible and severity-safe;
- source, regression, build, browser, accessibility and visual-evidence gates are green;
- the deployed/live command shell is visually accepted by the product owner;
- the package is merged before R3-WP7 begins.
