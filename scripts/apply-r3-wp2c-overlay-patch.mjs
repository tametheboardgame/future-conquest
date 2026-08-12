import fs from 'node:fs';

const rendererPath = 'src/components/TerrainMapPrototypeImpl.tsx';
const cssPath = 'src/r3-terrain-prototype.css';

const replaceOnce = (source, from, to, label) => {
  const occurrences = source.split(from).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: expected exactly one match, found ${occurrences}`);
  return source.replace(from, to);
};

let renderer = fs.readFileSync(rendererPath, 'utf8');

renderer = replaceOnce(
  renderer,
  `import {\n  generatedRasterDemSource,\n  generatedTerrainManifestUrl,\n  type GeneratedTerrainTileJson\n} from '../presentation/r3-terrain-source';\n`,
  `import {\n  generatedRasterDemSource,\n  generatedTerrainManifestUrl,\n  type GeneratedTerrainTileJson\n} from '../presentation/r3-terrain-source';\nimport {\n  buildTerrainOperationalMarkers,\n  removeTerrainOperationalMarkers\n} from '../presentation/r3-terrain-operational-markers';\n`,
  'operational-marker import'
);

renderer = replaceOnce(
  renderer,
  `  const mapRef = useRef<Map | null>(null);\n`,
  `  const mapRef = useRef<Map | null>(null);\n  const operationalMarkersRef = useRef<ReturnType<typeof buildTerrainOperationalMarkers>>([]);\n`,
  'operational marker ref'
);

renderer = replaceOnce(
  renderer,
  `      map.addControl(new NavigationControl({ visualizePitch: presentationProfile === 'full' }), 'top-right');\n\n      map.on('load', () => {\n`,
  `      map.addControl(new NavigationControl({ visualizePitch: presentationProfile === 'full' }), 'top-right');\n\n      const updateOverlayLod = () => {\n        const host = containerRef.current?.parentElement;\n        if (!host) return;\n        const zoom = map.getZoom();\n        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';\n      };\n      map.on('zoom', updateOverlayLod);\n      updateOverlayLod();\n\n      map.on('load', () => {\n`,
  'overlay LOD hook'
);

renderer = replaceOnce(
  renderer,
  `      disposed = true;\n      loadedRef.current = false;\n      mapRef.current = null;\n      ownedMap?.remove();\n`,
  `      disposed = true;\n      loadedRef.current = false;\n      removeTerrainOperationalMarkers(operationalMarkersRef.current);\n      operationalMarkersRef.current = [];\n      mapRef.current = null;\n      ownedMap?.remove();\n`,
  'renderer cleanup'
);

renderer = replaceOnce(
  renderer,
  `  }, [politicalData, frontData, routeData, nodeData]);\n\n  const goTo = (preset: TerrainCameraPreset) => {\n`,
  `  }, [politicalData, frontData, routeData, nodeData]);\n\n  useEffect(() => {\n    const map = mapRef.current;\n    if (!map || !loadedRef.current || status === 'initialising') return;\n\n    removeTerrainOperationalMarkers(operationalMarkersRef.current);\n    operationalMarkersRef.current = buildTerrainOperationalMarkers(map, state, {\n      onSelectTerritory: territoryId => selectRef.current(territoryId)\n    });\n\n    return () => {\n      removeTerrainOperationalMarkers(operationalMarkersRef.current);\n      operationalMarkersRef.current = [];\n    };\n  }, [state, status]);\n\n  const goTo = (preset: TerrainCameraPreset) => {\n`,
  'operational marker lifecycle'
);

fs.writeFileSync(rendererPath, renderer);

let css = fs.readFileSync(cssPath, 'utf8');
const markerCss = `\n\n/* R3-WP2C operational information layer. MapLibre markers deliberately live in\n   screen space so command counters remain readable over pitched terrain. */\n.r3-terrain-territory-label,\n.r3-terrain-node-marker,\n.r3-terrain-task-group-marker,\n.r3-terrain-enemy-contact,\n.r3-terrain-threat-marker,\n.r3-terrain-operation-marker {\n  font-family: inherit;\n  margin: 0;\n  cursor: pointer;\n  user-select: none;\n  -webkit-user-select: none;\n}\n\n.r3-terrain-territory-label {\n  z-index: 4;\n  display: grid;\n  min-width: 58px;\n  padding: 3px 6px 4px;\n  border: 1px solid rgba(201, 231, 223, .3);\n  border-radius: 5px;\n  background: rgba(4, 17, 20, .76);\n  color: #e6f4f0;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, .42);\n  text-align: center;\n  line-height: 1.05;\n}\n\n.r3-terrain-territory-label span {\n  font-size: 10px;\n  font-weight: 800;\n  letter-spacing: .045em;\n}\n\n.r3-terrain-territory-label small {\n  margin-top: 2px;\n  color: rgba(220, 235, 230, .7);\n  font-size: 7px;\n  white-space: nowrap;\n}\n\n.r3-terrain-territory-label.player { border-color: rgba(91, 225, 205, .5); }\n.r3-terrain-territory-label.enemy { border-color: rgba(213, 147, 151, .45); }\n.r3-terrain-territory-label.selected {\n  border-color: #effffc;\n  box-shadow: 0 0 0 2px rgba(143, 255, 241, .36), 0 3px 12px rgba(0, 0, 0, .48);\n}\n\n.r3-terrain-node-marker {\n  z-index: 3;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: #eef2e7;\n  text-shadow: 0 1px 3px #000, 0 0 5px #000;\n  font-size: 8px;\n  white-space: nowrap;\n}\n\n.r3-terrain-node-marker b {\n  display: grid;\n  width: 16px;\n  height: 16px;\n  place-items: center;\n  border: 1px solid rgba(242, 234, 205, .75);\n  border-radius: 50%;\n  background: rgba(18, 28, 25, .9);\n  color: #f0d27e;\n  box-shadow: 0 1px 5px rgba(0, 0, 0, .62);\n  font-size: 8px;\n}\n\n.r3-terrain-node-marker.port b { color: #7bd1e2; }\n.r3-terrain-node-marker.airport b { color: #c6b8ed; }\n.r3-terrain-node-marker.rail-hub b { color: #d0b574; }\n.r3-terrain-node-marker.crossing b { color: #ef9a75; }\n.r3-terrain-node-marker.logistics b { color: #8bdeb7; }\n\n.r3-terrain-task-group-marker {\n  z-index: 8;\n  display: grid;\n  width: 58px;\n  min-height: 38px;\n  place-items: center;\n  padding: 4px 5px;\n  border: 2px solid #7de9dd;\n  border-radius: 6px;\n  background: rgba(6, 48, 50, .96);\n  color: #edfffb;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, .55), inset 0 0 0 1px rgba(255, 255, 255, .06);\n  line-height: 1;\n}\n\n.r3-terrain-task-group-marker strong {\n  font-size: 9px;\n  letter-spacing: .04em;\n}\n\n.r3-terrain-task-group-marker span {\n  margin-top: 3px;\n  color: #a7f2e8;\n  font-size: 8px;\n}\n\n.r3-terrain-task-group-marker.selected {\n  border-color: #f4ffff;\n  box-shadow: 0 0 0 3px rgba(102, 245, 226, .35), 0 4px 14px rgba(0, 0, 0, .6);\n}\n\n.r3-terrain-task-group-marker.moving,\n.r3-terrain-task-group-marker.attacking { border-color: #ffd27e; }\n.r3-terrain-task-group-marker.recovering { opacity: .72; }\n\n.r3-terrain-enemy-contact {\n  z-index: 9;\n  display: grid;\n  width: 40px;\n  height: 40px;\n  place-items: center;\n  padding: 2px;\n  border: 2px solid #ff7770;\n  border-radius: 5px;\n  background: rgba(83, 28, 29, .94);\n  color: #fff5ef;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, .55);\n  line-height: 1;\n}\n\n.r3-terrain-enemy-contact strong { font-size: 12px; }\n.r3-terrain-enemy-contact span { font-size: 7px; letter-spacing: .04em; }\n.r3-terrain-enemy-contact.estimated { border-style: dashed; }\n.r3-terrain-enemy-contact.activity { border-color: #ffb46d; }\n.r3-terrain-enemy-contact.stale { opacity: .62; }\n\n.r3-terrain-threat-marker {\n  z-index: 10;\n  display: grid;\n  width: 34px;\n  height: 34px;\n  place-items: center;\n  padding: 0;\n  border: 2px solid #ffc06c;\n  border-radius: 50%;\n  background: rgba(79, 35, 22, .96);\n  color: #fff0cb;\n  box-shadow: 0 0 0 2px rgba(255, 122, 86, .16), 0 4px 12px rgba(0, 0, 0, .55);\n  line-height: .85;\n}\n\n.r3-terrain-threat-marker strong { font-size: 16px; }\n.r3-terrain-threat-marker span { font-size: 7px; }\n.r3-terrain-threat-marker.under-attack { border-color: #ff6158; }\n\n.r3-terrain-operation-marker {\n  z-index: 11;\n  padding: 5px 7px;\n  border: 1px solid #ffd08a;\n  border-radius: 4px;\n  background: rgba(64, 37, 18, .95);\n  color: #ffe4ad;\n  box-shadow: 0 3px 10px rgba(0, 0, 0, .5);\n  font-size: 8px;\n  font-weight: 800;\n  letter-spacing: .04em;\n}\n\n.r3-terrain-portal-marker {\n  z-index: 7;\n  width: 28px;\n  height: 28px;\n  pointer-events: none;\n}\n\n.r3-terrain-portal-marker i {\n  position: absolute;\n  inset: 2px;\n  border: 2px solid #7df9e7;\n  border-radius: 50%;\n  box-shadow: 0 0 8px rgba(79, 255, 229, .75);\n}\n\n.r3-terrain-portal-marker i + i { inset: 9px; border-width: 1px; }\n\n.r3-terrain-prototype[data-overlay-lod='theatre'] .r3-terrain-territory-label small,\n.r3-terrain-prototype[data-overlay-lod='campaign'] .r3-terrain-territory-label small { display: none; }\n.r3-terrain-prototype[data-overlay-lod='theatre'] .r3-terrain-node-marker.importance-2 { display: none; }\n.r3-terrain-prototype[data-overlay-lod='theatre'] .r3-terrain-node-marker span { display: none; }\n.r3-terrain-prototype[data-overlay-lod='campaign'] .r3-terrain-node-marker.importance-2 span { display: none; }\n\n.r3-terrain-prototype[data-terrain-profile='compact'] .r3-terrain-node-marker.importance-2 { display: none; }\n.r3-terrain-prototype[data-terrain-profile='compact'] .r3-terrain-territory-label small { display: none; }\n.r3-terrain-prototype[data-terrain-profile='compact'] .r3-terrain-task-group-marker {\n  width: 52px;\n  min-height: 34px;\n}\n\n@media (max-width: 900px) {\n  .r3-terrain-node-marker.importance-2 { display: none; }\n  .r3-terrain-territory-label small { display: none; }\n}\n`;

if (css.includes('.r3-terrain-task-group-marker')) {
  throw new Error('marker CSS already present; refusing duplicate append');
}
css += markerCss;
fs.writeFileSync(cssPath, css);

console.log('Applied R3-WP2C operational marker wiring and CSS.');
