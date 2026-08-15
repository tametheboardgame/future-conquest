import type { Map } from 'maplibre-gl';

export const R3_MAP_VISUAL_GRADING_PROFILE_ID = 'clean-neutral-v1';

export const R3_MAP_VISUAL_GRADING = {
  sea: '#19313a',
  land: '#958d77',
  hillshadeShadow: '#242321',
  hillshadeHighlight: '#eee7d8',
  hillshadeAccent: '#8a8171',
  coastline: '#c6c9bc',
  coastlineOpacity: 0.31,
  administrativeBorder: '#dedbd1'
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

function applyMapVisualGrading(map: Map): boolean {
  if (!map.getLayer('r3-wp2b-land-wash') || !map.getLayer('r3-wp2b-hillshade')) return false;

  map.setPaintProperty('r3-wp2b-sea', 'background-color', R3_MAP_VISUAL_GRADING.sea);
  map.setPaintProperty('r3-wp2b-land-wash', 'fill-color', R3_MAP_VISUAL_GRADING.land);
  map.setPaintProperty('r3-wp2b-land-wash', 'fill-opacity', [
    'interpolate', ['linear'], ['zoom'],
    3.6, 0.42,
    4.8, 0.39,
    6.4, 0.31,
    8.5, 0.22
  ]);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-shadow-color', R3_MAP_VISUAL_GRADING.hillshadeShadow);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-highlight-color', R3_MAP_VISUAL_GRADING.hillshadeHighlight);
  map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-accent-color', R3_MAP_VISUAL_GRADING.hillshadeAccent);
  map.setPaintProperty('r3-wp2b-coastline', 'line-color', R3_MAP_VISUAL_GRADING.coastline);
  map.setPaintProperty('r3-wp2b-coastline', 'line-opacity', R3_MAP_VISUAL_GRADING.coastlineOpacity);
  map.setPaintProperty('campaign-administrative-borders', 'line-color', R3_MAP_VISUAL_GRADING.administrativeBorder);

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
      hillshadeAccent: R3_MAP_VISUAL_GRADING.hillshadeAccent
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
      if (applyMapVisualGrading(map)) gradedMaps.add(map);
    };

    if (map.isStyleLoaded()) finish();
    else map.once('load', finish);
  });
}

/**
 * R3-WP3.9B presentation-only grading hook.
 *
 * The production terrain is a DEM plus a deliberately authored ground tone,
 * not satellite imagery. Earlier passes used an olive wash and cool-green
 * relief palette which stacked visually with the UI and physical pieces. This
 * hook keeps the same terrain/topology/operational layers while replacing only
 * those base presentation colours with a restrained neutral earth/stone grade.
 */
export function installR3MapVisualGrading(): void {
  scheduleApply();
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
}
