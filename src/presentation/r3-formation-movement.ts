import { STRATEGIC_NODES, STRATEGIC_ROUTES } from '../game/strategic-network-data';
import type { TaskGroup } from '../game/types';

export type FormationGeoPoint = readonly [number, number];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const FORMATION_PRESENTATION_ANIMATION_MS = 520;

// WP3 derives display geometry only. Engine-owned location, route progress and
// arrival timing remain unchanged and continue to resolve in game state.
const pointDistance = (a: FormationGeoPoint, b: FormationGeoPoint) => {
  const meanLatitude = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const longitudeDistance = (b[0] - a[0]) * Math.cos(meanLatitude);
  const latitudeDistance = b[1] - a[1];
  return Math.hypot(longitudeDistance, latitudeDistance);
};

const pathSegments = (points: readonly FormationGeoPoint[]) => points.slice(1).map((point, index) => ({
  from: points[index],
  to: point,
  length: pointDistance(points[index], point)
}));

function activePathSegment(points: readonly FormationGeoPoint[], progress: number) {
  const segments = pathSegments(points);
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = totalLength * clamp01(progress);
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments.at(-1)) return { segment, remaining };
    remaining -= segment.length;
  }
  return undefined;
}

/** The endpoint of the same length-weighted segment used for interpolation. */
export function formationForwardPathTarget(points: readonly FormationGeoPoint[], progress: number) {
  return activePathSegment(points, progress)?.segment.to;
}

/** Shared cubic presentation tween used by both visible pieces and DOM hit targets. */
export function interpolateFormationPresentation(
  from: FormationGeoPoint, to: FormationGeoPoint, elapsedMs: number
): FormationGeoPoint {
  const t = clamp01(elapsedMs / FORMATION_PRESENTATION_ANIMATION_MS);
  const eased = 1 - Math.pow(1 - t, 3);
  return [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased];
}

export function interpolateFormationPath(
  points: readonly FormationGeoPoint[],
  progress: number
): FormationGeoPoint | undefined {
  if (!points.length) return undefined;
  if (points.length === 1) return points[0];
  const active = activePathSegment(points, progress);
  if (!active) return points[points.length - 1];
  const { segment, remaining } = active;
  const ratio = segment.length <= 0 ? 1 : clamp01(remaining / segment.length);
  return [
    segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
    segment.from[1] + (segment.to[1] - segment.from[1]) * ratio
  ];
}

export function formationPresentationPath(
  group: Pick<TaskGroup, 'location' | 'status' | 'order'>,
  territoryCentres: Readonly<Record<string, FormationGeoPoint>>
): readonly FormationGeoPoint[] | undefined {
  const origin = territoryCentres[group.location];
  if (!origin) return undefined;
  const order = group.order;
  if (group.status !== 'moving' || order?.type !== 'move') return [origin];
  const target = territoryCentres[order.target];
  if (!target) return [origin];

  const route = order.routeId ? STRATEGIC_ROUTES.find(candidate => candidate.id === order.routeId) : undefined;
  if (!route) return [origin, target];
  const forward = route.fromTerritoryId === group.location && route.toTerritoryId === order.target;
  const reverse = route.toTerritoryId === group.location && route.fromTerritoryId === order.target;
  if (!forward && !reverse) return [origin, target];

  const fromNodeId = forward ? route.fromNodeId : route.toNodeId;
  const toNodeId = forward ? route.toNodeId : route.fromNodeId;
  const fromNode = STRATEGIC_NODES.find(node => node.id === fromNodeId)?.position;
  const toNode = STRATEGIC_NODES.find(node => node.id === toNodeId)?.position;
  const points: FormationGeoPoint[] = [origin];
  if (fromNode) points.push(fromNode);
  if (toNode) points.push(toNode);
  points.push(target);
  return points;
}

export function formationPresentationPosition(
  group: Pick<TaskGroup, 'location' | 'status' | 'order'>,
  territoryCentres: Readonly<Record<string, FormationGeoPoint>>
): FormationGeoPoint | undefined {
  const path = formationPresentationPath(group, territoryCentres);
  if (!path?.length) return undefined;
  const order = group.order;
  if (group.status !== 'moving' || order?.type !== 'move') return path[0];
  return interpolateFormationPath(path, clamp01(order.progress / 100)) ?? path[0];
}
