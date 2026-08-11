import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoJSONSource,
  Map,
  NavigationControl,
  type GeoJSONSourceSpecification,
  type RasterDEMSourceSpecification,
  type StyleSpecification
} from 'maplibre-gl';
import { feature as topojsonFeature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
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
import {
  generatedRasterDemSource,
  generatedTerrainManifestUrl,
  type GeneratedTerrainTileJson
} from '../presentation/r3-terrain-source';

export interface TerrainMapPrototypeProps {
  state: GameState;
  onSelect: (territoryId: string) => void;
  onFallback: (reason: string) => void;
}

type PrototypeStatus = 'initialising' | 'ready' | 'warning';

interface TerrainSourceResolution {
  source: RasterDEMSourceSpecification;
  label: string;
  attribution: string;
}

const terrainGeoJSON = activeGeojson as unknown as Parameters<typeof buildTerrainPoliticalGeoJSON>[0];
const atlas = worldAtlas as unknown as { objects: { countries: unknown } };
const terrainLandGeoJSON = topojsonFeature(atlas, atlas.objects.countries) as unknown as GeoJSONSourceSpecification['data'];
const COPERNICUS_ATTRIBUTION = 'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved';

function browserSupportsTerrain(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return chooseCampaignMapRenderer({
    webgl: Boolean(canvas.getContext('webgl2')),
    terrainEnabled: true
  }) === 'real-terrain';
}

async function resolveTerrainSource(): Promise<TerrainSourceResolution> {
  const manifestUrl = generatedTerrainManifestUrl(import.meta.env.BASE_URL);
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`terrain manifest returned ${response.status}`);
  const manifest = await response.json() as GeneratedTerrainTileJson;
  return {
    source: generatedRasterDemSource(manifest, import.meta.env.BASE_URL) as unknown as RasterDEMSourceSpecification,
    label: 'Copernicus GLO-30 static terrain',
    attribution: manifest.attribution
  };
}

function mapStyle(
  data: GeoJSONSourceSpecification['data'],
  demSource: RasterDEMSourceSpecification
): StyleSpecification {
  return {
    version: 8,
    sources: {
      'r3-wp2b-land': {
        type: 'geojson',
        data: terrainLandGeoJSON
      },
      'r3-wp2b-dem': demSource,
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
        id: 'r3-wp2b-sea',
        type: 'background',
        paint: {
          'background-color': '#132d35'
        }
      },
      {
        id: 'r3-wp2b-relief',
        type: 'color-relief',
        source: 'r3-wp2b-dem',
        paint: {
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['elevation'],
            -250, '#15313a',
            0, '#29413c',
            80, '#53684b',
            250, '#657550',
            500, '#737650',
            850, '#80765a',
            1200, '#887964',
            1700, '#8d8273',
            2200, '#9f9789',
            2800, '#b8b2a8',
            3400, '#d0cfca',
            4500, '#eceeeb'
          ],
          'color-relief-opacity': 0.96
        }
      },
      {
        id: 'r3-wp2b-land-wash',
        type: 'fill',
        source: 'r3-wp2b-land',
        paint: {
          'fill-color': '#6c805b',
          'fill-opacity': 0.34
        }
      },
      {
        id: 'r3-wp2b-hillshade',
        type: 'hillshade',
        source: 'r3-wp2b-dem',
        paint: {
          'hillshade-exaggeration': 0.72,
          'hillshade-shadow-color': '#161b18',
          'hillshade-highlight-color': '#d5d8ca',
          'hillshade-accent-color': '#6c6759'
        }
      },
      {
        id: 'r3-wp2b-coastline',
        type: 'line',
        source: 'r3-wp2b-land',
        paint: {
          'line-color': '#a6b7a8',
          'line-opacity': 0.32,
          'line-width': 0.8
        }
      },
      {
        id: 'campaign-territories-fill',
        type: 'fill',
        source: 'campaign-territories',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'controller'], 'player'], '#2db8a4',
            '#7c6669'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'selected'], false], 0.31,
            ['boolean', ['get', 'targeted'], false], 0.26,
            0.13
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
            ['boolean', ['get', 'selected'], false], '#effffc',
            ['boolean', ['get', 'targeted'], false], '#ffd58a',
            ['==', ['get', 'controller'], 'player'], '#75d7c8',
            '#b59698'
          ],
          'line-opacity': 0.92,
          'line-width': [
            'case',
            ['boolean', ['get', 'selected'], false], 3.2,
            ['boolean', ['get', 'targeted'], false], 2.6,
            1.25
          ]
        }
      }
    ]
  };
}

export function TerrainMapPrototypeImpl({ state, onSelect, onFallback }: TerrainMapPrototypeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const selectRef = useRef(onSelect);
  const fallbackRef = useRef(onFallback);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<PrototypeStatus>('initialising');
  const [message, setMessage] = useState('Initialising continuous terrain…');
  const [sourceAttribution, setSourceAttribution] = useState(COPERNICUS_ATTRIBUTION);

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

    let disposed = false;
    let ownedMap: Map | null = null;

    const initialise = async () => {
      const terrainSource = await resolveTerrainSource();
      if (disposed || !containerRef.current) return;

      setSourceAttribution(terrainSource.attribution);
      const initial = terrainCameraPreset('campaign');
      const [west, south, east, north] = R3_TERRAIN_PROTOTYPE_BOUNDS;
      const map = new Map({
        container: containerRef.current,
        style: mapStyle(politicalData, terrainSource.source),
        center: [initial.center[0], initial.center[1]],
        zoom: initial.zoom,
        pitch: initial.pitch,
        bearing: initial.bearing,
        minZoom: 3.6,
        maxZoom: 10.5,
        maxPitch: 70,
        maxBounds: [[west, south], [east, north]],
        canvasContextAttributes: { antialias: true },
        attributionControl: {}
      });
      ownedMap = map;
      mapRef.current = map;
      map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

      map.on('load', () => {
        loadedRef.current = true;
        setStatus('ready');
        setMessage(`${terrainSource.label} · continuous relief · political control remains an overlay`);
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
    };

    void initialise().catch(() => {
      if (!disposed) fallbackRef.current('Generated Copernicus terrain is unavailable; using the stable SVG command map.');
    });

    return () => {
      disposed = true;
      loadedRef.current = false;
      mapRef.current = null;
      ownedMap?.remove();
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
      center: [preset.center[0], preset.center[1]],
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
    <div className="r3-terrain-prototype-attribution">{sourceAttribution}</div>
  </div>;
}
