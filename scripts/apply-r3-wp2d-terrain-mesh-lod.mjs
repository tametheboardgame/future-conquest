import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const before = `      const updateOverlayLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const zoom = map.getZoom();
        host.dataset.overlayZoom = zoom.toFixed(2);
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';
      };
      const refreshOperationalPresentation = () => {
        updateOverlayLod();
        applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);
      };
      map.on('zoom', updateOverlayLod);
      map.on('moveend', refreshOperationalPresentation);
      updateOverlayLod();`;

const after = `      let terrainMeshMode: 'physical' | 'strategic-flat' = 'physical';
      const updateOverlayLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const zoom = map.getZoom();
        host.dataset.overlayZoom = zoom.toFixed(2);
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';
      };
      const updateTerrainMeshLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const nextMode = map.getZoom() < 4.8 ? 'strategic-flat' : 'physical';
        if (nextMode !== terrainMeshMode) {
          map.setTerrain(nextMode === 'physical' ? {
            source: 'r3-wp2b-terrain-dem',
            exaggeration: terrainExaggerationForProfile(presentationProfile)
          } : null);
          terrainMeshMode = nextMode;
        }
        host.dataset.terrainRelief = terrainMeshMode;
      };
      const refreshOperationalPresentation = () => {
        updateOverlayLod();
        updateTerrainMeshLod();
        applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);
      };
      map.on('zoom', updateOverlayLod);
      map.on('moveend', refreshOperationalPresentation);
      refreshOperationalPresentation();`;

if (!source.includes(before)) throw new Error('Terrain mesh LOD anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Applied terrain mesh LOD: flat Theatre, physical Campaign/Selected.');
