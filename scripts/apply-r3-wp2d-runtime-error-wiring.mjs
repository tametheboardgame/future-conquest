import fs from 'node:fs';

const path = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(from, to);
};

replaceOnce(
`import {
  generatedRasterDemSource,
  generatedTerrainManifestUrl,
  type GeneratedTerrainTileJson
} from '../presentation/r3-terrain-source';
`,
`import {
  generatedRasterDemSource,
  generatedTerrainManifestUrl,
  type GeneratedTerrainTileJson
} from '../presentation/r3-terrain-source';
import { classifyTerrainRuntimeError } from '../presentation/r3-terrain-runtime-error';
`,
'WP2D runtime error classifier import'
);

replaceOnce(
`      map.on('error', event => {
        const runtimeDetail = event.error instanceof Error
          ? event.error.message
          : String(event.error ?? 'Unknown MapLibre runtime error');
        console.error(\`R3 terrain MapLibre error: \${runtimeDetail}\`, event.error);
        if (!loadedRef.current) {
          fallbackRef.current(\`Terrain renderer error: \${runtimeDetail}\`);
        } else {
          setStatus('warning');
          setMessage(\`Terrain source warning · \${runtimeDetail}\`);
        }
      });
`,
`      map.on('error', event => {
        const runtimeError = classifyTerrainRuntimeError(event.error);
        if (!loadedRef.current) {
          console.error(\`R3 terrain initialisation error: \${runtimeError.detail}\`, event.error);
          fallbackRef.current(\`Terrain renderer error: \${runtimeError.detail}\`);
          return;
        }

        if (runtimeError.kind === 'transient-tile-request') {
          console.info('R3 terrain transient tile request ignored', {
            status: runtimeError.status,
            url: runtimeError.url,
            detail: runtimeError.detail
          });
          return;
        }

        console.error(\`R3 terrain source warning: \${runtimeError.detail}\`, event.error);
        setStatus('warning');
        setMessage(\`Terrain source warning · \${runtimeError.detail}\`);
      });
`,
'WP2D MapLibre error policy'
);

fs.writeFileSync(path, source);
console.log('Applied WP2D runtime error classifier wiring.');
