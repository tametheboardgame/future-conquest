import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoJSONSource,
  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSourceSpecification,
  type RasterDEMSourceSpecification,
  type StyleSpecification
} from 'maplibre-gl';
import europeLandMask from '../assets/r3-europe-land-mask.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import activeGeojson from '../assets/vertical-slice-map.json';
import { TERRITORIES } from '../game/data';
import { getThreatenedTerritories } from '../game/operational-clarity';
import { STRATEGIC_NODES, STRATEGIC_ROUTES } from '../game/strategic-network-data';
import type { GameState } from '../game/types';
import {
  R3_TERRAIN_CAMERA_PRESETS,
  R3_TERRAIN_PROTOTYPE_BOUNDS,
  chooseCampaignMapRenderer,
  terrainCameraForProfile,
  terrainCameraPreset,
  terrainExaggerationForProfile,
  type TerrainCameraPreset,
  type TerrainPresentationProfile
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
import { classifyTerrainRuntimeError } from '../presentation/r3-terrain-runtime-error';
import {
  applyTerrainOperationalMarkerDeclutter,
  buildTerrainOperationalMarkers,
  reconcileTerrainOperationalMarkers,
  removeTerrainOperationalMarkers
} from '../presentation/r3-terrain-operational-markers';

export interface TerrainMapPrototypeProps {
  state: GameState;
  onSelect: (territoryId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onFallback: (reason: string) => void;
  presentationProfile?: Exclude<TerrainPresentationProfile, 'svg-fallback'>;
}

type PrototypeStatus = 'initialising' | 'ready' | 'warning';

interface TerrainSourceResolution {
  source: RasterDEMSourceSpecification;
  label: string;
  attribution: string;
}

// MapLibre v6 ESM requires Vite's worker pipeline for GeoJSON/vector worker tasks.
setWorkerUrl(mapLibreWorkerUrl);

const terrainGeoJSON = activeGeojson as unknown as Parameters<typeof buildTerrainPoliticalGeoJSON>[0];
const terrainLandGeoJSON = europeLandMask as unknown as GeoJSONSourceSpecification['data'];
const COPERNICUS_ATTRIBUTION = 'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved';

function terrainViewportPadding(
  toolbar: HTMLElement | null,
  presentationProfile: Exclude<TerrainPresentationProfile, 'svg-fallback'>
) {
  const measuredToolbarHeight = toolbar?.getBoundingClientRect().height ?? 0;
  const minimumToolbarHeight = presentationProfile === 'compact' ? 72 : 52;
  return {
    top: Math.ceil(Math.max(measuredToolbarHeight, minimumToolbarHeight) + 24),
    right: presentationProfile === 'compact' ? 52 : 72,
    bottom: 40,
    left: 18
  };
}

function browserSupportsTerrain(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return chooseCampaignMapRenderer({
    webgl: Boolean(context),
    terrainEnabled: true
  }) === 'real-terrain';
}

function territoryCentre(territoryId: string | null): readonly [number, number] | undefined {
  if (!territoryId) return undefined;
  const features = (activeGeojson as unknown as {
    features: Array<{ properties?: { territory_id?: unknown; centre?: unknown } }>
  }).features;
  const centre = features.find(feature => feature.properties?.territory_id === territoryId)?.properties?.centre;
  if (!Array.isArray(centre) || centre.length !== 2) return undefined;
  const [longitude, latitude] = centre;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  return [longitude, latitude] as const;
}

async function resolveTerrainSource(): Promise<TerrainSourceResolution> {
  const manifestUrl = generatedTerrainManifestUrl(import.meta.env.BASE_URL);
  const response = await fetch(manifestUrl, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`terrain manifest returned ${response.status}`);
  const manifest = await response.json() as GeneratedTerrainTileJson;
  return {
    source: generatedRasterDemSource(manifest, import.meta.env.BASE_URL) as unknown as RasterDEMSourceSpecification,
    label: 'Copernicus GLO-30 static terrain',
    attribution: manifest.attribution
  };
}

let terrainSourcePromise: Promise<TerrainSourceResolution> | undefined;

function loadTerrainSource(): Promise<TerrainSourceResolution> {
  terrainSourcePromise ??= resolveTerrainSource().catch(error => {
    terrainSourcePromise = undefined;
    throw error;
  });
  return terrainSourcePromise;
}

/** Opportunistically warm the versioned manifest; failure remains owned by normal fallback. */
export function prewarmTerrainRuntime(): void {
  void loadTerrainSource().catch(() => undefined);
}

function mapStyle(
  politicalData: GeoJSONSourceSpecification['data'],
  frontData: GeoJSONSourceSpecification['data'],
  routeData: GeoJSONSourceSpecification['data'],
  nodeData: GeoJSONSourceSpecification['data'],
  demSource: RasterDEMSourceSpecification,
  presentationProfile: Exclude<TerrainPresentationProfile, 'svg-fallback'>
): StyleSpecification {
  const compact = presentationProfile === 'compact';
  return {
    version: 8,
    sources: {
      'r3-wp2b-land': {
        type: 'geojson',
        data: terrainLandGeoJSON
      },
      'r3-wp2b-terrain-dem': demSource,
      'r3-wp2b-hillshade-dem': { ...demSource },
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
      source: 'r3-wp2b-terrain-dem',
      exaggeration: terrainExaggerationForProfile(presentationProfile)
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
        id: 'r3-wp2b-land-wash',
        type: 'fill',
        source: 'r3-wp2b-land',
        paint: {
          'fill-color': '#6c805b',
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            3.6, compact ? 0.25 : 0.3,
            4.8, compact ? 0.23 : 0.27,
            6.4, compact ? 0.16 : 0.18,
            8.5, compact ? 0.1 : 0.12
          ]
        }
      },
      {
        id: 'r3-wp2b-hillshade',
        type: 'hillshade',
        source: 'r3-wp2b-hillshade-dem',
        minzoom: 4.8,
        paint: {
          'hillshade-exaggeration': compact ? 0.48 : 0.72,
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
          'line-opacity': 0.24,
          'line-width': 0.65
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
            'interpolate', ['linear'], ['zoom'],
            4, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.07
            ],
            5.5, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.09
            ],
            7, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.12
            ],
            9, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.13
            ]
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
            ['boolean', ['get', 'active_combat'], false], 0.24,
            ['==', ['get', 'threat_stage'], 'under-attack'], 0.22,
            ['==', ['get', 'threat_stage'], 'imminent'], 0.16,
            ['==', ['get', 'threat_stage'], 'preparing'], 0.09,
            ['==', ['get', 'threat_stage'], 'recent-combat'], 0.07,
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
          'line-color': '#d7d9cf',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.07, 5.5, 0.1, 7, 0.16, 9, 0.23],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 6, 0.45, 8, 0.68]
        }
      },
      {
        id: 'campaign-strategic-routes',
        type: 'line',
        source: 'campaign-strategic-routes',
        minzoom: compact ? 5.6 : 5,
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
            'interpolate', ['linear'], ['zoom'],
            5, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.04
            ],
            5.8, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.12
            ],
            7, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.26
            ],
            9, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.42
            ]
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              0.5
            ],
            6, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              0.7
            ],
            8, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              1.0
            ],
            10, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              1.25
            ]
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
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 6, 0.44, 8, 0.58, 10, 0.68],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.58, 6, 0.82, 8, 1.2]
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
          'line-color': '#332322',
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3.6, 6, 4.6, 8, 5.4, 10, 6.0]
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
          'line-color': '#ffad66',
          'line-opacity': 0.98,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.65, 6, 2.15, 8, 2.7, 10, 3.0]
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
            ['==', ['get', 'threat_stage'], 'recent-combat'], '#a96f67',
            ['boolean', ['get', 'targeted'], false], '#ffd58a',
            ['boolean', ['get', 'selected'], false], '#effffc',
            '#000000'
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'active_combat'], false], 0.96,
            ['==', ['get', 'threat_stage'], 'under-attack'], 0.94,
            ['==', ['get', 'threat_stage'], 'imminent'], 0.86,
            ['==', ['get', 'threat_stage'], 'preparing'], 0.68,
            ['==', ['get', 'threat_stage'], 'recent-combat'], 0.42,
            ['boolean', ['get', 'targeted'], false], 0.88,
            ['boolean', ['get', 'selected'], false], 0.92,
            0
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'active_combat'], false], 3.1,
            ['==', ['get', 'threat_stage'], 'under-attack'], 2.8,
            ['boolean', ['get', 'selected'], false], 2.6,
            ['boolean', ['get', 'targeted'], false], 2.3,
            ['==', ['get', 'threat_stage'], 'imminent'], 2.3,
            1.8
          ]
        }
      },
      {
        id: 'campaign-strategic-nodes',
        type: 'circle',
        source: 'campaign-strategic-nodes',
        minzoom: compact ? 6 : 5.4,
        filter: ['>=', ['get', 'importance'], compact ? 2 : 1],
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
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5.4, ['case', ['==', ['get', 'importance'], 3], 0.72, 0],
            6.2, ['case', ['>=', ['get', 'importance'], 2], 0.82, 0.16],
            7.2, 0.88
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'controller'], 'player'], '#6de2d2',
            '#c39a9e'
          ],
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5.4, ['case', ['==', ['get', 'importance'], 3], 0.8, 0],
            6.2, ['case', ['>=', ['get', 'importance'], 2], 0.88, 0.18],
            7.2, 0.94
          ]
        }
      }
    ]
  };
}

export function TerrainMapPrototypeImpl({
  state,
  onSelect,
  onSelectGroup,
  onFallback,
  presentationProfile = 'full'
}: TerrainMapPrototypeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const operationalMarkersRef = useRef<ReturnType<typeof buildTerrainOperationalMarkers>>([]);
  const selectRef = useRef(onSelect);
  const selectGroupRef = useRef(onSelectGroup);
  const fallbackRef = useRef(onFallback);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<PrototypeStatus>('initialising');
  const [message, setMessage] = useState('Initialising continuous terrain…');
  const [sourceAttribution, setSourceAttribution] = useState(COPERNICUS_ATTRIBUTION);

  selectRef.current = onSelect;
  selectGroupRef.current = onSelectGroup;
  fallbackRef.current = onFallback;

  const visibleThreats = useMemo(() => getThreatenedTerritories(state), [state]);
  const activeCombatTerritoryIds = useMemo(
    () => Object.values(state.operations).map(operation => operation.target),
    [state.operations]
  );
  const selectedCentre = useMemo(() => territoryCentre(state.selectedTerritory), [state.selectedTerritory]);
  const politicalData = useMemo(() => (
    buildTerrainPoliticalGeoJSON(terrainGeoJSON, state, {
      threatenedTerritories: visibleThreats,
      activeCombatTerritoryIds
    }) as unknown as GeoJSONSourceSpecification['data']
  ), [state.territories, state.selectedTerritory, state.targetTerritory, visibleThreats, activeCombatTerritoryIds]);
  const frontData = useMemo(() => (
    buildTerrainFrontGeoJSON(
      terrainGeoJSON,
      deriveR3FrontSegments(state.territories, TERRITORIES)
    ) as unknown as GeoJSONSourceSpecification['data']
  ), [state.territories]);
  const routeData = useMemo(() => (
    buildTerrainStrategicRouteGeoJSON(STRATEGIC_NODES, STRATEGIC_ROUTES, state) as unknown as GeoJSONSourceSpecification['data']
  ), [state.routeStates, state.logistics, state.selectedTaskGroupId]);
  const nodeData = useMemo(() => (
    buildTerrainStrategicNodeGeoJSON(STRATEGIC_NODES, state) as unknown as GeoJSONSourceSpecification['data']
  ), [state.territories]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!browserSupportsTerrain()) {
      fallbackRef.current('WebGL terrain rendering is unavailable; using the stable SVG command map.');
      return;
    }

    let disposed = false;
    let ownedMap: Map | null = null;
    let toolbarResizeObserver: ResizeObserver | null = null;

    const initialise = async () => {
      const terrainSource = await loadTerrainSource();
      if (disposed || !containerRef.current) return;

      setSourceAttribution(terrainSource.attribution);
      const initial = terrainCameraForProfile(terrainCameraPreset('campaign'), presentationProfile);
      const [west, south, east, north] = R3_TERRAIN_PROTOTYPE_BOUNDS;
      const map = new Map({
        container: containerRef.current,
        style: mapStyle(politicalData, frontData, routeData, nodeData, terrainSource.source, presentationProfile),
        center: [initial.center[0], initial.center[1]],
        zoom: initial.zoom,
        pitch: initial.pitch,
        bearing: initial.bearing,
        minZoom: 3.6,
        maxZoom: 10.5,
        maxPitch: presentationProfile === 'compact' ? 52 : 70,
        maxBounds: [[west, south], [east, north]],
        renderWorldCopies: false,
        keyboard: true,
        canvasContextAttributes: { antialias: presentationProfile === 'full' },
        attributionControl: {}
      });
      ownedMap = map;
      mapRef.current = map;
      map.addControl(new NavigationControl({ visualizePitch: presentationProfile === 'full' }), 'top-right');

      const applySafePadding = () => {
        map.setPadding(terrainViewportPadding(toolbarRef.current, presentationProfile));
      };
      applySafePadding();
      if (typeof ResizeObserver !== 'undefined' && toolbarRef.current) {
        toolbarResizeObserver = new ResizeObserver(applySafePadding);
        toolbarResizeObserver.observe(toolbarRef.current);
      }

      let terrainMeshMode: 'physical' | 'strategic-flat' = 'physical';
      const updateOverlayLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const zoom = map.getZoom();
        host.dataset.overlayZoom = zoom.toFixed(2);
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';
      };
      const updateTerrainMeshLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const nextMode = map.getZoom() < 4.8 ? 'strategic-flat' : 'physical';
        if (nextMode !== terrainMeshMode) {
          map.setTerrain(nextMode === 'physical' ? {
            source: 'r3-wp2b-terrain-dem',
            exaggeration: terrainExaggerationForProfile(presentationProfile)
          } : null);
          terrainMeshMode = nextMode;
        }
        host.dataset.terrainRelief = terrainMeshMode;
      };
      const refreshOperationalPresentation = () => {
        updateOverlayLod();
        updateTerrainMeshLod();
        applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);
      };
      map.on('zoom', updateOverlayLod);
      map.on('moveend', refreshOperationalPresentation);
      refreshOperationalPresentation();

      map.on('load', () => {
        loadedRef.current = true;
        setStatus('ready');
        setMessage(`${terrainSource.label} · ${presentationProfile === 'compact' ? 'compact terrain' : 'continuous relief'} · operational overlays projected from campaign state`);
      });

      window.setTimeout(() => {
        if (disposed || loadedRef.current) return;
        const sourceIds = [
          'r3-wp2b-land',
          'r3-wp2b-terrain-dem',
          'r3-wp2b-hillshade-dem',
          'campaign-territories',
          'campaign-fronts',
          'campaign-strategic-routes',
          'campaign-strategic-nodes'
        ];
        const sourceLoaded = Object.fromEntries(sourceIds.map(id => [id, map.getSource(id)?.loaded() ?? null]));
        console.info('R3 terrain readiness diagnostic', JSON.stringify({
          mapLoaded: map.loaded(),
          styleLoaded: map.isStyleLoaded(),
          tilesLoaded: map.areTilesLoaded(),
          sourceLoaded
        }));
      }, 3000);

      map.on('error', event => {
        const runtimeError = classifyTerrainRuntimeError(event.error);
        if (!loadedRef.current) {
          console.error(`R3 terrain initialisation error: ${runtimeError.detail}`, event.error);
          fallbackRef.current(`Terrain renderer error: ${runtimeError.detail}`);
          return;
        }

        if (runtimeError.kind === 'transient-tile-request') {
          console.info('R3 terrain transient tile request ignored', {
            status: runtimeError.status,
            url: runtimeError.url,
            detail: runtimeError.detail
          });
          return;
        }

        console.error(`R3 terrain source warning: ${runtimeError.detail}`, event.error);
        setStatus('warning');
        setMessage(`Terrain source warning · ${runtimeError.detail}`);
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
      removeTerrainOperationalMarkers(operationalMarkersRef.current);
      operationalMarkersRef.current = [];
      toolbarResizeObserver?.disconnect();
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
    const source = map.getSource('campaign-territories');
    if (source instanceof GeoJSONSource) source.setData(politicalData);
  }, [politicalData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('campaign-fronts');
    if (source instanceof GeoJSONSource) source.setData(frontData);
  }, [frontData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('campaign-strategic-routes');
    if (source instanceof GeoJSONSource) source.setData(routeData);
  }, [routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('campaign-strategic-nodes');
    if (source instanceof GeoJSONSource) source.setData(nodeData);
  }, [nodeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || status === 'initialising') return;

    operationalMarkersRef.current = reconcileTerrainOperationalMarkers(map, operationalMarkersRef.current, state, {
      onSelectTerritory: territoryId => selectRef.current(territoryId),
      onSelectGroup: groupId => selectGroupRef.current?.(groupId)
    });
    applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);

  }, [state, status]);

  const goTo = (preset: TerrainCameraPreset) => {
    const profiled = terrainCameraForProfile(preset, presentationProfile);
    const center = preset.id === 'selected' && selectedCentre ? selectedCentre : profiled.center;
    mapRef.current?.easeTo({
      center: [center[0], center[1]],
      zoom: profiled.zoom,
      pitch: profiled.pitch,
      bearing: profiled.bearing,
      padding: terrainViewportPadding(toolbarRef.current, presentationProfile),
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850
    });
  };

  return <div className="r3-terrain-prototype" data-status={status} data-terrain-profile={presentationProfile}>
    <div ref={toolbarRef} className="r3-terrain-prototype-toolbar" aria-label="Experimental terrain camera controls">
      <span aria-live="polite"><strong>R3 TERRAIN SPIKE</strong>{message}</span>
      <div>{R3_TERRAIN_CAMERA_PRESETS.map(preset => <button
        key={preset.id}
        type="button"
        disabled={preset.id === 'selected' && !state.selectedTerritory}
        onClick={() => goTo(preset)}
      >{preset.id}</button>)}</div>
    </div>
    <div
      ref={containerRef}
      className="r3-terrain-prototype-canvas"
      role="application"
      tabIndex={0}
      aria-describedby="r3-terrain-keyboard-help"
      aria-label="Experimental real-elevation campaign map"
    />
    <p id="r3-terrain-keyboard-help" className="r3-terrain-sr-only">Use arrow keys to pan and plus or minus to zoom. Use the theatre, campaign and selected buttons to restore strategic camera views.</p>
    <div className="r3-terrain-prototype-attribution">{sourceAttribution}</div>
  </div>;
}
