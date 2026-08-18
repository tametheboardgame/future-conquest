# R3-WP7 - Audio, Music & Atmosphere

Status: IN PROGRESS

Branch: `agent/r3-wp7-audio-music-atmosphere`

Base: merged R3-WP6.6 production mainline (`89c33f6e15d7a12d9bbac0a56c94a3bc946b6d0a`)

## Objective

Turn the existing Future Conquest music implementation into a coherent campaign audio layer with adaptive music, restrained atmosphere and useful order/battle/UI cues, while keeping gameplay fully usable with audio muted or unavailable.

## Protected existing system

WP7 must extend, not replace, the audio system already in production.

The following are protected behaviours and assets:

- `src/audio/audio-manager.ts` remains the central browser audio manager;
- `Black Protocol Dawn` remains the verified built-in default/title track;
- committed MP3s under `src/assets/music/` remain automatically discovered by Vite;
- the global music-track picker remains available;
- master, music and sound-effects volume controls remain available and persistent;
- mute-all remains available and persistent;
- browser-autoplay unlock behaviour remains best-effort and gesture-safe;
- music continues gracefully when optional assets are missing or playback is blocked;
- adding another committed MP3 must not require editing the audio manager.

The current authored library is the WP7 starting soundtrack:

- Black Protocol Dawn
- Protocol Zero
- Rising Tension
- Combat I
- Combat II

## Scope

### WP7.1 - Adaptive soundtrack over the existing library

Add an explicit soundtrack mode:

- Adaptive soundtrack: chooses from context playlists for title, prologue, ordinary campaign command, rising tension, combat, victory and defeat.
- Manual playlist: preserves the current player-selected starting track and playlist behaviour.

Migration must preserve a previously selected non-default track as Manual rather than silently overriding that preference.

Adaptive transitions must be presentation-only and must never influence simulation state, timing, save data, AI, combat or hidden information.

### WP7.2 - Command and battle cues

Add restrained cues for player-significant actions, including:

- movement order issued;
- attack/operation order issued;
- end-day/movement resolution;
- supply/end-turn warning;
- successful battle/capture acknowledgement;
- withdrawal/territory-loss acknowledgement;
- general command confirmation where useful.

Cues may be procedural Web Audio signals rather than additional binary assets where that provides a smaller, versioned and failure-safe implementation.

### WP7.3 - Atmosphere

Add a very low-level command-space atmosphere bed during campaign play. It must:

- remain subordinate to the soundtrack;
- follow master and effects volume controls;
- fall silent when muted;
- be autoplay-safe;
- stop or reduce appropriately outside campaign play;
- fail silently when Web Audio is unavailable.

### WP7.4 - Settings and persistence

Preserve all existing audio settings and add only the minimum new control needed for Adaptive versus Manual music behaviour.

Audio preferences remain browser-global presentation preferences and do not enter campaign saves.

### WP7.5 - Accessibility, resilience and validation

Requirements:

- gameplay remains fully understandable and operable with audio muted;
- no cue is the sole carrier of strategic information;
- missing music or unsupported Web Audio degrades silently;
- autoplay failures never block the UI;
- no audio code changes deterministic simulation outcomes;
- existing save compatibility remains intact;
- existing MP3 verification/build path remains intact;
- focused source contracts, repository tests and production build must pass before merge;
- final deployed live listening review is required before WP7 is marked accepted.

## Non-goals

WP7 does not add voice acting, speech synthesis, radio chatter, tactical positional audio, a new audio middleware dependency, combat mechanics, timing changes or simulation-owned audio state.

## Acceptance

WP7 is technically complete when:

1. all five existing tracks remain available;
2. Manual mode demonstrably preserves the existing selectable soundtrack path;
3. Adaptive mode changes musical context without requiring new campaign state;
4. order, resolve, warning and battle cues are audible when enabled and safely absent when muted/unsupported;
5. campaign atmosphere is restrained and follows existing effects/master controls;
6. title/prologue/game/victory/defeat transitions are autoplay-safe;
7. global audio settings persist independently of campaign saves;
8. source contracts, full tests and production build are green;
9. deployed live review confirms the mix is useful rather than intrusive.
