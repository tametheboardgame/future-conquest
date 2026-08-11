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
import { TERRITORIES } from '../game/data';
import { getThreatenedTerritories } from '../game/operational-clarity';
import { STRATEGIC_NODES, STRATEGIC_ROUTES } from '../game/strategic-network-data';
import type { GameState } from '../game/types';
import {
  R3_TERRAIN_CAMERA_PRESETS,
  R3_TERRAIN_MANIFEST,
  R3_TERRAIN_PROTOTYPE_BOUNDS,
  chooseCampaignMapRenderer,
  terrainCameraPreset,
  type TerrainCameraPreset
} from '../presentation/r3-terrain-config';
import { deriveR3FrontSegments } from '../presentation/r3-map-visual-state';
import {
  buildTerrainFrontGeoJSON,
  buildTerrainPoliticalGeoJSON,
  buildTerrainStrategicNodeGeoJSON,
  buildTerrainStrategicRouteGeoJSON
} from '../presentation/r3-terrain-overlay';
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
  politicalData: GeoJSONSourceSpecification['data'],
  frontData: GeoJSONSourceSpecification['data'],
  routeData: GeoJSONSourceSpecification['data'],
  nodeData: GeoJSONSourceSpecification['data'],
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
        data: politicalData
      },
      'campaign-fronts': {
        type: 'geojson',
        data: frontData
      },
      'campaign-strategic-routes': {
        type: 'geojson',
        data: routeData
      },
      'campaign-strategic-nodes': {
        type: 'geojson',
        data: nodeData
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
            ['boolean', ['get', 'selected'], false], 0.18,
            ['boolean', ['get', 'targeted'], false], 0.17,
            0.11
          ]
        }
      },
      {
        id: 'campaign-territory-state-wash',
        type: 'fill',
        source: 'campaign-territories',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'active_combat'], false], '#ff5447',
            ['==', ['get', 'threat_stage'], 'under-attack'], '#ff6158',
            ['==', ['get', 'threat_stage'], 'imminent'], '#ff9a55',
            ['==', ['get', 'threat_stage'], 'preparing'], '#f0c96d',
            ['==', ['get', 'threat_stage'], 'recent-combat'], '#a65c57',
            ['boolean', ['get', 'targeted'], false], '#ffc76b',
            ['boolean', ['get', 'selected'], false], '#8ffff1',
            '#000000'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'active_combat'], false], 0.22,
            ['==', ['get', 'threat_stage'], 'under-attack'], 0.2,
            ['==', ['get', 'threat_stage'], 'imminent'], 0.15,
            ['==', ['get', 'threat_stage'], 'preparing'], 0.1,
            ['==', ['get', 'threat_stage'], 'recent-combat'], 0.09,
            ['boolean', ['get', 'targeted'], false], 0.11,
            ['boolean', ['get', 'selected'], false], 0.08,
            0
          ]
        }
      },
      {
        id: 'campaign-administrative-borders',
        type: 'line',
        source: 'campaign-territories',
        paint: {
          'line-color': '#d6d8c9',
          'line-opacity': 0.34,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.55, 8, 1.05]
        }
      },
      {
        id: 'campaign-strategic-routes',
        type: 'line',
        source: 'campaign-strategic-routes',
        minzoom: 5.1,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'selected_supply_path'], false], '#8ffff1',
            ['boolean', ['get', 'bottleneck'], false], '#f0ad58',
            ['==', ['get', 'status'], 'destroyed'], '#6f2d34',
            ['==', ['get', 'status'], 'blocked'], '#a44343',
            ['==', ['get', 'status'], 'damaged'], '#c58a50',
            '#9ba58f'
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'selected_supply_path'], false], 0.9,
            ['boolean', ['get', 'bottleneck'], false], 0.78,
            ['==', ['get', 'status'], 'destroyed'], 0.42,
            0.5
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'selected_supply_path'], false], 3.2,
            ['boolean', ['get', 'bottleneck'], false], 2.4,
            ['==', ['get', 'status'], 'destroyed'], 1.1,
            1.45
          ]
        }
      },
      {
        id: 'campaign-control-borders',
        type: 'line',
        source: 'campaign-territories',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'controller'], 'player'], '#70d9cb',
            '#b99194'
          ],
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.9, 8, 2]
        }
      },
      {
        id: 'campaign-fronts-underlay',
        type: 'line',
        source: 'campaign-fronts',
        layout: {
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3c2623',
          'line-opacity': 0.88,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5.2, 8, 8.4]
        }
      },
      {
        id: 'campaign-fronts-core',
        type: 'line',
        source: 'campaign-fronts',
        layout: {
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f3a15d',
          'line-opacity': 0.96,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.1, 8, 3.6]
        }
      },
      {
        id: 'campaign-state-outline',
        type: 'line',
        source: 'campaign-territories',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'active_combat'], false], '#ff7a63',
            ['==', ['get', 'threat_stage'], 'under-attack'], '#ff695e',
            ['==', ['get', 'threat_stage'], 'imminent'], '#ffaf67',
            ['==', ['get', 'threat_stage'], 'preparing'], '#f1d37e',
            ['boolean', ['get', 'targeted'], false], '#ffd58a',
            ['boolean', ['get', 'selected'], false], '#effffc',
            '#000000'
          ],
          'line-opacity': [
            'case',
            ['any',
              ['boolean', ['get', 'active_combat'], false],
              ['!=', ['get', 'threat_stage'], 'none'],
              ['boolean', ['get', 'targeted'], false],
              ['boolean', ['get', 'selected'], false]
            ],
            0.96,
            0
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'active_combat'], false], 4.2,
            ['==', ['get', 'threat_stage'], 'under-attack'], 3.8,
            ['boolean', ['get', 'selected'], false], 3.4,
            ['boolean', ['get', 'targeted'], false], 3,
            2.5
          ]
        }
      },
      {
        id: 'campaign-strategic-nodes',
        type: 'circle',
        source: 'campaign-strategic-nodes',
        minzoom: 5.5,
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'node_type'], 'capital'], '#f1d07a',
            ['==', ['get', 'node_type'], 'port'], '#77bfd2',
            ['==', ['get', 'node_type'], 'airport'], '#b9b0e1',
            ['==', ['get', 'node_type'], 'rail-hub'], '#c4a96e',
            ['==', ['get', 'node_type'], 'crossing'], '#df8b68',
            ['==', ['get', 'node_type'], 'logistics'], '#84cba8',
            '#d0d3bd'
          ],
          'circle-radius': [
            'case',
            ['==', ['get', 'importance'], 3], 5,
            ['==', ['get', 'importance'], 2], 4,
            3
          ],
          'circle-opacity': 0.86,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'controller'], 'player'], '#6de2d2',
            '#c39a9e'
          ],
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': 0.92
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

  const visibleThreats = useMemo(() => getThreatenedTerritories(state), [state]);
  const activeCombatTerritoryIds = useMemo(
    () => Object.values(state.operations).map(operation => operation.target),
    [state.operations]
  );
  const politicalData = useMemo(() => (
    buildTerrainPoliticalGeoJSON(terrainGeoJSON, state, {
      threatenedTerritories: visibleThreats,
      activeCombatTerritoryIds
    }) as unknown as GeoJSONSourceSpecification['data']
  ), [state, visibleThreats, activeCombatTerritoryIds]);
  const frontData = useMemo(() => (
    buildTerrainFrontGeoJSON(
      terrainGeoJSON,
      deriveR3FrontSegments(state.territories, TERRITORIES)
    ) as unknown as GeoJSONSourceSpecification['data']
  ), [state.territories]);
  const routeData = useMemo(() => (
    buildTerrainStrategicRouteGeoJSON(STRATEGIC_NODES, STRATEGIC_ROUTES, state) as unknown as GeoJSONSourceSpecification['data']
  ), [state]);
  const nodeData = useMemo(() => (
    buildTerrainStrategicNodeGeoJSON(STRATEGIC_NODES, state) as unknown as GeoJSONSourceSpecification['data']
  ), [state.territories]);

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
        style: mapStyle(politicalData, frontData, routeData, nodeData, terrainSource.source),
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
        setMessage(`${terrainSource.label} · continuous relief · operational overlays projected from campaign state`);
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
    // This host deliberately creates one renderer instance; campaign overlays
    // update through GeoJSON sources below rather than recreating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const updates: Array<[string, GeoJSONSourceSpecification['data']]> = [
      ['campaign-territories', politicalData],
      ['campaign-fronts', frontData],
      ['campaign-strategic-routes', routeData],
      ['campaign-strategic-nodes', nodeData]
    ];
    for (const [sourceId, data] of updates) {
      const source = map.getSource(sourceId);
      if (source instanceof GeoJSONSource) source.setData(data);
    }
  }, [politicalData, frontData, routeData, nodeData]);

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
