import type { GeoJSONSource, Map } from 'maplibre-gl';

export const R3_MAP_VISUAL_GRADING_PROFILE_ID = 'clean-border-v2';

export const R3_MAP_VISUAL_GRADING = {
  sea: '#19313a',
  land: '#777a72',
  hillshadeShadow: '#242321',
  hillshadeHighlight: '#eee7d8',
  hillshadeAccent: '#8a8171',
  coastline: '#b9c0b8',
  coastlineOpacity: 0.13,
  friendlyBorder: '#76f2e1',
  enemyBorder: '#ff776f',
  controlGlowLayerId: 'campaign-control-border-glow',
  detailedLandMaskPath: 'generated/r3-terrain/europe-land-mask-50m.geojson'
} as const;

export type R3MapVisualGradingEvidence = {
  profileId: typeof R3_MAP_VISUAL_GRADING_PROFILE_ID;
  applied: boolean;
  appliedAt: number;
  colours: {
    sea: string;
    land: string;
    hillshadeShadow: string;
    hillshadeHighlight: string;
    hillshadeAccent: string;
    friendlyBorder: string;
    enemyBorder: string;
  };
  ownershipTreatment: {
    landSurfaceOpacity: number;
    administrativeBorderOpacity: number;
    territoryFillOpacity: number;
    stateWashOpacity: number;
    glowLayerId: string;
  };
  coastlineGeometry: {
    status: 'loading' | '50m-static' | '110m-fallback';
    sourceUrl: string;
  };
};

declare global {
  interface Window {
    __r3TerrainMap?: Map;
    __r3MapVisualGrading?: R3MapVisualGradingEvidence;
  }
}

const gradedMaps = new WeakSet<Map>();
let observer: MutationObserver | undefined;
let applyFrame: number | undefined;
let detailedLandMaskPromise: Promise<unknown> | undefined;

const detailedLandMaskUrl = () => `${import.meta.env.BASE_URL}${R3_MAP_VISUAL_GRADING.detailedLandMaskPath}`;

function loadDetailedLandMask(): Promise<unknown> {
  detailedLandMaskPromise ??= fetch(detailedLandMaskUrl(), { cache: 'default' })
    .then(response => {
      if (!response.ok) throw new Error(`detailed land mask returned ${response.status}`);
      return response.json();
    })
    .catch(error => {
      detailedLandMaskPromise = undefined;
      throw error;
    });
  return detailedLandMaskPromise;
}

function setCoastlineGeometryStatus(status: R3MapVisualGradingEvidence['coastlineGeometry']['status']) {
  if (!window.__r3MapVisualGrading) return;
  window.__r3MapVisualGrading = {
    ...window.__r3MapVisualGrading,
    coastlineGeometry: {
      status,
      sourceUrl: detailedLandMaskUrl()
    }
  };
}

function promoteDetailedLandMask(map: Map) {
  const landSource = map.getSource('r3-wp2b-land') as GeoJSONSource | undefined;
  if (!landSource) {
    setCoastlineGeometryStatus('110m-fallback');
    return;
  }

  void loadDetailedLandMask()
    .then(data => {
      if (!gradedMaps.has(map)) return;
      landSource.setData(data as Parameters<GeoJSONSource['setData']>[0]);
      setCoastlineGeometryStatus('50m-static');
      map.triggerRepaint();
    })
    .catch(() => {
      // The committed 110m GeoJSON already present in the MapLibre source is a
      // deliberate graceful fallback. A missing optional refinement asset must
      // not blank the terrain or fail the command map.
      setCoastlineGeometryStatus('110m-fallback');
    });
}

function applyMapVisualGrading(map: Map): boolean {
  if (!map.getLayer('r3-wp2b-land-wash') || !map.getLayer('r3-wp2b-hillshade')) return false;

  map.setPaintProperty('r3-wp2b-sea', 'background-color', R3_MAP_VISUAL_GRADING.sea);

  // The DEM needs a land material beneath its hillshade, but it should read as
  // the map surface itself rather than as a translucent coloured overlay. An
  // opaque neutral ground also prevents the dark sea colour bleeding through
  // the coast and producing the previous doubled/dirty shoreline treatment.
  map.setPaintProperty('r3-wp2b-land-wash', 'fill-color', R3_MAP_VISUAL_GRADING.land);
  map.setPaintProperty('r3-wp2b-land-wash', 'fill-opacity', 1);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-shadow-color', R3_MAP_VISUAL_GRADING.hillshadeShadow);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-highlight-color', R3_MAP_VISUAL_GRADING.hillshadeHighlight);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-accent-color', R3_MAP_VISUAL_GRADING.hillshadeAccent);

  // Coastline is now only a restrained geographic edge. Ownership is carried
  // by the controller border below instead of by generic pale admin outlines.
  map.setPaintProperty('r3-wp2b-coastline', 'line-color', R3_MAP_VISUAL_GRADING.coastline);
  map.setPaintProperty('r3-wp2b-coastline', 'line-opacity', R3_MAP_VISUAL_GRADING.coastlineOpacity);
  map.setPaintProperty('r3-wp2b-coastline', 'line-width', 0.55);
  map.setPaintProperty('campaign-administrative-borders', 'line-opacity', 0);

  // Remove broad political/state washes. Selection, targeting, combat and
  // threat remain legible through the existing high-priority state outline and
  // orange/red operational front language rather than colouring whole regions.
  map.setPaintProperty('campaign-territories-fill', 'fill-opacity', 0);
  map.setPaintProperty('campaign-territory-state-wash', 'fill-opacity', 0);

  if (!map.getLayer(R3_MAP_VISUAL_GRADING.controlGlowLayerId)) {
    map.addLayer({
      id: R3_MAP_VISUAL_GRADING.controlGlowLayerId,
      type: 'line',
      source: 'campaign-territories',
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'controller'], 'player'], R3_MAP_VISUAL_GRADING.friendlyBorder,
          R3_MAP_VISUAL_GRADING.enemyBorder
        ],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.24, 6, 0.31, 8, 0.38, 10, 0.44],
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3.2, 6, 4.0, 8, 5.0, 10, 5.8],
        'line-blur': ['interpolate', ['linear'], ['zoom'], 4, 1.8, 8, 2.35, 10, 2.7]
      }
    }, 'campaign-control-borders');
  }

  map.setPaintProperty('campaign-control-borders', 'line-color', [
    'case',
    ['==', ['get', 'controller'], 'player'], R3_MAP_VISUAL_GRADING.friendlyBorder,
    R3_MAP_VISUAL_GRADING.enemyBorder
  ]);
  map.setPaintProperty('campaign-control-borders', 'line-opacity', ['interpolate', ['linear'], ['zoom'], 4, 0.82, 6, 0.9, 8, 0.96, 10, 1]);
  map.setPaintProperty('campaign-control-borders', 'line-width', ['interpolate', ['linear'], ['zoom'], 4, 1.05, 6, 1.4, 8, 1.85, 10, 2.25]);

  const host = document.querySelector<HTMLElement>('.r3-terrain-prototype');
  if (host) host.dataset.visualGrading = R3_MAP_VISUAL_GRADING_PROFILE_ID;

  window.__r3MapVisualGrading = {
    profileId: R3_MAP_VISUAL_GRADING_PROFILE_ID,
    applied: true,
    appliedAt: performance.now(),
    colours: {
      sea: R3_MAP_VISUAL_GRADING.sea,
      land: R3_MAP_VISUAL_GRADING.land,
      hillshadeShadow: R3_MAP_VISUAL_GRADING.hillshadeShadow,
      hillshadeHighlight: R3_MAP_VISUAL_GRADING.hillshadeHighlight,
      hillshadeAccent: R3_MAP_VISUAL_GRADING.hillshadeAccent,
      friendlyBorder: R3_MAP_VISUAL_GRADING.friendlyBorder,
      enemyBorder: R3_MAP_VISUAL_GRADING.enemyBorder
    },
    ownershipTreatment: {
      landSurfaceOpacity: 1,
      administrativeBorderOpacity: 0,
      territoryFillOpacity: 0,
      stateWashOpacity: 0,
      glowLayerId: R3_MAP_VISUAL_GRADING.controlGlowLayerId
    },
    coastlineGeometry: {
      status: 'loading',
      sourceUrl: detailedLandMaskUrl()
    }
  };
  map.triggerRepaint();
  return true;
}

function scheduleApply() {
  if (applyFrame !== undefined) return;
  applyFrame = window.requestAnimationFrame(() => {
    applyFrame = undefined;
    const map = window.__r3TerrainMap;
    if (!map || gradedMaps.has(map)) return;

    const finish = () => {
      if (gradedMaps.has(map)) return;
      if (applyMapVisualGrading(map)) {
        gradedMaps.add(map);
        promoteDetailedLandMask(map);
      }
    };

    if (map.isStyleLoaded()) finish();
    else map.once('load', finish);
  });
}

/**
 * R3-WP3.9B presentation-only grading hook.
 *
 * Candidate v2 removes broad political colouring from the terrain. The DEM is
 * presented on one opaque neutral board surface, while territory ownership is
 * carried by a crisp controller-coloured border with a restrained luminous
 * underglow. The higher-detail coastline is delivered as a static MapLibre
 * GeoJSON refinement so it does not inflate the lazy terrain JavaScript chunk.
 * Operational state remains on dedicated outlines/fronts.
 */
export function installR3MapVisualGrading(): void {
  scheduleApply();
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
}
