import { useMemo, useRef, useState } from 'react';
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
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
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

const THEATRE_LABELS: Array<{ code: string; name: string; position: [number, number] }> = [
  { code: 'IS', name: 'Iceland', position: [-18.6, 64.9] },
  { code: 'IE', name: 'Ireland', position: [-8.1, 53.3] },
  { code: 'UK', name: 'United Kingdom', position: [-3.1, 56.2] },
  { code: 'NO', name: 'Norway', position: [9.0, 62.3] },
  { code: 'SE', name: 'Sweden', position: [16.0, 62.0] },
  { code: 'FI', name: 'Finland', position: [26.0, 64.0] },
  { code: 'DK', name: 'Denmark', position: [9.4, 56.0] },
  { code: 'PT', name: 'Portugal', position: [-8.0, 39.6] },
  { code: 'ES', name: 'Spain', position: [-3.4, 40.2] },
  { code: 'FR', name: 'France', position: [2.1, 46.2] },
  { code: 'DE', name: 'Germany', position: [10.4, 51.2] },
  { code: 'IT', name: 'Italy', position: [12.6, 42.6] },
  { code: 'PL', name: 'Poland', position: [19.1, 52.0] },
  { code: 'CZ', name: 'Czechia', position: [15.3, 49.8] },
  { code: 'SK', name: 'Slovakia', position: [19.5, 48.7] },
  { code: 'HU', name: 'Hungary', position: [19.3, 47.2] },
  { code: 'RO', name: 'Romania', position: [25.0, 45.9] },
  { code: 'BG', name: 'Bulgaria', position: [25.2, 42.8] },
  { code: 'GR', name: 'Greece', position: [22.2, 39.1] },
  { code: 'HR', name: 'Croatia', position: [16.4, 45.2] },
  { code: 'RS', name: 'Serbia', position: [20.8, 44.0] },
  { code: 'BA', name: 'Bosnia and Herzegovina', position: [17.8, 44.1] },
  { code: 'AL', name: 'Albania', position: [20.0, 41.2] },
  { code: 'LT', name: 'Lithuania', position: [23.9, 55.2] },
  { code: 'LV', name: 'Latvia', position: [24.6, 57.0] },
  { code: 'EE', name: 'Estonia', position: [25.5, 58.6] },
  { code: 'BY', name: 'Belarus', position: [28.0, 53.7] },
  { code: 'UA', name: 'Ukraine', position: [31.3, 49.0] },
  { code: 'MD', name: 'Moldova', position: [28.6, 47.2] },
  { code: 'TR', name: 'Türkiye', position: [29.7, 39.1] },
  { code: 'RU', name: 'Western Russia', position: [39.0, 56.0] }
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

const midpoint = (first: PointerPosition, second: PointerPosition): PointerPosition => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});
const distance = (first: PointerPosition, second: PointerPosition) => Math.hypot(second.x - first.x, second.y - first.y);

export function MapView({ state, onSelect, onSelectGroup }: Props) {
  const [view, setView] = useState<MapViewBox>(FULL_THEATRE_VIEW);
  const [panning, setPanning] = useState(false);
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, PointerPosition>());
  const dragGesture = useRef<DragGesture | null>(null);
  const pinchGesture = useRef<PinchGesture | null>(null);
  const suppressClick = useRef(false);
  viewRef.current = view;

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
  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;

  const statusText = useMemo(() => {
    if (zoomPercent <= 110) return 'European theatre overview';
    if (zoomPercent <= 220) return 'Regional command view';
    return 'Local operations view';
  }, [zoomPercent]);

  const selectTerritory = (id: string) => {
    if (!suppressClick.current) onSelect(id);
  };

  const focusCampaign = () => setView(CAMPAIGN_VIEW);
  const focusSelection = () => {
    if (selectedAnchor) setView(focusMapView({ x: selectedAnchor[0], y: selectedAnchor[1] }, 4));
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
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setPanning(true);
    if (pointers.current.size === 1) {
      dragGesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, view: viewRef.current };
      pinchGesture.current = null;
    } else if (pointers.current.size === 2) {
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
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) suppressClick.current = true;
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
      <g className={`future-theatre-labels ${zoomPercent > 230 ? 'faded' : ''}`} aria-hidden="true">
        {projectedTheatreLabels.map(label => <text key={label.code} x={label.x} y={label.y}><title>{label.name}</title>{label.code}</text>)}
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
        {Object.values(state.operations).flatMap(operation => operation.participantGroupIds.map((groupId, index) => {
          const group = state.taskGroups[groupId];
          const originId = operation.origins[groupId] ?? group?.location;
          if (!originId || !anchors[originId] || !anchors[operation.target]) return null;
          const [x1, y1] = anchors[originId];
          const [x2, y2] = anchors[operation.target];
          const offset = (index - (operation.participantGroupIds.length - 1) / 2) * 4;
          return <line key={`${operation.id}-${groupId}`} className="operation-route" x1={x1 + offset} y1={y1 + offset} x2={x2 + offset} y2={y2 + offset} markerEnd="url(#operationArrow)" />;
        }))}
        {activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          const reachable = adjacentTargets.has(id);
          const action = territory.controller === 'enemy' ? 'ATTACK' : 'MOVE';
          const operation = Object.values(state.operations).find(activeOperation => activeOperation.target === id);
          return <g key={`${id}-label`} className="map-label" onClick={() => selectTerritory(id)}>
            {reachable && <text x={x} y={y - 25} className={`order-label ${territory.controller}`}>{action}</text>}
            {operation && <g className="operation-marker" transform={`translate(${x - 25} ${y - 31})`}><rect x="-15" y="-8" width="30" height="16" rx="3" /><text x="0" y="4">{operation.participantGroupIds.length}×</text></g>}
            <circle cx={x} cy={y - 8} r="3" />
            <text x={x} y={y + 8}>{TERRITORIES[id].centre}</text>
            {!territory.supplied && territory.controller === 'player' && <text className="isolated-label" x={x} y={y + 23}>ISOLATED</text>}
          </g>;
        })}
        {Object.entries(enemyCounts).map(([territoryId, count]) => {
          const anchor = anchors[territoryId];
          if (!anchor) return null;
          const [x, y] = anchor;
          return <g key={`enemy-${territoryId}`} className="enemy-marker" transform={`translate(${x + 24} ${y - 24})`}><path d="M0 -10 L10 8 L-10 8 Z" /><text x="0" y="4">{count}</text></g>;
        })}
        {Object.entries(groupsByTerritory).flatMap(([territoryId, territoryGroups]) => {
          const anchor = anchors[territoryId];
          if (!anchor) return [];
          const [x, y] = anchor;
          return territoryGroups.map((group, index) => {
            const dx = -28 + (index % 2) * 29;
            const dy = 23 + Math.floor(index / 2) * 24;
            const selected = group.id === state.selectedTaskGroupId;
            return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); if (!suppressClick.current) onSelectGroup(group.id); }}>
              <rect x="-12" y="-9" width="24" height="18" rx="3" />
              <text x="0" y="4">{group.id.replace('TG-', '')}</text>
            </g>;
          });
        })}
        {state.portalTerritory && anchors[state.portalTerritory] && (() => {
          const [x, y] = anchors[state.portalTerritory];
          return <g className="portal" filter="url(#glow)"><circle cx={x} cy={y - 8} r="12" /><circle cx={x} cy={y - 8} r="5" /></g>;
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
