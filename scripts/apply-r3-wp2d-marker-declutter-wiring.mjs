import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const replace = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`WP2D marker declutter anchor missing: ${label}`);
  source = source.replace(before, after);
};

replace(
`import {
  buildTerrainOperationalMarkers,
  removeTerrainOperationalMarkers
} from '../presentation/r3-terrain-operational-markers';`,
`import {
  applyTerrainOperationalMarkerDeclutter,
  buildTerrainOperationalMarkers,
  removeTerrainOperationalMarkers
} from '../presentation/r3-terrain-operational-markers';`,
'import declutter');

replace(
`      const updateOverlayLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const zoom = map.getZoom();
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';
      };
      map.on('zoom', updateOverlayLod);
      updateOverlayLod();`,
`      const updateOverlayLod = () => {
        const host = containerRef.current?.parentElement;
        if (!host) return;
        const zoom = map.getZoom();
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';
      };
      const refreshOperationalPresentation = () => {
        updateOverlayLod();
        applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);
      };
      map.on('zoom', updateOverlayLod);
      map.on('moveend', refreshOperationalPresentation);
      updateOverlayLod();`,
'camera refresh declutter');

replace(
`    operationalMarkersRef.current = buildTerrainOperationalMarkers(map, state, {
      onSelectTerritory: territoryId => selectRef.current(territoryId),
      onSelectGroup: groupId => selectGroupRef.current?.(groupId)
    });

    return () => {`,
`    operationalMarkersRef.current = buildTerrainOperationalMarkers(map, state, {
      onSelectTerritory: territoryId => selectRef.current(territoryId),
      onSelectGroup: groupId => selectGroupRef.current?.(groupId)
    });
    applyTerrainOperationalMarkerDeclutter(map, operationalMarkersRef.current);

    return () => {`,
'initial/state marker declutter');

fs.writeFileSync(file, source);
console.log('Applied R3-WP2D marker declutter wiring.');
