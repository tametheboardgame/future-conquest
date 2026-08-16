# R3-WP3.9B2 - Physical Terrain Colour Pass

Status: **APPROVED / NEXT / WP4 BLOCKING**

Approved by product owner: 2026-08-16

Parent programme: `docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md`

Preceding baseline: R3-WP3.9B and its border-led ownership refinement are merged and accepted. The command map now uses a neutral physical terrain surface, high-detail coastline geometry, no broad political territory wash, and strong controller-coloured borders. Product-owner live review confirmed that shoreline and ownership clarity are materially improved, while identifying the remaining problem: the physical terrain itself is still too uniform, grey and murky.

## Objective

Transform the accepted physical-map surface from a mostly uniform neutral relief into a **stylised satellite-inspired physical terrain treatment** with clear natural colour and land-cover variation, while preserving the strategic readability and border-led ownership language already accepted in WP3.9B.

The approved visual target is the product-owner mock-up generated during live review on 2026-08-16: a richer physical map in which grassland, woodland, farmland, rocky high ground, snow and water are visibly different at a glance, without becoming raw-photographic, noisy or arcade-like.

This is a presentation/terrain-material pass. It must not change gameplay geography, territory authority, routes, strategic-node positions, formation positions or simulation rules.

## Visual direction

The map should feel closer to a deliberately art-directed satellite/physical map than to a monochrome DEM.

Required terrain vocabulary:

- **grassland / mixed lowland:** recognisable natural greens rather than grey-green;
- **woodland / forest:** deeper, darker greens with enough contrast to read as wooded terrain;
- **farmland / open plains:** warmer green, olive, straw and muted earth variation so cultivated lowland does not read as one continuous colour;
- **rocky high ground:** grey, brown and stone tones tied to elevation/slope rather than political boundaries;
- **Alpine/high mountain terrain:** stronger exposed-rock contrast with restrained snow/ice-white highlights where visually appropriate;
- **sea / major water:** richer blue/slate-blue separation from land, with coastlines remaining clean;
- **rivers / drainage where available:** readable blue/cool linear detail without competing with routes or operational overlays.

The terrain should have **visible regional variation**. France, Benelux/Germany lowlands and the Alps should not look like the same material with different hillshade.

## Art-direction constraints

- Do **not** restore broad territory ownership fills or translucent political washes.
- Controller ownership remains primarily on the accepted illuminated border system.
- Do **not** simply add another full-screen colour filter, fog layer or saturation pass.
- Do **not** rely on raw, unprocessed satellite photography as the final presentation if it makes labels, miniatures or strategic overlays noisy.
- A stylised/derived land-cover solution is preferred: the game may use build-time/self-hosted land-cover or imagery-derived assets, procedural classification, elevation/slope information, or a measured combination of these.
- Any external geographic source must have acceptable licensing/provenance and must not require private runtime credentials.
- The map must continue to work from GitHub Pages/static hosting and preserve the explicit `?terrain=0` fallback.
- The final look should remain coherent with the physical board-game miniatures: richer and more natural, but still clearly a strategy-game command surface.

## Implementation investigation

Before locking the production technique, evaluate which combination gives the best visual result at acceptable cost. Candidates may include:

- elevation- and slope-derived colour ramps from the existing Copernicus GLO-30 terrain;
- self-hosted land-cover/biome classification generated at build time;
- low-frequency procedural variation to stop plains/fields reading as one flat material;
- forest/woodland masks or land-cover categories;
- snow/high-alpine masks derived from elevation, slope and region;
- preprocessed satellite/land-cover texture tiles if licensing, size and performance are acceptable;
- multi-scale treatment so Theatre, Campaign and Selected views remain coherent rather than showing one texture at every zoom.

The implementation should prefer a robust static/build-time data path over new runtime third-party dependencies.

## Strategic readability requirements

The richer terrain must not reduce the clarity gained in WP3.9B.

Preserve at minimum:

- player/enemy controller border colours and glow hierarchy;
- selected/active-combat/threat/front outlines;
- orange/red operational/front language;
- city labels and authored landmark miniatures;
- future-soldier formation miniatures;
- infrastructure markers, rail hubs and corridors;
- route and operation cues;
- coastline readability;
- Theatre/Campaign/Selected camera and LOD behaviour.

Where the richer terrain competes with an operational layer, the operational layer wins.

## Visual validation matrix

Capture and inspect at minimum:

1. **Theatre - Western/Central Europe**
   - regional colour variation must be evident without becoming noisy;
   - controller borders remain visible at strategic scale.

2. **Campaign - Channel / France / Benelux**
   - grassland/farmland/woodland variation must be visible;
   - the improved 50m coastline must remain clean;
   - London/Paris/Brussels/Amsterdam and formation pieces remain distinct.

3. **Campaign - Central Europe / Germany**
   - forests, plains and higher ground must have different material reads;
   - dense political/control borders remain legible.

4. **Campaign / Selected - Switzerland / Austria / Alps**
   - mountains must read as rock/high alpine terrain rather than grey-green hills;
   - snow/bright high-altitude accents, if used, must be restrained and geographically plausible;
   - Bern, Chur, Innsbruck and infrastructure remain readable.

5. **Threat/front-heavy operational state**
   - red/orange tactical and operational language remains dominant over terrain colour.

The product-owner-approved mock-up from the 2026-08-16 live review is the visual reference for *direction*, not a pixel-perfect requirement. The real production map must preserve its actual geography, camera, miniatures and UI.

## Performance and delivery constraints

- Preserve the existing terrain startup and camera-transition performance envelope unless a separately measured exception is explicitly approved.
- Do not inflate the terrain JavaScript bundle with large imagery/land-cover datasets; large presentation data should be statically delivered/streamed where appropriate.
- Avoid loading high-detail data outside the camera/LOD need where a lower-detail representation is sufficient.
- No private API keys or runtime geographic-service credentials may ship in browser code.
- Failure of an optional visual refinement must settle to a coherent physical map rather than blanking terrain or blocking campaign entry.

## Acceptance criteria

R3-WP3.9B2 completes only when all of the following are true:

- the deployed map no longer reads as uniformly foggy, murky, grey or grey-green;
- grassland, woodland, farmland/open plains, rocky mountains and water have **visibly distinct physical colour/material identities**;
- Alpine terrain has substantially stronger rock/high-altitude character than the lowlands, with restrained snow/bright high-elevation treatment where appropriate;
- the map achieves the approved **stylised satellite/physical-map** direction without becoming raw-photographic, over-saturated or visually noisy;
- regional variation is visible across multiple parts of Europe rather than being a single elevation colour ramp applied everywhere;
- the accepted WP3.9B border-led ownership treatment remains intact: no broad political wash returns and controller borders remain clearly readable;
- cities, soldiers, infrastructure, labels, routes, operations, fronts and threat cues remain legible against the richer terrain;
- the improved coastline treatment does not regress;
- territory geometry, strategic geography, authoritative anchors and simulation state are unchanged;
- GitHub Pages/static deployment, `?terrain=0`, reduced-motion/accessibility behaviour and renderer failure fallbacks remain safe;
- exact-head production/browser/geographic/performance gates remain within the accepted envelope, or any measured exception is separately reviewed and approved;
- the product owner accepts the deployed result across the Theatre, lowland, Central European and Alpine validation views.

## Exit / next package

WP3.9C - Portal Arrival Sequence remains blocked until WP3.9B2 is implemented, deployed and visually accepted.

The authoritative pre-WP4 sequence is therefore:

**WP3.9A -> WP3.9B -> WP3.9B2 -> WP3.9C -> integrated physical-map review -> WP4.**
