# Motion-comic runtime asset architecture

## Current prologue

The first playable prologue contains Panels 1 to 8 and runs before operational command on a new campaign. It is skippable, pausable and replayable. Panels 9 and 10 remain planned extensions and can be appended through `src/game/intro-story.ts`.

Runtime images are separate from component logic. Replacing an image does not require changing the player provided its filename remains unchanged.

## Asset priority

For each panel the runtime checks, in order:

1. A normal binary WebP file, for example `panel-01-world-that-remains.webp`.
2. A bootstrap base64 text file with the same name plus `.b64`, for example `panel-01-world-that-remains.webp.b64`.

This lets the first implementation carry lightweight embedded assets while later work replaces them with full-resolution binary WebP files without altering the component or deleting the fallback immediately.

The committed `.webp.b64` artwork is deliberately compressed for the first playable implementation. Production-quality replacements should retain the stable filenames and use the highest practical WebP resolution and quality.

## Panel 7 territory variants

The player chooses a random campaign seed and the game determines the portal territory. The startup adapter detects the active portal territory and passes its territory ID to the motion-comic player.

The player automatically looks for:

`panel-07-arrival-<TERRITORY_ID>.webp`

Examples:

- `panel-07-arrival-GB-04.webp`
- `panel-07-arrival-FR-01.webp`
- `panel-07-arrival-DE-02.webp`

A base64 fallback with `.b64` appended is also supported. When no matching territory variant exists, the player uses `panel-07-arrival-default.webp` or its `.b64` fallback.

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

Vite discovers matching assets at build time through `import.meta.glob`, so adding a correctly named Panel 7 variant requires no component code change.

## Editing and extension rules

- Panel order, duration, transcript, motion treatment and filename live in `src/game/intro-story.ts`.
- Playback, preloading, skip, keyboard controls and reduced-motion behaviour live in `src/components/MotionComicIntro.tsx`.
- Startup, replay and new-campaign behaviour live in `src/components/StartupExperience.tsx`.
- Runtime styling lives in `src/components/motion-comic-intro.css`.
- Artwork lives in `src/assets/motion-comic/`.
- Keep text and essential information readable when assets are shown with `object-fit: contain`.
- Future clean artwork should ideally omit embedded text and render dialogue and captions as application layers. The first version uses the approved composite panels as produced.
