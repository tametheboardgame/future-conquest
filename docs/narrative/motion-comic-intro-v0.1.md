# Future Conquest motion-comic intro v0.1

## Purpose

Introduce the campaign premise before campaign creation without resolving the central ambiguity: the General believes present-day Europe contains the catalyst for a future catastrophe, but neither the player nor the expedition can know whether intervention prevents that future or creates it.

The intro should establish urgency, scale and moral uncertainty. It should not explain the final enemy, name the catalyst or present the future command as unquestionably correct.

## Target format

- Skippable motion comic, approximately 75 seconds
- 10 illustrated panels in 16:9
- Slow cinematic movement rather than full animation
- Optional captions and voice-over using the same script
- Replayable from the main menu
- Reduced-motion mode and persistent skip control
- No dependency on the in-game tutorial

## Visual direction

Grounded military graphic novel with painterly realism. The ruined future is cold, ash-filled and desaturated, with hard white tactical light and muted cyan technology. Present-day Europe is warmer and more recognisable, but increasingly contaminated by the portal's violet-white light.

Faces should be partially obscured by shadow, helmets, smoke or framing. This preserves visual consistency between generated panels and keeps the General more symbolic than heroic.

The future force should appear formidable but finite: powered armour is scarred, field-repaired and visibly degrading. The soldiers are not pristine superheroes. Their strength is exceptional, but their expedition is an irreversible gamble.

## Sequence

### Panel 1: The world that remains

Visual: A shattered future European city at dawn. Floodwater, collapsed towers, burning districts and distant weapons fire. A lone armoured soldier crosses the foreground carrying a damaged energy rifle.

Caption: `THE FUTURE DID NOT END IN A SINGLE DAY.`

Motion: Slow push through drifting ash; distant fires pulse; water ripples.

Duration: 7 seconds.

### Panel 2: The final command

Visual: Subterranean command centre. The General faces a fractured holographic map of Europe. Staff officers and casualty projections surround the table. The General is mostly silhouette.

Caption: `IT WAS LOST ONE DECISION AT A TIME.`

Motion: Hologram flicker; casualty figures climb; camera arcs slightly behind the General.

Duration: 7 seconds.

### Panel 3: The anomaly

Visual: Scientists and intelligence officers isolate a temporal rupture in archived data. A bright line connects the ruined future to present-day Europe. The exact target remains obscured by corrupted information.

Caption: `THEN WE FOUND THE BREAK IN HISTORY.`

Motion: Scanning lines; fragments align; one date sharpens while the target remains redacted.

Duration: 7 seconds.

### Panel 4: The hypothesis

Visual: Split composition. On one side, future devastation. On the other, peaceful present-day European streets, railways and cities. Between them sits an unidentified branching event.

Voice-over: `Somewhere in the past, a catalyst turned crisis into extinction.`

Caption: `A CAUSE. A PLACE. A CHANCE.`

Motion: Branching timelines expand, then collapse into one pulsing point.

Duration: 7 seconds.

### Panel 5: The order

Visual: The General addresses assembled commanders in a cavernous deployment bay. Rows of powered infantry disappear into darkness. Armour is marked, repaired and mismatched.

Voice-over: `We cannot reinforce you. We cannot bring you home.`

Caption: `ONE HUNDRED THOUSAND SOLDIERS. NO SECOND WAVE.`

Motion: Hangar lights activate sequentially; helmet optics illuminate across the formation.

Duration: 8 seconds.

### Panel 6: The portal

Visual: A colossal circular rupture opens inside a ruined industrial complex. Energy bends rain and debris toward it. Soldiers brace as the first units enter.

Voice-over: `Secure the continent. Find the catalyst. Change what follows.`

Caption: `THE EXPEDITION BEGAN.`

Motion: Violent parallax; debris lifts; portal light overwhelms the frame.

Duration: 8 seconds.

### Panel 7: Arrival

Visual: The portal erupts into present-day Europe near a major transport corridor. Civilians flee, emergency vehicles converge and future infantry establish a perimeter without firing.

Caption: `THE PAST WAS NOT WAITING TO BE SAVED.`

Motion: Emergency lights; rotor shadows; troops move in layered silhouette.

Duration: 8 seconds.

### Panel 8: First response

Visual: Rapid montage panel showing military mobilisation, emergency broadcasts, satellite tracking and governments attempting to identify the invading force.

Voice-over: `Every border will close. Every army will respond.`

Caption: `TO THEM, YOU ARE THE CATASTROPHE.`

Motion: Broadcast cuts, map overlays, mobilisation arrows and escalating alert colours.

Duration: 7 seconds.

### Panel 9: The burden of command

Visual: Field command vehicle overlooking the portal perimeter. A tactical display shows Europe divided into operational territories. The player viewpoint stands behind the command table.

Voice-over: `Win quickly enough to alter history. Restrain the war you are starting.`

Caption: `CONQUEST IS THE METHOD. SURVIVAL IS THE CLAIM.`

Motion: Camera moves towards the tactical map until it resembles the game interface.

Duration: 8 seconds.

### Panel 10: Title and uncertainty

Visual: The tactical map darkens. The Future Conquest title appears over Europe while the portal burns at the first controlled territory.

Voice-over: `If we fail, our world dies. If we succeed... it may never have existed.`

Caption: `FUTURE CONQUEST`

Motion: Title resolves from map grid lines; final low-frequency portal pulse; transition into campaign setup.

Duration: 8 seconds.

## Artwork package

Each panel should be produced as a layered source composition where practical:

- Background plate
- Midground environment or formation
- Foreground character or debris layer
- Light, smoke, particles and portal effects
- Optional separate tactical graphics layer

Recommended source size: 3840 x 2160. Runtime assets should be exported as compressed 1920 x 1080 WebP, with smaller responsive variants if required.

## Motion language

- Slow push, pan and limited depth parallax
- Hold on strong compositions rather than constant movement
- Animated smoke, ash, rain, scanning light and holographic interference
- One or two purposeful hard cuts during the portal and response montage
- No character lip-sync in the first version
- Avoid rapid flashing; portal pulses must remain accessibility-safe

## Audio direction

- Low industrial drone in the future
- Sparse radio fragments and distant impacts
- Portal sequence introduces sub-bass, electrical strain and choral texture
- Present-day arrival adds sirens, rotors and radio traffic
- Music stops briefly before the final line, then resolves into the title theme

The first implementation can ship without voice acting. Captions must carry the complete narrative.

## Implementation approach

1. Build the intro as an isolated React component with panel metadata, timing, keyboard controls, skip and reduced-motion behaviour.
2. Use temporary graphic-novel placeholder compositions to validate pacing and transitions.
3. Produce a consistent concept sheet for the General, future infantry, portal and ruined-future visual language.
4. Generate and review the ten final panel compositions.
5. Optimise assets and integrate the intro before campaign creation.
6. Add replay control and a local preference recording whether the intro has already been seen.

## Acceptance criteria

- The premise is understandable without prior project knowledge.
- The General's reasoning is credible but not proven correct.
- The expedition's finite strength and lack of reinforcements are explicit.
- Present-day defenders are framed as rational actors, not villains.
- The intro transitions naturally into campaign setup.
- It remains usable on mobile and can be skipped immediately.
- Reduced-motion users receive fades and static compositions instead of parallax.
