import fs from 'node:fs';

const path = 'src/App.tsx';
let source = fs.readFileSync(path, 'utf8');

source = source.replace(
  "import { useEffect, useMemo, useState } from 'react';",
  "import { lazy, Suspense, useEffect, useMemo, useState } from 'react';"
);
source = source.replace("import { TerrainMapPrototype } from './components/TerrainMapPrototype';\n", '');

const anchor = "import { MapView } from './components/MapView';\n";
const lazyDeclaration = `${anchor}\nconst TerrainMapPrototype = lazy(() => import('./components/TerrainMapPrototype').then(module => ({ default: module.TerrainMapPrototype })));\n`;
if (!source.includes('const TerrainMapPrototype = lazy(')) {
  if (!source.includes(anchor)) throw new Error('MapView import anchor not found');
  source = source.replace(anchor, lazyDeclaration);
}

const start = `{terrainPrototypeRequested && !terrainPrototypeFailed ? <TerrainMapPrototype\n              state={state}\n              onSelect={openTerritoryOnMap}\n              onFallback={(reason) => {\n                console.warn(\`R3 terrain prototype fallback: \${reason}\`);\n                setTerrainPrototypeFailed(true);\n              }}\n            /> : <MapView`;
const replacement = `{terrainPrototypeRequested && !terrainPrototypeFailed ? <Suspense fallback={<div className="r3-terrain-prototype-loading" role="status">Loading experimental terrain renderer…</div>}>\n              <TerrainMapPrototype\n                state={state}\n                onSelect={openTerritoryOnMap}\n                onFallback={(reason) => {\n                  console.warn(\`R3 terrain prototype fallback: \${reason}\`);\n                  setTerrainPrototypeFailed(true);\n                }}\n              />\n            </Suspense> : <MapView`;
if (!source.includes('<Suspense fallback=')) {
  if (!source.includes(start)) throw new Error('Terrain renderer branch anchor not found');
  source = source.replace(start, replacement);
}

fs.writeFileSync(path, source);
console.log('Lazy-loaded the hidden R3-WP2B terrain renderer.');
