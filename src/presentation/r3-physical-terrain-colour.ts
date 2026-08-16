import type { Map } from 'maplibre-gl';

export const R3_PHYSICAL_TERRAIN_PROFILE_ID = 'physical-colour-v3-local-tiles';
export const R3_PHYSICAL_TERRAIN_SOURCE_ID = 'r3-wp3-9b2-physical-colour';
export const R3_PHYSICAL_TERRAIN_LAYER_ID = 'r3-wp3-9b2-physical-colour';
export const R3_PHYSICAL_TERRAIN_ASSET_PATH = 'generated/r3-terrain/europe-physical-colour-v1.webp';
export const R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID = 'r3-wp3-9b3-physical-colour-local';
export const R3_PHYSICAL_TERRAIN_LOCAL_LAYER_ID = 'r3-wp3-9b3-physical-colour-local';
export const R3_PHYSICAL_TERRAIN_LOCAL_TILE_PATH = 'generated/r3-terrain/physical-colour-tiles/{z}/{x}/{y}.webp';
export const R3_PHYSICAL_TERRAIN_LOCAL_MANIFEST_PATH = 'generated/r3-terrain/physical-colour-tiles-manifest.json';
export const R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM = 7;
export const R3_PHYSICAL_TERRAIN_BOUNDS = [-30, 28, 55, 76] as const;

export type R3PhysicalTerrainColourEvidence = {
  profileId: typeof R3_PHYSICAL_TERRAIN_PROFILE_ID;
  status: 'checking' | 'ready' | 'fallback';
  sourceId: typeof R3_PHYSICAL_TERRAIN_SOURCE_ID;
  layerId: typeof R3_PHYSICAL_TERRAIN_LAYER_ID;
  sourceUrl: string;
  localDetailSourceId: typeof R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID;
  localDetailLayerId: typeof R3_PHYSICAL_TERRAIN_LOCAL_LAYER_ID;
  localDetailTileUrl: string;
  localDetailMinZoom: typeof R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM;
  localDetailStatus: 'deferred' | 'checking' | 'ready' | 'fallback';
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
const localActivationMaps = new WeakSet<Map>();

function assetUrl(): string {
  return `${import.meta.env.BASE_URL}${R3_PHYSICAL_TERRAIN_ASSET_PATH}`;
}

function localTileUrl(): string {
  return `${import.meta.env.BASE_URL}${R3_PHYSICAL_TERRAIN_LOCAL_TILE_PATH}`;
}

function localManifestUrl(): string {
  return `${import.meta.env.BASE_URL}${R3_PHYSICAL_TERRAIN_LOCAL_MANIFEST_PATH}`;
}

function writeEvidence(
  status: R3PhysicalTerrainColourEvidence['status'],
  localDetailStatus: R3PhysicalTerrainColourEvidence['localDetailStatus'],
  failureReason?: string
): void {
  window.__r3PhysicalTerrainColour = {
    profileId: R3_PHYSICAL_TERRAIN_PROFILE_ID,
    status,
    sourceId: R3_PHYSICAL_TERRAIN_SOURCE_ID,
    layerId: R3_PHYSICAL_TERRAIN_LAYER_ID,
    sourceUrl: assetUrl(),
    localDetailSourceId: R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID,
    localDetailLayerId: R3_PHYSICAL_TERRAIN_LOCAL_LAYER_ID,
    localDetailTileUrl: localTileUrl(),
    localDetailMinZoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM,
    localDetailStatus,
    bounds: R3_PHYSICAL_TERRAIN_BOUNDS,
    rasterOpacity: 0.98,
    hillshadeExaggeration: 0.36,
    ...(failureReason ? { failureReason } : {})
  };
}

function currentBroadStatus(): R3PhysicalTerrainColourEvidence['status'] {
  return window.__r3PhysicalTerrainColour?.status ?? 'checking';
}

function markBroadBaseReady(map: Map): void {
  const finish = () => {
    if (!installedMaps.has(map) || !map.getSource(R3_PHYSICAL_TERRAIN_SOURCE_ID)) return;
    if (!map.isSourceLoaded(R3_PHYSICAL_TERRAIN_SOURCE_ID)) return;
    map.off('sourcedata', finish);
    writeEvidence('ready', window.__r3PhysicalTerrainColour?.localDetailStatus ?? 'deferred');
    const host = document.querySelector<HTMLElement>('.r3-terrain-prototype');
    if (host) host.dataset.physicalTerrain = R3_PHYSICAL_TERRAIN_PROFILE_ID;
  };
  map.on('sourcedata', finish);
  map.once('idle', finish);
  finish();
}

function addBroadBase(map: Map): void {
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
        'raster-saturation': 0.16,
        'raster-contrast': 0.10,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.98
      }
    }, 'r3-wp2b-hillshade');
  }
}

function addLocalDetailTiles(map: Map): void {
  if (!map.getSource(R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID)) {
    map.addSource(R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID, {
      type: 'raster',
      tiles: [localTileUrl()],
      tileSize: 512,
      minzoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM,
      maxzoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM,
      bounds: [...R3_PHYSICAL_TERRAIN_BOUNDS]
    });
  }

  if (!map.getLayer(R3_PHYSICAL_TERRAIN_LOCAL_LAYER_ID)) {
    map.addLayer({
      id: R3_PHYSICAL_TERRAIN_LOCAL_LAYER_ID,
      type: 'raster',
      source: R3_PHYSICAL_TERRAIN_LOCAL_SOURCE_ID,
      minzoom: R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM,
      paint: {
        'raster-opacity': 0.98,
        'raster-fade-duration': 0,
        'raster-saturation': 0.10,
        'raster-contrast': 0.08,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.99
      }
    }, 'r3-wp2b-hillshade');
  }
}

function installDeferredLocalDetail(map: Map): void {
  let activationStarted = false;

  const activate = () => {
    if (activationStarted || localActivationMaps.has(map)) return;
    if (map.getZoom() < R3_PHYSICAL_TERRAIN_LOCAL_MIN_ZOOM) return;

    activationStarted = true;
    writeEvidence(currentBroadStatus(), 'checking');

    void fetch(localManifestUrl(), { method: 'HEAD', cache: 'default' })
      .then(response => {
        if (!response.ok) throw new Error(`local physical terrain manifest returned ${response.status}`);
        if (!map.getLayer('r3-wp2b-hillshade')) throw new Error('hillshade layer unavailable during local-detail activation');
        addLocalDetailTiles(map);
        localActivationMaps.add(map);
        writeEvidence(currentBroadStatus(), 'ready');
        map.triggerRepaint();
      })
      .catch(error => {
        const reason = error instanceof Error ? error.message : String(error);
        writeEvidence(currentBroadStatus(), 'fallback', reason);
      });
  };

  // Keep Campaign/Theatre identical to WP3.9B2. The extra raster source is
  // not registered, probed or fetched until the camera first enters local LOD.
  map.on('zoomend', activate);
  map.on('moveend', activate);
  activate();
}

/**
 * R3-WP3.9B3 dual-LOD presentation-only physical-colour system.
 *
 * WP3.9B2's 37 KB broad image remains the low-cost theatre/campaign base.
 * From zoom 7, self-hosted NASA Blue Marble 500 m Web Mercator tiles replace
 * stretched continent-scale colour with viewport-loaded local detail.
 * The local raster source itself is deferred until local zoom so normal wide
 * camera transactions retain the exact lightweight B2 map path.
 * Copernicus GLO-30 remains the 3D elevation authority and political meaning
 * remains exclusively in the accepted border/front overlay system.
 */
export function installR3PhysicalTerrainColour(map: Map): void {
  if (installedMaps.has(map)) return;
  installedMaps.add(map);
  writeEvidence('checking', 'deferred');

  // This startup path intentionally mirrors WP3.9B2: one tiny broad asset,
  // one raster layer, and no local-detail source or manifest request.
  void fetch(assetUrl(), { method: 'HEAD', cache: 'default' })
    .then(response => {
      if (!response.ok) throw new Error(`physical terrain texture returned ${response.status}`);
      if (!map.getLayer('r3-wp2b-hillshade')) throw new Error('hillshade layer unavailable');

      addBroadBase(map);
      map.setPaintProperty('r3-wp2b-hillshade', 'hillshade-exaggeration', 0.36);
      map.triggerRepaint();
      markBroadBaseReady(map);
      installDeferredLocalDetail(map);
    })
    .catch(error => {
      const reason = error instanceof Error ? error.message : String(error);
      writeEvidence('fallback', 'fallback', reason);
      const host = document.querySelector<HTMLElement>('.r3-terrain-prototype');
      if (host) host.dataset.physicalTerrain = 'fallback';
      // Accepted WP3.9B neutral terrain remains the final safe fallback.
    });
}
