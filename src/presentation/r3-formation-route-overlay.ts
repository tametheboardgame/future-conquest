import type { Map, Marker } from 'maplibre-gl';
import type { FormationGeoPoint } from './r3-formation-movement';

const SVG_NS = 'http://www.w3.org/2000/svg';
const overlays = new WeakMap<Map, SVGSVGElement>();
const latestMarkers = new WeakMap<Map, readonly Marker[]>();
const trackedMaps = new WeakSet<Map>();

const parseMovementPath = (value: string | undefined): readonly FormationGeoPoint[] | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 2) return undefined;
    const points = parsed.flatMap(point => (
      Array.isArray(point)
      && point.length === 2
      && typeof point[0] === 'number'
      && typeof point[1] === 'number'
      && Number.isFinite(point[0])
      && Number.isFinite(point[1])
        ? [[point[0], point[1]] as FormationGeoPoint]
        : []
    ));
    return points.length >= 2 ? points : undefined;
  } catch {
    return undefined;
  }
};

const ensureOverlay = (map: Map) => {
  const existing = overlays.get(map);
  if (existing?.isConnected) return existing;
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.classList.add('r3-wp3-movement-routes');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');
  Object.assign(overlay.style, {
    position: 'absolute',
    zIndex: '2',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none'
  });
  map.getContainer().appendChild(overlay);
  overlays.set(map, overlay);
  return overlay;
};

const renderMovementRoutes = (map: Map, markers: readonly Marker[]) => {
  const routes = markers.flatMap(marker => {
    const element = marker.getElement();
    if (element.hidden || !element.dataset.groupId) return [];
    const path = parseMovementPath(element.dataset.movementPath);
    return path ? [{ groupId: element.dataset.groupId, path }] : [];
  });

  const existing = overlays.get(map);
  if (!routes.length) {
    existing?.replaceChildren();
    if (existing) existing.style.display = 'none';
    return;
  }

  const overlay = ensureOverlay(map);
  overlay.style.display = '';
  const rect = map.getContainer().getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  overlay.replaceChildren();

  const host = map.getContainer().closest('.r3-terrain-prototype') as HTMLElement | null;
  const theatre = host?.dataset.overlayLod === 'theatre';
  const compact = host?.dataset.terrainProfile === 'compact';
  const routeWidth = theatre || compact ? '1.5' : '2';
  const routeOpacity = theatre ? '0.58' : compact ? '0.62' : '0.72';
  const routeDash = theatre ? '5 5' : '7 5';

  const seen = new Set<string>();
  for (const route of routes) {
    const key = JSON.stringify(route.path);
    if (seen.has(key)) continue;
    seen.add(key);
    const projected = route.path.map(point => map.project([point[0], point[1]]));
    const polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.classList.add('r3-wp3-movement-route');
    polyline.dataset.groupId = route.groupId;
    polyline.setAttribute('points', projected.map(point => `${point.x},${point.y}`).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#8fe1d4');
    polyline.setAttribute('stroke-width', routeWidth);
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('stroke-dasharray', routeDash);
    polyline.setAttribute('opacity', routeOpacity);
    polyline.setAttribute('vector-effect', 'non-scaling-stroke');
    polyline.style.filter = 'drop-shadow(0 1px 2px rgba(0, 0, 0, .8))';
    overlay.appendChild(polyline);

    const target = projected[projected.length - 1];
    const targetMarker = document.createElementNS(SVG_NS, 'circle');
    targetMarker.classList.add('r3-wp3-movement-target');
    targetMarker.setAttribute('cx', String(target.x));
    targetMarker.setAttribute('cy', String(target.y));
    targetMarker.setAttribute('r', theatre || compact ? '3.5' : '4');
    targetMarker.setAttribute('fill', '#dffdf8');
    targetMarker.setAttribute('stroke', '#163f43');
    targetMarker.setAttribute('stroke-width', '2');
    targetMarker.setAttribute('opacity', '0.88');
    targetMarker.setAttribute('vector-effect', 'non-scaling-stroke');
    overlay.appendChild(targetMarker);
  }
};

export function syncFormationMovementRouteOverlay(map: Map, markers: readonly Marker[]) {
  latestMarkers.set(map, markers);
  if (!trackedMaps.has(map)) {
    const refresh = () => renderMovementRoutes(map, latestMarkers.get(map) ?? []);
    map.on('move', refresh);
    map.on('resize', refresh);
    trackedMaps.add(map);
  }
  renderMovementRoutes(map, markers);
}
