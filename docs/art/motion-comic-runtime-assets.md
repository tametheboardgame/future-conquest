# Motion-comic runtime asset architecture

## Current prologue

The first playable prologue contains Panels 1 to 8. Panels 9 and 10 remain planned extensions and can be appended by adding metadata to `src/game/intro-story.ts` and placing their assets in `src/assets/motion-comic/`.

Runtime images are separate from component logic. Replacing an image does not require changing the player provided its filename remains unchanged.

## Panel 7 territory variants

The player chooses a random campaign seed and the game determines the portal territory. The startup adapter detects the active portal territory and passes its territory ID to the motion-comic player.

The player automatically looks for:

`panel-07-arrival-<TERRITORY_ID>.webp`

Examples:

- `panel-07-arrival-GB-04.webp`
- `panel-07-arrival-FR-01.webp`
- `panel-07-arrival-DE-02.webp`

When no matching variant exists, it uses:

`panel-07-arrival-default.webp`

The current vertical-slice territory IDs are:

- GB-04
- FR-01
- FR-02
- FR-03
- FR-05
- BE-01
- BE-02
- NL-01
- LU-01
- DE-02
- DE-03
- DE-05
- CH-01
- CH-02
- AT-01

Vite discovers matching WebP files at build time through `import.meta.glob`, so adding a new Panel 7 variant requires no component code change.

## Editing and extension rules

- Panel order, duration, transcript, motion treatment and filename live in `src/game/intro-story.ts`.
- Playback, preload, skip, keyboard controls and reduced-motion behaviour live in `src/components/MotionComicIntro.tsx`.
- Startup, replay and new-campaign behaviour live in `src/components/StartupExperience.tsx`.
- Runtime styling lives in `src/components/motion-comic-intro.css`.
- Artwork lives in `src/assets/motion-comic/`.
- Keep text and essential information readable when assets are shown with `object-fit: contain`.
- Future clean artwork should ideally omit embedded text and render dialogue and captions as application layers. The first version uses the approved composite panels as produced.
