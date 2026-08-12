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
  campaign: 0.9,
  local: 0.72
};

const RULES: Record<TerrainMarkerKind, TerrainMarkerRule> = {
  'selected-formation': { priority: 1000, radius: 34, minimumLod: 'theatre', protected: true },
  operation: { priority: 960, radius: 31, minimumLod: 'theatre', protected: true },
  'live-threat': { priority: 930, radius: 28, minimumLod: 'theatre', protected: true },
  'selected-territory': { priority: 910, radius: 34, minimumLod: 'theatre', protected: true },
  portal: { priority: 890, radius: 22, minimumLod: 'theatre', protected: true },
  formation: { priority: 850, radius: 32, minimumLod: 'theatre' },
  'enemy-confirmed': { priority: 820, radius: 27, minimumLod: 'theatre' },
  'enemy-estimated': { priority: 760, radius: 26, minimumLod: 'theatre' },
  'node-major': { priority: 640, radius: 25, minimumLod: 'theatre' },
  territory: { priority: 560, radius: 29, minimumLod: 'theatre' },
  'enemy-activity': { priority: 500, radius: 24, minimumLod: 'campaign' },
  'node-secondary': { priority: 440, radius: 21, minimumLod: 'campaign' },
  'enemy-stale': { priority: 360, radius: 23, minimumLod: 'campaign' },
  'recent-threat': { priority: 320, radius: 22, minimumLod: 'campaign' }
};

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

  const accepted: TerrainMarkerCandidate[] = [];
  const visible = new Set<string>();
  const spacing = LOD_SPACING[lod];

  for (const candidate of eligible) {
    const rule = RULES[candidate.kind];
    if (rule.protected) {
      accepted.push(candidate);
      visible.add(candidate.id);
      continue;
    }

    if (reservedRects.some(rect => intersectsReservedRect(candidate, rule.radius, rect))) {
      continue;
    }

    const blocked = accepted.some(other => {
      const otherRule = RULES[other.kind];
      const dx = candidate.x - other.x;
      const dy = candidate.y - other.y;
      const minimumSeparation = (rule.radius + otherRule.radius) * spacing;
      return (dx * dx) + (dy * dy) < minimumSeparation * minimumSeparation;
    });

    if (!blocked) {
      accepted.push(candidate);
      visible.add(candidate.id);
    }
  }

  return visible;
}
