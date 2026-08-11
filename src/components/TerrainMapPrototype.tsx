import { lazy, Suspense } from 'react';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onSelect: (territoryId: string) => void;
  onFallback: (reason: string) => void;
}

const TerrainMapPrototypeImpl = lazy(() => import('./TerrainMapPrototypeImpl').then(module => ({
  default: module.TerrainMapPrototypeImpl
})));

/**
 * Lightweight boundary around the experimental MapLibre renderer. The default
 * SVG campaign experience does not load the MapLibre/WebGL implementation until
 * the explicit terrain prototype path actually renders this component.
 */
export function TerrainMapPrototype(props: Props) {
  return <Suspense fallback={<div className="r3-terrain-prototype-loading" role="status">Loading experimental terrain renderer…</div>}>
    <TerrainMapPrototypeImpl {...props} />
  </Suspense>;
}
