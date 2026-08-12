# R3-WP2E - Terrain Performance & Streaming Optimisation

Status: APPROVED / ACTIVE

Product-owner trigger: live review of the merged WP2D terrain build on 2026-08-12 approved the visual direction but reported sporadic/section-by-section terrain loading and some lag during camera changes. WP2E is a focused architecture/performance pass before WP3 adds physical formation pieces and animation.

## Objective

Make the accepted MapLibre/Copernicus terrain foundation feel immediate and coherent on realistic hardware and networks, without changing authoritative simulation state, map topology, intelligence boundaries, save data or the accepted visual direction.

WP3 remains paused until this package passes its technical and live-performance gate.

## Current measured baseline

The exact-head WP2D production build measured approximately:

- terrain lazy JS chunk: 1,002,496 bytes raw / 268,746 bytes gzip;
- MapLibre worker: 466,016 bytes raw / 130,472 bytes gzip;
- Europe terrain static set: 47,209,025 bytes across 960 Terrain-RGB PNG tiles;
- representative Chromium Campaign -> Theatre -> Selected journey: 97 unique terrain tile requests / 6,946,795 declared bytes;
- Theatre transition: 12 newly requested tiles / 920,486 declared bytes;
- Selected transition: 12 newly requested tiles / 1,094,539 declared bytes.

The renderer also currently defines separate raster-DEM source instances for terrain mesh, colour-relief and hillshade. The independent terrain/hillshade source requirement was introduced to fix a real MapLibre production-runtime issue, so WP2E must not casually collapse working source semantics.

## Work package

### 1. Instrument first

Extend the real-browser performance gate so optimisation is evidence-based. Capture at minimum:

- cold terrain module/worker startup time;
- time from map request to first useful command-map paint;
- time to initial Campaign-view settle;
- unique and total terrain requests;
- transferred terrain bytes where response headers permit measurement;
- warm-cache Campaign -> Theatre and Theatre -> Selected transition settle time;
- duplicate tile-request evidence;
- representative long-main-thread/render stalls where practical;
- whether fallback, warning or hidden-information boundaries changed.

Preserve screenshots and machine-readable performance evidence as Actions artefacts.

### 2. Pre-warm static runtime assets

Keep MapLibre outside the eager application bundle, but begin loading the terrain module/worker/manifest opportunistically once a campaign session is entering the command experience and terrain is the selected renderer. Do not block gameplay or startup on pre-warming.

The generated versioned terrain manifest must use normal browser caching rather than unconditional `no-store` unless evidence demonstrates a correctness reason not to.

### 3. Remove redundant DEM work

Audit the current colour-relief raster-DEM source/layer. It currently contributes no visible output at zero opacity. If visual and runtime tests confirm it is redundant, remove that source/layer and its associated readiness bookkeeping. Keep terrain mesh and hillshade source instances separate unless a real-browser test proves sharing is safe.

### 4. Terrain request/cache architecture

Measure duplicate requests caused by multiple DEM consumers. If material, introduce a shared byte-fetch/cache boundary underneath independent MapLibre consumers, or another MapLibre-compatible equivalent, so independent presentation sources do not require unnecessary duplicate network transfers.

Requirements:

- no browser credentials;
- static GitHub Pages compatibility;
- correct abort/cancellation semantics from WP2D;
- genuine CORS/network/source failures remain visible and retain the SVG fallback path;
- no unbounded in-memory cache;
- no service-worker architecture unless measured benefit justifies the added lifecycle complexity.

### 5. Incremental operational overlay updates

Stop treating every game-state mutation as a reason to destroy and recreate every operational DOM marker where practical. Move toward keyed marker reconciliation/update so unchanged formations, threats, territory context and portal markers retain their DOM instances.

Likewise, narrow derived GeoJSON dependencies and avoid reparsing/resetting sources whose relevant authoritative inputs did not change.

This is presentation optimisation only. Rendering remains downstream of authoritative simulation state.

### 6. Graceful progressive terrain reveal

Residual tile streaming should read as refinement rather than rectangular map sections appearing independently. Preserve a cheap coherent strategic/base surface while detailed physical relief settles, then reveal/refine terrain without blocking interaction. Reduced-motion and accessibility behaviour must remain correct.

### 7. Responsive/performance degradation

Preserve the full/compact/SVG policy. WP2E may reduce antialiasing, pitch, relief pressure, marker density or detail level on constrained devices, but must not change campaign mechanics or hide protected command information.

## Acceptance criteria

WP2E is complete when all of the following are true:

1. Existing full engine regression, save/persistence, balance, terrain smoke, browser-runtime, overlay-runtime and visual-runtime gates remain green.
2. Cold and warm terrain performance is recorded by a permanent exact-head browser gate.
3. The unused colour-relief DEM path is removed unless measured evidence proves it is required.
4. Terrain manifest caching no longer forces a network revalidation on every renderer initialisation.
5. Representative camera changes do not visibly blank the existing command surface while higher-detail terrain streams.
6. Marker updates no longer perform an unconditional full remove/recreate cycle for every unrelated game-state change, or the PR documents measured evidence that such reconciliation provides no material benefit at current and projected WP3 piece counts.
7. No authoritative `src/game/**` behaviour, save schema, territory topology, route topology, deterministic balance or intelligence boundary changes.
8. Performance evidence demonstrates a material improvement versus the WP2D baseline, with particular emphasis on perceived Campaign startup and Campaign/Theatre/Selected transitions.
9. The product owner confirms the deployed terrain feels sufficiently responsive to become the base for WP3.

## WP3 handoff

After WP2E acceptance, resume R3-WP3 Formation Pieces & Animated Movement on this renderer. WP3 should inherit the new performance instrumentation and must treat piece count, DOM/WebGL allocations and animation cost as explicit budgets rather than adding effects without measurement.
