import { useEffect, useMemo, useState } from 'react';
import { GeoJSONSource, type GeoJSONSourceSpecification, type Map } from 'maplibre-gl';
import activeGeojson from '../assets/vertical-slice-map.json';
import { getThreatenedTerritories } from '../game/operational-clarity';
import { STRATEGIC_NODES } from '../game/strategic-network-data';
import {
  chooseTerrainPresentationProfile,
  type TerrainPresentationProfile
} from '../presentation/r3-terrain-config';
import {
  buildTerrainPoliticalGeoJSON,
  buildTerrainStrategicNodeGeoJSON
} from '../presentation/r3-terrain-overlay';
import {
  applyR3StrategicInformationOverlay,
  enrichR3StrategicNodeGeoJSON,
  enrichR3StrategicPoliticalGeoJSON,
  R3_RESOURCE_METRIC_OPTIONS,
  R3_STRATEGIC_OVERLAY_OPTIONS,
  r3StrategicOverlayLegend,
  type R3ResourceMetric,
  type R3StrategicOverlay
} from '../presentation/r3-strategic-information-layers';
import '../wp3-5-physical-overlay.css';
import '../wp5-strategic-information.css';
import {
  TerrainMapPrototypeImpl,
  prewarmTerrainRuntime,
  type TerrainMapPrototypeProps
} from './TerrainMapPrototypeImpl';

const STRATEGIC_PREFERENCES_KEY = 'future-conquest:r3-wp5-strategic-overlay';
const terrainGeoJSON = activeGeojson as unknown as Parameters<typeof buildTerrainPoliticalGeoJSON>[0];

interface StrategicPreferences {
  overlay: R3StrategicOverlay;
  resource: R3ResourceMetric;
}

type TerrainWindow = typeof window & { __r3TerrainMap?: Map };

function browserTerrainProfile(): TerrainPresentationProfile {
  if (typeof window === 'undefined') return 'full';
  return chooseTerrainPresentationProfile({
    viewportWidth: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches
  });
}

function strategicPreferences(): StrategicPreferences {
  const fallback: StrategicPreferences = { overlay: 'control', resource: 'food' };
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STRATEGIC_PREFERENCES_KEY) ?? '') as Partial<StrategicPreferences>;
    const overlay = R3_STRATEGIC_OVERLAY_OPTIONS.some(option => option.id === parsed.overlay) ? parsed.overlay : fallback.overlay;
    const resource = R3_RESOURCE_METRIC_OPTIONS.some(option => option.id === parsed.resource) ? parsed.resource : fallback.resource;
    return { overlay: overlay as R3StrategicOverlay, resource: resource as R3ResourceMetric };
  } catch {
    return fallback;
  }
}

/**
 * WP2B-D host policy around the MapLibre implementation. R3-WP5 also owns the
 * strategic information selector because it is presentation state only: the
 * selected overlay is retained locally and never enters campaign save state.
 */
export function TerrainMapPrototype(props: TerrainMapPrototypeProps) {
  const [profile, setProfile] = useState<TerrainPresentationProfile>(browserTerrainProfile);
  const [preferences, setPreferences] = useState<StrategicPreferences>(strategicPreferences);
  const { onFallback, state } = props;
  const legend = useMemo(
    () => r3StrategicOverlayLegend(preferences.overlay, preferences.resource),
    [preferences]
  );
  const showResourceSelector = preferences.overlay === 'resources' || preferences.overlay === 'stockpiles';

  useEffect(() => {
    const refreshProfile = () => setProfile(browserTerrainProfile());
    window.addEventListener('resize', refreshProfile);
    return () => window.removeEventListener('resize', refreshProfile);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STRATEGIC_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (profile === 'svg-fallback') {
      onFallback('Compact touch display selected the stable SVG command map.');
    }
  }, [profile, onFallback]);

  useEffect(() => {
    if (profile === 'svg-fallback') return;
    let frame = 0;
    let disposed = false;
    const threats = getThreatenedTerritories(state);
    const activeCombatTerritoryIds = Object.values(state.operations).map(operation => operation.target);
    const projectedPoliticalData = buildTerrainPoliticalGeoJSON(terrainGeoJSON, state, {
      threatenedTerritories: threats,
      activeCombatTerritoryIds
    });
    const strategicData = enrichR3StrategicPoliticalGeoJSON(projectedPoliticalData, state) as unknown as GeoJSONSourceSpecification['data'];
    const strategicNodeData = enrichR3StrategicNodeGeoJSON(
      buildTerrainStrategicNodeGeoJSON(STRATEGIC_NODES, state),
      state
    ) as unknown as GeoJSONSourceSpecification['data'];

    const synchronise = () => {
      if (disposed) return;
      const map = (window as TerrainWindow).__r3TerrainMap;
      if (!map) {
        frame = window.requestAnimationFrame(synchronise);
        return;
      }
      const territorySource = map.getSource('campaign-territories');
      const nodeSource = map.getSource('campaign-strategic-nodes');
      if (!(territorySource instanceof GeoJSONSource) || !(nodeSource instanceof GeoJSONSource)) {
        frame = window.requestAnimationFrame(synchronise);
        return;
      }
      // GeoJSON source enrichment does not depend on terrain tiles settling. This
      // keeps strategic data available during slow DEM/WebGL settlement while
      // MapLibre layer styling still waits for a fully loaded style below.
      territorySource.setData(strategicData);
      nodeSource.setData(strategicNodeData);
      if (!applyR3StrategicInformationOverlay(map, preferences.overlay, preferences.resource)) {
        frame = window.requestAnimationFrame(synchronise);
      }
    };

    frame = window.requestAnimationFrame(synchronise);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [profile, state, preferences]);

  if (profile === 'svg-fallback') {
    return <div className="r3-terrain-compact-fallback" role="status">Loading compact 2D command map…</div>;
  }

  return <div className="r3-terrain-prototype-shell" data-terrain-profile={profile}>
    <button
      type="button"
      className="r3-terrain-use-svg"
      onClick={() => onFallback('Player selected the stable SVG command map.')}
    >
      2D accessible map
    </button>
    <TerrainMapPrototypeImpl key={profile} {...props} presentationProfile={profile} />
    <aside className="r3-strategic-information-control" aria-label="Strategic information layer">
      <label>
        <span>Strategic view</span>
        <select
          value={preferences.overlay}
          onChange={event => setPreferences(current => ({
            ...current,
            overlay: event.target.value as R3StrategicOverlay
          }))}
        >
          {R3_STRATEGIC_OVERLAY_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      {showResourceSelector && <label>
        <span>Resource</span>
        <select
          value={preferences.resource}
          onChange={event => setPreferences(current => ({
            ...current,
            resource: event.target.value as R3ResourceMetric
          }))}
        >
          {R3_RESOURCE_METRIC_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>}
      <div className="r3-strategic-information-legend" aria-live="polite">
        <strong>{legend.title}</strong>
        <span>{legend.detail}</span>
      </div>
    </aside>
  </div>;
}

export type { TerrainMapPrototypeProps };
export { prewarmTerrainRuntime };
