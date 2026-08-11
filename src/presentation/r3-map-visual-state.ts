export type R3TerrainClass =
  | 'terrain-open-lowland'
  | 'terrain-mixed-lowland'
  | 'terrain-mixed-upland'
  | 'terrain-mountainous'
  | 'terrain-unspecified';

export type R3MapPoint = readonly [number, number];

export interface R3TerritoryVisualDefinition {
  terrain?: string;
  neighbours: readonly string[];
}

export interface R3TerritoryControlState {
  controller: 'player' | 'enemy';
}

export interface R3FrontSegment {
  id: string;
  fromTerritoryId: string;
  toTerritoryId: string;
}

export interface R3FrontLineEndpoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const TERRAIN_CLASS: Readonly<Record<string, R3TerrainClass>> = {
  'open-lowland': 'terrain-open-lowland',
  'mixed-lowland': 'terrain-mixed-lowland',
  'mixed-upland': 'terrain-mixed-upland',
  mountainous: 'terrain-mountainous'
};

/** Presentation-only terrain classification. No terrain or movement rule is
 * changed by this mapping; it only supplies a stable visual hook to the map. */
export const r3TerrainClass = (terrain?: string): R3TerrainClass => (
  terrain ? TERRAIN_CLASS[terrain] ?? 'terrain-unspecified' : 'terrain-unspecified'
);

/**
 * Derive each opposing-control adjacency once. These segments are a strategic
 * front cue between territory centres, not a replacement border geometry and
 * never participate in hit-testing, pathfinding or combat.
 */
export const deriveR3FrontSegments = (
  control: Readonly<Record<string, R3TerritoryControlState | undefined>>,
  definitions: Readonly<Record<string, R3TerritoryVisualDefinition | undefined>>
): readonly R3FrontSegment[] => {
  const seen = new Set<string>();
  const result: R3FrontSegment[] = [];

  for (const territoryId of Object.keys(control).sort()) {
    const territory = control[territoryId];
    const definition = definitions[territoryId];
    if (!territory || !definition) continue;

    for (const neighbourId of [...definition.neighbours].sort()) {
      const neighbour = control[neighbourId];
      if (!neighbour || neighbour.controller === territory.controller) continue;
      const [fromTerritoryId, toTerritoryId] = [territoryId, neighbourId].sort();
      const id = `${fromTerritoryId}::${toTerritoryId}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({ id, fromTerritoryId, toTerritoryId });
    }
  }

  return result.sort((first, second) => first.id.localeCompare(second.id));
};

/**
 * Turn the centre-to-centre relationship into a short perpendicular front mark
 * centred on the shared strategic boundary. `halfLength` is supplied in current
 * map units by the renderer, allowing the visual mark to remain approximately
 * screen-space stable while the authoritative geography and hit areas stay put.
 */
export const r3FrontLineEndpoints = (
  from: R3MapPoint,
  to: R3MapPoint,
  halfLength: number
): R3FrontLineEndpoints | undefined => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= 0) return undefined;

  const extent = Math.max(0, Number.isFinite(halfLength) ? halfLength : 0);
  const midpointX = (from[0] + to[0]) / 2;
  const midpointY = (from[1] + to[1]) / 2;
  const perpendicularX = -dy / distance;
  const perpendicularY = dx / distance;

  return {
    x1: midpointX - perpendicularX * extent,
    y1: midpointY - perpendicularY * extent,
    x2: midpointX + perpendicularX * extent,
    y2: midpointY + perpendicularY * extent
  };
};
