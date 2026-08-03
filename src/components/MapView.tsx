import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { geoCentroid, geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { feature as topojsonFeature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import activeGeojson from '../assets/vertical-slice-map.json';
import { SLICE_IDS, TERRITORIES } from '../game/data';
import { STRATEGIC_NODE_BY_ID, STRATEGIC_NODES, STRATEGIC_ROUTES } from '../game/strategic-network-data';
import {
  FULL_THEATRE_VIEW,
  MAP_HEIGHT,
  MAP_WIDTH,
  fitMapBounds,
  focusMapView,
  mapZoomPercent,
  panMapView,
  screenPointToMap,
  zoomMapView,
  type MapPoint,
  type MapViewBox
} from '../game/map-viewport';
import { getAdjacentOrderTargets } from '../game/order-targeting';
import type { GameState, StrategicNodeType } from '../game/types';

interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
  operationConfirmation?: {
    territoryId: string;
    label: string;
    onConfirm: () => void;
  };
}

interface GeoFeature {
  id?: string | number;
  properties?: { name?: string; territory_id?: string; label_anchor?: [number, number] };
  geometry: unknown;
}

interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

interface PointerPosition {
  x: number;
  y: number;
}

interface DragGesture {
  pointerId: number;
  x: number;
  y: number;
  view: MapViewBox;
}

interface PinchGesture {
  distance: number;
  midpoint: PointerPosition;
  anchor: MapPoint;
  view: MapViewBox;
}

interface MapLayers {
  countries: boolean;
  territories: boolean;
  orderPrompts: boolean;
  friendlyUnits: boolean;
  enemyUnits: boolean;
  operations: boolean;
  routes: boolean;
  cities: boolean;
  ports: boolean;
  airports: boolean;
}

const MAP_LAYER_OPTIONS: Array<{ id: keyof MapLayers; label: string }> = [
  { id: 'countries', label: 'Country names' },
  { id: 'territories', label: 'Territory names' },
  { id: 'orderPrompts', label: 'Order prompts' },
  { id: 'friendlyUnits', label: 'Friendly formations' },
  { id: 'enemyUnits', label: 'Enemy formations' },
  { id: 'operations', label: 'Operations and routes' },
  { id: 'routes', label: 'Strategic routes' },
  { id: 'cities', label: 'Cities and hubs' },
  { id: 'ports', label: 'Ports' },
  { id: 'airports', label: 'Airports' }
];

const DEFAULT_MAP_LAYERS: MapLayers = {
  countries: true,
  territories: true,
  orderPrompts: true,
  friendlyUnits: true,
  enemyUnits: true,
  operations: true,
  routes: true,
  cities: true,
  ports: true,
  airports: true
};

let retainedMapView: MapViewBox = FULL_THEATRE_VIEW;
let retainedMapLayers: MapLayers = DEFAULT_MAP_LAYERS;

const responsiveOverlayBoost = () => {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia('(max-width: 540px)').matches) return 2.7;
  if (window.matchMedia('(max-width: 900px)').matches) return 1.5;
  return 1;
};

const THEATRE_LABELS: Array<{ code: string; name: string; position: [number, number]; compact?: boolean }> = [
  { code: 'IS', name: 'Iceland', position: [-18.6, 64.9] },
  { code: 'IE', name: 'Ireland', position: [-8.1, 53.3] },
  { code: 'UK', name: 'United Kingdom', position: [-3.1, 56.2] },
  { code: 'NO', name: 'Norway', position: [9.0, 62.3] },
  { code: 'SE', name: 'Sweden', position: [16.0, 62.0] },
  { code: 'FI', name: 'Finland', position: [26.0, 64.0] },
  { code: 'DK', name: 'Denmark', position: [9.4, 56.0] },
  { code: 'NL', name: 'Netherlands', position: [5.3, 52.3], compact: true },
  { code: 'BE', name: 'Belgium', position: [4.7, 50.8], compact: true },
  { code: 'LU', name: 'Luxembourg', position: [6.1, 49.7], compact: true },
  { code: 'PT', name: 'Portugal', position: [-8.0, 39.6] },
  { code: 'ES', name: 'Spain', position: [-3.4, 40.2] },
  { code: 'AD', name: 'Andorra', position: [1.6, 42.55], compact: true },
  { code: 'FR', name: 'France', position: [2.1, 46.2] },
  { code: 'MC', name: 'Monaco', position: [7.42, 43.73], compact: true },
  { code: 'DE', name: 'Germany', position: [10.4, 51.2] },
  { code: 'CH', name: 'Switzerland', position: [8.2, 46.8], compact: true },
  { code: 'LI', name: 'Liechtenstein', position: [9.55, 47.16], compact: true },
  { code: 'AT', name: 'Austria', position: [14.1, 47.6] },
  { code: 'IT', name: 'Italy', position: [12.6, 42.6] },
  { code: 'SM', name: 'San Marino', position: [12.45, 43.94], compact: true },
  { code: 'VA', name: 'Vatican City', position: [12.45, 41.9], compact: true },
  { code: 'MT', name: 'Malta', position: [14.4, 35.9], compact: true },
  { code: 'PL', name: 'Poland', position: [19.1, 52.0] },
  { code: 'CZ', name: 'Czechia', position: [15.3, 49.8], compact: true },
  { code: 'SK', name: 'Slovakia', position: [19.5, 48.7], compact: true },
  { code: 'HU', name: 'Hungary', position: [19.3, 47.2] },
  { code: 'SI', name: 'Slovenia', position: [14.9, 46.1], compact: true },
  { code: 'HR', name: 'Croatia', position: [16.4, 45.2], compact: true },
  { code: 'BA', name: 'Bosnia & Herz.', position: [17.8, 44.1], compact: true },
  { code: 'RS', name: 'Serbia', position: [20.8, 44.0] },
  { code: 'ME', name: 'Montenegro', position: [19.25, 42.8], compact: true },
  { code: 'XK', name: 'Kosovo', position: [20.9, 42.6], compact: true },
  { code: 'AL', name: 'Albania', position: [20.0, 41.2], compact: true },
  { code: 'MK', name: 'North Macedonia', position: [21.7, 41.6], compact: true },
  { code: 'RO', name: 'Romania', position: [25.0, 45.9] },
  { code: 'BG', name: 'Bulgaria', position: [25.2, 42.8] },
  { code: 'GR', name: 'Greece', position: [22.2, 39.1] },
  { code: 'LT', name: 'Lithuania', position: [23.9, 55.2], compact: true },
  { code: 'LV', name: 'Latvia', position: [24.6, 57.0], compact: true },
  { code: 'EE', name: 'Estonia', position: [25.5, 58.6], compact: true },
  { code: 'BY', name: 'Belarus', position: [28.0, 53.7] },
  { code: 'UA', name: 'Ukraine', position: [31.3, 49.0] },
  { code: 'MD', name: 'Moldova', position: [28.6, 47.2], compact: true },
  { code: 'TR', name: 'Türkiye', position: [29.7, 39.1] },
  { code: 'CY', name: 'Cyprus', position: [33.2, 35.1], compact: true },
  { code: 'GE', name: 'Georgia', position: [43.4, 42.1], compact: true },
  { code: 'AM', name: 'Armenia', position: [44.9, 40.3], compact: true },
  { code: 'AZ', name: 'Azerbaijan', position: [47.5, 40.4], compact: true },
  { code: 'RU', name: 'Russia', position: [39.0, 56.0] }
];

const atlas = worldAtlas as unknown as { objects: { countries: unknown } };
const allCountries = (topojsonFeature(atlas, atlas.objects.countries) as GeoCollection).features;
const isEuropeanFeature = (country: GeoFeature) => {
  const name = country.properties?.name ?? '';
  const [longitude, latitude] = geoCentroid(country);
  return (
    longitude >= -25 && longitude <= 50 && latitude >= 33 && latitude <= 72
  ) || name === 'Russia';
};
const theatreCountries = allCountries.filter(isEuropeanFeature);
const fitCountries = theatreCountries.filter(country => country.properties?.name !== 'Russia');
const fitCollection: GeoCollection = { type: 'FeatureCollection', features: fitCountries };
const projection = geoMercator();
projection.fitExtent([[34, 28], [MAP_WIDTH - 34, MAP_HEIGHT - 28]], fitCollection);
const pathGenerator = geoPath(projection);
const countryPaths = theatreCountries.map(country => ({
  id: String(country.id ?? country.properties?.name ?? Math.random()),
  name: country.properties?.name ?? 'European theatre',
  path: pathGenerator(country) ?? ''
}));
const graticulePath = pathGenerator(geoGraticule10()) ?? '';
const activeFeatures = (activeGeojson as unknown as GeoCollection).features
  .filter(active => SLICE_IDS.includes(active.properties?.territory_id as typeof SLICE_IDS[number]));
const activeCollection: GeoCollection = { type: 'FeatureCollection', features: activeFeatures };
const activePaths = activeFeatures.map(active => ({
  feature: active,
  id: active.properties?.territory_id ?? '',
  path: pathGenerator(active) ?? ''
}));
const anchors = Object.fromEntries(activeFeatures.flatMap(active => {
  const id = active.properties?.territory_id;
  const source = active.properties?.label_anchor;
  const projected = source ? projection(source) : null;
  return id && projected ? [[id, projected]] : [];
})) as Record<string, [number, number]>;
const CAMPAIGN_VIEW = fitMapBounds(pathGenerator.bounds(activeCollection), 54);
const projectedTheatreLabels = THEATRE_LABELS.flatMap(label => {
  const projected = projection(label.position);
  return projected ? [{ ...label, x: projected[0], y: projected[1] }] : [];
});

const projectedStrategicNodes = STRATEGIC_NODES.flatMap(node => {
  const projected = projection(node.position);
  return projected ? [{ ...node, x: projected[0], y: projected[1] }] : [];
});
const projectedStrategicNodeById = Object.fromEntries(
  projectedStrategicNodes.map(node => [node.id, node])
) as Record<string, typeof projectedStrategicNodes[number]>;
const projectedStrategicRoutes = STRATEGIC_ROUTES.flatMap(route => {
  const from = projectedStrategicNodeById[route.fromNodeId];
  const to = projectedStrategicNodeById[route.toNodeId];
  return from && to ? [{ ...route, x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : [];
});

const STRATEGIC_NODE_SYMBOLS: Record<StrategicNodeType, string> = {
  capital: 'C',
  city: '•',
  port: 'P',
  airport: 'A',
  'rail-hub': 'R',
  crossing: 'X',
  logistics: 'L'
};

const midpoint = (first: PointerPosition, second: PointerPosition): PointerPosition => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});
const distance = (first: PointerPosition, second: PointerPosition) => Math.hypot(second.x - first.x, second.y - first.y);

export function MapView({ state, onSelect, onSelectGroup, operationConfirmation }: Props) {
  const [view, setView] = useState<MapViewBox>(() => retainedMapView);
  const [panning, setPanning] = useState(false);
  const [layers, setLayers] = useState<MapLayers>(() => retainedMapLayers);
  const [overlayBoost, setOverlayBoost] = useState(responsiveOverlayBoost);
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, PointerPosition>());
  const dragGesture = useRef<DragGesture | null>(null);
  const pinchGesture = useRef<PinchGesture | null>(null);
  const suppressClick = useRef(false);
  viewRef.current = view;

  useEffect(() => {
    retainedMapView = view;
  }, [view]);

  useEffect(() => {
    retainedMapLayers = layers;
  }, [layers]);

  useEffect(() => {
    const refreshOverlayBoost = () => setOverlayBoost(responsiveOverlayBoost());
    window.addEventListener('resize', refreshOverlayBoost);
    return () => window.removeEventListener('resize', refreshOverlayBoost);
  }, []);

  const groupsByTerritory = Object.values(state.taskGroups).reduce<Record<string, typeof state.taskGroups[string][]>>((result, group) => {
    (result[group.location] ??= []).push(group);
    return result;
  }, {});
  const enemyCounts = Object.values(state.enemyFormations).reduce<Record<string, number>>((result, formation) => {
    if (formation.personnel > 0) result[formation.location] = (result[formation.location] ?? 0) + 1;
    return result;
  }, {});
  const adjacentTargets = new Set(getAdjacentOrderTargets(state));
  const activeTargets = new Set(Object.values(state.operations).map(operation => operation.target));
  const zoomPercent = mapZoomPercent(view);
  const overlayScale = view.width / MAP_WIDTH * overlayBoost;
  const showTerritoryLabels = zoomPercent >= 135;
  const showTerritoryNames = zoomPercent >= 285;
  const showTerritoryOverlay = showTerritoryLabels && (layers.territories || layers.orderPrompts);
  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;
  const operationConfirmationAnchor = operationConfirmation ? anchors[operationConfirmation.territoryId] : undefined;
  const activeLayerCount = Object.values(layers).filter(Boolean).length;
  const showStrategicNodes = zoomPercent >= 150;
  const showStrategicNodeNames = zoomPercent >= 285;

  const statusText = useMemo(() => {
    if (zoomPercent <= 110) return 'European theatre overview';
    if (zoomPercent <= 220) return 'Regional command view';
    if (zoomPercent <= 600) return 'Local operations view';
    return 'Tactical detail view';
  }, [zoomPercent]);

  const selectTerritory = (id: string) => {
    if (!suppressClick.current) onSelect(id);
  };

  const toggleLayer = (layer: keyof MapLayers) => {
    setLayers(current => ({ ...current, [layer]: !current[layer] }));
  };

  const focusCampaign = () => setView(CAMPAIGN_VIEW);
  const focusSelection = () => {
    if (selectedAnchor) setView(focusMapView({ x: selectedAnchor[0], y: selectedAnchor[1] }, 7));
    else focusCampaign();
  };
  const zoomAtCentre = (factor: number) => setView(current => zoomMapView(current, factor, {
    x: current.x + current.width / 2,
    y: current.y + current.height / 2
  }));

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const anchor = screenPointToMap(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), viewRef.current);
    const factor = Math.exp(-event.deltaY * 0.0015);
    setView(current => zoomMapView(current, factor, anchor));
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      dragGesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view: viewRef.current };
      pinchGesture.current = null;
    } else if (pointers.current.size === 2) {
      for (const pointerId of pointers.current.keys()) {
        if (!event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.setPointerCapture(pointerId);
      }
      setPanning(true);
      const [first, second] = [...pointers.current.values()];
      const centre = midpoint(first, second);
      pinchGesture.current = {
        distance: Math.max(1, distance(first, second)),
        midpoint: centre,
        anchor: screenPointToMap(centre.x, centre.y, event.currentTarget.getBoundingClientRect(), viewRef.current),
        view: viewRef.current
      };
      dragGesture.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    if (pointers.current.size >= 2 && pinchGesture.current) {
      const [first, second] = [...pointers.current.values()];
      const currentMidpoint = midpoint(first, second);
      const currentDistance = Math.max(1, distance(first, second));
      const initial = pinchGesture.current;
      const zoomed = zoomMapView(initial.view, currentDistance / initial.distance, initial.anchor);
      const moveX = -(currentMidpoint.x - initial.midpoint.x) * zoomed.width / Math.max(1, rect.width);
      const moveY = -(currentMidpoint.y - initial.midpoint.y) * zoomed.height / Math.max(1, rect.height);
      suppressClick.current = true;
      setView(panMapView(zoomed, moveX, moveY));
      return;
    }
    const drag = dragGesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    const dragDistance = Math.abs(deltaX) + Math.abs(deltaY);
    if (dragDistance <= 4 && !suppressClick.current) return;
    if (!suppressClick.current) {
      suppressClick.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
      setPanning(true);
    }
    setView(panMapView(
      drag.view,
      -deltaX * drag.view.width / Math.max(1, rect.width),
      -deltaY * drag.view.height / Math.max(1, rect.height)
    ));
  };

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    pinchGesture.current = null;
    if (pointers.current.size === 1) {
      const [pointerId, position] = [...pointers.current.entries()][0];
      dragGesture.current = { pointerId, x: position.x, y: position.y, view: viewRef.current };
    } else {
      dragGesture.current = null;
      setPanning(false);
    }
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  };

  const handleDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    const anchor = screenPointToMap(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), viewRef.current);
    setView(current => zoomMapView(current, 1.65, anchor));
  };

  const handleKeyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const current = viewRef.current;
    const horizontalStep = current.width * 0.09;
    const verticalStep = current.height * 0.09;
    let handled = true;
    if (event.key === 'ArrowLeft') setView(panMapView(current, -horizontalStep, 0));
    else if (event.key === 'ArrowRight') setView(panMapView(current, horizontalStep, 0));
    else if (event.key === 'ArrowUp') setView(panMapView(current, 0, -verticalStep));
    else if (event.key === 'ArrowDown') setView(panMapView(current, 0, verticalStep));
    else if (event.key === '+' || event.key === '=') zoomAtCentre(1.35);
    else if (event.key === '-') zoomAtCentre(1 / 1.35);
    else if (event.key === '0' || event.key.toLowerCase() === 't') setView(FULL_THEATRE_VIEW);
    else if (event.key.toLowerCase() === 'c') focusCampaign();
    else if (event.key.toLowerCase() === 'f') focusSelection();
    else handled = false;
    if (handled) event.preventDefault();
  };

  return <div className="europe-map-frame" data-map-platform="europe-v1">
    <div className="map-controls" aria-label="Map viewport controls">
      <div className="map-zoom-buttons">
        <button type="button" onClick={() => zoomAtCentre(1.35)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAtCentre(1 / 1.35)} aria-label="Zoom out">−</button>
      </div>
      <button type="button" onClick={() => setView(FULL_THEATRE_VIEW)}>Europe</button>
      <button type="button" onClick={focusCampaign}>Campaign</button>
      <button type="button" onClick={focusSelection} disabled={!state.selectedTerritory}>Selected</button>
      <details className="map-layer-control">
        <summary><span>Layers</span><b>{activeLayerCount}/{MAP_LAYER_OPTIONS.length}</b></summary>
        <div className="map-layer-options">
          <p>Map labels and markers</p>
          {MAP_LAYER_OPTIONS.map(option => <label key={option.id}>
            <input type="checkbox" checked={layers[option.id]} onChange={() => toggleLayer(option.id)} />
            <span>{option.label}</span>
          </label>)}
        </div>
      </details>
    </div>

    <svg
      className={`map europe-map ${panning ? 'panning' : ''}`}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      role="application"
      aria-label="Interactive European campaign theatre. Drag to pan, use the mouse wheel or pinch gesture to zoom."
      tabIndex={0}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyboard}
    >
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="softGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <marker id="operationArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
      </defs>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="sea" />
      <path d={graticulePath} className="map-graticule" />
      <g className="future-theatre">
        {countryPaths.map(country => <path key={country.id} d={country.path} className="theatre-country"><title>{country.name} · future operational theatre</title></path>)}
      </g>

      <g className="active-campaign-layer">
        {activePaths.map(({ id, path }) => {
          const territory = state.territories[id];
          if (!territory) return null;
          const selected = state.selectedTerritory === id;
          const targeted = state.targetTerritory === id;
          const active = activeTargets.has(id);
          const reachable = adjacentTargets.has(id) && !selected && !targeted && !active;
          const reachStyle = reachable ? {
            stroke: territory.controller === 'enemy' ? '#ffb45c' : '#8ff9ed',
            strokeWidth: 3,
            strokeDasharray: '8 5'
          } : undefined;
          return <path key={id} d={path} onClick={() => selectTerritory(id)} style={reachStyle} className={`territory ${territory.controller} ${territory.supplied ? 'supplied' : 'isolated'} ${territory.occupation === 'unsecured' ? 'unsecured-control' : ''} ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''} ${active ? 'active-battle' : ''}`} />;
        })}

        {layers.routes && zoomPercent >= 120 && <g className="strategic-route-layer" aria-hidden="true">
          {projectedStrategicRoutes.map(route => {
            const routeState = state.routeStates[route.id];
            return <line
              key={route.id}
              className={`strategic-route ${route.type} ${routeState?.status ?? 'open'}`}
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
            ><title>{route.name} · {routeState?.status ?? 'open'}</title></line>;
          })}
        </g>}

        {showStrategicNodes && <g className="strategic-node-layer" aria-hidden="true">
          {projectedStrategicNodes.filter(node => (
            node.type === 'port' ? layers.ports :
            node.type === 'airport' ? layers.airports :
            layers.cities
          )).map(node => {
            const radius = node.type === 'capital' ? 6 : node.importance === 3 ? 5 : 4;
            return <g key={node.id} className={`strategic-node ${node.type}`} transform={`translate(${node.x} ${node.y}) scale(${overlayScale})`}>
              <circle className="node-marker" cx="0" cy="0" r={radius} />
              <text className="node-symbol" x="0" y="2">{STRATEGIC_NODE_SYMBOLS[node.type]}</text>
              {showStrategicNodeNames && <text className="node-name" x="0" y={radius + 11}>{node.name}</text>}
              <title>{node.name} · {node.type} · {TERRITORIES[node.territoryId].name}</title>
            </g>;
          })}
        </g>}

        {layers.countries && <g className="future-theatre-labels" aria-hidden="true">
          {projectedTheatreLabels.map(label => <g key={label.code} transform={`translate(${label.x} ${label.y}) scale(${overlayScale})`}>
            <text className={`country-name-label ${label.compact ? 'compact' : ''}`} x="0" y="0"><title>{label.name}</title>{label.name}</text>
          </g>)}
        </g>}

        {layers.operations && Object.values(state.operations).flatMap(operation => operation.participantGroupIds.map((groupId, index) => {
          const group = state.taskGroups[groupId];
          const originId = operation.origins[groupId] ?? group?.location;
          if (!originId || !anchors[originId] || !anchors[operation.target]) return null;
          const [x1, y1] = anchors[originId];
          const [x2, y2] = anchors[operation.target];
          const offset = (index - (operation.participantGroupIds.length - 1) / 2) * 4 * overlayScale;
          return <line key={`${operation.id}-${groupId}`} className="operation-route" x1={x1 + offset} y1={y1 + offset} x2={x2 + offset} y2={y2 + offset} markerEnd="url(#operationArrow)" />;
        }))}

        {operationConfirmation && operationConfirmationAnchor && <g
          className="map-operation-confirmation"
          transform={`translate(${operationConfirmationAnchor[0]} ${operationConfirmationAnchor[1]}) scale(${overlayScale})`}
          role="button"
          tabIndex={0}
          aria-label={operationConfirmation.label}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            operationConfirmation.onConfirm();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              operationConfirmation.onConfirm();
            }
          }}
        >
          <rect x="-67" y="-52" width="134" height="32" rx="4" />
          <text x="0" y="-32">{operationConfirmation.label}</text>
        </g>}

        {showTerritoryLabels && activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          return <g key={`${id}-hit`} className="territory-hit-area" transform={`translate(${x} ${y}) scale(${overlayScale})`}>
            <circle className="territory-hit-target" cx="0" cy="0" r="18" onClick={() => selectTerritory(id)} />
          </g>;
        })}

        {showTerritoryOverlay && activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          const reachable = adjacentTargets.has(id);
          const action = territory.controller === 'enemy' ? 'ATTACK' : 'MOVE';
          const isolatedOffset = showTerritoryNames ? 34 : 23;
          return <g key={`${id}-label`} className={`map-label ${state.selectedTerritory === id ? 'selected-label' : ''}`} transform={`translate(${x} ${y}) scale(${overlayScale})`}>
            {layers.orderPrompts && reachable && <text x="0" y="-25" className={`order-label ${territory.controller}`}>{action}</text>}
            {layers.territories && <>
              <circle cx="0" cy="-8" r="3" />
              <text className="territory-centre-label" x="0" y="8">{TERRITORIES[id].centre}</text>
              {showTerritoryNames && <text className="territory-name-label" x="0" y="21">{TERRITORIES[id].name}</text>}
              {!territory.supplied && territory.controller === 'player' && <text className="isolated-label" x="0" y={isolatedOffset}>ISOLATED</text>}
            </>}
          </g>;
        })}

        {layers.operations && Object.values(state.operations).map(operation => {
          const anchor = anchors[operation.target];
          if (!anchor) return null;
          const [x, y] = anchor;
          return <g key={`${operation.id}-marker`} className="operation-marker" transform={`translate(${x - 25 * overlayScale} ${y - 31 * overlayScale}) scale(${overlayScale})`}><rect x="-15" y="-8" width="30" height="16" rx="3" /><text x="0" y="4">{operation.participantGroupIds.length}×</text></g>;
        })}

        {layers.enemyUnits && Object.entries(enemyCounts).map(([territoryId, count]) => {
          const anchor = anchors[territoryId];
          if (!anchor) return null;
          const [x, y] = anchor;
          return <g key={`enemy-${territoryId}`} className="enemy-marker" transform={`translate(${x + 24 * overlayScale} ${y - 24 * overlayScale}) scale(${overlayScale})`}><path d="M0 -10 L10 8 L-10 8 Z" /><text x="0" y="4">{count}</text></g>;
        })}

        {layers.friendlyUnits && Object.entries(groupsByTerritory).flatMap(([territoryId, territoryGroups]) => {
          const anchor = anchors[territoryId];
          if (!anchor) return [];
          const [x, y] = anchor;
          return territoryGroups.map((group, index) => {
            const dx = (-28 + (index % 2) * 29) * overlayScale;
            const dy = (23 + Math.floor(index / 2) * 24) * overlayScale;
            const selected = group.id === state.selectedTaskGroupId;
            return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); if (!suppressClick.current) onSelectGroup(group.id); }}>
              <rect x="-12" y="-9" width="24" height="18" rx="3" />
              <text x="0" y="4">{group.id.replace('TG-', '')}</text>
            </g>;
          });
        })}

        {state.portalTerritory && anchors[state.portalTerritory] && (() => {
          const [x, y] = anchors[state.portalTerritory];
          return <g className="portal" transform={`translate(${x} ${y}) scale(${overlayScale})`} filter="url(#glow)"><circle cx="0" cy="-8" r="12" /><circle cx="0" cy="-8" r="5" /></g>;
        })()}
      </g>
    </svg>

    <div className="map-viewport-status" aria-live="polite">
      <strong>{zoomPercent}%</strong>
      <span>{statusText}</span>
      <small>Drag · wheel/pinch · arrows · +/− · T Europe · C campaign · F selected</small>
    </div>
  </div>;
}
