export interface GeneratedTerrainTileJson {
  tilejson: string;
  minzoom: number;
  maxzoom: number;
  bounds: readonly [number, number, number, number];
  attribution: string;
  futureConquest?: {
    source?: string;
    preferredDataset?: string;
    fallbackDataset?: string;
    encoding?: string;
  };
}

export interface GeneratedRasterDemSource {
  type: 'raster-dem';
  tiles: readonly string[];
  tileSize: 256;
  encoding: 'mapbox';
  minzoom: number;
  maxzoom: number;
  bounds: readonly [number, number, number, number];
  attribution: string;
}

export const R3_GENERATED_TERRAIN_PATH = 'generated/r3-terrain/';

function normaliseBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function generatedTerrainManifestUrl(baseUrl: string): string {
  return `${normaliseBaseUrl(baseUrl)}${R3_GENERATED_TERRAIN_PATH}tiles.json`;
}

export function generatedTerrainTileTemplate(baseUrl: string): string {
  return `${normaliseBaseUrl(baseUrl)}${R3_GENERATED_TERRAIN_PATH}tiles/{z}/{x}/{y}.png`;
}

export function generatedRasterDemSource(
  manifest: GeneratedTerrainTileJson,
  baseUrl: string
): GeneratedRasterDemSource {
  if (manifest.tilejson !== '3.0.0') throw new Error('Unsupported terrain TileJSON version.');
  if (!Number.isInteger(manifest.minzoom) || !Number.isInteger(manifest.maxzoom) || manifest.maxzoom < manifest.minzoom) {
    throw new Error('Invalid terrain zoom contract.');
  }
  if (!Array.isArray(manifest.bounds) || manifest.bounds.length !== 4 || manifest.bounds.some(value => !Number.isFinite(value))) {
    throw new Error('Invalid terrain bounds contract.');
  }

  return {
    type: 'raster-dem',
    tiles: [generatedTerrainTileTemplate(baseUrl)],
    tileSize: 256,
    encoding: 'mapbox',
    minzoom: manifest.minzoom,
    maxzoom: manifest.maxzoom,
    bounds: manifest.bounds,
    attribution: manifest.attribution
  };
}
