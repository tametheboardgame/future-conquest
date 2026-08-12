export type CampaignMapRenderer = 'real-terrain' | 'svg-fallback';
export type TerrainPresentationProfile = 'full' | 'compact' | 'svg-fallback';

export interface TerrainCameraPreset {
  id: 'theatre' | 'campaign' | 'selected';
  center: readonly [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TerrainDataManifest {
  id: string;
  sourceFamily: 'copernicus-dem';
  preferredDataset: 'COP-DEM-GLO-30';
  fallbackDataset: 'COP-DEM-GLO-90';
  runtimeDelivery: 'preprocessed-static-assets';
  attribution: string;
  requiresBrowserSecret: false;
  prototypeBounds: readonly [number, number, number, number];
  initialExaggeration: number;
}

/**
 * Representative WP2B theatre: southern England through France/Benelux/Rhine
 * into Switzerland and the Alps. Coordinates are WGS84 [west, south, east, north].
 */
export const R3_TERRAIN_PROTOTYPE_BOUNDS = [-5.8, 44.0, 14.8, 53.8] as const;

export const R3_TERRAIN_MANIFEST: TerrainDataManifest = {
  id: 'r3-wp2b-europe-prototype-v1',
  sourceFamily: 'copernicus-dem',
  preferredDataset: 'COP-DEM-GLO-30',
  fallbackDataset: 'COP-DEM-GLO-90',
  runtimeDelivery: 'preprocessed-static-assets',
  attribution: 'Elevation: Copernicus DEM',
  requiresBrowserSecret: false,
  prototypeBounds: R3_TERRAIN_PROTOTYPE_BOUNDS,
  initialExaggeration: 2
};

/**
 * MapLibre owns geographic camera state. These presets are deliberately
 * renderer-only and do not alter authoritative campaign selection or game state.
 */
export const R3_TERRAIN_CAMERA_PRESETS: readonly TerrainCameraPreset[] = [
  { id: 'theatre', center: [4.6, 49.1], zoom: 4.45, pitch: 42, bearing: -7 },
  { id: 'campaign', center: [5.3, 49.2], zoom: 5.35, pitch: 51, bearing: -9 },
  { id: 'selected', center: [5.3, 49.2], zoom: 7.1, pitch: 57, bearing: -8 }
] as const;

export interface TerrainRendererCapability {
  webgl: boolean;
  terrainEnabled: boolean;
  forceFallback?: boolean;
}

export interface TerrainPresentationEnvironment {
  viewportWidth: number;
  coarsePointer: boolean;
  forceFallback?: boolean;
}

/**
 * The real-terrain renderer is progressive enhancement. Failure to support the
 * required GPU/terrain path must keep the game playable through the stable SVG map.
 */
export function chooseCampaignMapRenderer(capability: TerrainRendererCapability): CampaignMapRenderer {
  if (capability.forceFallback || !capability.webgl || !capability.terrainEnabled) return 'svg-fallback';
  return 'real-terrain';
}

/**
 * WP2B-D mobile policy. Normal phones/tablets keep the terrain renderer but use
 * a compact presentation profile. Very small coarse-pointer displays fall back
 * to the stable SVG map rather than forcing a cramped/high-pressure 3D canvas.
 */
export function chooseTerrainPresentationProfile(environment: TerrainPresentationEnvironment): TerrainPresentationProfile {
  if (environment.forceFallback) return 'svg-fallback';
  const width = Number.isFinite(environment.viewportWidth) ? Math.max(0, environment.viewportWidth) : 0;
  if (environment.coarsePointer && width > 0 && width <= 420) return 'svg-fallback';
  if (environment.coarsePointer || (width > 0 && width <= 900)) return 'compact';
  return 'full';
}

/**
 * Compact terrain keeps the same geographic framing but reduces camera pitch
 * and a little zoom pressure. This is presentation state only.
 */
export function terrainCameraForProfile(
  preset: TerrainCameraPreset,
  profile: Exclude<TerrainPresentationProfile, 'svg-fallback'>
): TerrainCameraPreset {
  if (profile === 'full') return { ...preset };
  return {
    ...preset,
    zoom: Math.max(3.6, preset.zoom - 0.15),
    pitch: Math.min(preset.pitch, 42)
  };
}

export function terrainExaggerationForProfile(
  profile: Exclude<TerrainPresentationProfile, 'svg-fallback'>
): number {
  return profile === 'compact' ? 1.6 : R3_TERRAIN_MANIFEST.initialExaggeration;
}

/** Normalize an authoritative WGS84 point before handing it to MapLibre. */
export function normaliseLngLat(point: readonly [number, number]): readonly [number, number] {
  const [lng, lat] = point;
  const safeLng = Number.isFinite(lng) ? Math.max(-180, Math.min(180, lng)) : 0;
  const safeLat = Number.isFinite(lat) ? Math.max(-85.051129, Math.min(85.051129, lat)) : 0;
  return [safeLng, safeLat] as const;
}

export function terrainCameraPreset(id: TerrainCameraPreset['id']): TerrainCameraPreset {
  return R3_TERRAIN_CAMERA_PRESETS.find(preset => preset.id === id) ?? R3_TERRAIN_CAMERA_PRESETS[0];
}
