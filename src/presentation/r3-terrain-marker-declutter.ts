import { DeterministicSpatialGrid } from '../game/spatial-grid.ts';

export type TerrainMarkerLod = 'theatre' | 'campaign' | 'local';

export type TerrainMarkerKind =
  | 'selected-formation'
  | 'formation'
  | 'operation'
  | 'live-threat'
  | 'recent-threat'
  | 'selected-territory'
  | 'territory'
  | 'enemy-confirmed'
  | 'enemy-estimated'
  | 'enemy-activity'
  | 'enemy-stale'
  | 'node-major'
  | 'node-secondary'
  | 'portal';

export interface TerrainMarkerCandidate {
  id: string;
  kind: TerrainMarkerKind;
  x: number;
  y: number;
}

export interface TerrainMarkerReservedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface TerrainMarkerRule {
  priority: number;
  radius: number;
  minimumLod: TerrainMarkerLod;
  protected?: boolean;
}

const LOD_RANK: Record<TerrainMarkerLod, number> = {
  theatre: 0,
  campaign: 1,
  local: 2
};

const LOD_SPACING: Record<TerrainMarkerLod, number> = {
  theatre: 1.02,
  campaign: 0.94,
  local: 0.7
};

/** Screen-space scale shared by rendered markers and collision footprints. */
export const TERRAIN_MARKER_SCALE: Readonly<Record<TerrainMarkerLod, number>> = {
  theatre: 0.82,
  campaign: 0.94,
  local: 1.05
};

export const terrainMarkerScaleForLod = (lod: TerrainMarkerLod) => TERRAIN_MARKER_SCALE[lod];

const RULES: Record<TerrainMarkerKind, TerrainMarkerRule> = {
  'selected-formation': { priority: 1000, radius: 34, minimumLod: 'theatre', protected: true },
  operation: { priority: 960, radius: 31, minimumLod: 'theatre', protected: true },
  'live-threat': { priority: 930, radius: 28, minimumLod: 'theatre', protected: true },
  'selected-territory': { priority: 910, radius: 34, minimumLod: 'theatre', protected: true },
  portal: { priority: 890, radius: 22, minimumLod: 'theatre', protected: true },
  // The player only has a small finite set of task groups. Never hide one just
  // because another operational annotation occupies nearby screen space.
  formation: { priority: 850, radius: 32, minimumLod: 'theatre', protected: true },
  'enemy-confirmed': { priority: 820, radius: 27, minimumLod: 'theatre' },
  'enemy-estimated': { priority: 760, radius: 26, minimumLod: 'theatre' },
  'node-major': { priority: 640, radius: 25, minimumLod: 'theatre' },
  // Province names are core geography at every command scale. Selection is a
  // style change only; it must not change whether the name survives layout.
  territory: { priority: 560, radius: 29, minimumLod: 'theatre', protected: true },
  'enemy-activity': { priority: 500, radius: 24, minimumLod: 'campaign' },
  'node-secondary': { priority: 440, radius: 21, minimumLod: 'campaign' },
  'enemy-stale': { priority: 360, radius: 23, minimumLod: 'campaign' },
  'recent-threat': { priority: 320, radius: 22, minimumLod: 'campaign' }
};

const MAX_MARKER_RADIUS = Math.max(...Object.values(RULES).map(rule => rule.radius));

export const terrainMarkerLodForZoom = (zoom: number): TerrainMarkerLod => (
  zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local'
);

export const terrainMarkerPriority = (kind: TerrainMarkerKind) => RULES[kind].priority;
export const terrainMarkerIsProtected = (kind: TerrainMarkerKind) => Boolean(RULES[kind].protected);

const intersectsReservedRect = (
  candidate: TerrainMarkerCandidate,
  radius: number,
  rect: TerrainMarkerReservedRect
) => (
  candidate.x + radius > rect.left
  && candidate.x - radius < rect.right
  && candidate.y + radius > rect.top
  && candidate.y - radius < rect.bottom
);

export function visibleTerrainMarkerIds(
  candidates: readonly TerrainMarkerCandidate[],
  lod: TerrainMarkerLod,
  reservedRects: readonly TerrainMarkerReservedRect[] = []
): ReadonlySet<string> {
  const eligible = candidates
    .filter(candidate => Number.isFinite(candidate.x) && Number.isFinite(candidate.y))
    .filter(candidate => LOD_RANK[lod] >= LOD_RANK[RULES[candidate.kind].minimumLod])
    .sort((a, b) => {
      const priorityDifference = RULES[b.kind].priority - RULES[a.kind].priority;
      return priorityDifference || a.id.localeCompare(b.id);
    });

  const visible = new Set<string>();
  const spacing = LOD_SPACING[lod];
  const scale = terrainMarkerScaleForLod(lod);
  const maximumCollisionDistance = MAX_MARKER_RADIUS * 2 * scale * spacing;
  const accepted = new DeterministicSpatialGrid<TerrainMarkerCandidate>(maximumCollisionDistance);

  for (const candidate of eligible) {
    const rule = RULES[candidate.kind];
    if (rule.protected) {
      accepted.insert(candidate);
      visible.add(candidate.id);
      continue;
    }

    const radius = rule.radius * scale;
    if (reservedRects.some(rect => intersectsReservedRect(candidate, radius, rect))) {
      continue;
    }

    const blocked = accepted.someNearby(
      candidate.x,
      candidate.y,
      maximumCollisionDistance,
      other => {
        const otherRule = RULES[other.kind];
        const dx = candidate.x - other.x;
        const dy = candidate.y - other.y;
        const minimumSeparation = (rule.radius + otherRule.radius) * scale * spacing;
        return (dx * dx) + (dy * dy) < minimumSeparation * minimumSeparation;
      }
    );

    if (!blocked) {
      accepted.insert(candidate);
      visible.add(candidate.id);
    }
  }

  return visible;
}
