import { STRATEGIC_NODES, STRATEGIC_ROUTES } from '../game/strategic-network-data';
import type { TaskGroup } from '../game/types';

export type FormationGeoPoint = readonly [number, number];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// WP3 derives a display coordinate only. Engine-owned location, route progress
// and arrival timing remain unchanged and continue to resolve in game state.
const pointDistance = (a: FormationGeoPoint, b: FormationGeoPoint) => {
  const meanLatitude = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const longitudeDistance = (b[0] - a[0]) * Math.cos(meanLatitude);
  const latitudeDistance = b[1] - a[1];
  return Math.hypot(longitudeDistance, latitudeDistance);
};

export function interpolateFormationPath(
  points: readonly FormationGeoPoint[],
  progress: number
): FormationGeoPoint | undefined {
  if (!points.length) return undefined;
  if (points.length === 1) return points[0];
  const segments = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    length: pointDistance(points[index], point)
  }));
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (totalLength <= 0) return points[points.length - 1];

  let remaining = totalLength * clamp01(progress);
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const ratio = segment.length <= 0 ? 1 : clamp01(remaining / segment.length);
      return [
        segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
        segment.from[1] + (segment.to[1] - segment.from[1]) * ratio
      ];
    }
    remaining -= segment.length;
  }
  return points[points.length - 1];
}

export function formationPresentationPosition(
  group: Pick<TaskGroup, 'location' | 'status' | 'order'>,
  territoryCentres: Readonly<Record<string, FormationGeoPoint>>
): FormationGeoPoint | undefined {
  const origin = territoryCentres[group.location];
  if (!origin) return undefined;
  const order = group.order;
  if (group.status !== 'moving' || order?.type !== 'move') return origin;
  const target = territoryCentres[order.target];
  if (!target) return origin;

  const progress = clamp01(order.progress / 100);
  const route = order.routeId ? STRATEGIC_ROUTES.find(candidate => candidate.id === order.routeId) : undefined;
  if (!route) return interpolateFormationPath([origin, target], progress) ?? origin;

  const forward = route.fromTerritoryId === group.location && route.toTerritoryId === order.target;
  const reverse = route.toTerritoryId === group.location && route.fromTerritoryId === order.target;
  if (!forward && !reverse) return interpolateFormationPath([origin, target], progress) ?? origin;

  const fromNodeId = forward ? route.fromNodeId : route.toNodeId;
  const toNodeId = forward ? route.toNodeId : route.fromNodeId;
  const fromNode = STRATEGIC_NODES.find(node => node.id === fromNodeId)?.position;
  const toNode = STRATEGIC_NODES.find(node => node.id === toNodeId)?.position;
  const points: FormationGeoPoint[] = [origin];
  if (fromNode) points.push(fromNode);
  if (toNode) points.push(toNode);
  points.push(target);
  return interpolateFormationPath(points, progress) ?? origin;
}
