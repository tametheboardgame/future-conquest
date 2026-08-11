export type R3TerrainClass =
  | 'terrain-open-lowland'
  | 'terrain-mixed-lowland'
  | 'terrain-mixed-upland'
  | 'terrain-mountainous'
  | 'terrain-unspecified';

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
