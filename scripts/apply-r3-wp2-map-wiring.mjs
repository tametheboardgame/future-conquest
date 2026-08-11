import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/components/MapView.tsx';
let source = readFileSync(file, 'utf8');

const replaceOnce = (label, before, after, marker) => {
  if (source.includes(marker)) {
    console.log(`${label}: already applied`);
    return;
  }
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected source sentinel not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source sentinel is not unique`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
  console.log(`${label}: applied`);
};

replaceOnce(
  'presentation import',
  "import type { GameState, StrategicNodeType } from '../game/types';",
  "import type { GameState, StrategicNodeType } from '../game/types';\nimport { deriveR3FrontSegments, r3FrontLineEndpoints, r3TerrainClass } from '../presentation/r3-map-visual-state';",
  'deriveR3FrontSegments, r3FrontLineEndpoints, r3TerrainClass'
);

replaceOnce(
  'front segment derivation',
  "  const selectedSupplyRouteIds = new Set(state.logistics.formationAllocations[state.selectedTaskGroupId]?.path.routeIds ?? []);",
  `  const selectedSupplyRouteIds = new Set(state.logistics.formationAllocations[state.selectedTaskGroupId]?.path.routeIds ?? []);\n  const frontSegments = deriveR3FrontSegments(state.territories, TERRITORIES).flatMap(segment => {\n    const from = geographicAnchors[segment.fromTerritoryId];\n    const to = geographicAnchors[segment.toTerritoryId];\n    if (!from || !to) return [];\n    const endpoints = r3FrontLineEndpoints(from, to, 18 * overlayScale);\n    return endpoints ? [{ ...segment, ...endpoints }] : [];\n  });`,
  'const frontSegments = deriveR3FrontSegments'
);

replaceOnce(
  'terrain SVG definitions',
  '        <filter id="softGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>',
  `        <filter id="softGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>\n        <linearGradient id="r3TerritorySheen" x1="0" y1="0" x2="1" y2="1">\n          <stop offset="0%" stopColor="#ffffff" stopOpacity=".7" />\n          <stop offset="38%" stopColor="#ffffff" stopOpacity=".16" />\n          <stop offset="72%" stopColor="#ffffff" stopOpacity="0" />\n          <stop offset="100%" stopColor="#000000" stopOpacity=".36" />\n        </linearGradient>\n        <pattern id="r3TerrainOpenLowland" width="18" height="18" patternUnits="userSpaceOnUse">\n          <path d="M0 13 H18" stroke="#dff8ee" strokeWidth=".7" opacity=".42" />\n        </pattern>\n        <pattern id="r3TerrainMixedLowland" width="16" height="16" patternUnits="userSpaceOnUse">\n          <circle cx="4" cy="5" r="1.15" fill="#d9f4e8" opacity=".55" />\n          <circle cx="12" cy="11" r=".8" fill="#d9f4e8" opacity=".36" />\n        </pattern>\n        <pattern id="r3TerrainMixedUpland" width="15" height="15" patternUnits="userSpaceOnUse">\n          <path d="M-3 15 L15 -3 M4 18 L18 4" stroke="#e4eee2" strokeWidth="1" opacity=".52" />\n        </pattern>\n        <pattern id="r3TerrainMountainous" width="18" height="16" patternUnits="userSpaceOnUse">\n          <path d="M1 13 L6 6 L10 11 L13 7 L17 13" fill="none" stroke="#f1eee1" strokeWidth="1.15" opacity=".68" />\n        </pattern>`,
  'id="r3TerritorySheen"'
);

replaceOnce(
  'territory depth layer',
  '      <g className="active-campaign-layer">\n        {activePaths.map(({ id, path }) => {',
  `      <g className="active-campaign-layer">\n        <g className="r3-territory-depth-layer" aria-hidden="true">\n          {activePaths.map(({ id, path }) => {\n            const territory = state.territories[id];\n            return territory ? <path key={\`${'${id}'}-depth\`} d={path} className={\`territory-depth-shell ${'${territory.controller}'}\`} /> : null;\n          })}\n        </g>\n\n        {activePaths.map(({ id, path }) => {`,
  'className="r3-territory-depth-layer"'
);

replaceOnce(
  'territory terrain class',
  'className={`territory ${territory.controller} ${territory.supplied ? \'supplied\' : \'isolated\'}',
  'className={`territory ${territory.controller} ${r3TerrainClass(TERRITORIES[id]?.terrain)} ${territory.supplied ? \'supplied\' : \'isolated\'}',
  '${r3TerrainClass(TERRITORIES[id]?.terrain)}'
);

replaceOnce(
  'terrain and front rendering',
  '        })}\n\n        {layers.routes && zoomPercent >= 120 && <g className="strategic-route-layer" aria-hidden="true">',
  `        })}\n\n        <g className="r3-terrain-layer" aria-hidden="true">\n          {activePaths.map(({ id, path }) => {\n            const territory = state.territories[id];\n            if (!territory) return null;\n            return <path key={\`${'${id}'}-terrain\`} d={path} className={\`territory-terrain ${'${territory.controller}'} ${'${r3TerrainClass(TERRITORIES[id]?.terrain)}'}\`} />;\n          })}\n        </g>\n\n        <g className="r3-territory-light-layer" aria-hidden="true">\n          {activePaths.map(({ id, path }) => state.territories[id]\n            ? <path key={\`${'${id}'}-sheen\`} d={path} className="territory-sheen" />\n            : null)}\n        </g>\n\n        <g className="r3-front-line-layer" aria-hidden="true">\n          {frontSegments.map(segment => <g key={segment.id} className="r3-front-segment">\n            <line className="r3-front-line-underlay" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} />\n            <line className="r3-front-line-core" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} />\n          </g>)}\n        </g>\n\n        {layers.routes && zoomPercent >= 120 && <g className="strategic-route-layer" aria-hidden="true">`,
  'className="r3-front-line-layer"'
);

writeFileSync(file, source);
console.log('R3-WP2 MapView wiring complete.');
