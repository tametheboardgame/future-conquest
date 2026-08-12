import type { ComponentType } from 'react';
import type { TerrainMapPrototypeProps } from '../components/TerrainMapPrototypeImpl';

interface TerrainMapModule {
  TerrainMapPrototype: ComponentType<TerrainMapPrototypeProps>;
  prewarmTerrainRuntime: () => void;
}

let terrainModulePromise: Promise<TerrainMapModule> | undefined;

/** Keep the optional MapLibre renderer behind one reusable, explicitly prewarmable boundary. */
export function loadTerrainMapModule(): Promise<TerrainMapModule> {
  terrainModulePromise ??= import('../components/TerrainMapPrototype');
  return terrainModulePromise;
}

/** Start optional renderer, worker and manifest work without delaying campaign interaction. */
export function prewarmTerrainMapModule(): void {
  void loadTerrainMapModule()
    .then(module => module.prewarmTerrainRuntime())
    .catch(() => undefined);
}
