import { createElement, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { TerrainMapPrototypeProps } from '../components/TerrainMapPrototypeImpl';

interface TerrainMapModule {
  TerrainMapPrototype: ComponentType<TerrainMapPrototypeProps>;
  prewarmTerrainRuntime: () => void;
}

let terrainModulePromise: Promise<TerrainMapModule> | undefined;

/**
 * Load the optional MapLibre renderer. A rejected dynamic import is deliberately
 * forgotten so the player's Retry terrain action can make a fresh request.
 */
function loadTerrainRuntimeModule(): Promise<TerrainMapModule> {
  terrainModulePromise ??= import('../components/TerrainMapPrototype').catch(error => {
    terrainModulePromise = undefined;
    throw error;
  });
  return terrainModulePromise;
}

/**
 * Stable eager host for the optional renderer. React.lazy resolves this host
 * immediately; the host owns the fallible dynamic import so a chunk/network
 * failure is routed through the existing SVG fallback instead of escaping the
 * application as an uncaught lazy-import rejection.
 */
function TerrainMapModuleHost(props: TerrainMapPrototypeProps) {
  const [module, setModule] = useState<TerrainMapModule | null>(null);
  const { onFallback } = props;

  useEffect(() => {
    let disposed = false;
    void loadTerrainRuntimeModule()
      .then(nextModule => {
        if (!disposed) setModule(nextModule);
      })
      .catch(error => {
        if (disposed) return;
        const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
        onFallback(`The terrain renderer could not be loaded.${detail}`);
      });
    return () => {
      disposed = true;
    };
  }, [onFallback]);

  if (!module) {
    return createElement(
      'div',
      { className: 'r3-terrain-prototype-loading', role: 'status' },
      'Loading terrain command map…'
    );
  }

  return createElement(module.TerrainMapPrototype, props);
}

const terrainHostModule: TerrainMapModule = {
  TerrainMapPrototype: TerrainMapModuleHost,
  prewarmTerrainRuntime: () => {
    void loadTerrainRuntimeModule()
      .then(module => module.prewarmTerrainRuntime())
      .catch(() => undefined);
  }
};

/** Keep the optional MapLibre renderer behind one reusable, explicitly prewarmable boundary. */
export function loadTerrainMapModule(): Promise<TerrainMapModule> {
  return Promise.resolve(terrainHostModule);
}

/** Start optional renderer, worker and manifest work without delaying campaign interaction. */
export function prewarmTerrainMapModule(): void {
  void loadTerrainRuntimeModule()
    .then(module => module.prewarmTerrainRuntime())
    .catch(() => undefined);
}
