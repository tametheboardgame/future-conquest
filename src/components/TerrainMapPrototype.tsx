import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSONSource, Map, NavigationControl, type GeoJSONSourceSpecification, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import activeGeojson from '../assets/vertical-slice-map.json';
import type { GameState } from '../game/types';
import {
  R3_TERRAIN_CAMERA_PRESETS,
  R3_TERRAIN_MANIFEST,
  R3_TERRAIN_PROTOTYPE_BOUNDS,
  chooseCampaignMapRenderer,
  terrainCameraPreset,
  type TerrainCameraPreset
} from '../presentation/r3-terrain-config';
import { buildTerrainPoliticalGeoJSON } from '../presentation/r3-terrain-overlay';

interface Props {
  state: GameState;
  onSelect: (territoryId: string) => void;
  onFallback: (reason: string) => void;
}

type PrototypeStatus = 'initialising' | 'ready' | 'warning';

const terrainGeoJSON = activeGeojson as unknown as Parameters<typeof buildTerrainPoliticalGeoJSON>[0];
const DEMO_TERRAIN_URL = 'https://demotiles.maplibre.org/terrain-tiles/tiles.json';
const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];

function browserSupportsTerrain(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return chooseCampaignMapRenderer({
    webgl: Boolean(canvas.getContext('webgl2')),
    terrainEnabled: true
  }) === 'real-terrain';
}

function mapStyle(data: GeoJSONSourceSpecification['data']): StyleSpecification {
  return {
    version: 8,
    sources: {
      'r3-wp2b-surface': {
        type: 'raster',
        tiles: OSM_TILES,
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      },
      'r3-wp2b-dem': {
        type: 'raster-dem',
        url: DEMO_TERRAIN_URL,
        tileSize: 256
      },
      'campaign-territories': {
        type: 'geojson',
        data
      }
    },
    terrain: {
      source: 'r3-wp2b-dem',
      exaggeration: R3_TERRAIN_MANIFEST.initialExaggeration
    },
    layers: [
      {
        id: 'r3-wp2b-surface',
        type: 'raster',
        source: 'r3-wp2b-surface',
        paint: {
          'raster-saturation': -0.72,
          'raster-contrast': 0.12,
          'raster-brightness-min': 0.12,
          'raster-brightness-max': 0.72,
          'raster-opacity': 0.9
        }
      },
      {
        id: 'r3-wp2b-hillshade',
        type: 'hillshade',
        source: 'r3-wp2b-dem',
        paint: {
          'hillshade-exaggeration': 0.58,
          'hillshade-shadow-color': '#111918',
          'hillshade-highlight-color': '#c5d0bb',
          'hillshade-accent-color': '#5c6a5e'
        }
      },
      {
        id: 'campaign-territories-fill',
        type: 'fill',
        source: 'campaign-territories',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'controller'], 'player'], '#31a99a',
            '#746466'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'selected'], false], 0.34,
            ['boolean', ['get', 'targeted'], false], 0.29,
            0.17
          ]
        }
      },
      {
        id: 'campaign-territories-line',
        type: 'line',
        source: 'campaign-territories',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'selected'], false], '#ecfffb',
            ['boolean', ['get', 'targeted'], false], '#ffd58a',
            ['==', ['get', 'controller'], 'player'], '#75c9be',
            '#a18d8e'
          ],
          'line-opacity': 0.9,
          'line-width': [
            'case',
            ['boolean', ['get', 'selected'], false], 3.2,
            ['boolean', ['get', 'targeted'], false], 2.6,
            1.2
          ]
        }
      }
    ]
  };
}

export function TerrainMapPrototype({ state, onSelect, onFallback }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const selectRef = useRef(onSelect);
  const fallbackRef = useRef(onFallback);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<PrototypeStatus>('initialising');
  const [message, setMessage] = useState('Initialising continuous terrain…');

  selectRef.current = onSelect;
  fallbackRef.current = onFallback;

  const politicalData = useMemo(() => (
    buildTerrainPoliticalGeoJSON(terrainGeoJSON, state) as unknown as GeoJSONSourceSpecification['data']
  ), [state]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!browserSupportsTerrain()) {
      fallbackRef.current('WebGL2 terrain rendering is unavailable; using the stable SVG command map.');
      return;
    }

    const initial = terrainCameraPreset('campaign');
    const [west, south, east, north] = R3_TERRAIN_PROTOTYPE_BOUNDS;
    const map = new Map({
      container: containerRef.current,
      style: mapStyle(politicalData),
      center: initial.center,
      zoom: initial.zoom,
      pitch: initial.pitch,
      bearing: initial.bearing,
      minZoom: 3.6,
      maxZoom: 10.5,
      maxPitch: 70,
      maxBounds: [[west, south], [east, north]],
      canvasContextAttributes: { antialias: true },
      attributionControl: true
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      loadedRef.current = true;
      setStatus('ready');
      setMessage('Experimental continuous terrain · political control is an overlay, not elevation');
    });

    map.on('error', () => {
      if (!loadedRef.current) {
        fallbackRef.current('The experimental terrain renderer failed to initialise; using the stable SVG command map.');
      } else {
        setStatus('warning');
        setMessage('Terrain source warning · the SVG fallback remains available');
      }
    });

    map.on('mouseenter', 'campaign-territories-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'campaign-territories-fill', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'campaign-territories-fill', event => {
      const territoryId = event.features?.[0]?.properties?.territory_id;
      if (typeof territoryId === 'string') selectRef.current(territoryId);
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
    // This host deliberately creates one renderer instance; political data is
    // updated through the GeoJSON source effect below rather than recreating it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('campaign-territories');
    if (source instanceof GeoJSONSource) source.setData(politicalData);
  }, [politicalData]);

  const goTo = (preset: TerrainCameraPreset) => {
    mapRef.current?.easeTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850
    });
  };

  return <div className="r3-terrain-prototype" data-status={status}>
    <div className="r3-terrain-prototype-toolbar" aria-label="Experimental terrain camera controls">
      <span><strong>R3 TERRAIN SPIKE</strong>{message}</span>
      <div>{R3_TERRAIN_CAMERA_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => goTo(preset)}>{preset.id}</button>)}</div>
    </div>
    <div ref={containerRef} className="r3-terrain-prototype-canvas" role="application" aria-label="Experimental real-elevation campaign map" />
    <div className="r3-terrain-prototype-attribution">Prototype surface: © OpenStreetMap contributors · prototype DEM plumbing: MapLibre demo terrain · production elevation direction: Copernicus DEM</div>
  </div>;
}
