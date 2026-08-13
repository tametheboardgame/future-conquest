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
    if (existing) existing.hidden = true;
    return;
  }

  const overlay = ensureOverlay(map);
  overlay.hidden = false;
  const rect = map.getContainer().getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  overlay.replaceChildren();

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
    overlay.appendChild(polyline);

    const target = projected[projected.length - 1];
    const targetMarker = document.createElementNS(SVG_NS, 'circle');
    targetMarker.classList.add('r3-wp3-movement-target');
    targetMarker.setAttribute('cx', String(target.x));
    targetMarker.setAttribute('cy', String(target.y));
    targetMarker.setAttribute('r', '4');
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
