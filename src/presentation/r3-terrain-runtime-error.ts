export type TerrainRuntimeErrorKind = 'transient-tile-request' | 'source-warning';

export interface TerrainRuntimeErrorClassification {
  kind: TerrainRuntimeErrorKind;
  detail: string;
  status?: number;
  url?: string;
}

interface MapLibreLikeRuntimeError {
  message?: unknown;
  status?: unknown;
  url?: unknown;
  name?: unknown;
}

const GENERATED_TERRAIN_TILE = /(?:^|\/)generated\/r3-terrain\/tiles\/\d+\/\d+\/\d+\.png(?:$|[?#])/i;
const FAILED_FETCH_STATUS_ZERO = /failed to fetch\s*\(0\)/i;
const ABORTED_REQUEST = /(?:aborterror|aborted|request aborted|load cancelled|load canceled)/i;

function asRuntimeError(error: unknown): MapLibreLikeRuntimeError {
  if (typeof error === 'object' && error !== null) return error as MapLibreLikeRuntimeError;
  return {};
}

export function terrainRuntimeErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const candidate = asRuntimeError(error).message;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;
  return String(error ?? 'Unknown MapLibre runtime error');
}

function terrainRuntimeErrorUrl(error: unknown, detail: string): string | undefined {
  const candidate = asRuntimeError(error).url;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;

  const match = detail.match(/((?:\.\.\/|\.\/|\/)?generated\/r3-terrain\/tiles\/\d+\/\d+\/\d+\.png(?:[?#][^\s]*)?)/i);
  return match?.[1];
}

function terrainRuntimeErrorStatus(error: unknown, detail: string): number | undefined {
  const candidate = asRuntimeError(error).status;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  return FAILED_FETCH_STATUS_ZERO.test(detail) ? 0 : undefined;
}

/**
 * MapLibre cancels/abandons tile requests during normal camera movement and
 * source reprioritisation. In Chromium these can surface as AJAXError status 0.
 * A cancelled request for one of our generated Terrain-RGB PNGs is not evidence
 * that the static asset is missing, so it must not replace useful map status
 * with a scary player-facing warning after the renderer is already healthy.
 *
 * Real HTTP/source errors remain warnings. Before initial map readiness the host
 * still treats every runtime source error as an initialisation failure and falls
 * back to SVG; this classifier only controls the post-load presentation policy.
 */
export function classifyTerrainRuntimeError(error: unknown): TerrainRuntimeErrorClassification {
  const detail = terrainRuntimeErrorDetail(error);
  const url = terrainRuntimeErrorUrl(error, detail);
  const status = terrainRuntimeErrorStatus(error, detail);
  const name = asRuntimeError(error).name;
  const generatedTerrainTile = typeof url === 'string' && GENERATED_TERRAIN_TILE.test(url);
  const cancelledOrStatusZero = status === 0
    || FAILED_FETCH_STATUS_ZERO.test(detail)
    || (typeof name === 'string' && ABORTED_REQUEST.test(name))
    || ABORTED_REQUEST.test(detail);

  return {
    kind: generatedTerrainTile && cancelledOrStatusZero ? 'transient-tile-request' : 'source-warning',
    detail,
    ...(status !== undefined ? { status } : {}),
    ...(url ? { url } : {})
  };
}
