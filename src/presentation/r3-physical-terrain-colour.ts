import type { Map } from 'maplibre-gl';

export const R3_PHYSICAL_TERRAIN_PROFILE_ID = 'physical-colour-v1';
export const R3_PHYSICAL_TERRAIN_SOURCE_ID = 'r3-wp3-9b2-physical-colour';
export const R3_PHYSICAL_TERRAIN_LAYER_ID = 'r3-wp3-9b2-physical-colour';
export const R3_PHYSICAL_TERRAIN_ASSET_PATH = 'generated/r3-terrain/europe-physical-colour-v1.webp';
export const R3_PHYSICAL_TERRAIN_BOUNDS = [-30, 28, 55, 76] as const;

export type R3PhysicalTerrainColourEvidence = {
  profileId: typeof R3_PHYSICAL_TERRAIN_PROFILE_ID;
  status: 'checking' | 'ready' | 'fallback';
  sourceId: typeof R3_PHYSICAL_TERRAIN_SOURCE_ID;
  layerId: typeof R3_PHYSICAL_TERRAIN_LAYER_ID;
  sourceUrl: string;
  bounds: typeof R3_PHYSICAL_TERRAIN_BOUNDS;
  rasterOpacity: number;
  hillshadeExaggeration: number;
  failureReason?: string;
};

declare global {
  interface Window {
    __r3PhysicalTerrainColour?: R3PhysicalTerrainColourEvidence;
  }
}

const installedMaps = new WeakSet<Map>();

function assetUrl(): string {
  return `${import.meta.env.BASE_URL}${R3_PHYSICAL_TERRAIN_ASSET_PATH}`;
}

function writeEvidence(
  status: R3PhysicalTerrainColourEvidence['status'],
  failureReason?: string
): void {
  window.__r3PhysicalTerrainColour = {
    profileId: R3_PHYSICAL_TERRAIN_PROFILE_ID,
    status,
    sourceId: R3_PHYSICAL_TERRAIN_SOURCE_ID,
    layerId: R3_PHYSICAL_TERRAIN_LAYER_ID,
    sourceUrl: assetUrl(),
    bounds: R3_PHYSICAL_TERRAIN_BOUNDS,
    rasterOpacity: 0.98,
    hillshadeExaggeration: 0.40,
    ...(failureReason ? { failureReason } : {})
  };
}

function markReadyWhenLoaded(map: Map): void {
  const finish = () => {
    if (!installedMaps.has(map) || !map.getSource(R3_PHYSICAL_TERRAIN_SOURCE_ID)) return;
    if (!map.isSourceLoaded(R3_PHYSICAL_TERRAIN_SOURCE_ID)) return;
    map.off('sourcedata', finish);
    writeEvidence('ready');
    const host = document.querySelector<HTMLElement>('.r3-terrain-prototype');
    if (host) host.dataset.physicalTerrain = R3_PHYSICAL_TERRAIN_PROFILE_ID;
  };
  map.on('sourcedata', finish);
  map.once('idle', finish);
  finish();
}

/**
 * R3-WP3.9B2 presentation-only physical-colour layer.
 *
 * The self-hosted Natural Earth-derived texture supplies low-frequency
 * vegetation/farmland/rock/water colour. Copernicus GLO-30 remains the actual
 * 3D terrain/elevation authority, and all strategic ownership remains in the
 * existing border/front overlay system.
 */
export function installR3PhysicalTerrainColour(map: Map): void {
  if (installedMaps.has(map)) return;
  installedMaps.add(map);
  writeEvidence('checking');

  void fetch(assetUrl(), { method: 'HEAD', cache: 'default' })
    .then(response => {
      if (!response.ok) throw new Error(`physical terrain texture returned ${response.status}`);
      if (!map.getLayer('r3-wp2b-hillshade')) throw new Error('hillshade layer unavailable');

      if (!map.getSource(R3_PHYSICAL_TERRAIN_SOURCE_ID)) {
        map.addSource(R3_PHYSICAL_TERRAIN_SOURCE_ID, {
          type: 'image',
          url: assetUrl(),
          coordinates: [
            [R3_PHYSICAL_TERRAIN_BOUNDS[0], R3_PHYSICAL_TERRAIN_BOUNDS[3]],
            [R3_PHYSICAL_TERRAIN_BOUNDS[2], R3_PHYSICAL_TERRAIN_BOUNDS[3]],
            [R3_PHYSICAL_TERRAIN_BOUNDS[2], R3_PHYSICAL_TERRAIN_BOUNDS[1]],
            [R3_PHYSICAL_TERRAIN_BOUNDS[0], R3_PHYSICAL_TERRAIN_BOUNDS[1]]
          ]
        });
      }

      if (!map.getLayer(R3_PHYSICAL_TERRAIN_LAYER_ID)) {
        map.addLayer({
          id: R3_PHYSICAL_TERRAIN_LAYER_ID,
          type: 'raster',
          source: R3_PHYSICAL_TERRAIN_SOURCE_ID,
          paint: {
            'raster-opacity': 0.98,
            'raster-fade-duration': 0,
            'raster-saturation': 0.08,
            'raster-contrast': 0.06,
            'raster-brightness-min': 0.02,
            'raster-brightness-max': 0.98
          }
        }, 'r3-wp2b-hillshade');
      }

      // Keep the real DEM relief, but stop its shading from muddying the richer
      // physical colour material underneath.
      map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-exaggeration', 0.40);
      map.triggerRepaint();
      markReadyWhenLoaded(map);
    })
    .catch(error => {
      const reason = error instanceof Error ? error.message : String(error);
      writeEvidence('fallback', reason);
      const host = document.querySelector<HTMLElement>('.r3-terrain-prototype');
      if (host) host.dataset.physicalTerrain = 'fallback';
      // The accepted WP3.9B neutral surface is already present beneath this
      // optional layer and remains the safe rendering fallback.
    });
}
